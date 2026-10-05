# Decisiones de la metodología de criticidad · v0.0

> Fecha: 2026-10-05 · Versión: **v0.0** (aprobada por Emiliano, 2026-10-05) · Fase 0 del plan EMI-15 + EMI-41.
> Este documento **supera** a `plan-pasos-1-2.md` (§3.1, §3.2 y §6) y al conjunto de `fuentes/decisiones-pre-revision.md`. Ninguno de los dos se edita; donde difieren de lo que sigue, vale esto.
> Los cambios se registran en `changelog-metodologia.md`.

**Abreviaturas de fuentes.** *respuestas* = `fuentes/respuestas-emiliano.md` · *plan* = `fuentes/plan-emi15-emi41.md` · *evaluación* = `evaluacion-plan-emi15-emi41.md` · *revisión* = `revision-adversarial-v0.md` · *pre-revisión* = `fuentes/decisiones-pre-revision.md` · *plan-pasos* = `plan-pasos-1-2.md`.

**Casos.** "Fase 2 #N" es el caso N de la lista mínima del plan (Fase 2). Los tres que suma la respuesta 6: **#CI** "Continuidad: ¿I o V?", **#LC** "El límite se consume", **#P11** "Sensible a la mejora".

**Uso en v1.** Pantalla u operación de Risk OS v1: priorizar, ordenar la lista, matriz, plan de acción, transferencia, historial.

---

## Propósito de la criticidad

- **Texto vigente:** La criticidad sirve para priorizar riesgos, ordenar la lista y representarlos en la matriz. No equivale automáticamente a prioridad del plan de acción.
- **Estado:** decidida (plan, Fase 0 "Criticidad").
- **Antes:** "Prioridad de atención" (plan-pasos §3.2 D1); "prioridad de atención actual, que cambia con el tiempo" (plan-pasos §6).
- **Origen del cambio:** decisión de Emiliano (§6 y pre-revisión).
- **Qué la pone a prueba:** ninguno todavía.
- **Uso en v1:** priorizar; ordenar la lista; matriz.

---

## Propiedades

### P1 · Monotonía
- **Texto vigente:** Manteniendo constantes los demás factores, aumentar P, I o V nunca puede disminuir la criticidad.
- **Estado:** decidida (pre-revisión, ratificada por plan Fase 0 "Consolidar P1–P10"; ver Para aprobar 1).
- **Antes:** "Subir probabilidad o impacto nunca baja la criticidad" (plan-pasos §3.1).
- **Origen del cambio:** incorporación de V (plan-pasos §6).
- **Qué la pone a prueba:** ninguno todavía.
- **Uso en v1:** ordenar la lista.

### P2 · Desconocido ≠ bajo
- **Texto vigente:** La falta de información nunca debe reducir artificialmente la criticidad.
- **Estado:** decidida (pre-revisión, ratificada por plan Fase 0; ver Para aprobar 1).
- **Antes:** sin cambio de fondo (plan-pasos §3.1).
- **Origen del cambio:** —
- **Qué la pone a prueba:** Fase 2 #8.
- **Uso en v1:** ordenar la lista.

### P3 · Explicable
- **Texto vigente:** Cada resultado debe poder justificarse mediante los factores y reglas aplicadas.
- **Estado:** decidida (pre-revisión, ratificada por plan Fase 0; ver Para aprobar 1).
- **Antes:** "se justifica citando reglas, en una frase" (plan-pasos §3.1).
- **Origen del cambio:** —
- **Qué la pone a prueba:** ninguno todavía (aplica a todos).
- **Uso en v1:** priorizar.

### P4 · Reproducible
- **Texto vigente:** Se mide por acuerdo por factor, de banda y de ranking. Targets experimentales iniciales: al menos 80% de evaluaciones dentro de ±1 nivel por factor; al menos 70% de coincidencia de banda; correlación/overlap del ranking registrado como baseline. Se reportan además acuerdo exacto y kappa ponderado, sin target. Estos porcentajes son criterios experimentales v0, no estándares universales.
- **Estado:** decidida (plan, Fase 1 "Reproducibilidad"; evaluación, H11).
- **Antes:** "Dos evaluadores con la misma información deberían obtener resultados razonablemente similares. Es un criterio empírico de calidad, no una regla matemática rígida" (pre-revisión). Antes aún: "difieren como máximo en una categoría" (plan-pasos §3.1).
- **Origen del cambio:** C8, I14.
- **Qué la pone a prueba:** Fase 8 (evaluación ciega).
- **Uso en v1:** sin justificar (criterio del experimento; ver Para aprobar 8).

