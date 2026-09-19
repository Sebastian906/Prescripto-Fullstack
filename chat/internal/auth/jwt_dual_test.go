package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func signForTest(t *testing.T, secret, id string) string {
	t.Helper()
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"id": id})
	s, err := tok.SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestDualAcceptWindow(t *testing.T) {
	oldTok := signForTest(t, "old-secret", "u1")
	future := time.Now().Add(24 * time.Hour)
	v := NewValidatorWithRotation("new-secret", "old-secret", future)
	if _, err := v.Validate(oldTok); err != nil {
		t.Fatalf("old token must be accepted pre-deadline: %v", err)
	}
	past := NewValidatorWithRotation("new-secret", "old-secret", time.Now().Add(-time.Hour))
	if _, err := past.Validate(oldTok); err == nil {
		t.Fatal("old token must be rejected post-deadline")
	}
	// Fail closed: previous without a valid deadline is rejected.
	noDeadline := NewValidatorWithRotation("new-secret", "old-secret", time.Time{})
	if _, err := noDeadline.Validate(oldTok); err == nil {
		t.Fatal("old token must be rejected without a rotation deadline")
	}
	if _, err := v.Validate(signForTest(t, "new-secret", "u1")); err != nil {
		t.Fatalf("current token must always validate: %v", err)
	}
}