# AgentRun — eventos y proyección

Un `AgentRun` es la proyección de **una sesión de un agente sobre este repositorio**.
Pertenece a Project OS. No es un `BusinessAuditEvent` y nunca contiene datos de
cliente. → `D-0011`

## Ledger append-only

`ops/runs/YYYY-MM-DD.jsonl` contiene una línea JSON por **evento de lifecycle**:

- `SessionStart` con `source` `startup`, `resume` o `clear` produce
  `RUN_STARTED` y abre un run con un `runId` nuevo.
- `SessionStart` con `source` `compact` **no** produce evento: la compactación no
  abre un run, la sesión continúa con el `runId` vigente.
- `SessionEnd` produce `RUN_ENDED`, correlacionado con su `RUN_STARTED` (ver abajo).
- El par `RUN_STARTED`/`RUN_ENDED` comparte `runId`. Un mismo `providerSessionId`
  puede aparecer en varios runs cuando una sesión se reanuda.

`fork` no es un valor de `SessionStart.source`. La opción `--fork-session` crea un
nuevo id de sesión al reanudar y, por lo tanto, no necesita un caso especial en el
ledger. El contrato de eventos se contrasta con
<https://code.claude.com/docs/en/hooks>.

`Stop` no se usa: ocurre al terminar cada turno y multiplicaría falsamente los runs
de una sesión. El ledger registra eventos porque JSONL append-only no permite completar
un registro anterior sin reescribirlo.

## Retención y versionado

Los archivos `ops/runs/YYYY-MM-DD.jsonl` que cumplen el esquema vigente se versionan
junto con el contexto y el arnés que los produjo. Son evidencia retenida, no una fuente
canónica sobre el estado actual del sistema. Antes de incorporarlos a Git se comprueba
que no contengan datos de cliente y que `providerRaw` respete la lista permitida del
esquema. `transcriptPath` puede conservar la ruta local necesaria para derivar tokens y
costo. Esta retención implementa el ledger en repositorio definido por `D-0015`.

Un evento producido por un esquema anterior que exponga campos hoy prohibidos no se
reescribe para hacerlo parecer vigente ni se incorpora a Git. Se preserva, si aporta
valor histórico, en un archivo local fuera del repositorio y se identifica como
pre-schema. Esta excepción no cambia la política para los eventos nuevos.

## Correlación de `RUN_ENDED`

El `runId` **no** se deriva del `session_id`: si lo hiciera, dos runs de una misma
sesión reanudada colisionarían. `RUN_STARTED` genera un `runId` aleatorio y lo guarda
en estado local no versionado bajo la ruta de Git
(`git rev-parse --git-path agentrun-state`, por defecto `.git/agentrun-state/`). La
clave combina `session_id` con el proceso anfitrión del hook: dos procesos que reanudan
la misma sesión mantienen estados distintos. `RUN_ENDED` lee el estado de su proceso,
hereda el `runId` y lo borra.

`RUN_STARTED` reserva primero el estado como pendiente para evitar colisiones, anexa
el evento y sólo entonces confirma que quedó persistido. Si el append falla, revierte
la reserva; aunque ese rollback también fallara, `RUN_ENDED` rechaza un estado no
confirmado y nunca escribe un final huérfano.

Si `RUN_ENDED` no encuentra estado previo, el hook termina con código distinto de
cero y **no** escribe un `RUN_ENDED` sin correlacionar. Lo mismo con un error de
entrada o de escritura. El código es `1`; `SessionStart` y `SessionEnd` no son eventos
bloqueables, por lo que el error queda visible sin impedir el lifecycle de Claude Code.

## Esquema de RunEvent

| Campo | Obligatorio | Contenido |
|---|---|---|
| `eventId` | sí | Identificador único con fecha y UUID aleatorio completo |
| `runId` | sí | Identificador aleatorio del run; lo asigna `RUN_STARTED` y `RUN_ENDED` lo hereda por correlación |
| `eventType` | sí | `RUN_STARTED` · `RUN_ENDED` |
| `occurredAt` | sí | Timestamp ISO 8601 UTC del evento |
| `providerSessionId` | sí | Id de sesión del proveedor; puede repetirse entre runs |
| `provider` | sí | `claude-code` por ahora → `D-0016` |
| `taskId` | no | Derivado de la rama `task/T-XXXX-…` |
| `repoSha` | sí | SHA completo en el momento del evento; `null` antes del primer commit |
| `harnessSha` | no | SHA del último commit que tocó `.claude/` o `scripts/record-agent-run.mjs` |
| `settingSources` | sí | `unknown` salvo declaración explícita vía `AGENTRUN_SETTING_SOURCES` (`default`/`project`/`user`/`local`, o combinación). `bare` no es capturable: sin settings cargados el hook no corre |
| `branch` | no | Rama activa |
| `transcriptPath` | no | Ruta al transcript del proveedor |
| `terminationReason` | no | Razón nativa de `SessionEnd`, sin inferir éxito |
| `providerRaw` | sí | Subconjunto permitido del payload del hook: `session_id`, `hook_event_name`, `source`, `reason`, `model`, `permission_mode`. `providerRaw` no incluye `cwd` ni `transcript_path` |

## Proyección normalizada

Agrupar por `runId`. Por construcción cada `runId` tiene exactamente un
`RUN_STARTED` y, si la sesión terminó de forma capturable, un `RUN_ENDED`:

| Campo de AgentRun | Derivación |
|---|---|
| `startedAt` | `occurredAt` del `RUN_STARTED` |
| `endedAt` | `occurredAt` del `RUN_ENDED`, o ausente si quedó abierto |
| `repoShaBefore` | `repoSha` del `RUN_STARTED` |
| `repoShaAfter` | `repoSha` del `RUN_ENDED`, o ausente si quedó abierto |
| `status` | `RUNNING` sin fin; `ENDED` con fin |

Un run puede quedar `RUNNING` para siempre si el proceso muere sin disparar
`SessionEnd` (crash, `kill -9`). Eso es esperado: `RUNNING` viejo = sesión que no
cerró limpio, no error de proyección.

`ENDED` no significa que la tarea se completó. El lifecycle de la sesión no conoce el
resultado funcional ni el Definition of Done. Ese outcome se enlaza después desde la
tarea o el PR.

## Ejemplo

```json
{"eventId":"e_20260907_a1b2c3d4e5f64738a9b0c1d2e3f40516","runId":"r_77f8c0902a7bd9c51a62","eventType":"RUN_STARTED","occurredAt":"2026-09-07T18:22:04.115Z","taskId":"T-0001","provider":"claude-code","providerSessionId":"9f3c…","transcriptPath":"/Users/…/transcript.jsonl","repoSha":"4e91a2c…","harnessSha":"4e91a2c…","settingSources":"unknown","branch":"task/T-0001-captura-de-agentrun","providerRaw":{"session_id":"9f3c…","hook_event_name":"SessionStart","source":"startup","model":"claude-sonnet-5"}}
```

`transcriptPath` es la única ruta de máquina que queda en el evento: la necesita la
derivación posterior de tokens y costo. No se copia dentro de `providerRaw`.

## Campos deliberadamente ausentes

`filesChanged` y `commits` se derivan de git con los SHAs. `tokens` y `cost`
se derivan después desde el transcript o runs headless; los hooks de lifecycle no los
entregan.

Registrar poco y confiable vence a registrar mucho e inventado.
