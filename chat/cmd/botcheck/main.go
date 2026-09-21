package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"github.com/Sebastian906/Prescripto-Fullstack/chat/internal/bot"
)

type goldenCase struct {
	Input string `json:"input"`
	Lang  string `json:"lang"`
	State string `json:"state"`
	Want  string `json:"wantIntent"`
}

func fixturePath() string {
	_, file, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(file), "..", "..", "testdata", "golden_intents.json")
}

func main() {
	raw, err := os.ReadFile(fixturePath())
	if err != nil {
		fmt.Fprintf(os.Stderr, "botcheck: read fixture: %v\n", err)
		os.Exit(1)
	}
	var cases []goldenCase
	if err := json.Unmarshal(raw, &cases); err != nil {
		fmt.Fprintf(os.Stderr, "botcheck: parse fixture: %v\n", err)
		os.Exit(1)
	}
	if len(cases) == 0 {
		fmt.Fprintln(os.Stderr, "botcheck: empty fixture")
		os.Exit(1)
	}
	failed := 0
	for i, c := range cases {
		eng := bot.NewEngine(c.Lang)
		got := eng.Process(c.Input, c.State).Metadata.Intent
		if got != c.Want {
			fmt.Printf("FAIL #%d input=%q lang=%s state=%s got=%s want=%s\n", i, c.Input, c.Lang, c.State, got, c.Want)
			failed++
		}
	}
	fmt.Printf("botcheck: %d cases, %d failed\n", len(cases), failed)
	if failed > 0 {
		os.Exit(1)
	}
}