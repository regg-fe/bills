import { describe, expect, it } from 'vitest';
import { buildPostgresUrl } from '../scripts/make-db-url.mjs';

describe('buildPostgresUrl', () => {
  it('no altera valores sin caracteres reservados (defaults de dev)', () => {
    expect(buildPostgresUrl()).toBe(
      'postgres://postgres:postgres@postgres:5432/bills_db?sslmode=disable',
    );
  });

  it('percent-encodea cada carácter reservado del password (@ : / ? # %)', () => {
    const url = buildPostgresUrl({ password: 'S3cr3t@2026:P/a?b#c%d' });
    expect(url).toContain(':S3cr3t%402026%3AP%2Fa%3Fb%23c%25d@postgres:');
    // Redondeo: la URL decodifica al password original
    expect(decodeURIComponent(new URL(url).password)).toBe('S3cr3t@2026:P/a?b#c%d');
  });

  it('codifica también el usuario', () => {
    const url = buildPostgresUrl({ user: 'usuario@dominio' });
    expect(url).toContain('usuario%40dominio:');
  });

  it('respeta host, puerto, database y sslmode', () => {
    const url = buildPostgresUrl({
      host: 'localhost',
      port: '6432',
      database: 'prod',
      sslmode: 'require',
    });
    expect(url).toBe('postgres://postgres:postgres@localhost:6432/prod?sslmode=require');
  });
});
