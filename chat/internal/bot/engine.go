package bot

import (
	"strings"
	"unicode"
)

const routeMyAppointments = "/my-appointments"

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
			Metadata:  Metadata{Action: "navigate", Route: routeMyAppointments, Intent: string(IntentPayment)},
			NextState: "awaiting_topic",
		}

	case IntentCancelAppt:
		return Response{
			Text: trans.CancelApptInfo,
			Options: []Option{
				{Label: trans.GoToMyApptsBtn, Value: "navigate_appointments"},
				{Label: trans.MainMenuBtn, Value: "main_menu"},
			},
			Metadata:  Metadata{Action: "navigate", Route: routeMyAppointments, Intent: string(IntentCancelAppt)},
			NextState: "awaiting_topic",
		}

	case IntentViewAppts:
		return Response{
			Text: trans.ViewApptsInfo,
			Options: []Option{
				{Label: trans.OpenMyApptsBtn, Value: "navigate_appointments"},
				{Label: trans.MainMenuBtn, Value: "main_menu"},
			},
			Metadata:  Metadata{Action: "navigate", Route: routeMyAppointments, Intent: string(IntentViewAppts)},
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
			Text:      trans.ContactAdminMsg,
			Options:   []Option{},
			Metadata:  Metadata{Action: "escalate", Intent: string(IntentContactAdmin)},
			NextState: "waiting_admin",
		}

	default:
		fallbackText := trans.FallbackMsg
		if contextualHint := e.contextualFallback(userMessage, trans); contextualHint != "" {
			fallbackText = contextualHint
		}
		return Response{
			Text:      fallbackText,
			Options:   e.mainMenu(trans),
			Metadata:  Metadata{Intent: string(IntentFallback)},
			NextState: state,
		}
	}
}

func (e *Engine) contextualFallback(msg string, trans Translation) string {
	raw := normalize(msg)

	switch {
	case containsAny(raw, "price", "cost", "fee", "expensive", "cheap", "precio", "costo", "tarifa", "barato", "caro"):
		return trans.FallbackPriceHint
	case containsAny(raw, "doctor", "medico", "specialist", "especialista", "physician"):
		return trans.FallbackDoctorHint
	case containsAny(raw, "appointment", "cita", "reserva", "book", "reservar", "agendar", "schedule"):
		return trans.FallbackBookingHint
	case containsAny(raw, "pay", "pagar", "pago", "stripe", "cash", "card", "tarjeta"):
		return trans.FallbackPaymentHint
	case containsAny(raw, "cancel", "cancelar", "delete", "eliminar", "remove"):
		return trans.FallbackCancelHint
	case containsAny(raw, "help", "ayuda", "assist", "asistencia", "support", "soporte"):
		return trans.FallbackHelpHint
	case containsAny(raw, "problem", "error", "issue", "fail", "problema", "fallo", "no funciona", "not working"):
		return trans.FallbackIssueHint
	}
	return ""
}

func classify(msg, state string) Intent {
	raw := normalize(msg)

	switch raw {
	case "main_menu", "menu", "start", "inicio", "comenzar", "empezar":
		return IntentGreeting
	case "hello", "hi", "hey", "hola", "buenas", "buenos dias",
		"good morning", "good afternoon", "good evening":
		return IntentGreeting
	case "how_to_book", "book", "booking", "how do i book", "como reservo":
		return IntentHowToBook
	case "pick_doctor", "find_doctor", "navigate_doctors", "doctors", "medicos":
		return IntentPickDoctor
	case "slot_selection", "slots", "time", "schedule", "slot", "horario", "horarios":
		return IntentSlotSelection
	case "payment", "pay", "stripe", "cash", "cod", "pago", "pagar":
		return IntentPayment
	case "cancel_appointment", "cancel", "cancelar", "cancelar cita":
		return IntentCancelAppt
	case "view_appointments", "navigate_appointments", "my appointments",
		"appointments", "mis citas", "citas":
		return IntentViewAppts
	case "doctor_profile", "profile", "perfil":
		return IntentDoctorProfile
	case "contact_admin", "human", "administrator", "administrador",
		"talk to someone", "hablar con alguien":
		return IntentContactAdmin
	}

	if isOrientationQuery(raw) {
		return IntentGreeting
	}

	switch {
	// Más específicos primero: cancelar, ver citas
	case containsAny(raw,
		"cancel", "delete", "remove", "cancelar", "eliminar", "borrar",
		"no quiero", "ya no quiero"):
		return IntentCancelAppt

	case containsAny(raw,
		"my appointment", "my appointments", "mis citas", "mis reservas",
		"history", "historial", "past", "upcoming", "view", "ver mis"):
		return IntentViewAppts

	// Luego genéricos
	case containsAny(raw,
		"book", "appointment", "schedule", "reserve", "reservar", "agendar",
		"quiero una cita", "necesito cita", "necesito una", "how do i", "como hago"):
		return IntentHowToBook

	case containsAny(raw,
		"find", "doctor", "medico", "specialist", "especialista",
		"physician", "surgeon", "who", "which doctor", "que medico",
		"list", "lista", "browse", "search"):
		return IntentPickDoctor

	case containsAny(raw,
		"slot", "time", "horario", "available", "disponible", "when", "cuando",
		"what time", "que hora", "fecha", "date"):
		return IntentSlotSelection

	case containsAny(raw,
		"pay", "payment", "pagar", "pago", "stripe", "cash", "efectivo",
		"card", "tarjeta", "cost", "costo", "precio", "fee", "tarifa",
		"how much", "cuanto"):
		return IntentPayment

	case containsAny(raw,
		"profile", "perfil", "info", "information", "informacion",
		"experience", "experiencia", "about doctor", "about the doctor",
		"sobre el medico", "credentials", "degree", "titulo"):
		return IntentDoctorProfile

	case containsAny(raw,
		"admin", "human", "person", "persona", "help me", "ayudame",
		"support", "soporte", "agent", "agente", "talk", "hablar",
		"necesito ayuda", "i need help", "real person", "persona real"):
		return IntentContactAdmin

	case containsAny(raw,
		"hi", "hello", "hey", "hola", "good", "greet", "welcome"):
		return IntentGreeting
	}

	return IntentFallback
}

