-- migrate:up

-- 1.3 Auditoría CodeRabbit (PR #64) — correcciones de esquema
-- 1) FK faltante: exchange_rates.org_id -> organizations(id) (obs #4)
ALTER TABLE exchange_rates
  ADD CONSTRAINT exchange_rates_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 2) Rename: base_currency_id -> base_currency_code (obs #5).
--    Guarda un CHAR(3) ISO-4217 (código), no un UUID; alinea con base/quote de exchange_rates.
ALTER TABLE organizations RENAME COLUMN base_currency_id TO base_currency_code;

-- 3) updated_at automático (obs #6): trigger compartido BEFORE UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4) Índice único de email: excluye soft-deleted (obs #7).
--    Antes bloqueaba el re-registro del email tras un soft-delete.
DROP INDEX users_email_lower_uidx;
CREATE UNIQUE INDEX users_email_lower_uidx
  ON users (lower(email)) WHERE deleted_at IS NULL;

-- 5) RLS en exchange_rates (obs #9b): misma postura de aislamiento multi-org
--    que el resto de tablas (policies se definen en 1.13).
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Aclaratoria obs #8 (re-invite de invitations):
-- El índice parcial de invitations solo evalúa `accepted_at IS NULL`, por lo que
-- NO libera el email automáticamente al vencer (now() no es IMMUTABLE para predicados).
-- Contrato de Capa 2: el re-invite renueva la fila pendiente vía upsert
--   INSERT ... ON CONFLICT (org_id, lower(email)) WHERE accepted_at IS NULL
--   DO UPDATE SET token_hash, expires_at, created_at
-- y el email solo se libera al aceptar (accepted_at NOT NULL).

-- migrate:down

ALTER TABLE exchange_rates DISABLE ROW LEVEL SECURITY;

DROP INDEX users_email_lower_uidx;
CREATE UNIQUE INDEX users_email_lower_uidx ON users (lower(email));

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
DROP TRIGGER IF EXISTS organizations_set_updated_at ON organizations;
DROP FUNCTION IF EXISTS set_updated_at();

ALTER TABLE organizations RENAME COLUMN base_currency_code TO base_currency_id;

ALTER TABLE exchange_rates DROP CONSTRAINT IF EXISTS exchange_rates_org_id_fkey;
