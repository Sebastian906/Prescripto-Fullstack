package repository

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ConversationStatus string

const (
	StatusBot          ConversationStatus = "bot"
	StatusWaitingAdmin ConversationStatus = "waiting_admin"
	StatusWithAdmin    ConversationStatus = "with_admin"
	StatusClosed       ConversationStatus = "closed"
)

// History pagination bounds. Contract: limit 1-100, default 50.
const (
	DefaultHistoryLimit = 50
	MaxHistoryLimit     = 100
	MinHistoryLimit     = 1
)

type Message struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"      json:"id"`
	Sender    string             `bson:"sender"             json:"sender"`
	SenderID  string             `bson:"senderId"           json:"senderId"`
	Content   string             `bson:"content"            json:"content"`
	Metadata  *BotMetadata       `bson:"metadata,omitempty" json:"metadata,omitempty"`
	CreatedAt time.Time          `bson:"createdAt"          json:"createdAt"`
}

type BotMetadata struct {
	Action string `bson:"action,omitempty" json:"action,omitempty"`
	Route  string `bson:"route,omitempty"  json:"route,omitempty"`
	Intent string `bson:"intent,omitempty" json:"intent,omitempty"`
}

type Conversation struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"     json:"id"`
	UserID    string             `bson:"userID"            json:"userID"`
	Status    ConversationStatus `bson:"status"            json:"status"`
	BotState  string             `bson:"botState"          json:"botState"`
	AdminID   string             `bson:"adminId,omitempty" json:"adminId,omitempty"`
	Messages  []Message          `bson:"messages"          json:"messages"`
	CreatedAt time.Time          `bson:"createdAt"         json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt"         json:"updatedAt"`
}

// HistoryPage is one deterministic page of messages, newest first.
type HistoryPage struct {
	Messages   []Message `json:"messages"`
	Total      int       `json:"total"`
	HasMore    bool      `json:"hasMore"`
	NextBefore string    `json:"nextBefore,omitempty"`
}

type Repo struct {
	client *mongo.Client
	col    *mongo.Collection
}

func New(uri, dbName string) (*Repo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, err
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	col := client.Database(dbName).Collection("conversations")

	// Idempotent index migration: drop stale userId_1 index, create userID_1
	dropStaleUserIDIndex(ctx, col)

	_, _ = col.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "userID", Value: 1},
			{Key: "status", Value: 1},
		},
	})

	// Index for FindByStatus: filter by status, sort by updatedAt desc
	_, _ = col.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "status", Value: 1},
			{Key: "updatedAt", Value: -1},
		},
	})

	// Multikey index for history pagination ($unwind + sort on messages.createdAt).
	_, _ = col.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "messages.createdAt", Value: -1}},
	})

	return &Repo{client: client, col: col}, nil
}

// dropStaleUserIDIndex removes the old index with lowercase "userId" field.
// Ignores errors (index may not exist).
func dropStaleUserIDIndex(ctx context.Context, col *mongo.Collection) {
	idxCursor, err := col.Indexes().List(ctx)
	if err != nil {
		return
	}

	for idxCursor.Next(ctx) {
		var idx bson.M
		if err := idxCursor.Decode(&idx); err != nil {
			continue
		}
		key, ok := idx["key"].(bson.M)
		if !ok {
			continue
		}
		// Old index: {userId: 1, status: 1} — lowercase 'd'
		if _, hasUID := key["userId"]; hasUID {
			name, _ := idx["name"].(string)
			if name != "" {
				_, _ = col.Indexes().DropOne(ctx, name)
			}
		}
	}
}

func (r *Repo) Disconnect(ctx context.Context) error {
	return r.client.Disconnect(ctx)
}

func (r *Repo) CreateConversation(ctx context.Context, userID string) (*Conversation, error) {
	existing, err := r.findOpenByUser(ctx, userID)
	if err == nil {
		return existing, nil
	}

	now := time.Now()
	conv := &Conversation{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Status:    StatusBot,
		BotState:  "start",
		Messages:  []Message{},
		CreatedAt: now,
		UpdatedAt: now,
	}
	if _, err := r.col.InsertOne(ctx, conv); err != nil {
		return nil, err
	}
	return conv, nil
}

func (r *Repo) AppendMessage(ctx context.Context, convID string, msg Message) error {
	oid, err := toObjectID(convID)
	if err != nil {
		return err
	}

	if msg.ID.IsZero() {
		msg.ID = primitive.NewObjectID()
	}

	if msg.CreatedAt.IsZero() {
		msg.CreatedAt = time.Now()
	}

	_, err = r.col.UpdateOne(ctx,
		bson.M{"_id": oid},
		bson.M{
			"$push": bson.M{"messages": msg},
			"$set":  bson.M{"updatedAt": time.Now()},
		},
	)
	return err
}

func (r *Repo) UpdateStatus(ctx context.Context, convID string, status ConversationStatus) error {
	oid, err := toObjectID(convID)
	if err != nil {
		return err
	}

	_, err = r.col.UpdateOne(ctx,
		bson.M{"_id": oid},
		bson.M{"$set": bson.M{
			"status":    status,
			"updatedAt": time.Now(),
		}},
	)
	return err
}

