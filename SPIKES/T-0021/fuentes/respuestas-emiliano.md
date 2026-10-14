# Respuestas de Emiliano a la evaluación del plan EMI-15 + EMI-41

> Preguntas de `evaluacion-plan-emi15-emi41.md`. Respondidas por Emiliano el 2026-10-05 15:48 UTC: acepta todos los defaults, con una salvedad en la 9. Mientras una respuesta diga PENDIENTE, los agentes usan el default marcado y lo registran como **supuesto pendiente de confirmación**, nunca como decisión.

| # | Pregunta | Default (recomendado) | Respuesta |
|---|---|---|---|
| 1 | ¿El plan EMI-15 + EMI-41 es el acta de lo decidido después de la revisión adversarial? | Sí | Aceptado (default) |
| 2 | Magnitud de referencia del ancla económica | Resultado operativo anual | Aceptado (default) |
| 3 | Disparo de `consecuencia_extrema` | Cualquier dimensión de I = 5 | Aceptado (default) |
| 4 | Sin umbrales de banda, ¿qué juzga el dry run de la Fase 4? | Sólo orden y visibilidad; las bandas se juzgan en la Fase 9 | Aceptado (default) |
| 5 | ¿Casos de propiedad adjudicados en forma narrativa, con las ternas P/I/V en un anexo cerrado? | Sí | Aceptado (default) |
| 6 | ¿Sumar a la Fase 2 "continuidad: ¿I o V?", "el límite se consume" y la propiedad P11 "sensible a la mejora"? | Sí | Aceptado (default) |
| 7 | Número de casos independientes que falsan D14 | 3 | Aceptado (default) |
| 8 | En la Fase 8, ¿evaluás todos los riesgos o una muestra? | Todos si son ≤ 40; si no, muestra estratificada de 30 | Aceptado (default). **Precisado en la Fase 6** (2026-10-05 21:27 UTC, aprobado 2026-10-06): con 37 empresas y 252 fichas, la muestra de 30 se estratifica por familia de actividad, con mínimo 3 por familia; cuenta cada ficha con factores propios y un padre sale con todos sus sub-riesgos (CH-076, CH-077). |
| 9 | Dónde trabajan los agentes | Threads de este proyecto, archivos en `/mnt/project-files/T-0021/` y copia de cada entregable aprobado en Linear (proyecto Risk OS) | Aceptado como prueba: la primera vez se usan threads de este proyecto. Lo habitual de Emiliano es correr agentes en terminales dentro del repo (`/Users/emilianodelcampo/repos/del-campo`), así que los prompts no deben depender de herramientas exclusivas de los threads. |


**Defaults de la evaluación (H1–H15).** Emiliano aceptó "tus recomendaciones", lo que incluye los defaults escritos en `evaluacion-plan-emi15-emi41.md` (H6 ranking inicial, H7 lista de no evaluables, H11 métricas adicionales sin target, H12 independencia del evaluador agente, H15 menores). Cuentan como decisiones aceptadas el 2026-10-05, no como supuestos.

## Fase 3 · Reglas que abre la adjudicación de los casos

> Preguntas del 2026-10-05 ~20:00 UTC, derivadas de `v0/adjudicacion-casos.md`. Respondidas por Emiliano el 2026-10-05 20:35 UTC (revisión del borrador de `v0/metodologia-v0.md`) y aprobadas a las 20:46 UTC.

