@AGENTS.md

## Claude Code — específico

Todo lo anterior viene de `AGENTS.md` y rige para cualquier proveedor. Lo de acá abajo es solo para Claude Code.

### Comandos

```bash
pnpm install --frozen-lockfile
pnpm check          # valida decisions.yaml y las tareas de TASKS/
pnpm decisions      # imprime el estado de las decisiones desde decisions.yaml

pnpm typecheck      # tsc en modo estricto sobre packages/
pnpm lint           # ESLint, incluidos los límites de módulo de R-25
pnpm test           # node --test sobre los .ts de packages/

pnpm db:version     # la mayor de Postgres local coincide con .postgres-version
pnpm db:create      # crea la base local y aplica migraciones pendientes
pnpm db:reset       # la borra y la vuelve a crear desde cero
```

`typecheck`, `lint` y `test` **todavía no están dentro de `pnpm check`**: los cablea T-0012, que es la primera tarea con código real que chequear. Hasta entonces se corren por separado, y conviene correrlos antes de abrir un PR: nada más los obliga a seguir pasando.

Postgres corre nativo y su instalación está en `docs/desarrollo/postgres-local.md`. No hay `dev` porque todavía no hay aplicación web.

### Documentos: leerlos, no cargarlos

Los documentos canónicos se nombran entre backticks a propósito: `DOMAIN.md`, `ENGINEERING_RULES.md`, `PROJECT.md`, `decisions.yaml`. **No usar `@` para referenciarlos** — eso los cargaría completos en cada sesión. Leerlos con Read cuando la tarea los necesite. El único `@` intencional de este archivo es el de `AGENTS.md`, arriba.

Leer `DOMAIN.md` antes de discutir cualquier entidad, nombre de tabla o relación.

### Plan mode

Usar plan mode para: cambios a `DOMAIN.md`, a `decisions.yaml` o a cualquier ADR ya aceptado; y para cualquier tarea con `riskClass: HIGH`.

### Convención de rama y commits

```
task/T-0042-descripcion-corta
```

El hook de captura lee el `taskId` del nombre de rama. Una rama que no siga la convención produce un AgentRun sin tarea asociada, que es un run que después no se puede analizar.

### Runs de benchmark

Cualquier ejecución destinada a comparar proveedores se corre con `--bare` o con `--setting-sources` acotado, y queda registrada como tal en `settingSources`. Con configuración de usuario cargada, el run no es reproducible. → `ENGINEERING_RULES.md` R-11.

### Nunca

- Editar `.claude/**` sin aprobación humana explícita. Un agente que edita sus propios guardrails no tiene guardrails.
- Escribir PII de clientes en el texto de una tarea, en un prompt o en un log.
- Resolver en el camino una decisión con estado `OPEN` en `decisions.yaml`.
- Declarar terminada una tarea cuya `## Verification` no se ejecutó.

### Higiene

Una vez por mes: `/context` y `/skill-doctor`. Este archivo por debajo de 150 líneas. Lo que crece se mueve a `.claude/rules/` con `paths:`, o a un skill.
