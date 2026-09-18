package config

import "testing"

func TestDefaultPortIs4000(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret")
	t.Setenv("CHAT_PORT", "") // empty -> fallback
	cfg := Load()
	if cfg.Port != "4000" {
		t.Errorf("default CHAT_PORT = %q, want %q", cfg.Port, "4000")
	}
}

func TestAllowedOriginsDefault(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret")
	t.Setenv("CHAT_ALLOWED_ORIGINS", "")
	cfg := Load()
	want := map[string]bool{
		"http://localhost:5173": true,
		"http://localhost:5174": true,
	}
	if len(cfg.AllowedOrigins) != 2 {
		t.Fatalf("AllowedOrigins = %v, want 2 entries", cfg.AllowedOrigins)
	}
	for _, o := range cfg.AllowedOrigins {
		if !want[o] {
			t.Errorf("unexpected origin %q", o)
		}
	}
}