# Lista de comprobación · cinco casos históricos frente a los formatos

> 2026-10-14 · T-0021, Fase 15a. **Para que la complete Emiliano.** Ningún agente leyó los casos ni pide sus valores (R-19). La lista pregunta sólo por **estructura**: qué tiene que poder expresar cada caso, no qué dice. Las respuestas son Sí, No o Ajuste, y en Ajuste una frase sobre la forma, sin cifras ni nombres.
>
> Los formatos están en `contrato/columnas-risks.csv`, `contrato/columnas-action-plan.csv` y `contrato/columnas-risk-transfer.csv`. T-0021 pide que confirmes por escrito "que los cinco casos históricos se pueden expresar en los formatos, o qué ajuste necesitan, sin exponer sus valores".

## Cómo completarla

En cada fila, marcá para cada caso (H1 a H5):
- **Sí:** el caso tiene eso y el formato lo expresa.
- **No:** el caso no tiene eso (no hace falta expresarlo).
- **Ajuste:** el caso lo tiene y el formato no alcanza. Escribí la forma ("los riesgos vienen agrupados por sede", "la póliza tiene tres deducibles distintos"), sin valores.

## A. Organización y riesgos (`risks.csv`)

| # | Pregunta de estructura | Columnas | H1 | H2 | H3 | H4 | H5 |
|---:|---|---|---|---|---|---|---|
| A1 | ¿El caso es una sola organización, o tiene sedes o unidades que tendrían que ordenarse por separado? | `organizacion_id` | | | | | |
| A2 | ¿Cada riesgo tiene un identificador estable en el origen? | `id_origen`, `lote_origen` | | | | | |
| A3 | ¿Cada riesgo se puede escribir como causa → evento → consecuencia, con un evento iniciador identificable? | `riesgo_causa`, `riesgo_evento`, `riesgo_consecuencia` | | | | | |
| A4 | ¿Hay riesgos que comparten la misma consecuencia concreta con causas distintas (padre con sub-riesgos)? | `tipo_objeto`, `riesgo_padre_id` | | | | | |
| A5 | ¿Hay escenarios donde una misma causa materializa varios riesgos a la vez? | `tipo_objeto = escenario`, `miembros` | | | | | |
| A6 | ¿Hay riesgos identificados pero todavía sin evaluar? (Se importan con los siete factores `unknown` y entran a la cola de validación.) | `<f>_estado`, `necesidad_validacion` | | | | | |
| A7 | ¿La valoración separa probabilidad, impacto y vulnerabilidad, o viene como un solo número o una matriz de dos ejes? | `p_*`, `i_*`, `v_*` | | | | | |
| A8 | ¿El impacto distingue económico, personas, continuidad y legal, o viene en una sola dimensión? | `i_econ_*`, `i_pers_*`, `i_cont_*`, `i_legal_*` | | | | | |
| A9 | ¿La vulnerabilidad separa contención y recuperación? | `v_cont_*`, `v_rec_*` | | | | | |
| A10 | ¿La escala es de 1 a 5? Si es otra, decí cuál (cantidad de niveles), sin los valores | `<f>_valor` | | | | | |
| A11 | ¿Hay factores desconocidos o expresados como rango? | `<f>_estado = unknown`, `<f>_min`, `<f>_max` | | | | | |
| A12 | ¿Cada valoración tiene una nota del hecho que la sostiene? | `<f>_observacion` | | | | | |
| A13 | ¿Hay un monto económico estimado por riesgo, y en qué moneda (sólo cuál)? | `i_econ_monto_bruto`, `moneda` | | | | | |
| A14 | ¿Existe un resultado operativo u otra magnitud económica de referencia para la organización? | `i_econ_observacion` | | | | | |
| A15 | ¿Hay una nota de incertidumbre o de qué falta confirmar? | `uncertainty`, `uncertainty_nota` | | | | | |

## B. Historia, procedencia y revisión (`risks.csv`)

