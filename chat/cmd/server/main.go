package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Sebastian906/Prescripto-Fullstack/chat/internal/auth"
	"github.com/Sebastian906/Prescripto-Fullstack/chat/internal/config"
	"github.com/Sebastian906/Prescripto-Fullstack/chat/internal/repository"
	"github.com/Sebastian906/Prescripto-Fullstack/chat/internal/socket"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	_ "github.com/Sebastian906/Prescripto-Fullstack/chat/docs"
)

var svcHub *socket.Hub
var svcValidator *auth.Validator

func userWS(c echo.Context) error {
	return svcHub.HandleUserWS(c, svcValidator)
}

func adminWS(c echo.Context) error {
	return svcHub.HandleAdminWS(c, svcValidator)
}

func main() {
	cfg := config.Load()

	repo, err := repository.New(cfg.MongoURI, cfg.MongoDB)
	if err != nil {
		log.Fatalf("mongo connect: %v", err)
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = repo.Disconnect(ctx)
	}()

	var jwtValidator *auth.Validator
	if cfg.AdminEmail != "" || cfg.AdminPassword != "" {
		jwtValidator = auth.NewValidatorWithAdmin(cfg.JWTSecret, cfg.AdminEmail, cfg.AdminPassword)
	} else {
		jwtValidator = auth.NewValidator(cfg.JWTSecret)
	}

	hub := socket.NewHub(repo)
	go hub.Run()

	e := echo.New()
	e.HideBanner = true
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: cfg.AllowedOrigins,
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodOptions},
		AllowHeaders: []string{echo.HeaderAuthorization, echo.HeaderContentType, "token", "atoken", "dtoken"},
	}))

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	e.Static("/swagger", "./docs")

	e.GET("/swagger/doc.json", func(c echo.Context) error {
		return c.File("./docs/swagger.json")
	})

	svcHub = hub
	svcValidator = jwtValidator

	e.GET("/ws/chat", userWS)

	e.GET("/ws/admin/:conversationId", adminWS)

	e.GET("/api/chat/pending", func(c echo.Context) error {
		return handlePending(c, repo, jwtValidator)
	})

	e.GET("/api/chat/history/:conversationId", func(c echo.Context) error {
		return handleHistory(c, repo, jwtValidator)
	})

	e.PATCH("/api/chat/close/:conversationId", func(c echo.Context) error {
		return handleClose(c, repo, jwtValidator)
	})

	go func() {
		if err := e.Start(":" + cfg.Port); err != nil && err != http.ErrServerClosed {
			log.Fatalf("echo start: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := e.Shutdown(ctx); err != nil {
		log.Printf("echo shutdown: %v", err)
	}
	log.Println("chat-service stopped")
}

func handlePending(c echo.Context, repo *repository.Repo, v *auth.Validator) error {
	atoken := c.Request().Header.Get("atoken")
	if atoken == "" {
		atoken = c.QueryParam("atoken")
	}
	if _, err := v.ValidateAdmin(atoken); err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"message": "unauthorized"})
	}

	ctx, cancel := context.WithTimeout(c.Request().Context(), 5*time.Second)
	defer cancel()

	convs, err := repo.FindByStatus(ctx, repository.StatusWaitingAdmin)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]any{"success": true, "conversations": convs})
}

func handleHistory(c echo.Context, repo *repository.Repo, v *auth.Validator) error {
	token := c.Request().Header.Get("token")
	if token == "" {
		token = c.QueryParam("token")
	}
	claims, err := v.Validate(token)
	if err != nil {
		atoken := c.Request().Header.Get("atoken")
		if atoken == "" {
			atoken = c.QueryParam("atoken")
		}
		if _, err2 := v.ValidateAdmin(atoken); err2 != nil {
			return c.JSON(http.StatusUnauthorized, map[string]string{"message": "unauthorized"})
		}
		claims = nil
	}

	convID := c.Param("conversationId")
	ctx, cancel := context.WithTimeout(c.Request().Context(), 5*time.Second)
	defer cancel()

	conv, err := repo.FindByID(ctx, convID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "not found"})
	}

	if claims != nil && conv.UserID != claims.UserID {
		return c.JSON(http.StatusForbidden, map[string]string{"message": "forbidden"})
	}

	return c.JSON(http.StatusOK, map[string]any{"success": true, "conversation": conv})
}

func handleClose(c echo.Context, repo *repository.Repo, v *auth.Validator) error {
	atoken := c.Request().Header.Get("atoken")
	if atoken == "" {
		atoken = c.QueryParam("atoken")
	}
	if _, err := v.ValidateAdmin(atoken); err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"message": "unauthorized"})
	}

	convID := c.Param("conversationId")
	ctx, cancel := context.WithTimeout(c.Request().Context(), 5*time.Second)
	defer cancel()

	if err := repo.UpdateStatus(ctx, convID, repository.StatusClosed); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]string{"success": "true", "message": "Conversation closed"})
}
