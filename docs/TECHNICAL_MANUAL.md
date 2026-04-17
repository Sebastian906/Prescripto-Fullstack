# Technical Manual - Prescripto

## Table of Contents

- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Admin Panel Architecture](#admin-panel-architecture)
- [Chat Microservice Architecture](#chat-microservice-architecture)
- [Database Design](#database-design)
- [API Documentation](#api-documentation)
- [Environment Configuration](#environment-configuration)
- [Deployment Considerations](#deployment-considerations)
- [Development Workflow](#development-workflow)

## System Architecture

### Architecture Type

Prescripto implements a **hybrid modular monolith with microservices** architecture:

- **Backend (NestJS)**: Monolithic REST API with modular structure
- **Frontend (React)**: Single Page Application (SPA)
- **Admin Panel (Vue)**: Separate SPA for administrative tasks
- **Chat Service (Go)**: Independent microservice for real-time communication

### Data Flow

```
User Browser (Frontend)
         ↓
    HTTP/REST
         ↓
    NestJS API (Backend)
    ├── Authentication (JWT/OAuth)
    ├── Business Logic
    └── Data Persistence
         ↓
    Databases
    ├── MongoDB (main data)
    └── PostgreSQL (migration/reporting)
         ↓
    External Services
    ├── Cloudinary (image storage)
    ├── Stripe (payments)
    └── Nodemailer (email)

Chat Service (Go)
    ├── WebSocket connections
    └── MongoDB (chat data)
```

![Software Architecture Diagram](./images/architecture-diagram.svg)

### Communication Patterns

- **Synchronous**: REST API calls (HTTP)
- **Asynchronous**: WebSocket for chat and real-time updates
- **External APIs**: Stripe, Cloudinary, OAuth providers

## Technology Stack

### Core Technologies

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Backend** | NestJS | 11.0.1 | Node.js framework (TypeScript) |
| **Backend** | TypeScript | 5.x | Type-safe JavaScript |
| **Frontend** | React | 19.2.0 | UI library (JavaScript) |
| **Frontend** | Vite | 7.2.4 | Build tool & dev server |
| **Admin** | Vue | 3.5.25 | Progressive framework (JavaScript) |
| **Admin** | Vite | 7.3.1 | Build tool & dev server |
| **Chat** | Go | 1.25.5 | Compiled language |
| **Chat** | Echo | v4.15.1 | Go web framework |

### Database Technologies

| Database | Version | Purpose | Used By |
|----------|---------|---------|---------|
| MongoDB | 9.2.2 (Mongoose) | NoSQL document database | Backend, Chat Service |
| PostgreSQL | 8.20.0 (pg driver) | Relational database | Backend (data migration) |

### Authentication & Security

| Package | Version | Purpose |
|---------|---------|---------|
| JWT (NestJS) | 11.0.2 | Token-based authentication |
| Passport | 0.7.0 | Authentication framework |
| bcrypt | 6.0.0 | Password hashing |
| dotenv | 17.3.1 | Environment variable management |

### OAuth Providers

- Google OAuth 2.0
- Facebook OAuth
- Microsoft OAuth (optional)
- Twitter OAuth (optional)

### Payment & Storage

| Service | Package | Purpose |
|---------|---------|---------|
| Stripe | 20.4.1 | Payment processing |
| Cloudinary | 2.9.0 | Image hosting & CDN |
| Nodemailer | 8.0.4 | Email service |

### Frontend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| React Router | 7.13.0 | Client-side routing |
| Axios | 1.13.4 | HTTP client |
| i18next | 26.0.3 | Internationalization (Frontend) |
| React i18next | 17.0.2 | i18n React integration |
| Tailwind CSS | 4.1.18 | Utility CSS framework |
| React Toastify | 11.0.5 | Toast notifications |
| React Markdown | 10.1.0 | Markdown rendering |

### Admin Panel Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| Vue i18n | 11.3.1 | Internationalization (Admin) |
| Vue Router | 5.0.3 | Client-side routing |
| Axios | 1.13.5 | HTTP client |
| Tailwind CSS | 4.2.1 | Utility CSS framework |
| XLSX | 0.18.5 | Excel file generation |
| jsPDF | 4.2.1 | PDF generation |
| Vue Toastification | 2.0.0-rc.5 | Toast notifications |

### Backend DevDependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @nestjs/schematics | 11.0.0 | Code generation |
| ESLint | 10.0.1 | Code linting |
| Jest | 30.0.0 | Testing framework |
| TypeScript | 5.x | Type checking |

### Chat Microservice Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| github.com/golang-jwt/jwt | v5.3.1 | JWT authentication |
| github.com/gorilla/websocket | v1.5.3 | WebSocket support |
| github.com/labstack/echo | v4.15.1 | Echo web framework |
| go.mongodb.org/mongo-driver | v1.17.9 | MongoDB driver |
| github.com/swaggo/swag | v1.16.2 | Swagger documentation |

## Project Structure

### Root Directory Structure

```
Medical-Reservation/
├── frontend/                    # React SPA (Patient Interface)
├── backend/                     # NestJS REST API
├── admin/                       # Vue SPA (Admin Dashboard)
├── chat/                        # Go Microservice (Real-time Chat)
├── docs/                        # Documentation
├── README.md                    # English README
├── README-ES.md                 # Spanish README
└── .gitignore                   # Git configuration
```

### Backend Structure

```
backend/
├── src/
│   ├── admin/                   # Admin Management Module
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   ├── admin.module.ts
│   │   └── dto/
│   │       ├── create-admin.dto.ts
│   │       └── update-admin.dto.ts
│   │
│   ├── appointments/            # Appointment Booking Module
│   │   ├── appointments.controller.ts
│   │   ├── appointments.service.ts
│   │   ├── appointments.module.ts
│   │   ├── schemas/
│   │   │   └── appointment.schema.ts
│   │   └── dto/
│   │       ├── create-appointment.dto.ts
│   │       └── update-appointment.dto.ts
│   │
│   ├── auth/                    # Authentication Module
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
│   │       └── (optional) microsoft.strategy.ts
│   │
│   ├── doctors/                 # Doctor Management Module
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
│   ├── users/                   # User Management Module
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
│   ├── specialities/            # Speciality Management Module
│   │   ├── specialities.controller.ts
│   │   ├── specialities.service.ts
│   │   ├── specialities.module.ts
│   │   ├── schemas/
│   │   │   └── speciality.schema.ts
│   │   └── dto/
│   │
│   ├── scheduling/              # Appointment Scheduling Module
│   │   ├── scheduling.controller.ts
│   │   ├── scheduling.service.ts
│   │   ├── scheduling.module.ts
│   │   └── dto/
│   │
│   ├── reports/                 # Report Generation Module
│   │   ├── reports.controller.ts
│   │   ├── reports.service.ts
│   │   ├── reports.module.ts
│   │   └── dto/
│   │
│   ├── migration/               # Database Migration Module
│   │   ├── migration.service.ts
│   │   ├── migration.module.ts
│   │   ├── postgres.service.ts
│   │   └── schemas/
│   │
│   ├── shared/                  # Shared Utilities & Guards
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
│   ├── app.module.ts            # Root Module
│   ├── app.controller.ts        # Root Controller
│   ├── app.service.ts           # Root Service
│   └── main.ts                  # Application Entry Point
│
├── test/
│   ├── app.e2e-spec.ts          # End-to-end tests
│   └── jest-e2e.json            # Jest configuration
│
├── dist/                        # Compiled output (generated)
├── node_modules/                # Dependencies (generated)
├── package.json                 # Project metadata
├── tsconfig.json                # TypeScript configuration
├── tsconfig.build.json          # Build TypeScript configuration
├── nest-cli.json                # NestJS CLI configuration
└── eslint.config.mjs            # ESLint configuration
```

### Frontend Structure

```
frontend/
├── src/
│   ├── components/              # Reusable React Components
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
│   ├── context/                 # Context API State Management
│   │   ├── AdminContext.js
│   │   ├── AppContext.js
│   │   └── DoctorContext.js
│   │
│   ├── hooks/                   # Custom React Hooks
│   │   └── (custom hooks)
│   │
│   ├── pages/                   # Page Components
│   │   ├── Login.jsx
│   │   ├── Home.jsx
│   │   ├── Doctors.jsx
│   │   ├── Appointments.jsx
│   │   ├── Profile.jsx
│   │   └── (other pages)
│   │
│   ├── utils/                   # Utility Functions
│   │   └── (utility files)
│   │
│   ├── i18n/                    # Internationalization
│   │   ├── index.js
│   │   └── locales/
│   │       ├── en.json
│   │       └── es.json
│   │
│   ├── assets/                  # Static Assets
│   │   ├── assets.js
│   │   ├── images/
│   │   ├── icons/
│   │   └── styles/
│   │
│   ├── App.jsx                  # Root Component
│   ├── main.jsx                 # React DOM entry point
│   └── index.css                # Global styles
│
├── public/                      # Static public files
├── node_modules/                # Dependencies (generated)
├── dist/                        # Build output (generated)
├── package.json                 # Project metadata
├── vite.config.js               # Vite configuration
├── index.html                   # HTML template
└── eslint.config.js             # ESLint configuration
```

### Admin Panel Structure

```
admin/
├── src/
│   ├── components/              # Vue Components
│   │   ├── ForgotPasswordModal.vue
│   │   ├── LanguageSwitcher.vue
│   │   ├── Navbar.vue
│   │   ├── ReportExportButtons.vue
│   │   ├── Sidebar.vue
│   │   ├── SpecialityTreeManager.vue
│   │   └── (other components)
│   │
│   ├── context/                 # State Management
│   │   ├── AdminContext.js
│   │   ├── AppContext.js
│   │   └── DoctorContext.js
│   │
│   ├── pages/                   # Page Components
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
│   ├── composables/             # Vue Composables (Hooks)
│   │   ├── useForgotPassword.js
│   │   ├── useReportExport.js
│   │   └── useSort.vue.js
│   │
│   ├── i18n/                    # Internationalization
│   │   ├── index.js
│   │   └── locales/
│   │       ├── en.json
│   │       └── es.json
│   │
│   ├── assets/                  # Static Assets
│   │   └── assets.js
│   │
│   ├── AppLayout.vue            # Layout Component
│   ├── App.vue                  # Root Component
│   ├── main.js                  # Vue app entry point
│   └── style.css                # Global styles
│
├── public/                      # Static public files
├── node_modules/                # Dependencies (generated)
├── dist/                        # Build output (generated)
├── package.json                 # Project metadata
├── vite.config.js               # Vite configuration
└── index.html                   # HTML template
```

### Chat Microservice Structure

```
chat/
├── cmd/                         # Command-line applications
│   ├── server/                  # Chat server
│   │   └── main.go
│   ├── debug-chatbot/           # Debug tool
│   │   └── main.go
│   └── diagnose/                # Diagnostic tool
│       └── main.go
│
├── internal/                    # Internal packages (private)
│   ├── auth/                    # Authentication logic
│   │   ├── jwt.go
│   │   └── auth.go
│   │
│   ├── bot/                     # Chatbot logic
│   │   ├── bot.go
│   │   └── handlers.go
│   │
│   ├── config/                  # Configuration
│   │   └── config.go
│   │
│   ├── repository/              # Data access layer
│   │   ├── message_repository.go
│   │   └── user_repository.go
│   │
│   └── socket/                  # WebSocket handling
│       ├── socket.go
│       ├── connection.go
│       └── handlers.go
│
├── docs/                        # Generated API documentation
│   ├── swagger.json
│   ├── swagger.yaml
│   └── docs.go
│
├── bin/                         # Compiled binaries (generated)
│   ├── chat-service
│   └── chat-service.exe
│
├── go.mod                       # Go module definition
├── go.sum                       # Dependency checksums
└── .env.example                 # Environment template
```

## Backend Architecture

![UML Class Diagram](./images/uml-class-diagram.svg)

### Module Architecture

The backend follows NestJS modular architecture with clear separation of concerns:

#### 1. **Auth Module**
- Handles user registration, login, and OAuth
- JWT token generation and validation
- Password reset functionality
- Location: `src/auth/`

**Key Components:**
```typescript
// JWT authentication
JwtService.sign(payload)

// OAuth Strategies
GoogleStrategy
FacebookStrategy
MicrosoftStrategy (optional)
TwitterStrategy (optional)

// Password management
PasswordResetService
```

#### 2. **Users Module**
- Patient/Client user management
- Profile CRUD operations
- User validation and authorization

**Key Services:**
```typescript
UsersService
├── register(dto)
├── login(dto)
├── getUserProfile(id)
├── updateProfile(id, dto)
└── deleteUser(id)
```

#### 3. **Doctors Module**
- Doctor management and profiles
- Availability and slot management
- Doctor login and authentication

**Key Services:**
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

#### 4. **Appointments Module**
- Core booking functionality
- Appointment CRUD operations
- Slot management and validation
- Appointment status tracking

**Key Services:**
```typescript
AppointmentsService
├── bookAppointment(dto)
├── getUserAppointments(userId)
├── getDoctorAppointments(doctorId)
├── cancelAppointment(appointmentId)
├── completeAppointment(appointmentId)
└── validateSlotAvailability(doctorId, date, time)
```

![Appointment Flow Diagram](./images/appointment-flow.svg)

#### 5. **Admin Module**
- Administrative operations
- System-wide metrics and analytics
- Doctor and user management
- Report generation

**Key Services:**
```typescript
AdminService
├── getSystemMetrics()
├── getAppointmentStats()
├── getUserStats()
├── getRevenueData()
├── manageSpecialities(operations)
└── generateReport(parameters)
```

#### 6. **Specialities Module**
- Medical specialty management
- Specialty-doctor associations
- Specialty filtering

**Key Services:**
```typescript
SpecialitiesService
├── getAllSpecialities()
├── createSpeciality(dto)
├── updateSpeciality(id, dto)
└── deleteSpeciality(id)
```

#### 7. **Scheduling Module**
- Slot generation and management
- Availability calculation
- Scheduling constraints

**Key Services:**
```typescript
SchedulingService
├── generateSlots(doctorId, date)
├── getAvailableSlots(doctorId, date)
├── bookSlot(doctorId, slotId)
└── releaseSlot(slotId)
```

#### 8. **Reports Module**
- Report generation
- Data export (PDF, Excel)
- Analytics and metrics

**Key Services:**
```typescript
ReportsService
├── generateAppointmentReport(filters)
├── generateRevenueReport(filters)
├── generateDoctorPerformanceReport(filters)
├── exportToPdf(data)
└── exportToExcel(data)
```

![Report Flow Diagram](./images/report-flow.svg)

#### 9. **Migration Module**
- Database migration utilities
- MongoDB to PostgreSQL migration
- Data synchronization

**Key Services:**
```typescript
MigrationService
├── migrateUserData()
├── migrateDoctorData()
├── migrateAppointmentData()
└── syncData()
```

### Shared Utilities

#### Guards (Authentication/Authorization)
```typescript
AuthAdminGuard          // Validates admin JWT tokens
AuthDoctorGuard         // Validates doctor JWT tokens
AuthUserGuard           // Validates user JWT tokens
```

**Usage:**
```typescript
@UseGuards(AuthAdminGuard)
async adminOnlyMethod() { }
```

#### Cloudinary Service
Manages image uploads to Cloudinary CDN

```typescript
CloudinaryService
├── uploadImage(file)
├── deleteImage(publicId)
└── getImageUrl(publicId)
```

#### Database Module
MongoDB connection and configuration

```typescript
DatabaseModule
└── MongooseModule.forRoot(mongoUri)
```

### Request/Response Flow

```
Client Request
    ↓
HTTP Route Handler (Controller)
    ↓
Guards Check (Authentication)
    ↓
DTOs Validation (@nestjs/class-validator)
    ↓
Business Logic (Service)
    ↓
Database Query (Mongoose)
    ↓
Response Transformation
    ↓
HTTP Response to Client
```

## Frontend Architecture

### Component Architecture

The React frontend uses a component-based architecture with Context API for state management.

#### Structure Layers

1. **Presentational Components**
   - Banner, Footer, Header
   - Reusable UI components
   - No direct state management

2. **Container Components**
   - Page-level components
   - Connect to Context and services
   - Handle logic and state

3. **Context Providers**
   - Global state management
   - AppContext, AdminContext, DoctorContext

### Key Components

```
Navbar (Header)
├── Links to main sections
├── Language switcher
└── User profile menu

SpecialityMenu
├── Displays medical specialties
└── Filter by specialty

TopDoctors
├── Shows featured doctors
└── Quick booking options

ChatWidget
├── AI assistant mode
├── Support contact mode
└── Real-time messaging

ForgotPasswordModal
└── Password reset interface

Footer
└── Links and information
```

### State Management (Context API)

**AppContext.js** - Global application state
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

**AdminContext.js** - Admin panel state
```javascript
export const AdminContext = createContext({
  adminData: null,
  setAdminData: () => {},
  adminStats: null,
  setAdminStats: () => {},
})
```

**DoctorContext.js** - Doctor panel state
```javascript
export const DoctorContext = createContext({
  doctorData: null,
  setDoctorData: () => {},
  doctorAppointments: [],
  setDoctorAppointments: () => {},
})
```

### Page Structure

```
Pages/
├── Login
│   ├── Email/password form
│   ├── OAuth buttons
│   └── Register link
│
├── Home
│   ├── Hero section
│   ├── Specialties
│   ├── Top doctors
│   └── Features showcase
│
├── Doctors
│   ├── Search bar
│   ├── Filter sidebar
│   ├── Doctor grid
│   └── Pagination
│
├── Appointments
│   ├── Upcoming appointments
│   ├── Past appointments
│   └── Appointment details
│
└── Profile
    ├── User information
    ├── Address details
    └── Edit profile button
```

## Admin Panel Architecture

### Vue Components

Vue 3 Composition API with single-file components (.vue)

#### Layout Components
- AppLayout.vue - Master layout with sidebar
- Navbar.vue - Top navigation
- Sidebar.vue - Side navigation

#### Admin Pages
- Dashboard.vue - Analytics and metrics
- Users.vue - User management
- Doctors.vue - Doctor management
- Appointments.vue - Appointment overview
- Reports.vue - Report generation and export

#### Doctor Pages
- Dashboard.vue - Doctor's appointment overview
- Appointments.vue - Appointment details
- Profile.vue - Doctor profile management

### Composables (Vue Hooks)

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

## Chat Microservice Architecture

### Go Microservice

Built with Echo framework for high performance

#### Architecture

```
Echo Server
    ↓
WebSocket Handler
    ├── Connection Manager
    ├── Message Router
    └── User Manager
         ↓
    Internal Services
    ├── Bot Service (AI)
    ├── Message Repository
    └── User Repository
         ↓
    MongoDB
```

![Chatbot Flow Diagram](./images/chatbot-flow.svg)

#### Key Components

**WebSocket Handler**
- Accepts WebSocket connections
- Routes messages to appropriate handlers
- Manages connection lifecycle

**Bot Service**
- AI-powered assistant mode
- Parses user intent
- Generates responses

**Message Repository**
- Stores messages in MongoDB
- Retrieves chat history
- Manages persistence

**User Management**
- Authenticates users via JWT
- Tracks active connections
- Maintains user sessions

## Database Design

**Relational Database Diagram:**

![Entity-Relationship Diagram](./images/entity-relation-diagram.svg)

**NoSQL Database Diagram:**

![Non-Relational Database Diagram](./images/non-relational-diagram.svg)

### MongoDB Collections

#### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  image: String (Cloudinary URL),
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

#### Doctors Collection
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
    [date]: [String] // Array of booked time slots
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### Appointments Collection
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

#### Messages Collection (Chat)
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

### PostgreSQL Tables (for Migration)

```sql
-- Used for data migration and reporting
-- Mirrors MongoDB structure in relational format

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

## API Documentation

### Base URL
```
http://localhost:3000
```

### Swagger Documentation
```
http://localhost:3000/api/docs
```

### Standard Response Format

**Success Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

### Authentication Headers

**Bearer Token (JWT):**
```
Authorization: Bearer <jwt_token>
```

**Custom Headers:**
```
atoken: <admin_token>        // For admin endpoints
dtoken: <doctor_token>       // For doctor endpoints
```

### Service Communication Sequences

![Appointment Sequence Diagram](./images/appointment-sequence.svg)

![Authentication Sequence Diagram](./images/auth-sequence.svg)

![Chat Sequence Diagram](./images/chat-sequence.svg)

## Environment Configuration

### Backend Environment Variables

```env
# Application
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/prescripto
POSTGRES_URL=postgresql://user:password@localhost:5432/prescripto

# JWT Configuration
JWT_SECRET=your_long_and_secure_secret_key
JWT_EXPIRY=7d

# OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Email Service (SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_specific_password

# Cloudinary (Image Storage)
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Stripe (Payment Processing)
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Frontend URLs
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
CHAT_URL=http://localhost:8080
```

### Frontend Environment Variables

```env
VITE_BACKEND_URL=http://localhost:3000
VITE_CHAT_SERVICE_URL=ws://localhost:8080
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

### Admin Panel Environment Variables

```env
VITE_BACKEND_URL=http://localhost:3000
VITE_CHAT_SERVICE_URL=ws://localhost:8080
```

### Chat Microservice Environment Variables

```env
PORT=8080
MONGODB_URI=mongodb://localhost:27017/prescripto-chat
JWT_SECRET=your_jwt_secret
NODE_ENV=development
LOG_LEVEL=info
```

## Deployment Considerations

### Backend Deployment

**Production Build:**
```bash
npm run build
npm run start:prod
```

**Deployment Checklist:**
- [ ] Set environment variables for production
- [ ] Configure MongoDB connection for production
- [ ] Set strong JWT_SECRET
- [ ] Configure Cloudinary credentials
- [ ] Set up Stripe keys (production)
- [ ] Enable CORS for production domain
- [ ] Set NODE_ENV=production
- [ ] Configure SSL/TLS certificate
- [ ] Set up database backups
- [ ] Configure logging and monitoring

**Recommended Hosting:**
- AWS EC2, ECS, or Elastic Beanstalk
- Google Cloud Run or App Engine
- Azure App Service
- DigitalOcean App Platform

### Frontend Deployment

**Production Build:**
```bash
npm run build
```

Outputs to `dist/` directory

**Deployment Options:**
- **Static Hosting**: Vercel, Netlify, GitHub Pages
- **CDN**: CloudFront, Cloudflare
- **Container**: Docker + AWS, GCP, Azure
- **Dedicated Server**: nginx, Apache

**Frontend Checklist:**
- [ ] Build optimizations enabled
- [ ] Environment variables set
- [ ] API URLs pointing to production backend
- [ ] Chat service URL correct
- [ ] Stripe keys for production
- [ ] Analytics/monitoring configured

### Admin Panel Deployment

Same as frontend process

**Build:**
```bash
npm run build
```

**Deployment:** Same options as frontend

### Chat Microservice Deployment

**Production Build:**
```bash
go build -o bin/chat-service ./cmd/server
```

**Deployment Options:**
- Docker container
- AWS Lambda
- Google Cloud Functions
- Azure Functions
- VPS/EC2

**Chat Checklist:**
- [ ] MongoDB production connection
- [ ] JWT_SECRET configured
- [ ] WebSocket security enabled
- [ ] Rate limiting configured
- [ ] Logging enabled
- [ ] Health check endpoints

### Docker Deployment

**Backend Dockerfile Example:**
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

**Frontend Dockerfile Example:**
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

### Database Backup Strategy

**MongoDB Backups:**
```bash
# Backup
mongodump --uri "mongodb://localhost:27017/prescripto" --out ./backups

# Restore
mongorestore ./backups/prescripto
```

**PostgreSQL Backups:**
```bash
# Backup
pg_dump prescripto > backup.sql

# Restore
psql prescripto < backup.sql
```

## Development Workflow

### Local Development Setup

```bash
# 1. Clone repository
git clone <repository-url>

# 2. Install dependencies for all services
cd backend && npm install
cd ../frontend && npm install
cd ../admin && npm install
cd ../chat && go mod download

# 3. Configure environment variables
cp .env.example .env

# 4. Start services (in separate terminals)
# Terminal 1
cd backend && npm run start:dev

# Terminal 2
cd frontend && npm run dev

# Terminal 3
cd admin && npm run dev

# Terminal 4
cd chat && go run ./cmd/server
```

### Code Standards

**Backend (TypeScript/NestJS):**
- Follow NestJS best practices
- Use decorators properly
- Implement proper error handling
- Use DTOs for validation
- Write unit tests for services

**Frontend (React):**
- Use functional components
- Implement proper hooks patterns
- Use Context API for global state
- Follow component composition
- Write PropTypes or TypeScript interfaces

**Admin (Vue):**
- Use Composition API
- Single-file components
- Proper component separation
- Reactive data management
- Scoped styles

**Chat (Go):**
- Follow Go conventions
- Use goroutines properly
- Implement error handling
- Use interfaces for abstraction
- Write unit tests

### Testing

**Backend Testing (Jest):**
```bash
npm run test           # Run all tests
npm run test:watch    # Watch mode
npm run test:cov      # Coverage report
```

**E2E Testing:**
```bash
npm run test:e2e       # Run E2E tests
```

### Linting and Formatting

**Backend:**
```bash
npm run lint          # Check code style
npm run format        # Auto-format code
```

---

**Version**: 1.0.0  
**Last Updated**: April 2026  
**Compatibility**: Node.js 18+, Go 1.25.5+
