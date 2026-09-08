---
id: T-0001
title: Registrar cada ejecución de agente en el ledger de Project OS
kind: CHORE
status: READY
workstream: POS
riskClass: LOW
size: S
created: 2026-09-07
blockedBy: []
contextRefs: [ops/AGENTRUN.md]
decisionRefs: [D-0015, D-0016, D-0011]
---

## Why

Project OS Zero existe para generar la única información que no se puede derivar de git ni de GitHub: qué ejecutó un agente, cuándo, sobre qué versión del contexto y con qué resultado. Sin ese ledger, dentro de tres meses no vamos a poder responder ninguna pregunta sobre costo, fiabilidad ni comparación entre proveedores, y no hay forma de reconstruirlo hacia atrás.

Es la primera tarea del programa porque su valor depende de empezar temprano y su costo es casi cero.

## Outcome

Cada sesión de Claude Code deja dos eventos correlacionados en
`ops/runs/<fecha>.jsonl`: `RUN_STARTED` desde `SessionStart` y `RUN_ENDED` desde
`SessionEnd`. Ambos comparten `runId` y `providerSessionId`; sus SHAs y timestamps
permiten derivar un AgentRun normalizado sin actualizar líneas append-only.

El registro se escribe solo, sin que nadie se acuerde de hacerlo.

## Non-scope

- **No** se extraen tokens ni costo en esta tarea. El hook no los recibe; se derivan después, en lote, desde el transcript o desde runs headless. Fingir que el hook los captura sería fabricar precisión.
- No se construye ninguna herramienta de consulta ni reporte sobre el ledger.
- No se instrumenta ningún proveedor que no sea Claude Code. → `D-0016`
- No se envía nada a ningún servicio externo. El ledger es un archivo.

## Verification

```bash
# 1. El check de documentos pasa
pnpm check

# 2. Dos lifecycle hooks producen dos eventos correlacionados sin ensuciar el ledger
RUN_DIR="$(mktemp -d)"
export AGENTRUN_DIR="$RUN_DIR"
echo '{"session_id":"test-123","hook_event_name":"SessionStart","cwd":"'"$PWD"'","transcript_path":"/tmp/t.jsonl"}' | node scripts/record-agent-run.mjs
echo '{"session_id":"test-123","hook_event_name":"SessionEnd","reason":"prompt_input_exit","cwd":"'"$PWD"'","transcript_path":"/tmp/t.jsonl"}' | node scripts/record-agent-run.mjs

# 3. Los eventos tienen el mismo runId y representan exactamente un inicio y un fin
node --input-type=module -e '
  import { readFileSync, readdirSync } from "node:fs";
  const dir = process.env.AGENTRUN_DIR;
  const events = readFileSync(`${dir}/${readdirSync(dir)[0]}`, "utf8").trim().split("\n").map(JSON.parse);
  if (events.length !== 2) process.exit(1);
  if (events[0].runId !== events[1].runId) process.exit(1);
  if (events[0].eventType !== "RUN_STARTED" || events[1].eventType !== "RUN_ENDED") process.exit(1);
  for (const event of events) for (const key of ["eventId","runId","eventType","occurredAt","provider","providerSessionId","repoSha","settingSources"])
    if (event[key] === undefined) { console.error("falta campo:", key); process.exit(1); }
  console.log("ok:", events[0].runId);
'
```

Comprobación humana:

- [ ] Después de una sesión real de Claude Code sobre una rama `task/T-XXXX-…`, el registro correspondiente tiene el `taskId` correcto.

## Data effects

Escribe únicamente en `ops/runs/`, en modo append. No modifica ningún archivo existente. Reversible borrando el archivo del día.

## Notes

El diseño del hook es deliberadamente modesto: captura el lifecycle de la sesión, no
su telemetría completa ni el éxito funcional de una tarea. `SessionEnd` significa
que la sesión terminó; no equivale por sí solo a `COMPLETED`.

Registrar poco y confiable vence a registrar mucho e inventado.
