package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/Sebastian906/Prescripto-Fullstack/chat/internal/bot"
)

type fixtureCase struct {
	Input        string `json:"input"`
	Lang         string `json:"lang"`
	State        string `json:"state"`
	WantIntent   string `json:"wantIntent"`
	WantContains string `json:"wantContains,omitempty"`
}

type caseResult struct {
	Input      string `json:"input"`
	WantIntent string `json:"wantIntent"`
	Intent     string `json:"intent"`
	Text       string `json:"text"`
	Pass       bool   `json:"pass"`
}

func defaultFixturePath() string {
	cwd := filepath.Join("testdata", "intents.fixtures.json")
	if _, err := os.Stat(cwd); err == nil {
		return cwd
	}
	_, file, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(file), "..", "..", "testdata", "intents.fixtures.json")
}

func main() {
	langFlag := flag.String("lang", "", "filter cases by language (en|es); empty runs all")
	scriptFlag := flag.String("script", "", "fixture path (default testdata/intents.fixtures.json)")
	jsonFlag := flag.Bool("json", false, "print results as a JSON array of {input,wantIntent,intent,text,pass}")
	flag.Parse()

	if *langFlag != "" && *langFlag != "en" && *langFlag != "es" {
		fmt.Fprintf(os.Stderr, "botcheck: invalid --lang %q (want en|es)\n", *langFlag)
		os.Exit(2)
	}
	path := *scriptFlag
	if path == "" {
		path = defaultFixturePath()
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "botcheck: read fixture: %v\n", err)
		os.Exit(1)
	}
	var cases []fixtureCase
	if err := json.Unmarshal(raw, &cases); err != nil {
		fmt.Fprintf(os.Stderr, "botcheck: parse fixture: %v\n", err)
		os.Exit(1)
	}
	if len(cases) == 0 {
		fmt.Fprintln(os.Stderr, "botcheck: empty fixture")
		os.Exit(1)
	}

	results := make([]caseResult, 0, len(cases))
	failed := 0
	for _, c := range cases {
		if *langFlag != "" && c.Lang != *langFlag {
			continue
		}
		resp := bot.NewEngine(c.Lang).Process(c.Input, c.State)
		got := resp.Metadata.Intent
		pass := got == c.WantIntent && (c.WantContains == "" || strings.Contains(resp.Text, c.WantContains))
		if !pass {
			failed++
		}
		results = append(results, caseResult{
			Input:      c.Input,
			WantIntent: c.WantIntent,
			Intent:     got,
			Text:       resp.Text,
			Pass:       pass,
		})
	}
	if len(results) == 0 {
		fmt.Fprintf(os.Stderr, "botcheck: no cases match --lang %q\n", *langFlag)
		os.Exit(1)
	}

	if *jsonFlag {
		out, err := json.MarshalIndent(results, "", "  ")
		if err != nil {
			fmt.Fprintf(os.Stderr, "botcheck: encode results: %v\n", err)
			os.Exit(1)
		}
		fmt.Println(string(out))
	} else {
		for i, r := range results {
			status := "PASS"
			if !r.Pass {
				status = "FAIL"
			}
			fmt.Printf("%s #%d input=%q lang-filter=%q got=%s want=%s\n", status, i, r.Input, *langFlag, r.Intent, r.WantIntent)
		}
		fmt.Printf("botcheck: %d cases, %d failed\n", len(results), failed)
	}
	if failed > 0 {
		os.Exit(1)
	}
}
