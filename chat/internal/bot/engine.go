package bot

import "strings"

type Intent string

const (
	IntentGreeting      Intent = "greeting"
	IntentHowToBook     Intent = "how_to_book"
	IntentPickDoctor    Intent = "pick_doctor"
	IntentSlotSelection Intent = "slot_selection"
	IntentPayment       Intent = "payment"
	IntentCancelAppt    Intent = "cancel_appointment"
	IntentViewAppts     Intent = "view_appointments"
	IntentDoctorProfile Intent = "doctor_profile"
	IntentContactAdmin  Intent = "contact_admin"
	IntentFallback      Intent = "fallback"
)

type Response struct {
	Text      string   `json:"text"`
	Options   []Option `json:"options,omitempty"`
	Metadata  Metadata `json:"metadata"`
	NextState string   `json:"-"`
}

type Option struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type Metadata struct {
	Action string `json:"action,omitempty"`
	Route  string `json:"route,omitempty"`
	Intent string `json:"intent"`
}

type Engine struct {
	language string
}

func NewEngine(lang string) *Engine {
	if lang == "" {
		lang = "en"
	}
	return &Engine{language: lang}
}

func (e *Engine) Process(userMessage, state string) Response {
	intent := classify(userMessage, state)
	trans := GetTranslation(e.language)

	switch intent {

	case IntentGreeting:
		return Response{
			Text:      trans.Greeting,
			Options:   e.mainMenu(trans),
			Metadata:  Metadata{Intent: string(IntentGreeting)},
			NextState: "awaiting_topic",
		}

	case IntentHowToBook:
		return Response{
			Text: trans.HowToBook,
			Options: []Option{
				{Label: trans.ShowMeDocsBtn, Value: "pick_doctor"},
				{Label: trans.MyAppointmentsBtn, Value: "view_appointments"},
				{Label: trans.MainMenuBtn, Value: "main_menu"},
			},
			Metadata:  Metadata{Intent: string(IntentHowToBook)},
			NextState: "awaiting_booking_action",
		}

	case IntentPickDoctor:
		return Response{
			Text: trans.PickDoctorInfo,
			Options: []Option{
				{Label: trans.BrowseAllDocsBtn, Value: "navigate_doctors"},
				{Label: trans.HowToBookBtn, Value: "how_to_book"},
				{Label: trans.MainMenuBtn, Value: "main_menu"},
			},
			Metadata:  Metadata{Action: "navigate", Route: "/doctors", Intent: string(IntentPickDoctor)},
			NextState: "awaiting_topic",
		}

	case IntentSlotSelection:
		return Response{
			Text: trans.SlotSelectionInfo,
			Options: []Option{
				{Label: trans.FindDoctorBtn, Value: "navigate_doctors"},
				{Label: trans.AboutPaymentBtn, Value: "payment"},
				{Label: trans.MainMenuBtn, Value: "main_menu"},
			},
			Metadata:  Metadata{Intent: string(IntentSlotSelection)},
			NextState: "awaiting_topic",
		}

	case IntentPayment:
		return Response{
			Text: trans.PaymentInfo,
			Options: []Option{
				{Label: trans.GoMyApptsBtn, Value: "navigate_appointments"},
				{Label: trans.MainMenuBtn, Value: "main_menu"},
			},
			Metadata:  Metadata{Action: "navigate", Route: "/my-appointments", Intent: string(IntentPayment)},
			NextState: "awaiting_topic",
		}

	case IntentCancelAppt:
		return Response{
			Text: trans.CancelApptInfo,
			Options: []Option{
				{Label: trans.GoToMyApptsBtn, Value: "navigate_appointments"},
				{Label: trans.MainMenuBtn, Value: "main_menu"},
			},
			Metadata:  Metadata{Action: "navigate", Route: "/my-appointments", Intent: string(IntentCancelAppt)},
			NextState: "awaiting_topic",
		}

	case IntentViewAppts:
		return Response{
			Text: trans.ViewApptsInfo,
			Options: []Option{
				{Label: trans.OpenMyApptsBtn, Value: "navigate_appointments"},
				{Label: trans.MainMenuBtn, Value: "main_menu"},
			},
			Metadata:  Metadata{Action: "navigate", Route: "/my-appointments", Intent: string(IntentViewAppts)},
			NextState: "awaiting_topic",
		}

	case IntentDoctorProfile:
		return Response{
			Text: trans.DoctorProfileInfo,
			Options: []Option{
				{Label: trans.BrowseDocsBtn, Value: "navigate_doctors"},
				{Label: trans.HowToBookBtn, Value: "how_to_book"},
				{Label: trans.MainMenuBtn, Value: "main_menu"},
			},
			Metadata:  Metadata{Action: "navigate", Route: "/doctors", Intent: string(IntentDoctorProfile)},
			NextState: "awaiting_topic",
		}

	case IntentContactAdmin:
		return Response{
			Text: trans.ContactAdminMsg,
			Options:   []Option{},
			Metadata:  Metadata{Action: "escalate", Intent: string(IntentContactAdmin)},
			NextState: "waiting_admin",
		}

	default: 
		return Response{
			Text:      trans.FallbackMsg,
			Options:   e.mainMenu(trans),
			Metadata:  Metadata{Intent: string(IntentFallback)},
			NextState: state, 
		}
	}
}

