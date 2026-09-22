package bot

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestGoldenIntents(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "testdata", "intents.fixtures.json"))
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	var cases []struct {
		Input        string `json:"input"`
		Lang         string `json:"lang"`
		State        string `json:"state"`
		Want         string `json:"wantIntent"`
		WantContains string `json:"wantContains"`
	}
	if err := json.Unmarshal(raw, &cases); err != nil {
		t.Fatalf("parse fixture: %v", err)
	}
	if len(cases) == 0 {
		t.Fatal("empty golden fixture")
	}
	for i, c := range cases {
		resp := NewEngine(c.Lang).Process(c.Input, c.State)
		if got := resp.Metadata.Intent; got != c.Want {
			t.Errorf("case #%d input=%q lang=%s state=%s got=%s want=%s (update testdata/intents.fixtures.json alongside engine.go)", i, c.Input, c.Lang, c.State, got, c.Want)
		} else if c.WantContains != "" && !strings.Contains(resp.Text, c.WantContains) {
			t.Errorf("case #%d input=%q lang=%s: text missing %q (got %.80q)", i, c.Input, c.Lang, c.WantContains, resp.Text)
		}
	}
}
