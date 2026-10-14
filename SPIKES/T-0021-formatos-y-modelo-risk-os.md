# Spike T-0021 — Formatos de importación, modelo mínimo y datos sintéticos de Risk OS

- **Tarea:** `TASKS/T-0021-spike-formatos-y-modelo-risk-os.md`
- **Fecha:** 2026-10-14
- **Estado:** **borrador.** Lo escribió la Fase 15a. El owner aprobó los formatos el 2026-10-14 con un cambio (la historia ramificada es rechazo); sus decisiones están en `SPIKES/T-0021/v0/fase-15/decisiones-15a.md`. Los CSV sintéticos, el validador y el export ciego son de la Fase 15b; la confirmación de los casos históricos es del owner.
- **Decisiones que alimenta:** el contrato de Risk OS (análogo a `SLICES/VS01.md`) con su aceptación de Q4, y la primera tarea de implementación que crea `contexts/risk` bajo D-0063. No resuelve D-0029 ni cambia `DOMAIN.md`.
- **Fuentes:** la metodología de criticidad v1 (`SPIKES/T-0021/v1/metodologia-v1.md`, congelada en `v1/congelamiento-v1.md`), EMI-16 y EMI-17 en Linear (leídos el 2026-10-14), el plan de EMI-15 + EMI-41 (`SPIKES/T-0021/fuentes/plan-emi15-emi41.md`, Fase 15) y el dataset sintético de EMI-41 (`SPIKES/T-0021/v0/fase-14/dataset/manifiesto.md`). Ningún agente leyó casos históricos reales (R-19).

## Resumen y recomendación

**Recomendación: tres archivos sin columnas derivadas, con ids globales y la identidad del riesgo separada de su evaluación.**

- **`risks.csv`** tiene una fila por evaluación. La identidad del riesgo (organización, tipo de objeto, padre, miembros, título) se repite en cada evaluación y se valida. El padre va en una fila sin evaluación ni factores. Cada uno de los siete factores lleva estado (`known`, `unknown`, `no_aplica`), valor, rango y observación.
- **`action-plan.csv`** tiene un registro por acción y riesgo, más las decisiones de tratamiento que pide la vista de seguridad.
- **`risk-transfer.csv`** tiene un registro por cobertura y riesgo, más los eventos de póliza como filas propias. Ninguna de sus columnas entra al cálculo de criticidad.
- **`C_raw`, banda, banderas, techo e `I efectivo` no se importan:** los calculan funciones puras versionadas. `C_raw` aparece sólo en salidas, siempre junto al vector de factores y las banderas, porque no es una medida cardinal (decisión del owner, 2026-10-14).

Las columnas están en `SPIKES/T-0021/v0/fase-15/contrato/` y no se copian acá. Hay 71 reglas de validación: 55 de rechazo y 16 avisos. El owner aprobó 8 empresas sintéticas.

**Decidido por el owner el 2026-10-14** (`v0/fase-15/decisiones-15a.md`): las catorce decisiones de contrato, todas con la opción recomendada salvo la evaluación vigente, donde una historia ramificada pasa de aviso a rechazo porque en v1 la historia es una cadena lineal.

## Los tres formatos

> Comprobación de T-0021: *cada columna de los tres formatos tiene tipo, obligatoriedad y regla de validación, y cada relación entre archivos tiene su identificador.*

**Lo que ya está.**

| Archivo | Columnas | Contrato |
|---|---:|---|
| `risks.csv` | 84 | `v0/fase-15/contrato/columnas-risks.csv` |
| `action-plan.csv` | 26 | `v0/fase-15/contrato/columnas-action-plan.csv` |
| `risk-transfer.csv` | 35 | `v0/fase-15/contrato/columnas-risk-transfer.csv` |
| Reglas | 71 | `v0/fase-15/contrato/reglas-validacion.csv` |

Cada columna trae tipo, obligatoriedad, condición, valores, regla, severidad, id de regla, origen y la pantalla u operación de Risk OS v1 que la usa. Toda relación entre archivos tiene su id: `risk_id`, `evaluacion_id`, `accion_id`, `transferencia_id` y `evento_id`. Las relaciones y lo que rechaza la importación están en el dossier, §3.4 y §3.5. Las 89 columnas de la ficha del experimento están mapeadas en `v0/fase-15/mapeo-ficha-a-contrato.csv`: 56 entran, 12 son derivadas, 20 son sólo del experimento y una no tiene uso en v1.

**Qué falta.** Nada para los formatos: las decisiones 1 a 8 están aplicadas en `contrato/` y cada columna que depende de una cita la decisión en `condicion` u `origen`. Los ids son globales con prefijo de entidad y ULID, con el histórico en `id_origen` y `lote_origen` (1a). La procedencia por factor es opcional (3b). `review_status` va por registro en evaluaciones, acciones y coberturas (4a). Los derivados se rechazan (6a). El padre no tiene evaluación (7a). La historia es una cadena lineal y la vigente es la última `accepted` (8).

## Modelo mínimo del contexto `risk`

**Lo que ya está** (dossier §4): `Risk`, `Assessment` con sus siete `FactorAssessment`, `Action`, `Transfer`, `TransferEvent`, `RevisionPendiente` y `Reordenamiento`. Cada una se justifica con una pantalla u operación de v1.

