@AGENTS.md

## Claude Code

```bash
pnpm install --frozen-lockfile
pnpm check          # tipos, lint y tests
pnpm dev            # Broker OS (apps/web)
pnpm db:create      # base local con las migraciones; db:reset la recrea
```

Postgres corre nativo; la instalación está en `docs/desarrollo/postgres-local.md`.

Los demás documentos se leen cuando la tarea los necesita, no se importan acá.
