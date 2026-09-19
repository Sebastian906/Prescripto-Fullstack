package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                string
	MongoURI            string
	MongoDB             string
	JWTSecret           string
	JWTSecretPrevious   string
	JWTRotationDeadline string
	AdminEmail          string
	AdminPassword       string
	AllowedOrigins      []string
}

func Load() *Config {
	for _, path := range []string{".env", "../.env", "../../.env"} {
		if err := godotenv.Load(path); err == nil {
			log.Printf("config: loaded %s", path)
			break
		}
	}

	cfg := &Config{
		Port:                getEnv("CHAT_PORT", "4000"),
		MongoURI:            getEnv("MONGODB_URI", "mongodb://localhost:27017"),
		MongoDB:             getEnv("CHAT_DB", "prescripto"),
		JWTSecret:           firstNonEmpty(getEnv("JWT_SECRET_CURRENT", ""), getEnv("JWT_SECRET", "")),
		JWTSecretPrevious:   getEnv("JWT_SECRET_PREVIOUS", ""),
		JWTRotationDeadline: getEnv("JWT_ROTATION_DEADLINE", ""),
		AdminEmail:          getEnv("ADMIN_EMAIL", ""),
		AdminPassword:       getEnv("ADMIN_PASSWORD", ""),
		AllowedOrigins:      normalizeOrigins(getEnv("CHAT_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174")),
	}

	if cfg.JWTSecret == "" {
		log.Fatal("config: JWT_SECRET_CURRENT or JWT_SECRET must be set")
	}

	return cfg
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

// normalizeOrigins trims, drops empties (trailing commas), keeps exact-match semantics.
func normalizeOrigins(raw string) []string {
	parts := strings.Split(raw, ",");
	out := make([]string, 0, len(parts));
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t);
		}
	}
	return out;
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}