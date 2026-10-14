package api

import (
	"log/slog"
	"mime"
	"net"
	"net/http"
	"runtime/debug"
	"strings"
	"sync"
	"time"
)

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

func recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				if rec == http.ErrAbortHandler {
					panic(rec)
				}
				slog.Error("panic", "panic", rec, "stack", string(debug.Stack()))
				writeError(w, http.StatusInternalServerError, "internal_error", "Something went wrong. Please try again.")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		slog.Info("request", "method", r.Method, "path", r.URL.Path, "status", rec.status,
			"duration_ms", time.Since(start).Milliseconds())
	})
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

func (s *Server) cors(next http.Handler) http.Handler {
	allowed := make(map[string]bool, len(s.cfg.CORSOrigins))
	for _, o := range s.cfg.CORSOrigins {
		allowed[o] = true
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && allowed[origin] {
			h := w.Header()
			h.Set("Access-Control-Allow-Origin", origin)
			h.Set("Access-Control-Allow-Credentials", "true")
			h.Add("Vary", "Origin")
			if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
				h.Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
				h.Set("Access-Control-Allow-Headers", "Content-Type")
				h.Set("Access-Control-Max-Age", "600")
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

// requireJSON rejects mutating requests that carry a body in a non-JSON content type.
func requireJSON(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost, http.MethodPatch, http.MethodPut, http.MethodDelete:
			if r.ContentLength != 0 {
				mt, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
				if err != nil || mt != "application/json" {
					writeError(w, http.StatusUnsupportedMediaType, "unsupported_media_type", "Content-Type must be application/json.")
					return
				}
			}
		}
		next.ServeHTTP(w, r)
	})
}

// ---- simple in-memory rate limiter (per client IP, fixed window) ----

type rlEntry struct {
	start time.Time
	count int
}

type rateLimiter struct {
	mu     sync.Mutex
	limit  int
	window time.Duration
	hits   map[string]*rlEntry
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{limit: limit, window: window, hits: make(map[string]*rlEntry)}
}

func (l *rateLimiter) allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	if len(l.hits) > 10000 {
		for k, e := range l.hits {
			if now.Sub(e.start) > l.window {
				delete(l.hits, k)
			}
		}
	}
	e, ok := l.hits[key]
	if !ok || now.Sub(e.start) > l.window {
		l.hits[key] = &rlEntry{start: now, count: 1}
		return true
	}
	e.count++
	return e.count <= l.limit
}

func (s *Server) clientIP(r *http.Request) string {
	if s.cfg.TrustProxy {
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			first, _, _ := strings.Cut(xff, ",")
			return strings.TrimSpace(first)
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// limited throttles credential endpoints (10 requests per minute per IP).
func (s *Server) limited(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !s.authLimiter.allow(s.clientIP(r)) {
			w.Header().Set("Retry-After", "60")
			writeError(w, http.StatusTooManyRequests, "rate_limited", "Too many attempts. Please wait a minute and try again.")
			return
		}
		next(w, r)
	}
}