func (r *Repo) UpdateBotState(ctx context.Context, convID, state string) error {
	oid, err := toObjectID(convID)
	if err != nil {
		return err
	}

	_, err = r.col.UpdateOne(ctx,
		bson.M{"_id": oid},
		bson.M{"$set": bson.M{
			"botState":  state,
			"updatedAt": time.Now(),
		}},
	)
	return err
}

func (r *Repo) AssignAdmin(ctx context.Context, convID, adminID string) error {
	oid, err := toObjectID(convID)
	if err != nil {
		return err
	}

	_, err = r.col.UpdateOne(ctx,
		bson.M{"_id": oid},
		bson.M{"$set": bson.M{
			"adminId":   adminID,
			"status":    StatusWithAdmin,
			"updatedAt": time.Now(),
		}},
	)
	return err
}

func (r *Repo) FindByID(ctx context.Context, convID string) (*Conversation, error) {
	oid, err := toObjectID(convID)
	if err != nil {
		return nil, err
	}

	var conv Conversation
	err = r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&conv)
	if err != nil {
		return nil, err
	}
	return &conv, nil
}

func (r *Repo) FindByStatus(ctx context.Context, status ConversationStatus) ([]Conversation, error) {
	opts := options.Find().
		SetSort(bson.D{{Key: "updatedAt", Value: -1}}).
		SetLimit(50)

	cur, err := r.col.Find(ctx, bson.M{"status": status}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var convs []Conversation
	if err := cur.All(ctx, &convs); err != nil {
		return nil, err
	}
	return convs, nil
}

func (r *Repo) FindOpenByUser(ctx context.Context, userID string) (*Conversation, error) {
	return r.findOpenByUser(ctx, userID)
}

func (r *Repo) findOpenByUser(ctx context.Context, userID string) (*Conversation, error) {
	filter := bson.M{
		"userID": userID,
		"status": bson.M{"$nin": []ConversationStatus{StatusClosed}},
	}
	opts := options.FindOne().SetSort(bson.D{{Key: "updatedAt", Value: -1}})

	var conv Conversation
	err := r.col.FindOne(ctx, filter, opts).Decode(&conv)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, err
	}
	return &conv, err
}

// ParseHistoryLimit validates ?limit=. Empty -> default 50. Out of 1-100 -> error (handler maps to 400).
func ParseHistoryLimit(raw string) (int, error) {
	if raw == "" {
		return DefaultHistoryLimit, nil
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("invalid limit %q: %w", raw, err)
	}
	if n < MinHistoryLimit || n > MaxHistoryLimit {
		return 0, fmt.Errorf("limit %d out of range [%d,%d]", n, MinHistoryLimit, MaxHistoryLimit)
	}
	return n, nil
}

// ClampHistoryLimit is the internal safety net (never fails).
func ClampHistoryLimit(n int) int {
	if n < MinHistoryLimit {
		return MinHistoryLimit
	}
	if n > MaxHistoryLimit {
		return MaxHistoryLimit
	}
	return n
}

// ParseHistoryBefore validates ?before=. Empty -> (zero,false,nil) meaning "now".
// Accepts epoch milliseconds ("1716540000000") or ISO-8601/RFC3339 ("2024-05-24T12:00:00Z").
func ParseHistoryBefore(raw string) (time.Time, bool, error) {
	if raw == "" {
		return time.Time{}, false, nil
	}
	if ms, err := strconv.ParseInt(raw, 10, 64); err == nil {
		if ms < 0 {
			return time.Time{}, false, fmt.Errorf("negative before %q", raw)
		}
		return time.UnixMilli(ms).UTC(), true, nil
	}
	for _, layout := range []string{time.RFC3339Nano, time.RFC3339, "2006-01-02T15:04:05", "2006-01-02"} {
		if t, err := time.Parse(layout, raw); err == nil {
			return t.UTC(), true, nil
		}
	}
	return time.Time{}, false, fmt.Errorf("invalid before %q: use ISO-8601 or epoch ms", raw)
}

// SliceMessagesPage paginates an in-memory slice deterministically (newest first).
// Order: CreatedAt desc, _id desc tiebreaker. Used by tests and as aggregation fallback.
func SliceMessagesPage(msgs []Message, before time.Time, hasBefore bool, limit int) HistoryPage {
	limit = ClampHistoryLimit(limit)
	cp := append([]Message(nil), msgs...)
	sort.Slice(cp, func(i, j int) bool {
		if cp[i].CreatedAt.Equal(cp[j].CreatedAt) {
			return cp[i].ID.Hex() > cp[j].ID.Hex()
		}
		return cp[i].CreatedAt.After(cp[j].CreatedAt)
	})
	filtered := cp[:0]
	for _, m := range cp {
		if hasBefore && !m.CreatedAt.Before(before) {
			continue
		}
		filtered = append(filtered, m)
	}
	total := len(filtered)
	hasMore := total > limit
	end := limit
	if total < end {
		end = total
	}
	page := filtered[:end]
	out := HistoryPage{Messages: page, Total: total, HasMore: hasMore}
	if hasMore && len(page) > 0 {
		last := page[len(page)-1]
		out.NextBefore = last.CreatedAt.UTC().Format(time.RFC3339Nano)
	}
	if out.Messages == nil {
		out.Messages = []Message{}
	}
	return out
}

