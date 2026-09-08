# AgentRun — eventos y proyección

Un `AgentRun` es la proyección de **una sesión de un agente sobre este repositorio**.
Pertenece a Project OS. No es un `BusinessAuditEvent` y nunca contiene datos de
cliente. → `D-0011`

## Ledger append-only

`ops/runs/YYYY-MM-DD.jsonl` contiene una línea JSON por **evento de lifecycle**:

- `SessionStart` produce `RUN_STARTED`.
- `SessionEnd` produce `RUN_ENDED`.
- Los dos eventos comparten `runId` y `providerSessionId`.

`Stop` no se usa: ocurre al terminar cada turno y multiplicaría falsamente los runs
de una sesión. El ledger registra eventos porque JSONL append-only no permite completar
un registro anterior sin reescribirlo.

## Esquema de RunEvent

| Campo | Obligatorio | Contenido |
|---|---|---|
| `eventId` | sí | Identificador único del evento |
| `runId` | sí | Identificador estable derivado de proveedor + sesión |
| `eventType` | sí | `RUN_STARTED` · `RUN_ENDED` |
| `occurredAt` | sí | Timestamp ISO 8601 UTC del evento |
| `providerSessionId` | sí | Id estable entregado por el proveedor |
| `provider` | sí | `claude-code` por ahora → `D-0016` |
| `taskId` | no | Derivado de la rama `task/T-XXXX-…` |
| `repoSha` | sí | SHA completo en el momento del evento; `null` antes del primer commit |
| `harnessSha` | no | SHA del último commit que tocó `.claude/` |
| `settingSources` | sí | `default` · `bare` · `project` |
| `branch` | no | Rama activa |
| `transcriptPath` | no | Ruta al transcript del proveedor |
| `terminationReason` | no | Razón nativa de `SessionEnd`, sin inferir éxito |
| `providerRaw` | sí | Payload crudo del hook, preservado para rederivar datos |

## Proyección normalizada

Agrupar por `runId`. Del primer `RUN_STARTED` y el último `RUN_ENDED` se derivan:

| Campo de AgentRun | Derivación |
|---|---|
| `startedAt` | `occurredAt` de `RUN_STARTED` |
| `endedAt` | `occurredAt` de `RUN_ENDED`, o ausente si quedó abierto |
| `repoShaBefore` | `repoSha` de `RUN_STARTED` |
| `repoShaAfter` | `repoSha` de `RUN_ENDED`, o ausente si quedó abierto |
| `status` | `RUNNING` sin fin; `ENDED` con fin |

`ENDED` no significa que la tarea se completó. El lifecycle de la sesión no conoce el
resultado funcional ni el Definition of Done. Ese outcome se enlaza después desde la
tarea o el PR.

## Ejemplo

```json
{"eventId":"e_20260907_a1b2c3d4","runId":"r_77f8c0902a7bd9c51a62","eventType":"RUN_STARTED","occurredAt":"2026-09-07T18:22:04.115Z","taskId":"T-0001","provider":"claude-code","providerSessionId":"9f3c…","transcriptPath":"/Users/…/transcript.jsonl","repoSha":"4e91a2c…","harnessSha":"4e91a2c…","settingSources":"default","branch":"task/T-0001-captura-de-agentrun","providerRaw":{"session_id":"9f3c…","hook_event_name":"SessionStart"}}
```

## Campos deliberadamente ausentes

`filesChanged` y `commits` se derivan de git con los SHAs. `tokens` y `cost`
se derivan después desde el transcript o runs headless; los hooks de lifecycle no los
entregan.

Registrar poco y confiable vence a registrar mucho e inventado.
