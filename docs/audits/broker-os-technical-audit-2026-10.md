# Broker OS — independent technical audit (2026-10)

> Estado posterior a los merges: ver [conciliación del 2026-10-08](reconciliation-2026-10-08.md). Este informe conserva su base y conclusiones históricas.

- **Date:** 2026-10-07 · **Base:** `main` at `4a33102` · **Workstream:** BOS
- **Kind:** audit, not implementation. No code, migration, ADR or task was changed. This
  file is the only deliverable.
- **Question:** is the current codebase sound enough to carry the Q4 labs (Risk OS,
  Communication OS) without a redesign?

**Short answer:** yes, with conditions. The modular-monolith boundaries of D-0063 hold
in code. Schema invariants are real constraints, migrations replay exactly, the webhook
and send paths are idempotent, and CI actually exercises Postgres. Nothing here calls
for a redesign. What remains is a handful of operational gaps that land in T-0026
(Communication OS deployment), one unverified exposure on the production Supabase
project, and a lint guard that does not yet cover a second context.

## Isolation statement (Risk OS Phase 8)

- I did not open anything under `SPIKES/T-0021/v0/`. The only thing I saw was its
  filenames, from a directory listing. `v0/fase-8/` and `v0/fase-9/` do not exist in
  this checkout.
- I did not read `metodologia-v0.md`, `protocolo.md`, fixtures, evaluator outputs or
  regression files, and I changed none of them.
- I read the task file `TASKS/T-0021-*.md` only for its status and contract header.
- I accessed no production system and no production data. Every database used was a
  local, disposable `*_test` database.

## Method and environment

I read the canonical documents first: `AGENTS.md`, `CLAUDE.md`, `PROJECT.md`,
`ENGINEERING_RULES.md`, `decisions.yaml` (via `pnpm decisions`), ADR-0063 and ADR-0066,
`SLICES/CO01.md`, T-0021, T-0026, `docs/despliegue/vercel-vs01.md`,
`docs/desarrollo/postgres-local.md`, `packages/db/migrations/README.md` and
`REVIEWS/T-0023-*`. Then I read the implementation: all migrations, both migration
runners, `packages/api`, `apps/web` route handlers and session code, all of
`contexts/communication`, `apps/communication`, `eslint.config.js` and the CI workflow.
I compared the two.

Two deviations from the pinned environment:

- **Node:** the container has Node 22. I installed 24.21 through nvm, as
  `engines` requires.
- **Postgres:** the container ships 16, and `.postgres-version` pins 17. Installing 17
  failed because the PGDG repository returned 403 through the proxy. So `pnpm db:version`
  fails here, as designed, and every integration result below comes from **Postgres 16**.
  CI uses `postgres:17`. Nothing in the schema depends on a 17-only feature, but these
  results are not the CI verdict (D-0046, R-17).

## Verification results

| Command | Result |
|---|---|
| `node scripts/check-docs.mjs` | `✓ 66 decisiones, 29 ADRs, 26 tareas, 0 aviso(s)` |
| `node scripts/check-agent-run.mjs` | `✓ AgentRun: 10 eventos; …` |
| `node --test scripts/tests/*.test.mjs` | 74 pass, 0 fail |
| `pnpm typecheck` (root + `apps/web` + `apps/communication`) | clean |
| `pnpm lint` | clean |
| `pnpm db:migrate` (fresh `delcampo_test`) | 0001–0006 applied |
| `pnpm test` (run 1) | `tests 339 · pass 339 · fail 0 · skipped 0` |
| `pnpm test` (run 2, same DB) | `tests 339 · pass 339 · fail 0` (the T-0023 A1 order dependency is fixed) |
| `pnpm db:migrate` → 6× `pnpm db:down` → `pnpm db:migrate`, `pg_dump --schema-only` before and after | identical except pg_dump's random `\restrict` token |
| `pnpm --filter @del-campo/web build` | builds, 11 routes |
| `pnpm --filter ./apps/communication build` | builds, 10 routes |
| Lint probe: temporary `contexts/risk/src/domain/probe.ts` importing `@del-campo/db` and `@del-campo/communication` | **0 errors** (see A3). Files removed afterwards. |

