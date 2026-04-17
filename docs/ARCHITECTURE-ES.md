# Diseño de Arquitectura - Prescripto

## Tabla de Contenidos

- [Resumen Ejecutivo](#resumen-ejecutivo)
- [Descripción General de La Arquitectura](#descripción-general-de-la-arquitectura)
- [Arquitectura Orientada a Servicios (SOA)](#arquitectura-orientada-a-servicios-soa)
- [Identificación de Servicios](#identificación-de-servicios)
- [Patrones de Comunicación](#patrones-de-comunicación)
- [Flujo de Datos de Arquitectura](#flujo-de-datos-de-arquitectura)
- [Dependencias de Servicios](#dependencias-de-servicios)
- [Selecciones Tecnológicas](#selecciones-tecnológicas)
- [Estrategia de Escalabilidad](#estrategia-de-escalabilidad)
- [Alta Disponibilidad](#alta-disponibilidad)
- [Arquitectura de Seguridad](#arquitectura-de-seguridad)
- [Consideraciones de Desempeño](#consideraciones-de-desempeño)
- [Extensibilidad Futura](#extensibilidad-futura)

## Resumen Ejecutivo

Prescripto implementa una **arquitectura híbrida orientada a servicios (SOA)** que combina un backend monolítico modular con microservicios independientes. Este enfoque proporciona los beneficios de ambos sistemas monolíticos (simplicidad, facilidad de desarrollo) y microservicios (escalabilidad, independencia) mientras mantiene límites de servicio claros.

La arquitectura está diseñada para:
- Soportar escalado independiente de diferentes funcionalidades empresariales
- Permitir despliegue separado de servicios no acoplados
- Proporcionar contratos claros entre servicios vía APIs
- Facilitar colaboración de equipos y propiedad de servicios
- Asegurar consistencia de datos en todo el sistema
- Mantener compatibilidad hacia atrás

## Descripción General de la Arquitectura

### Arquitectura del Sistema de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                     CAPA DE CLIENTE                             │
├──────────────────┬──────────────────┬──────────────────────────┤
│   Frontend React │   Admin Vue      │     Chat Widget          │
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
    │ Servicio │   │ Servicio de      │   │Servicio │   │ Servicio de    │
    │ Auth     │   │ Perfil de Usuario│   │ Doctor  │   │ Cita           │
    └────┬─────┘   └────────┬────────┘   └────┬────┘   └────────┬───────┘
         │                  │                   │                 │
    ┌────▼────────────────────────────────────────────────────────▼──┐
    │         Capa de Infraestructura Compartida                     │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
    │  │   Base de    │  │  Cloudinary  │  │    Stripe    │          │
    │  │   Datos      │  │   (CDN)      │  │   (Pagos)    │          │
    │  │  (MongoDB)   │  └──────────────┘  └──────────────┘          │
    │  └──────────────┘  ┌──────────────┐  ┌──────────────┐          │
    │  ┌──────────────┐  │    Redis*    │  │   Logging    │          │
    │  │  Nodemailer  │  │   (Cache)    │  │  (Servicio)  │          │
    │  │   (Email)    │  └──────────────┘  └──────────────┘          │
    │  └──────────────┘                                              │
    └─────────────────────────────────────────────────────────────────┘
         │
         └─────────────────────────────────────────────────────────┐
                                                                   │
                        ┌──────────────────────┐                   │
                        │ Microservicio Chat   │                   │
                        │  (Go + Echo)         │                   │
                        │  - Servidor WebSocket│                   │
                        │  - Almacenamiento    │                   │
                        │  - Lógica Bot        │                   │
                        └──────────────────────┘                   │
                                     │                             │
                        ┌────────────▼────────────┐                │
                        │  MongoDB (BD Chat)     ├────────────────┘
                        └────────────────────────┘

* Redis (opcional, para caché futura)
```

![Diagrama de Arquitectura de Software](./images/architecture-diagram.svg)

### Capas Arquitectónicas

1. **Capa de Cliente**
   - SPA React (Interfaz de Paciente)
   - SPA Vue (Panel de Administración)
   - Widget de Chat (Comunicación en Tiempo Real)

2. **Capa de API Gateway**
   - API REST NestJS
   - Enrutamiento de solicitudes y autenticación
   - Agregación y transformación de respuestas

3. **Capa de Servicio**
   - Servicios modulares (Usuarios, Doctores, Citas, etc.)
   - Encapsulación de lógica de negocio
   - Comunicación entre servicios

4. **Capa de Acceso a Datos**
   - MongoDB (almacén de datos principal)
   - PostgreSQL (migración y análisis)
   - Servicios de terceros (Stripe, Cloudinary)

5. **Capa de Microservicio**
   - Servicio de Chat (Go)
   - Servidor WebSocket independiente
   - Mensajería asíncrona

![Diagrama de Clases UML](./images/uml-class-diagram.svg)

## Arquitectura Orientada a Servicios (SOA)

### Principios de SOA Aplicados

#### 1. **Contratos de Servicio**
Cada servicio expone interfaces bien definidas (APIs REST):

```
Contrato del Servicio de Usuarios:
├── POST /api/users/register
├── POST /api/users/login
├── GET /api/users/:id
├── PUT /api/users/:id
└── DELETE /api/users/:id

Contrato del Servicio de Doctores:
├── GET /api/doctors
├── GET /api/doctors/:id
├── POST /api/doctors (admin)
├── PUT /api/doctors/:id (admin)
└── DELETE /api/doctors/:id (admin)

Contrato del Servicio de Citas:
├── POST /api/appointments
├── GET /api/appointments/user/:userId
├── GET /api/appointments/doctor/:doctorId
├── PUT /api/appointments/:id/cancel
└── PUT /api/appointments/:id/complete
```

#### 2. **Bajo Acoplamiento**
Los servicios interactúan a través de APIs bien definidas, no accediendo directamente a datos del otro:

```typescript
// Malo: Acceso directo a BD (Alto acoplamiento)
const user = User.findById(userId);
const doctorDirect = Doctor.findById(doctorId);

// Bueno: Llamada a API de servicio (Bajo acoplamiento)
const doctorData = await doctorsService.getDoctorById(doctorId);
const userData = await usersService.getUserProfile(userId);
```

#### 3. **Alta Cohesión**
La funcionalidad relacionada está agrupada dentro de servicios:

```
Servicio de Usuarios (Alta Cohesión)
├── Registro de usuario
├── Autenticación de usuario
├── Gestión de perfil de usuario
└── Validación de datos de usuario

Servicio de Citas (Alta Cohesión)
├── Reserva de cita
├── Programación de cita
├── Seguimiento de estado de cita
└── Gestión de espacios
```

#### 4. **Servicios Sin Estado**
Cada solicitud de servicio contiene todo el contexto necesario:

```typescript
// Sin estado: Todo el contexto en la solicitud
@Post('appointments')
bookAppointment(
  @Body() dto: CreateAppointmentDto,
  @Req() req: Request
) {
  const userId = req.user.id; // Del token JWT
  // El servicio no mantiene estado de sesión
}
```

#### 5. **Registro de Servicio**
Todos los servicios son descubribles a través del sistema de módulos de NestJS:

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

### Beneficios de SOA en Prescripto

| Beneficio | Implementación |
|---------|----------------|
| **Desarrollo Independiente** | Los equipos trabajar en servicios diferentes simultáneamente |
| **Escalabilidad** | Servicios críticos (Citas) escalan independientemente |
| **Flexibilidad Tecnológica** | Servicio de chat en Go (stack tecnológico diferente) |
| **Reutilización** | Servicios exponen APIs usables por múltiples clientes |
| **Mantenibilidad** | Límites claros de servicio reducen complejidad |
| **Aislamiento de Fallos** | Fallos de servicio no se propagan a todo el sistema |

## Identificación de Servicios

### Servicios de Dominio de Negocio

#### 1. **Servicio de Autenticación**
**Responsabilidad**: Verificación de identidad de usuario y gestión de tokens

```
Operaciones:
├── Registro de usuario
├── Validación de correo/contraseña
├── Integración OAuth
├── Generación de token JWT
├── Restablecimiento de contraseña
└── Validación de token

Dependencias:
├── Servicio de Usuarios (datos del usuario)
├── Servicio de Email (restablecimiento)
└── Proveedores OAuth externos

Contrato de API:
├── POST /auth/register
├── POST /auth/login
├── POST /auth/forgot-password
├── POST /auth/reset-password
├── POST /auth/refresh-token
├── POST /auth/google
├── POST /auth/facebook
└── POST /auth/logout
```

#### 2. **Servicio de Usuarios**
**Responsabilidad**: Gestión de usuarios pacientes/clientes

```
Operaciones:
├── CRUD de perfil de usuario
├── Gestión de información personal
├── Gestión de dirección
├── Carga de foto de perfil
└── Validación de datos de usuario

Dependencias:
├── Servicio de Cloudinary (almacenamiento)
├── Servicio de Autenticación (permisos)
└── Base de datos (colección User)

Contrato de API:
├── GET /api/users/:id
├── PUT /api/users/:id
├── GET /api/users (admin)
├── DELETE /api/users/:id (admin)
└── POST /api/users/:id/upload-photo
```

![Diagrama de Casos de Uso de Pacientes](./images/patient-case.svg)

#### 3. **Servicio de Doctores**
**Responsabilidad**: Gestión de profesionales de la salud

```
Operaciones:
├── Registro de doctor
├── Gestión de perfil de doctor
├── Asignación de especialidad
├── Gestión de disponibilidad
├── Reserva/liberación de espacios
├── Autenticación de doctor

Dependencias:
├── Servicio de Especialidades
├── Servicio de Programación
├── Servicio de Cloudinary
├── Servicio de Autenticación
└── Base de datos (colección Doctor)

Contrato de API:
├── GET /api/doctors (listar)
├── GET /api/doctors/:id
├── GET /api/doctors/speciality/:speciality
├── POST /api/doctors (admin)
├── PUT /api/doctors/:id (admin)
├── DELETE /api/doctors/:id (admin)
├── PATCH /api/doctors/change-availability/:id
├── GET /api/doctors/appointments (para doctor)
├── PATCH /api/doctors/complete-appointment
└── PATCH /api/doctors/cancel-appointment
```

#### 4. **Servicio de Citas**
**Responsabilidad**: Reserva y gestión de citas principales

![Diagrama de Flujo de Citas](./images/appointment-flow.svg)

```
Operaciones:
├── Creación de cita
├── Programación de cita
├── Cancelación de cita
├── Finalización de cita
├── Seguimiento de estado
├── Procesamiento de pago

Dependencias:
├── Servicio de Usuarios (datos)
├── Servicio de Doctores (disponibilidad)
├── Servicio de Programación (validación)
├── Servicio de Stripe (pago)
├── Servicio de Reportes (métricas)
└── Base de datos (colección Appointment)

Contrato de API:
├── POST /api/appointments (crear)
├── GET /api/appointments/user/:userId
├── GET /api/appointments/doctor/:doctorId
├── PUT /api/appointments/:id/cancel
├── PUT /api/appointments/:id/complete
└── GET /api/appointments/:id (detalles)
```

#### 5. **Servicio de Especialidades**
**Responsabilidad**: Gestión de especialidades médicas

```
Operaciones:
├── CRUD de especialidad
├── Asociaciones doctor-especialidad
├── Filtrado por especialidad

Dependencias:
├── Servicio de Doctores
└── Base de datos (colección Specialities)

Contrato de API:
├── GET /api/specialities
├── POST /api/specialities (admin)
├── PUT /api/specialities/:id (admin)
└── DELETE /api/specialities/:id (admin)
```

#### 6. **Servicio de Programación**
**Responsabilidad**: Gestión de espacios de cita

```
Operaciones:
├── Generación de espacios
├── Validación de espacios
├── Reserva de espacios
├── Liberación/cancelación
├── Cálculo de disponibilidad

Dependencias:
├── Servicio de Doctores
├── Base de datos (datos de espacios)
└── Cache (opcional, desempeño)

Contrato de API:
├── GET /api/scheduling/slots/:doctorId/:date
├── POST /api/scheduling/book-slot
├── DELETE /api/scheduling/release-slot/:slotId
└── GET /api/scheduling/availability/:doctorId
```

#### 7. **Servicio de Administración**
**Responsabilidad**: Administración del sistema y análítica

```
Operaciones:
├── Agregación de métricas del sistema
├── Estadísticas de citas
├── Seguimiento de ingresos
├── Análisis de usuarios
├── Análisis de desempeño de doctor
├── Configuración del sistema

Dependencias:
├── Servicio de Usuarios
├── Servicio de Doctores
├── Servicio de Citas
├── Servicio de Reportes
└── Base de datos (todas las colecciones)

Contrato de API:
├── GET /api/admin/analytics
├── GET /api/admin/appointments/stats
├── GET /api/admin/users/stats
├── GET /api/admin/revenue
├── GET /api/admin/doctors/performance
└── GET /api/admin/specialities
```

#### 8. **Servicio de Reportes**
**Responsabilidad**: Generación de reportes y exportación de datos

```
Operaciones:
├── Reportes de citas
├── Reportes de ingresos
├── Reportes de desempeño
├── Reportes de actividad
├── Exportar a PDF
├── Exportar a Excel

Dependencias:
├── Servicio de Citas
├── Servicio de Doctores
├── Servicio de Usuarios
├── Librería jsPDF
├── Librería XLSX
└── Base de datos

Contrato de API:
├── POST /api/reports/appointments-report
├── POST /api/reports/revenue-report
├── POST /api/reports/doctor-performance
├── POST /api/reports/export-pdf
└── POST /api/reports/export-excel
```

#### 9. **Microservicio de Chat** (Servicio Independiente)
**Responsabilidad**: Mensajería en tiempo real y soporte

```
Operaciones:
├── Gestión de conexiones WebSocket
├── Enrutamiento de mensajes
├── Modo asistente (IA)
├── Modo soporte (contacto admin)
├── Persistencia de mensajes
├── Gestión de sesión

Dependencias:
├── MongoDB (almacenamiento)
├── JWT (autenticación)
└── Externo (servicio IA opcional)

Contrato de API:
├── WebSocket /ws/connect
├── Eventos de mensaje (enviar, recibir)
├── Gestión de sala
└── Autenticación de usuario
```

![Diagrama de Casos de Uso del Chatbot](./images/chatbot-case.svg)

### Servicios de Infraestructura

#### 10. **Servicio de Cloudinary**
- Carga de imágenes y almacenamiento
- Distribución CDN
- Optimización de imágenes

#### 11. **Servicio de Stripe**
- Procesamiento de pagos
- Gestión de transacciones
- Facturación

![Diagrama de Secuencia de Pagos](./images/payment-sequence.svg)

#### 12. **Servicio de Email (Nodemailer)**
- Correos de restablecimiento
- Confirmaciones de cita
- Notificaciones del sistema

#### 13. **Servicio de Guardia de Autenticación**
- Validación de JWT
- Protección de rutas
- Control de acceso basado en roles

## Patrones de Comunicación

### Comunicación Síncrona (HTTP/REST)

**Caso de uso**: Interacciones directas de solicitud-respuesta

```
Componente A (Frontend)
    │
    │ HTTP GET /api/doctors
    ▼
Controlador NestJS
    │
    │ Enruta a Servicio
    ▼
Servicio de Doctores
    │
    │ Consulta Base de Datos
    ▼
MongoDB (Colección Doctores)
    │
    │ Retorna datos
    ▼
Servicio de Doctores
    │
    │ Formatea respuesta
    ▼
Controlador NestJS
    │
    │ HTTP 200 + Datos
    ▼
Componente A (Frontend)
```

**Flujo de Ejemplo: Reservar Cita**

```
1. Frontend envía POST /api/appointments
   └─ Body: { userId, doctorId, date, time }

2. Controlador de Citas recibe solicitud
   └─ Valida DTO

3. Servicio de Citas procesa:
   ├─ Llama Servicio de Programación para validar espacio
   ├─ Llama Servicio de Doctores para detalles
   ├─ Llama Servicio de Usuarios para detalles
   ├─ Procesa pago con Stripe
   └─ Crea cita en Base de Datos

4. Retorna confirmación a Frontend
   └─ Estado: 201 Created + datos de cita
```

### Comunicación Asíncrona (WebSocket)

**Caso de uso**: Mensajería y notificaciones en tiempo real

```
Usuario (Widget Chat Frontend)
    │
    │ Conectar WebSocket (ws://localhost:8080)
    ▼
Microservicio Chat (Go)
    ├─ Autentica usuario
    ├─ Crea conexión
    └─ Escucha mensajes
         │
         │ Usuario envía mensaje
         ▼
    Manejador de Mensaje
         ├─ Valida mensaje
         ├─ Enruta (Asistente o Soporte)
         ├─ Almacena en MongoDB
         └─ Envía respuesta
              │
              │ Mensaje WebSocket
              ▼
Usuario (Frontend)
```

**Diagramas de Secuencia Detallados:**

![Diagrama de Secuencia de Citas](./images/appointment-sequence.svg)

![Diagrama de Secuencia de Autenticación](./images/auth-sequence.svg)

![Diagrama de Secuencia de Chat](./images/chat-sequence.svg)

### Arquitectura Impulsada por Eventos (Futuro)

**Actual**: HTTP síncrono
**Futuro**: Podría incorporar:
- Eventos de confirmación de cita
- Eventos de estado de pago
- Cambios de disponibilidad
- Notificaciones de email

```
Evento Cita Creada
    │
    ├─ Disparador: Servicio de Email (enviar confirmación)
    ├─ Disparador: Servicio de Reportes (actualizar métricas)
    ├─ Disparador: Servicio de Notificaciones (notificar usuario)
    └─ Disparador: Servicio de Chat (confirmación)
```

## Flujo de Datos de Arquitectura

### Flujo Detallado de Reserva de Cita

```
Paso 1: Usuario selecciona doctor y hora
        ↓
Paso 2: Frontend envía POST /api/appointments
        ├─ URL: /api/appointments
        ├─ Método: POST
        ├─ Encabezado: Authorization: Bearer <token>
        └─ Body: {
             userId: "user123",
             doctorId: "doc456",
             slotDate: "2026-04-15",
             slotTime: "10:00"
           }
        ↓
Paso 3: Controlador de Citas valida solicitud
        ├─ Valida DTO
        ├─ Valida token JWT
        └─ Extrae userId del token
        ↓
Paso 4: Servicio de Citas procesa reserva
        ├─ Valida disponibilidad de espacio
        │  └─ Llama Servicio de Programación
        │     └─ Verifica slots_booked de Doctor
        │
        ├─ Recupera datos del usuario
        │  └─ Llama Servicio de Usuarios
        │     └─ Obtiene documento User
        │
        ├─ Recupera datos del doctor
        │  └─ Llama Servicio de Doctores
        │     └─ Obtiene documento Doctor
        │
        ├─ Procesa pago
        │  └─ Llama Stripe API
        │     └─ Carga tarjeta (monto: doctor.fees)
        │
        ├─ Crea cita
        │  └─ Guarda en colección Appointments
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
        ├─ Actualiza espacios de doctor
        │  └─ Agrega espacio de tiempo a Doctor.slots_booked
        │
        └─ Envía correo de confirmación
           └─ Llama Servicio de Email
              └─ Envía vía Nodemailer
        ↓
Paso 5: Retorna respuesta a Frontend
        └─ Estado: 201 Created
           {
             success: true,
             data: appointment,
             message: "Cita reservada exitosamente"
           }
        ↓
Paso 6: Frontend muestra confirmación
        ├─ Muestra detalles de cita
        ├─ Muestra número de referencia
        └─ Redirige a Mis Citas
```

### Flujo de Búsqueda y Filtro

```
Usuario busca "cardiólogos menores a $100"
    ↓
Frontend: GET /api/doctors?speciality=Cardiology&maxFees=100
    ↓
Controlador de Doctores enruta a Servicio
    ↓
Servicio de Doctores:
├─ Consulta MongoDB: { speciality: "Cardiology", fees: { $lte: 100 } }
│  ├─ Filtra por especialidad
│  ├─ Filtra por honorarios
│  └─ Aplica ordenamiento/paginación
│
└─ Transforma documentos:
   ├─ Elimina datos sensibles (contraseñas)
   ├─ Agrega estado de disponibilidad
   └─ Formatea respuesta
    ↓
Retorna a Frontend: Array de doctores coincidentes
    ↓
Frontend renderiza tarjetas de doctor con:
├─ Nombre, especialidad, calificaciones
├─ Honorarios y calificaciones
├─ Estado de disponibilidad
└─ Botón "Reservar Ahora"
```

## Dependencias de Servicios

### Grafo de Dependencias

```
Frontend (React)
    ├─ Depende de: API NestJS
    └─ Endpoints necesarios:
       ├─ /auth/* (autenticación)
       ├─ /api/doctors/* (búsqueda)
       ├─ /api/appointments/* (reserva)
       ├─ /api/users/* (perfil)
       └─ /api/specialities/* (opciones filtro)

Panel Admin (Vue)
    ├─ Depende de: API NestJS
    └─ Endpoints necesarios:
       ├─ /auth/* (autenticación)
       ├─ /api/admin/* (dashboards)
       ├─ /api/users/* (gestión)
       ├─ /api/doctors/* (gestión)
       ├─ /api/appointments/* (supervisión)
       └─ /api/reports/* (generación)

Widget Chat (WebSocket)
    ├─ Depende de: Microservicio Chat
    └─ Necesita:
       ├─ Conexión WebSocket
       ├─ Autenticación
       └─ Enrutamiento de mensaje

Backend NestJS
    ├─ Servicio de Autenticación
    │  ├─ Depende de: Servicio de Usuarios
    │  ├─ Depende de: Proveedores OAuth
    │  └─ Actualiza: colección User
    │
    ├─ Servicio de Usuarios
    │  ├─ Depende de: Servicio de Cloudinary
    │  └─ Actualiza: colección User
    │
    ├─ Servicio de Doctores
    │  ├─ Depende de: Servicio de Especialidades
    │  ├─ Depende de: Servicio de Programación
    │  ├─ Depende de: Servicio de Cloudinary
    │  └─ Actualiza: colección Doctor
    │
    ├─ Servicio de Citas
    │  ├─ Depende de: Servicio de Usuarios
    │  ├─ Depende de: Servicio de Doctores
    │  ├─ Depende de: Servicio de Programación
    │  ├─ Depende de: Servicio de Stripe
    │  ├─ Depende de: Servicio de Reportes
    │  └─ Actualiza: colección Appointment
    │
    ├─ Servicio de Programación
    │  ├─ Depende de: Servicio de Doctores
    │  └─ Lee: colección Doctor
    │
    ├─ Servicio de Administración
    │  ├─ Depende de: Todos los servicios
    │  └─ Lee: Todas las colecciones
    │
    ├─ Servicio de Reportes
    │  ├─ Depende de: Servicio de Citas
    │  ├─ Depende de: Servicio de Doctores
    │  └─ Lee: Todas las colecciones
    │
    └─ Infraestructura Compartida:
       ├─ Servicio de Base de Datos (MongoDB)
       ├─ Servicio de Cloudinary
       ├─ Servicio de Stripe
       ├─ Servicio de Email
       └─ Servicio de Cache (opcional)

Microservicio Chat (Go)
    ├─ Depende de: MongoDB
    ├─ Depende de: JWT (Autenticación)
    └─ Independiente de: Backend NestJS
```

### Matriz de Interacción de Servicios

| Servicio A | Llama | Servicio B | Propósito |
|------------|-------|-----------|---------|
| Citas | → | Usuarios | Obtener datos de usuario |
| Citas | → | Doctores | Obtener disponibilidad |
| Citas | → | Programación | Validar disponibilidad |
| Citas | → | Stripe | Procesar pago |
| Citas | → | Email | Enviar confirmación |
| Doctores | → | Especialidades | Validar especialidad |
| Doctores | → | Programación | Gestionar espacios |
| Administración | → | Todos los servicios | Agregar métricas |
| Reportes | → | Citas | Generar reportes |
| Reportes | → | Doctores | Datos de desempeño |
| Reportes | → | Usuarios | Análítica de usuarios |
| Chat | ⟷ | Ninguno | Microservicio independiente |

## Selecciones Tecnológicas

### ¿Por qué NestJS para Backend?

```
Requisitos:
✓ Framework Node.js escalable
✓ Soporte para TypeScript
✓ Arquitectura modular incorporada
✓ Inyección de dependencias
✓ Configuración basada en decoradores
✓ Validación incorporada
✓ Integración Swagger/OpenAPI
✓ Comunidad fuerte

NestJS proporciona:
├─ @Module() para encapsulación
├─ @Controller() para endpoints
├─ @Injectable() para servicios
├─ Guardias para autenticación
├─ Interceptores para aspectos
├─ Middleware
└─ Filtros de excepción
```

### ¿Por qué Go para Servicio de Chat?

```
Requisitos:
✓ Soporte para alta concurrencia
✓ Manejo de WebSocket en tiempo real
✓ Bajo consumo de memoria
✓ Compilación rápida
✓ Ideal para microservicio

Go proporciona:
├─ Goroutines (concurrencia ligera)
├─ Framework Echo (mínimo, rápido)
├─ Soporte WebSocket incorporado
├─ Compilación a binario estático
├─ Fácil despliegue
└─ Excelente para cargas I/O
```

### ¿Por qué MongoDB?

```
Requisitos:
✓ Datos semi-estructurados (esquema flexible)
✓ Escalabilidad horizontal
✓ Consultas de agregación en tiempo real
✓ Buena para datos de citas/espacios

MongoDB proporciona:
├─ Almacenamiento basado en documentos
├─ Evolución de esquema flexible
├─ Framework de agregación incorporado
├─ Replicación y sharding
├─ Excelentes herramientas
└─ Mongoose ODM para Node.js
```

### ¿Por qué React + Vue?

```
React (Frontend):
├─ Basado en componentes
├─ Context API para estado
├─ Ecosistema grande
├─ Excelente para interfaz
└─ SEO-friendly

Vue (Admin):
├─ Curva de aprendizaje facilidad
├─ Composition API
├─ Tamaño de bundle menores
├─ Excelente para herramientas
└─ Desempeño óptimo
```

## Estrategia de Escalabilidad

### Escalado Horizontal

**Replicación de Servicio Backend:**

```
                    ┌─ Balanceador ─┐
                    │ (nginx/HA)    │
                    └────────┬──────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
    ┌───▼──────┐         ┌──▼──────┐         ┌──▼──────┐
    │ Backend  │         │ Backend │         │ Backend │
    │Instancia1│         │Instancia2         │Instancia3
    │ :3001    │         │ :3002   │         │ :3003   │
    └──┬───────┘         └─┬────────┘         └─┬───────┘
       │                   │                    │
       └───────────────────┼────────────────────┘
                           │
                 ┌─────────▼──────────┐
                 │  Conjunto de Réplica
                 │   MongoDB/Cluster
                 └────────────────────┘
```

**Despliegue Frontend/Admin:**

```
CDN Tradicional:
┌──────────────────────────────┐
│ CloudFront / Cloudflare      │
│ ├─ Ubicaciones globales      │
│ └─ Cacha de recursos estáticos
└──────────────────┬───────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
    ┌───▼──┐   ┌──▼──┐   ┌──▼──┐
    │ UE   │   │USA  │   │ASIA │
    │Edge  │   │Edge │   │Edge │
    └──────┘   └─────┘   └─────┘
```

**Escalado de Microservicio de Chat:**

```
Múltiples Instancias:
                    ┌───────────────┐
                    │Balanceador    │
                    │(para WS)      │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
    ┌───▼────┐          ┌──▼──┐          ┌───▼──┐
    │ Chat   │          │Chat │          │Chat  │
    │Server1 │          │S2   │          │ S3   │
    │ :8001  │          │:8002│          │:8003 │
    └────────┘          └─────┘          └──────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                  ┌─────────▼────────┐
                  │Cola de Mensaje   │
                  │(RabbitMQ/Redis)  │
                  └──────────────────┘
```

### Escalado Vertical

- Aumentar recursos de servidor (CPU, RAM)
- Optimización de base de datos (indexación, optimización)
- Implementar caché (Redis)
- Optimización de código

### Escalado de Base de Datos

**Replicación de MongoDB:**
```
Nodo Principal (Lectura/Escritura)
    ├─ Nodo Secundario 1 (Lectura)
    ├─ Nodo Secundario 2 (Lectura)
    └─ Nodo Árbitro (Solo votación)
```

**Estrategia de Sharding:**
```
Colecciones a fragmentar:
├─ Citas (por doctorId o fecha)
├─ Usuarios (por userId)
└─ Doctores (por especialidad)

Sin fragmentar:
└─ Especialidades (colección pequeña)
```

## Alta Disponibilidad

### Redundancia

```
Redundancia de Aplicación:
├─ Múltiples instancias backend
├─ Balanceo de carga (activo-activo)
└─ Capacidad de failover automático

Redundancia de BD:
├─ Conjuntos de réplica (3+ nodos)
├─ Arquitectura Primario/Secundario
├─ Failover automático
└─ Snapshots de backup

Redundancia de Caché:
├─ Sentinel de Redis
├─ Replicación Maestro/Esclavo
└─ Failover automático
```

### Recuperación ante Desastres

```
RTO (Objetivo de Tiempo de Recuperación): < 15 minutos
RPO (Objetivo de Punto de Recuperación): < 5 minutos

Estrategia de Backup:
├─ Backups completos diarios
├─ Backups incrementales cada hora
├─ Retención: 30 días
├─ Ubicación: Off-site (S3)
└─ Prueba: Restauración semanal
```

### Monitoreo y Alertas

```
Métricas a Monitorear:
├─ Tiempo de Respuesta API (objetivo: < 200ms)
├─ Tiempo de Consulta BD (objetivo: < 100ms)
├─ Tasa de Error (objetivo: < 0.1%)
├─ Uso CPU (alerta: > 80%)
├─ Uso Memoria (alerta: > 85%)
├─ Espacio Disco (alerta: > 80%)
└─ Conexiones WebSocket (seguimiento)

Canales de Alerta:
├─ Email (crítica)
├─ Slack (alta)
├─ PagerDuty (crítica)
└─ SMS (crítica + on-call)
```

## Arquitectura de Seguridad

### Autenticación y Autorización

```
Autenticación de Usuario:
1. Credenciales → Hash → Comparar (bcrypt)
2. Exitosa → Emitir token JWT
3. Token contiene: {userId, role, exp}
4. Solicitudes posteriores incluyen token

Autorización:
├─ Rutas protegidas por Guardias
├─ @UseGuards(AuthUserGuard)
├─ @UseGuards(AuthAdminGuard)
└─ @UseGuards(AuthDoctorGuard)
```

### Seguridad de Datos

```
En Tránsito:
├─ Encriptación HTTPS/TLS
├─ WSS (WebSocket Seguro)
└─ Suite de cifras fuerte

En Reposo:
├─ Encriptación de base de datos
├─ Variables de entorno encriptadas
├─ Gestión de secretos (Vault)
└─ Claves de API seguras
```

### Seguridad de API

```
Limitación de Velocidad:
├─ Por IP: 100 solicitudes/minuto
├─ Por usuario: 1000 solicitudes/hora
└─ Por endpoint: adaptativo

Configuración CORS:
├─ Frontend: http://localhost:5173
├─ Admin: http://localhost:5174
├─ Chat: ws://localhost:8080
└─ Producción: dominios exactos

Validación de Entrada:
├─ Validación DTO
├─ Validación formato email
├─ Validación número teléfono
├─ Prevención XSS
└─ Prevención inyección SQL
```

## Consideraciones de Desempeño

### Estrategia de Caché

```
Caché Frontend:
├─ Caché navegador (recursos, contenido estático)
├─ Caché de Service Worker
└─ Caché de aplicación (estado Context API)

Caché Backend (Futuro):
├─ Redis para datos accedidos frecuentemente
├─ Caché lista de doctores (invalidar en cambio)
├─ Caché especialidades (rara vez cambia)
└─ Caché perfil usuario (TTL 10 minutos)

Caché CDN:
├─ Recursos estáticos (imágenes, JS, CSS)
├─ Documentos médicos
└─ Fotos de perfil de doctores
```

### Optimización de Consultas

```
Índices de Base de Datos:
├─ Usuarios: { email: 1 }, { createdAt: -1 }
├─ Doctores: { speciality: 1 }, { fees: 1 }
├─ Citas: { userId: 1 }, { doctorId: 1 }
└─ Composición: { doctorId: 1, slotDate: 1 }

Patrones de Consulta:
├─ Usar proyección para seleccionar solo campos necesarios
├─ Paginación para conjunto grande
├─ Carga perezosa de datos relacionados
└─ Agregación en reportes
```

### Optimización Frontend

```
División de Código:
├─ División basada en ruta (React.lazy)
├─ Carga perezosa a nivel componente
├─ Importaciones dinámicas para utilidades
└─ Bundles separados para admin/paciente

Optimización de Recursos:
├─ Optimización de imagen (formato WebP)
├─ Minificación y compresión
├─ Tree shaking para código no usado
└─ Compresión Gzip para respuestas
```

## Extensibilidad Futura

### Mejoras Potenciales

1. **Arquitectura Impulsada por Eventos**
   - Migrar a colas de mensajes (RabbitMQ, Kafka)
   - Desacoplamiento adicional de servicios
   - Notificaciones en tiempo real

2. **Servicios Adicionales**
   ```
   Servicio de Pago (separado)
   ├─ Integración de Stripe
   └─ Gestión de transacciones independiente

   Servicio de Notificación
   ├─ Notificaciones por email
   ├─ Notificaciones SMS (Twilio)
   ├─ Notificaciones push
   └─ Notificaciones en app

   Servicio de Análisis
   ├─ Seguimiento de comportamiento
   ├─ Métricas de desempeño
   └─ Inteligencia de negocio
   ```

3. **Capa GraphQL**
   - Endpoint GraphQL junto con REST
   - Integración Apollo Server
   - Optimización de consultas

4. **Integración de Machine Learning**
   - Engine de recomendación de doctor
   - Predicción de demanda
   - Predicción de no-presentación

5. **Blockchain (Opcional)**
   - Verificación de registro médico
   - Verificación de cita
   - Verificación de pago

### Hoja de Ruta de Migración

```
Fase 1 (Actual): Monolito + Microservicios
├─ Backend único + Microservicio de chat
└─ Llamadas directas de servicio

Fase 2 (6 meses): Arquitectura Impulsada por Eventos
├─ Implementación de cola de mensajes
├─ Procesamiento asíncrono
└─ Event sourcing para operaciones críticas

Fase 3 (12 meses): Migración a Microservicios
├─ Separar Servicio de Autenticación
├─ Separar Servicio de Pagos
├─ Separar Servicio de Notificaciones
└─ Integración de malla de servicios (opcional)

Fase 4 (18+ meses): Características Avanzadas
├─ Integración IA/ML
├─ Análisis avanzado
├─ Servicios de app móvil
└─ Integración IoT (wearables)
```

---

**Versión del Documento**: 1.0.0  
**Última Actualización**: Abril 2026  
**Madurez de Arquitectura**: Listo para Producción  
**Cumplimiento de SOA**: Alto