| # | Pregunta | Default (recomendado) | Respuesta |
|---|---|---|---|
| F3-1 | `safety-critical` (CP-02, CP-15) frente a `consecuencia_extrema` (D20) | Conviven: `consecuencia_extrema` sigue como bandera informativa (cualquier dimensión de I = 5); `safety_critical` se dispara con I_personas = 5 (múltiples fatalidades plausibles) y obliga a vista dedicada y tratamiento, sin tocar banda ni ranking | Modificado: conviven; `safety_critical` se dispara con I-personas ≥ 4 (una muerte plausible o daño irreversible grave), no sólo con 5 |
| F3-2 | Riesgo padre (CP-12) frente a D21 | Sólo el riesgo padre compite en el ranking principal; los sub-riesgos quedan como detalle de análisis y tratamiento, sin rankear | Sí al modelo padre/sub-riesgo; no a mezclar factores: el padre agrupa escenarios completos |
| F3-3 | V partida (CP-14) | Se registran contención y recuperación por separado, y V efectivo = el peor de los dos | No como regla universal: contención y recuperación separadas, cada una actúa sólo sobre las dimensiones a las que afecta |
| F3-4 | Desempate por amplitud de I en D10 (CP-13: cuenta dos veces la misma pérdida) | Se quita. Queda: banda → C_raw → I efectivo → I_personas → empate legítimo | Aceptado (default) |
| F3-5 | Escenario agregado por causa común (CP-20) frente a D13 | Se evalúa con P/I/V propios en una vista aparte; nunca entra al ranking principal ni suma a sus riesgos | Aceptado, cambiando "en la mayoría de los casos" por "plausible y material" |
| F3-6 | Dónde cae el instante del evento (CP-06, CP-07) | En el evento iniciador (ignición, robo de la credencial): rociadores, detección y restricción de acceso van a V | Aceptado (default) |

