# Prescripto - Medical Appointment Reservation System

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Module Description](#module-description)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)

## Overview

Prescripto is a comprehensive full-stack web application that enables users (patients/clients) to book medical appointments with healthcare professionals. The system provides a seamless experience for patient appointment management, doctor availability visualization, and administrative oversight.

The platform is built with a modern technology stack, featuring a React-based frontend for patient interactions, a Vue-based admin panel for system management, a NestJS REST API backend, and a Go-based chat microservice for user support.

## Key Features

### Patient Interface
- User registration and authentication (email/password and OAuth)
- Search doctors by specialization
- Filter doctors by fees and availability
- View detailed doctor profiles
- Book medical appointments
- View appointment history
- Appointment status tracking (completed, cancelled, pending)
- Real-time chat support with administrators

### Doctor Panel
- View assigned appointments
- Access patient information
- Track appointment history
- Record payment information
- Manage availability slots
- View appointment status

### Admin Dashboard
- System-wide metrics and analytics
  - Total appointments count
  - Registered patients count
  - Completed and cancelled appointments statistics
  - Doctor performance tracking
- Doctor management (add, edit, delete)
- User management
- Speciality management
- Report generation and export (PDF, Excel)
- System configuration

### Chat Module
- Assistant mode: Guide users through the system
- Contact mode: Direct communication with administrators
- Real-time messaging via WebSocket
- Message history

## Technology Stack

### Frontend
- **React** 19.2.0 - UI library
- **Vite** 7.2.4 - Build tool
- **Tailwind CSS** 4.1.18 - Utility-first CSS framework
- **React Router** 7.13.0 - Client-side routing
- **Axios** 1.13.4 - HTTP client
- **i18next** 26.0.3 - Internationalization
- **Stripe** 20.4.1 - Payment processing
- **React Toastify** 11.0.5 - Notifications

### Backend
- **NestJS** 11.0.1 - Node.js framework
- **MongoDB** 9.2.2 (Mongoose) - Primary database
- **PostgreSQL** 8.20.0 - Secondary database
- **JWT** 11.0.2 - Authentication
- **Passport** 0.7.0 - Authentication middleware
  - Google OAuth 2.0
  - Facebook OAuth
  - Microsoft OAuth (optional)
  - Twitter OAuth (optional)
- **Swagger** 11.2.6 - API documentation
- **Cloudinary** 2.9.0 - Image hosting and CDN
- **Stripe** 20.4.1 - Payment processing
- **Nodemailer** 8.0.4 - Email service
- **Multer** 2.0.2 - File upload middleware
- **BCrypt** 6.0.0 - Password hashing
- **Class Validator** 0.15.1 - DTO validation

### Admin Panel
- **Vue** 3.5.25 - UI framework
- **Vite** 7.3.1 - Build tool
- **Tailwind CSS** 4.2.1 - Styling
- **Vue Router** 5.0.3 - Routing
- **Vue i18n** 11.3.1 - Internationalization
- **Axios** 1.13.5 - HTTP client
- **XLSX** 0.18.5 - Excel export
- **jsPDF** 4.2.1 - PDF generation
- **Vue Toastification** 2.0.0-rc.5 - Notifications

### Chat Microservice
- **Go** 1.25.5 - Programming language
- **Echo** v4.15.1 - Web framework
- **Gorilla WebSocket** 1.5.3 - WebSocket support
- **MongoDB Driver** 1.17.9 - Database driver
- **JWT** v5.3.1 - Authentication
- **Swagger** - API documentation

## Project Structure

```
Medical-Reservation/
├── frontend/                    # React patient interface
│   ├── src/
│   │   ├── components/         # Reusable React components
│   │   ├── context/            # Context API state management
│   │   ├── hooks/              # Custom React hooks
│   │   ├── pages/              # Page components
│   │   ├── utils/              # Utility functions
│   │   ├── i18n/               # Internationalization config
│   │   └── assets/             # Static assets
│   ├── package.json
│   └── vite.config.js
│
├── backend/                     # NestJS REST API
│   ├── src/
│   │   ├── admin/              # Admin management module
│   │   ├── appointments/       # Appointment booking module
│   │   ├── auth/               # Authentication module
│   │   ├── doctors/            # Doctor management module
│   │   ├── users/              # User management module
│   │   ├── specialities/       # Medical specialities module
│   │   ├── scheduling/         # Appointment scheduling module
│   │   ├── reports/            # Report generation module
│   │   ├── shared/             # Shared utilities and guards
│   │   ├── migration/          # Database migration scripts
│   │   ├── app.module.ts       # Root module
│   │   └── main.ts             # Application entry point
│   ├── test/                   # E2E tests
│   ├── package.json
│   └── tsconfig.json
│
├── admin/                       # Vue admin dashboard
│   ├── src/
│   │   ├── components/         # Vue components
│   │   ├── context/            # State management
│   │   ├── pages/              # Admin pages
│   │   ├── composables/        # Vue composables
│   │   ├── i18n/               # Internationalization
│   │   └── assets/             # Static assets
│   ├── package.json
│   └── vite.config.js
│
├── chat/                        # Go chat microservice
│   ├── cmd/
│   │   ├── server/             # Main server
│   │   ├── debug-chatbot/      # Debug tool
│   │   └── diagnose/           # Diagnostics tool
│   ├── internal/
│   │   ├── auth/               # Authentication
│   │   ├── bot/                # Chatbot logic
│   │   ├── config/             # Configuration
│   │   ├── repository/         # Data access layer
│   │   └── socket/             # WebSocket handling
│   └── go.mod                  # Go dependencies
│
└── docs/                        # Documentation
```

## Installation

### Prerequisites

Ensure you have the following installed on your system:

- **Node.js** 18.x or higher (for frontend, backend, and admin)
- **npm** or **yarn** (Node package manager)
- **Go** 1.25.5 or higher (for chat microservice)
- **MongoDB** 5.0+ (databases)
- **PostgreSQL** 12.0+ (for data migration)
- **Git**

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file and configure environment variables
# Copy from .env.example or create based on documentation
cp .env.example .env

# Run database migrations
npm run migration:run

# Start development server
npm run start:dev

# For production
npm run build
npm run start:prod
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build
```

### Admin Panel Setup

```bash
# Navigate to admin directory
cd admin

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build
```

### Chat Microservice Setup

```bash
# Navigate to chat directory
cd chat

# Download Go dependencies
go mod download

# Create .env file
cp .env.example .env

# Build the application
go build -o bin/chat-service ./cmd/server

# Run the service
./bin/chat-service
```

## Running the Application

### Development Mode

Run all services concurrently:

```bash
# Terminal 1: Backend
cd backend && npm run start:dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Admin
cd admin && npm run dev

# Terminal 4: Chat microservice
cd chat && go run ./cmd/server
```

Access the application at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Admin Panel**: http://localhost:5174
- **API Documentation**: http://localhost:3000/api/docs
- **Chat Service**: http://localhost:8080

### Production Mode

```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build
# Serve the dist folder with a static server

# Admin
cd admin
npm run build
# Serve the dist folder with a static server

# Chat
cd chat
go build -o bin/chat-service ./cmd/server
./bin/chat-service
```

## Module Description

### Backend Modules

#### Users Module
Manages all patient/user-related operations
- User registration and profile management
- User data validation
- Address and Personal information storage

#### Doctors Module
Handles doctor management and information
- Doctor registration and profile
- Speciality assignment
- Availability slot management
- Doctor credentials and experience tracking

#### Appointments Module
Core booking and appointment management
- Appointment creation and scheduling
- Slot validation and management
- Appointment status updates
- Appointment cancellation

#### Auth Module
Authentication and authorization layer
- JWT token generation and validation
- OAuth integration (Google, Facebook, Microsoft, Twitter)
- Password management and reset
- Session management

#### Admin Module
Administrative functionality
- User and doctor management
- System metrics and statistics
- Speciality management
- Report generation
- Dashboard data aggregation

#### Specialities Module
Medical speciality management
- Speciality creation and management
- Doctor-speciality relationships

#### Scheduling Module
Appointment scheduling logic
- Slot generation and management
- Availability calculation
- Scheduling constraints

#### Reports Module
Report generation and analytics
- Appointment reports
- Revenue tracking
- Doctor performance metrics
- Export functionality (PDF, Excel)

#### Migration Module
Database migration utilities
- MongoDB to PostgreSQL migrations
- Data synchronization
- Schema management

### Frontend Components

The React frontend provides an intuitive interface for patients to:
- Browse and search available doctors
- Filter by specialization, fees, and ratings
- View detailed doctor profiles
- Book appointments with real-time slot availability
- Manage their appointment history
- Access chat support

### Admin Panel Features

The Vue admin dashboard offers:
- System analytics and KPIs
- User and doctor management
- Speciality configuration
- Appointment oversight
- Report generation and export
- System configuration

### Chat Microservice

The Go microservice provides:
- Real-time bidirectional communication
- Two operational modes: assistant and support
- Message persistence
- User authentication
- Connection management

## Environment Variables

### Backend (.env)

```
# Application
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/prescripto
POSTGRES_URL=postgresql://user:password@localhost:5432/prescripto

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRY=7d

# OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Email Service
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password

# Cloud Storage
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Payment Processing
STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# Frontend URLs
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
```

### Frontend (.env)

```
VITE_BACKEND_URL=http://localhost:3000
VITE_CHAT_SERVICE_URL=ws://localhost:8080
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

### Admin Panel (.env)

```
VITE_BACKEND_URL=http://localhost:3000
VITE_CHAT_SERVICE_URL=ws://localhost:8080
```

### Chat Microservice (.env)

```
PORT=8080
MONGODB_URI=mongodb://localhost:27017/prescripto-chat
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

## API Documentation

The backend API documentation is automatically generated using Swagger. Access it at:

```
http://localhost:3000/api/docs
```

Key API Endpoints:

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `POST /auth/google` - Google OAuth
- `POST /auth/facebook` - Facebook OAuth

### Doctors
- `GET /doctors` - List all doctors
- `GET /doctors/:id` - Get doctor details
- `GET /doctors/speciality/:speciality` - Filter by speciality
- `POST /doctors` - Create doctor (admin)
- `PUT /doctors/:id` - Update doctor (admin)
- `DELETE /doctors/:id` - Delete doctor (admin)

### Appointments
- `POST /appointments` - Book appointment
- `GET /appointments/user/:userId` - Get user appointments
- `GET /appointments/doctor/:doctorId` - Get doctor appointments
- `PUT /appointments/:id/cancel` - Cancel appointment
- `PUT /appointments/:id/complete` - Mark as completed

### Users
- `GET /users/:id` - Get user profile
- `PUT /users/:id` - Update user profile
- `GET /users` - List all users (admin)

### Admin
- `GET /admin/analytics` - System analytics
- `GET /admin/appointments/stats` - Appointment statistics
- `GET /admin/specialities` - Manage specialities
- `POST /admin/reports` - Generate reports

## Contributing

To contribute to this project:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the UNLICENSED license.

## Support

For support and inquiries:

- Contact: support@prescripto.com
- Chat: Available through the in-app chat interface
- Documentation: See `/docs` directory

---

**Version**: 1.0.0  
**Last Updated**: April 2026
