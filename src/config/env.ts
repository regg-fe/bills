import { z } from 'zod';

const envSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Database & Cache
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  REDIS_URL: z.string().min(1, 'REDIS_URL es obligatoria'),

  // Auth JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres'),

  // S3 (MinIO local / Tigris / R2)
  S3_ENDPOINT: z.string().url('S3_ENDPOINT debe ser una URL válida'),
  S3_BUCKET: z.string().min(1, 'S3_BUCKET es obligatoria'),
  S3_ACCESS_KEY: z.string().min(1, 'S3_ACCESS_KEY es obligatoria'),
  S3_SECRET_KEY: z.string().min(1, 'S3_SECRET_KEY es obligatoria'),
  S3_REGION: z.string().min(1, 'S3_REGION es obligatoria').default('us-east-1'),
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),

  // Email (opcional en dev — Mailpit)
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().min(1, 'SMTP_HOST es obligatoria').default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),

  // Observabilidad
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  // Opcional MVP
  VAULT_ADDR: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas o faltantes:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