### P5 · Orden explícito
- **Texto vigente:** La metodología debe ordenar riesgos cuando exista una diferencia relevante. Los empates legítimos pueden conservarse.
- **Estado:** decidida (pre-revisión, ratificada por plan Fase 0; ver Para aprobar 1).
- **Antes:** "Siempre hay una regla para ordenar empates (o se declara que el orden es parcial)" (plan-pasos §3.1).
- **Origen del cambio:** razón no registrada (ver Para aprobar 10).
- **Qué la pone a prueba:** Fase 2 #1, #3, #5.
- **Uso en v1:** ordenar la lista.

### P6 · Extremos visibles
- **Texto vigente:** Una consecuencia extrema no debe quedar escondida únicamente por una probabilidad baja.
- **Estado:** decidida (pre-revisión, ratificada por plan Fase 0; ver Para aprobar 1).
- **Antes:** sin cambio de fondo (plan-pasos §3.1).
- **Origen del cambio:** —
- **Qué la pone a prueba:** Fase 2 #2, #15.
- **Uso en v1:** ordenar la lista (filtro de `consecuencia_extrema`); matriz.

### P7 · Cambiable
- **Texto vigente:** Las reglas deben ser explícitas y modificables; evitar lógica opaca o enterrada.
- **Estado:** decidida (pre-revisión, ratificada por plan Fase 0; ver Para aprobar 1).
- **Antes:** "La regla de combinación vive en una tabla editable, no en una fórmula enterrada" (plan-pasos §3.1).
- **Origen del cambio:** paso de matriz a fórmula (D6 → D14).
- **Qué la pone a prueba:** ninguno todavía.
- **Uso en v1:** sin justificar (criterio de diseño; ver Para aprobar 8).

### P8 · Sin falsa precisión
- **Texto vigente:** Los números no deben sugerir una exactitud superior a la evidencia disponible.
- **Estado:** decidida (pre-revisión, ratificada por plan Fase 0; ver Para aprobar 1).
- **Antes:** "Nada de números que sugieran más exactitud que la información disponible" (plan-pasos §3.1).
- **Origen del cambio:** razón no registrada (ver Para aprobar 10).
- **Qué la pone a prueba:** ninguno todavía.
- **Uso en v1:** priorizar; matriz (se muestra banda y factores, no el raw score: D12).

### P9 · Coherencia dinámica
- **Texto vigente:** Si una acción mejora efectivamente uno o más factores y el resto permanece constante, la criticidad no puede aumentar. Sí puede aumentar por nueva información que modifique P, I o V.
- **Estado:** decidida (pre-revisión, ratificada por plan Fase 0; ver Para aprobar 1).
- **Antes:** "Ejecutar una acción nunca sube la criticidad del riesgo al que pertenece" (plan-pasos §6).
- **Origen del cambio:** razón no registrada (ver Para aprobar 10).
- **Qué la pone a prueba:** Fase 2 #4, #10.
- **Uso en v1:** plan de acción; historial.

### P10 · Atribuible
- **Texto vigente:** Todo cambio de criticidad debe poder explicarse por un cambio de factores y por la evidencia/información que lo produjo.
- **Estado:** decidida (pre-revisión, ratificada por plan Fase 0; ver Para aprobar 1).
- **Antes:** sin cambio de fondo (plan-pasos §6).
- **Origen del cambio:** —
- **Qué la pone a prueba:** Fase 2 #10, #LC.
- **Uso en v1:** historial.

### P11 · Sensible a la mejora
- **Texto vigente:** Si una acción mejora efectivamente el factor dominante de un riesgo, el sistema debe poder reflejarlo, sea en la banda o en una vista explícita del movimiento por factor. Es criterio de test, no regla de cálculo.
- **Estado:** decidida (respuestas, pregunta 6).
- **Antes:** no existía.
- **Origen del cambio:** O8 (y I2, I4).
- **Qué la pone a prueba:** Fase 2 #P11, #4.
- **Uso en v1:** plan de acción; historial.

---

## Decisiones

### D1 · Qué es la criticidad
- **Estado:** superada por "Propósito de la criticidad".
- **Antes:** plan-pasos §3.2 y §6 (ver Propósito).

