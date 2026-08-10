#!/usr/bin/env node
// Genera la DATABASE_URL de PostgreSQL con percent-encoding en usuario y
// password (obs CodeRabbit #2): caracteres como @ : / ? # % rompen la URL si
// se interpolan crudos (el parser cree que empieza el host, el path, la query…).
//
// Uso:
//   pnpm db:url                                    → defaults de dev (dbmate)
//   POSTGRES_PASSWORD="S3cr3t@2026" pnpm db:url    → postgres://postgres:S3cr3t%402026@postgres:5432/bills_db?sslmode=disable
//   POSTGRES_HOST=localhost POSTGRES_PORT=6432 pnpm db:url   → URL para la app (PgBouncer)
//
// Lee POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB / POSTGRES_HOST /
// POSTGRES_PORT / PGSSLMODE del entorno con los mismos defaults que
// docker-compose.yml.
import { pathToFileURL } from 'node:url';

const DEFAULTS = {
  user: 'postgres',
  password: 'postgres',
  database: 'bills_db',
  host: 'postgres',
  port: '5432',
  sslmode: 'disable',
};

/**
 * Arma una connection string de PostgreSQL codificando usuario y password con
 * encodeURIComponent. Verifica el redondeo: la URL debe decodificar al
 * password original — si no, lanza en vez de devolver una URL rota.
 */
export function buildPostgresUrl({
  user = DEFAULTS.user,
  password = DEFAULTS.password,
  database = DEFAULTS.database,
  host = DEFAULTS.host,
  port = DEFAULTS.port,
  sslmode = DEFAULTS.sslmode,
} = {}) {
  const url = `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?sslmode=${sslmode}`;

  const parsed = new URL(url);
  if (decodeURIComponent(parsed.password) !== password) {
    throw new Error(`El password no sobrevive el redondeo de la URL: ${password}`);
  }
  return url;
}

function main() {
  const url = buildPostgresUrl({
    user: process.env.POSTGRES_USER ?? DEFAULTS.user,
    password: process.env.POSTGRES_PASSWORD ?? DEFAULTS.password,
    database: process.env.POSTGRES_DB ?? DEFAULTS.database,
    host: process.env.POSTGRES_HOST ?? DEFAULTS.host,
    port: process.env.POSTGRES_PORT ?? DEFAULTS.port,
    sslmode: process.env.PGSSLMODE ?? DEFAULTS.sslmode,
  });
  console.log(url);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
