# T-0009 — Revisión ciega por subagente aislado, ejercitada sobre PR #9 (T-0010)

**Workstream:** POS · **Fecha:** 2026-09-21 · **Estado:** procedimiento definido en
`ENGINEERING_RULES.md` (R-33) y ejercitado una vez, de punta a punta, sobre un PR real ya
mergeado.

## Por qué el sujeto es T-0010 y no T-0006/T-0007

El `## Notes` original de T-0009 sugería "el PR de T-0006 o el de T-0007, lo que esté
primero". T-0007 quedó `DROPPED` y no genera evidencia según R-09b: no hay nada que
revisar. T-0006 sí tiene PR, pero se prefirió el de T-0010 (PR #9, ya mergeado en
`2bba141`) por tres razones, en orden de peso:

1. **Independencia real, no de forma.** T-0010 lo escribió y verificó otro agente, en
   otra sesión (Claude en Cowork, no Claude Code — así lo declara su propia evidencia),
   sin relación con esta sesión. Revisar T-0006 hubiera sido revisar trabajo de la misma
   línea de sesiones que escribió el procedimiento de revisión.
2. **`ops/evidence/T-0010.md` declara siete límites explícitos** en su `## Qué NO se
   verificó`, incluido literalmente "nadie revisó esto de forma independiente" con cita
   a `R-30` y a esta misma tarea (`T-0009`). Eso da algo concreto para *comprobar*, no
   solo para creer: la revisión ciega tenía una lista de límites declarados contra la
   cual contrastar lo que el subagente aislado encontraba por su cuenta.
3. **Su `## Verification` es ejecutable de punta a punta en esta máquina.** Postgres 17
   ya está instalado localmente (a diferencia del momento en que se escribió T-0010, que
   dependía de un entorno remoto para parte de la evidencia), así que el subagente pudo
   correr los cinco comandos del contrato — incluido `pnpm db:create && pnpm db:reset` —
   sin depender de nada externo a esta máquina.

## Procedimiento seguido

1. Se leyó el contrato de T-0010 desde `main` (no desde ninguna rama), congelado por el
   control de T-0005.
2. Se generó el diff completo entre el merge-base de T-0010 (`6cc9246`) y su punta
   (`2bba141`), tests incluidos.
3. Se lanzó un subagente de tipo `general-purpose`, sin fork de esta conversación: no
   heredó historial, no vio qué skills se invocaron acá, no vio qué archivos leyó quien
   coordinó esta tarea. Recibió únicamente el contrato leído desde `main`, el diff
   completo, y la instrucción explícita de buscar `DOMAIN.md` y `decisions.yaml` por su
   cuenta — sin ningún extracto curado de decisiones.
4. Se le exigió, como parte del contrato de la instrucción, correr los comandos de
   `## Verification` de T-0010 **antes** de abrir `ops/evidence/T-0010.md`. El reporte
   final documenta el orden con evidencia: corrida propia a las 09:56–09:57, lectura de
   la evidencia recién a partir de las ~10:00.
5. El subagente entregó el reporte que sigue, literal, sin edición de contenido.

## Reporte del subagente, literal

```
# Revisión ciega — T-0010

## Encabezado

Revisé T-0010 ("Levantar el entorno de desarrollo ejecutable, sin dominio"), diff desde
main en `6cc9246a9d4e9ceb07c72276804ed385b09bc4d4` hasta la punta de la rama
`5d4c86d91e2617c32733ab0d8dbfdc2982deaf23` (task/T-0010-entorno-de-desarrollo-ejecutable),
ya mergeado a `main` en el commit `1824511` / HEAD actual `182451139a2855b8f20af291876fb030f438e95d`.
Revisión hecha el 2026-09-21, en macOS Apple Silicon, Node v24.19.0, pnpm 11.19.0,
PostgreSQL 17.11 (Homebrew).

**Orden respetado:** corrí los cinco comandos de `## Verification` sobre el estado actual
de `main` a las 09:56–09:57 (timestamps de `date` capturados antes/después de cada bloque)
y recién después, a las ~10:00, leí `ops/evidence/T-0010.md`. No abrí ese archivo antes.
Adicionalmente repetí por mi cuenta las tres comprobaciones de canario (tipo, límite de
módulo, test que falla) y `pnpm db:version`/`btree_gist`, también antes de leer la
evidencia.