func isOrientationQuery(raw string) bool {
	orientationPhrases := []string{
		// English
		"what can i do", "what can you do", "what do you do",
		"what are my options", "what are the options",
		"how does this work", "how does it work",
		"how can you help", "how can i use this",
		"what is this", "what is prescripto",
		"tell me more", "tell me about",
		"i need help", "can you help me",
		"show me", "show options", "show menu",
		"what features", "what services", "services",
		"options", "features", "capabilities",
		"get started", "getting started",
		"i'm new", "im new", "first time",
		"guide me", "guide", "tutorial",
		// Spanish (all without accents to match normalize())
		"que puedo hacer",
		"que puedes hacer",
		"que opciones tengo",
		"como funciona",
		"como me ayudas",
		"que es esto",
		"cuentame mas",
		"necesito ayuda", "puedes ayudarme",
		"mostrame", "mostrar opciones",
		"que servicios",
		"opciones", "servicios",
		"empezar", "como empiezo",
		"soy nuevo", "es mi primera vez",
		"guia", "ayudame",
	}

	for _, phrase := range orientationPhrases {
		if strings.Contains(raw, phrase) {
			return true
		}
	}
	return false
}

func normalize(msg string) string {
	var b strings.Builder
	b.Grow(len(msg))

	for _, r := range strings.ToLower(msg) {
		switch {
		case unicode.IsLetter(r) || unicode.IsNumber(r):
			b.WriteRune(r)
		case unicode.IsSpace(r), r == '-', r == '_':
			// Convert hyphens and underscores to spaces for proper word splitting
			b.WriteRune(' ')
		case r == 'á' || r == 'à' || r == 'ä' || r == 'â':
			b.WriteRune('a')
		case r == 'é' || r == 'è' || r == 'ë' || r == 'ê':
			b.WriteRune('e')
		case r == 'í' || r == 'ì' || r == 'ï' || r == 'î':
			b.WriteRune('i')
		case r == 'ó' || r == 'ò' || r == 'ö' || r == 'ô':
			b.WriteRune('o')
		case r == 'ú' || r == 'ù' || r == 'ü' || r == 'û':
			b.WriteRune('u')
		case r == 'ñ':
			b.WriteRune('n')
		}
	}

	return strings.Join(strings.Fields(b.String()), " ")
}

func matchesWord(word string, keyword string) bool {
	// Exact match
	if word == keyword {
		return true
	}
	// Handle plurals: appointment/appointments, doctor/doctors, etc.
	if word == keyword+"s" || keyword == word+"s" {
		return true
	}
	// Handle -es ending: search/searches
	if word == keyword+"es" || keyword == word+"es" {
		return true
	}
	return false
}

func containsAny(text string, keywords ...string) bool {
	words := strings.Fields(text)

	for _, keyword := range keywords {
		// Para keywords multi-palabra, usa substring matching
		if strings.Contains(" "+text+" ", " "+keyword+" ") {
			return true
		}

		// Para keywords de una palabra, usa word matching
		if !strings.Contains(keyword, " ") {
			for _, word := range words {
				if matchesWord(word, keyword) {
					return true
				}
			}
		}
	}
	return false
}

func containsAnyPartial(text string, keywords ...string) bool {
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
