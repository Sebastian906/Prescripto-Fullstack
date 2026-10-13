package socket

import (
	"context"
	"encoding/json"
	"hash/fnv"
	"log"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/Sebastian906/Prescripto-Fullstack/chat/internal/auth"
	"github.com/Sebastian906/Prescripto-Fullstack/chat/internal/bot"
	"github.com/Sebastian906/Prescripto-Fullstack/chat/internal/repository"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/sync/errgroup"
)

// allowedOrigins is the WS handshake truth. Set once from main.go via
// SetAllowedOrigins(cfg.AllowedOrigins). Defaults match local frontends.
var allowedOrigins = []string{"http://localhost:5173", "http://localhost:5174"}

// SetAllowedOrigins sets the allowlist used by CheckOrigin. Call once in main.
// An empty list denies every cross-origin request (fail closed); requests
// without an Origin header (curl, tests, non-browser clients) still pass.
func SetAllowedOrigins(origins []string) {
	allowedOrigins = origins
}

// isOriginAllowed allows requests without an Origin header (curl, tests,
// non-browser clients). A present Origin must be allowlisted.
func isOriginAllowed(origin string, allowlist []string) bool {
	if origin == "" {
		return true
	}
	for _, o := range allowlist {
		if strings.TrimSpace(o) == origin {
			return true
		}
	}
	return false
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return isOriginAllowed(r.Header.Get("Origin"), allowedOrigins)
	},
}

// firstNonEmpty returns the first non-blank value.
func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

// extractUserToken order: ?token= -> `token` header -> `Authorization: Bearer`.
// The raw value is passed through; auth.Validator strips the Bearer prefix.
func extractUserToken(queryToken, headerToken, authHeader string) string {
	return firstNonEmpty(queryToken, headerToken, authHeader)
}

// extractAdminToken order: ?atoken= -> `atoken` header -> `Authorization: Bearer`.
func extractAdminToken(queryAtoken, headerAtoken, authHeader string) string {
	return firstNonEmpty(queryAtoken, headerAtoken, authHeader)
}

type Option struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type InboundMessage struct {
	Content string `json:"content"`
}

type OutboundMessage struct {
	ID             string                 `json:"id,omitempty"`
	ConversationID string                 `json:"conversationId"`
	Sender         string                 `json:"sender"`
	SenderID       string                 `json:"senderId"`
	Content        string                 `json:"content"`
	Options        []Option               `json:"options,omitempty"`
	Metadata       repository.BotMetadata `json:"metadata,omitempty"`
	CreatedAt      time.Time              `json:"createdAt"`
	Event          string                 `json:"event,omitempty"`
}

func convertOptions(opts []bot.Option) []Option {
	out := make([]Option, len(opts))
	for i, o := range opts {
		out[i] = Option{Label: o.Label, Value: o.Value}
	}
	return out
}

func convertMetadata(m bot.Metadata) repository.BotMetadata {
	return repository.BotMetadata{Action: m.Action, Route: m.Route, Intent: m.Intent}
}

type client struct {
	hub            *Hub
	conn           *websocket.Conn
	send           chan []byte
	sendMu         sync.Mutex
	sendClosed     bool
	conversationID string
	userID         string
	role           string
	engine         *bot.Engine
}

// trySend is a non-blocking send that is safe against concurrent close.
// It reports false when the client is gone or slow; callers evict via unregister.
func (c *client) trySend(data []byte) bool {
	c.sendMu.Lock()
	defer c.sendMu.Unlock()
	if c.sendClosed {
		return false
	}
	select {
	case c.send <- data:
		return true
	default:
		return false
	}
}

func (c *client) closeSend() {
	c.sendMu.Lock()
	defer c.sendMu.Unlock()
	if !c.sendClosed {
		c.sendClosed = true
		close(c.send)
	}
}

func (c *client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(4096)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, rawMsg, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("ws read error [%s]: %v", c.conversationID, err)
			}
			break
		}

		var inbound InboundMessage
		if err := json.Unmarshal(rawMsg, &inbound); err != nil {
			continue
		}

		// Non-blocking: never stall readPump; depth>200 signals backpressure.
		c.hub.Enqueue(inboundEvent{client: c, content: inbound.Content})
	}
}

type inboundEvent struct {
	client  *client
	content string
}

type registerAndBroadcast struct {
	cl  *client
	msg OutboundMessage
}

type Hub struct {
	mu                sync.RWMutex
	rooms             map[string]map[*client]struct{}
	register          chan *client
	registerBroadcast chan registerAndBroadcast
	unregister        chan *client
	inbound           chan inboundEvent
	repo              *repository.Repo
	// Bounded pipeline (all unexported: public NewHub/Run signatures unchanged).
	workers  []chan inboundEvent
	metrics  *Metrics
	inflight atomic.Int64
	process  func(inboundEvent)
}