No entran como entidades:
- `ActionEffect`: tres columnas de `Action`.
- `Scenario`: un `Risk` con `tipo_objeto = escenario`.
- El resultado calculado: es una función.
- La organización: un id opaco sin `Party` (D-0063).
- Los controles existentes: texto en las observaciones de P y V.

Para cada uno de los seis conceptos de `DOMAIN.md` §46, el dossier dice qué queda con estructura y qué queda como texto.

**Qué falta.** Nada: el owner aprobó el modelo con los formatos (decisión 14b). El reordenamiento es un registro de Risk OS, fuera de los CSV de importación en v1 (5a).

## Empresas sintéticas

> Comprobación de T-0021: *el número de empresas sintéticas está justificado por criterios de cobertura explícitos, no elegido de antemano*, y *los CSV sintéticos cumplen los formatos, e incluyen al menos un caso inválido por regla de rechazo, con el error esperado escrito.*

**Lo que ya está** (dossier §7): 14 criterios de cobertura. Cubren rubros, tamaños, resultado operativo negativo, padres, escenarios, no evaluables, historia, propuestas sobre la ficha de otro evaluador, revisión profesional, transferencia y banderas.

El owner aprobó **8 empresas de EMI-41** (decisión 10a): S05, S06, S07, S15, S28, S29, S32 y S36, con 59 objetos. Con ellas los 14 criterios quedan cubiertos, y sacar cualquiera deja uno sin cubrir. Las otras 29 empresas siguen en el dataset.

El dataset no tiene acciones, así que hacen falta **10 registros de acción nuevos**. Uno de ellos es el caso consistente entre los tres archivos que pide EMI-16: S07-R06, con una acción cumplida, su reevaluación con eficacia parcial y la cobertura de avería de maquinaria. Hacen falta además algunos casos válidos que EMI-41 no tiene:
- un padre con un hijo no evaluable;
- hijos empatados;
- un riesgo sin evaluar;
- reevaluaciones por información nueva y por cambio de contexto.

**Qué falta.** Que la Fase 15b escriba los CSV con los 55 casos inválidos, uno por regla de rechazo y con su error esperado, y el validador que los comprueba. Todo lo que agrega la 15b lleva `lote_origen = T-0021/15b`.

## Casos históricos

> Comprobación de T-0021: *el owner confirmó por escrito que los cinco casos históricos se pueden expresar en los formatos, o qué ajuste necesitan, sin exponer sus valores.*

**Lo que ya está:** `v0/fase-15/lista-casos-historicos.md`, con 44 preguntas de estructura que el owner responde por caso (Sí, No o Ajuste), sin valores.

**Qué falta:** la respuesta del owner. Si pide ajustes, se aplican al contrato antes de cerrar el spike.

## Ciclo de actualización

> Comprobación de T-0021: *está definido qué es un ciclo de actualización y qué evidencia deja cada ciclo en el historial.*

**Lo que ya está** (dossier §5). Un ciclo es una revisión pendiente desde que se abre hasta que la cierra una persona. La cierra una reevaluación aceptada o un "sin cambio" con fundamento.

Cada ciclo deja en el historial:
- el riesgo y el disparador (tipo y referencia);
- las fechas de apertura y de cierre;
- quién la cerró;
- el resultado y, si hubo, la evaluación que la cerró.

"Al menos diez ciclos" son diez revisiones cerradas con disparador y cierre trazables.

**Confirmado por el owner** (decisión 9a): los eventos de póliza conservan su propio historial y no cuentan como ciclos del riesgo.

## Revisión pendiente

> Comprobación de T-0021: *está escrito qué cambio de actividad abre una revisión pendiente y qué la cierra.*

**Lo que ya está** (dossier §5).

**Abren una revisión pendiente:**
- una acción que pasa a `cumplida`;
- información nueva;
- un cambio de contexto;
- un cambio de versión de la metodología, sólo en los riesgos cuyo resultado podría cambiar.

**No abren:**
- una acción planificada, en curso o cancelada (D18);
- un evento de póliza (D17, §11.3);
- un reordenamiento profesional.

**La cierra** una persona. No hay recálculo automático: el cambio esperado de una acción nunca escribe un factor (D16) y una propuesta de IA no cierra nada (EMI-17).

**Confirmado por el owner** (decisión 9a).

## Export para evaluaciones ciegas

No es una comprobación de T-0021, pero el owner lo pidió en el cierre de EMI-41.

**Lo que ya está:** la especificación en el dossier, §8. Trabaja con una lista blanca, escribe fuera del repositorio y hace cuatro comprobaciones de limpieza. Una de ellas detecta la contaminación que trae la propia metodología, que cita riesgos de 19 empresas.

**Qué falta:** que la Fase 15b escriba el script. El owner lo aprobó (11a) y la comprobación de contaminación es obligatoria: sólo se omite para un caso concreto con aceptación explícita registrada en el manifiesto.

## Qué no se hizo

- No se escribieron CSV sintéticos, validador, export ni código en `contexts/`, `apps/` o `packages/`.
- No se cambió ninguna regla de la metodología ni nada de la tabla de `v1/congelamiento-v1.md`.
- No se leyeron casos históricos reales.
- Linear se leyó sin escribir.
- No se agregó ninguna fila al changelog: CH-113 y CH-114 siguen en `v0/fase-14/anexo-changelog-fase-14.md` hasta la próxima versión (decisión 13a).
