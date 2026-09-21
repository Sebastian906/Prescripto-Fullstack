package bot

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestGoldenIntents(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "testdata", "golden_intents.json"))
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	var cases []struct {
		Input string `json:"input"`
		Lang  string `json:"lang"`
		State string `json:"state"`
		Want  string `json:"wantIntent"`
	}
	if err := json.Unmarshal(raw, &cases); err != nil {
		t.Fatalf("parse fixture: %v", err)
	}
	if len(cases) == 0 {
		t.Fatal("empty golden fixture")
	}
	for i, c := range cases {
		got := NewEngine(c.Lang).Process(c.Input, c.State).Metadata.Intent
		if got != c.Want {
			t.Errorf("case #%d input=%q lang=%s state=%s got=%s want=%s (update testdata/golden_intents.json alongside engine.go)", i, c.Input, c.Lang, c.State, got, c.Want)
		}
	}
}