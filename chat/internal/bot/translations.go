package bot

type Translation struct {
	Greeting         string
	HowToBook        string
	PickDoctorInfo   string
	SlotSelectionInfo string
	PaymentInfo      string
	CancelApptInfo   string
	ViewApptsInfo    string
	DoctorProfileInfo string
	ContactAdminMsg  string
	FallbackMsg      string
	PickDoctorBtn    string
	MyAppointmentsBtn string
	MainMenuBtn      string
	ShowMeDocsBtn    string
	BrowseAllDocsBtn string
	FindDoctorBtn    string
	AboutPaymentBtn  string
	HowToBookBtn     string
	PaymentMethodsBtn string
	GoMyApptsBtn     string
	GoToMyApptsBtn   string
	BrowseDocsBtn    string
	OpenMyApptsBtn   string
	ContactAdminBtn  string
	CancelApptBtn    string
}

var translationEN = Translation{
	Greeting: "Welcome to Prescripto! I'm your virtual assistant. How can I help you today?",
	HowToBook: "Booking an appointment is simple:\n\n" +
		"1. **Pick a Doctor** — Browse by speciality, name, price or availability.\n" +
		"2. **Select a Slot** — Choose a date & time that works for you.\n" +
		"3. **Confirm Booking** — Review your appointment details and confirm.\n" +
		"4. **Pay** — Use Stripe (card) or Cash on Delivery.\n\n" +
		"Would you like me to take you to the doctors list?",
	PickDoctorInfo: "You can browse our full list of verified doctors. " +
		"Filter by speciality, sort by price or name, and click any doctor to see their profile and available slots.",
	SlotSelectionInfo: "Once you've chosen a doctor, you'll see their available time slots for the next 7 days. " +
		"Our Smart Suggestions widget will highlight the best slots based on your priority (Urgent / Normal / Flexible). " +
		"Simply click a slot and press **Book an appointment**.",
	PaymentInfo: "Prescripto supports two payment methods:\n\n" +
		"• **Stripe** — Secure online card payment. You'll be redirected to Stripe's checkout and returned automatically.\n" +
		"• **Cash on Delivery** — Pay at the clinic on the day of your appointment.\n\n" +
		"You can choose when you view your appointment list.",
	CancelApptInfo: "To cancel an appointment:\n\n" +
		"1. Go to **My Appointments**.\n" +
		"2. Find the appointment you want to cancel.\n" +
		"3. Click **Cancel appointment**.\n\n" +
		"Please note that slots are released immediately so other patients can book them.",
	ViewApptsInfo: "All your past and upcoming appointments live in **My Appointments**. " +
		"There you can:\n• Pay pending appointments\n• Cancel upcoming ones\n• See completed visits",
	DoctorProfileInfo: "👤 Each doctor has a detailed profile showing:\n" +
		"• Speciality & education\n• Years of experience\n• Appointment fee\n• Available slots\n" +
		"• Smart scheduling suggestions\n\n" +
		"Click any doctor card to open their profile.",
	ContactAdminMsg: "Connecting you with a human administrator. " +
		"Please hold on — someone will join this chat shortly.\n\n" +
		"You can type your question now and the admin will see it when they arrive.",
	FallbackMsg: "I'm not sure I understood that. Here's what I can help you with:",
	PickDoctorBtn:    "Pick a Doctor",
	MyAppointmentsBtn: "My Appointments",
	MainMenuBtn:      "Main Menu",
	ShowMeDocsBtn:    "Show me Doctors",
	BrowseAllDocsBtn: "Browse All Doctors",
	FindDoctorBtn:    "Find a Doctor",
	AboutPaymentBtn:  "About Payment",
	HowToBookBtn:     "How to Book",
	PaymentMethodsBtn: "Payment",
	GoMyApptsBtn:     "Go to My Appointments",
	GoToMyApptsBtn:   "Go to My Appointments",
	BrowseDocsBtn:    "Browse Doctors",
	OpenMyApptsBtn:   "Open My Appointments",
	ContactAdminBtn:  "Contact Administrator",
	CancelApptBtn:    "Cancel Appointment",
}

