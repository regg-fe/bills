import { initSentry } from './observability/sentry.js';
import { buildApp } from './app.js';
import { env } from './config/env.js';

initSentry(); // antes de construir la app: captura incluso errores de bootstrap

const app = buildApp();

await app.listen({ port: env.PORT, host: '0.0.0.0' });
