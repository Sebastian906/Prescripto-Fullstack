package socket

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/prometheus/client_golang/prometheus"
)

func newTestHub() *Hub {
	h := NewHub(nil)
	reg := prometheus.NewRegistry()
	m, err := RegisterInboundMetrics(func() float64 { return float64(h.PendingLen()) }, reg)
	if err != nil {
		panic(err)
	}
	h.AttachMetrics(m)
	return h
}

func testClient(h *Hub, conv string) *client {
	return &client{hub: h, send: make(chan []byte, 1024), conversationID: conv, userID: "u1", role: "user"}
}

func waitFor(t *testing.T, d time.Duration, cond func() bool, msg string) {
	t.Helper()
	dead := time.Now().Add(d)
	for time.Now().Before(dead) {
		if cond() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("timeout: %s", msg)
}

func TestBurst1000_BackpressureCounted(t *testing.T) {
	h := newTestHub()
	var mu sync.Mutex
	processed := 0
	done := make(chan struct{}, 1000)
	h.process = func(evt inboundEvent) { mu.Lock(); processed++; mu.Unlock(); done <- struct{}{} }
	// Drive the sharded pipeline without RunContext dispatcher: emulate it.
	go func() {
		for evt := range h.inbound {
			h.workers[shardRoom(evt.client.conversationID)] <- evt
		}
	}()
	for _, wch := range h.workers {
		wch := wch
		go func() {
			for evt := range wch {
				h.process(evt)
			}
		}()
	}
	c := testClient(h, "room-burst")
	const total = 1000
	dropped := 0
	for i := 0; i < total; i++ {
		if !h.Enqueue(inboundEvent{client: c, content: "hi"}) {
			dropped++
		}
	}
	if dropped == 0 {
		t.Fatalf("burst 1000 must drop beyond 200, got 0 drops")
	}
	waitFor(t, 5*time.Second, func() bool {
		mu.Lock()
		defer mu.Unlock()
		return processed+dropped == total
	}, "processed+dropped must equal 1000 (no silent drops)")
	// Every drop produced a backpressure event on the client channel.
	found := 0
	for len(c.send) > 0 {
		var m OutboundMessage
		if err := json.Unmarshal(<-c.send, &m); err == nil && m.Event == "backpressure" {
			found++
		}
	}
	if found != dropped {
		t.Fatalf("backpressure events %d != drops %d", found, dropped)
	}
}

func TestOrderPerRoomPreserved(t *testing.T) {
	h := newTestHub()
	var mu sync.Mutex
	seen := map[string][]string{}
	var wg sync.WaitGroup
	h.process = func(evt inboundEvent) {
		time.Sleep(1 * time.Millisecond) // force interleave across rooms
		mu.Lock()
		seen[evt.client.conversationID] = append(seen[evt.client.conversationID], evt.content)
		mu.Unlock()
		wg.Done()
	}
	// Exercise the real dispatch and drain path.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	hubDone := make(chan error, 1)
	go func() { hubDone <- h.RunContext(ctx) }()

	rooms := []string{"room-A", "room-B"}
	const perRoom = 50
	wg.Add(len(rooms) * perRoom)
	for _, r := range rooms {
		r := r
		go func() {
			cl := testClient(h, r)
			for i := 0; i < perRoom; i++ {
				// Unique sequence per room; total 100 stays below the 200 drop threshold.
				if !h.Enqueue(inboundEvent{client: cl, content: fmt.Sprintf("%d", i)}) {
					t.Errorf("unexpected drop room=%s seq=%d", r, i)
					wg.Done()
				}
			}
		}()
	}
	waitFor(t, 5*time.Second, func() bool {
		mu.Lock()
		defer mu.Unlock()
		return len(seen["room-A"]) == perRoom && len(seen["room-B"]) == perRoom
	}, "both rooms must keep 50 msgs")
	mu.Lock()
	for _, r := range rooms {
		got := seen[r]
		if len(got) != perRoom {
			mu.Unlock()
			t.Fatalf("room %s got %d msgs, want %d", r, len(got), perRoom)
		}
		for i := 0; i < perRoom; i++ {
			if want := fmt.Sprintf("%d", i); got[i] != want {
				mu.Unlock()
				t.Fatalf("room %s out of order at %d: got %q want %q", r, i, got[i], want)
			}
		}
	}
	mu.Unlock()
	cancel()
	select {
	case <-hubDone:
	case <-time.After(5 * time.Second):
		t.Fatal("RunContext did not stop after cancel")
	}
}

func TestInboundLenGaugeMoves(t *testing.T) {
	h := newTestHub()
	if got := h.PendingLen(); got != 0 {
		t.Fatalf("empty hub len=%d, want 0", got)
	}
	c := testClient(h, "room-gauge")
	for i := 0; i < 10; i++ {
		h.inbound <- inboundEvent{client: c, content: "x"}
	}
	if got := h.PendingLen(); got != 10 {
		t.Fatalf("len=%d, want 10", got)
	}
	for i := 0; i < 10; i++ {
		<-h.inbound
	}
	if got := h.PendingLen(); got != 0 {
		t.Fatalf("drained len=%d, want 0", got)
	}
}

func TestShutdownDrainsPending(t *testing.T) {
	h := newTestHub()
	var mu sync.Mutex
	n := 0
	h.process = func(inboundEvent) { mu.Lock(); n++; mu.Unlock() }
	c := testClient(h, "room-drain")
	for i := 0; i < 20; i++ {
		h.inbound <- inboundEvent{client: c, content: "m"}
	}
	// Simulate RunContext drain phase: move central -> worker 0, then drain.
	for len(h.inbound) > 0 {
		evt := <-h.inbound
		h.workers[0] <- evt
	}
	close(h.workers[0])
	for evt := range h.workers[0] {
		h.process(evt)
	}
	mu.Lock()
	defer mu.Unlock()
	if n != 20 {
		t.Fatalf("drained %d, want 20", n)
	}
}