var translationES = Translation{
	Greeting: "¡Bienvenido a Prescripto! Soy tu asistente virtual. ¿Cómo puedo ayudarte hoy?",
	HowToBook: "Reservar una cita es simple:\n\n" +
		"1. **Elige un Médico** — Busca por especialidad, nombre, precio o disponibilidad.\n" +
		"2. **Selecciona una Hora** — Elige una fecha y hora que te convenga.\n" +
		"3. **Confirma la Reserva** — Revisa los detalles de tu cita y confirma.\n" +
		"4. **Paga** — Usa Stripe (tarjeta) o Contra Entrega.\n\n" +
		"¿Deseas que te lleve a la lista de médicos?",
	PickDoctorInfo: "Puedes explorar nuestra lista completa de médicos verificados. " +
		"Filtra por especialidad, ordena por precio o nombre, y haz clic en cualquier médico para ver su perfil y citas disponibles.",
	SlotSelectionInfo: "Una vez que hayas elegido un médico, verás sus horarios disponibles para los próximos 7 días. " +
		"Nuestro widget de Sugerencias Inteligentes destacará los mejores horarios según tu prioridad (Urgente / Normal / Flexible). " +
		"Solo haz clic en un horario y presiona **Reservar cita**.",
	PaymentInfo: "Prescripto soporta dos métodos de pago:\n\n" +
		"• **Stripe** — Pago seguro con tarjeta en línea. Serás redirigido al checkout de Stripe y volverás automáticamente.\n" +
		"• **Contra Entrega** — Paga en la clínica el día de tu cita.\n\n" +
		"Puedes elegir el método cuando veas tu lista de citas.",
	CancelApptInfo: "Para cancelar una cita:\n\n" +
		"1. Ve a **Mis Citas**.\n" +
		"2. Encuentra la cita que deseas cancelar.\n" +
		"3. Haz clic en **Cancelar cita**.\n\n" +
		"Ten en cuenta que los horarios se liberan inmediatamente para que otros pacientes los puedan reservar.",
	ViewApptsInfo: "Todas tus citas pasadas y futuras están en **Mis Citas**. " +
		"Allí puedes:\n• Pagar citas pendientes\n• Cancelar próximas citas\n• Ver visitas completadas",
	DoctorProfileInfo: "👤 Cada médico tiene un perfil detallado que muestra:\n" +
		"• Especialidad y educación\n• Años de experiencia\n• Tarifa de la cita\n• Horarios disponibles\n" +
		"• Sugerencias de programación inteligente\n\n" +
		"Haz clic en cualquier tarjeta de médico para abrir su perfil.",
	ContactAdminMsg: "Te estoy conectando con un administrador. " +
		"Por favor espera — alguien se unirá a este chat en breve.\n\n" +
		"Puedes escribir tu pregunta ahora y el administrador la verá cuando llegue.",
	FallbackMsg: "No estoy seguro de haber entendido. Aquí está lo que puedo ayudarte:",
	PickDoctorBtn:    "Elige un Médico",
	MyAppointmentsBtn: "Mis Citas",
	MainMenuBtn:      "Menú Principal",
	ShowMeDocsBtn:    "Muéstrame Médicos",
	BrowseAllDocsBtn: "Ver Todos los Médicos",
	FindDoctorBtn:    "Buscar un Médico",
	AboutPaymentBtn:  "Sobre el Pago",
	HowToBookBtn:     "Cómo Reservar",
	PaymentMethodsBtn: "Pago",
	GoMyApptsBtn:     "Ir a Mis Citas",
	GoToMyApptsBtn:   "Ir a Mis Citas",
	BrowseDocsBtn:    "Ver Médicos",
	OpenMyApptsBtn:   "Abrir Mis Citas",
	ContactAdminBtn:  "Contactar Administrador",
	CancelApptBtn:    "Cancelar Cita",
}

func GetTranslation(lang string) Translation {
	if lang == "es" {
		return translationES
	}
	return translationEN
}
