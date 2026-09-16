package repository_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/Sebastian906/Prescripto-Fullstack/chat/internal/repository"
)

// Requires a running MongoDB instance.
// Set MONGO_TEST_URI or defaults to mongodb://localhost:27017.
func testRepo(t *testing.T) (*repository.Repo, func()) {
	t.Helper()

	uri := os.Getenv("MONGO_TEST_URI")
	if uri == "" {
		uri = "mongodb://localhost:27017"
	}

	repo, err := repository.New(uri, "chat_test_"+time.Now().Format("0102150405"))
	if err != nil {
		t.Skipf("MongoDB not available at %s: %v", uri, err)
	}

	return repo, func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = repo.Disconnect(ctx)
	}
}

func TestCreateConversation_ReusesOpen(t *testing.T) {
	repo, cleanup := testRepo(t)
	defer cleanup()

	ctx := context.Background()
	userID := "test-user-123"

	// First call — creates a new conversation
	conv1, err := repo.CreateConversation(ctx, userID)
	if err != nil {
		t.Fatalf("first CreateConversation: %v", err)
	}

	// Second call — must reuse the same conversation
	conv2, err := repo.CreateConversation(ctx, userID)
	if err != nil {
		t.Fatalf("second CreateConversation: %v", err)
	}

	if conv1.ID != conv2.ID {
		t.Errorf("expected same conversation ID, got %s and %s", conv1.ID, conv2.ID)
	}
}

func TestCreateConversation_DoesNotReuseClosed(t *testing.T) {
	repo, cleanup := testRepo(t)
	defer cleanup()

	ctx := context.Background()
	userID := "test-user-closed"

	conv1, err := repo.CreateConversation(ctx, userID)
	if err != nil {
		t.Fatalf("first CreateConversation: %v", err)
	}

	// Close the conversation
	if err := repo.UpdateStatus(ctx, conv1.ID.Hex(), repository.StatusClosed); err != nil {
		t.Fatalf("UpdateStatus: %v", err)
	}

	// New conversation must be created (not reused)
	conv2, err := repo.CreateConversation(ctx, userID)
	if err != nil {
		t.Fatalf("third CreateConversation: %v", err)
	}

	if conv1.ID == conv2.ID {
		t.Error("expected a new conversation after closing the previous one")
	}
}

func TestFindByStatus_LimitsResults(t *testing.T) {
	repo, cleanup := testRepo(t)
	defer cleanup()

	ctx := context.Background()

	// Create 55 conversations with status "bot"
	for i := 0; i < 55; i++ {
		userID := "limit-test-user-" + time.Now().Format("0102150405.000") + "-" + string(rune('A'+i%26))
		if _, err := repo.CreateConversation(ctx, userID); err != nil {
			t.Fatalf("CreateConversation %d: %v", i, err)
		}
	}

	convs, err := repo.FindByStatus(ctx, repository.StatusBot)
	if err != nil {
		t.Fatalf("FindByStatus: %v", err)
	}

	if len(convs) > 50 {
		t.Errorf("expected at most 50 results, got %d", len(convs))
	}
}
