package middleware

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
	"golang.org/x/time/rate"
)

type rateLimitEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type rateLimitStore struct {
	mu      sync.RWMutex
	clients map[string]*rateLimitEntry
	rate    rate.Limit
	burst   int
}

func newRateLimitStore(r rate.Limit, burst int) *rateLimitStore {
	store := &rateLimitStore{
		clients: make(map[string]*rateLimitEntry),
		rate:    r,
		burst:   burst,
	}
	go store.cleanup()
	return store
}

func (s *rateLimitStore) getLimiter(key string) *rate.Limiter {
	s.mu.Lock()
	defer s.mu.Unlock()

	entry, exists := s.clients[key]
	if !exists {
		entry = &rateLimitEntry{
			limiter:  rate.NewLimiter(s.rate, s.burst),
			lastSeen: time.Now(),
		}
		s.clients[key] = entry
	}
	entry.lastSeen = time.Now()
	return entry.limiter
}

func (s *rateLimitStore) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		s.mu.Lock()
		for key, entry := range s.clients {
			if time.Since(entry.lastSeen) > 10*time.Minute {
				delete(s.clients, key)
			}
		}
		s.mu.Unlock()
	}
}

// RateLimitMiddleware returns an Echo middleware that limits requests per IP.
// limit = requests per second, burst = max concurrent.
func RateLimitMiddleware(rps float64, burst int) echo.MiddlewareFunc {
	store := newRateLimitStore(rate.Limit(rps), burst)

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			ip := c.RealIP()
			if ip == "" {
				ip = c.Request().RemoteAddr
			}

			key := "ip:" + ip
			limiter := store.getLimiter(key)

			if !limiter.Allow() {
				retryAfter := int(1.0 / rps) // seconds until next token
				if retryAfter < 1 {
					retryAfter = 1
				}
				c.Response().Header().Set("Retry-After", fmt.Sprintf("%d", retryAfter))
				return c.JSON(http.StatusTooManyRequests, map[string]string{
					"message": "rate limit exceeded",
				})
			}
			return next(c)
		}
	}
}

// RateLimitByKeyMiddleware limits by a custom key extractor (e.g. admin ID).
func RateLimitByKeyMiddleware(rps float64, burst int, keyFn func(c echo.Context) string) echo.MiddlewareFunc {
	store := newRateLimitStore(rate.Limit(rps), burst)

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			key := keyFn(c)
			if key == "" {
				ip := c.RealIP()
				if ip == "" {
					ip = c.Request().RemoteAddr
				}
				key = "ip:" + ip
			}

			limiter := store.getLimiter(key)

			if !limiter.Allow() {
				retryAfter := int(1.0 / rps)
				if retryAfter < 1 {
					retryAfter = 1
				}
				c.Response().Header().Set("Retry-After", fmt.Sprintf("%d", retryAfter))
				return c.JSON(http.StatusTooManyRequests, map[string]string{
					"message": "rate limit exceeded",
				})
			}
			return next(c)
		}
	}
}