### D2 · Estado evaluado
- **Texto vigente:** La criticidad representa el estado actual/residual mediante `P_actual × I_bruto × V_actual`. Se conserva historial y baseline.
- **Estado:** decidida (plan, Fase 0 "Estado actual").
- **Antes:** "Se evalúa el riesgo actual/residual, considerando las condiciones y controles actuales; se conserva una línea de base; no se sobrescriben silenciosamente estados anteriores" (pre-revisión). Antes aún: inherente (plan-pasos §3.2).
- **Origen del cambio:** C2 (lo residual pasa por P y V; I es bruto).
- **Qué la pone a prueba:** Fase 2 #4, #10.
- **Uso en v1:** priorizar; historial.

### D3 · Horizonte
- **Texto vigente:** 12 meses.
- **Estado:** decidida (plan, Fase 0 "P").
- **Antes:** sin cambio (plan-pasos §3.2; pre-revisión).
- **Origen del cambio:** —
- **Qué la pone a prueba:** ninguno todavía.
- **Uso en v1:** priorizar.

### D4 · Probabilidad P
- **Texto vigente:** Probabilidad de que el evento ocurra durante los próximos 12 meses. P incorpora exposición, condiciones actuales y controles preventivos; cubre todo lo anterior al evento. Escala 1–5 con ancla principal en evidencia observable: antecedentes, recurrencia, presencia de condiciones causales, experiencia en empresas comparables. Los porcentajes quedan como referencia secundaria cuando existe información cuantitativa real. La redacción de cada nivel se escribe en la Fase 3.
- **Estado:** decidida (plan, Fase 0 "P" y Fase 3 "Escala P").
- **Antes:** escala 1 Remota (<5%) … 5 Muy probable (>70%), porcentajes como anclas orientativas, prohibido inventarlos sin evidencia (pre-revisión D4).
- **Origen del cambio:** I11, C3.
- **Qué la pone a prueba:** Fase 2 #6, #7.
- **Uso en v1:** priorizar; matriz.

### D5 · Impacto I y sus dimensiones
- **Texto vigente:** Cuatro dimensiones, escalas ordinales 1–5; se conserva cada una e `I efectivo = max(dimensiones)`.
  - **Económico:** consecuencia monetaria para esta empresa, relativa a su capacidad económica, no a montos absolutos universales. Magnitud de referencia: resultado operativo anual. Incluye daño directo, multas y pérdida económica por interrupción.
  - **Personas:** consecuencias humanas. No se monetizan.
  - **Continuidad:** consecuencia operativa no monetaria: tiempo sin operar, degradación de servicio, incapacidad de cumplir funciones críticas.
  - **Legal/regulatorio:** consecuencia jurídica/regulatoria no monetaria: pérdida de habilitación, restricción de operar, responsabilidad relevante, intervención regulatoria.
  - Reputación queda fuera de v0 (D13). Las anclas de cada nivel se escriben en la Fase 3.
- **Estado:** decidida (plan, Fase 0 "I" y Fase 3 "Escalas de I"; respuestas, pregunta 2).
- **Antes:** dimensiones nombradas "con anclas" que no existían; "personas y dinero no conmensurables" (pre-revisión D5).
- **Origen del cambio:** C7, I9, C10.
- **Qué la pone a prueba:** Fase 2 #5, #11, #13.
- **Uso en v1:** priorizar; matriz.

### D6 · Fórmula o matriz
- **Estado:** superada por D14.
- **Antes:** "Matriz ordinal con tabla explícita (multiplicar ordinales viola P8)" (plan-pasos §3.2); "Fórmula, no matriz" (plan-pasos §6). La reversión del argumento P8 está en el changelog (CH-026).

### D7 · Pisos de banda por consecuencia extrema
- **Estado:** superada por D20 ("sin pisos de banda en v0 + bandera `consecuencia_extrema`").
- **Antes:** "Cualquier I=5 ⇒ mínima Alta; I_personas ≥4 ⇒ mínima Alta; I_personas=5 ⇒ bandera de consecuencia catastrófica" (pre-revisión D7). Antes aún: "impacto 5 en personas ⇒ criticidad ≥ alta" (plan-pasos §3.2).
- **Origen del cambio:** I2, C5, I1, C6 (la "variante más limpia" de la recomendación 6 de la revisión).

