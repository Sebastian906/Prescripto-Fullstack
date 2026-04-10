package bot

type Translation struct {
	// Respuestas principales
	Greeting            string
	HowToBook           string
	PickDoctorInfo      string
	SlotSelectionInfo   string
	PaymentInfo         string
	CancelApptInfo      string
	ViewApptsInfo       string
	DoctorProfileInfo   string
	ContactAdminMsg     string
	AdminJoinedMsg      string
	FallbackMsg         string
	FallbackPriceHint   string
	FallbackDoctorHint  string
	FallbackBookingHint string
	FallbackPaymentHint string
	FallbackCancelHint  string
	FallbackHelpHint    string
	FallbackIssueHint   string

	// Etiquetas de botones
	PickDoctorBtn     string
	MyAppointmentsBtn string
	MainMenuBtn       string
	ShowMeDocsBtn     string
	BrowseAllDocsBtn  string
	FindDoctorBtn     string
	AboutPaymentBtn   string
	HowToBookBtn      string
	PaymentMethodsBtn string
	GoMyApptsBtn      string
	GoToMyApptsBtn    string
	BrowseDocsBtn     string
	OpenMyApptsBtn    string
	ContactAdminBtn   string
	CancelApptBtn     string
}

var translationEN = Translation{
	Greeting: "Hi there! I'm the Prescripto assistant. I can help you book appointments, find doctors, manage payments, and more. What would you like to do?",

	HowToBook: "Booking is easy — here's how it works:\n\n" +
		"1. **Find a Doctor** — Browse by speciality, name, price, or availability.\n" +
		"2. **Pick a Slot** — Choose a date and time that suits you.\n" +
		"3. **Confirm** — Review the details and lock it in.\n" +
		"4. **Pay** — Use Stripe (card) or Cash on Delivery.\n\n" +
		"Ready to get started?",

	PickDoctorInfo: "You can browse our full list of verified doctors. " +
		"Filter by speciality, sort by price or name, and click any doctor card to see their profile, experience, and available time slots.",

	SlotSelectionInfo: "Once you've chosen a doctor, you'll see their open slots for the next 7 days. " +
		"Our Smart Suggestions widget highlights the best times based on doctor workload and your priority level — Urgent, Normal, or Flexible. " +
		"Just click a slot and tap **Book an appointment**.",

	PaymentInfo: "Prescripto supports two payment methods:\n\n" +
		"• **Stripe** — Secure online card payment. You'll be redirected to Stripe and brought back automatically once it's done.\n" +
		"• **Cash on Delivery** — Pay directly at the clinic on the day of your appointment.\n\n" +
		"You can choose your method from the My Appointments page.",

	CancelApptInfo: "To cancel an appointment:\n\n" +
		"1. Go to **My Appointments**.\n" +
		"2. Find the one you want to cancel.\n" +
		"3. Tap **Cancel appointment**.\n\n" +
		"The slot is released right away so another patient can take it.",

	ViewApptsInfo: "All your upcoming and past appointments are in **My Appointments**. " +
		"From there you can:\n• Pay pending appointments\n• Cancel upcoming ones\n• Review completed visits",

	DoctorProfileInfo: "Each doctor has a detailed profile with:\n" +
		"• Speciality and degree\n• Years of experience\n• Appointment fee\n• Available slots\n" +
		"• Smart scheduling suggestions\n\n" +
		"Click any doctor card to open their full profile.",

	ContactAdminMsg: "Got it — I'll connect you with a human administrator now. " +
		"Someone will join this chat shortly.\n\n" +
		"Feel free to type your question while you wait and they'll pick it up when they arrive.",

	AdminJoinedMsg: "An administrator has joined the chat. You're now speaking with a human operator.",

	FallbackMsg: "I didn't quite catch that. Here's what I can help you with — just pick an option:",

	// Contextual fallbacks
	FallbackPriceHint:   "Wondering about costs? Appointment fees vary by doctor. You can sort the doctor list by price to find something within your budget. Want me to take you there?",
	FallbackDoctorHint:  "Looking for a doctor? I can help with that! Browse our verified specialists, filter by area of expertise, and check their availability before booking.",
	FallbackBookingHint: "Need to book an appointment? It only takes a minute — find a doctor, pick a time slot, and confirm. Want a quick walkthrough?",
	FallbackPaymentHint: "Have a question about payments? Prescripto supports Stripe (card) and Cash on Delivery. You can choose your method from the My Appointments page.",
	FallbackCancelHint:  "Looking to cancel? Head over to My Appointments, find the booking, and hit Cancel. The slot will be freed up immediately.",
	FallbackHelpHint:    "Happy to help! Here are the main things I can assist you with. If you need a real person, you can also reach our admin team directly.",
	FallbackIssueHint:   "Sorry to hear you're running into trouble. If something isn't working as expected, I can connect you with an administrator who can sort it out.",

	// Buttons
	PickDoctorBtn:     "Pick a Doctor",
	MyAppointmentsBtn: "My Appointments",
	MainMenuBtn:       "Main Menu",
	ShowMeDocsBtn:     "Show me Doctors",
	BrowseAllDocsBtn:  "Browse All Doctors",
	FindDoctorBtn:     "Find a Doctor",
	AboutPaymentBtn:   "About Payment",
	HowToBookBtn:      "How to Book",
	PaymentMethodsBtn: "Payment",
	GoMyApptsBtn:      "Go to My Appointments",
	GoToMyApptsBtn:    "Go to My Appointments",
	BrowseDocsBtn:     "Browse Doctors",
	OpenMyApptsBtn:    "Open My Appointments",
	ContactAdminBtn:   "Contact Administrator",
	CancelApptBtn:     "Cancel Appointment",
}

