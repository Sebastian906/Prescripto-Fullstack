package socket

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/Sebastian906/Prescripto-Fullstack/chat/internal/auth"
	"github.com/Sebastian906/Prescripto-Fullstack/chat/internal/bot"
	"github.com/Sebastian906/Prescripto-Fullstack/chat/internal/repository"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

type Option struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type InboundMessage struct {
	Content string `json:"content"`
}

type OutboundMessage struct {
	ID             string                 `json:"id"`
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
	conversationID string
	userID         string
	role           string
	engine         *bot.Engine
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

		c.hub.inbound <- inboundEvent{client: c, content: inbound.Content}
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
}

func NewHub(repo *repository.Repo) *Hub {
	return &Hub{
		rooms:             make(map[string]map[*client]struct{}),
		register:          make(chan *client, 64),
		registerBroadcast: make(chan registerAndBroadcast, 64),
		unregister:        make(chan *client, 64),
		inbound:           make(chan inboundEvent, 256),
		repo:              repo,
	}
}

func (h *Hub) Run() {
	for {
		select {

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
					close(c.send)
					if len(room) == 0 {
						delete(h.rooms, c.conversationID)
					}
				}
			}
			h.mu.Unlock()

		case evt := <-h.inbound:
			go h.handleInbound(evt)
		}
	}
}

func (h *Hub) handleInbound(evt inboundEvent) {
	c := evt.client
	content := evt.content

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conv, err := h.repo.FindByID(ctx, c.conversationID)
	if err != nil {
		log.Printf("hub: conversation not found %s: %v", c.conversationID, err)
		return
	}

	// Debug: show conversation state and inbound content
	log.Printf("hub: inbound conv=%s status=%s botState=%s user=%s content=%q", conv.ID.Hex(), conv.Status, conv.BotState, c.userID, content)

	now := time.Now()

	userMsg := repository.Message{
		Sender:    c.role,
		SenderID:  c.userID,
		Content:   content,
		CreatedAt: now,
	}
	if err := h.repo.AppendMessage(ctx, c.conversationID, userMsg); err != nil {
		log.Printf("hub: AppendMessage error: %v", err)
	}
	log.Printf("hub: appended user message conv=%s user=%s", c.conversationID, c.userID)

	h.broadcast(c.conversationID, OutboundMessage{
		ConversationID: c.conversationID,
		Sender:         c.role,
		SenderID:       c.userID,
		Content:        content,
		CreatedAt:      now,
	})
	log.Printf("hub: broadcasted user message conv=%s user=%s", c.conversationID, c.userID)

	if conv.Status == repository.StatusWithAdmin {
		log.Printf("hub: conv=%s has admin present; skipping bot processing", c.conversationID)
		return
	}

	if conv.Status == repository.StatusWaitingAdmin {
		log.Printf("hub: conv=%s is waiting admin; skipping bot processing", c.conversationID)
		return
	}

	botResp := c.engine.Process(content, conv.BotState)
	log.Printf("hub: bot processed conv=%s user=%s botState=%s -> intent=%s nextState=%s text=%q", c.conversationID, c.userID, conv.BotState, botResp.Metadata.Intent, botResp.NextState, botResp.Text)

	if botResp.NextState == "waiting_admin" {
		log.Printf("hub: conv=%s bot requested human escalation -> setting waiting_admin", c.conversationID)
		_ = h.repo.UpdateStatus(ctx, c.conversationID, repository.StatusWaitingAdmin)
		_ = h.repo.UpdateBotState(ctx, c.conversationID, "waiting_admin")
	} else {
		log.Printf("hub: conv=%s updating botState -> %s", c.conversationID, botResp.NextState)
		_ = h.repo.UpdateBotState(ctx, c.conversationID, botResp.NextState)
	}

	botMsg := repository.Message{
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
		log.Printf("hub: AppendMessage bot error: %v", err)
	}

	h.broadcast(c.conversationID, OutboundMessage{
		ConversationID: c.conversationID,
		Sender:         "bot",
		SenderID:       "bot",
		Content:        botResp.Text,
		Options:        convertOptions(botResp.Options),
		Metadata:       convertMetadata(botResp.Metadata),
		CreatedAt:      botMsg.CreatedAt,
	})
	log.Printf("hub: broadcasted bot message conv=%s text=%q", c.conversationID, botResp.Text)
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
		select {
		case c.send <- data:
		default:
			h.unregister <- c
		}
	}
}

func (h *Hub) HandleUserWS(c echo.Context, v *auth.Validator) error {
	tokenStr := c.QueryParam("token")
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

	conv, err := h.repo.CreateConversation(ctx, claims.UserID)
	if err != nil {
		conn.Close()
		return err
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

	if len(conv.Messages) == 0 {
		welcomeResp := cl.engine.Process("hello", "start")
		welcome := OutboundMessage{
			ConversationID: conv.ID.Hex(),
			Sender:         "bot",
			SenderID:       "bot",
			Content:        welcomeResp.Text,
			Options:        convertOptions(welcomeResp.Options),
			Metadata:       convertMetadata(welcomeResp.Metadata),
			CreatedAt:      time.Now(),
		}
		data, _ := json.Marshal(welcome)
		cl.send <- data
		_ = h.repo.UpdateBotState(ctx, conv.ID.Hex(), welcomeResp.NextState)
	} else {
		trans := bot.GetTranslation(lang)
		histMsg := OutboundMessage{
			ConversationID: conv.ID.Hex(),
			Sender:         "bot",
			SenderID:       "bot",
			Content:        "Welcome back! How can I continue helping you?",
			Options:        []Option{{Label: trans.MainMenuBtn, Value: "main_menu"}},
			Metadata:       repository.BotMetadata{Intent: "resume"},
			CreatedAt:      time.Now(),
		}
		data, _ := json.Marshal(histMsg)
		cl.send <- data
	}

	return nil
}

func (h *Hub) HandleAdminWS(c echo.Context, v *auth.Validator) error {
	atoken := c.QueryParam("atoken")
	if atoken == "" {
		atoken = c.Request().Header.Get("atoken")
	}
	if atoken == "" {
		atoken = c.Request().Header.Get(echo.HeaderAuthorization)
	}

	masked := atoken
	if len(masked) > 12 {
		masked = masked[:8] + "..."
	}
	log.Printf("chat: HandleAdminWS received atoken (masked)=%s len=%d conv=%s", masked, len(atoken), c.Param("conversationId"))

	claims, err := v.ValidateAdmin(atoken)
	if err != nil {
		log.Printf("chat: HandleAdminWS ValidateAdmin error=%v", err)
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
