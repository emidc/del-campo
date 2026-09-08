# Del Campo — ENGINEERING_RULES.md

**Estado:** baseline v0.1 · **Actualizado:** 2026-09-07

Reglas de trabajo. **Un solo archivo para humanos y para agentes**: la distinción es real en muy pocas reglas, y esas están marcadas. Dos archivos paralelos derivan en duplicación y la duplicación derivó, en la revisión del Charter, en la mitad de las contradicciones encontradas.

Cada regla está marcada como:

- **ACTIVA** — rige desde hoy.
- **LATENTE** — está escrita, pero recién se aplica cuando exista el primer código de aplicación. No se puede cumplir todavía y no se debe fingir que sí.

---

## 1. Principios de decisión

### R-01 · La regla de dos — ACTIVA

No se introduce una abstracción, un adapter, un nivel de jerarquía ni una tabla de configuración hasta que existan **dos** casos concretos que la requieran. El primer caso se resuelve directo. El segundo justifica la abstracción. El tercero la valida.

### R-02 · Simplicidad reversible antes que complejidad prematura — ACTIVA

Ante dos opciones, se prefiere la que resuelve el problema actual, se comprueba rápido, tiene bajo costo de reversión, mantiene opciones abiertas y reduce lock-in.

### R-03 · Nunca convertir una suposición en decisión en silencio — ACTIVA

Toda decisión material se clasifica: `ACCEPTED`, `PROVISIONAL`, `OPEN`, `SUPERSEDED`, `REJECTED`. Vive en `decisions.yaml`, con ADR si es relevante. Si algo aparece decidido en el código pero no en `decisions.yaml`, el código está mal, no el índice.

### R-04 · Las decisiones se enuncian en un solo lugar — ACTIVA

`decisions.yaml` es la fuente canónica de **qué** se decidió y de su estado. Un ADR
referenciado explica **por qué**, con evidencia, alternativas y consecuencias, pero no
duplica el `statement`. Toda otra prosa referencia el id. El checker valida ambas
direcciones: Decision → ADR y ADR → Decision.

### R-05 · Disparadores obligatorios de ADR — ACTIVA

Requieren ADR: dependencia nueva; servicio externo nuevo; cambio de schema en un agregado central (`Party`, `Policy`); cambio en autenticación o autorización; cambio de política en `.claude/`; cambio de proveedor de infraestructura; promoción de un concepto de `NAMED` a `MODELED`.

---

## 2. Tareas y verificación

### R-06 · Toda tarea tiene criterios verificables — ACTIVA

Toda tarea declara evidencia capaz de demostrar su resultado. Cuando el outcome sea
mecánicamente verificable, `## Verification` contiene comandos ejecutables. Los
`SPIKE` y `REVIEW` pueden apoyarse en evidencia y comprobaciones humanas explícitas.
No se acepta un “Done” subjetivo.

### R-07 · La verificación es el Definition of Done — ACTIVA

El bloque `## Verification` contiene comandos ejecutables cuando corresponda y
afirmaciones concretas que un humano debe comprobar para outcomes no mecánicos. Los
comandos se corren igual desde una shell humana, desde CI y desde un agente.

### R-08 · `Non-scope` nunca vacío — ACTIVA

Una tarea sin alcance negativo explícito es el mejor predictor de scope creep en trabajo agéntico.

### R-09 · Definition of Done — LATENTE (parcial)

Se considera terminada una tarea cuando:

- los comandos de `## Verification` pasan (**ACTIVA**);
- el AgentRun quedó registrado y vinculado al PR (**ACTIVA** cuando haya PRs);
- cero nuevos errores de tipo, cero nuevos errores de lint (**LATENTE**);
- ningún test nuevo marcado como `skip`, y ningún test existente modificado sin justificación explícita en el PR (**LATENTE**);
- ADR creado si aplica R-05 (**ACTIVA**);
- aprobación humana obtenida si aplica R-13 o R-14 (**ACTIVA**).