---

## 1. Confirmed defects

### D1 — Webhook deliveries that fail or stall are never reprocessed, and retention deletes them

- **Severity:** medium · **Category:** reliability / data loss · **Size:** S · **Becomes:**
  part of T-0026 (already in its Outcome), plus one explicit addition to it.
- **Evidence:**
  - `apps/communication/src/app/webhook/route.ts` saves the raw delivery, answers 200,
    then processes inside `after(processDelivery)`. If that continuation is killed, or
    if both the processing and `markDeliveryFailed` fail (for example, the database is
    unreachable), the row stays `processing = 'pending'` forever.
  - No code anywhere reprocesses `pending` or `failed` rows. `grep -rn reprocess`
    finds only comments (`store.ts:59`, `webhook.ts:10`, `payload.ts:7`).
  - `deleteDeliveriesReceivedBefore` (`persistence/store.ts`) deletes by `received_at`
    alone, with no filter on `processing`. A test locks this in:
    `retention.integration.test.ts:55`, *"también borra las fallidas"*.
  - The UI's freshness signal, `lastDeliveryReceivedAt`, is `max(received_at)` over
    all deliveries. It reports that something was **received**, not that it was
    **processed**. A stuck delivery therefore looks healthy.
- **Why it matters:** Meta does not retry after a 200. A message whose processing
  failed exists only in `body_raw`, and after 30 days retention deletes it silently.
  That breaks CO01 §4 "Mensajes perdidos: cero" and R-21 (an escalation must be a
  durable, visible item, not a log line).
- **Current impact:** none. Communication OS is not deployed.
- **Future impact:** messages lost during the 72-hour acceptance run, or in any later
  real use, with no visible signal.
- **Recommended action (in T-0026):**
  1. Implement the reprocess operation T-0026 already requires.
  2. Make retention skip rows that are not `processed`, or refuse to purge while any
     exist.
  3. Show the count of `pending`/`failed` deliveries next to "última entrega recibida".
  4. Change the test at `retention.integration.test.ts:55` deliberately, with the
     justification in the PR (R-13: modifying an existing test triggers human review).

### D2 — The Communication OS connection pool keeps prepared statements on, but the documented Supabase setup needs them off

- **Severity:** medium (latent) · **Category:** deployment · **Size:** XS · **Becomes:**
  a checklist item in T-0026.
- **Evidence:**
  - `contexts/communication/src/persistence/database.ts` connects with
    `postgres(databaseUrl, { max: 5, onnotice })`, so postgres.js uses its default
    named prepared statements.
  - The VS01 pool (`packages/api/src/db.ts`) sets `prepare: false`, and
    `docs/despliegue/vercel-vs01.md` §5 explains why: on Vercel the app uses the
    Supabase **transaction pooler** (port 6543), "que ese modo exige".
  - T-0026 lists that same document as the template for `vercel-communication.md`.
- **Why it matters:** behind a transaction-mode pooler, named prepared statements
  break between pooled backends. The usual symptom is intermittent
  `prepared statement … does not exist` errors.
- **Current impact:** none. Local tests connect to Postgres directly.
- **Future impact:** intermittent webhook 500s (Meta retries those, so no loss) and
  failed post-response processing (which leads straight into D1).
- **Recommended action:** add `prepare: false` to `connect()`, or have T-0026 decide
  explicitly on a session-mode or direct connection and document why. I did not change
  this myself: it is a one-line fix, but it is a deployment choice inside a
  `riskClass: HIGH` task. I cannot verify it against Supavisor without a hosted
  project, so treat it as likely, not proven.

### D3 — The `search_path` catalog test never inspects the Communication OS database

- **Severity:** low · **Category:** testing · **Size:** XS · **Becomes:** neither now; fold
  it into the first migration that adds a function to a context.
- **Evidence:** `packages/db/src/function-search-path.integration.test.ts` connects to
  `DATABASE_URL`, which is Broker's database. Its comment says it covers "los [esquemas]
  de D-0063 cuando existan". In practice, though, contexts live in **separate
  databases** (`delcampo_communication_test`, created by
  `contexts/communication/src/persistence/testing.ts`). A function created by a context
  migration would never be checked.
