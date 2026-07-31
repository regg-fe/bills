import { env } from './config/env.js';

console.log(`Bills API — ${env.NODE_ENV} — listening on port ${env.PORT}`);