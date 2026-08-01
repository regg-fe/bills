# Guía de Contribución (Bills)

¡Bienvenido al desarrollo de **Bills**! Para mantener la calidad del código y la trazabilidad del sistema, seguimos reglas estrictas.

## 1. Flujo de Trabajo

`main` es la rama protegida y la fuente de verdad de producción. Todo desarrollo se realiza en ramas auxiliares que se integran mediante Pull Request a `main`:

| Rama | Uso | Ejemplo |
|---|---|---|
| `feature/<issue>-<slug>` | Nuevas funcionalidades | `feature/0.5-observabilidad-base` |
| `bugfix/<slug>` | Corrección de fallos | `bugfix/refresh-token-expiry` |
| `hotfix/<slug>` | Correcciones críticas urgentes | `hotfix/env-var-typo` |

> **Nota**: cuando el proyecto requiera separar stages (staging/pre-prod), evolucionaremos a GitFlow con `develop` protegida. Hasta entonces, todo entra por `main`.

## 2. Estándar de Commits (Conventional Commits)

Formato: `<tipo>(<scope>): <descripción>` — en español, con `scope` opcional que indica el módulo afectado (`infra`, `auth`, `tenancy`, `accounts`, `transactions`, `docs`...).

| Tipo | Significado |
|---|---|
| `feat` | Una nueva función para el usuario |
| `fix` | La solución a un error (bug) |
| `docs` | Solo cambios en la documentación |
| `style` | Cambios de formato (espacios, comas) sin afectar el código |
| `refactor` | Código que no añade funciones ni arregla errores |
| `test` | Añadir o corregir pruebas |
| `chore` | Tareas de mantenimiento general |

Ejemplos:

```text
feat(infra): observabilidad base - Fastify, healthz, Sentry y pino. Closes #6
fix(auth): corregir validación del refresh token. Closes #12
docs: organizar README con arquitectura C4/ER
style: ordenar imports en app.ts
refactor(tenancy): extraer helper withOrgTx
test: cubrir setErrorHandler en 4 ramas
chore: actualizar dependencias de seguridad
```

**Convenciones del repo:**
- El mensaje de commit **cierra la issue relacionada** con `Closes #N` (se auto-cierra al mergear).
- La rama de feature referencia la issue: `feature/<issue>-<slug>`.
- Descripciones en español, imperativo (como los ejemplos de arriba).

## 3. Requisitos para el Merge (Definition of Done)

Antes de abrir un Pull Request hacia `main`, asegúrate de ejecutar localmente:

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Tu PR solo se integrará si:

1. El pipeline de CI está en verde (compila, pasa el linter y los tests automáticos).
2. Cuenta con la aprobación de al menos un revisor del equipo.
3. El título y/o cuerpo referencian la issue (`Closes #N`) para trazabilidad.
4. El body describe qué cambia y por qué (resumen, verificación realizada).