Resultado de mi propia corrida, en orden:
- `pnpm typecheck` → exit 0, sin salida (esperado).
- `pnpm lint` → exit 0, sin salida.
- `pnpm test` → exit 0, 10/10 tests.
- `pnpm check` → exit 0, 55/55 tests (48 decisiones, 16 ADRs, 18 tareas) — más alto que
  los "39 tests" y "47 decisiones" que cita la evidencia de T-0010 porque el working tree
  de `main` en este momento tiene cambios sin commitear de T-0009/D-0048 (ver Noted).
- `pnpm db:create && pnpm db:reset` → exit 0 ambos; la base ya existía de una corrida
  previa, el reset la recreó vacía.
- Canario de tipo (`packages/db/src/__canario.ts` con `number = "texto"`) → `tsc` lo
  rechaza, exit 2, archivo borrado después.
- Canario de límite de módulo (`packages/domain/src/__canario.ts` con `import fs from
  'node:fs'`) → `eslint` lo rechaza citando R-25, archivo borrado después.
- `pnpm db:version` → confirma Postgres 17 local contra `.postgres-version`.
- `create extension if not exists btree_gist` → `CREATE EXTENSION`, éxito.
- `git status --short` después de los canarios → limpio salvo los cambios preexistentes
  de T-0009/D-0048, no tocados por mí.

Todo lo anterior coincide con lo que la evidencia del implementador afirma para el
Entorno C.

## Act on

Ninguno. No encontré un defecto que justifique bloquear o revertir esta tarea. Es un
resultado legítimo dado el alcance (CHORE de arnés, sin lógica de dominio, riskClass
LOW) y lo bien acotado que está el diff: cada pieza de `cli.ts` y `migraciones.ts` tiene
test o verificación manual repetible, y mi corrida independiente reprodujo exactamente
lo que la evidencia declara.

## Consider

