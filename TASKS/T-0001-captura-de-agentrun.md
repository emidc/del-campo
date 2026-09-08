---
id: T-0001
title: Registrar cada ejecución de agente en el ledger de Project OS
kind: CHORE
status: ACTIVE
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

Cada arranque de sesión de Claude Code —`startup`, `resume`, `clear` o `fork`— abre
un run con `runId` propio y aleatorio, y deja un `RUN_STARTED` en
`ops/runs/<fecha>.jsonl`. `compact` no abre un run: la sesión continúa. `SessionEnd`
deja un `RUN_ENDED` que se correlaciona con su `RUN_STARTED` leyendo estado local no
versionado bajo la ruta de Git; el par comparte `runId`. Sus SHAs y timestamps
permiten derivar un AgentRun normalizado sin actualizar líneas append-only.

Un mismo `providerSessionId` puede aparecer en varios runs (una sesión reanudada).
Los errores de entrada, correlación o escritura del hook terminan con código distinto
de cero, de forma no bloqueante.

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

# 2. Ciclo de vida completo: startup+end, resume, compact, y los tres modos de error
WORK="$(mktemp -d)"
export AGENTRUN_DIR="$WORK/runs" AGENTRUN_STATE_DIR="$WORK/state"
run() { echo "$1" | node scripts/record-agent-run.mjs; }

# startup abre un run; SessionEnd lo cierra correlacionado
run '{"session_id":"s1","hook_event_name":"SessionStart","source":"startup","cwd":"'"$PWD"'","transcript_path":"/Users/nadie/t.jsonl"}'
run '{"session_id":"s1","hook_event_name":"SessionEnd","reason":"other","cwd":"'"$PWD"'","transcript_path":"/Users/nadie/t.jsonl"}'

# resume reusa session_id pero abre un runId distinto
run '{"session_id":"s1","hook_event_name":"SessionStart","source":"resume","cwd":"'"$PWD"'"}'
run '{"session_id":"s1","hook_event_name":"SessionEnd","reason":"other","cwd":"'"$PWD"'"}'

