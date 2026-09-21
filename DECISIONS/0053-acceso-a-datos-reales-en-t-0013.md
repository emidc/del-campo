# ADR-0053 — Acceso de un agente de desarrollo a datos reales en T-0013

- **Id en `decisions.yaml`:** D-0053
- **Fecha:** 2026-09-21
- **Supersede:** —

## Contexto

T-0013 importa las pólizas y las partes de una correduría en operación desde el export
de Zoho. El `## Why` de la tarea lo dice sin rodeos: sin datos reales dentro del schema,
VS01 no le sirve a nadie y las invariantes de `DOMAIN.md` no se contrastaron contra la
realidad.

R-19 prohíbe que un agente de desarrollo reciba PII real **salvo excepción explícita y
justificada**. La regla previó este caso; lo que faltaba era ejercer la excepción con
alcance escrito en vez de dejar que se resolviera sola en el momento de implementar.

La alternativa —trabajar siempre contra una muestra sanitizada— es la que R-19 prefiere
por defecto, y es la que se descarta acá por una razón concreta: el valor del importador
está en cómo trata las relaciones rotas, los duplicados, los strings de aseguradora que
no matchean y las cadenas de renovación incompletas. Una muestra sanitizada conserva la
forma de los datos y pierde exactamente las anomalías que el importador tiene que
clasificar. Un importador verificado sólo contra datos limpios está verificado contra el
caso que no va a ocurrir.

El owner además declaró el circuito completo: él generó y descargó los ZIP/CSV, confirmó
que el lote incluye todos los registros, y el lote preservado e identificado por T-0004
se verifica contra su manifiesto. Export, derivados, staging y base local viven en su
máquina, bajo su usuario y su custodia; los originales se conservan sin modificaciones.

Se conserva la limitación que T-0004 ya había registrado: las fechas de exportación
difieren entre módulos, de modo que **no se afirma que exista un snapshot transaccional
común**. Lo que el importador reconcilie es consistente con ese lote, no con un instante
del sistema de origen.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo D-0053.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Muestra sanitizada, sin excepción a R-19 | Conserva la forma y pierde las anomalías. El importador quedaría verificado contra el caso limpio, que es el que no rompe. Es la alternativa correcta para casi cualquier otra tarea y la equivocada para ésta. |
| Anonimizar el lote antes de dárselo al agente | La anonimización que preserva las relaciones rotas —mismo cliente escrito de tres formas, teléfonos compartidos, titulares ausentes— es tan difícil como el importador mismo, y su error se traslada silenciosamente al resultado. |
| Que el agente trabaje a ciegas y el owner ejecute y reporte | Posible, y mucho más lento. Convierte cada diagnóstico en un ida y vuelta, y el modo de falla de esta tarea es de diagnóstico, no de escritura. |
| Autorización general para agentes de desarrollo | Es lo que R-19 prohíbe, y con razón. Una excepción sin alcance deja de ser excepción. |

## Consecuencias

**Más fácil.** El importador se contrasta contra las relaciones y anomalías del lote
real, que es lo único que prueba que su clasificación de fallos significa algo. El
diagnóstico de una fila que no importa se hace mirando la fila.

**Más difícil.** El contenido leído por el agente puede enviarse a Anthropic como
contexto, y eso es una divulgación aceptada a conciencia, no un efecto colateral. La
mitigación no es una promesa de prudencia: es el límite de datos mínimos necesarios, la
preferencia por consultas acotadas y agregados sobre la lectura de registros completos, y
los cuatro límites de R-19 que esta excepción **no** toca.

La verificación de esta tarea deja de ser ejecutable en CI: los datos reales no entran al
versionado ni al runner, así que la corrida sobre el lote real es local y su resultado
llega al repositorio como evidencia con conteos agregados, nunca como fixture. `pnpm check`
tiene que seguir pasando en CI sin el lote.

La revisión ciega que R-33 exige para una tarea `MIGRATION` corre bajo las mismas
condiciones de proveedor y modelo: un reviewer que no pueda ejecutar `## Verification`
no estaría revisando esta tarea sino su documentación. Cualquier otro proveedor o modelo
requiere una autorización nueva.

**Costo de revertir:** la autorización se retira y la tarea vuelve a muestra sanitizada,
pero lo ya enviado como contexto no se puede des-enviar. Es la única parte de esta
decisión que no es reversible, y por eso su alcance se escribe antes y no después.

## Trazabilidad

El ledger de `ops/runs/` registra `provider` y `providerRaw.model`, de modo que la
condición de proveedor y modelo de esta autorización es comprobable después del hecho
sobre los runs de T-0013. El nivel de esfuerzo que el owner declaró no se captura en el
ledger: esa parte de la autorización queda enunciada y no verificable con lo que hoy se
registra, y se dice acá en vez de suponer lo contrario.
