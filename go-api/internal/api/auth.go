package api

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

const (
	sessionCookie = "spendora_session"
	sessionTTL    = 7 * 24 * time.Hour
)

// Used to keep login timing similar whether or not the email exists.
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("spendora-dummy-password"), bcrypt.DefaultCost)

type User struct {
	ID                   string    `json:"id"`
	Name                 string    `json:"name"`
	Email                string    `json:"email"`
	Appearance           string    `json:"appearance"`
	NotificationsEnabled bool      `json:"notificationsEnabled"`
	PreferredCurrency    string    `json:"preferredCurrency"`
	CreatedAt            time.Time `json:"createdAt"`
}

const userColumns = `id::text, name, email, appearance, notifications_enabled, preferred_currency, created_at`

func scanUser(row rowScanner) (User, error) {
	var u User
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Appearance, &u.NotificationsEnabled, &u.PreferredCurrency, &u.CreatedAt)
	return u, err
}

func (s *Server) loadUser(ctx context.Context, id string) (User, error) {
	return scanUser(s.pool.QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE id = $1::uuid`, id))
}

// ---- sessions ----

func (s *Server) issueSession(w http.ResponseWriter, userID string) error {
	now := time.Now()
	claims := jwt.RegisteredClaims{
		Subject:   userID,
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(sessionTTL)),
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookie,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   s.cfg.Production(),
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(sessionTTL.Seconds()),
		Expires:  now.Add(sessionTTL),
	})
	return nil
}

func (s *Server) clearSession(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookie,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   s.cfg.Production(),
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
}

func (s *Server) userIDFromRequest(r *http.Request) (string, bool) {
	c, err := r.Cookie(sessionCookie)
	if err != nil {
		return "", false
	}
	claims := &jwt.RegisteredClaims{}
	tok, err := jwt.ParseWithClaims(c.Value, claims,
		func(*jwt.Token) (any, error) { return []byte(s.cfg.JWTSecret), nil },
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithExpirationRequired(),
	)
	if err != nil || !tok.Valid || !isUUID(claims.Subject) {
		return "", false
	}
	return claims.Subject, true
}

// protected wraps a handler so it only runs for a signed-in user and receives that user's id.
func (s *Server) protected(next func(w http.ResponseWriter, r *http.Request, userID string)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := s.userIDFromRequest(r)
		if !ok {
			writeError(w, http.StatusUnauthorized, "unauthenticated", "Please sign in to continue.")
			return
		}
		next(w, r, userID)
	}
}

// ---- handlers ----

type signupRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Server) handleSignup(w http.ResponseWriter, r *http.Request) {
	var req signupRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	fields := map[string]string{}
	name, ok := cleanName(req.Name, 100)
	if !ok {
		fields["name"] = "Name is required (max 100 characters)."
	}
	email, msg := normalizeEmail(req.Email)
	if msg != "" {
		fields["email"] = msg
	}
	if msg := validatePassword(req.Password); msg != "" {
		fields["password"] = msg
	}
	if len(fields) > 0 {
		validationError(w, fields)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		internalError(w, r, err)
		return
	}

	ctx := r.Context()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		internalError(w, r, err)
		return
	}
	defer tx.Rollback(ctx)

	user, err := scanUser(tx.QueryRow(ctx,
		`INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING `+userColumns,
		name, email, string(hash)))
	if err != nil {
		if pgCode(err) == pgUniqueViolation {
			writeError(w, http.StatusConflict, "email_taken", "An account with this email already exists.")
			return
		}
		internalError(w, r, err)
		return
	}
	if err := seedStarterCategories(ctx, tx, user.ID); err != nil {
		internalError(w, r, err)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		internalError(w, r, err)
		return
	}
	if err := s.issueSession(w, user.ID); err != nil {
		internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, user)
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	invalid := func() {
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "Invalid email or password.")
	}
	if email == "" || req.Password == "" || utf8.RuneCountInString(req.Password) > 200 {
		invalid()
		return
	}

	var id, hash string
	err := s.pool.QueryRow(r.Context(), `SELECT id::text, password_hash FROM users WHERE email = $1`, email).Scan(&id, &hash)
	if errors.Is(err, pgx.ErrNoRows) {
		_ = bcrypt.CompareHashAndPassword(dummyHash, []byte(req.Password))
		invalid()
		return
	}
	if err != nil {
		internalError(w, r, err)
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)) != nil {
		invalid()
		return
	}

	user, err := s.loadUser(r.Context(), id)
	if err != nil {
		internalError(w, r, err)
		return
	}
	if err := s.issueSession(w, id); err != nil {
		internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	s.clearSession(w)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request, userID string) {
	user, err := s.loadUser(r.Context(), userID)
	if errors.Is(err, pgx.ErrNoRows) {
		s.clearSession(w)
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Please sign in to continue.")
		return
	}
	if err != nil {
		internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, user)
}
