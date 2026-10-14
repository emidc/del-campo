# Prompts del experimento EMI-15 + EMI-41

Índice suministrado por Emiliano el 2026-10-13. Se conserva la secuencia recibida y se agrega la Fase 12. Los prompts de fases 0–11 referenciados en el índice no fueron suministrados ni están en este checkout; no se recrean ni se presentan como archivos disponibles.

| Fase | Prompt | Necesita antes | Después, Emiliano |
|---|---|---|---|
| 0 | `fase-0-consolidar-decisiones.md` | nada | Aprueba «Para aprobar» de `v0/decisiones-v0.md` |
| 1 | `fase-1-protocolo.md` | Fase 0 | Aprueba «Para aprobar» de `v0/protocolo.md` |
| 2 | `fase-2-casos-de-propiedad.md` | Fase 0 (en paralelo con la 1) | Completa `v0/adjudicacion-casos.md` sin abrir el anexo |
| 3 | `fase-3-metodologia-v0.md` | Fases 0–2 aprobadas y casos adjudicados | Responde F3-1 a F3-6 en `fuentes/respuestas-emiliano.md` y aprueba «Para aprobar» de `v0/metodologia-v0.md` |
| 4 | `fase-4-dry-run.md` | Fase 3 aprobada (en paralelo con la 6) | Aprueba el reporte; los FAIL pasan a la Fase 5 |
| 5 | `fase-5-adjudicacion-fails.md` | Fase 4 aprobada (en paralelo con la 7) | Decide grupo por grupo; aprueba la v0.2, que queda congelada para la 8 |
| 6 | `fase-6-cobertura-emi41.md` | Fase 3 aprobada (en paralelo con la 4) | Aprueba el conjunto de empresas |
| 7 | `fase-7-empresas-sinteticas.md` (una vez por familia, reemplazando `<FAMILIA>`) | Fase 6 aprobada (en paralelo con la 5) | Revisa cada familia por plausibilidad, sin abrir `cerrado/` |
| 8a | `fase-8a-congelamiento-y-muestra.md` | Fases 5 y 7 cerradas (en paralelo con 8b y 9a) | Recibe su paquete de 30 fichas y evalúa a ciegas |
| 8b | `fase-8b-evaluacion-agente.md` (una vez por familia, reemplazando `<FAMILIA>`) | Fases 5 y 7 cerradas (en paralelo con 8a y 9a) | Nada: no mira sus resultados |
| 8c | `fase-8c-comparacion.md` | 8b completa y las 30 fichas de Emiliano entregadas | Aprueba el reporte de reproducibilidad |
| 9a | `fase-9a-umbrales-preliminares.md` | Fase 5 cerrada (en paralelo con la 8) | La revisa después de entregar sus fichas de la 8 |
| 9b | `fase-9b-calibracion-sinteticos.md` | Fase 8 cerrada y decisiones de Emiliano sobre la 9a | Aprueba umbrales finales; se abre la v0.3 |
| 10 | sin prompt en esta carpeta (corrida F10-REG-01, `v0/fase-10/`) | Fase 9 cerrada (v0.3) | Aprobó el registro de la corrida (CH-097) y mergea la PR #69 |
| 11a | `fase-11a-dictamen-v1-candidate.md` | Fase 10 cerrada (PR #69 mergeada) | Responde el «Para decidir» de `v0/fase-11/dictamen-fase-11.md`: D14, cada corrección y si se crea la v1 candidate |
| 11b | `fase-11b-v1-candidate.md` | Decisiones de Emiliano sobre la 11a | Aprueba el reporte; la v1 candidate queda congelada en `v1/` para la Fase 12 |
| 12 | [fase-12-revision-profesional.md](fase-12-revision-profesional.md) | Fase 11b aprobada y v1 candidate congelada; muestra y revisores acordados antes de abrir la corrida | Revisa las discrepancias y el dictamen profesional; el cierre de EMI-15 corresponde a Fase 13 |

**Cómo correr uno en un thread del proyecto:** en el chat del proyecto, escribí «Corré el prompt de `/mnt/project-files/T-0021/prompts/fase-N-….md`». **En una terminal del repo:** copiá la carpeta `T-0021/` al repo y pegá el contenido del prompt; los prompts no usan herramientas propias de los threads, y RAIZ pasa a ser esa carpeta.

Las respuestas de Emiliano viven en `../fuentes/respuestas-emiliano.md` (ruta relativa a `prompts/`). Si una respuesta cambia, se actualiza ahí y no en los prompts. Ese archivo no fue suministrado en esta incorporación; no inventar su contenido.

## Estado de Fase 12 · 2026-10-13

Cerrada por decisión explícita de Emiliano con su piloto profesional S06. No queda condicionada a otros revisores. Evidencia y dictamen: `../v0/fase-12/reporte-fase-12.md`. La v1 permanece congelada; el siguiente hito es Fase 13, cierre de EMI-15.
