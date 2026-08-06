import { initSentry } from './observability/sentry.js';
import { env } from './config/env.js';

// initSentry ANTES de importar app.js: la instrumentación de Fastify y sus
// dependencias se registra después de Sentry.init (obs CodeRabbit #5).
initSentry();

const { buildApp } = await import('./app.js');
const app = buildApp();

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
} catch (err) {
  // Falla de arranque (p. ej. puerto ocupado): error dentro del pipeline pino,
  // reportado a Sentry si hay DSN, y salida con código no-cero.
  app.log.error(err);
  if (env.SENTRY_DSN) {
    const { captureException } = await import('@sentry/node');
    captureException(err);
  }
  process.exit(1);
}