### D8 · Unknowns: valor plausible, rango y techo
- **Texto vigente:** Si existe un valor defendible más plausible: ese valor calcula la criticidad; se conserva el rango; el extremo superior genera un techo plausible; el techo no participa del ranking. Si no existe ningún valor plausible defendible: el factor queda `unknown`; no se inventa un valor; la criticidad puede quedar no evaluable; se genera necesidad de validación. Un riesgo no evaluable va a una lista separada "no evaluable", con su motivo y su necesidad de validación, nunca mezclado en el ranking; si tiene consecuencia extrema, la bandera también aplica.
- **Estado:** decidida (plan, Fase 0 "Unknowns"; evaluación, H7).
- **Antes:** "Ante un rango, se conserva el rango y para priorización provisional se usa el extremo superior plausible" (pre-revisión D8; similar en plan-pasos §3.2).
- **Origen del cambio:** C1, C6, I12. Con esto desaparece la contradicción D8↔D9.
- **Qué la pone a prueba:** Fase 2 #8.
- **Uso en v1:** ordenar la lista.

### D9 · Incertidumbre separada de la criticidad
- **Texto vigente:** La incertidumbre nunca modifica directamente el score. `uncertainty`: low | medium | high; medium/high explican qué falta conocer. Puede generar una prioridad de conocimiento/revisión independiente: Alta/Crítica + uncertainty high puede generar una bandera de revisión prioritaria, sin aumentar criticidad.
- **Estado:** restricción (EMI-17; ratificada en plan, Fase 0 "Unknowns").
- **Antes:** sin cambio de fondo (pre-revisión D9; plan-pasos §3.2).
- **Origen del cambio:** C1 (se resolvió cambiando D8, no D9).
- **Qué la pone a prueba:** Fase 2 #8.
- **Uso en v1:** ordenar la lista (la incertidumbre no participa). La bandera de revisión prioritaria: sin justificar (ver Para aprobar 5).

### D10 (pre-revisión) · Ranking
- **Estado:** superada por D10.
- **Antes:** "1. banda efectiva; 2. raw score; 3. I efectivo; 4. I_personas; 5. P; 6. empate legítimo" (pre-revisión D10). Antes aún: "impacto, luego personas, luego mayor uncertainty primero" (plan-pasos §3.2).
- **Origen del cambio:** C5, I3, O2, y la eliminación de pisos (D20).

### D10 · Ranking
- **Texto vigente:** Versión inicial a definir en la Fase 3. Default que usa esa fase: banda → C_raw → I efectivo → amplitud de I (dimensiones en nivel ≥ I efectivo − 1) → I_personas → empate legítimo; P deja de ser desempate. La incertidumbre no participa del ranking. Un orden técnico por risk_id/nombre puede usarse en la UI para estabilidad, sin representar prioridad. Los desempates y su orden son hipótesis experimentales.
- **Estado:** abierta (Fase 3; default de evaluación, H6).
- **Antes:** ver D10 (pre-revisión).
- **Origen del cambio:** C5, I3, O2.
- **Qué la pone a prueba:** Fase 2 #1, #3, #5.
- **Uso en v1:** ordenar la lista.

### D11 · Comparabilidad entre dimensiones de I
- **Texto vigente:** Las dimensiones no son convertibles entre sí, pero deben ser comparables nivel a nivel.
- **Estado:** decidida (plan, Fase 0 "I").
- **Antes:** "Personas y dinero NO se consideran magnitudes conmensurables; compartir la escala 1–5 no implica equivalencia" (pre-revisión D5). Antes aún: "No: dimensión con su propio piso" (plan-pasos §3.2).
- **Origen del cambio:** C10.
- **Qué la pone a prueba:** Fase 2 #5, #13.
- **Uso en v1:** priorizar; matriz.

### D12 · Bandas
- **Texto vigente:** Cuatro bandas: Baja, Media, Alta, Crítica. Factores visibles, raw score interno, banda visible. Los umbrales no están definidos: se calibran en la Fase 9 con el procedimiento del plan, sin cortes arbitrarios ni equiespaciados y sin porcentajes obligatorios de riesgos por banda.
- **Estado:** decidida (plan, Fase 3 "Criticidad" y Fase 9). Los umbrales: abiertos → Fase 9.
- **Antes:** "El raw score se conserva para ordenar dentro de una banda" (pre-revisión D12); eso pasa a D10.
- **Origen del cambio:** I15 (orden de calibración). La cuota de distribución que proponía C6 no se adoptó.
- **Qué la pone a prueba:** Fase 9.
- **Uso en v1:** matriz; ordenar la lista.

