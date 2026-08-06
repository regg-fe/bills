-- migrate:up

-- ENUM: menú cerrado para roles (el sistema rechaza cualquier otro valor)
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- organizations: la "empresa/espacio" del cliente
CREATE TABLE organizations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 255),
  base_currency_id CHAR(3) NOT NULL REFERENCES currencies(code),  -- FK → tabla 1.1
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- users: identidad GLOBAL (sin org_id a propósito — pertenece a orgs vía memberships)
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT NOT NULL,
  password_hash     TEXT NOT NULL,                 -- nunca la contraseña; solo su hash
  totp_secret       TEXT,                          -- se cifrará en Capa 2 (S3 de auditoría)
  totp_enabled      BOOLEAN NOT NULL DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ,                   -- soft-delete (Rb3): papelera, no trituradora
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice único + normalizado: rapidez Y anti-duplicados case-insensitive
CREATE UNIQUE INDEX users_email_lower_uidx ON users (lower(email));

-- memberships: el "puente" org ↔ user (qué usuario pertenece a qué org, con qué rol)
CREATE TABLE memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'member',
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT memberships_org_user_uq UNIQUE (org_id, user_id)  -- 1 persona, 1 vez, por org
);
CREATE INDEX memberships_user_id_idx ON memberships (user_id);

-- invitations: invitaciones pendientes (email puede no tener cuenta aún)
CREATE TABLE invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'member',
  token_hash  CHAR(64) NOT NULL,      -- huella SHA-256 del token (S1): la llave NO vive en la BD
  expires_at  TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)     -- coherencia de vigencia
);
CREATE UNIQUE INDEX invitations_token_hash_uidx ON invitations (token_hash);
-- Índice PARCIAL: solo 1 invitación PENDIENTE por (org, email); al aceptar/vencer se libera (Rb1)
CREATE UNIQUE INDEX invitations_org_email_uidx
  ON invitations (org_id, lower(email)) WHERE accepted_at IS NULL;
CREATE INDEX invitations_org_id_idx ON invitations (org_id);

-- RLS: el "conserje" de cada tabla. Sin policies aún (se definen en 1.13).
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations   ENABLE ROW LEVEL SECURITY;

-- migrate:down

DROP TABLE IF EXISTS invitations;
DROP TABLE IF EXISTS memberships;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;
DROP TYPE IF EXISTS user_role;
