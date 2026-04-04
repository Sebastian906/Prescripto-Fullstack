package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	MongoURI       string
	MongoDB        string
	JWTSecret      string
	AdminEmail     string
	AdminPassword  string
	AllowedOrigins []string
}

func Load() *Config {
	for _, path := range []string{".env", "../.env", "../../.env"} {
		if err := godotenv.Load(path); err == nil {
			log.Printf("config: loaded %s", path)
			break
		}
	}

	cfg := &Config{
		Port:          getEnv("CHAT_PORT", "4000"),
		MongoURI:      getEnv("MONGODB_URI", "mongodb://localhost:27017"),
		MongoDB:       getEnv("CHAT_DB", "prescripto"),
		JWTSecret:     getEnv("JWT_SECRET", ""),
		AdminEmail:    getEnv("ADMIN_EMAIL", ""),
		AdminPassword: getEnv("ADMIN_PASSWORD", ""),
		AllowedOrigins: strings.Split(
			getEnv("CHAT_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174"),
			",",
		),
	}

	if cfg.JWTSecret == "" {
		log.Fatal("config: JWT_SECRET must be set")
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}