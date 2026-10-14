# Aceptación de fichas de Emiliano · Fase 11b

2026-10-13 · BOS / Risk OS · T-0021.

## Autorización y alcance

Emiliano respondió «Acepto ambas fichas» en esta sesión de Codex el 2026-10-13, a la consulta que identificaba EV-11-0063 (S02-R07, evaluable, C 40, Media) y EV-11-0064 (S15-R04, no evaluable por falta del costo bruto cubierto por ART).

Se registran `review_status = accepted`, `revisado_por = emiliano` y `fecha_revision = 2026-10-13` en esas dos filas de `fichas-ronda-2.csv` y de su entrada `fichas-ronda-2-factores.csv`, para que regenerar los derivados no borre la aceptación. El autor original sigue siendo `agente-11b`, `actor = ai`. No se cambian factores, evidencia, identificadores ni resultados; EV-8103 y EV-8115 permanecen intactas. Las otras 62 fichas nuevas de Fase 11 continúan pendientes.

## Verificación y recálculo

Regresión congelada ejecutada sobre una copia completa de T-0021 antes de registrar aceptación. Ambos resultados coinciden con los CSV. Cruce por `risk_id` de las 30 filas de Emiliano con las del agente en `regresion-emi41.csv`:

| Medida v1 candidate | Resultado |
|---|---:|
| Evaluables de Emiliano en su muestra | 23/30 |
| Misma evaluabilidad entre evaluadores | 23/30 (76,7%) |
| Ambos evaluables (denominador de banda) | 23 |
| Misma banda entre ambos evaluables | 16/23 (69,6%) |

Los dos acuerdos no cambian respecto del reporte: la regresión F11-REG-01 ya incorporaba las propuestas pendientes en su cadena de cálculo. Es un recálculo experimental de la candidate; no afirmar que todas las fichas del agente estén aceptadas ni que sea el estado operativo vigente de cada riesgo (protocolo §6). Las filas históricas de la regresión y sus notas «pending» se conservan como evidencia de la corrida original; este registro documenta la aceptación posterior.

EV-11-0063: C 40, Media, techo 100, consecuencia extrema true, safety_critical false. EV-11-0064: no evaluable, sin C ni banda, techo 80, consecuencia extrema true, safety_critical true. Sigue faltando cuantificar el costo bruto ART: aceptar la ficha no completa esa evidencia.

Arnés antes de la aceptación: 213 tests, 211 pass, 0 fail, 2 todo (EV-44). Al registrar la aceptación, una aserción histórica que exigía 64 fichas pending falló. Se actualizó `regresion-ejecutable/fase11.test.ts` para exigir accepted con Emiliano y fecha en las dos fichas autorizadas, mantener las otras 62 pending y comprobar que la entrada conserva la aceptación. No se cambian reglas ni expectativas numéricas. **Test existente modificado: requiere revisión humana al presentar un PR (R-13).** Verificación final: `node --run test` devuelve 213 tests, 211 pass, 0 fail, 2 todo; `tsc --noEmit -p .`, lint del test modificado y `node scripts/check-docs.mjs` pasan. La comparación de CSV contra HEAD confirma que sólo cambiaron los tres metadatos de revisión en las dos fichas, tanto en entrada como salida. Las huellas de la tabla de congelamiento coincidían todas antes del cambio; todas salvo los dos CSV autorizados siguen coincidiendo después.

## Trazabilidad del congelamiento

La regla 5 permite validar estas dos fichas sin cambiar reglas. La modificación es exclusivamente de los metadatos de revisión. `v1/congelamiento.md` conserva sus huellas originales; las dos huellas siguientes pasan a representar el estado posterior a la aceptación y deben comprobarse junto con este registro. No se reescribe la tabla histórica para aparentar que nada cambió.

| Archivo | SHA-256 congelado | SHA-256 tras aceptación |
|---|---|---|
| `v0/fase-11/reevaluacion/fichas-ronda-2.csv` | `43eda632c802794a3f4c3e07cad264ad1f2724d4e6732763f4ba1c5ec83913a9` | `7c8472b3e23cb6c5db97278c9ea57e15c4a0ebb5db0dd691f4bdfcdc13f35ce7` |
| `v0/fase-11/reevaluacion/fichas-ronda-2-factores.csv` | `20d27cba5fb4e5794618626caaad420bc3e85f657974cc2673bd4d0c2716ef69` | `5e96850b902c04c91107932b49f8999c9b37a1d3fddad91067916af5b4fb6b15` |

Todos los demás archivos de la tabla de congelamiento permanecen intactos. No se ejecutaron los generadores `reevaluar*.py` contra la repo: reconstruyen las propuestas como pending y no deben usarse para borrar una aceptación.

## Límites

No se realizó la revisión profesional de Fase 12. No se recibieron juicios de Evangelina, Manuel ni otros profesionales. Al preparar la aceptación faltaban el plan y el README original de prompts. Emiliano los suministró posteriormente el mismo 2026-10-13: el plan se incorporó sin cambios en `fuentes/plan-emi15-emi41.md`, el índice en `prompts/README.md`, y el prompt de Fase 12 quedó cotejado con ambos. Continúa pendiente acordar la muestra y participantes antes de la corrida.