No se declara terminado nada cuya verificación no se haya ejecutado.

---

## 3. Contexto y reproducibilidad

### R-10 · `~/.claude/` no contiene nada semántico del proyecto — ACTIVA

Solo preferencias y credenciales personales. Configuración del proyecto en el repositorio, versionada y revisada como código. Un proyecto cuya conducta depende de configuración no versionada deja de ser reproducible, y con eso se cae la premisa entera de medir proveedores.

### R-11 · Los runs de benchmark se ejecutan sin configuración de usuario — ACTIVA

Todo run destinado a comparación se corre con `--bare` o con `--setting-sources` acotado, y esa condición queda registrada en el campo `settingSources` del AgentRun. Sin esto se está midiendo una variable no controlada.

### R-12 · La versión de contexto es el SHA del repo — ACTIVA

No se construye ningún sistema de versionado de contexto. Los eventos
`RUN_STARTED` y `RUN_ENDED` registran respectivamente el SHA inicial y final; la
proyección del AgentRun los expone como `repoShaBefore` / `repoShaAfter`, junto a
los `contextRefs` declarados por la tarea. “¿Qué contexto vio este run?” se responde
con `git show <sha>:DOMAIN.md`.

### R-12b · Referenciar documentos por path, no importarlos — ACTIVA

En `CLAUDE.md` y `AGENTS.md`, los documentos canónicos se nombran entre backticks (`` `DOMAIN.md` ``), **nunca** con `@DOMAIN.md`. La sintaxis `@path` los carga completos al inicio de cada sesión; el backtick los deja como texto y el agente los lee cuando los necesita. El único `@` permitido es `@AGENTS.md` en `CLAUDE.md`, que es intencional.

---

## 4. Permisos, aprobación y seguridad

### R-13 · Acciones de ingeniería — ACTIVA

- **Autónomo:** leer el repo; correr checks y tests; editar en una rama de feature; crear rama; crear PR; migraciones contra base local.
- **Autónomo con auditoría:** agregar dependencias; escribir migraciones de schema; **modificar tests existentes** — permitido, pero dispara revisión humana obligatoria y queda marcado en el PR.
- **Aprobación humana:** merge a `main`; deploy y migración en producción; rotación de secretos; **cambios a `.claude/`, a los hooks o a los workflows de CI**; alta de una integración externa.
- **Prohibido:** tocar datos de producción; deshabilitar hooks o checks; `push --force` a `main`; commitear secretos; usar credenciales productivas desde una sesión de desarrollo.

### R-14 · Acciones de negocio — ACTIVA

Requieren **siempre** aprobación humana en la primera versión: toda comunicación externa a un cliente, aseguradora o tercero; todo pedido de cotización; toda emisión, endoso o cancelación; todo otorgamiento de acceso externo; toda modificación o eliminación de un archivo existente en Drive.

**Toda acción de negocio no listada tiene default `PROHIBIDA`, no autónoma.** Un default indefinido es, en la práctica, "lo que haga el código".

Los agentes no entregan a un cliente contenido que constituya asesoramiento sin revisión de un matriculado.

### R-15 · Los guardrails no se autoeditan — ACTIVA

Un agente que puede modificar sus propios límites no tiene límites. `.claude/**` y los workflows de CI están en `permissions.deny` y bajo revisión humana obligatoria.

### R-16 · Los agentes reciben autorización, no credenciales — ACTIVA

Un agente que necesita operar contra un sistema externo llama a un endpoint que posee la credencial. Nunca recibe la credencial. Esta es la diferencia entre un agente que puede cotizar y un agente que puede vaciar la cuenta del broker en una compañía.

### R-17 · Hooks son locales; CI es autoritativo — ACTIVA

Los hooks protegen la máquina donde están configurados. Todo lo que realmente deba cumplirse tiene que estar enforced también del lado del servidor. Esto además resuelve el problema cross-provider sin ninguna abstracción: a CI no le importa quién escribió el código.

### R-18 · Sin secretos en Git, prompts, logs, tareas ni documentación — ACTIVA

