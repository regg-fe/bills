import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';

export function initSentry(): void {
  const dsn: string | undefined = env.SENTRY_DSN;
  if (!dsn) {
    return; // sin DSN (dev) → no-op, cero overhead
  }

  Sentry.init({
    dsn,
    environment: env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