var translationES = Translation{
	Greeting: "¡Hola! Soy el asistente de Prescripto. Puedo ayudarte a reservar citas, encontrar médicos, gestionar pagos y más. ¿Qué quieres hacer?",

	HowToBook: "Reservar es muy sencillo, así funciona:\n\n" +
		"1. **Elige un médico** — Busca por especialidad, nombre, precio o disponibilidad.\n" +
		"2. **Escoge un horario** — Selecciona la fecha y hora que más te convenga.\n" +
		"3. **Confirma** — Revisa los detalles y listo.\n" +
		"4. **Paga** — Con Stripe (tarjeta) o Pago en efectivo.\n\n" +
		"¿Listo para empezar?",

	PickDoctorInfo: "Puedes explorar nuestra lista completa de médicos verificados. " +
		"Filtra por especialidad, ordena por precio o nombre, y haz clic en cualquier tarjeta para ver el perfil, la experiencia y los horarios disponibles del médico.",

	SlotSelectionInfo: "Una vez que elijas un médico, verás sus horarios libres para los próximos 7 días. " +
		"Nuestro widget de Sugerencias Inteligentes resalta los mejores horarios según la carga del médico y tu nivel de prioridad: Urgente, Normal o Flexible. " +
		"Solo haz clic en un horario y pulsa **Reservar cita**.",

	PaymentInfo: "Prescripto acepta dos métodos de pago:\n\n" +
		"• **Stripe** — Pago seguro con tarjeta en línea. Te redirigimos a Stripe y regresas automáticamente al completar.\n" +
		"• **Pago en efectivo** — Pagas directamente en la clínica el día de tu cita.\n\n" +
		"Puedes elegir el método desde la página Mis Citas.",

	CancelApptInfo: "Para cancelar una cita:\n\n" +
		"1. Ve a **Mis Citas**.\n" +
		"2. Encuentra la cita que quieres cancelar.\n" +
		"3. Pulsa **Cancelar cita**.\n\n" +
		"El horario se libera de inmediato para que otro paciente pueda tomarlo.",

	ViewApptsInfo: "Todas tus citas futuras y pasadas están en **Mis Citas**. " +
		"Desde ahí puedes:\n• Pagar citas pendientes\n• Cancelar próximas citas\n• Revisar visitas completadas",

	DoctorProfileInfo: "Cada médico tiene un perfil detallado con:\n" +
		"• Especialidad y título académico\n• Años de experiencia\n• Tarifa de la cita\n• Horarios disponibles\n" +
		"• Sugerencias de programación inteligente\n\n" +
		"Haz clic en cualquier tarjeta para abrir el perfil completo.",

	ContactAdminMsg: "Entendido, te conecto ahora con un administrador. " +
		"Alguien se unirá a este chat en breve.\n\n" +
		"Puedes escribir tu consulta mientras esperas y el administrador la verá al llegar.",

	AdminJoinedMsg: "Un administrador se ha unido al chat. Ahora estás hablando con una persona.",

	FallbackMsg: "No estoy seguro de haber entendido bien. Aquí está lo que puedo hacer por ti — elige una opción:",

	// Fallbacks contextuales
	FallbackPriceHint:   "¿Quieres saber sobre costos? Las tarifas varían según el médico. Puedes ordenar la lista de médicos por precio para encontrar la mejor opción para tu presupuesto. ¿Te llevo allí?",
	FallbackDoctorHint:  "¿Buscas un médico? ¡Puedo ayudarte! Explora nuestros especialistas verificados, filtra por área de especialización y revisa su disponibilidad antes de reservar.",
	FallbackBookingHint: "¿Necesitas reservar una cita? Solo toma un momento: elige un médico, escoge un horario y confirma. ¿Quieres que te explique el proceso paso a paso?",
	FallbackPaymentHint: "¿Tienes alguna pregunta sobre los pagos? Prescripto acepta Stripe (tarjeta) y pago en efectivo. Puedes elegir el método desde la página Mis Citas.",
	FallbackCancelHint:  "¿Quieres cancelar? Ve a Mis Citas, encuentra la reserva y pulsa Cancelar. El horario se liberará de inmediato.",
	FallbackHelpHint:    "¡Con gusto te ayudo! Aquí están las principales cosas que puedo hacer por ti. Si prefieres hablar con una persona, también puedes contactar a nuestro equipo de administración.",
	FallbackIssueHint:   "Lamento que estés teniendo problemas. Si algo no funciona como debería, puedo conectarte con un administrador que podrá resolverlo.",

	// Botones
	PickDoctorBtn:     "Elige un Médico",
	MyAppointmentsBtn: "Mis Citas",
	MainMenuBtn:       "Menú Principal",
	ShowMeDocsBtn:     "Mostrar Médicos",
	BrowseAllDocsBtn:  "Ver Todos los Médicos",
	FindDoctorBtn:     "Buscar un Médico",
	AboutPaymentBtn:   "Sobre el Pago",
	HowToBookBtn:      "Cómo Reservar",
	PaymentMethodsBtn: "Pago",
	GoMyApptsBtn:      "Ir a Mis Citas",
	GoToMyApptsBtn:    "Ir a Mis Citas",
	BrowseDocsBtn:     "Ver Médicos",
	OpenMyApptsBtn:    "Abrir Mis Citas",
	ContactAdminBtn:   "Contactar Administrador",
	CancelApptBtn:     "Cancelar Cita",
}

func GetTranslation(lang string) Translation {
	if lang == "es" {
		return translationES
	}
	return translationEN
}
