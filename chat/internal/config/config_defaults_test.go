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
	// Fail closed: no configured origins means no cross-origin request is allowed.
	if len(cfg.AllowedOrigins) != 0 {
		t.Fatalf("AllowedOrigins = %v, want empty (fail closed)", cfg.AllowedOrigins)
	}
}