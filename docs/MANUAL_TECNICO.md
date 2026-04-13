# Manual Técnico - Prescripto

## Tabla de Contenidos

- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Arquitectura del Backend](#arquitectura-del-backend)
- [Arquitectura del Frontend](#arquitectura-del-frontend)
- [Arquitectura del Panel Admin](#arquitectura-del-panel-admin)
- [Arquitectura del Microservicio de Chat](#arquitectura-del-microservicio-de-chat)
- [Diseño de Bases de Datos](#diseño-de-bases-de-datos)
- [Documentación de API](#documentación-de-api)
- [Configuración de Entorno](#configuración-de-entorno)
- [Consideraciones de Despliegue](#consideraciones-de-despliegue)
- [Flujo de Trabajo de Desarrollo](#flujo-de-trabajo-de-desarrollo)

## Arquitectura del Sistema

### Tipo de Arquitectura

Prescripto implementa una arquitectura **híbrida modular monolítica con microservicios**:

- **Backend (NestJS)**: API REST monolítica con estructura modular
- **Frontend (React)**: Aplicación de página única (SPA)
- **Panel Admin (Vue)**: SPA separada para tareas administrativas
- **Servicio de Chat (Go)**: Microservicio independiente para comunicación en tiempo real

### Flujo de Datos

```
Navegador del Usuario (Frontend)
         ↓
    HTTP/REST
         ↓
    API NestJS (Backend)
    ├── Autenticación (JWT/OAuth)
    ├── Lógica de Negocio
    └── Persistencia de Datos
         ↓
    Bases de Datos
    ├── MongoDB (datos principales)
    └── PostgreSQL (migración/reportes)
         ↓
    Servicios Externos
    ├── Cloudinary (almacenamiento)
    ├── Stripe (pagos)
    └── Nodemailer (correo)

Servicio de Chat (Go)
    ├── Conexiones WebSocket
    └── MongoDB (datos de chat)
```

### Patrones de Comunicación

- **Síncrono**: Llamadas a API REST (HTTP)
- **Asíncrono**: WebSocket para chat y actualizaciones en tiempo real
- **APIs Externas**: Stripe, Cloudinary, proveedores OAuth

## Stack Tecnológico

### Tecnologías Principales

| Capa | Tecnología | Versión | Propósito |
|-------|-----------|---------|---------|
| **Backend** | NestJS | 11.0.1 | Framework Node.js (TypeScript) |
| **Backend** | TypeScript | 5.x | JavaScript seguro con tipos |
| **Frontend** | React | 19.2.0 | Librería de UI (JavaScript) |
| **Frontend** | Vite | 7.2.4 | Herramienta de construcción |
| **Admin** | Vue | 3.5.25 | Framework progresivo (JavaScript) |
| **Admin** | Vite | 7.3.1 | Herramienta de construcción |
| **Chat** | Go | 1.25.5 | Lenguaje compilado |
| **Chat** | Echo | v4.15.1 | Framework web para Go |

### Tecnologías de Base de Datos

| Base de Datos | Versión | Propósito | Utilizada por |
|----------|---------|---------|---------|
| MongoDB | 9.2.2 (Mongoose) | Base de datos NoSQL de documentos | Backend, Servicio Chat |
| PostgreSQL | 8.20.0 (driver pg) | Base de datos relacional | Backend (migración de datos) |

### Autenticación y Seguridad

| Paquete | Versión | Propósito |
|---------|---------|---------|
| JWT (NestJS) | 11.0.2 | Autenticación basada en tokens |
| Passport | 0.7.0 | Framework de autenticación |
| bcrypt | 6.0.0 | Hash de contraseñas |
| dotenv | 17.3.1 | Gestión de variables de entorno |

### Proveedores OAuth

- Google OAuth 2.0
- Facebook OAuth
- Microsoft OAuth (opcional)
- Twitter OAuth (opcional)

### Pago y Almacenamiento

| Servicio | Paquete | Propósito |
|---------|---------|---------|
| Stripe | 20.4.1 | Procesamiento de pagos |
| Cloudinary | 2.9.0 | Hosting de imágenes y CDN |
| Nodemailer | 8.0.4 | Servicio de correo |

### Dependencias del Frontend

| Paquete | Versión | Propósito |
|---------|---------|---------|
| React Router | 7.13.0 | Enrutamiento del lado cliente |
| Axios | 1.13.4 | Cliente HTTP |
| i18next | 26.0.3 | Internacionalización (Frontend) |
| React i18next | 17.0.2 | Integración i18n React |
| Tailwind CSS | 4.1.18 | Framework CSS utilitario |
| React Toastify | 11.0.5 | Notificaciones tipo toast |
| React Markdown | 10.1.0 | Renderización de Markdown |

### Dependencias del Panel Admin

| Paquete | Versión | Propósito |
|---------|---------|---------|
| Vue i18n | 11.3.1 | Internacionalización (Admin) |
| Vue Router | 5.0.3 | Enrutamiento del lado cliente |
| Axios | 1.13.5 | Cliente HTTP |
| Tailwind CSS | 4.2.1 | Framework CSS utilitario |
| XLSX | 0.18.5 | Generación de archivos Excel |
| jsPDF | 4.2.1 | Generación de PDF |
| Vue Toastification | 2.0.0-rc.5 | Notificaciones tipo toast |

### DevDependencies del Backend

| Paquete | Versión | Propósito |
|---------|---------|---------|
| @nestjs/schematics | 11.0.0 | Generación de código |
| ESLint | 10.0.1 | Linting de código |
| Jest | 30.0.0 | Framework de testing |
| TypeScript | 5.x | Verificación de tipos |

### Dependencias del Microservicio de Chat

| Paquete | Versión | Propósito |
|---------|---------|---------|
| github.com/golang-jwt/jwt | v5.3.1 | Autenticación JWT |
| github.com/gorilla/websocket | v1.5.3 | Soporte WebSocket |
| github.com/labstack/echo | v4.15.1 | Framework web Echo |
| go.mongodb.org/mongo-driver | v1.17.9 | Driver de MongoDB |
| github.com/swaggo/swag | v1.16.2 | Documentación Swagger |

## Estructura del Proyecto

### Estructura del Directorio Raíz

```
Medical-Reservation/
├── frontend/                    # SPA React (Interfaz de Paciente)
├── backend/                     # API REST NestJS
├── admin/                       # SPA Vue (Panel de Administración)
├── chat/                        # Microservicio Go (Chat en Tiempo Real)
├── docs/                        # Documentación
├── README.md                    # README en Inglés
├── README-ES.md                 # README en Español
└── .gitignore                   # Configuración de Git
```

### Estructura del Backend

```
backend/
├── src/
│   ├── admin/                   # Módulo de Gestión de Admin
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   ├── admin.module.ts
│   │   └── dto/
│   │       ├── create-admin.dto.ts
│   │       └── update-admin.dto.ts
│   │
│   ├── appointments/            # Módulo de Reserva de Citas
│   │   ├── appointments.controller.ts
│   │   ├── appointments.service.ts
│   │   ├── appointments.module.ts
│   │   ├── schemas/
│   │   │   └── appointment.schema.ts
│   │   └── dto/
│   │       ├── create-appointment.dto.ts
│   │       └── update-appointment.dto.ts
│   │
│   ├── auth/                    # Módulo de Autenticación
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── password-reset.service.ts
│   │   ├── password-reset-token.schema.ts
│   │   ├── dto/
│   │   │   ├── login-user.dto.ts
│   │   │   ├── register-user.dto.ts
│   │   │   └── reset-password.dto.ts
│   │   └── strategies/
│   │       ├── google.strategy.ts
│   │       ├── facebook.strategy.ts
│   │       └── (opcional) microsoft.strategy.ts
│   │
│   ├── doctors/                 # Módulo de Gestión de Doctores
│   │   ├── doctors.controller.ts
│   │   ├── doctors.service.ts
│   │   ├── doctors.module.ts
│   │   ├── schemas/
│   │   │   └── doctor.schema.ts
│   │   └── dto/
│   │       ├── login-doctor.dto.ts
│   │       ├── create-doctor.dto.ts
│   │       └── update-profile-doctor.dto.ts
│   │
│   ├── users/                   # Módulo de Gestión de Usuarios
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   ├── schemas/
│   │   │   └── user.schema.ts
│   │   └── dto/
│   │       ├── register-user.dto.ts
│   │       ├── login-user.dto.ts
│   │       └── update-profile.dto.ts
│   │
│   ├── specialities/            # Módulo de Gestión de Especialidades
│   │   ├── specialities.controller.ts
│   │   ├── specialities.service.ts
│   │   ├── specialities.module.ts
│   │   ├── schemas/
│   │   │   └── speciality.schema.ts
│   │   └── dto/
│   │
│   ├── scheduling/              # Módulo de Programación de Citas
│   │   ├── scheduling.controller.ts
│   │   ├── scheduling.service.ts
│   │   ├── scheduling.module.ts
│   │   └── dto/
│   │
│   ├── reports/                 # Módulo de Generación de Reportes
│   │   ├── reports.controller.ts
│   │   ├── reports.service.ts
│   │   ├── reports.module.ts
│   │   └── dto/
│   │
│   ├── migration/               # Módulo de Migración de BD
│   │   ├── migration.service.ts
│   │   ├── migration.module.ts
│   │   ├── postgres.service.ts
│   │   └── schemas/
│   │
│   ├── shared/                  # Utilidades Compartidas y Guardias
│   │   ├── cloudinary/
│   │   │   ├── cloudinary.service.ts
│   │   │   └── cloudinary.module.ts
│   │   ├── database/
│   │   │   └── database.module.ts
│   │   ├── guards/
│   │   │   ├── auth-admin.guard.ts
│   │   │   ├── auth-doctor.guard.ts
│   │   │   ├── auth-user.guard.ts
│   │   │   └── auth-user.module.ts
│   │   ├── structures/
│   │   └── utils/
│   │
│   ├── app.module.ts            # Módulo Raíz
│   ├── app.controller.ts        # Controlador Raíz
│   ├── app.service.ts           # Servicio Raíz
│   └── main.ts                  # Punto de Entrada
│
├── test/
│   ├── app.e2e-spec.ts          # Pruebas End-to-End
│   └── jest-e2e.json            # Configuración Jest
│
├── dist/                        # Salida compilada (generada)
├── node_modules/                # Dependencias (generada)
├── package.json                 # Metadatos del proyecto
├── tsconfig.json                # Configuración TypeScript
├── tsconfig.build.json          # Configuración TypeScript para build
├── nest-cli.json                # Configuración CLI de NestJS
└── eslint.config.mjs            # Configuración ESLint
```

### Estructura del Frontend

```
frontend/
├── src/
│   ├── components/              # Componentes React Reutilizables
│   │   ├── Banner.jsx
│   │   ├── ChatWidget.jsx
│   │   ├── Footer.jsx
│   │   ├── ForgotPasswordModal.jsx
│   │   ├── Header.jsx
│   │   ├── LanguageSwitcher.jsx
│   │   ├── Navbar.jsx
│   │   ├── RelatedDoctors.jsx
│   │   ├── SpecialityMenu.jsx
│   │   └── TopDoctors.jsx
│   │
│   ├── context/                 # Gestión de Estado con Context API
│   │   ├── AdminContext.js
│   │   ├── AppContext.js
│   │   └── DoctorContext.js
│   │
│   ├── hooks/                   # Hooks de React Personalizados
│   │   └── (archivos de hooks)
│   │
│   ├── pages/                   # Componentes de Página
│   │   ├── Login.jsx
│   │   ├── Home.jsx
│   │   ├── Doctors.jsx
│   │   ├── Appointments.jsx
│   │   ├── Profile.jsx
│   │   └── (otras páginas)
│   │
│   ├── utils/                   # Funciones de Utilidad
│   │   └── (archivos de utilidad)
│   │
│   ├── i18n/                    # Internacionalización
│   │   ├── index.js
│   │   └── locales/
│   │       ├── en.json
│   │       └── es.json
│   │
│   ├── assets/                  # Recursos Estáticos
│   │   ├── assets.js
│   │   ├── images/
│   │   ├── icons/
│   │   └── styles/
│   │
│   ├── App.jsx                  # Componente Raíz
│   ├── main.jsx                 # Punto de entrada React DOM
│   └── index.css                # Estilos globales
│
├── public/                      # Archivos estáticos públicos
├── node_modules/                # Dependencias (generada)
├── dist/                        # Salida de build (generada)
├── package.json                 # Metadatos del proyecto
├── vite.config.js               # Configuración de Vite
├── index.html                   # Template HTML
└── eslint.config.js             # Configuración ESLint
```

### Estructura del Panel Admin

```
admin/
├── src/
│   ├── components/              # Componentes Vue
│   │   ├── ForgotPasswordModal.vue
│   │   ├── LanguageSwitcher.vue
│   │   ├── Navbar.vue
│   │   ├── ReportExportButtons.vue
│   │   ├── Sidebar.vue
│   │   ├── SpecialityTreeManager.vue
│   │   └── (otros componentes)
│   │
│   ├── context/                 # Gestión de Estado
│   │   ├── AdminContext.js
│   │   ├── AppContext.js
│   │   └── DoctorContext.js
│   │
│   ├── pages/                   # Componentes de Página
│   │   ├── Login.vue
│   │   ├── Admin/
│   │   │   ├── Dashboard.vue
│   │   │   ├── Users.vue
│   │   │   ├── Doctors.vue
│   │   │   ├── Appointments.vue
│   │   │   └── Reports.vue
│   │   └── Doctor/
│   │       ├── Dashboard.vue
│   │       ├── Appointments.vue
│   │       └── Profile.vue
│   │
│   ├── composables/             # Composables de Vue (Hooks)
│   │   ├── useForgotPassword.js
│   │   ├── useReportExport.js
│   │   └── useSort.vue.js
│   │
│   ├── i18n/                    # Internacionalización
│   │   ├── index.js
│   │   └── locales/
│   │       ├── en.json
│   │       └── es.json
│   │
│   ├── assets/                  # Recursos Estáticos
│   │   └── assets.js
│   │
│   ├── AppLayout.vue            # Componente de Diseño
│   ├── App.vue                  # Componente Raíz
│   ├── main.js                  # Punto de entrada Vue
│   └── style.css                # Estilos globales
│
├── public/                      # Archivos estáticos públicos
├── node_modules/                # Dependencias (generada)
├── dist/                        # Salida de build (generada)
├── package.json                 # Metadatos del proyecto
├── vite.config.js               # Configuración de Vite
└── index.html                   # Template HTML
```

### Estructura del Microservicio de Chat

```
chat/
├── cmd/                         # Aplicaciones de línea de comandos
│   ├── server/                  # Servidor de chat
│   │   └── main.go
│   ├── debug-chatbot/           # Herramienta de depuración
│   │   └── main.go
│   └── diagnose/                # Herramienta de diagnóstico
│       └── main.go
│
├── internal/                    # Paquetes internos (privados)
│   ├── auth/                    # Lógica de autenticación
│   │   ├── jwt.go
│   │   └── auth.go
│   │
│   ├── bot/                     # Lógica del chatbot
│   │   ├── bot.go
│   │   └── handlers.go
│   │
│   ├── config/                  # Configuración
│   │   └── config.go
│   │
│   ├── repository/              # Capa de acceso a datos
│   │   ├── message_repository.go
│   │   └── user_repository.go
│   │
│   └── socket/                  # Manejo de WebSocket
│       ├── socket.go
│       ├── connection.go
│       └── handlers.go
│
├── docs/                        # Documentación de API generada
│   ├── swagger.json
│   ├── swagger.yaml
│   └── docs.go
│
├── bin/                         # Binarios compilados (generada)
│   ├── chat-service
│   └── chat-service.exe
│
├── go.mod                       # Definición del módulo Go
├── go.sum                       # Checksums de dependencias
└── .env.example                 # Template de entorno
```

## Arquitectura del Backend

### Arquitectura de Módulos

El backend sigue la arquitectura modular de NestJS con clara separación de responsabilidades:

#### 1. **Módulo de Autenticación**
- Gestiona registro de usuario, login y OAuth
- Generación y validación de tokens JWT
- Funcionalidad de restablecimiento de contraseña
- Ubicación: `src/auth/`

**Componentes Clave:**
```typescript
// Autenticación JWT
JwtService.sign(payload)

// Estrategias OAuth
GoogleStrategy
FacebookStrategy
MicrosoftStrategy (opcional)
TwitterStrategy (opcional)

// Gestión de contraseñas
PasswordResetService
```

#### 2. **Módulo de Usuarios**
- Gestión de usuarios pacientes/clientes
- Operaciones CRUD de perfil
- Validación de usuarios y autorización

**Servicios Clave:**
```typescript
UsersService
├── register(dto)
├── login(dto)
├── getUserProfile(id)
├── updateProfile(id, dto)
└── deleteUser(id)
```

#### 3. **Módulo de Doctores**
- Gestión de doctores y perfiles
- Gestión de disponibilidad y espacios
- Autenticación de doctores

**Servicios Clave:**
```typescript
DoctorsService
├── doctorList()
├── getDoctorById(id)
├── getDoctorsBySpeciality(speciality)
├── createDoctor(dto)
├── updateDoctor(id, dto)
├── changeAvailability(id)
├── getDoctorAppointments(doctorId)
└── completeAppointment(appointmentId)
```

#### 4. **Módulo de Citas**
- Funcionalidad central de reserva
- Operaciones CRUD de citas
- Gestión y validación de espacios
- Seguimiento de estado de citas

**Servicios Clave:**
```typescript
AppointmentsService
├── bookAppointment(dto)
├── getUserAppointments(userId)
├── getDoctorAppointments(doctorId)
├── cancelAppointment(appointmentId)
├── completeAppointment(appointmentId)
└── validateSlotAvailability(doctorId, date, time)
```

#### 5. **Módulo de Administración**
- Operaciones administrativas
- Métricas y análisis del sistema
- Gestión de doctores y usuarios
- Generación de reportes

**Servicios Clave:**
```typescript
AdminService
├── getSystemMetrics()
├── getAppointmentStats()
├── getUserStats()
├── getRevenueData()
├── manageSpecialities(operations)
└── generateReport(parameters)
```

#### 6. **Módulo de Especialidades**
- Gestión de especialidad médica
- Asociaciones especialidad-doctor
- Filtrado por especialidad

**Servicios Clave:**
```typescript
SpecialitiesService
├── getAllSpecialities()
├── createSpeciality(dto)
├── updateSpeciality(id, dto)
└── deleteSpeciality(id)
```

#### 7. **Módulo de Programación**
- Generación y gestión de espacios
- Cálculo de disponibilidad
- Restricciones de programación

**Servicios Clave:**
```typescript
SchedulingService
├── generateSlots(doctorId, date)
├── getAvailableSlots(doctorId, date)
├── bookSlot(doctorId, slotId)
└── releaseSlot(slotId)
```

#### 8. **Módulo de Reportes**
- Generación de reportes
- Exportación de datos (PDF, Excel)
- Análisis y métricas

**Servicios Clave:**
```typescript
ReportsService
├── generateAppointmentReport(filters)
├── generateRevenueReport(filters)
├── generateDoctorPerformanceReport(filters)
├── exportToPdf(data)
└── exportToExcel(data)
```

#### 9. **Módulo de Migración**
- Utilidades de migración de BD
- Migración de MongoDB a PostgreSQL
- Sincronización de datos

**Servicios Clave:**
```typescript
MigrationService
├── migrateUserData()
├── migrateDoctorData()
├── migrateAppointmentData()
└── syncData()
```

### Utilidades Compartidas

#### Guardias (Autenticación/Autorización)
```typescript
AuthAdminGuard          // Valida tokens JWT de admin
AuthDoctorGuard         // Valida tokens JWT de doctor
AuthUserGuard           // Valida tokens JWT de usuario
```

**Uso:**
```typescript
@UseGuards(AuthAdminGuard)
async adminOnlyMethod() { }
```

#### Servicio de Cloudinary
Gestiona cargas de imágenes a CDN Cloudinary

```typescript
CloudinaryService
├── uploadImage(file)
├── deleteImage(publicId)
└── getImageUrl(publicId)
```

#### Módulo de Base de Datos
Conexión de MongoDB y configuración

```typescript
DatabaseModule
└── MongooseModule.forRoot(mongoUri)
```

### Flujo de Solicitud/Respuesta

```
Solicitud del Cliente
    ↓
Manejador de Ruta HTTP (Controlador)
    ↓
Verificación de Guardias (Autenticación)
    ↓
Validación de DTOs (@nestjs/class-validator)
    ↓
Lógica de Negocio (Servicio)
    ↓
Consulta a Base de Datos (Mongoose)
    ↓
Transformación de Respuesta
    ↓
Respuesta HTTP al Cliente
```

## Arquitectura del Frontend

### Arquitectura de Componentes

El frontend de React utiliza arquitectura basada en componentes con Context API para gestión de estado.

#### Capas de Estructura

1. **Componentes de Presentación**
   - Banner, Footer, Header
   - Componentes UI reutilizables
   - Sin gestión de estado directo

2. **Componentes Contenedor**
   - Componentes a nivel de página
   - Conectan a Context y servicios
   - Manejan lógica y estado

3. **Proveedores de Contexto**
   - Gestión de estado global
   - AppContext, AdminContext, DoctorContext

### Componentes Clave

```
Navbar (Encabezado)
├── Enlaces a secciones principales
├── Cambiador de idioma
└── Menú de usuario

SpecialityMenu
├── Muestra especialidades médicas
└── Filtran por especialidad

TopDoctors
├── Muestra doctores destacados
└── Opciones de reserva rápida

ChatWidget
├── Modo asistente IA
├── Modo contacto de soporte
└── Mensajería en tiempo real

ForgotPasswordModal
└── Interfaz de restablecimiento

Footer
└── Enlaces e información
```

### Gestión de Estado (Context API)

**AppContext.js** - Estado de aplicación global
```javascript
export const AppContext = createContext({
  userData: null,
  setUserData: () => {},
  doctors: [],
  setDoctors: () => {},
  appointments: [],
  setAppointments: () => {},
})
```

**AdminContext.js** - Estado del panel admin
```javascript
export const AdminContext = createContext({
  adminData: null,
  setAdminData: () => {},
  adminStats: null,
  setAdminStats: () => {},
})
```

**DoctorContext.js** - Estado del panel de doctor
```javascript
export const DoctorContext = createContext({
  doctorData: null,
  setDoctorData: () => {},
  doctorAppointments: [],
  setDoctorAppointments: () => {},
})
```

### Estructura de Páginas

```
Pages/
├── Login
│   ├── Formulario de correo/contraseña
│   ├── Botones OAuth
│   └── Enlaces de registro
│
├── Home
│   ├── Sección hero
│   ├── Especialidades
│   ├── Doctores destacados
│   └── Vitrina de características
│
├── Doctors
│   ├── Barra de búsqueda
│   ├── Barra lateral de filtros
│   ├── Grid de doctores
│   └── Paginación
│
├── Appointments
│   ├── Citas próximas
│   ├── Citas pasadas
│   └── Detalles de cita
│
└── Profile
    ├── Información de usuario
    ├── Detalles de dirección
    └── Botón editar perfil
```

## Arquitectura del Panel Admin

### Componentes Vue

Vue 3 Composition API con componentes de archivo individual (.vue)

#### Componentes de Diseño
- AppLayout.vue - Diseño maestro con barra lateral
- Navbar.vue - Navegación superior
- Sidebar.vue - Navegación lateral

#### Páginas de Admin
- Dashboard.vue - Análisis y métricas
- Users.vue - Gestión de usuarios
- Doctors.vue - Gestión de doctores
- Appointments.vue - Descripción general de citas
- Reports.vue - Generación y exportación de reportes

#### Páginas de Doctor
- Dashboard.vue - Descripción de citas del doctor
- Appointments.vue - Detalles de citas
- Profile.vue - Gestión de perfil del doctor

### Composables (Hooks de Vue)

**useForgotPassword.js**
```javascript
export function useForgotPassword() {
  const isLoading = ref(false)
  const resetPassword = async (email) => { }
  return { isLoading, resetPassword }
}
```

**useReportExport.js**
```javascript
export function useReportExport() {
  const exportToPdf = async (data) => { }
  const exportToExcel = async (data) => { }
  return { exportToPdf, exportToExcel }
}
```

**useSort.vue.js**
```javascript
export function useSort() {
  const sort = ref('asc')
  const sorted = computed(() => { })
  return { sort, sorted }
}
```

## Arquitectura del Microservicio de Chat

### Microservicio Go

Construido con framework Echo para alto desempeño

#### Arquitectura

```
Servidor Echo
    ↓
Manejador WebSocket
    ├── Gestor de Conexiones
    ├── Enrutador de Mensajes
    └── Gestor de Usuarios
         ↓
    Servicios Internos
    ├── Servicio Bot (IA)
    ├── Repositorio de Mensajes
    └── Repositorio de Usuarios
         ↓
    MongoDB
```

#### Componentes Clave

**Manejador WebSocket**
- Acepta conexiones WebSocket
- Enruta mensajes a manejadores apropiados
- Gestiona ciclo de vida de conexión

**Servicio Bot**
- Modo asistente impulsado por IA
- Analiza intención del usuario
- Genera respuestas

**Repositorio de Mensajes**
- Almacena mensajes en MongoDB
- Recupera historial de chat
- Gestiona persistencia

**Gestión de Usuarios**
- Autentica usuarios via JWT
- Rastrea conexiones activas
- Mantiene sesiones de usuario

## Diseño de Bases de Datos

### Colecciones de MongoDB

#### Colección de Usuarios
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  image: String (URL de Cloudinary),
  address: {
    line1: String,
    line2: String
  },
  gender: String,
  dob: String,
  phone: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Colección de Doctores
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  image: String,
  speciality: String,
  degree: String,
  experience: String,
  about: String,
  available: Boolean,
  fees: Number,
  address: {
    line1: String,
    line2: String
  },
  date: Number,
  slots_booked: {
    [date]: [String] // Array de espacios de tiempo reservados
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### Colección de Citas
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  docId: ObjectId,
  slotDate: String,
  slotTime: String,
  userData: Object,
  docData: Object,
  amount: Number,
  date: Number,
  cancelled: Boolean,
  payment: Boolean,
  isCompleted: Boolean,
  cancellationReason: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Colección de Mensajes (Chat)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  senderRole: String, // 'user', 'admin', 'bot'
  message: String,
  mode: String, // 'assistant', 'support'
  timestamp: Date,
  read: Boolean,
  createdAt: Date
}
```

### Tablas de PostgreSQL (para Migración)

```sql
-- Usadas para migración de datos y reportes
-- Reflejan estructura de MongoDB en formato relacional

CREATE TABLE users_pg (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  image TEXT,
  address JSONB,
  created_at TIMESTAMP
);

CREATE TABLE doctors_pg (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  speciality VARCHAR(255),
  fees DECIMAL(10, 2),
  available BOOLEAN,
  created_at TIMESTAMP
);

CREATE TABLE appointments_pg (
  id UUID PRIMARY KEY,
  user_id UUID,
  doctor_id UUID,
  slot_date DATE,
  slot_time TIME,
  amount DECIMAL(10, 2),
  cancelled BOOLEAN,
  payment BOOLEAN,
  completed BOOLEAN,
  created_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users_pg(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors_pg(id)
);
```

## Documentación de API

### URL Base
```
http://localhost:3000
```

### Documentación Swagger
```
http://localhost:3000/api/docs
```

### Formato de Respuesta Estándar

**Respuesta Éxitiosa:**
```json
{
  "success": true,
  "data": {},
  "message": "Operación exitosa"
}
```

**Respuesta de Error:**
```json
{
  "success": false,
  "error": "Mensaje de error",
  "statusCode": 400
}
```

### Encabezados de Autenticación

**Bearer Token (JWT):**
```
Authorization: Bearer <jwt_token>
```

**Encabezados Personalizados:**
```
atoken: <admin_token>        // Para endpoints de admin
dtoken: <doctor_token>       // Para endpoints de doctor
```

## Configuración de Entorno

### Variables de Entorno del Backend

```env
# Aplicación
PORT=3000
NODE_ENV=development

# Base de Datos
MONGODB_URI=mongodb://localhost:27017/prescripto
POSTGRES_URL=postgresql://user:password@localhost:5432/prescripto

# Configuración JWT
JWT_SECRET=tu_clave_segura_y_larga
JWT_EXPIRY=7d

# Credenciales OAuth
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
FACEBOOK_APP_ID=tu_facebook_app_id
FACEBOOK_APP_SECRET=tu_facebook_app_secret

# Servicio de Correo (SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=tu_email@gmail.com
MAIL_PASS=tu_contraseña_especifica

# Cloudinary (Almacenamiento de Imágenes)
CLOUDINARY_NAME=tu_cloudinary_name
CLOUDINARY_API_KEY=tu_cloudinary_api_key
CLOUDINARY_API_SECRET=tu_cloudinary_api_secret

# Stripe (Procesamiento de Pagos)
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# URLs del Frontend
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
CHAT_URL=http://localhost:8080
```

### Variables de Entorno del Frontend

```env
VITE_BACKEND_URL=http://localhost:3000
VITE_CHAT_SERVICE_URL=ws://localhost:8080
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

### Variables de Entorno del Panel Admin

```env
VITE_BACKEND_URL=http://localhost:3000
VITE_CHAT_SERVICE_URL=ws://localhost:8080
```

### Variables de Entorno del Microservicio de Chat

```env
PORT=8080
MONGODB_URI=mongodb://localhost:27017/prescripto-chat
JWT_SECRET=tu_clave_secreta_jwt
NODE_ENV=development
LOG_LEVEL=info
```

## Consideraciones de Despliegue

### Despliegue del Backend

**Build de Producción:**
```bash
npm run build
npm run start:prod
```

**Lista de Verificación de Despliegue:**
- [ ] Configurar variables de entorno para producción
- [ ] Configurar conexión de MongoDB para producción
- [ ] Establecer JWT_SECRET fuerte
- [ ] Configurar credenciales de Cloudinary
- [ ] Establecer claves de Stripe (producción)
- [ ] Habilitar CORS para dominio de producción
- [ ] Establecer NODE_ENV=production
- [ ] Configurar certificado SSL/TLS
- [ ] Configurar backups de base de datos
- [ ] Configurar logging y monitoreo

**Hosting Recomendado:**
- AWS EC2, ECS, o Elastic Beanstalk
- Google Cloud Run o App Engine
- Azure App Service
- DigitalOcean App Platform

### Despliegue del Frontend

**Build de Producción:**
```bash
npm run build
```

Salida a directorio `dist/`

**Opciones de Despliegue:**
- **Hosting Estático**: Vercel, Netlify, GitHub Pages
- **CDN**: CloudFront, Cloudflare
- **Contenedor**: Docker + AWS, GCP, Azure
- **Servidor Dedicado**: nginx, Apache

**Lista de Verificación de Frontend:**
- [ ] Optimizaciones de build habilitadas
- [ ] Variables de entorno configuradas
- [ ] URLs de API apuntando a backend de producción
- [ ] URL de servicio de chat correcta
- [ ] Claves de Stripe para producción
- [ ] Análisis/monitoreo configurado

### Despliegue del Panel Admin

Mismo proceso que frontend

**Build:**
```bash
npm run build
```

**Despliegue:** Mismas opciones que frontend

### Despliegue del Microservicio de Chat

**Build de Producción:**
```bash
go build -o bin/chat-service ./cmd/server
```

**Opciones de Despliegue:**
- Contenedor Docker
- AWS Lambda
- Google Cloud Functions
- Azure Functions
- VPS/EC2

**Lista de Verificación de Chat:**
- [ ] Conexión de MongoDB de producción
- [ ] JWT_SECRET configurado
- [ ] Seguridad WebSocket habilitada
- [ ] Rate limiting configurado
- [ ] Logging habilitado
- [ ] Endpoints de verificación de salud

### Despliegue con Docker

**Dockerfile Backend Ejemplo:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

**Dockerfile Frontend Ejemplo:**
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Estrategia de Backup de Base de Datos

**Backups de MongoDB:**
```bash
# Backup
mongodump --uri "mongodb://localhost:27017/prescripto" --out ./backups

# Restauración
mongorestore ./backups/prescripto
```

**Backups de PostgreSQL:**
```bash
# Backup
pg_dump prescripto > backup.sql

# Restauración
psql prescripto < backup.sql
```

## Flujo de Trabajo de Desarrollo

### Configuración Local de Desarrollo

```bash
# 1. Clonar repositorio
git clone <repository-url>

# 2. Instalar dependencias para todos los servicios
cd backend && npm install
cd ../frontend && npm install
cd ../admin && npm install
cd ../chat && go mod download

# 3. Configurar variables de entorno
cp .env.example .env

# 4. Iniciar servicios (en terminales separadas)
# Terminal 1
cd backend && npm run start:dev

# Terminal 2
cd frontend && npm run dev

# Terminal 3
cd admin && npm run dev

# Terminal 4
cd chat && go run ./cmd/server
```

### Estándares de Código

**Backend (TypeScript/NestJS):**
- Seguir mejores prácticas de NestJS
- Usar decoradores apropiadamente
- Implementar manejo de errores adecuado
- Usar DTOs para validación
- Escribir pruebas unitarias para servicios

**Frontend (React):**
- Usar componentes funcionales
- Implementar patrones correctos de hooks
- Usar Context API para estado global
- Seguir composición de componentes
- Escribir PropTypes o TypeScript interfaces

**Admin (Vue):**
- Usar Composition API
- Componentes de archivo individual
- Separación apropiada de componentes
- Gestión de datos reactiva
- Estilos con scope

**Chat (Go):**
- Seguir convenciones de Go
- Usar goroutines apropiadamente
- Implementar manejo de errores
- Usar interfaces para abstracción
- Escribir pruebas unitarias

### Testing

**Testing del Backend (Jest):**
```bash
npm run test           # Ejecutar todas las pruebas
npm run test:watch    # Modo watch
npm run test:cov      # Reporte de cobertura
```

**Testing E2E:**
```bash
npm run test:e2e       # Ejecutar pruebas E2E
```

### Linting y Formateo

**Backend:**
```bash
npm run lint          # Verificar estilo de código
npm run format        # Auto-formatear código
```

---

**Versión**: 1.0.0  
**Última Actualización**: Abril 2026  
**Compatibilidad**: Node.js 18+, Go 1.25.5+
