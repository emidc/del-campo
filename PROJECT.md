# Del Campo — PROJECT.md

**Estado:** candidato a baseline v1.0 · **Fase actual:** Project OS Zero; Broker OS hacia su north star · **Actualizado:** 2026-11-09

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

## 3. Fase actual

**Project OS sigue en Project OS Zero.** No es una aplicación: son `TASKS/`, `DECISIONS/`
con `decisions.yaml` y el ledger histórico `ops/runs/`, validados por `pnpm check` y CI. Sin base de
datos, servicio, adapters ni UI propios. → `D-0015`

**Broker OS está en construcción hacia su north star.** Ya existen:

- VS01, aceptado el 28/09/2026: importación del lote de Zoho, búsqueda y consulta,
  vinculación documental y app interna con login corporativo de Google
  (`ops/evidence/T-0018-aceptacion.md`).
- Communication OS (`SLICES/CO01.md`) y Risk OS (`SLICES/RO01.md`) como contextos aislados
  del monolito modular, integrados sólo por API de aplicación. → `D-0063`, `D-0071`
- Identidad común y permisos por rol en los tres contextos, en curso en `T-0035`.

Qué se está haciendo ahora: las tareas `ACTIVE` de `TASKS/` (máximo cinco, §5). El plan
hacia la north star, con hitos y camino crítico, es
`docs/north-star/12-plan-hacia-la-north-star.md`. La historia de cómo se llegó hasta acá
está en `docs/history/cronologia-programa-2026-09-a-11.md`.

**Criterio de promoción de Project OS a aplicación:** una decisión explícita del owner que
nombre el caso de uso concreto que los archivos no resuelven. → `D-0015`, `D-0085`

El spike de enforcement de autorización (`T-0002`, `D-0022`) se activa antes del primer
acceso multi-principal, del portal externo o de un worker o agente con acceso privilegiado
a Broker OS.

---

## 4. Qué NO estamos haciendo ahora

Enunciado explícitamente para que no reaparezca por la ventana:

- Project OS como aplicación, con base de datos o UI.
- Kanban, Gantt, dependency graph visual.
- Adapters para más de un execution provider. → `D-0016`
- Diseño del framework de evaluación de modelos.
- Esquemas compartidos entre Broker, Risk OS y Communication OS, o lecturas de tablas
  de otro contexto. Se integran sólo por API de aplicación, y Broker OS lee a los otros
  dos sin escribir. → `D-0063`, `D-0071`
- Sincronización o escritura de regreso entre Broker OS y Risk OS. Cada dato tiene un
  único contexto dueño; la correspondencia empresa ↔ organización evaluada es manual.
  → `D-0067`, `D-0071`
- En WhatsApp, cualquier cosa fuera del alcance de Communication OS: grupos, adjuntos,
  el número corporativo y conversaciones con clientes antes de cumplir las condiciones
  de `D-0073` (R-19).
- Cotización, emisión, Gmail, portal externo, agentes con efectos externos.

---

## 5. Límite de trabajo en curso

**Como máximo cinco tareas en estado `ACTIVE` al mismo tiempo, sin sublímites por tipo.** Una tarea que sólo espera algo pasivo (una factura, un tercero, un período de observación) declara `waiting` con su condición de salida y su próxima comprobación, y no cuenta. Cuando vuelve a exigir trabajo (analizar logs, corregir, responder), se le quita `waiting` y cuenta otra vez; las comprobaciones mismas no cuentan, pero sí consumen horas del owner. → `D-0080`

El validador sólo ve las tareas de `TASKS/`. Un frente que vive fuera del repo (un trámite, un cambio en un panel) también cuenta en los cinco, y lo cuenta el owner a mano. Una tarea y sus partes, en el repo o en Linear, son un solo frente.

El límite sigue siendo la defensa contra el modo de falla dominante del programa: que el meta-trabajo desplace al producto. Con tres agentes (`D-0082`), el cuello de botella es la revisión del owner: si la revisión pendiente supera las horas de los próximos dos días, no se abre otro frente. Si hace falta empezar algo y el límite está lleno, primero se cierra o se suelta algo.

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
| `SLICES/VS01.md` | Contrato de software y aceptación de VS01; caduca al entregarse | Antes de implementar VS01 |
| `SLICES/CO01.md` | Contrato de software y aceptación de Communication OS en Q4; caduca al aceptarse | Antes de implementar Communication OS |
| `SLICES/RO01.md` | Contrato de software y aceptación de Risk OS v1 | Antes de implementar Risk OS |
| `docs/north-star/` | La north star de Broker OS, el prototipo y el plan para llegar | Antes de planificar o priorizar trabajo de Broker OS |
| `docs/desarrollo/agentes.md` | Qué protege y registra cada agente y cómo se abre y cierra una sesión | Antes de trabajar con Codex o Gemini |
| `ops/AGENTRUN.md` | Esquema del ledger histórico de AgentRun | Al analizar runs viejos o registrar un experimento |
| `docs/history/SOURCES.md` | Procedencia del bundle y fuentes citadas pero no recibidas | Al auditar el baseline |

### Documentos que todavía no existen, a propósito

| Documento | Se crea cuando |
|---|---|
| `ARCHITECTURE.md` | Haya ~5 ADR que necesiten síntesis |
| `BUSINESS_CONTEXT.md` | El process mapping produzca material real |
| `ROADMAP.md` | La secuencia esté decidida, después de los primeros spikes |
| `POCS/` | Lo crea su primer contenido |

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
