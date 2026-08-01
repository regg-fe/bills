# Diagramas C4 - SaaS Multi-moneda Multi-tenant (Backend)

---
## 1. Nivel 1 - Contexto del Sistema

```mermaid
%%{init: {
  'flowchart': { 'curve': 'orthogonal', 'nodeSpacing': 50, 'rankSpacing': 50 },
  'theme': 'base',
  'themeVariables': { 'lineColor': '#64748B' }
}}%%
flowchart TB
    classDef person fill:#0F172A,stroke:#334155,color:#FFFFFF,stroke-width:2px;
    classDef system fill:#4338CA,stroke:#312E81,color:#FFFFFF,stroke-width:2px;
    classDef extSystem fill:#475569,stroke:#334155,color:#FFFFFF,stroke-width:2px;

    user["👤 <b>Usuario final</b><br/><i>[Person]</i><br/>Gestiona gastos/ingresos, ve reportes"]:::person
    admin["👤 <b>Admin de organización</b><br/><i>[Person]</i><br/>Invita miembros, configura moneda base y fees"]:::person

    subgraph SystemBoundary [" Gastos Multi-moneda (System Boundary) "]
        backend["🏛️ <b>Backend System</b><br/><i>[Software System]</i><br/>API, Workers, DB, Cache"]:::system
    end

    bank["🏦 <b>Banco / Broker</b><br/><i>[Ext System]</i>"]:::extSystem
    email["📧 <b>Resend</b><br/><i>[Email Provider]</i>"]:::extSystem
    s3["📦 <b>Tigris / R2</b><br/><i>[Object Storage]</i>"]:::extSystem
    ocr["🔍 <b>OCR Service</b><br/><i>[Tesseract 5 + ONNX · P2 — diferido]</i>"]:::extSystem
    exch["💱 <b>exchangerate.host</b><br/><i>[Rates API]</i>"]:::extSystem

    user -->|HTTPS / REST| backend
    admin -->|HTTPS / REST| backend
    backend -->|HTTP GET rates| bank
    backend -->|SMTP / API| email
    backend -->|S3 API| s3
    backend -->|HTTP POST /extract| ocr
    backend -->|HTTP GET rates| exch
```

> **Nota**: OCR (US-14) está diferido a **P2** — perfil comentado en `docker-compose.yml`.

---
## 2. Nivel 2 - Contenedores

```mermaid
%%{init: {
  'flowchart': { 'curve': 'orthogonal', 'nodeSpacing': 40, 'rankSpacing': 50 },
  'theme': 'base',
  'themeVariables': { 'lineColor': '#64748B' }
}}%%
flowchart TB
    classDef person fill:#0F172A,stroke:#334155,color:#FFFFFF,stroke-width:2px;
    classDef api fill:#4338CA,stroke:#312E81,color:#FFFFFF,stroke-width:2px;
    classDef db fill:#0D9488,stroke:#115E59,color:#FFFFFF,stroke-width:2px;
    classDef cache fill:#D97706,stroke:#92400E,color:#FFFFFF,stroke-width:2px;
    classDef worker fill:#6D28D9,stroke:#4C1D95,color:#FFFFFF,stroke-width:2px;
    classDef extSystem fill:#475569,stroke:#334155,color:#FFFFFF,stroke-width:2px;

    user["👤 <b>Usuario Final / Admin</b>"]:::person

    subgraph Architecture [" 🏛️ Backend System Architecture "]
        api["⚡ <b>API Fastify</b><br/><i>[Node 22 + TypeScript]</i><br/>REST API, Auth Lucia, Validador Zod/TypeBox"]:::api
        db[("🗄️ <b>PostgreSQL 16</b><br/><i>[SQL DB]</i><br/>Tablas transaccionales, RLS, Snapshots")]:::db
        redis[("⚡ <b>Redis 7</b><br/><i>[In-Memory DB]</i><br/>Cache, Rate-limit, Colas BullMQ")]:::cache
        pgbouncer["🚦 <b>PgBouncer</b><br/><i>[tx-mode]</i><br/>Pool de conexiones"]:::db
        worker["⚙️ <b>Worker Genérico</b><br/><i>[Node + BullMQ]</i><br/>Procesa colas: default, import, ocr"]:::worker
    end

    ocrSvc["🔍 <b>OCR Service</b><br/><i>[Docker - FastAPI]</i>"]:::extSystem
    s3["📦 <b>Object Storage</b><br/><i>[Tigris / Cloudflare R2]</i>"]:::extSystem
    email["📧 <b>Email Provider</b><br/><i>[Resend]</i>"]:::extSystem
    obs["📊 <b>Observabilidad</b><br/><i>[OpenTelemetry]</i>"]:::extSystem

    user -->|HTTPS / REST| api
    
    api -->|Conexiones pooled| pgbouncer
    api -->|Redis Client| redis
    api -->|BullMQ Enqueue| worker
    api -->|AWS SDK v3| s3
    api -->|Resend SDK| email
    api -->|OTel Exporter| obs

    pgbouncer -->|Kysely / SQL| db
    worker -->|Conexiones pooled| pgbouncer
    worker -->|Redis Client| redis
    worker -->|Descarga Archivo| s3
    worker -->|HTTP POST /extract| ocrSvc
    worker -->|Envía Emails| email
```

