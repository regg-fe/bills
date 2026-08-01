import type { FastifyInstance } from 'fastify';
import type { HealthzReply } from '../shared/contracts/health.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Reply: HealthzReply }>(
    '/healthz',
    async (): Promise<HealthzReply> => ({ status: 'ok' }),
  );
}
