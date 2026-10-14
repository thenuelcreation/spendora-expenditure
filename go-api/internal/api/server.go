package api

import (
	"context"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"spendora/internal/config"
)

type rowScanner interface {
	Scan(dest ...any) error
}

type Server struct {
	cfg         config.Config
	pool        *pgxpool.Pool
	authLimiter *rateLimiter
}

func NewServer(cfg config.Config, pool *pgxpool.Pool) *Server {
	return &Server{cfg: cfg, pool: pool, authLimiter: newRateLimiter(10, time.Minute)}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", s.handleHealth)

	mux.HandleFunc("POST /api/auth/signup", s.limited(s.handleSignup))
	mux.HandleFunc("POST /api/auth/login", s.limited(s.handleLogin))
	mux.HandleFunc("POST /api/auth/logout", s.handleLogout)
	mux.HandleFunc("GET /api/auth/me", s.protected(s.handleMe))

	mux.HandleFunc("PATCH /api/users/me", s.protected(s.handleUpdateProfile))
	mux.HandleFunc("PATCH /api/users/me/preferences", s.protected(s.handleUpdatePreferences))
	mux.HandleFunc("PATCH /api/users/me/password", s.protected(s.handleChangePassword))

	mux.HandleFunc("GET /api/categories", s.protected(s.handleListCategories))
	mux.HandleFunc("POST /api/categories", s.protected(s.handleCreateCategory))
	mux.HandleFunc("PATCH /api/categories/{id}", s.protected(s.handleUpdateCategory))
	mux.HandleFunc("DELETE /api/categories/{id}", s.protected(s.handleDeleteCategory))
	mux.HandleFunc("POST /api/categories/{id}/subcategories", s.protected(s.handleCreateSubcategory))
	mux.HandleFunc("PATCH /api/subcategories/{id}", s.protected(s.handleUpdateSubcategory))
	mux.HandleFunc("DELETE /api/subcategories/{id}", s.protected(s.handleDeleteSubcategory))

	mux.HandleFunc("GET /api/expenses", s.protected(s.handleListExpenses))
	mux.HandleFunc("POST /api/expenses", s.protected(s.handleCreateExpense))
	mux.HandleFunc("GET /api/expenses/export", s.protected(s.handleExport))
	mux.HandleFunc("GET /api/expenses/export/summary", s.protected(s.handleExportSummary))
	mux.HandleFunc("GET /api/expenses/{id}", s.protected(s.handleGetExpense))
	mux.HandleFunc("PATCH /api/expenses/{id}", s.protected(s.handleUpdateExpense))
	mux.HandleFunc("DELETE /api/expenses/{id}", s.protected(s.handleDeleteExpense))

	mux.HandleFunc("GET /api/dashboard", s.protected(s.handleDashboard))

	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		writeError(w, http.StatusNotFound, "not_found", "Route not found.")
	})

	var h http.Handler = mux
	h = requireJSON(h)
	h = s.cors(h)
	h = securityHeaders(h)
	h = requestLogger(h)
	h = recoverer(h)
	return h
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := s.pool.Ping(ctx); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