func NewHub(repo *repository.Repo) *Hub {
	h := &Hub{
		rooms:             make(map[string]map[*client]struct{}),
		register:          make(chan *client, 64),
		registerBroadcast: make(chan registerAndBroadcast, 64),
		unregister:        make(chan *client, 64),
		inbound:           make(chan inboundEvent, InboundBufferSize),
		repo:              repo,
		workers:           make([]chan inboundEvent, NumWorkers),
	}
	for i := range h.workers {
		h.workers[i] = make(chan inboundEvent, WorkerQueueSize)
	}
	h.process = h.handleInbound
	return h
}

// AttachMetrics wires the gauge/counter to this hub. Call once in main
// before exposing /metrics. Safe to skip in unit tests.
func (h *Hub) AttachMetrics(m *Metrics) { h.metrics = m }

// PendingLen is the effective depth for the gauge and the drop check.
func (h *Hub) PendingLen() int {
	n := len(h.inbound)
	for _, w := range h.workers {
		n += len(w)
	}
	return n
}
func (h *Hub) pendingLenFloat() float64 { return float64(h.PendingLen()) }

// Enqueue is the only producer path. Non-blocking. Depth>=200 drops
// with {event:backpressure} counted, never silently queued.
func (h *Hub) Enqueue(evt inboundEvent) bool {
	if h.PendingLen() >= BackpressureThreshold {
		h.emitBackpressure(evt.client, evt.client.conversationID)
		return false
	}
	select {
	case h.inbound <- evt:
		return true
	default:
		h.emitBackpressure(evt.client, evt.client.conversationID)
		return false
	}
}

func (h *Hub) emitBackpressure(c *client, convID string) {
	if h.metrics != nil {
		h.metrics.Dropped.WithLabelValues(DropReasonBackpress).Inc()
	}
	if c == nil {
		return
	}
	data, err := json.Marshal(OutboundMessage{
		ConversationID: convID,
		Sender:         "bot",
		SenderID:       "bot",
		Event:          "backpressure",
		CreatedAt:      time.Now(),
	})
	if err != nil {
		return
	}
	// Safe against concurrent unregister: trySend checks the closed flag.
	_ = c.trySend(data)
}

func shardRoom(convID string) uint32 {
	sum := fnv.New32a()
	_, _ = sum.Write([]byte(convID))
	return sum.Sum32() % uint32(NumWorkers)
}

func (h *Hub) Run() { _ = h.RunContext(context.Background()) }

// RunContext bounds processing with errgroup + ctx. One dispatcher
// preserves global receive order; sharded workers preserve per-room FIFO.
// On ctx cancel it drains central+worker queues, then returns.
func (h *Hub) RunContext(ctx context.Context) error {
	g, _ := errgroup.WithContext(ctx)
	g.SetLimit(NumWorkers + 1)
	// Capture the handler once before workers start: no shared-field race
	// and the in-flight counter always applies.
	base := h.process
	if base == nil {
		base = h.handleInbound
	}
	process := func(evt inboundEvent) {
		h.inflight.Add(1)
		defer h.inflight.Add(-1)
		base(evt)
	}
	for _, wch := range h.workers {
		wch := wch
		// Dispatcher alone owns shutdown: workers range until closed.
		g.Go(func() error {
			for evt := range wch {
				process(evt)
			}
			return nil
		})
	}
	g.Go(func() error {
		for {
			select {
			case <-ctx.Done():
				// Drain central into workers, then close workers.
				// Workers are still ranging, so this blocking send makes
				// progress; close only after inbound is fully enqueued.
				for {
					select {
					case evt := <-h.inbound:
						h.workers[shardRoom(evt.client.conversationID)] <- evt
					default:
						for _, wch := range h.workers {
							close(wch)
						}
						return nil
					}
				}
			case c := <-h.register:
				h.mu.Lock()
				if h.rooms[c.conversationID] == nil {
					h.rooms[c.conversationID] = make(map[*client]struct{})
				}
				h.rooms[c.conversationID][c] = struct{}{}
				h.mu.Unlock()

			case rb := <-h.registerBroadcast:
				h.mu.Lock()
				c := rb.cl
				if h.rooms[c.conversationID] == nil {
					h.rooms[c.conversationID] = make(map[*client]struct{})
				}
				h.rooms[c.conversationID][c] = struct{}{}
				h.mu.Unlock()
				h.broadcast(c.conversationID, rb.msg)

			case c := <-h.unregister:
				h.mu.Lock()
				if room, ok := h.rooms[c.conversationID]; ok {
					if _, exists := room[c]; exists {
						delete(room, c)
						c.closeSend()
						if len(room) == 0 {
							delete(h.rooms, c.conversationID)
						}
					}
				}
				h.mu.Unlock()

			case evt := <-h.inbound:
				wch := h.workers[shardRoom(evt.client.conversationID)]
				select {
				case wch <- evt:
				default:
					// Worker queue full: keep the dispatcher responsive to
					// register/unregister; signal instead of blocking.
					h.emitBackpressure(evt.client, evt.client.conversationID)
				}
			}
		}
	})
	return g.Wait()
}

