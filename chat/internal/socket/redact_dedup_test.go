package socket

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Redaction: ningún .go (fuera de _test) puede loguear secretos.
// Cubre query string, tokens, auth headers y message content.
func TestNoSecretLoggingPatterns(t *testing.T) {
	root := "../.."
	forbidden := []string{
		"content=%q", "text=%q", // message content
		"masked", "len(atoken)", "len(token)", // token fingerprinting
		"ValidateAdmin error=%v", "Validate error=%v", // el err puede ecoar el JWT
		"RequestURI", "RawQuery", "${uri}", // query string (?token=) en logs HTTP
	}
	var failures []string
	_ = filepath.Walk(root, func(p string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		if !strings.HasSuffix(p, ".go") || strings.HasSuffix(p, "_test.go") {
			return nil
		}
		// Solo chat service.
		if !strings.Contains(p, "cmd"+string(filepath.Separator)) &&
			!strings.Contains(p, "internal"+string(filepath.Separator)) {
			return nil
		}
		b, err := os.ReadFile(p)
		if err != nil {
			return nil
		}
		src := string(b)
		for _, pat := range forbidden {
			if strings.Contains(src, pat) {
				failures = append(failures, p+": contains "+pat)
			}
		}
		// Extracción del header permitida; su log prohibido.
		for _, line := range strings.Split(src, "\n") {
			if strings.Contains(line, "Authorization") && strings.Contains(line, "log.") {
				failures = append(failures, p+": logs Authorization header")
			}
		}
		return nil
	})
	if len(failures) > 0 {
		t.Fatalf("secret logging patterns found:\n%s", strings.Join(failures, "\n"))
	}
}

// Dedup: el id emitido debe serializarse solo cuando existe y sobrevivir al round-trip.
func TestOutboundMessageID_RoundTrip(t *testing.T) {
	withID := OutboundMessage{ID: "abc123", ConversationID: "c1", Sender: "bot", Content: "hi"}
	b, _ := json.Marshal(withID)
	var back OutboundMessage
	if err := json.Unmarshal(b, &back); err != nil {
		t.Fatal(err)
	}
	if back.ID != "abc123" {
		t.Fatalf("id lost in round-trip, got %q", back.ID)
	}

	empty := OutboundMessage{ConversationID: "c1", Sender: "bot", Content: "hi"}
	be, _ := json.Marshal(empty)
	if strings.Contains(string(be), `"id"`) {
		t.Fatalf("empty id must be omitted (omitempty), got %s", be)
	}
}