- **Impact:** none today, because `communication` defines no functions. The gap opens
  the day Risk OS or Communication OS adds a trigger function.
- **Recommended action:** run the same catalog query against each context's test
  database, or document that context migrations must not define functions without the
  check.

---

## 2. Architectural risks

### A1 — The production Supabase `public` schema may be reachable through Supabase's Data API (unverified)

- **Severity:** high if confirmed · **Category:** security / data exposure · **Size:**
  XS to verify, S to fix · **Becomes:** a task (`riskClass: HIGH`, because it touches
  production).
- **Evidence:**
  - Every VS01 table, all of them holding real client PII under D-0062, is created in
    `public` by migrations run as Supabase's `postgres` role
    (`docs/despliegue/vercel-vs01.md` §9.2).
  - No migration enables RLS or revokes anything: `grep -rniE "row level|revoke|grant"`
    over SQL and docs returns nothing relevant.
  - The deployment doc disables Supabase Auth, Storage and Realtime (§5). It says
    nothing about the **Data API (PostgREST)**, which a new Supabase project exposes
    on `public` by default.
  - In Supabase's usual default privileges, tables the `postgres` role creates in
    `public` are granted to `anon` and `authenticated`. With RLS off, anyone holding
    the project URL and the anon/publishable key, which Supabase designs as
    non-secret, can read or write those tables.
- **Why it matters:** this would bypass D-0059 entirely (OIDC, Workspace `hd` claim,
  explicit admission list) through a path the application never sees. R-19, R-18
  (least privilege).
- **Current impact:** unknown. The app never uses the anon key, so exposure depends
  on project settings I could not, and should not, inspect.
- **Recommended action:** the owner runs a read-only check in the production SQL editor:

  ```sql
  select has_table_privilege('anon', 'public.party', 'select') as anon_select,
         has_table_privilege('authenticated', 'public.policy', 'select') as auth_select;
  ```

  Also open the project's Security Advisor. If either check returns `true`, or the
  advisor reports `rls_disabled_in_public`, then:
  - disable the Data API (the app does not use it); or
  - revoke `anon`/`authenticated` privileges on `public` and alter the default
    privileges.

  Apply the same rule to the Communication OS database in T-0026. This is
  infrastructure hardening. It does **not** resolve D-0022 (the authorization model),
  which stays OPEN.

### A2 — Each app connects as the database owner

- **Severity:** medium · **Category:** security / least privilege · **Size:** S · **Becomes:**
  a task. The Communication OS half belongs in T-0026, because ADR-0063 already
  promises it.
