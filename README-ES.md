# Prescripto - Sistema de Reserva de Citas Médicas

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Características Principales](#características-principales)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Instalación](#instalación)
- [Ejecutar la Aplicación](#ejecutar-la-aplicación)
- [Descripción de Módulos](#descripción-de-módulos)
- [Variables de Entorno](#variables-de-entorno)
- [Documentación de API](#documentación-de-api)

## Descripción General

Prescripto es una aplicación web full-stack completa que permite a los usuarios (pacientes/clientes) reservar citas médicas con profesionales de la salud. El sistema proporciona una experiencia fluida para la gestión de citas, visualización de disponibilidad de doctores y supervisión administrativa.

La plataforma está construida con un stack tecnológico moderno, que incluye una interfaz de frontend basada en React para interacciones de pacientes, un panel de administración basado en Vue para la gestión del sistema, una API REST de NestJS en el backend y un microservicio de chat basado en Go para soporte de usuarios.

## Características Principales

### Interfaz de Paciente
- Registro y autenticación de usuarios (correo/contraseña y OAuth)
- Búsqueda de doctores por especialización
- Filtrado de doctores por honorarios y disponibilidad
- Visualización de perfiles detallados de doctores
- Reserva de citas médicas
- Visualización del historial de citas
- Seguimiento del estado de citas (completadas, canceladas, pendientes)
- Chat en tiempo real con administradores

### Panel de Doctor
- Visualización de citas asignadas
- Acceso a información de pacientes
- Seguimiento del historial de citas
- Registro de información de pagos
- Gestión de espacios de disponibilidad
- Visualización del estado de citas

### Panel de Administración
- Métricas y análisis del sistema
  - Recuento total de citas
  - Recuento de pacientes registrados
  - Estadísticas de citas completadas y canceladas
  - Seguimiento de desempeño de doctores
- Gestión de doctores (añadir, editar, eliminar)
- Gestión de usuarios
- Gestión de especialidades
- Generación y exportación de reportes (PDF, Excel)
- Configuración del sistema

### Módulo de Chat
- Modo asistente: Guiar a los usuarios a través del sistema
- Modo contacto: Comunicación directa con administradores
- Mensajería en tiempo real via WebSocket
- Historial de mensajes

## Stack Tecnológico

### Frontend
- **React** 19.2.0 - Librería de UI
- **Vite** 7.2.4 - Herramienta de construcción
- **Tailwind CSS** 4.1.18 - Framework CSS utilitario
- **React Router** 7.13.0 - Enrutamiento del lado del cliente
- **Axios** 1.13.4 - Cliente HTTP
- **i18next** 26.0.3 - Internacionalización
- **Stripe** 20.4.1 - Procesamiento de pagos
- **React Toastify** 11.0.5 - Notificaciones

### Backend
- **NestJS** 11.0.1 - Framework para Node.js
- **MongoDB** 9.2.2 (Mongoose) - Base de datos principal
- **PostgreSQL** 8.20.0 - Base de datos secundaria
- **JWT** 11.0.2 - Autenticación
- **Passport** 0.7.0 - Middleware de autenticación
  - Google OAuth 2.0
  - Facebook OAuth
  - Microsoft OAuth (opcional)
  - Twitter OAuth (opcional)
- **Swagger** 11.2.6 - Documentación de API
- **Cloudinary** 2.9.0 - Hosting de imágenes y CDN
- **Stripe** 20.4.1 - Procesamiento de pagos
- **Nodemailer** 8.0.4 - Servicio de correo electrónico
- **Multer** 2.0.2 - Middleware de carga de archivos
- **BCrypt** 6.0.0 - Hash de contraseñas
- **Class Validator** 0.15.1 - Validación de DTO

### Panel de Administración
- **Vue** 3.5.25 - Framework de UI
- **Vite** 7.3.1 - Herramienta de construcción
- **Tailwind CSS** 4.2.1 - Estilos
- **Vue Router** 5.0.3 - Enrutamiento
- **Vue i18n** 11.3.1 - Internacionalización
- **Axios** 1.13.5 - Cliente HTTP
- **XLSX** 0.18.5 - Exportación de Excel
- **jsPDF** 4.2.1 - Generación de PDF
- **Vue Toastification** 2.0.0-rc.5 - Notificaciones

### Microservicio de Chat
- **Go** 1.25.5 - Lenguaje de programación
- **Echo** v4.15.1 - Framework web
- **Gorilla WebSocket** 1.5.3 - Soporte para WebSocket
- **MongoDB Driver** 1.17.9 - Driver de base de datos
- **JWT** v5.3.1 - Autenticación
- **Swagger** - Documentación de API

## Estructura del Proyecto

```
Medical-Reservation/
├── frontend/                    # Interfaz del paciente con React
│   ├── src/
│   │   ├── components/         # Componentes React reutilizables
│   │   ├── context/            # Gestión de estado con Context API
│   │   ├── hooks/              # Hooks de React personalizados
│   │   ├── pages/              # Componentes de página
│   │   ├── utils/              # Funciones utilitarias
│   │   ├── i18n/               # Configuración de internacionalización
│   │   └── assets/             # Recursos estáticos
│   ├── package.json
│   └── vite.config.js
│
├── backend/                     # API REST de NestJS
│   ├── src/
│   │   ├── admin/              # Módulo de gestión de administrador
│   │   ├── appointments/       # Módulo de reserva de citas
│   │   ├── auth/               # Módulo de autenticación
│   │   ├── doctors/            # Módulo de gestión de doctores
│   │   ├── users/              # Módulo de gestión de usuarios
│   │   ├── specialities/       # Módulo de especialidades médicas
│   │   ├── scheduling/         # Módulo de programación de citas
│   │   ├── reports/            # Módulo de generación de reportes
│   │   ├── shared/             # Utilidades compartidas y guardias
│   │   ├── migration/          # Scripts de migración de base de datos
│   │   ├── app.module.ts       # Módulo raíz
│   │   └── main.ts             # Punto de entrada de la aplicación
│   ├── test/                   # Pruebas E2E
│   ├── package.json
│   └── tsconfig.json
│
├── admin/                       # Panel de administración con Vue
│   ├── src/
│   │   ├── components/         # Componentes de Vue
│   │   ├── context/            # Gestión de estado
│   │   ├── pages/              # Páginas del administrador
│   │   ├── composables/        # Composables de Vue
│   │   ├── i18n/               # Internacionalización
│   │   └── assets/             # Recursos estáticos
│   ├── package.json
│   └── vite.config.js
│
├── chat/                        # Microservicio de chat con Go
│   ├── cmd/
│   │   ├── server/             # Servidor principal
│   │   ├── debug-chatbot/      # Herramienta de depuración
│   │   └── diagnose/           # Herramienta de diagnóstico
│   ├── internal/
│   │   ├── auth/               # Autenticación
│   │   ├── bot/                # Lógica del chatbot
│   │   ├── config/             # Configuración
│   │   ├── repository/         # Capa de acceso a datos
│   │   └── socket/             # Manejo de WebSocket
│   └── go.mod                  # Dependencias de Go
│
└── docs/                        # Documentación
```

## Instalación

### Requisitos Previos

Asegúrate de tener instalado en tu sistema:

- **Node.js** 18.x o superior (para frontend, backend y admin)
- **npm** o **yarn** (gestor de paquetes Node)
- **Go** 1.25.5 o superior (para el microservicio de chat)
- **MongoDB** 5.0+ (base de datos)
- **PostgreSQL** 12.0+ (para migración de datos)
- **Git**

### Configuración del Backend

```bash
# Navegar al directorio backend
cd backend

# Instalar dependencias
npm install

# Crear archivo .env y configurar variables de entorno
# Copiar de .env.example o crear basándose en la documentación
cp .env.example .env

# Ejecutar migraciones de base de datos
npm run migration:run

# Iniciar servidor de desarrollo
npm run start:dev

# Para producción
npm run build
npm run start:prod
```

### Configuración del Frontend

```bash
# Navegar al directorio frontend
cd frontend

# Instalar dependencias
npm install

# Crear archivo .env
cp .env.example .env

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build
```

### Configuración del Panel de Administración

```bash
# Navegar al directorio admin
cd admin

# Instalar dependencias
npm install

# Crear archivo .env
cp .env.example .env

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build
```

### Configuración del Microservicio de Chat

```bash
# Navegar al directorio chat
cd chat

# Descargar dependencias de Go
go mod download

# Crear archivo .env
cp .env.example .env

# Construir la aplicación
go build -o bin/chat-service ./cmd/server

# Ejecutar el servicio
./bin/chat-service
```

## Ejecutar la Aplicación

### Modo de Desarrollo

Ejecutar todos los servicios concurrentemente:

```bash
# Terminal 1: Backend
cd backend && npm run start:dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Admin
cd admin && npm run dev

# Terminal 4: Microservicio de chat
cd chat && go run ./cmd/server
```

Accede a la aplicación en:
- **Frontend**: http://localhost:5173
- **API Backend**: http://localhost:3000
- **Panel Admin**: http://localhost:5174
- **Documentación de API**: http://localhost:3000/api/docs
- **Servicio de Chat**: http://localhost:8080

### Modo de Producción

```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build
# Servir la carpeta dist con un servidor estático

# Admin
cd admin
npm run build
# Servir la carpeta dist con un servidor estático

# Chat
cd chat
go build -o bin/chat-service ./cmd/server
./bin/chat-service
```

## Descripción de Módulos

### Módulos del Backend

#### Módulo de Usuarios
Gestiona todas las operaciones relacionadas con pacientes/usuarios
- Registro y gestión de perfiles de usuario
- Validación de datos de usuario
- Almacenamiento de dirección e información personal

#### Módulo de Doctores
Maneja la gestión de doctores e información
- Registro de doctores y perfil
- Asignación de especialidad
- Gestión de espacios de disponibilidad
- Seguimiento de credenciales y experiencia de doctores

#### Módulo de Citas
Gestión central de reservas y citas
- Creación y programación de citas
- Validación y gestión de espacios
- Actualizaciones del estado de citas
- Cancelación de citas

#### Módulo de Autenticación
Capa de autenticación y autorización
- Generación y validación de tokens JWT
- Integración de OAuth (Google, Facebook, Microsoft, Twitter)
- Gestión de contraseñas y restablecimiento
- Gestión de sesiones

#### Módulo de Administración
Funcionalidad administrativa
- Gestión de usuarios y doctores
- Métricas y estadísticas del sistema
- Gestión de especialidades
- Generación de reportes
- Agregación de datos del panel

#### Módulo de Especialidades
Gestión de especialidades médicas
- Creación y gestión de especialidades
- Relaciones doctor-especialidad

#### Módulo de Programación
Lógica de programación de citas
- Generación y gestión de espacios
- Cálculo de disponibilidad
- Restricciones de programación

#### Módulo de Reportes
Generación de reportes y análisis
- Reportes de citas
- Seguimiento de ingresos
- Métricas de desempeño de doctores
- Funcionalidad de exportación (PDF, Excel)

#### Módulo de Migración
Utilidades de migración de base de datos
- Migraciones de MongoDB a PostgreSQL
- Sincronización de datos
- Gestión de esquemas

### Componentes del Frontend

El frontend de React proporciona una interfaz intuitiva para que los pacientes:
- Examinar y buscar doctores disponibles
- Filtrar por especialización, honorarios y calificaciones
- Ver perfiles detallados de doctores
- Reservar citas con disponibilidad de espacios en tiempo real
- Gestionar su historial de citas
- Acceder a soporte por chat

### Características del Panel de Administración

El panel de administración en Vue ofrece:
- Análisis y KPI del sistema
- Gestión de usuarios y doctores
- Configuración de especialidades
- Supervisión de citas
- Generación y exportación de reportes
- Configuración del sistema

### Microservicio de Chat

El microservicio en Go proporciona:
- Comunicación bidireccional en tiempo real
- Dos modos operacionales: asistente y soporte
- Persistencia de mensajes
- Autenticación de usuario
- Gestión de conexiones

## Variables de Entorno

### Backend (.env)

```
# Aplicación
PORT=3000
NODE_ENV=development

# Base de Datos
MONGODB_URI=mongodb://localhost:27017/prescripto
POSTGRES_URL=postgresql://user:password@localhost:5432/prescripto

# Autenticación
JWT_SECRET=tu_clave_secreta_jwt
JWT_EXPIRY=7d

# Credenciales OAuth
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
FACEBOOK_APP_ID=tu_facebook_app_id
FACEBOOK_APP_SECRET=tu_facebook_app_secret

# Servicio de Correo
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=tu_email@gmail.com
MAIL_PASS=tu_contraseña_app

# Almacenamiento en la Nube
CLOUDINARY_NAME=tu_cloudinary_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Procesamiento de Pagos
STRIPE_PUBLIC_KEY=tu_stripe_public_key
STRIPE_SECRET_KEY=tu_stripe_secret_key

# URLs del Frontend
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
```

### Frontend (.env)

```
VITE_BACKEND_URL=http://localhost:3000
VITE_CHAT_SERVICE_URL=ws://localhost:8080
VITE_STRIPE_PUBLIC_KEY=tu_stripe_public_key
```

### Panel de Administración (.env)

```
VITE_BACKEND_URL=http://localhost:3000
VITE_CHAT_SERVICE_URL=ws://localhost:8080
```

### Microservicio de Chat (.env)

```
PORT=8080
MONGODB_URI=mongodb://localhost:27017/prescripto-chat
JWT_SECRET=tu_clave_secreta_jwt
NODE_ENV=development
```

## Documentación de API

La documentación de la API del backend se genera automáticamente usando Swagger. Accede a ella en:

```
http://localhost:3000/api/docs
```

Endponts de API Clave:

### Autenticación
- `POST /auth/register` - Registro de usuario
- `POST /auth/login` - Inicio de sesión
- `POST /auth/forgot-password` - Solicitar restablecimiento de contraseña
- `POST /auth/reset-password` - Restablecer contraseña
- `POST /auth/google` - OAuth de Google
- `POST /auth/facebook` - OAuth de Facebook

### Doctores
- `GET /doctors` - Listar todos los doctores
- `GET /doctors/:id` - Obtener detalles del doctor
- `GET /doctors/speciality/:speciality` - Filtrar por especialidad
- `POST /doctors` - Crear doctor (administrador)
- `PUT /doctors/:id` - Actualizar doctor (administrador)
- `DELETE /doctors/:id` - Eliminar doctor (administrador)

### Citas
- `POST /appointments` - Reservar cita
- `GET /appointments/user/:userId` - Obtener citas del usuario
- `GET /appointments/doctor/:doctorId` - Obtener citas del doctor
- `PUT /appointments/:id/cancel` - Cancelar cita
- `PUT /appointments/:id/complete` - Marcar como completada

### Usuarios
- `GET /users/:id` - Obtener perfil de usuario
- `PUT /users/:id` - Actualizar perfil de usuario
- `GET /users` - Listar todos los usuarios (administrador)

### Administración
- `GET /admin/analytics` - Análisis del sistema
- `GET /admin/appointments/stats` - Estadísticas de citas
- `GET /admin/specialities` - Gestionar especialidades
- `POST /admin/reports` - Generar reportes

## Contribuir

Para contribuir a este proyecto:

1. Haz fork del repositorio
2. Crea una rama de característica (`git checkout -b feature/MiCaracterística`)
3. Realiza commit de tus cambios (`git commit -m 'Agregar MiCaracterística'`)
4. Envía mediante push a la rama (`git push origin feature/MiCaracterística`)
5. Abre una solicitud de extracción

## Licencia

Este proyecto está licenciado bajo la licencia UNLICENSED.

## Soporte

Para soporte e consultas:

- Contacto: support@prescripto.com
- Chat: Disponible a través de la interfaz de chat de la aplicación
- Documentación: Consulta el directorio `/docs`

---

**Versión**: 1.0.0  
**Última Actualización**: Abril 2026
