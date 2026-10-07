# Auditoría de Project OS — arquitectura, efectividad y portabilidad

**Fecha:** 2026-10-07 · **Workstream:** `POS` · **Tipo:** auditoría y diseño; no cambia
nada del arnés · **Base auditada:** `main` en `4a33102` (historia completa: 173 commits,
2026-09-07 → 2026-10-07)

Convención de este documento. Cada afirmación lleva una de tres marcas:

- **[H] Hecho observado**: se comprobó en el repositorio, en su historia de Git o en la
  API de GitHub Actions; se cita el path o el comando.
- **[I] Inferencia**: se deduce de hechos, pero no se observó directamente.
- **[R] Recomendación**: es una propuesta de este informe. No es una decisión ni cambia
  ninguna.

Nada de este informe resuelve una decisión `OPEN` de `decisions.yaml`, y ningún cambio
recomendado acá queda hecho por haberse escrito. Donde dos documentos se contradicen, el
informe lo señala y propone cómo resolverlo, sin elegir por su cuenta.

---

## 1. Conclusión ejecutiva

1. **[H] Project OS es hoy un arnés de desarrollo hecho con archivos, más un CI**: un
   contrato de tarea validado por un checker, un índice de decisiones validado por el
   mismo checker, un artefacto de evidencia por tarea, un procedimiento manual de
   revisión ciega, un job de CI que congela el contrato de tarea, reglas de denegación y
   un hook de Bash de Claude Code, y un ledger de sesiones escrito por hooks de Claude
   Code. No es una aplicación ni una plataforma, y no ejecuta agentes.
2. **[H] Lo que más valor demostró es independiente del proveedor y casi todo es
   genérico.** La revisión ciega encontró al menos un `Act on` en 9 de las 10 tareas
   `FEATURE`/`MIGRATION` y devolvió STOP en 3 de ellas (§4.5). El checker y el CI
   bloquean merges. El contrato con `Non-scope` y `Verification` está en las 26 tareas.
3. **[H] Lo que menos valor demostró es el ledger de AgentRuns.** Tiene 25 runs
   versionados, todos de Claude Code. Solo 8 de las 21 tareas `DONE` (38 %) tienen un
   `runId` en su evidencia, y no existe ningún script que consulte el ledger. Las
   sesiones de Codex y de Claude Cowork, que implementaron o cerraron al menos 7 tareas,
   no aparecen en él (§4.2).
4. **[H] Project OS ya se usa con varios agentes, aunque solo soporta uno.** Hubo
   Claude Code, Codex y Claude Cowork. Solo Claude Code dispara los hooks, la
   denegación de rutas y el ledger. `D-0016` dice que el arnés soporta únicamente
   Claude Code, y la práctica lo desbordó sin que eso quedara registrado como decisión
   (§9). No es "multi-modelo": es Claude Code más un CI y unos documentos que cualquier
   agente puede leer.
5. **[H] El costo de proceso es real, pero acotado y concentrado en el arranque.** 7 de
   las primeras 10 tareas fueron `POS`; desde el 2026-09-20 no se creó ninguna tarea
   `POS`, y desde el 2026-09-23 nadie tocó el arnés (12 commits en 17 días, después
   cero en 14). En las tareas de producto, el proceso escrito ronda las 0,56 líneas por
   línea de código (mediana; rango 0,37–2,17), y pesa más cuanto más chica es la tarea
   (§5).
6. **[H] El modo de falla más caro que se observó no lo previene ningún mecanismo.** Los
   archivos de instrucciones que todo agente carga al arrancar están desactualizados:
   `AGENTS.md`, `CLAUDE.md` y `README.md` afirman cosas que dejaron de ser ciertas
   entre una y cuatro semanas atrás (§5.3).
7. **[R] Recomendación de extracción: estrategia A.** Copiar a mano, para el segundo
   proyecto, un perfil mínimo ("Project OS Lite", §7). No crear todavía un repositorio
   plantilla ni una biblioteca compartida. La hipótesis de trabajo se sostiene con la
   evidencia y se le agregan dos precisiones:
   (a) lo que se copia es **menos** de lo que la hipótesis sugiere: sin ledger, sin hook
   de Bash, sin evidencia obligatoria, sin congelamiento del contrato el día 1;
   (b) el primer arreglo que necesita Project OS no es de portabilidad, es de
   veracidad: reconciliar `D-0016` y los archivos de instrucciones con la realidad.
8. **[R] Disparadores de extracción** derivados de la tasa de cambio observada del
   arnés (§11). Con dos proyectos, mantener una copia cuesta, según esa tasa, menos de
   una hora por mes, y una biblioteca cuesta más que eso.

---

## 2. Qué es Project OS hoy

**[H]** Según `PROJECT.md` §1, es "el método y las herramientas mínimas para desarrollar
Broker OS con humanos y modelos de IA, de forma medible y sin quedar acoplados a un
proveedor". `PROJECT.md` §3 y `D-0015` lo fijan como "Project OS Zero": un repositorio,
sin base de datos, servicio, adapters ni UI.

**[H]** Lo que efectivamente existe, en capas:

| Capa | Qué es | Dónde |
|---|---|---|
| Documentos de instrucciones | Contrato operativo y reglas | `AGENTS.md`, `CLAUDE.md`, `ENGINEERING_RULES.md`, `PROJECT.md` |
| Contrato de tarea | Frontmatter y cuatro secciones obligatorias | `TASKS/_TEMPLATE.md`, `TASKS/T-*.md` (26) |
| Decisiones | Índice que se lee por máquina, más ADRs | `decisions.yaml` (66 decisiones), `DECISIONS/` (29 ADR + plantilla) |
| Validación estática | Checker de decisiones, tareas, evidencia, WIP y referencias | `scripts/check-docs.mjs` (245 líneas) |
| Congelamiento del contrato | Diff de las cuatro secciones contra el merge-base | `scripts/check-task-contract.mjs` (144 líneas) |
| CI | Un workflow con un único job, `check` | `.github/workflows/project-os-check.yml` |
| Guardrails de Claude Code | `permissions.deny` y un PreToolUse para Bash | `.claude/settings.json`, `.claude/hooks/protect-paths.mjs` (133 líneas) |
| Ledger | SessionStart y SessionEnd escriben JSONL append-only | `scripts/record-agent-run.mjs`, `ops/runs/*.jsonl`, `ops/AGENTRUN.md` |
| Evidencia | Un archivo por tarea `DONE` | `ops/evidence/` (21 archivos de tarea + anexos) |
| Revisión ciega | Procedimiento manual con reporte versionado | `ENGINEERING_RULES.md` R-33, `D-0048`, `D-0052`, `REVIEWS/` |
| Slices | Contrato de aceptación por incremento | `SLICES/VS01.md`, `SLICES/CO01.md` |

**[H]** También hay mecanismos de producto que protegen a Project OS, aunque no son
Project OS: `scripts/guard-db-tests.mjs` impide correr tests de integración contra un
Postgres que no sea local (motivo: `D-0053`, datos reales). El límite de módulos por
lint está en `eslint.config.js` (R-25).

**[H]** Lo que **no** existe, aunque los documentos lo mencionen o lo anticipen:

