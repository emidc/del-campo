# Revisión ciega de T-0017

- Workstream: `BOS`
- Rama: `task/T-0017-vinculacion-documental`
- Base: `origin/main` (`317603339360fd6268aa2d0a7b4c566ac298ccce`)
- Head revisado: `69818f4c3c8c573d124838457af6c186de4e8f5d` (previo al commit `e079cf5` que agrega `cli.ts`)
- Procedimiento: R-33 / D-0052
- Veredicto: sin `Act on`

## Alcance y método

Subagente aislado, sin transcript ni resumen del implementador. Contrato leído con
`git show main:TASKS/T-0017-vinculacion-documental-vs01.md`. Diff completo contra
`main` (tests incluidos), `DOMAIN.md`, `decisions.yaml` (D-0009, D-0032, D-0034,
D-0040, D-0054, D-0057) y `ENGINEERING_RULES.md` (R-01, R-05, R-13, R-19) leídos por
el propio revisor, sin extracto curado.

## Verificación independiente previa a Evidence

`pnpm db:reset` (aplica 0001–0004), `pnpm typecheck`, `pnpm lint` y `pnpm check`
corridos por el revisor antes de leer cualquier archivo de evidencia. 104/104 tests en
verde, incluidos los 9 casos de `load.integration.test.ts`. Confirmó por su cuenta que
el único archivo existente modificado es `TASKS/T-0017-vinculacion-documental-vs01.md`
(`status: DRAFT → ACTIVE`) y que ningún test existente fue tocado.

## Act on

Ninguno.

## Consider

- **Sin entrypoint de producción para la carga.** Al momento de esta revisión,
  `loadDocumentVerificationInput` sólo se invocaba desde el test de integración; no
  existía un comando de CLI que lo corriera contra un CSV real, pese a que el Outcome
  afirma "existe una carga repetible". **Atendido**: se agregó
  `packages/db/src/document-linking/cli.ts` (commit `e079cf5`), que envuelve
  batch + carga en una única transacción y se verificó con un smoke test manual
  (carga, recarga idempotente, limpieza) contra `delcampo_t0013_dev`.
- **Carrera check-then-act en `projectPolicyDocument`/`projectClientFolder`** ante dos
  corridas concurrentes del loader (no entre filas del mismo CSV, que sí están
  protegidas por la unique de `document_verification_input`). Riesgo bajo: es un
  proceso de carga operado por una persona, no un servicio multi-escritor. No se
  introduce un advisory lock en esta tarea; queda como límite conocido documentado en
  `ops/evidence/T-0017.md`.
- **`drive_file_id` almacena la URL completa**, no un identificador de archivo de Drive
  distinto de `drive_url`. Consistente puertas adentro del código (se usa igual en
  ambas columnas para las búsquedas de esta tarea), pero semánticamente redundante de
  cara a un futuro trabajo con la API de Drive. No bloqueante para D-0057, que es
  explícitamente sin integración API.

## Noted

- La extensión del CHECK de `document_link.resource_type` (POLICY → POLICY, PARTY) sin
  ADR nuevo es, en juicio independiente del revisor, defensible: el comentario de la
  migración 0001 ya anticipó exactamente este segundo caso (R-01), y la decisión de
  soportar la carpeta del cliente como vínculo a un Party ya está `ACCEPTED` en D-0057.
  Esta migración implementa mecánicamente una decisión ya tomada, no toma una nueva.
- `withAmbiguityResolved` degrada TODAS las filas `POLICY_DOCUMENT` `VERIFIED` en
  conflicto a `PENDING/AMBIGUOUS` antes de escribir nada — cumple "nunca elige
  arbitrariamente cuál vale".
- INV-022 respetado: ningún camino de código muta `source_value`; revertir de
  `VERIFIED` a `PENDING` sólo anula `resolved_target_type/id`.
- `query.ts` nunca confunde carpeta con documento (campos `document`/`clientFolder`
  separados), cumpliendo D-0057.
- R-19 respetado en los mensajes de fila/columna rechazada de `csv-row.ts` y
  `load.ts`: nunca interpolan el valor de la celda, sólo fila, columna y una razón
  genérica.
- Toda la SQL usa templates parametrizados de `postgres`; no se encontró superficie de
  inyección.

## Dismissed

Ninguno: no había afirmaciones previas del implementador que refutar: el revisor formó
su propio juicio sobre el punto del CHECK/ADR según se le pidió, y coincide en que no es
bloqueante.
