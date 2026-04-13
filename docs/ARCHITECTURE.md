# Architecture Design - Prescripto

## Table of Contents

- [Executive Summary](#executive-summary)
- [Architecture Overview](#architecture-overview)
- [Service-Oriented Architecture (SOA)](#service-oriented-architecture-soa)
- [Services Identification](#services-identification)
- [Communication Patterns](#communication-patterns)
- [Data Flow Architecture](#data-flow-architecture)
- [Service Dependencies](#service-dependencies)
- [Technology Choices](#technology-choices)
- [Scalability Strategy](#scalability-strategy)
- [High Availability](#high-availability)
- [Security Architecture](#security-architecture)
- [Performance Considerations](#performance-considerations)
- [Future Extensibility](#future-extensibility)

## Executive Summary

Prescripto implements a **hybrid Service-Oriented Architecture (SOA)** that combines a modular monolithic backend with independent microservices. This approach provides the benefits of both monolithic systems (simplicity, ease of development) and microservices (scalability, independence) while maintaining clear service boundaries.

The architecture is designed to:
- Support independent scaling of different business functionalities
- Enable separate deployment of non-coupled services
- Provide clear contracts between services via APIs
- Facilitate team collaboration and ownership
- Ensure data consistency across the system
- Maintain backward compatibility

## Architecture Overview

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├──────────────────┬──────────────────┬──────────────────────────┤
│   React Frontend │   Vue Admin      │     Chat Widget          │
│   (SPA)          │   (SPA)          │     (WebSocket)          │
└────────┬──────────┴────────┬─────────┴──────────┬───────────────┘
         │                   │                    │
         └───────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   API Gateway   │
                    │  (NestJS)       │
                    └────────┬────────┘
                             │
         ┌───────────────────┼──────────────────┬─────────────────┐
         │                   │                  │                 │
    ┌────▼─────┐   ┌─────────▼────────┐   ┌────▼────┐   ┌─────────▼──────┐
    │ Auth      │   │ User Profile    │   │ Doctor  │   │ Appointment    │
    │ Service   │   │ Service         │   │ Service │   │ Service        │
    └────┬─────┘   └────────┬────────┘   └────┬────┘   └────────┬───────┘
         │                  │                   │                 │
    ┌────▼────────────────────────────────────────────────────────▼──┐
    │            Shared Infrastructure Layer                         │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
    │  │   Database   │  │  Cloudinary  │  │    Stripe    │          │
    │  │   (MongoDB)  │  │   (CDN)      │  │   (Payment)  │          │
    │  └──────────────┘  └──────────────┘  └──────────────┘          │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
    │  │  Nodemailer  │  │    Cache     │  │    Logging   │          │
    │  │   (Email)    │  │   (Redis*)   │  │   (Service)  │          │
    │  └──────────────┘  └──────────────┘  └──────────────┘          │
    └─────────────────────────────────────────────────────────────────┘
         │
         └─────────────────────────────────────────────────────────┐
                                                                   │
                        ┌──────────────────────┐                   │
                        │  Chat Microservice   │                   │
                        │  (Go + Echo)         │                   │
                        │  - WebSocket Server  │                   │
                        │  - Message Storage   │                   │
                        │  - Bot Logic         │                   │
                        └──────────────────────┘                   │
                                     │                             │
                        ┌────────────▼────────────┐                │
                        │  MongoDB (Chat DB)     ├────────────────┘
                        └────────────────────────┘

* Redis (optional, for future caching)
```

### Architectural Layers

1. **Client Layer**
   - React SPA (Patient Interface)
   - Vue SPA (Admin Dashboard)
   - Chat Widget (Real-time Communication)

2. **API Gateway Layer**
   - NestJS REST API
   - Request routing and authentication
   - Response aggregation and transformation

3. **Service Layer**
   - Modular services (Users, Doctors, Appointments, etc.)
   - Business logic encapsulation
   - Service-to-service communication

4. **Data Access Layer**
   - MongoDB (primary data store)
   - PostgreSQL (migration and analytics)
   - Third-party services (Stripe, Cloudinary)

5. **Microservice Layer**
   - Chat Service (Go)
   - Independent WebSocket server
   - Asynchronous messaging

## Service-Oriented Architecture (SOA)

### SOA Principles Applied

#### 1. **Service Contracts**
Each service exposes well-defined interfaces (REST APIs):

```
Users Service Contract:
├── POST /api/users/register
├── POST /api/users/login
├── GET /api/users/:id
├── PUT /api/users/:id
└── DELETE /api/users/:id

Doctors Service Contract:
├── GET /api/doctors
├── GET /api/doctors/:id
├── POST /api/doctors (admin)
├── PUT /api/doctors/:id (admin)
└── DELETE /api/doctors/:id (admin)

Appointments Service Contract:
├── POST /api/appointments
├── GET /api/appointments/user/:userId
├── GET /api/appointments/doctor/:doctorId
├── PUT /api/appointments/:id/cancel
└── PUT /api/appointments/:id/complete
```

#### 2. **Loose Coupling**
Services interact through well-defined APIs, not directly accessing each other's data:

```typescript
// Bad: Direct database access (Tight coupling)
const user = User.findById(userId);
const doctorDirect = Doctor.findById(doctorId);

// Good: Service API call (Loose coupling)
const doctorData = await doctorsService.getDoctorById(doctorId);
const userData = await usersService.getUserProfile(userId);
```

#### 3. **High Cohesion**
Related functionality is grouped within services:

```
Users Service (High Cohesion)
├── User registration
├── User authentication
├── User profile management
└── User data validation

Appointments Service (High Cohesion)
├── Appointment booking
├── Appointment scheduling
├── Appointment status tracking
└── Slot management
```

#### 4. **Stateless Services**
Each service request contains all necessary context:

```typescript
// Stateless: All context in request
@Post('appointments')
bookAppointment(
  @Body() dto: CreateAppointmentDto,
  @Req() req: Request
) {
  const userId = req.user.id; // From JWT token
  // Service doesn't maintain session state
}
```

#### 5. **Service Registry**
All services are discoverable through the NestJS module system:

```typescript
@Module({
  imports: [
    UsersModule,
    DoctorsModule,
    AppointmentsModule,
    SpecialitiesModule,
    SchedulingModule,
    ReportsModule,
  ]
})
export class AppModule {}
```

### SOA Benefits in Prescripto

| Benefit | Implementation |
|---------|----------------|
| **Independent Development** | Teams can work on different services simultaneously |
| **Scalability** | Critical services (Appointments) scale independently |
| **Technology Flexibility** | Chat service in Go (different tech stack) |
| **Reusability** | Services expose APIs usable by multiple clients |
| **Maintainability** | Clear service boundaries reduce complexity |
| **Fault Isolation** | Service failures don't cascade to entire system |

## Services Identification

### Business Domain Services

#### 1. **Authentication Service**
**Responsibility**: User identity verification and token management

```
Operations:
├── User registration
├── Email/password validation
├── OAuth integration
├── JWT token generation
├── Password reset
└── Token validation

Dependencies:
├── Users Service (for user data)
├── Email Service (for password reset)
└── External: Google, Facebook, Microsoft, Twitter OAuth

API Contract:
├── POST /auth/register
├── POST /auth/login
├── POST /auth/forgot-password
├── POST /auth/reset-password
├── POST /auth/refresh-token
├── POST /auth/google
├── POST /auth/facebook
└── POST /auth/logout
```

#### 2. **Users Service**
**Responsibility**: Patient/client user management

```
Operations:
├── User profile CRUD
├── Personal information management
├── Address management
├── Profile picture upload
└── User data validation

Dependencies:
├── Cloudinary Service (image storage)
├── Authentication Service (user permissions)
└── Database (User collection)

API Contract:
├── GET /api/users/:id
├── PUT /api/users/:id
├── GET /api/users (admin)
├── DELETE /api/users/:id (admin)
└── POST /api/users/:id/upload-photo
```

#### 3. **Doctors Service**
**Responsibility**: Healthcare professional management

```
Operations:
├── Doctor registration
├── Doctor profile management
├── Speciality assignment
├── Availability management
├── Slot booking/release
├── Doctor authentication

Dependencies:
├── Specialities Service
├── Scheduling Service
├── Cloudinary Service (profile pictures)
├── Authentication Service
└── Database (Doctor collection)

API Contract:
├── GET /api/doctors (list)
├── GET /api/doctors/:id
├── GET /api/doctors/speciality/:speciality
├── POST /api/doctors (admin)
├── PUT /api/doctors/:id (admin)
├── DELETE /api/doctors/:id (admin)
├── PATCH /api/doctors/change-availability/:id
├── GET /api/doctors/appointments (for doctor)
├── PATCH /api/doctors/complete-appointment
└── PATCH /api/doctors/cancel-appointment
```

#### 4. **Appointments Service**
**Responsibility**: Core appointment booking and management

```
Operations:
├── Appointment creation
├── Appointment scheduling
├── Appointment cancellation
├── Appointment completion
├── Appointment status tracking
├── Payment processing

Dependencies:
├── Users Service (user data)
├── Doctors Service (doctor availability)
├── Scheduling Service (slot validation)
├── Stripe Service (payment processing)
├── Reports Service (metrics)
└── Database (Appointment collection)

API Contract:
├── POST /api/appointments (create)
├── GET /api/appointments/user/:userId
├── GET /api/appointments/doctor/:doctorId
├── PUT /api/appointments/:id/cancel
├── PUT /api/appointments/:id/complete
└── GET /api/appointments/:id (details)
```

#### 5. **Specialities Service**
**Responsibility**: Medical specialty management

```
Operations:
├── Speciality CRUD
├── Doctor-speciality associations
├── Speciality filtering

Dependencies:
├── Doctors Service
└── Database (Specialities collection)

API Contract:
├── GET /api/specialities
├── POST /api/specialities (admin)
├── PUT /api/specialities/:id (admin)
└── DELETE /api/specialities/:id (admin)
```

#### 6. **Scheduling Service**
**Responsibility**: Appointment slot management

```
Operations:
├── Slot generation
├── Slot validation
├── Slot booking
├── Slot release/cancellation
├── Availability calculation

Dependencies:
├── Doctors Service
├── Database (slot data)
└── Cache (optional, for performance)

API Contract:
├── GET /api/scheduling/slots/:doctorId/:date
├── POST /api/scheduling/book-slot
├── DELETE /api/scheduling/release-slot/:slotId
└── GET /api/scheduling/availability/:doctorId
```

#### 7. **Admin Service**
**Responsibility**: System administration and analytics

```
Operations:
├── System metrics aggregation
├── Appointment statistics
├── Revenue tracking
├── User analytics
├── Doctor performance analysis
├── System configuration

Dependencies:
├── Users Service
├── Doctors Service
├── Appointments Service
├── Reports Service
└── Database (all collections)

API Contract:
├── GET /api/admin/analytics
├── GET /api/admin/appointments/stats
├── GET /api/admin/users/stats
├── GET /api/admin/revenue
├── GET /api/admin/doctors/performance
└── GET /api/admin/specialities
```

#### 8. **Reports Service**
**Responsibility**: Report generation and data export

```
Operations:
├── Appointment reports
├── Revenue reports
├── Doctor performance reports
├── User activity reports
├── Export to PDF
├── Export to Excel

Dependencies:
├── Appointments Service
├── Doctors Service
├── Users Service
├── jsPDF library (PDF generation)
├── XLSX library (Excel generation)
└── Database (data retrieval)

API Contract:
├── POST /api/reports/appointments-report
├── POST /api/reports/revenue-report
├── POST /api/reports/doctor-performance
├── POST /api/reports/export-pdf
└── POST /api/reports/export-excel
```

#### 9. **Chat Microservice** (Independent Service)
**Responsibility**: Real-time messaging and support

```
Operations:
├── WebSocket connection management
├── Message routing
├── Assistant mode (AI)
├── Support mode (admin contact)
├── Message persistence
├── User session management

Dependencies:
├── MongoDB (message storage)
├── JWT (authentication)
└── External (optional AI service)

API Contract:
├── WebSocket /ws/connect
├── Message events (send, receive)
├── Room management
└── User authentication
```

### Infrastructure Services

#### 10. **Cloudinary Service**
- Image upload and storage
- CDN distribution
- Image optimization

#### 11. **Stripe Service**
- Payment processing
- Transaction management
- Billing

#### 12. **Email Service (Nodemailer)**
- Password reset emails
- Appointment confirmations
- System notifications

#### 13. **Authentication Guard Service**
- JWT validation
- Route protection
- Role-based access control

## Communication Patterns

### Synchronous Communication (HTTP/REST)

**Use Case**: Direct request-response interactions

```
Component A (Frontend)
    │
    │ HTTP GET /api/doctors
    ▼
NestJS Controller
    │
    │ Routes to Service
    ▼
Doctors Service
    │
    │ Query Database
    ▼
MongoDB (Doctors Collection)
    │
    │ Returns data
    ▼
Doctors Service
    │
    │ Formats response
    ▼
NestJS Controller
    │
    │ HTTP 200 + Data
    ▼
Component A (Frontend)
```

**Example Flow: Book Appointment**

```
1. Frontend sends POST /api/appointments
   └─ Body: { userId, doctorId, date, time }

2. Appointments Controller receives request
   └─ Validates DTO

3. Appointments Service processes:
   ├─ Calls Scheduling Service to validate slot
   ├─ Calls Doctors Service to get doctor details
   ├─ Calls Users Service to get user details
   ├─ Processes Stripe payment
   └─ Creates appointment in database

4. Returns confirmation to Frontend
   └─ Status: 201 Created + Appointment data
```

### Asynchronous Communication (WebSocket)

**Use Case**: Real-time messaging and notifications

```
User (Frontend Chat Widget)
    │
    │ WebSocket Connect (ws://localhost:8080)
    ▼
Chat Microservice (Go)
    ├─ Authenticate user
    ├─ Create connection
    └─ Listen for messages
         │
         │ User sends message
         ▼
    Message Handler
         ├─ Validate message
         ├─ Route (Assistant or Support)
         ├─ Store in MongoDB
         └─ Send response
              │
              │ WebSocket message
              ▼
User (Frontend)
```

### Event-Driven Architecture (Future)

**Current**: HTTP-based synchronous
**Future**: Could incorporate:
- Appointment confirmation events
- Payment status events
- Doctor availability changes
- Email notifications

```
Appointment Created Event
    │
    ├─ Trigger: Email Service (send confirmation)
    ├─ Trigger: Reports Service (update metrics)
    ├─ Trigger: Notifications Service (notify user)
    └─ Trigger: Chat Service (send confirmation)
```

## Data Flow Architecture

### Appointment Booking Flow (Detailed)

```
Step 1: User selects doctor and time
        ↓
Step 2: Frontend sends POST /api/appointments
        ├─ URL: /api/appointments
        ├─ Method: POST
        ├─ Header: Authorization: Bearer <token>
        └─ Body: {
             userId: "user123",
             doctorId: "doc456",
             slotDate: "2026-04-15",
             slotTime: "10:00"
           }
        ↓
Step 3: Appointments Controller validates request
        ├─ Validates DTO
        ├─ Validates JWT token
        └─ Extracts userId from token
        ↓
Step 4: Appointments Service processes booking
        ├─ Validate slot availability
        │  └─ Call Scheduling Service
        │     └─ Check slots_booked in Doctor
        │
        ├─ Retrieve user data
        │  └─ Call Users Service
        │     └─ Get User document
        │
        ├─ Retrieve doctor data
        │  └─ Call Doctors Service
        │     └─ Get Doctor document
        │
        ├─ Process payment
        │  └─ Call Stripe API
        │     └─ Charge card (amount: doctor.fees)
        │
        ├─ Create appointment
        │  └─ Save to Appointments collection
        │     {
        │       userId: "user123",
        │       docId: "doc456",
        │       slotDate: "2026-04-15",
        │       slotTime: "10:00",
        │       userData: {...},
        │       docData: {...},
        │       amount: 75,
        │       payment: true,
        │       isCompleted: false,
        │       cancelled: false
        │     }
        │
        ├─ Update doctor slots_booked
        │  └─ Add time slot to Doctor.slots_booked
        │
        └─ Send confirmation email
           └─ Call Email Service
              └─ Send via Nodemailer
        ↓
Step 5: Return response to Frontend
        └─ Status: 201 Created
           {
             success: true,
             data: appointment,
             message: "Appointment booked successfully"
           }
        ↓
Step 6: Frontend displays confirmation
        ├─ Show appointment details
        ├─ Show reference number
        └─ Redirect to My Appointments
```

### Search and Filter Flow

```
User searches for "cardiologists under $100"
    ↓
Frontend: GET /api/doctors?speciality=Cardiology&maxFees=100
    ↓
Doctors Controller routes to Doctors Service
    ↓
Doctors Service:
├─ Query MongoDB: { speciality: "Cardiology", fees: { $lte: 100 } }
│  ├─ Filter by speciality
│  ├─ Filter by fees
│  └─ Apply sorting/pagination
│
└─ Transform documents:
   ├─ Remove sensitive data (passwords)
   ├─ Add availability status
   └─ Format response
    ↓
Return to Frontend: Array of matching doctors
    ↓
Frontend renders doctor cards with:
├─ Name, specialty, qualifications
├─ Fees and ratings
├─ Availability status
└─ "Book Now" button
```

## Service Dependencies

### Dependency Graph

```
Frontend (React)
    ├─ Depends on: NestJS API
    └─ Endpoints needed:
       ├─ /auth/* (authentication)
       ├─ /api/doctors/* (search)
       ├─ /api/appointments/* (booking)
       ├─ /api/users/* (profile)
       └─ /api/specialities/* (filter options)

Admin Panel (Vue)
    ├─ Depends on: NestJS API
    └─ Endpoints needed:
       ├─ /auth/* (authentication)
       ├─ /api/admin/* (dashboards)
       ├─ /api/users/* (management)
       ├─ /api/doctors/* (management)
       ├─ /api/appointments/* (oversight)
       └─ /api/reports/* (generation)

Chat Widget (WebSocket)
    ├─ Depends on: Chat Microservice
    └─ Needs:
       ├─ WebSocket connection
       ├─ Authentication
       └─ Message routing

NestJS Backend
    ├─ Authentication Service
    │  ├─ Depends on: Users Service
    │  ├─ Depends on: OAuth Providers
    │  └─ Updates: User collection
    │
    ├─ Users Service
    │  ├─ Depends on: Cloudinary Service
    │  └─ Updates: User collection
    │
    ├─ Doctors Service
    │  ├─ Depends on: Specialities Service
    │  ├─ Depends on: Scheduling Service
    │  ├─ Depends on: Cloudinary Service
    │  └─ Updates: Doctor collection
    │
    ├─ Appointments Service
    │  ├─ Depends on: Users Service
    │  ├─ Depends on: Doctors Service
    │  ├─ Depends on: Scheduling Service
    │  ├─ Depends on: Stripe Service
    │  ├─ Depends on: Reports Service
    │  └─ Updates: Appointment collection
    │
    ├─ Scheduling Service
    │  ├─ Depends on: Doctors Service
    │  └─ Reads: Doctor collection
    │
    ├─ Admin Service
    │  ├─ Depends on: All other services
    │  └─ Reads: All collections
    │
    ├─ Reports Service
    │  ├─ Depends on: Appointment Service
    │  ├─ Depends on: Doctors Service
    │  └─ Reads: All collections
    │
    └─ Shared Infrastructure:
       ├─ Database Service (MongoDB)
       ├─ Cloudinary Service
       ├─ Stripe Service
       ├─ Email Service
       └─ Cache Service (optional)

Chat Microservice (Go)
    ├─ Depends on: MongoDB
    ├─ Depends on: JWT (Authentication)
    └─ Independent from: NestJS backend
```

### Service Interaction Matrix

| Service A | Calls | Service B | Purpose |
|-----------|-------|-----------|---------|
| Appointments | → | Users | Get user data for appointment |
| Appointments | → | Doctors | Get doctor availability |
| Appointments | → | Scheduling | Validate slot availability |
| Appointments | → | Stripe | Process payment |
| Appointments | → | Email | Send confirmation |
| Doctors | → | Specialities | Validate specialty |
| Doctors | → | Scheduling | Manage slots |
| Admin | → | All Services | Aggregate metrics |
| Reports | → | Appointments | Generate reports |
| Reports | → | Doctors | Performance data |
| Reports | → | Users | User analytics |
| Chat | ⟷ | None | Independent microservice |

## Technology Choices

### Why NestJS for Backend?

```
Requirements:
✓ Scalable Node.js framework
✓ TypeScript support
✓ Modular architecture built-in
✓ Dependency injection
✓ Decorator-based configuration
✓ Built-in validation (class-validator)
✓ Swagger/OpenAPI integration
✓ Strong community and ecosystem

NestJS provides:
├─ @Module() for service encapsulation
├─ @Controller() for HTTP endpoints
├─ @Injectable() for services
├─ Guards for authentication
├─ Interceptors for cross-cutting concerns
├─ Middleware support
└─ Exception filters
```

### Why Go for Chat Service?

```
Requirements:
✓ High-concurrency support
✓ Real-time WebSocket handling
✓ Low memory footprint
✓ Fast compilation
✓ Suitable for microservice

Go provides:
├─ Goroutines (lightweight concurrency)
├─ Echo framework (minimal, fast)
├─ Built-in WebSocket support
├─ Static binary compilation
├─ Easy deployment
└─ Excellent for I/O-bound workloads
```

### Why MongoDB?

```
Requirements:
✓ Semi-structured data (flexible schema)
✓ Horizontal scalability
✓ Real-time aggregation queries
✓ Good for appointments/slots data

MongoDB provides:
├─ Document-based storage
├─ Flexible schema evolution
├─ Built-in aggregation framework
├─ Replication and sharding
├─ Good tooling (MongoDB Compass)
└─ Mongoose ODM for Node.js
```

### Why React + Vue?

```
React (Frontend):
├─ Component-based
├─ Context API for state
├─ Large ecosystem
├─ Excellent for patient interface
└─ SEO-friendly with SSG

Vue (Admin):
├─ Easier learning curve
├─ Composition API
├─ Smaller bundle size
├─ Great for internal tools
└─ Good for admin dashboard
```

## Scalability Strategy

### Horizontal Scaling

**Backend Service Replication:**

```
                    ┌─ Load Balancer ─┐
                    │  (nginx/HAProxy)│
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
    ┌───▼──────┐         ┌──▼──────┐         ┌──▼──────┐
    │ Backend  │         │ Backend │         │ Backend │
    │ Instance │         │ Instance│         │ Instance│
    │ Port 3001│         │ Port 3002│         │ Port 3003│
    └──┬───────┘         └─┬────────┘         └─┬───────┘
       │                   │                    │
       └───────────────────┼────────────────────┘
                           │
                 ┌─────────▼──────────┐
                 │   MongoDB Replica  │
                 │     Set/Cluster    │
                 └────────────────────┘
```

**Frontend/Admin Deployment:**

```
Traditional CDN:
┌──────────────────────────────┐
│ CloudFront / Cloudflare      │
│ ├─ Edge locations globally   │
│ └─ Caches static assets      │
└──────────────────┬───────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
    ┌───▼──┐   ┌──▼──┐   ┌──▼──┐
    │ EU   │   │ US  │   │ASIA │
    │ Edge │   │ Edge│   │ Edge│
    └──────┘   └─────┘   └─────┘
```

**Chat Service Scaling:**

```
Multiple Chat Instance:
                    ┌───────────────┐
                    │ Load Balancer │
                    │ (for WS)      │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
    ┌───▼────┐          ┌──▼──┐          ┌───▼──┐
    │ Chat   │          │Chat │          │Chat  │
    │ Server1│          │ S2  │          │ S3   │
    │ :8001  │          │:8002│          │:8003 │
    └────────┘          └─────┘          └──────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                  ┌─────────▼────────┐
                  │ Message Queue    │
                  │ (RabbitMQ/Redis) │
                  └──────────────────┘
```

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Database optimization (indexing, query optimization)
- Implement caching (Redis)
- Code optimization (lazy loading, pagination)

### Database Scaling

**MongoDB Replication:**
```
Primary Node (Read/Write)
    ├─ Secondary Node 1 (Read)
    ├─ Secondary Node 2 (Read)
    └─ Arbiter Node (Voting only)
```

**Sharding Strategy:**
```
Collections to shard:
├─ Appointments (by doctorId or date)
├─ Users (by userId)
└─ Doctors (by speciality)

Non-sharding:
└─ Specialities (small collection)
```

## High Availability

### Redundancy

```
Application Redundancy:
├─ Multiple backend instances
├─ Load balancing (active-active)
└─ Auto-failover capability

Database Redundancy:
├─ Replica sets (3+ nodes)
├─ Primary/Secondary architecture
├─ Automatic failover
└─ Backup snapshots

Cache Redundancy:
├─ Redis Sentinel
├─ Master/Slave replication
└─ Automatic failover
```

### Disaster Recovery

```
RTO (Recovery Time Objective): < 15 minutes
RPO (Recovery Point Objective): < 5 minutes

Backup Strategy:
├─ Daily full backups
├─ Hourly incremental backups
├─ Backup retention: 30 days
├─ Backup location: Off-site (S3)
└─ Test: Weekly restore tests
```

### Monitoring and Alerting

```
Metrics to Monitor:
├─ API Response Time (target: < 200ms)
├─ Database Query Time (target: < 100ms)
├─ Error Rate (target: < 0.1%)
├─ CPUUsage (alert: > 80%)
├─ Memory Usage (alert: > 85%)
├─ Disk Space (alert: > 80%)
└─ WebSocket Connections (track trends)

Alert Channels:
├─ Email (critical)
├─ Slack (high)
├─ PagerDuty (critical)
└─ SMS (critical + on-call)
```

## Security Architecture

### Authentication and Authorization

```
User Authentication:
1. Credentials → Hash → Compare (bcrypt)
2. Successful → Issue JWT token
3. Token contains: {userId, role, exp}
4. Subsequent requests include token

Authorization:
├─ Routes protected by Guards
├─ @UseGuards(AuthUserGuard)
├─ @UseGuards(AuthAdminGuard)
└─ @UseGuards(AuthDoctorGuard)
```

### Data Security

```
In Transit:
├─ HTTPS/TLS encryption
├─ WSS (WebSocket Secure)
└─ Strong cipher suites

At Rest:
├─ Database encryption
├─ Environment variables encrypted
├─ Secrets management (Vault)
└─ API keys secured
```

### API Security

```
Rate Limiting:
├─ Per IP: 100 requests/minute
├─ Per user: 1000 requests/hour
└─ Per endpoint: adaptive

CORS Configuration:
├─ Frontend: http://localhost:5173
├─ Admin: http://localhost:5174
├─ Chat: ws://localhost:8080
└─ Production: specify exact domains

Input Validation:
├─ DTO validation
├─ Email format validation
├─ Phone number validation
├─ XSS prevention
└─ SQL injection prevention
```

## Performance Considerations

### Caching Strategy

```
Frontend Cache:
├─ Browser cache (assets, static content)
├─ Service Worker cache
└─ Application cache (Context API state)

Backend Cache (Future):
├─ Redis for frequently accessed data
├─ Cache doctor lists (invalidate on update)
├─ Cache specialities (rarely changes)
└─ Cache user profile (10-minute TTL)

CDN Cache:
├─ Static assets (images, JS, CSS)
├─ Medical documents
└─ Doctor profile pictures (Cloudinary)
```

### Query Optimization

```
Database Indexes:
├─ Users: { email: 1 }, { createdAt: -1 }
├─ Doctors: { speciality: 1 }, { fees: 1 }
├─ Appointments: { userId: 1 }, { doctorId: 1 }
└─ Composite: { doctorId: 1, slotDate: 1 }

Query Patterns:
├─ Use projection to select only needed fields
├─ Pagination for large result sets
├─ Lazy load related data
└─ Aggregate queries on reporting
```

### Frontend Optimization

```
Code Splitting:
├─ Route-based code splitting (React.lazy)
├─ Component-level lazy loading
├─ Dynamic imports for utilities
└─ Separate bundles for admin/patient

Asset Optimization:
├─ Image optimization (WebP format)
├─ Minification and compression
├─ Tree shaking for unused code
└─ Gzip compression for responses
```

## Future Extensibility

### Potential Enhancements

1. **Event-Driven Architecture**
   - Migrate to message queues (RabbitMQ, Kafka)
   - Decouple services further
   - Enable real-time notifications

2. **Additional Services**
   ```
   Payment Service (separate)
   ├─ Handles Stripe integration
   └─ Manages transactions independently

   Notification Service
   ├─ Email notifications
   ├─ SMS notifications (Twilio)
   ├─ Push notifications
   └─ In-app notifications

   Analytics Service
   ├─ User behavior tracking
   ├─ Performance metrics
   └─ Business intelligence
   ```

3. **GraphQL API Layer**
   - GraphQL endpoint alongside REST
   - Apollo Server integration
   - Query optimization

4. **Machine Learning Integration**
   - Doctor recommendation engine
   - Demand prediction
   - Appointment no-show prediction

5. **Blockchain (Optional)**
   - Medical record verification
   - Appointment verification
   - Payment verification

### Migration Roadmap

```
Phase 1 (Current): Monolith + Microservices
├─ Single backend + Chat microservice
└─ Direct service calls

Phase 2 (6 months): Event-Driven
├─ Message queue implementation
├─ Asynchronous processing
└─ Event sourcing for critical operations

Phase 3 (12 months): Microservices Migration
├─ Split Auth Service
├─ Split Payments Service
├─ Split Notifications Service
└─ Service mesh integration (optional)

Phase 4 (18 months+): Advanced Features
├─ AI/ML integration
├─ Advanced analytics
├─ Mobile app services
└─ IoT integration (wearables)
```

---

**Document Version**: 1.0.0  
**Last Updated**: April 2026  
**Architecture Maturity**: Production-Ready  
**SOA Compliance**: High