// sendFailure reports a persistence failure with a visible, ephemeral bot
// bubble (never stored). The client sees feedback instead of a phantom
// message that would vanish on resume.
func (h *Hub) sendFailure(c *client) {
	lang := "en"
	if c.engine != nil {
		lang = c.engine.Lang()
	}
	data, _ := json.Marshal(OutboundMessage{
		ID:             primitive.NewObjectID().Hex(),
		ConversationID: c.conversationID,
		Sender:         "bot",
		SenderID:       "bot",
		Content:        bot.GetTranslation(lang).SendFailMsg,
		Metadata:       repository.BotMetadata{Intent: "send_failed"},
		Event:          "send_failed",
		CreatedAt:      time.Now(),
	})
	_ = c.trySend(data)
}

func (h *Hub) handleInbound(evt inboundEvent) {
	c := evt.client
	content := evt.content

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conv, err := h.repo.FindByID(ctx, c.conversationID)
	if err != nil {
		return
	}

	now := time.Now()

	userMsg := repository.Message{
		ID:        primitive.NewObjectID(),
		Sender:    c.role,
		SenderID:  c.userID,
		Content:   content,
		CreatedAt: now,
	}
	// Persist first: never broadcast what isn't stored (no phantoms on resume).
	if err := h.repo.AppendMessage(ctx, c.conversationID, userMsg); err != nil {
		h.sendFailure(c)
		return
	}

	h.broadcast(c.conversationID, OutboundMessage{
		ID:             userMsg.ID.Hex(),
		ConversationID: c.conversationID,
		Sender:         c.role,
		SenderID:       c.userID,
		Content:        content,
		CreatedAt:      now,
	})

	if conv.Status == repository.StatusWithAdmin {
		return
	}

	if conv.Status == repository.StatusWaitingAdmin {
		return
	}

	botResp := c.engine.Process(content, conv.BotState)

	if botResp.NextState == "waiting_admin" {
		_ = h.repo.UpdateStatus(ctx, c.conversationID, repository.StatusWaitingAdmin)
		_ = h.repo.UpdateBotState(ctx, c.conversationID, "waiting_admin")
	} else {
		_ = h.repo.UpdateBotState(ctx, c.conversationID, botResp.NextState)
	}

	botMsg := repository.Message{
		ID:       primitive.NewObjectID(),
		Sender:   "bot",
		SenderID: "bot",
		Content:  botResp.Text,
		Metadata: &repository.BotMetadata{
			Action: botResp.Metadata.Action,
			Route:  botResp.Metadata.Route,
			Intent: botResp.Metadata.Intent,
		},
		CreatedAt: time.Now(),
	}
	if err := h.repo.AppendMessage(ctx, c.conversationID, botMsg); err != nil {
		h.sendFailure(c)
		return
	}

	h.broadcast(c.conversationID, OutboundMessage{
		ID:             botMsg.ID.Hex(),
		ConversationID: c.conversationID,
		Sender:         "bot",
		SenderID:       "bot",
		Content:        botResp.Text,
		Options:        convertOptions(botResp.Options),
		Metadata:       convertMetadata(botResp.Metadata),
		CreatedAt:      botMsg.CreatedAt,
	})
}

func (h *Hub) broadcast(conversationID string, msg OutboundMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	h.mu.RLock()
	room := h.rooms[conversationID]
	h.mu.RUnlock()

	for c := range room {
		if !c.trySend(data) {
			h.unregister <- c
		}
	}
}

