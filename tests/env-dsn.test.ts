import { describe, expect, it } from 'vitest';
import { envSchema } from '../src/config/env.js';

const baseEnv: Record<string, string> = {
  DATABASE_URL: 'postgres://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  S3_ENDPOINT: 'http://localhost:9000',
  S3_BUCKET: 'test',
  S3_ACCESS_KEY: 'test',
  S3_SECRET_KEY: 'test',
};

describe('SENTRY_DSN', () => {
  it.each([
    'https://abc123def456@sentry.io/1234567',
    'https://public@o4500000000000000000.ingest.us.sentry.io/4500000000000000',
    'http://public@localhost:9000/1',
    'https://key:secret@host:443/123',
    'https://key@host/path/123',
  ])('acepta un DSN válido: %s', (dsn) => {
    expect(envSchema.safeParse({ ...baseEnv, SENTRY_DSN: dsn }).success).toBe(true);
  });

  it('acepta el valor vacío (no-op en dev)', () => {
    expect(envSchema.safeParse({ ...baseEnv, SENTRY_DSN: '' }).success).toBe(true);
  });

  it.each([
    'https://example.com', // sin clave pública ni projectId
    'https://clave@host', // sin projectId
    'https://clave@host/abc', // projectId no numérico
    'https://clave@host/abc/def', // segmento final no numérico
    'ftp://clave@host/123', // protocolo no soportado por Sentry
    'no-es-un-dsn', // ni URL ni DSN
  ])('rechaza un DSN inválido: %s', (dsn) => {
    expect(envSchema.safeParse({ ...baseEnv, SENTRY_DSN: dsn }).success).toBe(false);
  });
});
