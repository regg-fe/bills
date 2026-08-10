// Declaración de tipos para scripts/make-db-url.mjs (imports desde TS).
export interface PostgresUrlOptions {
  user?: string;
  password?: string;
  database?: string;
  host?: string;
  port?: string;
  sslmode?: string;
}

export function buildPostgresUrl(options?: PostgresUrlOptions): string;
