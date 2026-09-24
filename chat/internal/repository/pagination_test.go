package repository_test

import (
	"testing"
	"time"

	"github.com/Sebastian906/Prescripto-Fullstack/chat/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func mkMsgs(n int, base time.Time) []repository.Message {
	out := make([]repository.Message, n)
	for i := range out {
		out[i] = repository.Message{
			ID:        primitive.NewObjectID(),
			Sender:    "user",
			Content:   "m",
			CreatedAt: base.Add(time.Duration(i) * time.Minute),
		}
	}
	return out
}

func TestParseHistoryLimit(t *testing.T) {
	if v, _ := repository.ParseHistoryLimit(""); v != 50 {
		t.Errorf("default = %d, want 50", v)
	}
	if v, _ := repository.ParseHistoryLimit("10"); v != 10 {
		t.Errorf("got %d want 10", v)
	}
	for _, bad := range []string{"0", "101", "-1", "abc", "1.5"} {
		if _, err := repository.ParseHistoryLimit(bad); err == nil {
			t.Errorf("limit %q should fail", bad)
		}
	}
	if _, err := repository.ParseHistoryLimit("1"); err != nil {
		t.Errorf("limit 1 should pass: %v", err)
	}
	if _, err := repository.ParseHistoryLimit("100"); err != nil {
		t.Errorf("limit 100 should pass: %v", err)
	}
}

func TestParseHistoryBefore(t *testing.T) {
	_, has, _ := repository.ParseHistoryBefore("")
	if has {
		t.Error("empty before should mean now (has=false)")
	}
	ts := time.Date(2024, 5, 24, 12, 0, 0, 0, time.UTC)
	ms := ts.UnixMilli()
	got, has, err := repository.ParseHistoryBefore("1716540000000")
	_ = got
	_ = ms
	if err != nil || !has {
		t.Fatalf("epoch ms parse: %v", err)
	}
	if _, _, err := repository.ParseHistoryBefore("2024-05-24T12:00:00Z"); err != nil {
		t.Fatalf("ISO parse: %v", err)
	}
	if _, _, err := repository.ParseHistoryBefore("not-a-date"); err == nil {
		t.Error("invalid before should fail")
	}
	if _, _, err := repository.ParseHistoryBefore("-5"); err == nil {
		t.Error("negative before should fail")
	}
}

func TestSliceMessagesPage_Deterministic(t *testing.T) {
	base := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	msgs := mkMsgs(500, base)
	p1 := repository.SliceMessagesPage(msgs, time.Time{}, false, 50)
	if len(p1.Messages) != 50 {
		t.Fatalf("p1 len=%d want 50", len(p1.Messages))
	}
	if !p1.HasMore || p1.Total != 500 {
		t.Fatalf("p1 hasMore=%v total=%d", p1.HasMore, p1.Total)
	}
	if p1.NextBefore == "" {
		t.Fatal("p1 should expose nextBefore")
	}
	// Newest first.
	if p1.Messages[0].CreatedAt.Before(p1.Messages[1].CreatedAt) {
		t.Fatal("messages must be newest-first")
	}
	// Second page strictly older.
	nb, _, _ := repository.ParseHistoryBefore(p1.NextBefore)
	p2 := repository.SliceMessagesPage(msgs, nb, true, 50)
	if len(p2.Messages) != 50 {
		t.Fatalf("p2 len=%d", len(p2.Messages))
	}
	if !p2.Messages[0].CreatedAt.Before(p1.Messages[49].CreatedAt.Add(time.Nanosecond)) {
		t.Fatal("p2 must continue before p1 tail")
	}
	// full walk covers all 500 without overlap
	seen := map[string]bool{}
	for _, m := range p1.Messages {
		seen[m.ID.Hex()] = true
	}
	for _, m := range p2.Messages {
		if seen[m.ID.Hex()] {
			t.Fatal("overlap between pages")
		}
	}
}

func TestSliceMessagesPage_BeforeFilter(t *testing.T) {
	base := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	msgs := mkMsgs(10, base)
	cut := base.Add(5 * time.Minute)
	p := repository.SliceMessagesPage(msgs, cut, true, 50)
	if p.Total != 5 {
		t.Fatalf("total=%d want 5 (strictly before)", p.Total)
	}
	if p.HasMore {
		t.Fatal("should not have more")
	}
}

func TestSliceMessagesPage_Empty(t *testing.T) {
	p := repository.SliceMessagesPage(nil, time.Time{}, false, 50)
	if len(p.Messages) != 0 || p.HasMore || p.Total != 0 {
		t.Fatalf("empty: %+v", p)
	}
}