### D13 · Excluidos de v0
- **Texto vigente:** Quedan fuera salvo que los casos demuestren que son necesarios: velocidad de materialización, detectabilidad, correlación/dependencia entre riesgos, asegurabilidad como factor de criticidad. Reputación queda fuera de v0. Reputación y la observación cuantitativa que sostiene cada factor se registran como texto, sin entrar en el score.
- **Estado:** decidida (pre-revisión D13 y D5, ratificada por plan Fase 0; evaluación, H15 para el registro textual).
- **Antes:** sin cambio en la lista (plan-pasos §3.2).
- **Origen del cambio:** O7, O4 (registro textual).
- **Qué la pone a prueba:** ninguno todavía.
- **Uso en v1:** no aplica (excluye elementos).

### D14 · Fórmula bajo prueba
- **Texto vigente:** `C_raw = P × I × V`, con P, I y V ordinales 1–5. Es un índice ordinal de priorización, no una medición cardinal ni actuarial, y se trata explícitamente como hipótesis falsable. Toma 30 valores no equiespaciados (reemplaza "rango 1–125") y no se presenta como escala cardinal continua. **Falsación:** si 3 casos independientes previamente adjudicados producen órdenes incorrectos que no pueden corregirse mediante calibración, anclas o desempates simples, la regla de combinación se considera falsada y se reabre.
- **Estado:** decidida (plan, Fase 0 "Fórmula bajo prueba", Fase 3 y Fase 5 "Criterio de falsación"; respuestas, pregunta 7).
- **Antes:** "C_raw = P × I × V … Rango posible: 1–125" (pre-revisión D14). Antes aún: matriz (plan-pasos §3.2 D6).
- **Origen del cambio:** C4, O1, I5.
- **Qué la pone a prueba:** Fase 2 #1, #3; falsación en Fase 5.
- **Uso en v1:** priorizar; ordenar la lista.

### D15 · V y frontera P/V
- **Texto vigente:** V representa la vulnerabilidad desde que el evento ocurre: contención, respuesta, redundancia, recuperación. P y V quedan separados mediante un corte temporal en el instante del evento: P cubre todo lo anterior. V se evalúa post-evento, con rúbrica de contención y recuperación; ante perfiles mixtos, se documenta qué aspecto domina. Escala 1–5 (anclas en Fase 3). Anti doble conteo: un mismo control o condición no se descuenta simultáneamente en varios factores salvo mecanismos causales diferentes y explícitamente documentados.
- **Estado:** decidida (plan, Fase 0 "V" y Fase 3 "V 1–5"; anti doble conteo de pre-revisión).
- **Antes:** "V mide qué tan susceptible es la organización a sufrir consecuencias relevantes si el evento ocurre, considerando controles, preparación, redundancias, capacidad de respuesta y recuperación actuales" (pre-revisión). Antes aún: "P = frecuencia del evento en el entorno; V = qué tan preparada está esta empresa" (plan-pasos §6).
- **Origen del cambio:** C3, I10 (la regla "aspecto más débil" de I10 no se adoptó).
- **Qué la pone a prueba:** Fase 2 #6, #7, #14, #CI.
- **Uso en v1:** priorizar; plan de acción.

### D16 · Acciones
- **Texto vigente:** Una acción no modifica automáticamente P, I o V. El cambio esperado de una acción es sólo una hipótesis. Una acción puede modificar P, V o dimensiones específicas de I solamente cuando existe un mecanismo causal explícito compatible con la definición de ese factor; más de un factor sólo con mecanismos diferentes claramente explicados, sin doble contar el mismo beneficio.
- **Estado:** decidida (plan, Fase 0 "Dinámica"; mecanismo causal de pre-revisión D16).
- **Antes:** sin cambio de fondo en pre-revisión. Antes aún: "Cada acción declara qué factor pretende mejorar y en cuánto" (plan-pasos §6).
- **Origen del cambio:** —
- **Qué la pone a prueba:** Fase 2 #10.
- **Uso en v1:** plan de acción.

