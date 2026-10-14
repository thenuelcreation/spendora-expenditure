package api

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type profileRequest struct {
	Name  *string `json:"name"`
	Email *string `json:"email"`
}

func (s *Server) handleUpdateProfile(w http.ResponseWriter, r *http.Request, userID string) {
	var req profileRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Name == nil && req.Email == nil {
		validationError(w, map[string]string{"body": "Provide a name or email to update."})
		return
	}

	fields := map[string]string{}
	var name, email *string
	if req.Name != nil {
		n, ok := cleanName(*req.Name, 100)
		if !ok {
			fields["name"] = "Name is required (max 100 characters)."
		}
		name = &n
	}
	if req.Email != nil {
		e, msg := normalizeEmail(*req.Email)
		if msg != "" {
			fields["email"] = msg
		}
		email = &e
	}
	if len(fields) > 0 {
		validationError(w, fields)
		return
	}

	user, err := scanUser(s.pool.QueryRow(r.Context(),
		`UPDATE users SET name = COALESCE($2::text, name), email = COALESCE($3::text, email), updated_at = now()
		 WHERE id = $1::uuid RETURNING `+userColumns, userID, name, email))
	if err != nil {
		switch {
		case pgCode(err) == pgUniqueViolation:
			writeError(w, http.StatusConflict, "email_taken", "An account with this email already exists.")
		case errors.Is(err, pgx.ErrNoRows):
			writeError(w, http.StatusUnauthorized, "unauthenticated", "Please sign in to continue.")
		default:
			internalError(w, r, err)
		}
		return
	}
	writeJSON(w, http.StatusOK, user)
}

type preferencesRequest struct {
	Appearance           *string `json:"appearance"`
	NotificationsEnabled *bool   `json:"notificationsEnabled"`
	PreferredCurrency    *string `json:"preferredCurrency"`
}

func (s *Server) handleUpdatePreferences(w http.ResponseWriter, r *http.Request, userID string) {
	var req preferencesRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Appearance == nil && req.NotificationsEnabled == nil && req.PreferredCurrency == nil {
		validationError(w, map[string]string{"body": "Provide at least one preference to update."})
		return
	}
	fields := map[string]string{}
	if req.Appearance != nil && !appearances[*req.Appearance] {
		fields["appearance"] = "Choose system, light or dark."
	}
	if req.PreferredCurrency != nil && !currencies[*req.PreferredCurrency] {
		fields["preferredCurrency"] = "Choose NGN, USD, GBP or EUR."
	}
	if len(fields) > 0 {
		validationError(w, fields)
		return
	}

	user, err := scanUser(s.pool.QueryRow(r.Context(),
		`UPDATE users SET appearance = COALESCE($2::text, appearance),
		        notifications_enabled = COALESCE($3::boolean, notifications_enabled),
		        preferred_currency = COALESCE($4::text, preferred_currency),
		        updated_at = now()
		 WHERE id = $1::uuid RETURNING `+userColumns,
		userID, req.Appearance, req.NotificationsEnabled, req.PreferredCurrency))
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Please sign in to continue.")
		return
	}
	if err != nil {
		internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

type passwordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

func (s *Server) handleChangePassword(w http.ResponseWriter, r *http.Request, userID string) {
	var req passwordRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	fields := map[string]string{}
	if req.CurrentPassword == "" {
		fields["currentPassword"] = "Enter your current password."
	}
	if msg := validatePassword(req.NewPassword); msg != "" {
		fields["newPassword"] = msg
	} else if req.NewPassword == req.CurrentPassword {
		fields["newPassword"] = "New password must be different from the current one."
	}
	if len(fields) > 0 {
		validationError(w, fields)
		return
	}

	ctx := r.Context()
	var hash string
	err := s.pool.QueryRow(ctx, `SELECT password_hash FROM users WHERE id = $1::uuid`, userID).Scan(&hash)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Please sign in to continue.")
		return
	}
	if err != nil {
		internalError(w, r, err)
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.CurrentPassword)) != nil {
		validationError(w, map[string]string{"currentPassword": "Current password is incorrect."})
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		internalError(w, r, err)
		return
	}
	if _, err := s.pool.Exec(ctx, `UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1::uuid`,
		userID, string(newHash)); err != nil {
		internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "Password updated."})
}
