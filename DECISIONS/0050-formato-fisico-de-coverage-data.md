# ADR-0050 — Formato físico mínimo de `coverageData` en `PolicyVersion`

- **Id en `decisions.yaml`:** D-0050
- **Fecha:** 2026-09-21
- **Supersede:** —

## Contexto

`D-0025` está `OPEN`: cuánto de la cobertura de una `PolicyVersion` debe estructurarse
no se decide sin evidencia de pólizas reales de al menos dos compañías y necesidades
concretas de uso. `T-0012` necesita, sin embargo, que la columna exista para que el
schema esté completo — Q-12 bloqueaba el pase de la tarea a `READY` hasta que el owner
resolviera cómo guardar la cobertura **sin** resolver `D-0025` de hecho.

El owner respondió Q-12 (2026-09-21, registrado en `TASKS/T-0012-schema-con-invariantes-como-constraints.md`
§Notes): bloque opaco asociado a `PolicyVersion`, con trazabilidad hacia su origen, sin
normalizar campos internos ni introducir reglas de negocio que dependan de
interpretarlos. `D-0033` sigue mandando: el linaje completo vive en staging;
`coverageData` no absorbe campos de semántica desconocida ni duplica el registro
completo de Zoho.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo D-0050. Esta decisión fija un
formato de **persistencia** para T-0012; no es ni pretende ser una resolución de
`D-0025`, que permanece `OPEN` y se retoma con evidencia de pólizas reales de al menos
dos compañías y necesidades concretas de uso que justifiquen qué estructurar —
criterio explícito del owner, no una preferencia técnica de esta tarea.

## Decisión

`policy_version.coverage_data` es `jsonb`, **nullable**, sin ninguna estructura de
claves impuesta por el schema. Dos columnas adicionales, `coverage_source_batch_id` y
`coverage_source_record_id` (`text`, nullables, sin FK porque el schema de staging no
existe todavía en esta migración), sostienen la trazabilidad mínima hacia el origen que
`D-0033` exige. `T-0013` es quien las puebla, incorporando únicamente contenido ya
identificado como cobertura, con trazabilidad al registro y lote de origen — esta
migración no importa datos.

`NULL` en `coverage_data` significa **dato ausente**: todavía no se incorporó
contenido de cobertura para esa versión. No significa, y el schema no permite que
signifique, **ausencia de cobertura** — esa es una conclusión contractual sobre una
póliza real que ningún valor por defecto puede completar sin fabricar un hecho que
nadie observó. Por eso la columna no es `NOT NULL` y no tiene un `DEFAULT '{}'::jsonb`
ni ningún otro valor de relleno.

`jsonb` se elige porque el origen (Zoho) entrega la cobertura como pares clave-valor
de forma natural, y `jsonb` permite guardarlos sin que el propio tipo de columna
imponga ninguna clave, tipo de valor o estructura anidada obligatoria — a diferencia
de, por ejemplo, columnas separadas por campo, que sí estructurarían y por lo tanto
resolverían `D-0025` de hecho. No hay ningún `CHECK` sobre las claves ni sobre la
forma interna del JSON: el schema no interpreta su contenido.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| `jsonb NOT NULL DEFAULT '{}'` | Un objeto vacío por comodidad es indistinguible de "sin cobertura conocida" para cualquier consumidor futuro, y completar ese valor es exactamente la conclusión contractual que el owner pidió no fabricar. |
| Columnas estructuradas por campo de cobertura (suma asegurada, franquicia, etc.) | Resuelve `D-0025` por la puerta de atrás: estructurar es decidir qué se estructura, y el owner fue explícito en que eso exige evidencia de al menos dos compañías que todavía no existe. |
| `text` con JSON serializado a mano | Mismo contenido que `jsonb` sin las validaciones de sintaxis JSON que Postgres da gratis, y sin poder indexar ni consultar parcialmente si alguna vez hiciera falta sin decidir estructura. No hay ninguna ventaja sobre `jsonb` para este caso. |
| Guardar el registro completo de Zoho dentro de `coverage_data` | Contradice `D-0033` directamente: el registro completo y su linaje viven en staging, no en el dominio. `T-0013` incorpora únicamente contenido identificado como cobertura, no el registro entero. |

## Consecuencias

**Más fácil.** La columna existe, el schema de VS01 queda completo, y `D-0025` sigue
abierta sin que ninguna elección de esta tarea la cierre de hecho. `T-0013` puede
poblarla sin migración adicional.

**Más difícil.** Ninguna consulta puede filtrar ni ordenar por un campo de cobertura
específico sin decidir primero su estructura — que es exactamente lo que se está
evitando decidir. Cualquier UI que quiera mostrar cobertura en VS01 (fuera de su
`Non-scope` de todos modos) tendría que tratar el contenido como opaco.

**Costo de revertir:** bajo. Estructurar después es agregar columnas o una tabla
relacionada y migrar el contenido ya presente en `coverage_data`; no hay que deshacer
nada de esta decisión, solo construir sobre ella.

## Criterio de falsación

El de `D-0025`: evidencia de pólizas reales de al menos dos compañías y necesidades
concretas de uso que justifiquen qué estructurar. Este ADR no propone un criterio
propio porque no resuelve esa decisión — la referencia y la deja intacta.