**Defaults sin pregunta (salen directo de la adjudicación):** la falta de plan de continuidad va a V y no a I (CP-16, cierra la contradicción #1); una acción ejecutada queda "cumplida" con un campo de eficacia aparte (CP-10, coincide con protocolo §6.3); la criticidad puede bajar sin acción por un cambio de contexto real (CP-19, D18 en los dos sentidos); el movimiento por dimensión de I antes/después es una vista obligatoria (CP-04, 09, 17, 18); el ancla económica relativa al resultado operativo anual queda confirmada por CP-11.

---

> **Unión de copias (Fase 13, 2026-10-14).** Hasta la PR #72 había dos copias de este archivo: la de la carpeta del proyecto, con las respuestas históricas de arriba, y la del repo, con sólo las de la Fase 12, que se incorporaron porque ese checkout no traía el original. Emiliano aprobó unirlas (punto 6 de `v0/fase-13/decisiones-13.md`). Las secciones se copian sin cambiar ningún texto.

## Fase 12 · EV-24 · 2026-10-13

Emiliano no acepta el producto ordinal P × I × V como orden principal. Lo acepta sólo como apoyo diagnóstico/tamizaje bajo no compensación: propone veto/pista prioritaria para I-personas ≥ 4 o I-legal ≥ 4, vector de factores siempre visible y orden fino mediante análisis multicriterio cualitativo/juicio experto.

Estado: respuesta profesional posterior a revelación; condiciones propuestas, no reglas implementadas ni aprobación de la v1 actual. Detalle y límites: `v0/fase-12/piloto-emiliano/preguntas-revision-profesional.md`. Las respuestas históricas ausentes no se inventan. No se modifica la metodología congelada ni el conteo D14.

## Fase 12 · EV-06 / EV-37 · 2026-10-13

Respuesta humana posterior a revelación: la gravedad jurídica depende de conducta, evidencia de negligencia, rol/delegación, causalidad/evitabilidad y decisiones de autoridad; no es automática por la sola muerte. Propone distinguir nivel 4 por exposición penal posible de veto más exigente basado en diligencia debida. Sus afirmaciones de imputación/clausura inexorable y delegación automática no quedan verificadas ni se adoptan como reglas.

Detalle, fuentes oficiales consultadas y límites: `v0/fase-12/piloto-emiliano/preguntas-revision-profesional.md`. Estado: respuesta recibida, propuestas sujetas a validación; ninguna modificación de candidate o factores cerrados.

## Fase 12 · EV-02 · 2026-10-13

Emiliano propone facturación anual neta de impuestos como referencia cuando no hay RO positivo en tres ejercicios, patrimonio neto tangible como control y verificación de capital de trabajo/liquidez. Exige recalibración, moneda homogénea y referencia temporal ajustada a escala vigente. Porcentajes de ejemplo no son cortes aprobados. Pregunta por alternativa dual: recomendación del coordinador es dos lecturas paralelas de escala y resistencia financiera, sin ponderación ni cambio de denominador por tamaño del shock, pendiente de validar y aprobar. Ninguna regla v1 modificada.

Detalle, fuentes consultadas y límites: `v0/fase-12/piloto-emiliano/preguntas-revision-profesional.md`.

## Fase 12 · EV-08 · 2026-10-13

Emiliano rechaza misma banda para amenaza existencial/preparación media y consecuencia grave/preparación débil con Pmedia. Propone banda superior o tratamiento diferenciado por severidad terminal con independencia de defensas parciales. Es propuesta no implementada; no equiparar automáticamente I-econ5con terminalidad empresarial. Detalle y fundamentos en `v0/fase-12/piloto-emiliano/preguntas-revision-profesional.md`. Cuatro preguntas explícitas pendientes.

## Fase 12 · EV-10 / EV-20 · 2026-10-13

Emiliano prioriza estratégicamente el remoto extremo terminal sobre probable/moderado; prioriza incondicionalmente remoto con muerte creíble y parálisis de meses. Si extremo es sólo económico y absorbible, traslada acción inmediata al probable/moderado; si terminal mantiene prioridad estratégica con instrumentos financieros/contractuales propuestos. No se adopta como regla ni se modifica transferencia/I/V.

El mensaje final quedó incompleto en el caso de pérdida que consuma más del50%deventas sin quiebra directa; se solicita continuación, sin inventar criterio. Detalle en `v0/fase-12/piloto-emiliano/preguntas-revision-profesional.md`. EV-11 y EV-22 pendientes.

## Fase 12 · EV-11 / EV-22 y cierre del piloto · 2026-10-13

EV-11: Crítica incondicional para probable/económicoextremo/preparaciónmedia, mediante piso propuesto. V1actualnoincluye piso: P4,Iecon5,Vcont3,Vrec3da60Alta.

EV-22: Personas, Legalpenaldirecto, causalidadsistémica, pérdidairreversiblenotransferible e inminencia. Propuesta que difiere deD10y tensionaD17siincluye seguro; no implementada.

Compleción: pérdida>50%ventas sinquiebra propone límitescontractuales/renunciassegurocliente, RCdeguarda y crédito standby. Opinión del revisor, no contrato/cobertura validada ni acción externa.

Ocho preguntas respondidas. PilotoS06completado: Emiliano rechaza índicecomoordenprincipal, acepta tamizaje sólo condicionado. Fase12global abierta y v1congelada. Detalle en `v0/fase-12/piloto-emiliano/preguntas-revision-profesional.md`.

## Decisión de cierre de Fase 12 · 2026-10-13

Instrucción explícita de Emiliano: «quiero cerrar la fase 12 con el piloto profesional hecho por mi».

**Fase 12 CERRADA**, usando S06 y la revisión de Emiliano como alcance suficiente. Otros profesionales no son condición de cierre. El dictamen conserva rechazo de la v1 como orden principal y tamizaje sólo condicionado; no se aprueban o implementan reglas nuevas. Discrepancias registradas se trasladan a Fase 13/eventual versión posterior, sin borrarlas ni convertirlas en bloqueos del cierre de Fase 12.

Fuente de estado actual: `v0/fase-12/reporte-fase-12.md`. Los estados «abierta» de entradas anteriores corresponden a la cronología anterior a esta decisión. EMI-15 y T-0021 no se declaran terminados automáticamente.

## Fase 13 · Cierre de EMI-15 · 2026-10-14

Decisiones de Emiliano sobre el "Para decidir" de `v0/fase-13/dossier-cierre-emi15.md`, copiadas tal cual en `v0/fase-13/decisiones-13.md`: D14 2 de 3, no falsada (S06 como un único caso); `P × I × V` retenido provisionalmente como índice heurístico de tamizaje, no validado como función de orden final, y `C_raw` no cardinal; la banda (69,6%) queda como limitación no bloqueante; la v1 candidate se promueve a v1 sin cambios de regla; las propuestas de la Fase 12 van a una v1.1; EMI-15 se cierra cuando estén creados y vinculados los follow-ups de v1.1 y de validación independiente.
