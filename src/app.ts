import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import * as Sentry from '@sentry/node';
import { env } from './config/env.js';
import { healthRoutes } from './routes/health.js';
import type { ErrorReply } from './shared/contracts/error.js';

export function buildApp(): FastifyInstance {
  const app: FastifyInstance = Fastify({
    logger: { level: env.LOG_LEVEL },
  });

  // Error handler global: ningún error no controlado escapa sin log + respuesta limpia
  app.setErrorHandler(
    async (
      error: FastifyError,
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<void> => {
      request.log.error(error); // siempre: detalle completo en pino (stdout)

      if (env.SENTRY_DSN) {
        Sentry.captureException(error); // solo con DSN: no contamina dev
      }

      const statusCode: number = error.statusCode ?? 500;

      // Seguridad: en prod no filtramos detalles internos del error
      const message: string =
        statusCode >= 500 && env.NODE_ENV === 'production'
          ? 'Internal Server Error'
          : error.message;

      const body: ErrorReply = { error: { message } };
      await reply.status(statusCode).send(body);
    },
  );

  app.register(healthRoutes);
  return app;
}
