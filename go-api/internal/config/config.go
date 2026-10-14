package config

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Env         string
	Port        string
	DatabaseURL string
	JWTSecret   string
	CORSOrigins []string
	TrustProxy  bool
}

func (c Config) Production() bool { return c.Env == "production" }

// Load reads configuration from the environment (and a local .env file if present).
func Load() (Config, error) {
	loadDotEnv(".env")

	cfg := Config{
		Env:         strings.ToLower(get("APP_ENV", "development")),
		Port:        get("PORT", "8080"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
	}
	if v := os.Getenv("TRUST_PROXY"); v != "" {
		b, err := strconv.ParseBool(v)
		if err != nil {
			return cfg, fmt.Errorf("TRUST_PROXY must be true or false: %w", err)
		}
		cfg.TrustProxy = b
	}
	for _, o := range strings.Split(get("CORS_ORIGIN", "http://localhost:3000"), ",") {
		o = strings.TrimRight(strings.TrimSpace(o), "/")
		if o != "" {
			cfg.CORSOrigins = append(cfg.CORSOrigins, o)
		}
	}

	if cfg.DatabaseURL == "" {
		return cfg, errors.New("DATABASE_URL is required")
	}
	if cfg.JWTSecret == "" {
		return cfg, errors.New("JWT_SECRET is required")
	}
	if cfg.Production() && len(cfg.JWTSecret) < 32 {
		return cfg, fmt.Errorf("JWT_SECRET must be at least 32 characters in production (got %d)", len(cfg.JWTSecret))
	}
	return cfg, nil
}

func get(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

// loadDotEnv sets variables from a KEY=VALUE file without overriding real environment variables.
func loadDotEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		val = strings.Trim(strings.TrimSpace(val), `"'`)
		if _, exists := os.LookupEnv(key); !exists {
			os.Setenv(key, val)
		}
	}
}