# compact NO agrega ningún evento
LINES_ANTES=$(wc -l < "$AGENTRUN_DIR"/*.jsonl)
run '{"session_id":"s1","hook_event_name":"SessionStart","source":"compact","cwd":"'"$PWD"'"}'
LINES_DESPUES=$(wc -l < "$AGENTRUN_DIR"/*.jsonl)
test "$LINES_ANTES" = "$LINES_DESPUES" || { echo "compact ensució el ledger"; exit 1; }

# error de correlación: SessionEnd sin RUN_STARTED previo → exit != 0
if run '{"session_id":"fantasma","hook_event_name":"SessionEnd","reason":"other"}'; then
  echo "correlación faltante no falló"; exit 1
fi
# error de entrada: stdin no-JSON → exit != 0
if printf 'no soy json' | node scripts/record-agent-run.mjs; then
  echo "entrada inválida no falló"; exit 1
fi
# tras cerrar todos los runs de s1, no queda estado de correlación huérfano
test -z "$(ls -A "$AGENTRUN_STATE_DIR" 2>/dev/null)" || { echo "estado de correlación huérfano"; exit 1; }

# settingSources: declaración explícita válida se respeta; basura cae a unknown
AGENTRUN_SETTING_SOURCES=project run '{"session_id":"s2","hook_event_name":"SessionStart","source":"startup","cwd":"'"$PWD"'"}'
AGENTRUN_SETTING_SOURCES=bare    run '{"session_id":"s3","hook_event_name":"SessionStart","source":"startup","cwd":"'"$PWD"'"}'

# 3. Aserciones sobre el contenido del ledger
node --input-type=module -e '
  import { readFileSync, readdirSync } from "node:fs";
  const dir = process.env.AGENTRUN_DIR;
  const ev = readFileSync(`${dir}/${readdirSync(dir)[0]}`, "utf8").trim().split("\n").map(JSON.parse);
  const check = (ok, msg) => { if (!ok) { console.error("FALLA:", msg); process.exit(1); } };
  check(ev.length === 6, `esperaba 6 eventos, hay ${ev.length}`);
  const [a, b, c, d, s2, s3] = ev;
  check(a.eventType === "RUN_STARTED" && b.eventType === "RUN_ENDED", "par startup mal ordenado");
  check(a.runId === b.runId, "par startup sin correlación");
  check(c.runId === d.runId, "par resume sin correlación");
  check(a.runId !== c.runId, "resume reutilizó el runId del startup");
  check(a.providerSessionId === c.providerSessionId, "resume cambió providerSessionId");
  for (const e of ev) {
    for (const key of ["eventId","runId","eventType","occurredAt","provider","providerSessionId","repoSha","harnessSha","settingSources"])
      check(e[key] !== undefined, `falta campo ${key}`);
    check(!("cwd" in e.providerRaw) && !("transcript_path" in e.providerRaw), "providerRaw expone cwd/transcript_path");
    check(!JSON.stringify(e.providerRaw).includes("/Users/"), "providerRaw contiene una ruta personal");
  }
  for (const e of [a, b, c, d]) check(e.settingSources === "unknown", `settingSources = ${e.settingSources}, esperaba unknown`);
  check(s2.settingSources === "project", `AGENTRUN_SETTING_SOURCES=project ignorado: ${s2.settingSources}`);
  check(s3.settingSources === "unknown", `settingSources=bare debería caer a unknown, es ${s3.settingSources}`);
  check(b.terminationReason === "other" && b.providerRaw.reason === "other", "terminationReason/reason no capturado");
  console.log("ok:", ev.map((e) => e.runId).join(" "));
' || exit 1

# 4. harnessSha se mueve al tocar .claude/ O scripts/record-agent-run.mjs
git log -1 --format=%H -- .claude scripts/record-agent-run.mjs
```

Comprobación humana:

- [ ] Después de una sesión real de Claude Code sobre una rama `task/T-XXXX-…`, el
      registro tiene el `taskId` correcto, y una sesión reanudada produce un segundo
      par `RUN_STARTED`/`RUN_ENDED` con `runId` distinto y el mismo `providerSessionId`.
- [ ] El directorio de estado de correlación (`git rev-parse --git-path agentrun-state`)
      no aparece en `git status` ni queda con archivos huérfanos tras cerrar sesiones.

## Data effects

Escribe el ledger append-only en `ops/runs/<fecha>.jsonl`. Mantiene estado de
correlación efímero bajo la ruta de Git (`git rev-parse --git-path agentrun-state`,
por defecto `.git/agentrun-state/`): un archivo JSON por `session_id`, escrito en
`RUN_STARTED` y borrado en `RUN_ENDED`. Ese directorio no se versiona por
construcción —vive dentro de `.git/`— y no necesita entrada en `.gitignore`.

Archivos de implementación versionados que toca esta tarea:
`scripts/record-agent-run.mjs` y `ops/AGENTRUN.md`. Los eventos sanitizados que el hook
genera bajo `ops/runs/` son artefactos retenidos y también se versionan; no se editan
después de ser anexados. Los eventos pre-schema que incumplen la lista permitida de
`providerRaw` se conservan fuera del repositorio y no se incorporan retroactivamente.
**No** modifica `.claude/settings.json`: los dos hooks ya estaban registrados y el
comportamiento nuevo vive entero en el script.

Reversible: borrar el estado efímero de correlación y revertir los dos archivos de
implementación. Un ledger ya versionado se conserva como historia append-only; no se
borra como parte de una reversión ordinaria del hook.

## Notes

El diseño del hook es deliberadamente modesto: captura el lifecycle de la sesión, no
su telemetría completa ni el éxito funcional de una tarea. `SessionEnd` significa
que la sesión terminó; no equivale por sí solo a `COMPLETED`.

Registrar poco y confiable vence a registrar mucho e inventado.

El ledger producido durante el desarrollo inicial del hook usó el esquema anterior y
contenía rutas locales dentro de `providerRaw`. Se archivó fuera del repositorio y no
se usará como evidencia de cumplimiento del esquema vigente.