func classify(msg, state string) Intent {
	raw := strings.ToLower(strings.TrimSpace(msg))

	switch raw {
	case "main_menu", "hello", "hi", "hey", "start", "menu":
		return IntentGreeting
	case "how_to_book", "book", "booking", "how do i book":
		return IntentHowToBook
	case "pick_doctor", "find_doctor", "navigate_doctors", "doctors":
		return IntentPickDoctor
	case "slot_selection", "slots", "time", "schedule", "slot":
		return IntentSlotSelection
	case "payment", "pay", "stripe", "cash", "cod":
		return IntentPayment
	case "cancel_appointment", "cancel":
		return IntentCancelAppt
	case "view_appointments", "navigate_appointments", "my appointments", "appointments":
		return IntentViewAppts
	case "doctor_profile", "profile":
		return IntentDoctorProfile
	case "contact_admin", "human", "talk to someone", "administrator":
		return IntentContactAdmin
	}

	switch {
	case contains(raw, "book", "appointment", "schedule", "reserve"):
		return IntentHowToBook
	case contains(raw, "doctor", "specialist", "physician", "find"):
		return IntentPickDoctor
	case contains(raw, "slot", "time", "available", "when"):
		return IntentSlotSelection
	case contains(raw, "pay", "payment", "stripe", "cash", "cost", "fee", "price"):
		return IntentPayment
	case contains(raw, "cancel", "delete appointment", "remove"):
		return IntentCancelAppt
	case contains(raw, "my appointment", "appointments", "history"):
		return IntentViewAppts
	case contains(raw, "profile", "info", "experience", "about doctor"):
		return IntentDoctorProfile
	case contains(raw, "admin", "human", "person", "help", "support", "agent", "talk"):
		return IntentContactAdmin
	case contains(raw, "hi", "hello", "hey", "start", "good"):
		return IntentGreeting
	}

	return IntentFallback
}

func contains(text string, keywords ...string) bool {
	for _, kw := range keywords {
		if strings.Contains(text, kw) {
			return true
		}
	}
	return false
}

func (e *Engine) mainMenu(trans Translation) []Option {
	return []Option{
		{Label: trans.HowToBookBtn, Value: "how_to_book"},
		{Label: trans.FindDoctorBtn, Value: "pick_doctor"},
		{Label: trans.MyAppointmentsBtn, Value: "view_appointments"},
		{Label: trans.PaymentMethodsBtn, Value: "payment"},
		{Label: trans.CancelApptBtn, Value: "cancel_appointment"},
		{Label: trans.ContactAdminBtn, Value: "contact_admin"},
	}
}