`.env` solo local y gitignored. Producción en almacenamiento seguro. Least privilege. Credenciales separadas por entorno.

---

## 5. Datos

### R-19 · Sin PII de clientes en prompts de agentes — ACTIVA

Los agentes van a leer datos de clientes. Un agente que pega un DNI en el contexto de un proveedor de IA es una divulgación. Se usan identificadores internos; para lo demás, redacción. Tampoco hay PII en logs de aplicación ni en el texto de las tareas.

### R-20 · Toda llamada externa con efecto secundario es idempotente — ACTIVA

Clave de idempotencia generada por Broker OS y persistida **antes** del intento. Para operaciones que la contraparte no soporte de forma idempotente, el reintento exige reconciliación previa: verificar si ya se aplicó antes de repetir. Sin esto, un reintento sobre una emisión emite dos pólizas.

### R-21 · La política de reintentos es por integración — ACTIVA

No global. Y la escalación produce un ítem **durable, visible y asignado a una persona**, nunca solamente una línea de log. Un agente que falla en silencio es peor que no tener agente: crea confianza injustificada.

### R-22 · La auditoría de negocio es append-only — ACTIVA

`BusinessAuditEvent` no se modifica ni se elimina mediante operaciones normales. El rol de aplicación no tiene `UPDATE` ni `DELETE` sobre la tabla. No contiene tokens ni costos: eso es `AgentRun`, que pertenece a Project OS.

### R-23 · No se borra historia — ACTIVA

Especialmente antes del cutover de Zoho. No migrar y no preservar son decisiones distintas; solo la primera está tomada.

---

## 6. Código — LATENTE hasta el Vertical Slice 01

### R-24 · Contratos en todos los bordes — LATENTE

Todo borde (HTTP, mensaje de cola, task spec, payload de integración) tiene un schema Zod y se **valida en runtime**, no solo en tipos. Es lo que permite que un agente compruebe su propio trabajo.

### R-25 · Los límites de módulo se hacen cumplir por herramienta — LATENTE

`packages/domain` no importa nada. `packages/db` no importa `api`. `apps/web` no importa `db` directamente. Regla de lint, no convención: un agente que no ve el límite lo cruza.

### R-26 · Capas de test — LATENTE

Unit sobre lógica de dominio pura; integration contra un Postgres real; contract contra payloads reales capturados; E2E pocos y sobre caminos críticos.

### R-27 · Ningún mock sin una respuesta real detrás — LATENTE, pero la captura es ACTIVA

Durante cada spike de integración se capturan y guardan las respuestas reales como fixtures. Cuestan cero en ese momento —las llamadas ya se están haciendo— y son la única forma de tener tests de contrato que signifiquen algo.

### R-28 · Deny-by-default probado — LATENTE

Todo endpoint expuesto al exterior tiene un test explícito de denegación. El portal no se lanza sobre "chequeamos el rol en el handler".

---

## 7. Git

### R-29 · Rama por tarea, con el id en el nombre — ACTIVA

`task/T-0042-descripcion-corta`. Es lo que permite unir automáticamente AgentRuns con diffs y PRs sin construir nada, y es de donde el hook de captura lee el `taskId`.

### R-30 · `main` protegida, ramas cortas — ACTIVA

`main` protegida → rama corta → implementación → verificación → PR → revisión independiente → CI verde → aprobación humana cuando corresponde → merge.

---

## 8. Higiene periódica

### R-31 · Revisión mensual de contexto — ACTIVA

Correr `/context` y `/skill-doctor` y mirar los números. `CLAUDE.md` por debajo de ~150 líneas. Lo que crece se mueve a `.claude/rules/` con `paths:` o a un skill.

### R-32 · El dominio crece por evidencia — ACTIVA

No crece porque una biblioteca ofrezca una feature, porque un modelo recomiende una entidad, porque Zoho tenga un módulo con ese nombre, porque una UI necesite temporalmente un campo, ni porque pueda ser útil algún día.
