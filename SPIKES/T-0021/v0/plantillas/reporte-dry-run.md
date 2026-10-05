# Reporte del dry run · Fase 4

> Plantilla de `protocolo.md` §8. Completar sin borrar secciones; si una no aplica, escribir "no aplica" y por qué.

## 1. Corrida

| Campo | Valor |
|---|---|
| `corrida_id` | |
| Versión de metodología (congelada) | |
| Versión de protocolo | |
| Fecha de inicio / cierre | |
| Casos de propiedad ejecutados | N de N adjudicados |
| Casos no ejecutados y por qué | |

## 2. Resultados por caso

Categoría: la primera que se cumpla en el orden de §8 (contradicción → definición → combinación → ranking → PASS). "FAIL — calibración" no se usa en la Fase 4.

| Caso | Qué se adjudicó (resumen) | Qué produjo la metodología | Categoría | Categorías secundarias | Regla implicada | Factores del agente ≠ anexo | Anomalías |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

## 3. Criterios no juzgables en la Fase 4

Criterios adjudicados que sólo se refieren a la banda; pasan a la Fase 9.

| Caso | Criterio | Motivo |
|---|---|---|
| | | |

## 4. Resumen por categoría

| Categoría | Casos | N |
|---|---|---|
| PASS | | |
| FAIL — ranking | | |
| FAIL — definición | | |
| FAIL — contradicción | | |
| FAIL — combinación | | |

## 5. Frecuencia de `consecuencia_extrema` y `safety_critical` (H4)

| Medida | N / total |
|---|---|
| Casos con la bandera | |
| … disparada por I-económico | |
| … disparada por I-personas | |
| … disparada por I-continuidad | |
| … disparada por I-legal/regulatorio | |
| Casos con `safety_critical` | |

Nota obligatoria: los casos de propiedad son extremos por diseño; esta frecuencia no estima la de la población (§8, §12).

## 6. Lista "no evaluable"

| Caso | Factor `unknown` | Motivo | Necesidad de validación | `consecuencia_extrema` | `safety_critical` | Lugar en la cola de validación |
|---|---|---|---|---|---|---|
| | | | | | | |

## 6b. Propiedades (`metodologia-v0.md` §14)

Un renglón por propiedad, aunque no se haya encontrado contraejemplo.

| Propiedad | ¿Contraejemplo? | Caso y riesgos | Anomalía |
|---|---|---|---|
| Monotonía | | | |
| Invariancia de granularidad | | | |
| Causalidad de V | | | |
| Unknowns | | | |
| Separación (sub-riesgos, escenarios) | | | |
| Historial | | | |
| Producto (orden incorrecto o sensible a la codificación) | | | |

## 6c. Resultados circulares

Casos cuyo resultado sobre una regla los lista como caso de origen; no cuentan como evidencia a favor.

| Caso | Regla (sección de la metodología) | Resultado |
|---|---|---|
| | | |

## 7. Conteo hacia la falsación de D14 (propuesto)

| Caso | Categoría | ¿Independiente de cuáles? | ¿Hay corrección simple? Cuál | Cuenta |
|---|---|---|---|---|
| | | | | |

Total propuesto: N de 3. Lo decide Emiliano (§9).

## 8. Anomalías nuevas

`anomalia_id` agregados al registro en esta corrida, por código.

| Código | N | `anomalia_id` |
|---|---|---|
| | | |

## 9. Filas propuestas para el changelog

| id | elemento | antes | después | motivo |
|---|---|---|---|---|
| | | | | |

## 10. Para adjudicar

Sólo los FAIL, numerados, cada uno con la regla afectada, la causa y la corrección mínima propuesta.

1.