| # | Pregunta de estructura | Columnas | H1 | H2 | H3 | H4 | H5 |
|---:|---|---|---|---|---|---|---|
| B1 | ¿Hay más de una valoración del mismo riesgo en el tiempo, con fecha? | `tipo_evaluacion`, `evaluacion_anterior_id`, `fecha` | | | | | |
| B2 | Si hay varias, ¿se sabe por qué cambió cada una (acción, información nueva, corrección, cambio de contexto)? | `motivo` | | | | | |
| B3 | ¿Hay dos valoraciones paralelas del mismo riesgo por personas distintas, sin que una corrija a la otra? | decisión 8 | | | | | |
| B4 | ¿Se sabe quién valoró (persona, IA, importación)? | `evaluador`, `actor` | | | | | |
| B5 | ¿La evidencia está por riesgo o por factor? | `base`, `evidencia`; `<f>_base`, `<f>_evidencia` (decisión 3) | | | | | |
| B6 | ¿Hay valoraciones aprobadas o revisadas por alguien, con fecha? | `review_status`, `revisado_por`, `fecha_revision` | | | | | |
| B7 | ¿Existe un orden profesional escrito de los riesgos que difiera del orden calculado? | registro de reordenamiento (decisión 5) | | | | | |

## C. Plan de acción (`action-plan.csv`)

| # | Pregunta de estructura | Columnas | H1 | H2 | H3 | H4 | H5 |
|---:|---|---|---|---|---|---|---|
| C1 | ¿Hay varias acciones por riesgo? | `risk_id` repetido | | | | | |
| C2 | ¿Hay una acción que alcanza a varios riesgos? (Se importa como un registro por riesgo, EMI-17.) | `accion_id` distinto por `risk_id` | | | | | |
| C3 | ¿Cada acción dice qué factor busca mejorar, y si es vulnerabilidad, si es contención o recuperación? | `factor_objetivo` | | | | | |
| C4 | ¿Cada acción explica por qué actúa sobre ese factor? | `mecanismo_causal` | | | | | |
| C5 | ¿Hay un cambio esperado escrito? | `cambio_esperado` | | | | | |
| C6 | ¿Hay estado de ejecución (planificada, en curso, cumplida, cancelada) con fecha? | `estado`, `fecha_alta`, `fecha_cumplida` | | | | | |
| C7 | ¿Hay evidencia de que una acción se ejecutó? | `evidencia_ejecucion` | | | | | |
| C8 | ¿Hay un efecto observado después de la acción, con una valoración nueva que lo midió? | `efecto`, `efecto_nota`, `evaluacion_efecto_id` | | | | | |
| C9 | ¿Hay decisiones de la dirección de aceptar, tratar o transferir un riesgo, con fecha de revisión? | `tipo_registro = decision_tratamiento` | | | | | |
| C10 | ¿Hay campos de la acción que el formato no tiene (responsable, presupuesto, fecha objetivo)? Nombralos, sin valores | — | | | | | |

## D. Transferencia (`risk-transfer.csv`)

| # | Pregunta de estructura | Columnas | H1 | H2 | H3 | H4 | H5 |
|---:|---|---|---|---|---|---|---|
| D1 | ¿Hay una póliza que cubre varios riesgos? (Se importa como un registro por riesgo, con la misma `poliza_ref`.) | `poliza_ref`, `risk_id` | | | | | |
| D2 | ¿Hay un riesgo cubierto por varias pólizas? | `risk_id` repetido | | | | | |
| D3 | ¿Los límites, sublímites y deducibles están como montos, como porcentajes o con mínimos y períodos de espera? | `*_monto`, `*_texto` | | | | | |
| D4 | ¿Hay exclusiones escritas por riesgo o sólo por póliza? | `exclusiones` | | | | | |
| D5 | ¿Hay una estimación de exposición retenida? | `exposicion_retenida_monto` | | | | | |
| D6 | ¿Hay una opinión de suficiencia de la cobertura? | `suficiencia`, `suficiencia_nota` | | | | | |
| D7 | ¿Hay siniestros que consumieron parte del límite, con fecha? | `tipo_evento = consumo_limite` | | | | | |
| D8 | ¿Hay renovaciones, ampliaciones o cancelaciones con fecha? | `tipo_evento` | | | | | |
| D9 | ¿Hay seguros obligatorios (riesgos del trabajo u otros)? | `cobertura` | | | | | |
| D10 | ¿Hay datos de la póliza que el formato no tiene? Nombralos, sin valores | — | | | | | |

## E. Cierre

| # | Pregunta | H1 | H2 | H3 | H4 | H5 |
|---:|---|---|---|---|---|---|
| E1 | ¿El caso se puede expresar en los tres formatos sin perder nada que use una pantalla de Risk OS v1? | | | | | |
| E2 | Si no, ¿el ajuste es del contrato (una columna, un valor) o del caso (hay que reescribirlo en causa → evento → consecuencia)? | | | | | |

Confirmación (texto libre, con fecha):

> 