### D17 · Seguro y transferencia
- **Texto vigente:** La transferencia aseguradora no modifica la criticidad. La criticidad utiliza siempre impacto económico bruto. La exposición económica retenida se registra y visualiza separadamente en `risk-transfer`.
- **Estado:** decidida (plan, Fase 0 "Seguro y transferencia" y Fase 15).
- **Antes:** "Se propone conservar impacto económico bruto e impacto económico retenido. La cobertura puede reducir el retenido y modificar I efectivo si esa dimensión era dominante" (pre-revisión D17): **superada**. Antes aún: "baja el impacto económico para la empresa" (plan-pasos §6).
- **Origen del cambio:** I7, I4.
- **Qué la pone a prueba:** Fase 2 #9, #LC.
- **Uso en v1:** transferencia.

### D18 · Cuándo cambia la criticidad
- **Texto vigente:** Los factores cambian únicamente después de una reevaluación sustentada en evidencia aceptada. La criticidad no baja porque una acción fue planificada o figura como completada. Puede subir sin ninguna acción si nueva información muestra que P, I o V eran mayores. Todo cambio debe quedar históricamente reconstruible.
- **Estado:** decidida (plan, Fase 0 "Dinámica"; resto de pre-revisión D18).
- **Antes:** sin cambio de fondo en pre-revisión. Antes aún: "al ejecutarla con evidencia (base: observed)" (plan-pasos §6).
- **Origen del cambio:** —
- **Qué la pone a prueba:** Fase 2 #4, #10.
- **Uso en v1:** historial; plan de acción.

### D19 · A qué está condicionado I
- **Texto vigente:** I representa la magnitud potencial bruta de las consecuencias para esta organización, dado que el evento ocurrió, antes de considerar controles posteriores al evento y antes de transferencia financiera.
- **Estado:** decidida (plan, Fase 0 "I"; respuestas, pregunta 1).
- **Antes:** no existía. La revisión (C2) proponía "suponiendo una organización de capacidad típica para su tamaño y sector"; **gana el plan** ("esta organización"). Lo que la empresa *es* (tamaño, activos, personas expuestas, procesos) va a I; lo que hace desde el evento va a V (evaluación, H2).
- **Origen del cambio:** C2.
- **Qué la pone a prueba:** Fase 2 #CI, #11.
- **Uso en v1:** priorizar; transferencia.

### D20 · Consecuencia extrema
- **Texto vigente:** No existen pisos automáticos de banda en v0. Las consecuencias extremas generan `consecuencia_extrema = true`, que debe permanecer explícitamente visible y filtrable y no altera la banda. Se dispara cuando cualquier dimensión de I = 5. Los casos de propiedad determinarán si hace falta algún piso normativo específico.
- **Estado:** decidida (plan, Fase 0 "Consecuencias extremas" y Fase 3 "Extremos"; respuestas, pregunta 3).
- **Antes:** pisos de D7.
- **Origen del cambio:** I2, C5, I1. Número nuevo (regla sin número en el plan).
- **Qué la pone a prueba:** Fase 2 #2, #15.
- **Uso en v1:** ordenar la lista (filtro); matriz.

### D21 · Granularidad del riesgo
- **Texto vigente:** Un riesgo representa un evento con una cadena de consecuencias que comparte P y V. Si dos consecuencias requieren P o V diferentes, probablemente deben representarse como riesgos distintos. En la evaluación ciega ambos evaluadores trabajan sobre la misma lista de riesgos ya definida.
- **Estado:** decidida (plan, Fase 1 "Granularidad del riesgo").
- **Antes:** no existía (sólo la anomalía A7).
- **Origen del cambio:** I8. Número nuevo.
- **Qué la pone a prueba:** Fase 2 #12.
- **Uso en v1:** ordenar la lista.

### D22 · Motivo de cada reevaluación
- **Texto vigente:** Cada reevaluación registra `motivo = accion_ejecutada | informacion_nueva | cambio_contexto | correccion_evaluacion | cambio_version_metodologia`, para distinguir mejora real, aprendizaje, cambio externo, corrección y cambio metodológico.
- **Estado:** decidida (plan, Fase 1 "Causa de cada reevaluación").
- **Antes:** no existía.
- **Origen del cambio:** C9, I17. Número nuevo.
- **Qué la pone a prueba:** Fase 2 #10, #LC.
- **Uso en v1:** historial; plan de acción.

---

## Restricciones externas