- Ninguna configuración deriva permisos de `riskClass`. `AGENTS.md` ("Los permisos se
  derivan de `riskClass` y se hacen cumplir por configuración") y `TASKS/_TEMPLATE.md`
  lo afirman. `riskClass` solo se valida como enum en `scripts/check-docs.mjs:148`, y
  `.claude/settings.json` es estático.
- No hay skills ni subagentes definidos. `.claude/README.md` los lista como "próximo
  paso" y `.claude/` contiene solo `settings.json`, `hooks/` y el README.
- Nada consume `contextRefs` más allá de comprobar que sea una lista
  (`scripts/check-docs.mjs:137`).
- Ningún script consulta el ledger. El criterio de promoción de `D-0015` exige "el
  tercer script ad-hoc escrito para consultarlos", y hay cero.
- No se derivan tokens ni costo. `ops/AGENTRUN.md` los deja "para después".

---

## 3. Inventario de componentes

Columnas: **Exec** = cuándo ejecuta. **Enf** = si se hace cumplir automáticamente (A),
solo por documento (D) o por procedimiento humano (P). **Uso** = evidencia de uso real.

| # | Mecanismo | Propósito y falla que previene | Fuente | Exec | Consumidor | Enf | Uso |
|---|---|---|---|---|---|---|---|
| 1 | Contrato de tarea | Scope creep y "Done" subjetivo (R-06, R-08) | `TASKS/_TEMPLATE.md`, `check-docs.mjs:114-190` | `pnpm check`, CI | Implementador, revisor, CI | A (estructura) | 26 tareas; 100 % con las 4 secciones (el checker lo exige) |
| 2 | Ciclo de vida de la tarea y WIP | Meta-trabajo que desplaza al producto (`PROJECT.md` §5) | `check-docs.mjs:198-202` | `pnpm check` | Owner | A (solo cuenta `ACTIVE`) | 29 commits con `status: ACTIVE`; ver la excepción de T-0021 en §5.3 |
| 3 | Congelamiento del contrato | Que la rama que implementa afloje su propio contrato | `check-task-contract.mjs`, step del workflow | CI en cada PR | CI | A | Activo desde 2026-09-21; 3 fallos provocados a propósito (T-0005) |
| 4 | Convención de rama | Unir runs, diffs y tareas sin construir nada (R-29) | `check-task-contract.mjs:16-17` | CI | Ledger, contrato | A | 33 de 43 PRs con `task/`; 10 con prefijo exento |
| 5 | `decisions.yaml` y ADR | Decidir en silencio, decisiones duplicadas (R-03, R-04) | `decisions.yaml`, `DECISIONS/`, `check-docs.mjs:24-106` | `pnpm check` | Agentes, revisor | A (estructura, enlaces bidireccionales) | 66 decisiones en 26 días |
| 6 | Estado de decisiones generado | Que la prosa contradiga el índice | `scripts/decisions.mjs`, `check-docs.mjs:214-236` | Manual; checker | Humano | A (prohíbe escribir estados en la prosa) | Absorbió T-0007 (`DROPPED`) |
| 7 | Evidencia por tarea | Verificación no ejecutada o resumida en vez de literal (R-09b) | `check-docs.mjs:176-189` | `pnpm check` en `DONE` | Revisor humano | A (existencia y 3 secciones). **El encabezado de procedencia no se valida** | 21 de 21 `DONE` |
| 8 | Revisión ciega | Que un check verde pruebe un test equivocado (R-33) | `ENGINEERING_RULES.md` R-33, `D-0048`, `D-0052` | Manual, antes del merge | Owner | P (sin CI, a propósito) | 10 de 10 `FEATURE`/`MIGRATION` `DONE`, 15 reportes |
| 9 | CI `project-os-check` | Que un hook local se tome por un control (R-17) | `.github/workflows/project-os-check.yml` | `pull_request` a `main` | Protección de `main` | A (check requerido, según T-0003) | 90 runs: 72 verdes, 10 rojos, 8 cancelados |
| 10 | `permissions.deny` | Que el agente lea secretos o edite sus guardrails (R-15, R-18) | `.claude/settings.json:3-21` | Cada tool call de Claude Code | Claude Code | A, solo en Claude Code | Sin registro de denegaciones (no hay log) |
| 11 | Hook `protect-paths` | Que un Bash escriba en `.claude/` o `.github/workflows/` (D-0056) | `.claude/hooks/protect-paths.mjs`, `scripts/tests/protect-paths.test.mjs` | PreToolUse Bash, Claude Code | Claude Code | A, solo en Claude Code | Pruebas provocadas (`ops/evidence/D-0056.md`); 4 falsos positivos en esta auditoría (§4.4) |
| 12 | Ledger de AgentRun | Pérdida irreversible de datos de ejecución (ADR-0015) | `scripts/record-agent-run.mjs`, `ops/AGENTRUN.md`, `ops/runs/` | SessionStart y SessionEnd, Claude Code | Encabezados de evidencia | A para escribir; **D para commitear** | 25 runs versionados (§4.2) |
| 13 | Test del ledger | Que la correlación del ledger se rompa | `scripts/check-agent-run.mjs` | `pnpm check` | CI | A | Corre en cada check |
| 14 | Propuestas de guardrails | Que el agente aplique cambios a archivos protegidos | `REVIEWS/T-0005/`, `REVIEWS/T-0008/`, `REVIEWS/T-0012/` (`*.proposed.*`) | Manual | Humano que copia | P | 3 veces |
| 15 | Instrucciones de proveedor | Contexto compartido entre agentes (D-0018, R-12b) | `AGENTS.md`, `CLAUDE.md` | Al iniciar la sesión | Todo agente | D | Cargados siempre. **Desactualizados** (§5.3) |
| 16 | Slices | Contrato de aceptación por incremento | `SLICES/`, `check-docs.mjs:204-216` | Manual; checker de referencias | Owner | A (refs) y P | 2 slices; VS01 aceptado con medición |
| 17 | Higiene mensual | Que crezca el contexto cargado (R-31) | `ENGINEERING_RULES.md` R-31 | Mensual | Owner | D | Sin evidencia en el repo; el primer mes recién se cumple |
| 18 | Benchmark sin configuración de usuario | Runs comparativos no reproducibles (R-11) | `record-agent-run.mjs:32-34,133-141` | Con `AGENTRUN_SETTING_SOURCES` | Ledger | D | No hubo benchmarks; `settingSources` vale `unknown` en 36 de 46 eventos |
| 19 | Plan mode en HIGH y en cambios a `DOMAIN.md` | Cambios de alto impacto sin plan | `CLAUDE.md` | — | Claude Code | D | No es observable |

---

## 4. Evidencia de uso

### 4.1 Volumen

- **[H]** 173 commits; 43 PRs mergeados (33 desde ramas `task/`, 5 desde `chore/`, 5
  desde `docs/`) (`git log --merges`).
- **[H]** 26 tareas: 21 `DONE`, 2 `DROPPED`, 2 `READY`, 1 `DRAFT`. Las 21 `DONE` son 8
  `FEATURE`, 2 `MIGRATION`, 7 `CHORE`, 3 `REVIEW` y 1 `SPIKE`. Por workstream hay 8
  `POS`, todas entre T-0001 y T-0010; ninguna posterior.
- **[H]** 66 decisiones: 47 `ACCEPTED`, 8 `PROVISIONAL`, 9 `OPEN` y 2 `SUPERSEDED`.
  29 tienen ADR. Unas 11 son de Project OS (`D-0011`, `D-0015` a `D-0018`, `D-0042` a
  `D-0044`, `D-0048`, `D-0052`, `D-0056`). El resto son de dominio, de infraestructura
  de Broker OS o de migración.

### 4.2 Ledger de AgentRun

Métricas calculadas sobre los 12 archivos versionados de `ops/runs/`, con un script
de solo lectura que no se versiona:

| Métrica | Valor |
|---|---|
| Eventos / runs | 46 / 25 |
| Runs cerrados (`RUN_ENDED`) | 21; 4 quedan `RUNNING` |
| `provider` | `claude-code` en 46 de 46 |
| `providerRaw.model` presente | 21 eventos; tres identificadores distintos de la familia Claude |
| `taskId` presente | 15 de 25 runs |
| `settingSources` | `project` en 10, `unknown` en 36 |
| Duración de los runs cerrados | 10 de 21 duran menos de 3 min; mediana ≈ 35 min |
| `transcriptPath` con un home de usuario absoluto | 45 de 46 eventos |
| Scripts que consultan el ledger | 0 |
| Tareas `DONE` con `runId` en su evidencia | 8 de 21 (T-0001, T-0005, T-0008, T-0012, T-0013, T-0018, T-0024, T-0025) |

**[H]** Por qué faltan runs, según la propia evidencia: Codex en T-0005 (continuación),
T-0008 (autoría), T-0016 y T-0019; Claude Cowork en T-0006, el cierre de T-0009 y T-0010;
sin explicación o sin buscar en T-0003, T-0004, T-0011, T-0015 y T-0017. T-0020, T-0022 y
T-0023 no tienen encabezado de procedencia.

**[H]** En los commits, los co-autores declarados son modelos de Claude, en 73 trailers.
Codex no deja trailer, así que el historial de Git tampoco sirve para medir su uso.

**[I]** Los runs de menos de 3 minutos parecen, en su mayoría, sesiones de prueba del
propio hook o de apertura y cierre: los 4 del 2026-09-08 son de T-0001. Si se descuentan,
quedan unos 15 runs "reales". El criterio de 30 runs de `D-0015` está más lejos de lo que
sugiere el conteo bruto, y además solo cuenta Claude Code.

**[H]** Esta sesión de auditoría ilustra el problema de retención. Su SessionStart
escribió `ops/runs/2026-10-07.jsonl` en el árbol de trabajo, sin versionar. En una
sesión cloud efímera, el evento se pierde si no se commitea. En una sesión que sí
commitea, se versiona un `transcriptPath` que apunta a un contenedor que ya no existe.
Este informe **no** commitea ese archivo.

### 4.3 CI

**[H]** Datos de la API de GitHub Actions: 90 runs de "Project OS check", 72 verdes, 10
rojos y 8 cancelados. De los 10 rojos, 4 fueron provocados a propósito: el run
`34245754018` de T-0003 y los runs `35599757030`, `35599767035` y `35599780245` de T-0005.
Los otros 6 están en `task/T-0012-…` (3), `task/T-0013-…`, `task/D-0056-…` y
`t-0021/fase-0-…`.

**[I]** Los dos últimos nombres de rama no cumplen la regex `^task\/(T-\d{4})-` de
`check-task-contract.mjs:17`, y el trabajo de D-0056 se mergeó después desde
`chore/D-0056-session-trust-bash`. Es probable que el check de nombre de rama los haya
frenado. La cola de los logs que devuelve la API no muestra el paso que falló, así que
esto no se verificó. Los 3 rojos de T-0012 coinciden con la falta de Postgres en CI que
documenta `REVIEWS/T-0012/README.md`.

### 4.4 Hooks

- **[H]** SessionStart y SessionEnd se disparan; el ledger es la prueba.
- **[H]** PreToolUse `protect-paths` se dispara. Las denegaciones que constan son
  pruebas provocadas (`ops/evidence/D-0056.md`, `ops/evidence/T-0008-hook-session.jsonl`).
  **No hay ningún registro de que haya frenado una escritura no intencional.**
- **[H]** Durante esta auditoría, el hook denegó 4 comandos de **solo lectura** de
  unos 35: un `git status && … ls .claude`, un `diff -q` contra
  `.claude/hooks/protect-paths.mjs`, un `cat … | md5sum` y un `awk` cuyo texto incluía
  la cadena `.claude`. `ops/evidence/D-0056.md` ya lo había documentado: "cualquier
  comando propio que mencionara `.claude` … incluso `git diff -- .claude` … también
  recibió deny".
- **[H]** `D-0044` fue reemplazada por `D-0056` a los 3 días porque "la tasa de
  solicitudes sobre el trabajo habitual hizo inviable el control" (`decisions.yaml`).
  Es la única regla de Project OS falsada por fricción.

### 4.5 Revisión ciega

| Tarea | Kind / riesgo | Rondas | Veredicto inicial | `Act on` |
|---|---|---|---|---|
| T-0012 | FEATURE / MEDIUM | 1 + cierre en frío | STOP | 3 BLOCKER + 8 MAJOR (`PROJECT.md` §3) |
| T-0013 | MIGRATION / HIGH | 1 | — | ≥ 1 ("Hallazgo central") |
| T-0016 | FEATURE / MEDIUM | 2 | STOP → PASS | sí |
| T-0017 | FEATURE / MEDIUM | 1 | sin `Act on` | 0 |
| T-0018 | FEATURE / MEDIUM | 2 | Aprobar con cambios | 3 |
| T-0019 | FEATURE / MEDIUM | 3 | STOP → STOP → PASS | sí |
| T-0022 | FEATURE / MEDIUM | 1 | — | sí |
| T-0023 | MIGRATION / LOW | 1 | — | sí |
| T-0024 | FEATURE / MEDIUM | 1 | — | sí |
| T-0025 | FEATURE / MEDIUM | 1 | — | sí, incluida la falta de R-09b en la evidencia |

**[H]** Se cumple `D-0052` al 100 % sin enforcement automático. El reporte de T-0012 lo
firmó Codex ("**Reviewer:** Codex", `REVIEWS/T-0012/blind-review.md:3`), no un
subagente del mismo proveedor.

**[I]** Esa revisión entre proveedores es un dato, con n = 1, para la pregunta abierta
`D-0043`. No quedó registrada como tal. Este informe no la resuelve.

**[H]** `ENGINEERING_RULES.md` R-33 documenta el contraste que dio origen a la regla:
T-0010 (`CHORE`/LOW) sin hallazgos y T-0012 con STOP.

### 4.6 Sincronía entre tareas e implementación

- **[H]** T-0021 está `DRAFT` en `main`, pero se mergearon 8 PRs de sus fases (#54 a #61,
  del 2026-10-05 al 2026-10-06). El checker de WIP solo cuenta `ACTIVE`
  (`check-docs.mjs:198`), así que un spike en ejecución con estado `DRAFT` queda fuera
  del límite de un spike a la vez y fuera de la exigencia de evidencia.
- **[H]** Para implementar, el contrato tiene que estar antes en `main`
  (`check-task-contract.mjs:114-117`). Eso genera PRs propios solo de contrato:
  `chore/t0025-ui-co01` y `chore/t0026-despliegue-co01` (solo agregan el archivo de
  tarea), `chore/d0066-t0024`, `docs/crear-t-0019-asociacion-documental` y
  `docs/cerrar-contratos-vs01-t0017-t0018`. A eso se suma la enmienda legítima de un
  contrato congelado, `chore/t0024-verification`, que cambia 2 líneas de
  `## Verification`. Son unos 7 de 43 PRs (≈16 %) que existen para administrar
  contratos.

---

## 5. Valor frente a fricción

### 5.1 Costo de proceso medido

**[H]** Churn de líneas (adiciones + borrados) en commits sin merge, por categoría.
Se excluye `SPIKES/T-0021/` (33.527 líneas, 41 % del total, sobre todo datos sintéticos
de Risk OS):

| Categoría | Líneas | % del resto |
|---|---|---|
| Código de producto (`packages/`, `apps/`, `contexts/`) + scripts de producto | 20.461 | 42 % |
| Evidencia (`ops/evidence/`) | 6.444 | 13 % |
| Revisiones (`REVIEWS/`) | 4.765 | 10 % |
| Tareas (`TASKS/`) | 3.877 | 8 % |
| Decisiones (`decisions.yaml`, `DECISIONS/`) | 3.143 | 6 % |
| `DOMAIN.md` | 2.426 | 5 % |
| Tooling, guardrails, ledger y documentos canónicos de Project OS | 2.746 | 6 % |
| Resto (lockfile, docs, slices, otros spikes) | ≈ 4.540 | 9 % |

**[H]** Por tarea, tomando commits cuyo asunto nombra el id:

| Tarea | Código | Evidencia + revisiones + tarea + decisiones | Proceso / código |
|---|---|---|---|
| T-0012 | 2.257 | 3.351 | 1,48 |
| T-0013 | 4.505 | 2.513 | 0,56 |
| T-0016 | 3.310 | 2.601 | 0,79 |
| T-0017 | 1.501 | 850 | 0,57 |
| T-0018 | 4.554 | 2.025 | 0,44 |
| T-0019 | 610 | 1.323 | 2,17 |
| T-0022 | 1.726 | 630 | 0,37 |
| T-0023 | 500 | 497 | 0,99 |
| T-0024 | 2.177 | 1.194 | 0,55 |
| T-0025 | 3.040 | 1.342 | 0,44 |

**[I]** La mediana es ≈ 0,56. Lo que hay detrás es un costo fijo por tarea, no
proporcional. Las dos tareas con más de 1 línea de proceso por línea de código son la
más chica (T-0019, 610 líneas) y la primera de su tipo (T-0012). Para un desarrollador
solo, el costo pesa más en los cambios chicos.

**[H]** La evidencia crece: las evidencias de `FEATURE` pasan de 6,8 KB (T-0017) a 36 KB
(T-0024) y 41 KB (T-0025). La más grande del repositorio es la de un `CHORE`: T-0005,
con 43 KB.

**[I]** Parte de ese costo no es meta-trabajo. Las decisiones son sobre todo diseño de
dominio, y la evidencia de T-0018 es la aceptación de VS01 con medición. Lo que
estrictamente "mantiene a Project OS" (tooling, guardrails, ledger y documentos
canónicos) es el 6 % y está congelado desde el 2026-09-23.

### 5.2 Qué aportó valor medible

| Mecanismo | Evidencia de valor | Juicio |
|---|---|---|
| Revisión ciega | 9 de 10 con `Act on`, 3 STOP sobre diffs con check verde | **[I]** El de mayor valor demostrado. Su costo (unas 4.765 líneas y hasta 3 rondas) se paga con defectos reales encontrados antes del merge |
| CI + checker | 90 runs; bloquea merges; detectó el workflow sin Postgres en T-0012 | **[I]** Barato y autoritativo. Es la base de R-17 |
| `Non-scope` y `Verification` | Presentes en todas las tareas; la revisión ciega los usa como vara | **[I]** Son el insumo que hace posible la revisión ciega |
| `decisions.yaml` + checker de estados | T-0007 se absorbió: los estados ya no se escriben a mano | **[I]** Bueno como mecanismo. El contenido crece rápido (66 en 26 días) |
| `guard-db-tests.mjs` | Protege la base con datos reales (D-0053) | **[I]** Control de producto, no de Project OS, y de alto valor |

### 5.3 Qué genera fricción o no se sostiene

1. **[H] Instrucciones que se cargan siempre y están desactualizadas.** Es el problema
   más grave del sistema, porque es lo primero que ve cualquier agente.
   - `AGENTS.md` (último cambio: 2026-09-21) dice "No hay importación, ni UI, ni
     endpoints, ni autorización". Existen el importador de T-0013,
     `apps/web/src/app/{login,api,buscar}` con OIDC (`D-0059`, `D-0060`) y
     `apps/communication/src/app/{webhook,api,login}`.
   - `CLAUDE.md` (último cambio: 2026-09-20) dice que "`typecheck`, `lint` y `test`
     **todavía no están dentro de `pnpm check`**" y que "No hay `dev`". `package.json`
     incluye los tres en `check` y define `dev`.
   - `README.md` (último cambio: 2026-09-07) dice "Todavía no hay código de aplicación".
   - `.claude/README.md` lista solo `settings.json` como "Qué hay hoy" y omite el hook.
   - El hook instalado conserva el encabezado "Propuesta: se instala por revisión
     humana" (`.claude/hooks/protect-paths.mjs:1`).
   - `PROJECT.md` §3 repite "cero importación, cero UI, cero endpoints, cero
     autorización" en un párrafo, y unos párrafos más abajo describe VS01 entregado con
     UI y login.

   El checker valida referencias a decisiones y prohíbe que la prosa afirme estados de
   decisiones (R-04), pero nada valida los estados del programa que esa prosa afirma.
   **[I]** El patrón del problema es claro: el estado del programa está escrito en
   cuatro lugares y solo uno (`PROJECT.md`) se mantiene.

2. **[H] El ledger es un producto que se escribe y casi no se lee.** Ver §4.2. Sus
   únicos consumidores son los encabezados de la evidencia, y en el 62 % de las tareas
   `DONE` esos encabezados declaran que el run falta. Versiona, además, rutas con el
   nombre de usuario del desarrollador en 45 de 46 eventos.

3. **[H] El hook de Bash da falsos positivos en lecturas** (§4.4) y solo protege
   sesiones de Claude Code. Codex y Cowork lo esquivan sin intentarlo.

4. **[H] El encabezado de procedencia de R-09b no se valida**, y T-0020, T-0022 y
   T-0023 no lo tienen. `REVIEWS/T-0025-blind-review.md` lo marcó como hallazgo A2. La
   regla dice "obligatorio", el checker no lo hace cumplir, y la revisión humana lo
   detecta a veces.

5. **[H] El estado `DRAFT` sirvió de salida no prevista para T-0021** (§4.6).

6. **[H] Las propuestas de guardrails se acumulan en `REVIEWS/`.**
   `REVIEWS/T-0005/project-os-check.proposed.yml` (44 líneas) quedó obsoleta frente al
   workflow actual (93 líneas). **[I]** `REVIEWS/T-0012/…proposed.yml` (93 líneas) y
   `REVIEWS/T-0008/protect-paths.proposed.mjs` (133 líneas) tienen las mismas líneas
   que los archivos instalados y probablemente son idénticas. El propio hook impide un
   `diff` directo, así que no se comprobó byte a byte. Son copias que alguien tiene que
   saber ignorar.

### 5.4 ¿Project OS produce trabajo para mantenerse a sí mismo?

**[H]** Lo hizo entre el 2026-09-07 y el 2026-09-23: 8 tareas `POS`, 12 commits al arnés,
y una revisión ciega sobre la propia regla de revisión ciega (T-0009). Desde el
2026-09-23 no lo hace: ningún commit al arnés, ninguna tarea `POS`, y se entregaron
T-0019, T-0022 a T-0025, T-0020 y 8 fases de T-0021.

**[I]** El meta-trabajo que sigue vivo hoy es distribuido, no concentrado. Son los PRs
solo de contrato (≈16 %), los encabezados de evidencia que explican por qué falta un
`runId`, y las secciones de "Qué NO se verificó" que crecen con cada tarea. Ninguno es
grande por sí solo; juntos son el costo fijo por tarea de §5.1.

---

## 6. Clasificación: genérico frente a Del Campo

Una sola categoría primaria por componente.

| Componente | Categoría | Por qué |
|---|---|---|
| Contrato de tarea (frontmatter + Why / Outcome / Non-scope / Verification) | **GENERIC — copy now** | Ningún término de dominio. Es la base de la revisión ciega y de R-06/R-08 |
| `TASKS/_TEMPLATE.md` | **GENERIC — copy now** (recortado) | Hay que quitar `workstream: POS/BOS/MIG` y la referencia a R-09b |
| `decisions.yaml` (esquema) + `DECISIONS/0000-template.md` | **GENERIC — copy now** | El esquema `status` / `falsified_by` / `unblocked_by` es genérico. **El contenido es 100 % Del Campo** y no se copia |
| `scripts/check-docs.mjs` | **GENERIC — copy now** (recortado) | Tiene literales de Del Campo: `WORKSTREAM = ['POS','BOS','MIG']`, nombres de sección de evidencia en español, `SLICES/`, la lista `canonicalFiles` |
| `scripts/decisions.mjs` | **GENERIC — copy now** | 38 líneas, sin dominio |
| CI que corre `check` + tests | **GENERIC — copy now** | El servicio Postgres y los pasos `db:*` son de este stack |
| `permissions.deny` (secretos, guardrails, force-push) | **GENERIC — copy now** | Barato, sin falsos positivos observados |
| `AGENTS.md` como archivo neutral + `CLAUDE.md` que lo importa (D-0018) | **GENERIC — copy now** (la estructura) | El patrón es genérico. **El texto actual es DEL-CAMPO-SPECIFIC**: correduría de seguros, R-14, Drive, aseguradoras |
| `ENGINEERING_RULES.md` R-01 a R-13, R-15, R-17, R-18, R-24 a R-30 | **GENERIC — optional** | Son reglas genéricas, pero 33 reglas el día 1 son demasiadas. Arrancar con 8 a 10 |
| `ENGINEERING_RULES.md` R-14, R-16, R-19 a R-23 | **DEL-CAMPO-SPECIFIC** | Acciones de negocio de una correduría, clases de agente sobre datos de clientes, BusinessAuditEvent, cutover de Zoho |
| Revisión ciega (R-33, D-0048) | **GENERIC — optional** | Es el mecanismo de mayor valor, pero su valor sigue al riesgo del diff (R-33). Se activa con la primera `FEATURE` que toque datos o lógica central |
| Evidencia por tarea (R-09b) | **GENERIC — optional** | Genérica. Su costo (6.444 líneas) se justifica cuando hay datos reales o un tercero que audita |
| Congelamiento del contrato (`check-task-contract.mjs`) | **GENERIC — optional** | Previene una falla que con un solo desarrollador nunca se observó fuera de pruebas. Cuesta ≈16 % de PRs administrativos |
| WIP limit en el checker | **GENERIC — optional** | Una línea de código; su valor depende de que los estados se mantengan (T-0021) |
| `SLICES/` | **GENERIC — optional** | Útil cuando hay aceptación medible con un usuario |
| Hook `protect-paths.mjs` | **PREMATURE ABSTRACTION** | Un parser de shell de 133 líneas para un riesgo (que el agente edite sus guardrails por Bash) que `permissions.deny` + PR + CI cubren en gran parte. Da falsos positivos y solo cubre Claude Code. Justificado si se trabaja habitualmente en `auto` o `bypass` |
| Ledger de AgentRun (`record-agent-run.mjs`, `check-agent-run.mjs`, `ops/AGENTRUN.md`) | **PREMATURE ABSTRACTION** | Captura y correlación robustas, pero sin consumidor, con una cobertura del 38 % y sin tokens ni costo. Su falla objetivo ("información perdida para siempre") se materializó igual para Codex y Cowork |
| Promoción de `D-0015` (30 runs + 3 scripts) | **PREMATURE ABSTRACTION** | Una métrica que solo ve un proveedor no puede medir un método multi-agente |
| `R-11` / `settingSources` | **PREMATURE ABSTRACTION** | Prepara benchmarks de proveedores que no existen; `unknown` en el 78 % de los eventos |
| `R-31` (higiene mensual de contexto) | **GENERIC — optional** | Es barata, pero no tiene evidencia todavía |
| Archivos `*.proposed.*` en `REVIEWS/` | **OBSOLETE / REDUNDANT** | Una vez aplicados, duplican el archivo instalado o quedan desfasados (T-0005) |
| Bloque de estado del programa en `AGENTS.md`, `CLAUDE.md` y `README.md` | **OBSOLETE / REDUNDANT** | Duplica `PROJECT.md` y está desactualizado (§5.3) |
| `.claude/README.md` § "Qué falta" (skills y subagentes planeados) | **OBSOLETE / REDUNDANT** | Ninguno se escribió en un mes. Es una promesa que ocupa contexto |
| `DOMAIN.md`, `SLICES/*.md`, `decisions.yaml` (contenido), `ops/evidence/`, `ops/runs/`, `REVIEWS/`, `SPIKES/` | **DEL-CAMPO-SPECIFIC** | Conocimiento de dominio, datos de casos o evidencia de un cliente. No pueden salir de este repositorio |
| `scripts/guard-db-tests.mjs` | **DEL-CAMPO-SPECIFIC** (por motivo) | La técnica (solo hosts locales) es genérica; el motivo (D-0053) y los nombres de base son de este proyecto. Se copia la idea cuando el proyecto 2 tenga datos reales |

---

## 7. Perfil mínimo para un segundo repositorio ("Project OS Lite")

Premisas: otro cliente, otro dominio, un desarrollador, sin datos de producción el día 1.
Las exigencias de aislamiento (credenciales, datos, sesiones, costo por proveedor) se
resuelven casi todas **fuera** del repositorio.

### Día 1

**[R]** Aislamiento, antes de escribir un archivo:

- Repositorio nuevo, **ni fork ni copia del historial** de `del-campo`. Un template
  generado desde este repositorio arrastraría la historia y los nombres.
- Cuenta o workspace propio en cada proveedor de IA (API key, proyecto o workspace).
  Así la atribución de uso y costo sale de la facturación del proveedor y no de un
  ledger. El ledger actual no mide costo (`ops/AGENTRUN.md`, "Campos deliberadamente
  ausentes").
- `.env` propio, credenciales propias y Drive o almacenamiento propio.
- Las sesiones de agente se abren desde el path del nuevo repositorio. La memoria por
  proyecto de Claude Code se indexa por path. **[I]** `~/.claude/` no debe tener
  instrucciones semánticas de ningún cliente (R-10); hoy ya es así por regla.

**[R]** Archivos, tomando como fuente los de Del Campo y reescribiéndolos, no
copiándolos tal cual:

1. `AGENTS.md` de no más de 60 a 80 líneas: rol, "antes de empezar", tabla de dónde está
   el contexto, aprobación humana. **Sin bloque de estado del programa**: solo un
   puntero a `PROJECT.md`.
2. `CLAUDE.md` = `@AGENTS.md` + comandos. Sin repetir estado.
3. `PROJECT.md`: qué se construye, fase, WIP limit, mapa de documentos. Es el único
   lugar con estado.
4. `ENGINEERING_RULES.md` con unas 10 reglas: R-01, R-02, R-03/R-04 (decisiones en un
   solo lugar), R-05 (disparadores de ADR), R-06/R-07/R-08 (contrato), R-13 (acciones de
   ingeniería), R-15, R-17, R-18. Numeración propia, sin heredar los ids de Del Campo.
5. `TASKS/_TEMPLATE.md` recortado.
6. `decisions.yaml` vacío + `DECISIONS/0000-template.md`.
7. `scripts/check-docs.mjs` recortado: decisiones, tareas y WIP. Sin evidencia, sin
   slices y con la lista de workstreams vacía o propia.
8. `scripts/decisions.mjs`.
9. `.github/workflows/check.yml`: `check` + typecheck + lint + tests, como check
   requerido; `main` protegida.
10. `.claude/settings.json` solo con `permissions.deny` (secretos, `.claude/**`,
    workflows, force-push, `reset --hard`, `rm -rf`). Sin hooks.

### Después, cuando aparezca la señal

| Activar | Cuando |
|---|---|
| Revisión ciega obligatoria en `FEATURE`/`MIGRATION` | Primera tarea que toque lógica central o datos persistidos. En Del Campo, la primera de ese tipo (T-0012) dio STOP |
| Evidencia por tarea (R-09b) | Primer dato de producción, primer tercero que audite, o primera "Done" que resulte falsa |
| Guarda de tests contra bases no locales | Primer dato real en una base hosteada |
| Congelamiento del contrato en CI | Segundo contribuidor, o una vez observado que un agente afloja `Verification` en su rama |
| Hook de Bash para rutas protegidas | Uso habitual de modos `auto` o `bypass`, o un intento observado de editar guardrails por Bash |
| Ledger de sesiones | Una pregunta concreta que el ledger responda y git o la facturación no, con un consumidor escrito |
| Reglas de datos por clase de agente (tipo R-19) | Primer dato personal de clientes |
| Reglas de acciones de negocio (tipo R-14) | Primer agente con efecto externo |
| `SLICES/` | Primer incremento con aceptación medible por un usuario |
| Requisitos regulatorios o de seguridad | Según la norma concreta; no se anticipan |

---

## 8. Qué NO copiar

- **[R]** Ningún contenido: `DOMAIN.md`, `decisions.yaml` (entradas), `DECISIONS/0001…`,
  `SLICES/`, `ops/evidence/`, `ops/runs/`, `REVIEWS/`, `SPIKES/`, `docs/migration`,
  `scripts/*zoho*`, `scripts/vs01/`.
- **[R]** El texto de `AGENTS.md` y de `ENGINEERING_RULES.md` tal cual. Contienen la
  descripción del negocio, R-14 (Drive, aseguradoras), R-19 (clases de agente sobre
  datos de clientes) y referencias a `D-00xx` que en otro repositorio apuntarían a
  nada.
- **[R]** El ledger y su política de versionado. Versionarlo como hoy lleva al nuevo
  repositorio el nombre de usuario de la máquina en `transcriptPath`.
- **[R]** `protect-paths.mjs` el día 1 (§6).
- **[R]** El criterio de promoción de `D-0015` y `R-11`.
- **[R]** El patrón de `*.proposed.*` versionados en `REVIEWS/`. Basta con la
  descripción del PR.
- **[R]** Los ids de reglas y decisiones. Un `R-19` o un `D-0039` en otro repositorio
  invita a buscar su significado en Del Campo, que es exactamente una fuga de contexto.

---

## 9. Soporte multi-agente: real frente a pretendido

| Mecanismo | Claude Code | Codex | Claude Cowork | Gemini / Antigravity | Independiente del modelo |
|---|---|---|---|---|---|
| `AGENTS.md` | Sí, vía `@AGENTS.md` | **[I]** Sí: Codex lee `AGENTS.md` por convención; no se verificó en el repo | Depende de qué se cargue | Sin evidencia | Sí (texto) |
| `CLAUDE.md` | Sí | No | Parcial | No | No |
| `permissions.deny` | Sí | **No** | **No** | No | No |
| Hook `protect-paths` | Sí | **No** | **No** | No | No |
| Ledger (SessionStart / SessionEnd) | Sí | **No** (`ops/evidence/T-0016.md`, `T-0019.md`) | **No** (`ops/evidence/T-0006.md`, `T-0010.md`) | No | No |
| Contrato de tarea + checker | Sí | Sí | Sí | Sí | **Sí** |
| CI + protección de `main` | Sí | Sí | Sí | Sí | **Sí** (R-17) |
| Congelamiento del contrato | Sí | Sí | Sí | Sí | **Sí** |
| Evidencia por tarea | Sí | Sí (T-0016, T-0019) | Sí (T-0006, T-0010) | — | **Sí** |
| Revisión ciega | Subagente aislado | Sí, como revisor (T-0012) | — | — | **Sí** como procedimiento; "subagente" es una implementación |

**[H] Lo observado:** tres superficies de ejecución en uso real (Claude Code, Codex y
Claude Cowork). Cero evidencia de Gemini o Antigravity, que solo aparecen nombrados en
`AGENTS.md:3` y en `TASKS/T-0015…:156`.

**[H] Conflicto entre documentos, sin elegir:** `D-0016` dice "El arnés inicial soporta
únicamente Claude Code". `AGENTS.md:3` dice "nada acá depende de Claude Code, Codex,
Gemini ni Antigravity". La práctica muestra que Codex y Cowork implementan y cierran
tareas. **Fuente más autoritativa:** `decisions.yaml` (R-03, R-04). **[R]** Resolverlo
con un ADR que haga una de dos cosas: (a) enmendar `D-0016` para reconocer que se
**ejecuta** con varios agentes y que los controles locales y el ledger solo cubren
Claude Code; o (b) restringir la ejecución a Claude Code. Hoy rige (a) de hecho y (b)
de derecho.

**[I]** Lo verdaderamente independiente del modelo son la capa de archivos y la de CI.
Todo lo que vive en `.claude/` es específico de Claude Code. Es coherente con R-17
("a CI no le importa quién escribió el código"), y es exactamente la parte que más
valor demostró.

**[R]** Trabajo mínimo para soportar limpiamente otro agente (no implementado):

1. Declararlo en el ADR del punto anterior.
2. Llevar al CI lo que hoy solo hace `permissions.deny`: un check que falle si un PR
   toca `.claude/**` o `.github/workflows/**` sin una marca de aprobación humana. Así
   R-15 deja de depender del cliente.
3. Para el ledger, aceptar una línea manual por sesión no capturada (`provider`, `taskId`,
   fecha, rama) o dejar de exigir el `runId` en la evidencia. Construir adapters por
   proveedor está prohibido por `PROJECT.md` §4 y no hace falta.
4. Mantener `AGENTS.md` como única fuente de instrucciones (D-0018) y sin estado.

---

## 10. Recomendación: copiar, plantilla o núcleo compartido

| Criterio | A. Copiar mecanismos seleccionados | B. Repositorio plantilla | C. Biblioteca o núcleo versionado |
|---|---|---|---|
| Acoplamiento | Ninguno entre repos | Bajo; solo al crear | Alto: todos dependen de una versión |
| Costo de mantenimiento | Por repo; hoy ≈ 0 commits/mes al arnés en régimen | Un repo más que se pudre si no se usa | Releases, compatibilidad, tests propios |
| Propagación de mejoras | Manual | Ninguna después de crear | Automática, pero obliga a actualizar todos |
| Riesgo para Del Campo | Ninguno | Bajo si la plantilla no nace de este repo | Medio: un cambio en el núcleo rompe el CI de Del Campo |
| Fuga de contexto | Baja si se reescribe (§8); alta si se copia a ciegas | Baja si la plantilla es limpia | Baja en código, pero el núcleo tiende a absorber reglas de Del Campo |
| Carga cognitiva | Baja: todo está en el repo | Baja | Alta: el comportamiento vive fuera del repo |
| Compatibilidad con agentes | Total: archivos locales legibles | Total | **Peor**: el agente no ve el código del checker si vive en un paquete |
| Debugging | Directo | Directo | Indirecto (versión, resolución, paquete) |
| Beneficio con 2 proyectos | Alto relativo al costo | Bajo: una sola instanciación | Negativo |
| Beneficio con 5 proyectos | Medio: duplicación real | Alto al crear | Positivo **si** el arnés cambia seguido |

**[R] Recomendación: A.** Con evidencia:

- **[H]** El arnés cambió 12 veces en sus primeros 17 días y 0 en los 14 siguientes
  (§11). Un núcleo compartido amortiza cambios frecuentes, y hoy no los hay.
- **[H]** Lo genérico y valioso cabe en unas 300 líneas (`check-docs.mjs` recortado +
  `decisions.mjs` + plantilla + workflow + `settings.json`).
- **[I]** Dos de los mecanismos más complejos, el ledger y el hook, son justamente los
  que no se copiarían. Lo que quedaría en un "núcleo" es demasiado chico para
  justificar versionado.
- **[R]** Como complemento barato que no es una plantilla, conviene que la sesión que
  arme el proyecto 2 deje anotado el tiempo que le llevó el bootstrap y qué tuvo que
  reescribir. Es la medición que hace falta para el disparador de B.

---

## 11. Disparadores explícitos para reconsiderar

Umbrales derivados de lo observado; cuando no hay base, se dice.

| Disparador | Umbral | De dónde sale |
|---|---|---|
| **A → B** (plantilla) | Arranca un **tercer** proyecto, **o** el bootstrap del proyecto 2 lleva más de 1 día | R-01, la regla de dos (el tercer caso valida). El día es una estimación sin dato: medirlo en el proyecto 2 |
| **A → C** (núcleo) | En régimen, ≥ 2 cambios al arnés por mes que deban aplicarse en ≥ 2 repos, durante 2 meses seguidos | El arranque mostró ≈ 0,7 commits/día al arnés y el régimen, 0. Volver a la mitad de la tasa de arranque de forma sostenida significa que el arnés no se estabilizó y que copiarlo ya cuesta |
| **A → C** | Una divergencia con consecuencia: un arreglo hecho en un repo que faltaba en otro y causó un defecto o un merge indebido | Un incidente alcanza, porque es la falla que C previene |
| **A → C** | ≥ 3 repos activos **y** checkers que divergieron en más de 1 regla sin motivo de dominio | Combina la regla de dos con divergencia observada |
| Activar congelamiento del contrato en un repo | Segundo contribuidor, o un caso de contrato aflojado en su rama | Hoy cuesta ≈16 % de PRs y no frenó ninguna falla real |
| Reactivar el ledger con consumidor | Una pregunta escrita que git o la facturación no respondan, **y** cobertura posible ≥ 80 % de las tareas | Hoy cubre el 38 % |
| Pasar la revisión ciega a CI | Una revisión salteada en una `FEATURE` que se mergeó | Hoy se cumple al 100 % a mano |
| Mantenimiento de Project OS | Más de 4 h/mes en el arnés y sus documentos, sin contar tareas y evidencia | No hay medición de horas en el repo. Es un umbral propuesto, no derivado |

---

## 12. Simplificaciones que vale la pena considerar

En orden de valor sobre costo. Ninguna se implementó.

1. **[R] Una sola fuente de estado.** Quitar los bloques "Estado actual" de `AGENTS.md`,
   `CLAUDE.md` y `README.md` y dejar un puntero a `PROJECT.md`. Opcional: que el
   checker falle si esos tres archivos contienen frases de estado. Previene el modo de
   falla más caro que se observó (§5.3.1). Cambiar `CLAUDE.md` es cambiar instrucciones
   del agente: requiere aprobación humana.
2. **[R] Reconciliar `D-0016` con la práctica** mediante ADR (§9). Es la contradicción
   más visible entre lo decidido y lo que se hace.
3. **[R] Decidir qué es el ledger.** Opción mínima: dejar de versionar `transcriptPath`
   y aceptar una línea manual para sesiones no capturadas. Opción más fuerte: dejar de
   exigir el `runId` en la evidencia hasta que exista un consumidor. En ambos casos,
   revisar el criterio de promoción de `D-0015`, que no puede cumplirse con una
   cobertura del 38 %. Es una decisión `ACCEPTED`: se cambia con ADR, no acá.
4. **[R] Hacer cumplir o aflojar el encabezado de procedencia de R-09b.** Hoy es
   obligatorio en el texto y opcional en la práctica (T-0020, T-0022, T-0023).
5. **[R] Evidencia proporcional al riesgo.** Para `LOW`, `## Comandos y salida literal`
   + `## Qué NO se verificó` y nada más. Las evidencias de 36 a 43 KB tienen un costo
   que nadie midió contra su lectura.
6. **[R] Hook de Bash: permitir lecturas.** Agregar a `readers` programas de solo
   lectura (`git diff`, `git log`, `git show`, `diff`, `md5sum`, `grep`), o restringir
   el deny de "comando compuesto" a operadores de escritura (`>`, `tee`, `mv`, `cp`,
   `sed -i`). Elimina los falsos positivos de §4.4. Requiere aprobación humana (R-15).
7. **[R] Que el WIP cuente el trabajo real**: contar como en curso toda tarea con PR
   mergeado en las últimas N horas, o exigir `ACTIVE` para que un PR `task/T-xxxx` pase
   el check. Cierra la salida de T-0021.
8. **[R] Borrar `*.proposed.*` una vez aplicados** y quitar de `.claude/README.md` la
   lista de skills que no existen.

---

## 13. Riesgos de no hacer nada

- **[I]** Los agentes siguen arrancando con instrucciones falsas sobre qué existe. Es
  el camino más probable para que un agente "cree" una UI o un importador duplicado, o
  ignore `pnpm check` completo porque `CLAUDE.md` dice que no incluye los tests.
- **[I]** La brecha entre `D-0016` y la práctica erosiona R-03 ("si algo aparece
  decidido en el código pero no en `decisions.yaml`, el código está mal"). Si la regla
  se puede ignorar acá, se puede ignorar en general.
- **[I]** El ledger sigue acumulando eventos de un solo proveedor con rutas personales.
  Cuando se quiera responder "qué agente rinde mejor", los datos estarán sesgados por
  construcción.
- **[I]** Copiar Project OS al proyecto 2 "tal cual" (lo más fácil si no hay perfil
  definido) arrastra R-14, R-19, ids `D-00xx` y el ledger con nombres de usuario. Eso
  es fuga de contexto de Del Campo hacia otro cliente.

## 14. Riesgos de sobreingeniería

- **[I]** Construir `project-os-kit` con dos proyectos, uno sin código todavía, es
  diseñar contra requisitos imaginados: el mismo error que ADR-0015 evitó para Project
  OS como aplicación.
- **[I]** Convertir el ledger en multi-proveedor con adapters choca con
  `PROJECT.md` §4 ("Adapters para más de un execution provider") y no tiene consumidor.
- **[I]** Automatizar la revisión ciega en CI exige probar el aislamiento del revisor,
  que es justamente la propiedad que R-33 dice que un check no puede observar.
- **[I]** Endurecer el hook de Bash es una carrera sin fin contra un parser de shell.
  `D-0056` ya reconoce que "un programa que calcule su destino puede escribir rutas
  protegidas". El valor marginal de cada regla nueva cae, y los falsos positivos suben.
- **[H]** El antecedente propio: 8 tareas `POS` en las primeras dos semanas, frente a
  cero en las dos siguientes mientras se entregaba producto. El sistema funcionó mejor
  cuando dejó de recibir trabajo.

---

## 15. Preguntas que la evidencia del repositorio no puede contestar

1. ¿Cuántas horas por semana consume el proceso (tareas, evidencia, revisiones) frente
   al código? El repositorio mide líneas, no tiempo.
2. ¿Cuántas sesiones de Codex y de Cowork hubo en total? Solo constan las que la
   evidencia menciona.
3. ¿Los `Act on` de las revisiones ciegas habrían aparecido igual en la revisión humana
   del owner? Es la condición de falsación de `D-0048` y no hay grupo de control.
4. ¿Se leen las secciones largas de evidencia después del merge? No hay telemetría de
   lectura.
5. ¿Cuál es hoy la configuración real de la protección de `main`? La última
   inspección registrada es del 2026-09-08 (`ops/evidence/T-0003.md`).
6. ¿En qué paso fallaron exactamente los 6 runs rojos no provocados? Los logs que
   devuelve la API no lo muestran (§4.3).
7. ¿Qué tan parecido será el stack del proyecto 2? Si no es TypeScript + Postgres, el
   CI y `guard-db-tests` no se trasladan, y el núcleo genérico se achica todavía más.
8. ¿`REVIEWS/T-0008/protect-paths.proposed.mjs` es idéntico byte a byte al hook
   instalado? El hook impide la comparación directa desde una sesión de agente.

---

## Tabla final de acciones

| Mecanismo | KEEP | SIMPLIFY | COPY TO NEW PROJECT | DEFER | REMOVE-CANDIDATE |
|---|---|---|---|---|---|
| Contrato de tarea (4 secciones + frontmatter) | | | ● | | |
| `TASKS/_TEMPLATE.md` | | | ● (recortado) | | |
| `decisions.yaml` (esquema) + ADR template | | | ● | | |
| `decisions.yaml` (contenido de Del Campo) | ● | | | | |
| `scripts/check-docs.mjs` | | | ● (recortado) | | |
| `scripts/decisions.mjs` | | | ● | | |
| CI `project-os-check` | | | ● | | |
| `permissions.deny` | | | ● | | |
| `AGENTS.md` / `CLAUDE.md` (patrón D-0018) | | | ● | | |
| Bloques de estado en `AGENTS.md` / `CLAUDE.md` / `README.md` | | | | | ● |
| `ENGINEERING_RULES.md` (reglas genéricas) | | ● | | | |
| `ENGINEERING_RULES.md` (R-14, R-16, R-19 a R-23) | ● | | | | |
| Revisión ciega (R-33) | ● | | | | |
| Evidencia por tarea (R-09b) | | ● | | | |
| Congelamiento del contrato | ● | | | | |
| WIP limit | | ● | | | |
| `SLICES/` | ● | | | | |
| Hook `protect-paths.mjs` | | ● | | | |
| Ledger de AgentRun + `check-agent-run.mjs` | | ● | | | |
| Criterio de promoción de `D-0015` | | | | ● | |
| `R-11` / `settingSources` | | | | ● | |
| `R-31` higiene mensual | ● | | | | |
| `scripts/guard-db-tests.mjs` | ● | | | | |
| Archivos `*.proposed.*` en `REVIEWS/` | | | | | ● |
| `.claude/README.md` § skills planeados | | | | | ● |
| Extracción a template (B) | | | | ● | |
| Extracción a núcleo (C) | | | | ● | |

Nota sobre la tabla. "COPY TO NEW PROJECT" implica también KEEP en Del Campo. "DEFER"
significa: no tocar hasta que se cumpla un disparador de §11. "REMOVE-CANDIDATE" es una
propuesta que necesita aprobación humana; los dos últimos casos tocan `.claude/` o
instrucciones de agente.

---

## Anexo A — Project OS Lite: árbol propuesto para un repositorio nuevo

No se creó ningún archivo.

```
<nuevo-repo>/
├── AGENTS.md                  # neutral, ≤ 80 líneas, sin dominio de otro cliente, sin estado
├── CLAUDE.md                  # @AGENTS.md + comandos; nada más
├── PROJECT.md                 # qué, fase, WIP limit, mapa de documentos; ÚNICA fuente de estado
├── ENGINEERING_RULES.md       # ~10 reglas genéricas, numeración propia
├── decisions.yaml             # decisions: []  (esquema: id, title, status, date, statement, source, adr?)
├── DECISIONS/
│   └── 0000-template.md
├── TASKS/
│   └── _TEMPLATE.md           # sin workstreams de Del Campo; sin R-09b el día 1
├── scripts/
│   ├── check-docs.mjs         # decisiones + tareas + WIP; sin evidencia ni slices
│   └── decisions.mjs
├── .github/workflows/
│   └── check.yml              # pnpm check (docs + typecheck + lint + test), check requerido en main
├── .claude/
│   └── settings.json          # solo permissions.deny; sin hooks
├── .env.example
├── .gitignore                 # .env, .env.*
└── package.json               # "check": "node scripts/check-docs.mjs && …"

# Se agregan cuando aparezca su disparador (§7, "Después"):
#   REVIEWS/            ← primera FEATURE sobre lógica central o datos persistidos
#   ops/evidence/       ← primer dato de producción o primer auditor
#   scripts/check-task-contract.mjs ← segundo contribuidor
#   scripts/guard-db-tests.mjs      ← primer dato real en base hosteada
#   SLICES/             ← primera aceptación medible con usuario
```

## Anexo B — Cómo se obtuvieron los números

- Historia: `git fetch --unshallow origin main`, porque el clon inicial era shallow con
  146 commits. Después: `git log --no-merges --numstat`, agrupado por prefijo de path.
  Los scripts de agrupación viven fuera del repositorio.
- Ledger: lectura de los archivos versionados de `ops/runs/` (`git ls-files ops/runs`).
  Se excluye `ops/runs/2026-10-07.jsonl`, creado sin versionar por esta misma sesión.
- CI: `actions_list` → `list_workflow_runs` sobre `emidc/del-campo` (90 runs).
- Revisiones: lectura de los veredictos y las secciones `Act on` de cada archivo de
  `REVIEWS/`. El conteo de `Act on` por reporte es aproximado, salvo donde se cita el
  número exacto.
- **Aislamiento experimental:** no se leyó nada bajo `v0/fase-8/` ni `v0/fase-9/` (esas
  rutas no existen en `main`), ni el contenido de `SPIKES/T-0021/`. De ese directorio
  solo se usaron conteos de archivos y de líneas cambiadas.