> **Nota dev**: en desarrollo, MinIO (S3 local) y Mailpit (SMTP local) corren vía `docker compose up -d`; en producción se usarían Tigris/R2 y Resend.

---
## 3. Nivel 3 - Componentes (dentro de la API)

```mermaid
%%{init: {
  'flowchart': { 'curve': 'orthogonal', 'nodeSpacing': 35, 'rankSpacing': 45 },
  'theme': 'base',
  'themeVariables': { 'lineColor': '#64748B' }
}}%%
flowchart TB
    classDef auth fill:#4338CA,stroke:#312E81,color:#FFFFFF,stroke-width:2px;
    classDef acct fill:#0D9488,stroke:#115E59,color:#FFFFFF,stroke-width:2px;
    classDef txn fill:#6D28D9,stroke:#4C1D95,color:#FFFFFF,stroke-width:2px;
    classDef rpt fill:#334155,stroke:#1E293B,color:#FFFFFF,stroke-width:2px;
    classDef async fill:#D97706,stroke:#92400E,color:#FFFFFF,stroke-width:2px;
    classDef int fill:#DB2777,stroke:#9D174D,color:#FFFFFF,stroke-width:2px;
    classDef db fill:#0D9488,stroke:#115E59,color:#FFFFFF,stroke-width:2px;

    db[("🗄️ <b>PostgreSQL 16</b><br/><i>[Database RLS]</i>")]:::db

    subgraph API [" ⚡ API Fastify Container "]
        
        subgraph Security [" Capa de Seguridad & Tenancy "]
            auth["🔑 <b>AuthModule</b><br/>Lucia Auth"]:::auth
            tenancy["🏢 <b>TenancyModule</b><br/>Middleware set_org_context()"]:::auth
        end

        subgraph Accounting [" Módulo Contable "]
            accounts["💳 <b>AccountsModule</b><br/>Saldos & Cache RLS"]:::acct
            budgets["📊 <b>BudgetsModule</b><br/>Presupuestos & CTE"]:::acct
            xrates["💱 <b>ExchangeRateModule</b><br/>get_rate() & Fallbacks"]:::acct
        end

        subgraph Transactions [" Dominio Transaccional "]
            txns["💸 <b>TransactionsModule</b><br/>CRUD, Splits, Transfers"]:::txn
        end

        subgraph Reporting [" Dominio de Reportes "]
            reports["📈 <b>ReportsModule</b><br/>Net-worth & Snapshots"]:::rpt
        end

        subgraph AsyncDomain [" Procesamiento Asíncrono "]
            docs["📄 <b>DocumentsModule</b><br/>Upload & Dedup"]:::async
            asyncProc["⚙️ <b>AsyncJobProcessor</b><br/>Handler de BullMQ"]:::async
            recur["🔄 <b>RecurringModule</b><br/>RRULE + pg_cron"]:::async
        end

        subgraph Integration [" Integración & Auditoría "]
            webhooks["🔔 <b>WebhookModule</b><br/>HMAC & Retries"]:::int
            audit["📜 <b>AuditModule</b><br/>Logs Inmutables"]:::int
        end
    end

    %% Pipeline de Entrada
    auth --> tenancy

    %% Delegación de Tenancy a Dominios
    tenancy --> accounts
    tenancy --> txns
    tenancy --> docs
    tenancy --> reports

    %% Relaciones entre Dominios
    txns --> accounts
    txns --> xrates
    budgets --> accounts
    docs --> asyncProc
    recur --> txns

    %% Módulos Transversales
    tenancy -.-> audit
    tenancy -.-> webhooks

    %% Conexiones a Base de Datos
    accounts --> db
    txns --> db
    reports --> db
```