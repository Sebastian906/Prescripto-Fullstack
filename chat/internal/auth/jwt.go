package auth

import (
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

	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected alg: %v", t.Header["alg"])
		}
		return v.secret, nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid admin token: %w", err)
	}

	return &Claims{UserID: "admin", Role: "admin"}, nil
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