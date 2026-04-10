package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID string `json:"id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type Validator struct {
	secret        []byte
	adminEmail    string
	adminPassword string
}

func NewValidator(secret string) *Validator {
	return &Validator{secret: []byte(secret)}
}

func NewValidatorWithAdmin(secret, adminEmail, adminPassword string) *Validator {
	return &Validator{
		secret:        []byte(secret),
		adminEmail:    adminEmail,
		adminPassword: adminPassword,
	}
}

func (v *Validator) Validate(tokenStr string) (*Claims, error) {
	tokenStr = stripBearer(tokenStr)
	if tokenStr == "" {
		return nil, errors.New("empty token")
	}

	var mapClaims jwt.MapClaims
	token, err := jwt.ParseWithClaims(tokenStr, &mapClaims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return v.secret, nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	userID, _ := mapClaims["id"].(string)
	if userID == "" {
		return nil, errors.New("token missing 'id' field")
	}

	role := "user"
	if r, ok := mapClaims["role"].(string); ok && r != "" {
		role = r
	}

	return &Claims{UserID: userID, Role: role}, nil
}

func (v *Validator) ValidateAdmin(tokenStr string) (*Claims, error) {
	tokenStr = stripBearer(tokenStr)
	if tokenStr == "" {
		return nil, errors.New("empty admin token")
	}
	// Try parsing as a standard JWT first (handles tokens created by jwt libraries)
	var mapClaims jwt.MapClaims
	token, err := jwt.ParseWithClaims(tokenStr, &mapClaims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return v.secret, nil
	})
	if err == nil && token.Valid {
		userID, _ := mapClaims["id"].(string)
		role := "admin"
		if r, ok := mapClaims["role"].(string); ok && r != "" {
			role = r
		}
		if userID == "" {
			userID = "admin"
		}
		return &Claims{UserID: userID, Role: role}, nil
	}

	// Fallback to legacy HMAC verification (keeps compatibility with older tokens)
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return nil, errors.New("invalid token format")
	}

	header := parts[0]
	payload := parts[1]
	signature := parts[2]

	message := header + "." + payload
	expectedSig := calculateHMAC(message, v.secret)

	if signature != expectedSig {
		return nil, errors.New("invalid token signature")
	}

	return &Claims{UserID: "admin", Role: "admin"}, nil
}

func calculateHMAC(message string, secret []byte) string {
	h := hmac.New(sha256.New, secret)
	h.Write([]byte(message))
	signature := h.Sum(nil)
	return base64.RawURLEncoding.EncodeToString(signature)
}

func (v *Validator) ValidateAny(tokenStr, atoken string) (*Claims, error) {
	if tokenStr != "" {
		if c, err := v.Validate(tokenStr); err == nil {
			return c, nil
		}
	}
	if atoken != "" {
		return v.ValidateAdmin(atoken)
	}
	return nil, errors.New("no valid token provided")
}

func stripBearer(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "Bearer ") {
		return s[7:]
	}
	return s
}
