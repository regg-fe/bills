# Bills — SaaS Multi-moneda Multi-tenant

Backend para la gestión de finanzas personales y de organizaciones: gastos e ingresos en múltiples monedas, con aislamiento por organización (multi-tenancy vía RLS), saldos cacheados en tiempo real y procesamiento asíncrono de recalculos, tipos de cambio y recurrencias.

## Resumen

- **Multi-moneda**: cada transacción guarda el monto original y su equivalente en la moneda base de la organización (`amount_base`), con tipos de cambio resueltos por la función SQL `get_rate()` (fallback en 5 pasos).
- **Multi-tenant**: toda tabla lleva `org_id` y políticas RLS (`USING (org_id = current_org_id())`) — el aislamiento lo garantiza PostgreSQL, no el código.
- **Saldos escalables**: los saldos no se calculan en cada lectura — triggers + tabla `account_balance_dirty` + worker BullMQ recalcan solo la cuenta afectada hacia `account_balances_cache` (lectura O(1)).
- **Transferencias reales**: state machine `draft → confirmed → cancelled`, double-entry en `transactions`, desglose de fees por plantilla con override por usuario.
- **Presupuestos y recurrencias**: presupuestos por categoría con alertas por umbral; reglas RRULE (RFC-5545) que generan transacciones pendientes con idempotencia.

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 22 · TypeScript (strict) |
| HTTP | Fastify 5 (plugins, pino integrado) |
| Datos | PostgreSQL 16 + PgBouncer (tx-mode) · Kysely + migraciones SQL |
| Cache / Colas | Redis 7 · BullMQ (prioridades por cola) |
| Validación | Zod (schema de config y contratos) |
| Object Storage | S3 — MinIO local · Tigris/R2 en producción |
| Email | Resend · Mailpit en desarrollo |
| Observabilidad | pino (logs JSON) + Sentry · OTel diferido (fila 3.6) |
| Tests | Vitest (`app.inject`) + Testcontainers (Capa 4) |

## Requisitos

- Node.js ≥ 22
- pnpm ≥ 11
- Docker + Docker Compose

## Inicio rápido (desarrollo)

```bash
# 1. Levantar infraestructura local (Postgres, PgBouncer, Redis, MinIO, Mailpit)
docker compose up -d

# 2. Dependencias
pnpm install

# 3. Configuración: copiar y completar (las claves reales van aquí, nunca al repo)
cp .env.example .env   # Windows: Copy-Item .env.example .env

# 4. Arrancar la API en modo watch
pnpm dev

# 5. Verificar
curl http://localhost:3000/healthz
# → {"status":"ok"}
```

## Deploy

**Pendiente de decisión de plataforma** (candidato: Fly.io). El pipeline CI/CD existe en el repo pero está **deshabilitado** hasta definir el target, momento en el que también se decidirá el flujo de stages (ver `CONTRIBUTING.md`).

Compilación de producción: `pnpm build` (genera los artefactos TypeScript).

## Etapa del desarrollo

**MVP Core — Capa 0 (Fundación):**

| Tarea | Estado |
|---|---|
| 0.1 Repo & Tooling | ✅ Lista |
| 0.2 Docker Compose Dev | ✅ Lista |
| 0.3 CI/CD Base | ⏳ Bloqueada — pendiente decisión de deploy |
| 0.4 Config & Secrets | ✅ Lista |
| 0.5 Observabilidad Base | ✅ Lista — mergeada (#60) |

**Siguiente: Capa 1 — Esquema de BD & migraciones SQL** (org_id + RLS, saldos cache, `get_rate()`).

> El backlog completo vive en `PLAN_MVP_CORE_BILLS.md` (copia local en `docs/`, fuera del control de versiones por decisión del proyecto).

## Arquitectura

Referencias versionadas en este repo (`docs/`):

| Documento | Contenido |
|---|---|
| [Diagramas C4](docs/C4_DIAGRAMS.md) | Nivel 1 contexto, Nivel 2 contenedores (API, PgBouncer, PG, Redis, Worker), Nivel 3 componentes dentro de la API |
| [Diagrama Entidad-Relación](docs/ER_DIAGRAM.md) | Modelo de datos P0 con atributos (montos `NUMERIC(18,6)`, soft-delete, RLS) |

Patrón de cada módulo: **Domain Types (Zod/TypeBox) → Repository (Kysely) → Service → Router (Fastify)** — capas dentro de un monolito modular.

## Scripts

| Script | Descripción |
|---|---|
| `pnpm dev` | Desarrollo con watch (`node --env-file-if-exists=.env`) |
| `pnpm build` | Compilar (`tsc`) |
| `pnpm typecheck` | Chequeo de tipos |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (run) |

Issues y PRs: [github.com/regg-fe/bills](https://github.com/regg-fe/bills)
