import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyError, FastifyInstance } from 'fastify';
import { captureException } from '@sentry/node';
import { buildApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import type { ErrorReply } from '../src/shared/contracts/error.js';

// env.js se mockea para poder alternar NODE_ENV y SENTRY_DSN entre tests
vi.mock('../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'development',
    LOG_LEVEL: 'silent',
    SENTRY_DSN: undefined,
    PORT: 3000,
  },
}));

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
}));

describe('setErrorHandler global', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    env.NODE_ENV = 'development';
    env.SENTRY_DSN = undefined;

    app = buildApp();

    // Rutas de prueba locales: no tocan el código de producción
    app.get('/boom', async (): Promise<never> => {
      throw new Error('boom');
    });

    app.get('/teapot', async (): Promise<never> => {
      const err: FastifyError = Object.assign(new Error('I am a teapot'), {
        statusCode: 418,
        code: 'ERR_TEAPOT',
      });
      throw err;
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('500 en dev: responde 500 con el mensaje real', async () => {
    const res = await app.inject({ method: 'GET', url: '/boom' });

    expect(res.statusCode).toBe(500);
    expect(res.json<ErrorReply>()).toEqual({ error: { message: 'boom' } });
  });

  it('propaga el statusCode del error (4xx)', async () => {
    const res = await app.inject({ method: 'GET', url: '/teapot' });

    expect(res.statusCode).toBe(418);
    expect(res.json<ErrorReply>()).toEqual({
      error: { message: 'I am a teapot' },
    });
  });

  it('500 en producción: mensaje genérico, sin filtrar detalles internos', async () => {
    env.NODE_ENV = 'production';

    const res = await app.inject({ method: 'GET', url: '/boom' });

    expect(res.statusCode).toBe(500);
    expect(res.json<ErrorReply>()).toEqual({
      error: { message: 'Internal Server Error' },
    });
  });

  it('Sentry solo se notifica cuando hay SENTRY_DSN', async () => {
    env.SENTRY_DSN = 'https://fake@fake.ingest.sentry.io/123';
    await app.inject({ method: 'GET', url: '/boom' });
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(expect.any(Error));

    vi.clearAllMocks();
    env.SENTRY_DSN = undefined;
    await app.inject({ method: 'GET', url: '/boom' });
    expect(captureException).not.toHaveBeenCalled();
  });
});
