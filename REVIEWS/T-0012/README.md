# T-0012 — Diff propuesto para `.github/workflows/project-os-check.yml`

`.github/workflows/**` está en `permissions.deny` (R-13, R-15): un agente no puede
leerlo con herramientas que produzcan un diff automático ni escribirlo directamente.
Este directorio contiene la versión propuesta completa
(`project-os-check.proposed.yml`) para que una persona con permiso la aplique. Es el
mismo patrón que usó `T-0005` en `REVIEWS/T-0005/`.

## Por qué hace falta este cambio

`pnpm check` ahora corre `pnpm test`, y la capa de integración de `T-0012` (R-26)
necesita un PostgreSQL real respondiendo en `DATABASE_URL`. El workflow actual no
declara ningún servicio de base de datos, así que `pnpm check` fallaría en CI —no
porque el schema esté mal, sino porque no hay Postgres para conectarse.

## Qué cambia

Contra el archivo actual (`.github/workflows/project-os-check.yml`):

1. Se agrega un `services.postgres` con imagen `postgres:17` — la misma versión mayor
   que fija `.postgres-version` (D-0046, R-17) — con healthcheck antes de que el job
   siga.
2. Se agrega la variable de entorno `DATABASE_URL` del job, apuntando a
   `delcampo_test` (termina en `_test`, no `_dev`, porque `packages/db/src/cli.ts`
   sólo permite operaciones destructivas sobre nombres que terminan así).
3. Se agrega un paso `Apply migrations against the CI database` que corre
   `pnpm db:migrate` antes de `pnpm check`, para que la base tenga el schema de
   `0001_vs01_core_schema.sql` cuando los tests de integración se conecten.

Nada del resto del workflow cambia: el paso de `pnpm check`, el checkout, el setup de
pnpm y la comprobación del contrato de tarea quedan igual.

## Cómo aplicarlo

1. Revisar `project-os-check.proposed.yml` en este directorio contra
   `.github/workflows/project-os-check.yml` actual.
2. Copiar el contenido propuesto sobre el archivo real:

   ```bash
   cp REVIEWS/T-0012/project-os-check.proposed.yml .github/workflows/project-os-check.yml
   ```

3. Comprobar el diff antes de commitear:

   ```bash
   git diff .github/workflows/project-os-check.yml
   ```

4. Commitear y abrir el PR (o incluirlo en el PR de `T-0012` si la persona con
   permiso decide aplicarlo ahí mismo):

   ```bash
   git add .github/workflows/project-os-check.yml
   git commit -m "ci: agregar servicio Postgres para la capa de integración de T-0012"
   ```

5. Verificar en el propio Actions run del PR que:
   - el servicio `postgres` pasa su healthcheck;
   - `pnpm db:migrate` aplica `0001_vs01_core_schema.sql` sin error;
   - `pnpm check` corre la suite de integración de `packages/db/src/schema.integration.test.ts`
     contra ese Postgres y queda verde.

## Mientras no se aplique

El PR de `T-0012` queda con CI roja (o el job de `check` fallando en `pnpm test` por
falta de `DATABASE_URL`/Postgres) hasta que una persona con permiso aplique este diff.
Esto se documenta explícitamente como bloqueo humano pendiente en
`ops/evidence/T-0012.md`; no se maquilló ningún test para que se salteara en silencio
por falta de Postgres, porque eso es precisamente lo que R-26 pide evitar.
