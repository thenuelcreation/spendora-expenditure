package api

import (
	"math/big"
	"net/mail"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

var (
	currencies     = map[string]bool{"NGN": true, "USD": true, "GBP": true, "EUR": true}
	paymentMethods = map[string]bool{"Bank Transfer": true, "Cash": true, "Card": true, "Mobile Money": true, "Other": true}
	appearances    = map[string]bool{"system": true, "light": true, "dark": true}

	uuidRe   = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
	amountRe = regexp.MustCompile(`^\d{1,12}(\.\d{1,2})?$`)
)

func isUUID(s string) bool { return uuidRe.MatchString(s) }

// normalizeEmail lowercases/trims and validates; the second value is an error message ("" if valid).
func normalizeEmail(raw string) (string, string) {
	email := strings.ToLower(strings.TrimSpace(raw))
	if email == "" {
		return "", "Email is required."
	}
	if len(email) > 254 {
		return "", "Email is too long."
	}
	addr, err := mail.ParseAddress(email)
	if err != nil || addr.Address != email {
		return "", "Enter a valid email address."
	}
	return email, ""
}

// validatePassword returns an error message, or "" if the password is acceptable.
func validatePassword(pw string) string {
	if utf8.RuneCountInString(pw) < 8 {
		return "Password must be at least 8 characters."
	}
	if len(pw) > 72 {
		return "Password must be at most 72 bytes."
	}
	return ""
}

// cleanName trims and requires 1..max characters.
func cleanName(s string, max int) (string, bool) {
	s = strings.TrimSpace(s)
	n := utf8.RuneCountInString(s)
	return s, n >= 1 && n <= max
}

// cleanOptional trims and allows 0..max characters.
func cleanOptional(s string, max int) (string, bool) {
	s = strings.TrimSpace(s)
	return s, utf8.RuneCountInString(s) <= max
}

func parseDate(s string) (string, bool) {
	t, err := time.Parse("2006-01-02", strings.TrimSpace(s))
	if err != nil || t.Year() < 1970 || t.Year() > 2100 {
		return "", false
	}
	return t.Format("2006-01-02"), true
}

// parseAmount accepts a positive decimal with at most 2 decimal places (NUMERIC(14,2)).
func parseAmount(s string) (string, bool) {
	s = strings.TrimSpace(s)
	if !amountRe.MatchString(s) {
		return "", false
	}
	r, ok := new(big.Rat).SetString(s)
	if !ok || r.Sign() <= 0 {
		return "", false
	}
	return s, true
}

func escapeLike(s string) string {
	r := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return r.Replace(s)
}
