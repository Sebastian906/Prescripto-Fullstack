# Manual de Usuario - Prescripto

## Tabla de Contenidos

- [Introducción](#introducción)
- [Primeros Pasos](#primeros-pasos)
- [Tipos de Usuario](#tipos-de-usuario)
- [Navegación del Sistema](#navegación-del-sistema)
- [Registro y Autenticación](#registro-y-autenticación)
- [Búsqueda y Exploración de Doctores](#búsqueda-y-exploración-de-doctores)
- [Reserva de Citas](#reserva-de-citas)
- [Gestión de Citas](#gestión-de-citas)
- [Soporte por Chat](#soporte-por-chat)
- [Casos de Uso Comunes](#casos-de-uso-comunes)
- [Resolución de Problemas](#resolución-de-problemas)
- [Preguntas Frecuentes](#preguntas-frecuentes)

## Introducción

Bienvenido a Prescripto, un sistema integral de reserva de citas médicas. Este manual te guía a través de todas las funciones y características disponibles para pacientes y profesionales de la salud que utilizan la plataforma.

Prescripto simplifica el proceso de encontrar doctores calificados y programar citas médicas. Ya sea que busques un especialista o necesites un chequeo de rutina, esta plataforma facilita encontrar al profesional de la salud adecuado y reservar tu cita en minutos.

### Qué Puedes Hacer

- Explorar y buscar doctores calificados
- Filtrar por especialidad médica, honorarios y disponibilidad
- Ver perfiles detallados de doctores y sus credenciales
- Reservar citas a horarios convenientes
- Gestionar tu historial de citas
- Comunicarte con administradores a través de chat
- Recibir actualizaciones en tiempo real sobre tus citas

## Primeros Pasos

### Requisitos del Sistema

- Navegador web moderno (Chrome, Firefox, Safari o Edge)
- Conexión activa a internet
- Dirección de correo electrónico para registro y comunicaciones

### Accediendo a la Plataforma

1. Abre tu navegador web
2. Navega a la URL del frontend de Prescripto
3. Verás la pantalla de inicio de sesión/registro

### Compatibilidad del Navegador

Prescripto funciona mejor en:
- Navegadores de escritorio (recomendado)
- Tabletas y navegadores móviles (diseño responsivo optimizado)

## Tipos de Usuario

### Paciente/Cliente
El usuario principal del sistema que:
- Busca doctores
- Reserva citas médicas
- Gestiona el historial de citas
- Recibe comunicaciones de citas
- Accede al soporte por chat

### Doctor
Profesional de la salud que:
- Gestiona su disponibilidad
- Visualiza citas programadas
- Accede a información de pacientes
- Rastrea registros de pagos
- Actualiza su perfil

### Administrador
Gestor del sistema que:
- Supervisa todas las operaciones del sistema
- Gestiona doctores y usuarios
- Genera reportes y análisis
- Maneja configuraciones especializadas
- Proporciona soporte a través de chat

## Navegación del Sistema

### Menú Principal

La navegación principal típicamente incluye:

- **Inicio** - Panel de control/Pantalla de bienvenida
- **Doctores** - Explorar y buscar doctores
- **Mis Citas** - Ver tus citas reservadas
- **Perfil** - Gestionar tu información personal
- **Chat** - Acceder al chat de soporte
- **Cerrar Sesión** - Salir del sistema

### Diseño de la Interfaz

**Barra de Navegación Superior:**
- Logo del sistema (presionável para volver al inicio)
- Funcionalidad de búsqueda
- Selector de idioma
- Menú de usuario con opciones de perfil

**Barra Lateral (Escritorio):**
- Enlaces de navegación
- Acceso rápido a características clave
- Opción de cerrar sesión

**Vista Móvil:**
- Menú hamburguesa para navegación
- Optimizado para pantallas más pequeñas
- Botones amigables con el tacto

![Diagrama de Casos de Uso de Pacientes](./images/patient-case.svg)

## Registro y Autenticación

### Creando Tu Cuenta

**Paso 1: Acceder al Registro**
1. En la pantalla de inicio de sesión, busca el enlace "¿No tienes cuenta?" o "Registrarse"
2. Haz clic para proceder al registro

**Paso 2: Ingresa Información Básica**
- **Nombre Completo**: Tu nombre completo
- **Correo Electrónico**: Dirección de correo activa (usada para iniciar sesión y comunicaciones)
- **Contraseña**: Crea una contraseña segura (mínimo 8 caracteres recomendado)
- **Confirmar Contraseña**: Reingresar tu contraseña

**Paso 3: Completar Registro**
1. Revisa los términos y condiciones
2. Haz clic en "Registrarse" o "Crear Cuenta"
3. Tu cuenta será creada inmediatamente
4. Serás redirigido a la pantalla de inicio de sesión

**Paso 4: Iniciar Sesión**
1. Ingresa tu dirección de correo
2. Ingresa tu contraseña
3. Haz clic en "Iniciar Sesión"
4. Ahora accedes a tu panel de paciente

### Autenticación OAuth

Prescripto también soporta registro rápido usando redes sociales:

**Inicio de Sesión con Google:**
1. Haz clic en "Iniciar sesión con Google"
2. Selecciona tu cuenta de Google
3. Otorga permisos (si se solicita)
4. Tu cuenta es creada e inmediatamente inicia sesión

**Inicio de Sesión con Facebook:**
1. Haz clic en "Iniciar sesión con Facebook"
2. Selecciona tu cuenta de Facebook
3. Otorga permisos
4. Tu cuenta es creada e inmediatamente inicia sesión

**Beneficios de OAuth:**
- Registro rápido sin crear nueva contraseña
- Autenticación segura
- Creación automática de cuenta

### Restableciendo Tu Contraseña

**Si Olvidaste Tu Contraseña:**
1. En la pantalla de inicio de sesión, haz clic en "¿Olvidé mi contraseña?"
2. Ingresa tu dirección de correo registrada
3. Haz clic en "Enviar Enlace de Restablecimiento"
4. Revisa tu correo electrónico para el enlace de restablecimiento
5. Haz clic en el enlace del correo
6. Ingresa tu nueva contraseña
7. Confirma la nueva contraseña
8. Haz clic en "Restablecer Contraseña"
9. Vuelve a iniciar sesión con tu nueva contraseña

**Importante:** Los enlaces de restablecimiento expiran después de 24 horas por seguridad.

### Actualizando Tu Perfil

**Acceder a Configuración de Perfil:**
1. Haz clic en tu menú de usuario (esquina superior derecha)
2. Selecciona "Mi Perfil" o "Configuración de Perfil"

**Actualizar Información Personal:**
- Nombre
- Dirección de correo
- Número de teléfono
- Género
- Fecha de nacimiento
- Dirección (calle/municipio)

**Foto de Perfil:**
1. Haz clic en "Cargar Foto" o "Cambiar Foto"
2. Selecciona imagen de tu dispositivo
3. La imagen se carga y se convierte en tu foto de perfil

**Guardar Cambios:**
Después de realizar actualizaciones, haz clic en "Guardar Cambios" o "Actualizar Perfil"

## Búsqueda y Exploración de Doctores

### Accediendo al Directorio de Doctores

1. Haz clic en "Doctores" en la navegación principal
2. Verás una lista de doctores disponibles
3. Por defecto, se muestran todos los doctores

### Funcionalidad de Búsqueda

**Búsqueda Simple:**
1. Usa la barra de búsqueda en la parte superior
2. Escribe el nombre de un doctor
3. Los resultados se filtran en tiempo real

**Búsqueda por Especialidad:**
1. Busca la sección de filtro "Especialidad"
2. Selecciona de las especialidades médicas disponibles:
   - Cardiología
   - Dermatología
   - Neurología
   - Ortopedia
   - Pediatría
   - Medicina General
   - (y más)
3. La lista se actualiza mostrando doctores coincidentes

### Opciones de Filtrado

**Filtrar por Honorarios:**
1. Ubica la sección de filtro "Honorarios"
2. Ajusta el deslizador de rango de precios
3. Visualiza doctores dentro de tu presupuesto

**Filtrar por Disponibilidad:**
1. Marca el filtro "Disponible Ahora"
2. Solo se muestran doctores con disponibilidad actual

**Combinar Múltiples Filtros:**
Puedes usar múltiples filtros simultáneamente:
- Búsqueda: "especialista del corazón"
- Especialidad: Cardiología
- Honorarios: $50-$100
- Disponible: Sí

Los filtros trabajan juntos para reducir resultados.

### Descripción General del Perfil del Doctor

Al explorar la lista de doctores, ves:
- **Foto del Doctor**: Foto de perfil profesional
- **Nombre**: Nombre completo y credenciales
- **Especialidad**: Campo/especialidad médica
- **Honorarios**: Cantidad de honorario de consulta
- **Calificación**: Calificaciones de pacientes (si disponibles)
- **Disponibilidad**: Estado de disponibilidad actual
- **Botón Ver Perfil**: Haz clic para ver detalles completos

### Viendo el Perfil Completo del Doctor

**Haz clic en "Ver Perfil" para ver:**

**Información Profesional:**
- Nombre completo y credenciales (MD, especialización)
- Especialidad médica
- Años de experiencia
- Antecedentes educativos/título
- Biografía profesional

**Detalles de la Práctica:**
- Honorarios de consulta
- Dirección de la oficina
- Horario de disponibilidad
- Espacios de disponibilidad actuales

**Información Adicional:**
- Sección "Acerca de" (resumen profesional)
- Reseñas de pacientes o calificaciones
- Idiomas que habla

**Botones de Acción:**
- "Reservar Cita" - Proceder a reserva
- "Contactar" - Chat con el doctor (si disponible)
- "Volver a la Lista" - Volver a resultados de búsqueda

### Comparando Doctores

**Para Comparar Múltiples Doctores:**
1. Abre el perfil del primer doctor
2. Anota los honorarios, experiencia y disponibilidad
3. Vuelve a la lista de doctores
4. Abre el perfil de otro doctor
5. Compara la información
6. Elige el doctor que mejor se ajuste a tus necesidades

## Reserva de Citas

### Iniciando el Proceso de Reserva

1. Encuentra tu doctor preferido (usando búsqueda y filtros)
2. Haz clic en "Ver Perfil"
3. En el perfil del doctor, haz clic en "Reservar Cita"
4. Procederás a la forma de reserva de cita

![Diagrama de Flujo de Citas](./images/appointment-flow.svg)
### Paso 1: Seleccionar Fecha de Cita

1. Aparecerá un calendario mostrando fechas disponibles
2. Las fechas con disponibilidad están resaltadas/presionables
3. Haz clic en tu fecha preferida
4. La fecha seleccionada se resalta

**Consejos para Seleccionar Fecha:**
- Solo se pueden seleccionar fechas futuras
- Las fechas sin disponibilidad aparecen atenuadas
- Puedes navegar entre meses usando flechas

### Paso 2: Seleccionar Hora de Cita

1. Después de seleccionar una fecha, aparecen espacios de tiempo disponibles
2. Los espacios de tiempo típicamente son en incrementos de 30 minutos
3. Haz clic en tu horario preferido
4. La hora seleccionada se resalta

**Información de Espacios Horarios:**
- Los espacios verdes/resaltados están disponibles
- Las horas se muestran en tu zona horaria local
- Los espacios populares pueden llenarse rápidamente

### Paso 3: Ingresa Tu Información

Asegúrate de que tus datos personales sean correctos:

**Información del Paciente (Pre-rellenada):**
- Nombre: Tu nombre completo
- Correo: Tu correo registrado
- Teléfono: Tu número de contacto

**Verifica Información:**
1. Confirma que todos los detalles sean correctos
2. Actualiza si alguna información ha cambiado
3. Asegúrate de que el número de teléfono sea actual para notificaciones

### Paso 4: Resumen de Cita

Revisa todos los detalles antes de confirmar:

**Detalles de Cita:**
- Nombre y especialidad del doctor
- Fecha y hora
- Honorarios de consulta
- Duración de la cita (típicamente 30 minutos)
- Costo total

### Paso 5: Pago y Confirmación

**Información de Pago:**
1. Se muestra el método de pago (Stripe)
2. Haz clic en "Proceder al Pago" o "Pagar Ahora"
3. Serás redirigido al portal de pago seguro

**Pago con Tarjeta de Crédito:**
1. Ingresa el número de tarjeta de crédito
2. Ingresa la fecha de vencimiento
3. Ingresa el CVV (código de seguridad de 3 dígitos)
4. Ingresa el nombre del titular y dirección de facturación
5. Haz clic en "Pagar" o "Completar Pago"

**Después del Pago:**
1. El pago se procesa de forma segura
2. Se muestra pantalla de confirmación
3. Se envía correo de confirmación a tu correo registrado
4. Tu cita ahora está reservada

### Confirmación de Reserva

Después de una reserva exitosa:

**Detalles de Confirmación:**
- Número de referencia de cita
- Información del doctor
- Fecha y hora
- Ubicación/dirección
- Código de confirmación
- Recibo de pago

**Correo de Confirmación:**
Recibes un correo electrónico conteniendo:
- Todos los detalles de la cita
- Información de contacto del doctor
- Instrucciones previas a la cita (si las hay)
- Direcciones a la oficina
- Cómo reprogramar o cancelar

## Gestión de Citas

### Accediendo Tus Citas

1. Haz clic en "Mis Citas" en la navegación principal
2. Ves una lista de todas tus citas
3. Las citas están organizadas por estado (próximas, completadas, canceladas)

![Diagrama de Secuencia de Citas](./images/appointment-sequence.svg)
### Estado de Cita

**Próximas:**
- Citas programadas en el futuro
- Muestra fecha, hora e información del doctor

**Completadas:**
- Citas pasadas que han sido completadas
- Incluye fecha y hora de finalización

**Canceladas:**
- Citas que has cancelado
- Muestra fecha de cancelación y motivo

### Detalles de Cita

Haz clic en cualquier cita para ver:
- Información de contacto del doctor
- Fecha y hora de la cita
- Ubicación/dirección de la oficina
- Monto de pago y estado
- Número de referencia de cita
- Cualquier nota de cita

### Reprogramando una Cita

**Para Reprogramar:**
1. Abre tu lista de citas
2. Encuentra la cita a reprogramar
3. Haz clic en botón "Reprogramar"
4. Sigue el mismo proceso de reserva para seleccionar nueva fecha/hora
5. Confirma la nueva cita
6. La cita original se cancela automáticamente

**Importante:** Reprogramar puede requerir pago adicional si los honorarios difieren.

### Cancelando una Cita

**Para Cancelar:**
1. Abre tu lista de citas
2. Encuentra la cita a cancelar
3. Haz clic en "Cancelar Cita"
4. Aparece un diálogo de confirmación
5. Ingresa motivo de cancelación (opcional)
6. Haz clic en "Confirmar Cancelación"

**Después de la Cancelación:**
- El estado de cita cambia a "Cancelada"
- Recibes correo de confirmación de cancelación
- Se aplica política de reembolso (verifica términos del sistema)

**Política de Cancelación:**
- Las citas típicamente pueden cancelarse hasta 24 horas antes
- Las cancelaciones tardías pueden estar sujetas a tarifas
- Las cancelaciones de emergencia pueden tener restricciones

### Recordatorios de Cita

**Recordatorios por Correo:**
- Enviados 24 horas antes de la cita
- Enviados 2 horas antes de la cita

**Notificaciones en la Aplicación:**
- Aparecen cuando inicia sesión
- Muestran citas próximas
- Proporcionan acceso rápido a detalles de cita

## Soporte por Chat

### Tipos de Modos de Chat

Prescripto ofrece dos modos de chat:

![Diagrama de Flujo del Chatbot](./images/chatbot-flow.svg)

### Modo Asistente

**Propósito:** Ayudarte a navegar el sistema y responder preguntas sobre características

**Cuándo Usar:**
- Necesitas ayuda para encontrar doctores
- No estás seguro de cómo usar una característica
- Tienes preguntas generales sobre el sistema
- Necesitas guía a través del proceso de reserva

**Cómo Acceder:**
1. Busca el icono de chat (usualmente esquina inferior derecha)
2. Haz clic para abrir el widget de chat
3. Selecciona "Modo Asistente" o "Obtener Ayuda"
4. Chat con el asistente de IA

**Capacidades del Asistente:**
- Responde preguntas frecuentes
- Te guía a través de características del sistema
- Ayuda con resolución de problemas
- Proporciona consejos y mejores prácticas

### Modo de Soporte (Contactar Administrador)

**Propósito:** Comunicación directa con administradores humanos para problemas específicos

**Cuándo Usar:**
- Necesitas cancelar una cita urgentemente
- Tienes preguntas sobre facturación
- Experimentaste un problema técnico
- Necesitas hablar con un representante humano

**Cómo Acceder:**
1. Abre el widget de chat
2. Selecciona "Contactar Soporte" o "Hablar con Administrador"
3. Tu mensaje va al equipo de soporte
4. Un administrador responderá (típicamente dentro de 24 horas)

**Qué Incluir:**
- Tu nombre completo
- Referencia de cita (si es relevante)
- Descripción detallada de tu problema
- Capturas de pantalla (si aplica)
- Tu método de contacto preferido

### Características del Chat

**Historial de Mensajes:**
- Todas las conversaciones de chat se guardan
- Puedes revisar conversaciones pasadas
- El historial permanece disponible en tu cuenta

**Tiempos de Respuesta:**
- Modo asistente: Inmediato
- Modo soporte: Dentro de horas de negocio (típicamente 24 horas)
- Mensajes prioritarios: Respuesta expedida

**Etiqueta de Chat:**
- Sé respetuoso y claro
- Proporciona información completa
- Un problema por sesión de chat (recomendado)
- Permite tiempo para respuestas

## Casos de Uso Comunes

### Caso de Uso 1: Reservando Tu Primera Cita

**Escenario:** Paciente nuevo queriendo reservar un chequeo cardíaco

**Pasos:**
1. Registra una nueva cuenta usando correo o Google
2. Completa tu perfil con información personal
3. Navega a sección de Doctores
4. Busca o filtra por especialistas en "Cardiología"
5. Revisa perfiles de cardiólogos y honorarios
6. Selecciona un doctor y visualiza perfil completo
7. Haz clic en "Reservar Cita"
8. Selecciona fecha preferida de opciones disponibles
9. Elige horario de cita
10. Revisa tu información (¡crítico!)
11. Procesa pago exitosamente
12. Recibe correo de confirmación
13. Espera la fecha de cita

**Resultado Esperado:** Cita confirmada con cardiólogo con número de referencia en correo

---

### Caso de Uso 2: Reprogramando una Cita

**Escenario:** Necesitas reprogramar tu cita a diferente hora

**Pasos:**
1. Inicia sesión en tu cuenta
2. Haz clic en "Mis Citas"
3. Encuentra la cita a reprogramar
4. Haz clic en "Reprogramar"
5. Selecciona nueva fecha del calendario
6. Elige nuevo espacio horario
7. Revisa cambios
8. Completa pago adicional (si aplica)
9. Confirma reprogramación

**Resultado Esperado:** Cita original cancelada, nueva cita confirmada

---

### Caso de Uso 3: Encontrando un Especialista Asequible

**Escenario:** Buscando un dermatólogo dentro de presupuesto de $60

**Pasos:**
1. Navega a sección de Doctores
2. Usa filtro de Especialidad: Selecciona "Dermatología"
3. Usa filtro de Precio/Honorarios: Rango $0-$60
4. Ver resultados filtrados
5. Haz clic en doctores para ver perfiles
6. Compara experiencia y calificaciones
7. Reserva con tu especialista elegido

**Resultado Esperado:** Cita reservada con dermatólogo asequible

---

### Caso de Uso 4: Problema Urgente Durante Reserva

**Escenario:** Sistema de pago no funciona durante reserva

**Pasos:**
1. Abre el widget de chat (esquina inferior derecha)
2. Selecciona "Contactar Soporte"
3. Explica el problema de pago
4. Proporciona detalles de cita
5. Espera respuesta de administrador
6. Sigue soluciones proporcionadas

**Resultado Esperado:** Problema técnico resuelto, cita reservada exitosamente con asistencia

---

### Caso de Uso 5: Visualizando Historial de Citas

**Escenario:** Necesitas referenciar una cita pasada

**Pasos:**
1. Inicia sesión en cuenta
2. Haz clic en "Mis Citas"
3. Navega a pestañas "Completadas" o "Todas"
4. Haz clic en la cita pasada
5. Visualiza todos los detalles (fecha, doctor, notas)
6. Imprime o guarda información si es necesario

**Resultado Esperado:** Acceso a registros de citas históricas

---

### Caso de Uso 6: Obtener Ayuda del Asistente de IA

**Escenario:** No estás seguro cómo filtrar doctores

**Pasos:**
1. Abre widget de chat
2. Pregunta: "¿Cómo filtro doctores por especialidad?"
3. El asistente proporciona guía paso a paso
4. Sigue instrucciones
5. Filtra doctores exitosamente
6. Cierra chat cuando termines

**Resultado Esperado:** Navegación guiada a través de características del sistema

## Resolución de Problemas

### Problemas Comunes y Soluciones

#### Problema: Olvidé Contraseña

**Problema:** No puedes recordar tu contraseña de inicio de sesión

**Solución:**
1. Haz clic en "¿Olvidé contraseña?" en pantalla de inicio de sesión
2. Ingresa tu correo registrado
3. Revisa tu bandeja de entrada (y carpeta de spam)
4. Haz clic en el enlace de restablecimiento
5. Crea una nueva contraseña
6. Inicia sesión con contraseña nueva

---

#### Problema: Pago Fallido

**Problema:** El pago de tarjeta de crédito fue rechazado

**Posibles Causas:**
- Número de tarjeta incorrecto
- Tarjeta vencida
- Fondos insuficientes
- CVV incorrecto
- Tarjeta bloqueada por banco

**Solución:**
1. Vuelve a página de reserva
2. Verifica que todos los detalles de tarjeta sean correctos
3. Intenta método de pago diferente si está disponible
4. Contacta a tu banco para asegurar que tarjeta está activa
5. Usa chat de soporte para contactar asistencia

---

#### Problema: No Puedo Encontrar Doctor

**Problema:** No puedes ubicar un doctor específico

**Solución:**
1. Usa la barra de búsqueda para buscar por nombre
2. Intenta buscar por especialidad
3. Limpia todos los filtros para ver lista completa de doctores
4. Verifica si el doctor está marcado como no disponible
5. Contacta soporte si crees que el doctor debería estar listado

---

#### Problema: Cita No Confirmada

**Problema:** Después de pago, no aparece confirmación

**Solución:**
1. Espera 5-10 minutos (el sistema puede estar procesando)
2. Recarga la página
3. Revisa tu correo para confirmación
4. Inicia sesión y revisa "Mis Citas"
5. Contacta soporte con tu correo e información de pago

---

#### Problema: No Puedo Actualizar Perfil

**Problema:** Los cambios a información personal no se guardan

**Solución:**
1. Verifica conexión a internet
2. Intenta navegador diferente
3. Limpia caché del navegador
4. Cierra sesión e inicia nuevamente
5. Intenta actualizar un campo a la vez
6. Contacta soporte si el problema persiste

---

#### Problema: Chat No Funciona

**Problema:** No puedes acceder al soporte de chat

**Solución:**
1. Verifica conexión a internet
2. Recarga la página
3. Asegúrate de que el widget de chat sea visible (esquina inferior derecha)
4. Intenta navegador diferente
5. Limpia caché del navegador
6. Contacta soporte directamente por correo si chat no disponible

## Preguntas Frecuentes

### Cuenta y Autenticación

**P: ¿Es seguro crear una cuenta con Google/Facebook?**
R: Sí, la autenticación OAuth es segura e estándar de la industria. No almacenamos tus contraseñas de redes sociales.

**P: ¿Puedo tener múltiples cuentas?**
R: Cada persona debería tener una cuenta. Múltiples cuentas con la misma información pueden ser fusionadas.

**P: ¿Cómo elimino mi cuenta?**
R: Contacta soporte a través de la interfaz de chat. Tus datos se eliminarán según nuestra política de privacidad.

**P: ¿Puedo cambiar mi correo registrado?**
R: Sí, actualízalo en configuración de perfil. Necesitarás verificar el nuevo correo antes de que cambios tomen efecto.

---

### Doctores y Citas

**P: ¿Cuánto tiempo de anticipación puedo reservar una cita?**
R: Típicamente, las citas pueden reservarse hasta 30 días de anticipación, dependiendo de disponibilidad del doctor.

**P: ¿Puedo reservar una cita para otra persona (familiar)?**
R: Actualmente, cada persona debe crear su propia cuenta para reservar citas.

**P: ¿Qué si necesito una cita urgente?**
R: Busca doctores marcados como "Disponible Ahora" o usa chat de soporte para solicitar citas urgentes.

**P: ¿Las horas de cita están garantizadas?**
R: Las citas se confirman basadas en disponibilidad. Los doctores ocasionalmente pueden necesitar reprogramar por emergencias.

---

### Pagos y Honorarios

**P: ¿Qué métodos de pago se aceptan?**
R: Tarjetas de crédito (Visa, MasterCard, American Express) vía Stripe.

**P: ¿Es mi información de pago segura?**
R: Sí, todos los pagos se procesan a través de Stripe con cumplimiento PCI-DSS.

**P: ¿Puedo obtener un reembolso?**
R: Las políticas de reembolso dependen de la configuración del sistema. Verifica los términos o contacta soporte.

**P: ¿Por qué me cobraron si cancelé?**
R: Si cancelaste dentro de la ventana de cancelación, no hay cargo. Si fue afuera, se aplican tarifas de cancelación.

---

### Problemas Técnicos

**P: ¿Qué navegadores son soportados?**
R: Chrome, Firefox, Safari y Edge. Usa la versión más reciente para mejores resultados.

**P: ¿Puedo usar Prescripto en mi teléfono?**
R: Sí, la plataforma es responsiva y funciona en dispositivos móviles.

**P: ¿Qué debo hacer si la página no carga?**
R: Limpia caché del navegador, intenta navegador diferente, o contacta soporte.

**P: ¿Puedo guardar citas como recordatorio?**
R: Los recordatorios de correo se envían automáticamente 24 horas y 2 horas antes de citas.

---

### Soporte y Chat

**P: ¿Cuánto tarda obtener soporte?**
R: El modo asistente es instantáneo. El equipo de soporte típicamente responde dentro de 24 horas.

**P: ¿Puedo solicitar un doctor específico si no está disponible?**
R: Usa chat de soporte para indagar sobre fechas alternativas o recomendaciones de doctores.

**P: ¿Cómo proporciono retroalimentación sobre el sistema?**
R: Usa chat de soporte para enviar retroalimentación. ¡Valoramos tu aporte!

**P: ¿Cuáles son tus horas de soporte?**
R: El modo asistente está disponible 24/7. El equipo de soporte opera durante horas de negocio.

---

### Datos y Privacidad

**P: ¿Cómo son usados mis datos personales?**
R: Tus datos son usados solo para gestión de citas y comunicación. Ver nuestra Política de Privacidad para detalles.

**P: ¿Puedo exportar mi historial de citas?**
R: Contacta soporte para solicitar tus datos en formato estándar.

**P: ¿Mi información médica es almacenada?**
R: Prescripto almacena solo información de contacto y cita, no registros médicos.

---

## Recursos Adicionales

### Obtener Más Ayuda

- **Documentación**: Documentación técnica completa disponible en el sistema
- **Tutoriales en Video**: Disponibles en la sección de ayuda
- **Chat en Vivo**: Accesible 24/7 a través del widget de chat
- **Soporte por Correo**: support@prescripto.com

### Consejos para Mejor Experiencia

1. Mantén tu información de perfil actualizada
2. Usa términos de búsqueda específicos al buscar doctores
3. Habilita notificaciones por correo para recordatorios
4. Marca tus páginas usadas frecuentemente
5. Usa contraseñas fuertes y cámbialas regularmente
6. Refiere amigos para ganar bonos de referencia (si disponible)

---

**Última Actualización:** Abril 2026  
**Versión:** 1.0  
**¿Preguntas o Retroalimentación?** ¡Usa el soporte de chat para decirnos!
