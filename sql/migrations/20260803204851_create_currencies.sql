-- migrate:up

-- 1.1 currencies: catálogo ISO-4217 (fuente de verdad para FKs de moneda)
CREATE TABLE currencies (
  code      CHAR(3) PRIMARY KEY,        -- ISO-4217: EUR, USD, MXN...
  name      TEXT NOT NULL,              -- Euro, Dólar estadounidense...
  symbol    TEXT NOT NULL,              -- €, $...
  decimals  SMALLINT NOT NULL DEFAULT 2 CHECK (decimals BETWEEN 0 AND 8),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 1.1 exchange_rates: tasas GLOBALES (org_id NULL) + overrides por org
CREATE TYPE exchange_rate_source AS ENUM ('api', 'manual', 'override');

CREATE TABLE exchange_rates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID,                      -- NULL = tasa global (ingesta diaria); no NULL = override de la org
  base       CHAR(3) NOT NULL REFERENCES currencies(code),
  quote      CHAR(3) NOT NULL REFERENCES currencies(code),
  rate       NUMERIC(18,6) NOT NULL CHECK (rate > 0),
  rate_date  DATE NOT NULL,
  source     exchange_rate_source NOT NULL DEFAULT 'api',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (base <> quote)                 -- no tiene sentido EUR→EUR
);

-- Unicidad con NULLs: Postgres trata NULL != NULL, así que usamos índices parciales
-- Global: una sola tasa api/manual por (base, quote, fecha)
CREATE UNIQUE INDEX exchange_rates_global_uidx
  ON exchange_rates (base, quote, rate_date) WHERE org_id IS NULL;
-- Por org: un solo override por (org, base, quote, fecha)
CREATE UNIQUE INDEX exchange_rates_org_uidx
  ON exchange_rates (org_id, base, quote, rate_date) WHERE org_id IS NOT NULL;

-- Seed mínimo: las monedas más comunes para que la app pueda crear orgs al instante
INSERT INTO currencies (code, name, symbol, decimals) VALUES
  ('EUR', 'Euro', '€', 2),
  ('USD', 'Dólar estadounidense', '$', 2),
  ('MXN', 'Peso mexicano', '$', 2),
  ('ARS', 'Peso argentino', '$', 2),
  ('COP', 'Peso colombiano', '$', 2),
  ('GBP', 'Libra esterlina', '£', 2);

-- migrate:down

DROP TABLE IF EXISTS exchange_rates;
DROP TYPE IF EXISTS exchange_rate_source;
DROP TABLE IF EXISTS currencies;