func (h *Hub) HandleUserWS(c echo.Context, v *auth.Validator) error {
	if !isOriginAllowed(c.Request().Header.Get("Origin"), allowedOrigins) {
		return c.JSON(http.StatusForbidden, map[string]string{"message": "origin not allowed"})
	}
	// Order: ?token= -> `token` header -> `Authorization: Bearer <jwt>`.
	tokenStr := extractUserToken(
		c.QueryParam("token"),
		c.Request().Header.Get("token"),
		c.Request().Header.Get(echo.HeaderAuthorization),
	)
	lang := c.QueryParam("lang")
	if lang == "" {
		lang = "en"
	}
	claims, err := v.Validate(tokenStr)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"message": "unauthorized"})
	}

	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Resume: ?conversationId= is honored only when it belongs to the caller
	// and is still open. Otherwise fall back to CreateConversation (which
	// itself reuses the user's open conversation, if any), in which case the
	// client is re-synced to the actual conversation ID below.
	var conv *repository.Conversation
	suppliedID := c.QueryParam("conversationId")
	if suppliedID != "" {
		if existing, err := h.repo.FindByID(ctx, suppliedID); err == nil &&
			existing.UserID == claims.UserID &&
			existing.Status != repository.StatusClosed {
			conv = existing
		}
	}
	resumed := conv != nil
	if !resumed {
		var err error
		conv, err = h.repo.CreateConversation(ctx, claims.UserID)
		if err != nil {
			conn.Close()
			return err
		}
	}

	cl := &client{
		hub:            h,
		conn:           conn,
		send:           make(chan []byte, 64),
		conversationID: conv.ID.Hex(),
		userID:         claims.UserID,
		role:           "user",
		engine:         bot.NewEngine(lang),
	}

	h.register <- cl

	go cl.writePump()
	go cl.readPump()

	// Ephemeral greeting on every fresh open (explicit UX: the user always
	// sees a welcome on open), never on resume (would duplicate). Only a
	// genuinely new conversation persists the greeting state: implicit
	// reuse must not clobber an ongoing dialog's BotState.
	showWelcome := !resumed
	persistWelcomeState := showWelcome && len(conv.Messages) == 0
	if showWelcome {
		welcomeResp := cl.engine.Process("hello", "start")
		welcome := OutboundMessage{
			ID:             primitive.NewObjectID().Hex(),
			ConversationID: conv.ID.Hex(),
			Sender:         "bot",
			SenderID:       "bot",
			Content:        welcomeResp.Text,
			Options:        convertOptions(welcomeResp.Options),
			Metadata:       convertMetadata(welcomeResp.Metadata),
			CreatedAt:      time.Now(),
		}
		data, _ := json.Marshal(welcome)
		_ = cl.trySend(data)
		if persistWelcomeState {
			_ = h.repo.UpdateBotState(ctx, conv.ID.Hex(), welcomeResp.NextState)
		}
	}
	// Sync the client whenever the fallback selected a conversation other
	// than the requested one (stale/closed/foreign ID, or implicit reuse of
	// the user's open conversation). The frontend replaces its stored ID on
	// this event and never renders it.
	if resumed || (suppliedID != "" && suppliedID != conv.ID.Hex()) {
		// Non-renderable sync event: lets the client confirm conversationId
		// without painting a second welcome. The frontend ignores it.
		resumedMsg := OutboundMessage{
			ID:             primitive.NewObjectID().Hex(),
			ConversationID: conv.ID.Hex(),
			Sender:         "bot",
			SenderID:       "bot",
			Content:        "",
			Event:          "resumed",
			CreatedAt:      time.Now(),
		}
		data, _ := json.Marshal(resumedMsg)
		_ = cl.trySend(data)
	}

	return nil
}

func (h *Hub) HandleAdminWS(c echo.Context, v *auth.Validator) error {
	if !isOriginAllowed(c.Request().Header.Get("Origin"), allowedOrigins) {
		return c.JSON(http.StatusForbidden, map[string]string{"message": "origin not allowed"})
	}
	// Human handoff is admin-only. `dtoken` (doctors) stays allowed in CORS
	// but is NEVER read here: doctors never chat. Order: ?atoken= ->
	// `atoken` header -> `Authorization: Bearer <jwt>` (stripped in Validator).
	atoken := extractAdminToken(
		c.QueryParam("atoken"),
		c.Request().Header.Get("atoken"),
		c.Request().Header.Get(echo.HeaderAuthorization),
	)

	claims, err := v.ValidateAdmin(atoken)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"message": "unauthorized"})
	}

	convID := c.Param("conversationId")

	lang := c.QueryParam("lang")
	if lang == "" {
		lang = "en"
	}

	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := h.repo.AssignAdmin(ctx, convID, claims.UserID); err != nil {
		conn.Close()
		return err
	}

	cl := &client{
		hub:            h,
		conn:           conn,
		send:           make(chan []byte, 64),
		conversationID: convID,
		userID:         claims.UserID,
		role:           "admin",
		engine:         bot.NewEngine(lang),
	}

	go cl.writePump()
	go cl.readPump()

	trans := bot.GetTranslation(lang)
	joinMsg := OutboundMessage{
		ID:             primitive.NewObjectID().Hex(),
		ConversationID: convID,
		Sender:         "bot",
		SenderID:       "bot",
		Content:        trans.AdminJoinedMsg,
		Metadata:       repository.BotMetadata{Intent: "admin_joined"},
		Event:          "admin_joined",
		CreatedAt:      time.Now(),
	}
	h.registerBroadcast <- registerAndBroadcast{cl: cl, msg: joinMsg}

	return nil
}
