# Del Campo — PROJECT.md

**Estado:** candidato a baseline v1.0 · **Fase actual:** Project OS Zero · **Actualizado:** 2026-09-29

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

## 3. Fase actual: Project OS Zero, con Broker OS ya en código

Hay **dos cosas distintas** y desde el 21/09/2026 están en fases distintas. Confundirlas
haría leer mal el resto de este documento.

**Project OS sigue siendo Project OS Zero.** No es una aplicación. Es este repositorio:

- `TASKS/` — las tareas, como archivos versionados.
- `DECISIONS/` + `decisions.yaml` — las decisiones, con índice legible por máquina.
- `ops/runs/` — el ledger de ejecuciones de agentes, escrito automáticamente por un hook.

Para Project OS no hay base de datos, no hay servicio, no hay adapters, no hay UI, y su
criterio de promoción sigue sin cumplirse.

**Broker OS ya tiene código.** T-0010 levantó el workspace ejecutable y T-0012 creó el
primer schema, con las invariantes de `DOMAIN.md` §67 como constraints de Postgres,
migraciones SQL, tests de integración contra un Postgres real y CI corriéndolos. O sea
que la frase "no hay código de aplicación todavía", que este documento sostuvo hasta el
merge de T-0012, dejó de ser cierta. Lo que no cambió es el alcance: cero importación,
cero UI, cero endpoints, cero autorización.

**Criterio de promoción a aplicación:** haber registrado al menos 30 AgentRuns reales **y** haber escrito el tercer script ad-hoc para consultarlos. Hasta que las dos condiciones se cumplan, Project OS sigue siendo archivos. → `D-0015`

### Próximo incremento

`T-0004` cerró discovery el 19/09/2026 y `T-0015` alineó el dominio con su evidencia:
frontera entre staging y dominio, referencias externas no resueltas, identidad fiscal,
tomador único, `Endorsement`, unicidad de número de póliza, clases de agente y ejes de
autoridad documental. El objetivo de `T-0007` quedó absorbido: el estado de las decisiones
ya no se escribe a mano en ningún documento canónico y se genera con `pnpm decisions`.

`T-0011` cerró el 20/09/2026 con revisión humana: `SLICES/VS01.md` contiene el contrato
aprobado de software y aceptación, y descompuso T-0014 en T-0016, T-0017 y T-0018.

Entre el 20 y el 21/09/2026 cerraron, en este orden, las cuatro tareas que hacían falta
para que el arnés pudiera sostener código de aplicación:

- `T-0010` — workspace ejecutable, TypeScript estricto, límites de módulo por lint,
  runner de tests y Postgres local con la versión mayor fijada.
- `T-0005` — el contrato de tarea congelado contra el merge-base por un job de CI: las
  cuatro secciones obligatorias de una tarea ya no se pueden aflojar desde la rama que
  la implementa.
- `T-0009` — el procedimiento de revisión ciega por subagente aislado, y después su
  alcance: obligatoria en `FEATURE` y `MIGRATION`. → `D-0052`
- `T-0012` — el schema de VS01. Su revisión ciega devolvió STOP con once hallazgos sobre
  un diff cuyo check local estaba en verde; se corrigieron y un revisor en frío los
  cerró uno por uno.

Entre el 21 y el 28/09/2026 se completó VS01: `T-0013` (importador del lote de Zoho),
`T-0016` (búsqueda y consulta), `T-0017` (vinculación documental con comprobación humana,
D-0057) y `T-0018` (app interna en Vercel con login corporativo de Google, D-0058 y D-0059).
Los datos reales se cargaron en Supabase bajo D-0062 y VS01 se aceptó el 28/09/2026 con
20 de 20 casos y una reducción de la mediana de tiempo del 56,8 %, con la incertidumbre
declarada en `ops/evidence/T-0018-aceptacion.md`. `SLICES/VS01.md` es histórico.

### Qué sigue después de esta fase

1. Retrospectiva de VS01 y decisión sobre mostrar los links de Zoho sin verificar
   (modificaría D-0057) y sobre una medición confirmatoria sin la pista del botón.
2. Deuda registrada: funciones de las migraciones sin `search_path` propio.
3. Laboratorios de Q4 (Risk OS, Communication OS) según el Q4 Operating Plan, como
   contextos aislados dentro del monolito modular (D-0063). Primero el spike de
   integración de WhatsApp (`T-0020`), después el spike de formatos y modelo de
   Risk OS (`T-0021`): un spike por vez (§5).

El spike de enforcement de autorización (`T-0002`, `D-0022`) no bloquea VS01. Se
activa antes del primer acceso multi-principal, del portal externo o de un worker o
agente con acceso privilegiado a Broker OS. El spike de hosting del worker se activa
cuando un incremento requiera ese proceso.

---

## 4. Qué NO estamos haciendo ahora

Enunciado explícitamente para que no reaparezca por la ventana:

- Project OS como aplicación, con base de datos o UI.
- Kanban, Gantt, dependency graph visual.
- Adapters para más de un execution provider. → `D-0016`
- Diseño del framework de evaluación de modelos.
- Integración entre Broker, Risk OS y Communication OS durante Q4: ni código ni
  esquemas compartidos. Se decide al cierre del trimestre. → `D-0063`
- En WhatsApp, cualquier cosa fuera del alcance de Communication OS: grupos, adjuntos,
  el número corporativo y conversaciones con clientes sin autorización propia (R-19).
- Cotización, emisión, Gmail, portal externo, agentes con efectos externos.

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
| `SLICES/VS01.md` | Contrato de software y aceptación de VS01; caduca al entregarse | Antes de implementar VS01 |
| `ops/AGENTRUN.md` | Esquema del registro de ejecución | Al tocar el hook o analizar runs |
| `docs/history/SOURCES.md` | Procedencia del bundle y fuentes citadas pero no recibidas | Al auditar el baseline |

### Documentos que todavía no existen, a propósito

| Documento | Se crea cuando |
|---|---|
| `ARCHITECTURE.md` | Haya ~5 ADR que necesiten síntesis |
| `BUSINESS_CONTEXT.md` | El process mapping produzca material real |
| `ROADMAP.md` | La secuencia esté decidida, después de los primeros spikes |
| `SPIKES/`, `POCS/`, `REVIEWS/` | Los crea su primer contenido |

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
