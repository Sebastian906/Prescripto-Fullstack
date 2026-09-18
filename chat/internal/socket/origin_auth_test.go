package socket

import "testing"

func TestIsOriginAllowed(t *testing.T) {
	allow := []string{"http://localhost:5173", "http://localhost:5174"}
	cases := []struct {
		name   string
		origin string
		want   bool
	}{
		{"empty origin allowed (curl/tests)", "", true},
		{"allowlisted 5173", "http://localhost:5173", true},
		{"allowlisted 5174", "http://localhost:5174", true},
		{"unknown origin rejected", "https://evil.example.com", false},
		{"scheme matters", "http://localhost:5173.evil.com", false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := isOriginAllowed(tc.origin, allow); got != tc.want {
				t.Errorf("isOriginAllowed(%q) = %v, want %v", tc.origin, got, tc.want)
			}
		})
	}
}

func TestExtractUserToken_Order(t *testing.T) {
	if got := extractUserToken("q", "h", "Bearer b"); got != "q" {
		t.Errorf("query must win, got %q", got)
	}
	if got := extractUserToken("", "h", "Bearer b"); got != "h" {
		t.Errorf("header fallback, got %q", got)
	}
	if got := extractUserToken("", "", "Bearer b"); got != "Bearer b" {
		t.Errorf("Authorization Bearer fallback, got %q", got)
	}
	if got := extractUserToken("", "", ""); got != "" {
		t.Errorf("empty, got %q", got)
	}
}

func TestExtractAdminToken_Order(t *testing.T) {
	if got := extractAdminToken("aq", "ah", "Bearer ab"); got != "aq" {
		t.Errorf("query must win, got %q", got)
	}
	if got := extractAdminToken("", "ah", "Bearer ab"); got != "ah" {
		t.Errorf("header fallback, got %q", got)
	}
	if got := extractAdminToken("", "", "Bearer ab"); got != "Bearer ab" {
		t.Errorf("Authorization Bearer fallback, got %q", got)
	}
}

func TestSetAllowedOrigins_EmptyKeepsPrevious(t *testing.T) {
	prev := allowedOrigins
	SetAllowedOrigins([]string{})
	if len(allowedOrigins) != len(prev) {
		t.Errorf("empty call must not wipe allowlist")
	}
	SetAllowedOrigins([]string{"http://localhost:5173"})
	if !isOriginAllowed("http://localhost:5173", allowedOrigins) {
		t.Errorf("setter must take effect")
	}
	allowedOrigins = prev
}