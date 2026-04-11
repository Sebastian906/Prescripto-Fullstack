-- ============================================================
-- Prescripto — PostgreSQL DDL
-- Generado desde esquemas MongoDB (Mongoose)
-- ============================================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- Origen: users.schema.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id        VARCHAR(24) UNIQUE NOT NULL,      -- _id original de Mongo
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password        TEXT        NOT NULL DEFAULT '',
    image           TEXT        NOT NULL DEFAULT '',
    address_line1   VARCHAR(500) NOT NULL DEFAULT '',
    address_line2   VARCHAR(500) NOT NULL DEFAULT '',
    gender          VARCHAR(50)  NOT NULL DEFAULT 'Not Selected',
    dob             VARCHAR(20)  NOT NULL DEFAULT 'Not Selected',
    phone           VARCHAR(30)  NOT NULL DEFAULT '0000000000',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email   ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_mongo_id ON users(mongo_id);

-- ============================================================
-- SPECIALITIES
-- Origen: speciality.schema.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS specialities (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id        VARCHAR(24) UNIQUE NOT NULL,
    name            VARCHAR(255) UNIQUE NOT NULL,
    slug            VARCHAR(255) UNIQUE NOT NULL,
    parent_mongo_id VARCHAR(24)  DEFAULT NULL,        -- resuelto post-migración
    parent_id       UUID         DEFAULT NULL REFERENCES specialities(id),
    description     TEXT         NOT NULL DEFAULT '',
    icon_url        TEXT         NOT NULL DEFAULT '',
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_specialities_slug      ON specialities(slug);
CREATE INDEX IF NOT EXISTS idx_specialities_parent_id ON specialities(parent_id);
CREATE INDEX IF NOT EXISTS idx_specialities_mongo_id  ON specialities(mongo_id);

-- ============================================================
-- DOCTORS
-- Origen: doctor.schema.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS doctors (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id        VARCHAR(24) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password        TEXT        NOT NULL,
    image           TEXT        NOT NULL DEFAULT '',
    speciality_name VARCHAR(255) NOT NULL,            -- snapshot del nombre (desnormalizado)
    speciality_id   UUID        REFERENCES specialities(id),
    degree          VARCHAR(255) NOT NULL,
    experience      VARCHAR(50)  NOT NULL,
    about           TEXT         NOT NULL,
    available       BOOLEAN      NOT NULL DEFAULT TRUE,
    fees            NUMERIC(10,2) NOT NULL DEFAULT 0,
    address_line1   VARCHAR(500)  NOT NULL DEFAULT '',
    address_line2   VARCHAR(500)  NOT NULL DEFAULT '',
    date            BIGINT        NOT NULL DEFAULT 0,  -- timestamp original Unix
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctors_email        ON doctors(email);
CREATE INDEX IF NOT EXISTS idx_doctors_speciality   ON doctors(speciality_id);
CREATE INDEX IF NOT EXISTS idx_doctors_mongo_id     ON doctors(mongo_id);

-- ============================================================
-- DOCTOR_SLOTS_BOOKED
-- Normaliza slots_booked: Record<string, string[]>
-- Origen: campo slots_booked de doctor.schema.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS doctor_slots_booked (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id   UUID        NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    slot_date   VARCHAR(20)  NOT NULL,    -- formato: "15/7/2025"
    slot_time   VARCHAR(20)  NOT NULL,    -- formato: "10:00 AM"
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(doctor_id, slot_date, slot_time)
);

CREATE INDEX IF NOT EXISTS idx_slots_doctor_date ON doctor_slots_booked(doctor_id, slot_date);

-- ============================================================
-- APPOINTMENTS
-- Origen: appointment.schema.ts
-- Nota: user_data y doc_data se almacenan como snapshots JSON
--       para mantener consistencia histórica (igual que en Mongo)
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id        VARCHAR(24) UNIQUE NOT NULL,
    user_id         UUID        REFERENCES users(id),
    doctor_id       UUID        REFERENCES doctors(id),
    user_mongo_id   VARCHAR(24) NOT NULL,              -- referencia original por si el user fue eliminado
    doctor_mongo_id VARCHAR(24) NOT NULL,
    slot_date       VARCHAR(20)  NOT NULL,
    slot_time       VARCHAR(20)  NOT NULL,
    user_data       JSONB        NOT NULL DEFAULT '{}', -- snapshot del usuario al momento de la reserva
    doc_data        JSONB        NOT NULL DEFAULT '{}', -- snapshot del doctor al momento de la reserva
    amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
    date_ts         BIGINT        NOT NULL DEFAULT 0,   -- timestamp Unix original
    cancelled       BOOLEAN       NOT NULL DEFAULT FALSE,
    payment         BOOLEAN       NOT NULL DEFAULT FALSE,
    is_completed    BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id   ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_mongo_id  ON appointments(mongo_id);
CREATE INDEX IF NOT EXISTS idx_appointments_slot      ON appointments(slot_date, slot_time);

-- ============================================================
-- MONTHLY_STATS
-- Origen: monthly-stats.schema.ts  (DP tabulación)
-- Clave compuesta: (doc_id_ref, year, month)
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_stats (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id                VARCHAR(24) UNIQUE NOT NULL,
    doc_id_ref              VARCHAR(50)  NOT NULL,   -- puede ser '__global__' o un mongo_id
    year                    SMALLINT     NOT NULL,
    month                   SMALLINT     NOT NULL CHECK (month BETWEEN 1 AND 12),
    total_appointments      INTEGER      NOT NULL DEFAULT 0,
    completed_appointments  INTEGER      NOT NULL DEFAULT 0,
    cancelled_appointments  INTEGER      NOT NULL DEFAULT 0,
    earnings                NUMERIC(12,2) NOT NULL DEFAULT 0,
    unique_patients         INTEGER      NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(doc_id_ref, year, month)
);

CREATE INDEX IF NOT EXISTS idx_stats_doc_year  ON monthly_stats(doc_id_ref, year);
CREATE INDEX IF NOT EXISTS idx_stats_mongo_id  ON monthly_stats(mongo_id);

-- ============================================================
-- MONTHLY_STATS_PATIENTS
-- Normaliza uniquePatientIds: string[]
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_stats_patients (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    stats_id    UUID        NOT NULL REFERENCES monthly_stats(id) ON DELETE CASCADE,
    patient_id  VARCHAR(50)  NOT NULL,               -- mongo_id del paciente
    UNIQUE(stats_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_stats_patients_stats_id ON monthly_stats_patients(stats_id);

-- ============================================================
-- PASSWORD_RESET_TOKENS
-- Origen: password-reset-token.schema.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id    VARCHAR(24) UNIQUE NOT NULL,
    user_id     VARCHAR(50)  NOT NULL,               -- puede ser 'admin' o un mongo_id
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('user', 'doctor', 'admin')),
    token_hash  TEXT         NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    used        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_mongo_id   ON password_reset_tokens(mongo_id);

-- ============================================================
-- CONVERSATIONS
-- Origen: colección 'conversations' (chat service)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id    VARCHAR(24) UNIQUE NOT NULL,
    user_id     VARCHAR(50)  NOT NULL DEFAULT '',    -- mongo_id del user
    status      VARCHAR(30)  NOT NULL DEFAULT 'open',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id  ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_mongo_id ON conversations(mongo_id);

-- ============================================================
-- CONVERSATION_MESSAGES
-- Origen: mensajes dentro de la colección conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_messages (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id        VARCHAR(24) UNIQUE,              -- nullable si no existe en Mongo
    conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender          VARCHAR(20)  NOT NULL,            -- 'user', 'bot', 'admin'
    content         TEXT         NOT NULL DEFAULT '',
    options         JSONB        NOT NULL DEFAULT '[]',
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_id  ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_mongo_id ON conversation_messages(mongo_id);
