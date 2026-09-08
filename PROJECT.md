# Del Campo — PROJECT.md

**Estado:** candidato a baseline v1.0 · **Fase actual:** Project OS Zero · **Actualizado:** 2026-09-07

Este archivo es el índice del programa. Si algo no está acá, está en uno de los documentos que este archivo nombra. Si no está en ninguno, todavía no está decidido.

---

## 1. Qué estamos construyendo

**Del Campo Broker OS** — sistema operacional propio de Del Campo Broker: clientes, pólizas, documentos, comunicaciones, riesgos y operación diaria. Reemplaza progresivamente a Zoho CRM y Zoho Mail.

**Del Campo Project OS** — el método y las herramientas mínimas para desarrollar Broker OS con humanos y modelos de IA, de forma medible y sin quedar acoplados a un proveedor. Broker OS es su primer caso real.

El objetivo no es maximizar el software producido. Es construir el sistema confiable más chico que mejore cómo opera Del Campo Broker, y a la vez desarrollar un método reutilizable de ingeniería humano + IA.

---

## 2. Los tres workstreams

Están relacionados pero se mantienen conceptualmente separados. Todo trabajo pertenece a exactamente uno, y debe declararlo.

| Workstream | Abreviatura | Alcance |
|---|---|---|
| Project OS & Agentic Harness | `POS` | Tareas, decisiones, ejecución agéntica, contexto, medición, trazabilidad, control humano |
| Broker OS | `BOS` | CRM, pólizas, operaciones, comunicaciones, documentos, riesgos, portal |
| Migration & Change Management | `MIG` | Zoho CRM, Zoho Mail, Google Workspace, normalización de Drive, capacitación, cutover |

---

## 3. Fase actual: Project OS Zero

Project OS **no es una aplicación**. En esta fase es este repositorio:

- `TASKS/` — las tareas, como archivos versionados.
- `DECISIONS/` + `decisions.yaml` — las decisiones, con índice legible por máquina.
- `ops/runs/` — el ledger de ejecuciones de agentes, escrito automáticamente por un hook.

No hay base de datos, no hay servicio, no hay adapters, no hay UI.

**Criterio de promoción a aplicación:** haber registrado al menos 30 AgentRuns reales **y** haber escrito el tercer script ad-hoc para consultarlos. Hasta que las dos condiciones se cumplan, Project OS sigue siendo archivos. → `D-0015`

### Qué sigue después de esta fase

1. Spikes que bloquean decisiones estructurales, en serie, con timebox de una semana: enforcement de autorización (`D-0022`, estado `OPEN`), semántica de campos de Zoho, hosting del worker.
2. **Vertical Slice 01** — Póliza + Documentos + Búsqueda. → `D-0019`

---

## 4. Qué NO estamos haciendo ahora

Enunciado explícitamente para que no reaparezca por la ventana:

- Project OS como aplicación, con base de datos o UI.
- Kanban, Gantt, dependency graph visual.
- Adapters para más de un execution provider. → `D-0016`
- Diseño del framework de evaluación de modelos.
- Cualquier código de aplicación de Broker OS.
- Cotización, emisión, WhatsApp, Gmail, portal externo, agentes con efectos externos.

---

## 5. Límite de trabajo en curso

**Como máximo dos tareas en estado `ACTIVE` al mismo tiempo, y como máximo un spike en curso.**

Con un solo desarrollador, el límite no es una preferencia de método: es la única defensa contra el modo de falla dominante del programa, que es que el meta-trabajo desplace al producto. Si hace falta empezar algo, primero se cierra o se suelta algo.

---

## 6. Mapa de documentos

| Documento | Qué contiene | Cuándo leerlo |
|---|---|---|
| `PROJECT.md` | Este índice, la fase, el WIP limit | Siempre primero |
| `DOMAIN.md` | Lenguaje canónico, identidades, invariantes, qué se modela y qué no | Antes de discutir cualquier entidad o schema |
| `ENGINEERING_RULES.md` | Reglas de trabajo para humanos y agentes | Antes de escribir código o ejecutar una tarea |
| `AGENTS.md` | Contrato operativo neutral respecto del proveedor | Lo carga todo agente automáticamente |
| `CLAUDE.md` | `AGENTS.md` más lo específico de Claude Code | Lo carga Claude Code automáticamente |
| `decisions.yaml` | Índice de decisiones: aceptadas, provisionales, abiertas | Antes de decidir algo que huela a ya decidido |
| `DECISIONS/` | Los ADR completos | Cuando el índice no alcanza |
| `TASKS/` | Las tareas | — |
| `ops/AGENTRUN.md` | Esquema del registro de ejecución | Al tocar el hook o analizar runs |
| `docs/history/SOURCES.md` | Procedencia del bundle y fuentes citadas pero no recibidas | Al auditar el baseline |

### Documentos que todavía no existen, a propósito

| Documento | Se crea cuando |
|---|---|
| `ARCHITECTURE.md` | Haya ~5 ADR que necesiten síntesis |
| `BUSINESS_CONTEXT.md` | El process mapping produzca material real |
| `ROADMAP.md` | La secuencia esté decidida, después de los primeros spikes |
| `SPIKES/`, `POCS/` | Los cree su primer contenido |

Un documento vacío es peor que un documento ausente: cuesta tokens y no informa.

---

## 7. Estado del baseline

`DOMAIN.md` v0.1 está incorporado como baseline. Su texto se recuperó completo desde
la conversación de origen y su sección de decisiones abiertas se normalizó para usar
los ids estables de `decisions.yaml`. La procedencia está en
`docs/history/SOURCES.md`.

Las decisiones estructurales aceptadas y las preguntas deliberadamente abiertas están
en `decisions.yaml`; las abiertas **no deben resolverse accidentalmente durante la
implementación**.

Las críticas a este programa se convierten en correcciones, preguntas nuevas, spikes, ADR o decisiones explícitamente descartadas. Nunca en premisas silenciosas.