| Restricción | Texto | Estado |
|---|---|---|
| EMI-17 · vocabulario | `actor` human \| ai \| import; `base` observed \| reported \| inferred \| assumed; 0..n referencias de evidencia; `uncertainty` low \| medium \| high (medium/high con nota); `review_status` pending \| accepted \| needs_revision \| rejected; lo generado por IA nace `pending`; sin porcentajes de confianza no calibrados. | restricción |
| T-0021 · R-19 | Ningún agente lee valores de casos históricos reales. | restricción |
| T-0021 · sin recálculo automático | La criticidad no baja sola; cambia cuando un ciclo de actualización registra con evidencia que un factor cambió. | restricción |
| T-0021 · antisobremodelado | Cada dimensión y regla nombra qué pantalla u operación de Risk OS v1 la usa, o queda fuera. | restricción |

---

## Tipología de anomalías A1–A10

La Fase 1 las ajusta (en particular A9: evaluación del plan y revisión I12).

| Código | Nombre | Señal observable |
|---|---|---|
| A1 | Divergencia entre evaluadores | Dos evaluadores con la misma información difieren en ≥1 categoría |
| A2 | Falta de información sin regla | El evaluador no sabe qué valor poner o inventa uno |
| A3 | Extremos | Baja probabilidad + consecuencia extrema queda en un lugar que parece incorrecto |
| A4 | Empate sin desempate | Dos riesgos con igual criticidad y no hay regla para ordenarlos |
| A5 | Inconmensurabilidad | Hay que comparar dimensiones distintas (dinero vs personas) |
| A6 | Alcance/objeto | No está claro si se evalúa inherente o residual, ni el horizonte |
| A7 | Granularidad | El riesgo es demasiado agregado, se solapa o duplica con otro |
| A8 | Resultado contraintuitivo | La regla se aplica sin dudas pero el resultado choca con el juicio |
| A9 | Base vs criticidad | La criticidad cambia según si la información es `observed` o `assumed` |
| A10 | Doble conteo | Un mismo control o condición se descuenta en más de un factor |

---

## Contradicciones que siguen abiertas

**Pares que todavía chocan después de consolidar**

1. **D19 ↔ D15 en continuidad.** "Tiempo sin operar" es I-continuidad (bruto, de esta organización) y "recuperación" es V; un mismo hecho (no hay plan de continuidad) puede cargarse en cualquiera de los dos. → Fase 2 #CI, adjudica Emiliano.
2. **P6 ↔ D20 + D12.** Sin pisos, un extremo remoto queda en la banda que le da el producto; P6 se cumple sólo por la bandera y el filtro (evaluación H6). Si un riesgo remoto puede llegar a Crítica sigue sin decidir. → Fase 2 #2 y #15, Fase 9.
3. **D20 (disparo con cualquier I = 5) ↔ C6.** Con `max()` sobre cuatro dimensiones la bandera puede marcar buena parte de la lista y dejar de distinguir. → medir la frecuencia en el dry run, Fase 4 (evaluación H4).
4. **D15 (perfil mixto: "documentar qué aspecto domina") ↔ P4.** No hay regla que fije V ante un perfil mixto, así que dos evaluadores pueden divergir sin error. → Fase 2 #14, Fase 3.
5. **D16 + D18 ↔ P10 cuando la reevaluación no confirma el cambio esperado.** No está escrito qué estado toma la acción ni qué se registra (I16). → Fase 2 #10; regla en Fase 1 (historial) o Fase 3.
6. **EMI-17 (procedencia por riesgo) ↔ D8 (rango y valor plausible por factor).** I13. → Fase 1 (el prompt pide procedencia por factor), Fase 15.

**"Inconsistencias entre decisiones" de la revisión (10)**

| # | Inconsistencia | Situación |
|---|---|---|
| 1 | D8 ↔ D9 | Resuelta por D8 (valor plausible; techo fuera del ranking). |
| 2 | `max()` ↔ "no conmensurables" | Resuelta por D11. |
| 3 | D2 residual ↔ I×V | Resuelta por D2 (`I_bruto`) y D19. |
| 4 | D2 + D4 ↔ V | Resuelta por D15 (corte temporal) y D4. |
| 5 | D7 ↔ D10 | Resuelta al quitar los pisos (D20); el orden intra-banda sigue abierto en D10 (Fase 3) y queda el par abierto 2. |
| 6 | D7 ↔ D16 + D18 + P9 | Resuelta al quitar los pisos (D20); P11 la vuelve verificable. |
| 7 | D17 ↔ D18 | Resuelta por D17 (siempre bruto). |
| 8 | A9 ↔ D8 | Resuelta por D8; la redacción de A9 la revisa la Fase 1. |
| 9 | D14 ↔ P8 (reversión no documentada) | Resuelta por D14 y la fila CH-026 del changelog. |
| 10 | D5 ↔ D17 (qué dimensión reduce el seguro) | Resuelta por D5 (económico absorbe todo lo monetario) y D17. |

