import { afterAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { HealthzReply } from '../src/shared/contracts/health.js';

describe('GET /healthz', () => {
  const app: FastifyInstance = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it('debería responder 200 con { status: "ok" }', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });

    expect(res.statusCode).toBe(200);
    expect(res.json<HealthzReply>()).toEqual({ status: 'ok' });
  });
});