- `packages/db/src/cli.ts:1006-1018` (`psql`/`psqlAdmin`) y las funciones que arman SQL
  por interpolación de string (`existeLaBase`, `migrar`'s `insert into ... values
  ('${migracion.archivo}')`, `resetear`'s `drop database if exists "${nombre}"`) no
  escapan el valor que interpolan. Hoy es seguro porque `nombreDeLaBase` viene de
  `DATABASE_URL` (controlado por quien edita `.env`) y `archivo` está validado por la
  regex de `parsearNombre` en `packages/db/src/migraciones.ts:16`, pero es un patrón que,
  si se copia a un contexto con input menos controlado en T-0012 (nombres de columnas,
  etc.), reintroduce el problema por costumbre. No amerita bloquear T-0010; sí amerita
  una nota para quien escriba la capa de consulta tipada que D-0045 difiere.
- `packages/db/package.json` declara `"bin": { "db": "./src/cli.ts" }` pero
  `packages/db/src/cli.ts` no tiene shebang (`#!/usr/bin/env node`). Nada en
  `package.json` (raíz) invoca ese bin directamente — todos los scripts llaman `node
  packages/db/src/cli.ts ...` — así que hoy es código muerto sin consecuencia
  observable, pero si alguien lo linkeara (`pnpm exec db`, o un futuro `apps/`) fallaría
  de forma confusa. Barato de arreglar o de quitar; no until R-01 lo pida.

## Noted

- El `git status` de `main` en el momento de correr la verificación no estaba limpio:
  `ENGINEERING_RULES.md`, `decisions.yaml`, `TASKS/T-0009-revision-ciega-por-subagente-aislado.md`
  y `ops/runs/2026-09-21.jsonl` tienen cambios sin commitear (la introducción de R-33 y
  D-0048, el propio procedimiento bajo el que corre esta revisión). No afecta ningún
  archivo que T-0010 tocó, así que no contaminó la verificación de T-0010, pero explica
  por qué mi `pnpm check` da 48 decisiones/55 tests contra las 47/39 de la evidencia
  original, y es en sí mismo un desvío de la convención de rama de `CLAUDE.md` (cambios
  materiales a `decisions.yaml`/`ENGINEERING_RULES.md` viviendo sueltos en `main` en vez
  de en una rama `task/T-xxxx-...`). Señalarlo, no corregirlo: está fuera del alcance de
  esta revisión de T-0010.
- Durante `pnpm check` aparece en stdout la línea `fatal: Not a valid object name
  origin/main`, emitida por uno de los tests del arnés (branch-name checker) porque este
  repo local no tiene `origin/main` resuelto localmente. El test igual pasa (rechaza
  explícito, no en silencio, que es justamente lo que ese test verifica), así que no es
  un fallo, pero es ruido de stderr filtrándose a un `pnpm check` que se supone "en
  verde" sin mensajes de error visibles. Cosmético.
- La evidencia declara correctamente sus límites en `## Qué NO se verificó`
  (7 puntos): el `EXCLUDE USING gist` sólo se probó contra Postgres 16 y no contra la
  17 que fija el repo, la instalación no se probó en máquina limpia, CI no corrió, y
  "nadie revisó esto de forma independiente" — exactamente lo que esta revisión viene a
  resolver parcialmente. Coincide con lo que yo mismo hubiera señalado si no lo hubieran
  declarado.
- El "AgentRun: Ninguno" de la evidencia, justificado porque la sesión de autoría corrió
  en Claude (Cowork) y no en Claude Code, es consistente con `ops/AGENTRUN.md` (el
  ledger sólo lo escriben los hooks `SessionStart`/`SessionEnd` de Claude Code) — pero la
  cita a R-12 en la tabla de contexto de la evidencia es floja: R-12 habla de que "la
  versión de contexto es el SHA del repo", no de cuándo es aceptable no tener AgentRun.
  La ausencia está bien justificada por el mecanismo real (`ops/AGENTRUN.md`), no por la
  regla que cita.

## Dismissed

- *"El schema en SQL crudo sin capa de tipos es un riesgo de mantenibilidad."* Descartado:
  es exactamente la decisión material que D-0045 registra, con ADR propio, alternativas
  consideradas y `falsified_by` explícito. No es una premisa implícita del código (R-03):
  está donde R-04 exige que esté.
- *"Falta test de integración real para T-0012 (constraint EXCLUDE USING gist)."*
  Descartado: T-0010 declara explícitamente `## Non-scope` "no se modela ninguna
  entidad ni se crea ninguna tabla", y la observación externa de la evidencia ya deja
  registrado, con SQL corrido a mano, que la construcción funciona (aunque sobre
  Postgres 16, defecto ya reconocido arriba en Noted). Exigir el test de integración acá
  sería mover el alcance de T-0012 a T-0010.
- *"El uso de `execFileSync` con `psql` en vez de un driver de Node (pg) es una
  decisión tomada sin ADR."* Descartado: D-0045 dice explícitamente "no elige driver ni
  capa de consulta [...] esa elección la toma la primera tarea que la necesite, con su
  propio ADR por R-05", y `cli.ts` lo repite en su comentario de cabecera citando R-01.
  No usar un driver sin consumidor todavía es la aplicación correcta de R-01, no un
  vacío.

## Sobre D-0048

Revisé `decisions.yaml` completo buscando algo aplicable a T-0010 que ni el contrato ni
la evidencia nombraran. La más cercana es **D-0048** ("Procedimiento de revisión ciega
por subagente aislado", `status: ACCEPTED`, fecha 2026-09-21, `source: T-0009; R-33`) —
que además es, literalmente, el procedimiento bajo el cual se me pidió ejecutar esta
misma revisión, y no aparece nombrada ni en el contrato de T-0010 ni en su evidencia
(ninguno de los dos podía nombrarla: T-0010 se cerró antes de que D-0048 existiera).
No es una decisión que T-0010 haya violado ni que debiera haber citado — es correcta esa
ausencia, dado el orden temporal — pero es la única decisión de `decisions.yaml` con
relación directa y no nombrada a esta tarea de revisión. Fuera de esa, no encontré
ninguna decisión `OPEN`, `PROVISIONAL` o `ACCEPTED` aplicable al contenido técnico de
T-0010 que no esté ya en `decisionRefs: [D-0012, D-0013, D-0045, D-0046, D-0047]`.

## Qué no revisé

- No probé el procedimiento de instalación en una máquina limpia (sin Homebrew, Node o
  pnpm previos): corrí todo sobre una máquina de desarrollo que ya tenía todo instalado,
  igual que el Entorno C de la propia evidencia. Ese límite ya está declarado en
  `ops/evidence/T-0010.md` punto 2 y lo confirmo, no lo cierro.
- No repetí el camino de `migrate` con una migración real (archivo `.sql` de verdad):
  el directorio `packages/db/migrations/` sigue vacío por diseño (`## Non-scope`), así
  que sólo pude ejercitar el "cero migraciones" (`pnpm db:create`/`db:reset` reportando
  "sin migraciones"), no el camino con archivos que la evidencia sólo probó en su
  Entorno B contra Postgres 16.
- No ejercité `EXCLUDE USING gist` con `btree_gist` sobre Postgres 17: sólo confirmé que
  la extensión se crea (`CREATE EXTENSION`), igual que hizo la evidencia. El caso
  negativo completo (dos intervalos solapados rechazados) sólo está probado, en toda la
  evidencia disponible, contra Postgres 16 — límite que la propia evidencia reconoce y
  que yo no cerré.
- No corrí nada contra CI (GitHub Actions): el workflow no cambia en este diff y no
  tengo forma de ejecutar ese pipeline desde acá. R-17 dice que el veredicto lo da CI,
  no la corrida local — ni la mía ni la del implementador reemplazan eso.
- No revisé el historial completo de commits intermedios de la rama (`806d10c`,
  `990bdce`, `5d4c86d`, `294e796`, `db82d42`) más allá de lo que el diff acumulado y la
  narrativa de la evidencia exponen; trabajé sobre el diff squasheado/acumulado que se
  me entregó, no sobre cada commit por separado.
- No pude evaluar si el trabajo se hizo efectivamente en "Claude (Cowork)" como afirma
  la evidencia — no tengo visibilidad de qué proveedor/cliente escribió cada commit; doy
  por buena esa afirmación sin poder verificarla independientemente.
- El `git status` sucio de `main` (cambios de T-0009/D-0048) es un hecho que registro
  pero no investigué a fondo ni intenté resolver — no es parte del alcance que se me
  pidió revisar (T-0010), y no lo toqué para no interferir con una sesión activa.
```

## Lectura de la coordinación sobre el reporte del subagente

- El subagente corrigió, sin que se lo pidiéramos, una imprecisión de su propio entorno:
  notó que su `pnpm check` (55/48) no coincide con el de la evidencia original de T-0010
  (39/47) y lo atribuyó correctamente a que corrió sobre un working tree con los cambios
  sin commitear de esta misma tarea (T-0009/R-33/D-0048) encima de `main` — no a una
  regresión de T-0010. Es correcto: esos archivos no están en el diff de T-0010.
- El único `Act on` posible que el subagente identificó explícitamente fue "ninguno", con
  argumento escrito — cumple la comprobación humana de la tarea sin necesidad de forzar
  un cambio artificial en T-0010, que ya está mergeado.
- La cita de **D-0048** cumple la comprobación humana de citar una decisión no nombrada
  por el implementador. Es un caso límite honesto: D-0048 no existía cuando T-0010 se
  cerró, así que su ausencia en el contrato de T-0010 no es un defecto de T-0010 — pero
  sigue siendo la decisión de `decisions.yaml` con la relación más directa y no nombrada,
  y el subagente lo dice así en vez de forzar una decisión ajena para cumplir el
  requisito.
- Los dos `Consider` (interpolación SQL sin escapar, bin sin shebang) son reales y
  quedan registrados acá para quien retome `packages/db` en T-0012; no se actuaron en
  esta tarea porque actuar sobre código de una tarea ya `DONE` y mergeada está fuera del
  `## Non-scope` de T-0009, que no incluye tocar T-0010.