**"Decisiones faltantes" de la revisión (12)**

| # | Decisión | Situación |
|---|---|---|
| 1 | A qué está condicionado I | Resuelta por D19. |
| 2 | Corte P/V | Resuelta por D15. |
| 3 | Anclas de I y magnitud económica | Magnitud resuelta por D5 (respuestas, pregunta 2); anclas por nivel abiertas → Fase 3. |
| 4 | Valor plausible o extremo superior | Resuelta por D8. |
| 5 | Bruto o retenido | Resuelta por D17. |
| 6 | Campo `motivo` | Resuelta por D22. |
| 7 | Criterio medible de P4 | Resuelta por P4. |
| 8 | Procedencia por factor y `review_status` por evento | Abierta → Fase 1 (ficha) y Fase 15 (EMI-16). |
| 9 | Granularidad | Resuelta por D21. |
| 10 | Procedimiento de calibración | Resuelta por D12 (procedimiento de la Fase 9, sin cuota de distribución). |
| 11 | ¿Un riesgo remoto puede llegar a Crítica? | Abierta → Fase 9 (par abierto 2). |
| 12 | Evaluaciones vivas al cambiar la versión | Parcial: D22 da el valor de `motivo`; la regla de qué se hace con ellas → Fase 1 (sección de historial). |

---

## Para aprobar

**Aprobado por Emiliano el 2026-10-05 16:18 UTC: sí a los 12 puntos.**

Cada punto se responde con sí o no.

1. Las entradas tomadas sin cambio de fondo del conjunto pre-revisión (P1–P3, P5–P10, D9, D13, D16 mecanismo causal, D18 y la regla anti doble conteo de D15) cuentan como `decidida` porque el plan, en la Fase 0, pide consolidarlas. ¿Sí?
2. Las reglas sin número del plan se numeran D20 (`consecuencia_extrema`), D21 (granularidad) y D22 (`motivo`), y las demás se integran en entradas existentes: corte P/V en D15, unknowns y techo en D8, seguro bruto en D17, falsación en D14. ¿Sí?
3. D15 junta en una entrada la definición de V (bloque sin número de la pre-revisión) con la frontera P/V. ¿Sí?
4. En D14, la frase "toma 30 valores no equiespaciados (reemplaza 'rango 1–125')" es redacción de la revisión (O1) que ninguna fuente 1 o 2 escribe literal. ¿La dejamos?
5. D9 conserva la bandera de revisión prioritaria disparada por banda Alta/Crítica + uncertainty high (texto pre-revisión), no por techo ≥ Alta como proponía C1, y no tiene pantalla de v1 que la justifique. ¿La conservamos en v0?
6. D10 queda partida en dos entradas: la pre-revisión `superada` y el ranking nuevo `abierta`. ¿Sí?
7. D1 y D6 quedan `superada` por Propósito y por D14, sin texto propio. ¿Sí?
8. P4 y P7 son criterios del experimento y del diseño, sin pantalla de v1. ¿Quedan exentas de la regla de antisobremodelado de T-0021?
9. D12 dice "factores visibles, raw score interno, banda visible" (plan Fase 3) y mueve "el raw score ordena dentro de la banda" a D10. ¿Sí?
10. Estos cambios no tienen razón registrada en ninguna fuente: P5, P8, P9 (plan-pasos → pre-revisión), P4 (de "una categoría" a "razonablemente similares"), D1 (de "prioridad de atención" a tres usos), D7 (de un piso a tres), D10 (orden pre-revisión), D15 (de entorno/empresa a la definición pre-revisión de V), D16 (de "declara cuánto" a "mecanismo causal"), D11 (de "su propio piso" a "no conmensurables"), D17 (de "baja el impacto económico" a "bruto y retenido") y D18 (de "al ejecutar" a "nueva evidencia aceptada"). Son las filas con "razón no registrada" del changelog. ¿Los dejamos como "razón no registrada"? (Si no, dictá la razón y se agrega al changelog.)
11. Las "Contradicciones que siguen abiertas" 1–6 son una lectura del agente, no de una fuente. ¿Las aceptás como lista de trabajo para las fases 1 a 4?
12. La tabla de restricciones externas resume EMI-17 y T-0021 con palabras del agente. ¿Sí?
