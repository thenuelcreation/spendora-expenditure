package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"spendora/internal/config"
)

func TestParseAmount(t *testing.T) {
	good := []string{"1", "10.5", "1500.00", "999999999999.99"}
	bad := []string{"", "0", "0.00", "-5", "1e3", "12.345", "abc", "1,000", "1000000000000"}
	for _, s := range good {
		if _, ok := parseAmount(s); !ok {
			t.Errorf("parseAmount(%q) should be valid", s)
		}
	}
	for _, s := range bad {
		if _, ok := parseAmount(s); ok {
			t.Errorf("parseAmount(%q) should be invalid", s)
		}
	}
}

func TestNormalizeEmail(t *testing.T) {
	got, msg := normalizeEmail("  Emmanuel@Example.COM ")
	if msg != "" || got != "emmanuel@example.com" {
		t.Fatalf("got %q, %q", got, msg)
	}
	for _, bad := range []string{"", "nope", "Name <a@b.com>", "a@"} {
		if _, msg := normalizeEmail(bad); msg == "" {
			t.Errorf("normalizeEmail(%q) should fail", bad)
		}
	}
}

func TestPeriodBounds(t *testing.T) {
	now := time.Date(2026, 10, 13, 15, 0, 0, 0, time.UTC)
	cases := []struct{ period, from, to string }{
		{"all", "", ""},
		{"this_month", "2026-10-01", "2026-11-01"},
		{"last_3_months", "2026-08-01", "2026-11-01"},
		{"this_year", "2026-01-01", "2027-01-01"},
		{"year", "2026-01-01", "2027-01-01"},
	}
	for _, c := range cases {
		from, to, ok := periodBounds(c.period, now)
		if !ok || from != c.from || to != c.to {
			t.Errorf("%s: got %q %q %v", c.period, from, to, ok)
		}
	}
	if _, _, ok := periodBounds("decade", now); ok {
		t.Error("unknown period should be rejected")
	}
}

func TestCSVSafe(t *testing.T) {
	cases := map[string]string{
		"=SUM(A1:A2)": "'=SUM(A1:A2)",
		"+1":          "'+1",
		"-1":          "'-1",
		"@cmd":        "'@cmd",
		"Fuel":        "Fuel",
		"":            "",
	}
	for in, want := range cases {
		if got := csvSafe(in); got != want {
			t.Errorf("csvSafe(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestExpenseFilterWhere(t *testing.T) {
	f := expenseFilter{q: "50%", categoryID: "11111111-1111-1111-1111-111111111111", from: "2026-01-01"}
	where, args := f.where("22222222-2222-2222-2222-222222222222")
	if len(args) != 4 {
		t.Fatalf("expected 4 args, got %d", len(args))
	}
	if !strings.HasPrefix(where, "e.user_id = $1::uuid") {
		t.Errorf("user scoping must come first: %s", where)
	}
	if !strings.Contains(where, "ILIKE $4") {
		t.Errorf("search should use parameter $4: %s", where)
	}
	if args[3] != `%50\%%` {
		t.Errorf("LIKE pattern not escaped: %v", args[3])
	}
}

func TestSessionRoundTrip(t *testing.T) {
	s := &Server{cfg: config.Config{JWTSecret: strings.Repeat("a", 32)}}
	const uid = "33333333-3333-3333-3333-333333333333"

	rec := httptest.NewRecorder()
	if err := s.issueSession(rec, uid); err != nil {
		t.Fatal(err)
	}
	cookies := rec.Result().Cookies()
	if len(cookies) != 1 {
		t.Fatalf("expected 1 cookie, got %d", len(cookies))
	}
	c := cookies[0]
	if !c.HttpOnly || c.SameSite != http.SameSiteLaxMode {
		t.Error("cookie must be HttpOnly and SameSite=Lax")
	}

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.AddCookie(c)
	if got, ok := s.userIDFromRequest(req); !ok || got != uid {
		t.Fatalf("round trip failed: %q %v", got, ok)
	}

	tampered := httptest.NewRequest(http.MethodGet, "/", nil)
	tampered.AddCookie(&http.Cookie{Name: sessionCookie, Value: c.Value + "x"})
	if _, ok := s.userIDFromRequest(tampered); ok {
		t.Error("tampered token must be rejected")
	}

	other := &Server{cfg: config.Config{JWTSecret: strings.Repeat("b", 32)}}
	if _, ok := other.userIDFromRequest(req); ok {
		t.Error("token signed with a different secret must be rejected")
	}
}