// GetHistoryPage returns one deterministic page (newest first) without loading
// the full messages array when the aggregation path succeeds.
func (r *Repo) GetHistoryPage(ctx context.Context, convID string, before time.Time, hasBefore bool, limit int) (HistoryPage, *Conversation, error) {
	limit = ClampHistoryLimit(limit)
	oid, err := toObjectID(convID)
	if err != nil {
		return HistoryPage{}, nil, err
	}

	// Meta without messages (cheap, no 16MB risk).
	var meta Conversation
	proj := options.FindOne().SetProjection(bson.M{"messages": 0})
	if err := r.col.FindOne(ctx, bson.M{"_id": oid}, proj).Decode(&meta); err != nil {
		return HistoryPage{}, nil, err
	}

	// Aggregation: unwind -> optional before filter -> sort desc -> limit+1.
	matchBefore := bson.M{}
	if hasBefore {
		matchBefore = bson.M{"messages.createdAt": bson.M{"$lt": before}}
	}
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "_id", Value: oid}}}},
		{{Key: "$unwind", Value: "$messages"}},
	}
	if hasBefore {
		pipeline = append(pipeline, bson.D{{Key: "$match", Value: matchBefore}})
	}
	pipeline = append(pipeline,
		bson.D{{Key: "$sort", Value: bson.D{
			{Key: "messages.createdAt", Value: -1},
			{Key: "messages._id", Value: -1},
		}}},
		bson.D{{Key: "$limit", Value: limit + 1}},
		bson.D{{Key: "$replaceRoot", Value: bson.D{{Key: "newRoot", Value: "$messages"}}}},
	)

	cur, err := r.col.Aggregate(ctx, pipeline)
	if err != nil {
		return r.historyFallback(ctx, oid, &meta, before, hasBefore, limit)
	}
	defer cur.Close(ctx)

	var got []Message
	if err := cur.All(ctx, &got); err != nil {
		return r.historyFallback(ctx, oid, &meta, before, hasBefore, limit)
	}

	// Total for the filtered window (bounded count, no message bodies).
	countFilter := bson.M{"_id": oid}
	if hasBefore {
		// Count via dedicated pipeline to avoid loading bodies.
		cp := mongo.Pipeline{
			{{Key: "$match", Value: bson.D{{Key: "_id", Value: oid}}}},
			{{Key: "$unwind", Value: "$messages"}},
			{{Key: "$match", Value: matchBefore}},
			{{Key: "$count", Value: "n"}},
		}
		ccur, cerr := r.col.Aggregate(ctx, cp)
		if cerr == nil {
			var n []struct {
				N int `bson:"n"`
			}
			if derr := ccur.All(ctx, &n); derr == nil && len(n) > 0 {
				return buildPage(got, n[0].N, limit), &meta, nil
			}
			_ = ccur.Close(ctx)
		}
		_ = countFilter
		// Fallback total: at least what we saw.
		return buildPage(got, len(got), limit), &meta, nil
	}
	// No before: total = array size (metadata query, cheap $size projection).
	var sized struct {
		N int `bson:"n"`
	}
	serr := r.col.FindOne(ctx, bson.M{"_id": oid}, options.FindOne().
		SetProjection(bson.M{"n": bson.M{"$size": bson.M{"$ifNull": []any{"$messages", []any{}}}}})).
		Decode(&sized)
	if serr != nil {
		return buildPage(got, len(got), limit), &meta, nil
	}
	return buildPage(got, sized.N, limit), &meta, nil
}

func buildPage(got []Message, total, limit int) HistoryPage {
	hasMore := len(got) > limit
	end := len(got)
	if hasMore {
		end = limit
	}
	page := got[:end]
	out := HistoryPage{Messages: page, Total: total, HasMore: hasMore}
	if hasMore && len(page) > 0 {
		last := page[len(page)-1]
		out.NextBefore = last.CreatedAt.UTC().Format(time.RFC3339Nano)
	}
	if out.Messages == nil {
		out.Messages = []Message{}
	}
	return out
}

func (r *Repo) historyFallback(ctx context.Context, oid primitive.ObjectID, meta *Conversation, before time.Time, hasBefore bool, limit int) (HistoryPage, *Conversation, error) {
	var full Conversation
	if err := r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&full); err != nil {
		return HistoryPage{}, nil, err
	}
	*meta = full
	meta.Messages = nil
	return SliceMessagesPage(full.Messages, before, hasBefore, limit), meta, nil
}

func toObjectID(s string) (primitive.ObjectID, error) {
	return primitive.ObjectIDFromHex(s)
}