- **Evidence:**
  - VS01 is read-only by design (`vercel-vs01.md` §7.4: "VS01 es de solo lectura
    sobre la base"). Yet its `DATABASE_URL` is the Supabase `postgres.<ref>` user, with
    DDL and DML on every table, staging included.
  - ADR-0063: "Cada contexto es dueño de un esquema … y, cuando haya despliegue, su
    propio rol de base de datos." Nothing creates such roles.
  - R-22 assumes an application role without `UPDATE`/`DELETE` once
    `BusinessAuditEvent` exists.
- **Why it matters:** if the web tier is compromised (a dependency, an SSRF, a leaked
  environment variable), the attacker gets full write and DDL access to production.
  For Communication OS, a single role also defeats the "context owns its schema"
  boundary at runtime: it is enforced by lint only, never by Postgres.
- **Recommended action:**
  - Communication OS (T-0026): a role limited to the `communication` schema.
  - VS01: a `SELECT`-only role on the VS01 tables, used by the app. Migrations keep
    the owner role.

### A3 — Context isolation lint is opt-in per context, so a new `contexts/risk` starts with no isolation

- **Severity:** medium · **Category:** architecture / guardrails · **Size:** XS–S ·
  **Becomes:** a task, done before or inside the first Risk OS code task.
- **Evidence:**
  - In `eslint.config.js`, `const CONTEXTOS = ['communication']` is hard-coded, and
    every `contextoAislado` and `domain` block targets `contexts/communication/**`
    by literal path.
  - **Empirical probe:** a temporary `contexts/risk/src/domain/probe.ts` importing
    `@del-campo/db` and `@del-campo/communication` produced **zero** lint errors.
  - Broker importing it by relative path *is* caught ("Broker no importa un contexto
    por ruta"). Broker importing `@del-campo/risk` by package name would not be,
    because `risk` is missing from `CONTEXTOS`.
- **Why it matters:** ADR-0063 does say the rules are "escritos en la misma tarea" that
  creates the context. But the guard fails open: a forgotten rule is silent, and R-25
  exists precisely because "un agente que no ve el límite lo cruza".
- **Current impact:** none, since `contexts/risk` does not exist.
- **Future impact:** the first Risk OS PR could couple to Broker or to Communication OS
  with CI green.
- **Recommended action:**
  - Derive `CONTEXTOS` from `readdirSync('contexts')`.
  - Apply `contextoAislado`, the domain rule and the persistence→application rule to
    every context generically.
  - Add a test in `scripts/tests` that fails if a `contexts/*` directory has no rule
    coverage.

  This enforces an existing decision and creates no new one, so it needs no ADR. I did
  not change it because a parallel session works on Risk OS infrastructure, and an
  edit to `eslint.config.js` could collide with it.

### A4 — The webhook accepts any `phone_number_id` in the WABA

- **Severity:** low–medium · **Category:** data scope / R-19 · **Size:** XS · **Becomes:**
  a decision inside T-0026 (filter or not).
- **Evidence:** `contexts/communication/src/domain/payload.ts:120` only requires that
  `metadata.phone_number_id` be present. Nothing compares it with
  `WHATSAPP_PHONE_NUMBER_ID` (read only for sending, `apps/communication/src/lib/server.ts:35`).
- **Why it matters:** CO01 is authorized for the dedicated number and two consenting
  team members only. If another number, such as the corporate one, is ever added to
  the same WABA or app subscription, real customer conversations would be stored and
  shown, with no authorization behind them (PROJECT §4, R-19).
- **Recommended action:** route deliveries for any other `phone_number_id` to
  `discarded` (they stay visible as `failed` and retained). Or record explicitly in
  T-0026 that the WABA holds exactly one number.

### A5 — Code and schema deploy independently, with no compatibility check

- **Severity:** low–medium · **Category:** deployment ordering · **Size:** S · **Becomes:**
  neither; a documentation item in T-0026.
- **Evidence:**
  - Vercel deploys code on merge. Migrations run by hand by the owner
    (`vercel-vs01.md` §10.4).
  - Code that reads a newer column (for example `document_link.link_level`, from
    0005) fails at runtime if deployed before its migration. The doc covers only the
    reverse ordering problem, for data reloads.
  - Communication OS adds a second, independent ledger (`communication.schema_migrations`).
- **Why it matters:** two hosted databases and two ledgers double the chances of a
  wrong-order release during Q4.
- **Recommended action:** state "migrate, then deploy" in each deployment doc. Keep
  migrations additive (expand/contract). A startup check comparing the ledger with the
  repository is optional and not worth it at this volume.

### A6 — CI never runs `next build`

- **Severity:** low · **Category:** CI coverage · **Size:** XS (needs human approval,
  R-13/R-15) · **Becomes:** a task.
- **Evidence:** `.github/workflows/project-os-check.yml` runs `db:version`, `db:migrate`,
  `pnpm check` and the task-contract check. `pnpm typecheck` runs `tsc` on both apps,
  but Next-specific failures surface first on Vercel: server/client boundary misuse,
  route segment config, `transpilePackages`. Both apps build today.
- **Recommended action:** add `pnpm --filter @del-campo/web build` and
  `pnpm --filter ./apps/communication build` to the job. T-0026's `## Verification`
  already includes the second.

### A7 — The Communication OS login has no throttling and runs scrypt on every attempt

- **Severity:** low–medium once public · **Category:** security / availability ·
  **Size:** S · **Becomes:** T-0026 (its README already defers this to deployment).
- **Evidence:** `apps/communication/src/lib/auth.ts` runs scrypt (N=2^15, r=8, about
  32 MiB) on every `POST /api/login`, even when the user is wrong. That is deliberate,
  for constant time. `apps/communication/README.md`: "Sin límite de intentos de login
  en T-0025 … Se revisa en la tarea de despliegue."
- **Why it matters:** brute force is infeasible against a password of 20 or more random
  characters. The cost is availability: unauthenticated requests can spend CPU and
  memory on a public URL. That URL is the same deployment as the webhook, so a login
  flood can degrade reception.
- **Recommended action:** platform-level rate limiting (Vercel firewall rule on
  `/api/login`), or a small per-instance limiter. Decide in T-0026.

---

## 3. Technical debt

| ID | Sev. | Finding | Evidence | Action | Size | Becomes |
|---|---|---|---|---|---|---|
| TD1 | low | Two migration runners with duplicated logic. Broker's needs the `psql` binary; the context's uses the driver. | `packages/db/src/cli.ts`, `contexts/communication/src/persistence/migrations.ts` header ("la duplicación es aceptada en T-0024") | Leave as is. Decide at Q4 close (D-0063). | M | neither in Q4 |
| TD2 | low | Both ledgers key on the filename only, with no checksum. Editing an applied migration diverges silently. | `pendientes()` / `pendingMigrations()` compare names only | Store a sha256 per file and fail on mismatch. | S | task (low priority) |
| TD3 | low | No lock around `migrate`. Two concurrent runs race on ledger creation. | `migrar()` / `migrate()` | `pg_advisory_lock` around migrate. Only matters if migrations are ever automated. | XS | neither |
| TD4 | low | `packages/domain` is empty and imported by nobody. Broker's domain types live in `packages/db/src/policy-query.ts`; invariants are SQL constraints (D-0051). R-25 guards an empty package. | `packages/domain/src/index.ts` (`export {}`); `grep @del-campo/domain` finds only its own `package.json` | None in Q4. | — | neither |
| TD5 | low | Row types are hand-written next to SQL (no generation). | `policy-query.ts` `*Row` interfaces; `numeric`→`string` and `date`→`dateOnly()` handled correctly | Acceptable while integration tests cover every query (`policy-query.integration.test.ts`). Revisit under D-0045's falsification signal. | — | neither |
| TD6 | low | VS01 search uses `ilike '%'‖x‖'%'` without escaping `%`/`_`, and has no result cap. | `policy-query.ts:395-410` | Wildcard injection only (not SQL injection), by admitted internal users, over about 1,930 policies. Escape and cap when the data grows. | XS | neither |
| TD7 | low | Context test helpers and migrations rely on implicit details: `truncateAll` hard-codes its table list; `unsupported_message.id` defaults to `nextval('communication.message_id_seq')`, the implicit identity sequence name. | `persistence/testing.ts`, migration `0002_outbound_attempt.sql` | Truncate by querying `pg_tables where schemaname='communication'`. Name the sequence explicitly if it is ever recreated. | XS | neither |
| TD8 | low | CI actions are pinned by tag, not by SHA. | `actions/checkout@v7.0.1`, `pnpm/setup@v2.0.0` | Pin to SHAs (human approval, R-13). | XS | task (optional) |
| TD9 | low | HTTP borders validate input by hand, with no schema library. | `handlers.ts` `replyResponse`, `payload.ts`, `criterios.ts` | Fine at this size. R-24 stays LATENT until an ADR picks a library (R-05). | — | neither in Q4 |

---

## 4. Documentation drift

| ID | Sev. | Drift | Evidence | Fix | Size |
|---|---|---|---|---|---|
| DD1 | medium | `AGENTS.md` (loaded into every agent session) says "No hay importación, ni UI, ni endpoints, ni autorización." `PROJECT.md` §3 repeats "cero importación, cero UI, cero endpoints, cero autorización." | T-0013 (importer), T-0018 (UI + OIDC admission), T-0024/T-0025 (webhook, UI, send), all DONE | Rewrite the state paragraph in both. Agents currently start from a false premise. | XS |
| DD2 | low | `CLAUDE.md`: "`typecheck`, `lint` y `test` todavía no están dentro de `pnpm check`" and "No hay `dev` porque todavía no hay aplicación web." | `package.json` `check` already chains `pnpm typecheck && pnpm lint && pnpm test`; `dev` and `build` scripts exist | Update the command section. | XS |
| DD3 | low | `packages/db/migrations/README.md`: "El directorio está vacío … `pnpm db:migrate` no toca la base." | Six migrations, 0001–0006 | Remove the T-0010-era paragraphs. | XS |
| DD4 | low | `ENGINEERING_RULES.md`: R-24 says "todavía no existe ningún borde"; R-25 says `api`/`web` "todavía no existan"; R-28 is LATENT, yet deny-by-default tests exist (`apps/communication/src/lib/deny.test.ts`, `packages/api/src/http.test.ts`); R-27's contract layer exists. | — | Flip R-28 to ACTIVE and refresh the R-25 text. R-24 needs its ADR first (R-05). | S |
| DD5 | low | `docs/despliegue/vercel-vs01.md` §10.4: "Hoy la pendiente es `0006`". The header still says "Estado al 2026-09-24" and §1 points at a task branch. | `PROJECT.md` §3.2: 0006 applied in production on 02/10 | Refresh. | XS |
| DD6 | low | `TASKS/T-0021` has `status: DRAFT` while Phases 0–7 are merged (PRs #54–#61). The WIP limit (PROJECT §5) cannot be computed from task files. | `git log` | Owner updates it when convenient. **Not during Phase 8.** | XS |
| DD7 | low | `packages/domain/src/index.ts`: "las entidades las crea T-0012". T-0012 put them in SQL (D-0051). | — | Reword or drop. | XS |

**No code contradicts an ACCEPTED decision.** Two PROVISIONAL decisions are under
pressure but not yet broken:

- **D-0014** ("Vercel hospeda la app web"): CO01 adds a webhook receiver and a
  scheduled job on Vercel. That is request/response work, consistent with D-0012
  ("procesos prolongados no dependen del ciclo de vida de un request"), but D-0014's
  text no longer describes everything Vercel hosts.
- **D-0063**: holds as written (see A3).

---

## 5. Investigated and rejected

These hypotheses were checked against the code and found **not** to be problems. Do
not reinvestigate them unless the code changes.

| Hypothesis | Finding |
|---|---|
| **Functions with no `search_path`** (T-0023) | **The concern was real, and it is solved.** Trigger functions name tables without a schema; `pg_dump` sets `search_path = ''`; the reload then failed with `relation "party" does not exist`. The causality test in `function-search-path.integration.test.ts` still reproduces exactly that error when 0006 is reverted. 0006 pins `public, pg_temp` on all 14 functions with `ALTER FUNCTION … SET`, leaving each body byte-for-byte unchanged (the test checks `md5(prosrc)`). The catalog test fails on any future `create or replace` that omits it. The T-0023 review's A1 finding (the suite passed only once per database) is fixed: two consecutive runs gave 339/339, with `proconfig` intact on all 14 functions. **No function is `SECURITY DEFINER`** (`count(prosecdef) = 0`), so `search_path` is about correctness only, not a privilege-escalation path. Only residual gap: D3. |
| SQL injection | Every query uses postgres.js tagged templates. `sql.unsafe` takes only code constants (`SCHEMA`, `LEDGER`), migration file contents, and in `import/staging.ts` column names from code with bound values. The DB name interpolated in the CLIs comes from the operator's own `DATABASE_URL`, already restricted to `_dev`/`_test` on localhost. |
| Webhook signature bypass | Verification runs before any write. HMAC-SHA256 over the raw bytes; regex-enforced 64 hex characters; `timingSafeEqual` on equal lengths; 1 MiB cap. Tested: "un POST sin firma o con firma inválida devuelve 401 y no persiste nada". |
| Duplicate processing of Meta retries | `message.wamid` is `unique` with `on conflict do nothing`; status updates only move forward under `for update`, with statuses sorted by `wamid` to avoid deadlocks; the same payload twice leaves 1 message and 2 deliveries (tested). |
| Duplicate outbound sends (R-20) | The key is persisted before the call (`insertAttempt … on conflict do nothing`); the insert race is resolved by re-reading the winner; unknown outcomes become `unconfirmed` and are never retried automatically; accepted-but-not-persisted keeps the `wamid` for reconciliation. Correct for an API that offers no idempotency keys. |
| Broker ↔ Communication OS coupling today | None. No Broker table name or `public.` reference in `contexts/` or `apps/communication`; no `communication.` reference in `packages/` or `apps/web`. Lint enforces both directions for `communication`. Separate databases in dev and CI. |
| Migration reproducibility | Full down/up round-trip on a fresh database yields an identical schema dump. The ledger records each migration inside the migration's own transaction (`psql -1` / `sql.begin`), and orphaned ledger entries abort the run. |
| SQL ↔ TypeScript divergence | `numeric premium` is typed `string`; `date` values parsed as UTC are normalized with `toISOString().slice(0, 10)`; every query has integration tests against real Postgres. No divergence found. |
| Secrets in the repository or the client bundle | None found by grep. No `NEXT_PUBLIC_*` variable carries a secret. Both apps fail closed when configuration is missing: VS01 throws, Communication OS returns 503 or redirects to `/login`. |
| PII in logs | Only Communication OS logs, and only ids and counts. Persisted `processing_error` holds `error.message` (never Postgres `DETAIL`) and fixed discard reasons. VS01 does not log. |
| VS01 authorization boundary | Structural deny-by-default: every use case takes a `Principal`, which only the guard can construct. Admission is re-evaluated on every request against the environment list (revocation works on redeploy); it checks the `hd` claim rather than the email suffix; `sub` can be pinned; `redirect_uri` comes from config, never from `Host`; a malformed cookie can no longer produce a 500. |
| CSRF on Communication OS | `SameSite=Strict` session cookie, plus an `Origin` check on every non-GET request. The webhook is exempt and protected by its signature instead. |
| Duplicated domain concepts (participant vs `Party`/`ContactPoint`) | Intentional under D-0063 ("Algunos conceptos se duplican a propósito"). Reconciled only if the labs are integrated at Q4 close. |
| Workspace scaling for a new context | `tsconfig.json` already includes `contexts/*/src/**/*.ts`; the `pnpm test` glob covers `contexts/**/src/**/*.test.ts`; the workspace includes `contexts/*`. Only lint needs per-context work (A3). |
| CI gives no meaningful protection | Rejected. CI runs Postgres 17, applies migrations, runs typecheck, lint, unit, integration and contract tests, plus the frozen-contract check. Gaps: A6 (no build) and the absence of a full down/up round-trip in CI (verified manually above). |

---

## 6. Prioritization

### Top 5 findings by expected impact

1. **A1:** possible Data API exposure of production PII in `public`. Verify this first.
2. **D1:** stalled or failed webhook deliveries are never reprocessed, and retention
   deletes them silently.
3. **A2:** apps connect as the database owner; no per-context or read-only role.
4. **D2:** Communication OS pool vs Supabase transaction pooler (`prepare: false`).
5. **A3:** context lint fails open for a new `contexts/risk`.

### Top 5 low-cost, high-value fixes

1. **A1 check:** two read-only `has_table_privilege` queries plus the Security Advisor,
   run by the owner. XS.
2. **D2:** `prepare: false` in `contexts/communication/src/persistence/database.ts`, or an
   explicit pooler choice in T-0026. XS.
3. **D1, partial:** retention skips non-`processed` deliveries, and the UI shows the
   pending/failed count. XS each, before the full reprocess job.
4. **A3:** derive `CONTEXTOS` from the filesystem, plus a coverage test. XS–S.
5. **DD1 + DD2 + DD3:** correct the "no UI, no endpoints" premise in `AGENTS.md` and
   `PROJECT.md`, plus the stale `CLAUDE.md` and migrations README. XS.

### Blockers for Risk OS

**No technical blocker.** Before the first `contexts/risk` code:

- A3 must be fixed. Otherwise the first PR is unguarded.
- T-0021's outputs must exist: formats, minimal model, synthetic dataset size.
- Where Risk OS's real data lives needs its own authorization. D-0062 does not extend
  (ADR-0063).
- If the CSV import must run hosted and could be long, D-0014 (worker hosting) becomes
  a real decision. A local CLI, as T-0013 did, avoids it for v1.

### Blockers for Communication OS (T-0026)

T-0026 should not start its 72-hour acceptance run until it has:

- the reprocess path, and retention that cannot delete unprocessed deliveries (D1);
- a decided connection mode (D2);
- a dedicated database role on `communication` only (A2);
- Data API and RLS posture checked on the new database (A1);
- login throttling (A7);
- a decision on `phone_number_id` filtering (A4).

Also add a Framework Preset for `apps/communication`: `apps/web/vercel.json` exists
because an empty preset fails the build ("No Output Directory named public",
`vercel-vs01.md` §2), and `apps/communication` has no equivalent. The non-technical
blockers are the owner items in CO01 §7.

### Explicitly do NOT act on during Q4

- Unifying the two migration runners or creating a shared platform package (TD1,
  ADR-0063 "Sin núcleo compartido en Q4").
- Moving Broker tables into a `broker` schema (ADR-0063 rejected this for Q4).
- Resolving D-0022 (authorization model, RLS vs application layer) as a side effect of
  A1 or A2. A1 is "turn off an unused API"; A2 is "least-privilege connection role".
  Neither is an authorization model.
- Generic queue, outbox, event bus or adapter interface (ADR-0063, R-01).
- ORM or type generation to replace hand-written SQL (D-0045 is PROVISIONAL, and its
  falsification signal has not appeared).
- Populating or deleting `packages/domain` (TD4).
- Individual identity or audit trail in Communication OS (D-0066 accepts the shared
  credential while content is synthetic). Revisit when D-0066 is falsified.
- Anything touching `SPIKES/T-0021/v0/` while Phase 8 runs, including DD6.

---

## 7. Commands used

```bash
# toolchain (container shipped Node 22 and Postgres 16)
source /opt/nvm/nvm.sh && nvm install 24
service postgresql start                      # Postgres 16; 17 unavailable (PGDG 403)
pnpm install --frozen-lockfile

export DATABASE_URL=postgres://postgres:postgres@localhost:5432/delcampo_test
createdb -h localhost -U postgres delcampo_test
pnpm db:version                               # fails as designed: local 16 vs pinned 17
pnpm db:migrate
node scripts/decisions.mjs
node scripts/check-docs.mjs && node scripts/check-agent-run.mjs
node --test scripts/tests/*.test.mjs
pnpm typecheck
pnpm lint
pnpm test                                     # twice on the same database
NEXT_TELEMETRY_DISABLED=1 pnpm --filter @del-campo/web build
NEXT_TELEMETRY_DISABLED=1 pnpm --filter ./apps/communication build

# migration round-trip on a disposable database
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/delcampo_audit_test
createdb -h localhost -U postgres delcampo_audit_test
pnpm db:migrate && pg_dump --schema-only -T schema_migrations … > a.sql
for i in 1 2 3 4 5 6; do pnpm db:down; done
pnpm db:migrate && pg_dump --schema-only -T schema_migrations … > b.sql
diff a.sql b.sql                              # only the \restrict token differs

# catalog checks
psql … -tAc "select proname, proconfig from pg_proc … where nspname='public'"
psql … -tAc "select count(*) filter (where prosecdef) from pg_proc … where nspname='public'"

# lint isolation probe (temporary files, removed afterwards)
npx eslint contexts/risk/src/domain/probe.ts packages/api/src/probe-risk.ts
```

Greps for SQL injection (`.unsafe(`), cross-context references, `console.*`, hard-coded
secrets, `RLS|revoke|grant|postgrest`, and `reprocess`, as cited in each finding.
