@AGENTS.md

## Claude Code — específico

Todo lo anterior viene de `AGENTS.md` y rige para cualquier proveedor. Lo de acá abajo es solo para Claude Code. Las reglas completas están en `ENGINEERING_RULES.md`; este archivo no las repite.

### Comandos

`package.json` es la fuente; estos son los de uso diario:

```bash
pnpm install --frozen-lockfile
pnpm check          # docs, decisiones, tareas, ledger histórico, tests de scripts, tipos, lint y tests
pnpm decisions      # estado de las decisiones desde decisions.yaml
pnpm dev            # app interna de Broker OS (apps/web)
pnpm db:create      # base local y migraciones pendientes; db:reset la recrea desde cero
```

Postgres corre nativo y su instalación está en `docs/desarrollo/postgres-local.md`.

### Documentos: leerlos, no cargarlos

El único `@` de este archivo es el de `AGENTS.md`. Los demás documentos se leen con Read cuando la tarea los necesita (R-12b). Leer `DOMAIN.md` antes de discutir cualquier entidad, nombre de tabla o relación.

### Plan mode

Usar plan mode para: cambios a `DOMAIN.md`, a `decisions.yaml` o a cualquier ADR ya aceptado; y para cualquier tarea con `riskClass: HIGH`.

### Guardrails propios

`.claude/**` no se edita sin aprobación humana explícita: un agente que edita sus propios guardrails no tiene guardrails (R-15). La rama sigue `task/T-xxxx-descripcion-corta`, porque CI lee de ahí el `taskId` (R-29).

### Higiene

Este archivo por debajo de 150 líneas. Lo que crece se mueve a `.claude/rules/` con `paths:`, o a un skill.
