package repository

import (
	"context"
	"errors"
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

	_, _ = col.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "userId", Value: 1},
			{Key: "status", Value: 1},
		},
	})

	return &Repo{client: client, col: col}, nil
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

	msg.ID = primitive.NewObjectID()
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
	opts := options.Find().SetSort(bson.D{{Key: "updatedAt", Value: -1}})
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
		"userId": userID,
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

func toObjectID(s string) (primitive.ObjectID, error) {
	return primitive.ObjectIDFromHex(s)
}