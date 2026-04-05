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

type Engine struct{}

func NewEngine() *Engine { return &Engine{} }

func (e *Engine) Process(userMessage, state string) Response {
	intent := classify(userMessage, state)

	switch intent {

	case IntentGreeting:
		return Response{
			Text:      "Welcome to Prescripto! I'm your virtual assistant. How can I help you today?",
			Options:   mainMenu(),
			Metadata:  Metadata{Intent: string(IntentGreeting)},
			NextState: "awaiting_topic",
		}

	case IntentHowToBook:
		return Response{
			Text: "Booking an appointment is simple:\n\n" +
				"1. **Pick a Doctor** — Browse by speciality, name, price or availability.\n" +
				"2. **Select a Slot** — Choose a date & time that works for you.\n" +
				"3. **Confirm Booking** — Review your appointment details and confirm.\n" +
				"4. **Pay** — Use Stripe (card) or Cash on Delivery.\n\n" +
				"Would you like me to take you to the doctors list?",
			Options: []Option{
				{Label: "Show me Doctors", Value: "pick_doctor"},
				{Label: "My Appointments", Value: "view_appointments"},
				{Label: "Main Menu", Value: "main_menu"},
			},
			Metadata:  Metadata{Intent: string(IntentHowToBook)},
			NextState: "awaiting_booking_action",
		}

	case IntentPickDoctor:
		return Response{
			Text: "You can browse our full list of verified doctors. " +
				"Filter by speciality, sort by price or name, and click any doctor to see their profile and available slots.",
			Options: []Option{
				{Label: "Browse All Doctors", Value: "navigate_doctors"},
				{Label: "How to Book", Value: "how_to_book"},
				{Label: "Main Menu", Value: "main_menu"},
			},
			Metadata:  Metadata{Action: "navigate", Route: "/doctors", Intent: string(IntentPickDoctor)},
			NextState: "awaiting_topic",
		}

	case IntentSlotSelection:
		return Response{
			Text: "Once you've chosen a doctor, you'll see their available time slots for the next 7 days. " +
				"Our Smart Suggestions widget will highlight the best slots based on your priority (Urgent / Normal / Flexible). " +
				"Simply click a slot and press **Book an appointment**.",
			Options: []Option{
				{Label: "Find a Doctor", Value: "navigate_doctors"},
				{Label: "About Payment", Value: "payment"},
				{Label: "Main Menu", Value: "main_menu"},
			},
			Metadata:  Metadata{Intent: string(IntentSlotSelection)},
			NextState: "awaiting_topic",
		}

	case IntentPayment:
		return Response{
			Text: "Prescripto supports two payment methods:\n\n" +
				"• **Stripe** — Secure online card payment. You'll be redirected to Stripe's checkout and returned automatically.\n" +
				"• **Cash on Delivery** — Pay at the clinic on the day of your appointment.\n\n" +
				"You can choose when you view your appointment list.",
			Options: []Option{
				{Label: "My Appointments", Value: "navigate_appointments"},
				{Label: "Main Menu", Value: "main_menu"},
			},
			Metadata:  Metadata{Action: "navigate", Route: "/my-appointments", Intent: string(IntentPayment)},
			NextState: "awaiting_topic",
		}

	case IntentCancelAppt:
		return Response{
			Text: "To cancel an appointment:\n\n" +
				"1. Go to **My Appointments**.\n" +
				"2. Find the appointment you want to cancel.\n" +
				"3. Click **Cancel appointment**.\n\n" +
				"Please note that slots are released immediately so other patients can book them.",
			Options: []Option{
				{Label: "Go to My Appointments", Value: "navigate_appointments"},
				{Label: "Main Menu", Value: "main_menu"},
			},
			Metadata:  Metadata{Action: "navigate", Route: "/my-appointments", Intent: string(IntentCancelAppt)},
			NextState: "awaiting_topic",
		}

	case IntentViewAppts:
		return Response{
			Text: "All your past and upcoming appointments live in **My Appointments**. " +
				"There you can:\n• Pay pending appointments\n• Cancel upcoming ones\n• See completed visits",
			Options: []Option{
				{Label: "Open My Appointments", Value: "navigate_appointments"},
				{Label: "Main Menu", Value: "main_menu"},
			},
			Metadata:  Metadata{Action: "navigate", Route: "/my-appointments", Intent: string(IntentViewAppts)},
			NextState: "awaiting_topic",
		}

	case IntentDoctorProfile:
		return Response{
			Text: "👤 Each doctor has a detailed profile showing:\n" +
				"• Speciality & education\n• Years of experience\n• Appointment fee\n• Available slots\n" +
				"• Smart scheduling suggestions\n\n" +
				"Click any doctor card to open their profile.",
			Options: []Option{
				{Label: "Browse Doctors", Value: "navigate_doctors"},
				{Label: "How to Book", Value: "how_to_book"},
				{Label: "Main Menu", Value: "main_menu"},
			},
			Metadata:  Metadata{Action: "navigate", Route: "/doctors", Intent: string(IntentDoctorProfile)},
			NextState: "awaiting_topic",
		}

	case IntentContactAdmin:
		return Response{
			Text: "Connecting you with a human administrator. " +
				"Please hold on — someone will join this chat shortly.\n\n" +
				"You can type your question now and the admin will see it when they arrive.",
			Options:   []Option{},
			Metadata:  Metadata{Action: "escalate", Intent: string(IntentContactAdmin)},
			NextState: "waiting_admin",
		}

	default: 
		return Response{
			Text:      "I'm not sure I understood that. Here's what I can help you with:",
			Options:   mainMenu(),
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

func mainMenu() []Option {
	return []Option{
		{Label: "How to Book", Value: "how_to_book"},
		{Label: "Find a Doctor", Value: "pick_doctor"},
		{Label: "My Appointments", Value: "view_appointments"},
		{Label: "Payment", Value: "payment"},
		{Label: "Cancel Appointment", Value: "cancel_appointment"},
		{Label: "Contact Administrator", Value: "contact_admin"},
	}
}