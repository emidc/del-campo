# Decisiones de la metodología de criticidad · v0.2

> Fecha: 2026-10-07 · Versión: **v0.2** (aprobada por Emiliano, 2026-10-07 02:02 UTC, Fase 5; **congelada para la Fase 8**) · v0.1 aprobada el 2026-10-05 20:46 UTC (Fase 3) · v0.0 aprobada en la Fase 0 del plan EMI-15 + EMI-41.
> v0.2 aplica la Fase 5 (`fase-5/log-adjudicacion.md`, CH-080 a CH-088): cambia D4, D8, D10, D14, D15 y D21. La especificación ejecutable es `metodologia-v0.md` (metodologia v0.2).
> v0.1 aplica `anexo-cambios-fase-3.md`: cambia D4, D5, D8, D10, D13, D14, D15, D16, D17, D18, D19, D20 y D21, y agrega D23–D25. La especificación ejecutable es `metodologia-v0.md` (metodologia v0.1).
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
- **Texto vigente:** Probabilidad de que el evento iniciador (D15) ocurra al menos una vez durante los próximos 12 meses. P incorpora exposición, condiciones actuales y controles preventivos; cubre todo lo anterior al evento. Escala 1–5. El nivel lo indica la fuente de evidencia de mayor jerarquía disponible: dato cuantitativo confiable y comparable (se traduce con la referencia porcentual) > historia propia representativa > organizaciones comparables > sector > juicio experto. Si dos fuentes fuertes divergen, se registra el rango y la incertidumbre sube al menos a medium. Antecedente (ocurrió el evento iniciador, aunque se haya contenido) fija el nivel por frecuencia y antigüedad; precursor (ocurrió la causa sin evento) es el ancla 3 cuando no hay antecedentes propios; una condición causal (un estado: degradación, sobrecarga, control débil o ausente) nunca fija un nivel y sólo da un ajuste de ±1, medido contra la fuente que fijó el nivel (el período de la historia propia, o lo habitual en comparables o sector). Los ajustes son hipótesis de calibración. Anclas: `metodologia-v0.md` §3.
- **Estado:** decidida (plan, Fase 0 "P" y Fase 3 "Escala P"); texto modificado en v0.1 (Fase 3, aprobada por Emiliano 2026-10-05 20:46 UTC); texto modificado en v0.2 (Fase 5, aprobada por Emiliano 2026-10-07 02:02 UTC)
- **Antes:** v0.1: "Probabilidad de que el evento iniciador (D15) ocurra al menos una vez durante los próximos 12 meses. P incorpora exposición, condiciones actuales y controles preventivos; cubre todo lo anterior al evento. Cuenta como antecedente toda ocurrencia del evento iniciador, aunque su consecuencia haya sido contenida; una ocurrencia de la causa sin evento es un precursor. Escala 1–5. El nivel lo indica la fuente de evidencia de mayor jerarquía disponible: dato cuantitativo confiable y comparable (se traduce con la referencia porcentual) > historia propia representativa > organizaciones comparables > sector > juicio experto. Si dos fuentes fuertes divergen, se registra el rango y la incertidumbre sube al menos a medium. Los ajustes de ±1 por controles preventivos nuevos o condiciones agravadas son hipótesis de calibración. Anclas: `metodologia-v0.md` §3." v0.0: "Probabilidad de que el evento ocurra durante los próximos 12 meses. P incorpora exposición, condiciones actuales y controles preventivos; cubre todo lo anterior al evento. Escala 1–5 con ancla principal en evidencia observable: antecedentes, recurrencia, presencia de condiciones causales, experiencia en empresas comparables. Los porcentajes quedan como referencia secundaria cuando existe información cuantitativa real. La redacción de cada nivel se escribe en la Fase 3." Antes de v0.0: escala 1 Remota (<5%) … 5 Muy probable (>70%), porcentajes como anclas orientativas, prohibido inventarlos sin evidencia (pre-revisión D4).
- **Origen del cambio:** Fase 5, grupo 4A: AN-0010 y bordes de las anclas (CH-084). (metodologia v0.2, Fase 5). Antes: Fase 3: anclas de P; evento iniciador (F3-6); jerarquía de evidencia pedida por Emiliano; CP-06, CP-07. (metodologia v0.1, Fase 3).
- **Qué la pone a prueba:** Fase 2 #6, #7.
- **Uso en v1:** priorizar; matriz.

### D5 · Impacto I y sus dimensiones
- **Texto vigente:** Cuatro dimensiones, escalas ordinales 1–5; se conserva cada una; `I efectivo = max(dimensiones)` se muestra y desempata, y la criticidad se calcula por dimensión (D14). Las dimensiones son tipos de consecuencia, no capas causales: todo lo monetario va a Económico. Económico: consecuencia monetaria para esta empresa como proporción de su resultado operativo anual (RO): 1 < 2%; 2 de 2% a < 10%; 3 de 10% a < 30%; 4 de 30% a < 100%; 5 ≥ 100% (cortes a calibrar). Incluye daño directo, multas y pérdida por interrupción medida como margen de contribución; sin margen conocido se registra un rango entre margen operativo y facturación perdida. Magnitud de referencia: RO normalizado; si no sirve, promedio normalizado de ejercicios positivos; si no, otra medida documentada con anomalía A6; si no, `unknown`. Personas: consecuencias humanas, no se monetizan; nivel 4 = una muerte plausible o daño irreversible grave; nivel 5 = más de una muerte plausible. Continuidad: consecuencia operativa no monetaria, medida por la duración de la interrupción bruta de funciones críticas (reparación o reposición normal de lo dañado, sin alternativas de la organización). Legal/regulatorio: consecuencia jurídica/regulatoria no monetaria; las multas van a Económico. Se evalúa el escenario plausible si el evento ocurre y nada actúa después, hasta que la organización vuelve a operar con normalidad o la pérdida queda definitiva; el peor creíble va al rango (D8). La equivalencia entre dimensiones nivel a nivel (D11) es una hipótesis de calibración. Reputación queda fuera de v0 (D13). Anclas: `metodologia-v0.md` §4.
- **Estado:** decidida (plan, Fase 0 "I" y Fase 3 "Escalas de I"; respuestas, pregunta 2); texto modificado en v0.1 (Fase 3, aprobada por Emiliano 2026-10-05 20:46 UTC)
- **Antes:** v0.0: "Cuatro dimensiones, escalas ordinales 1–5; se conserva cada una e `I efectivo = max(dimensiones)`. **Económico:** consecuencia monetaria para esta empresa, relativa a su capacidad económica, no a montos absolutos universales. Magnitud de referencia: resultado operativo anual. Incluye daño directo, multas y pérdida económica por interrupción. **Personas:** consecuencias humanas. No se monetizan. **Continuidad:** consecuencia operativa no monetaria: tiempo sin operar, degradación de servicio, incapacidad de cumplir funciones críticas. **Legal/regulatorio:** consecuencia jurídica/regulatoria no monetaria: pérdida de habilitación, restricción de operar, responsabilidad relevante, intervención regulatoria. Reputación queda fuera de v0 (D13). Las anclas de cada nivel se escriben en la Fase 3." Antes de v0.0: dimensiones nombradas "con anclas" que no existían; "personas y dinero no conmensurables" (pre-revisión D5).
- **Origen del cambio:** Fase 3: anclas de I; correcciones de Emiliano a facturación perdida y fallback del RO; CP-11, CP-13, CP-16. (metodologia v0.1, Fase 3).
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
- **Texto vigente:** Si existe un valor defendible más plausible (la mejor estimación profesional, no el peor valor no descartable): ese valor calcula la criticidad; se conserva el rango; el extremo superior genera un techo plausible; el techo no participa del ranking. Hay valor defendible si la evidencia fija el nivel, o lo acota a un rango de como máximo tres niveles contiguos **y** permite elegir dentro de él un valor más plausible defendible; el tamaño del rango es condición necesaria, no suficiente. Un dato auxiliar desconocido (margen de contribución, duración exacta, número de personas) no vuelve `unknown` al factor si se cumple eso; el supuesto y su fundamento quedan escritos. Si no: el factor queda `unknown`; no se inventa un valor; se genera necesidad de validación. Si P es `unknown`, el riesgo es no evaluable. Si una dimensión de I o un aspecto de V es `unknown`, el riesgo es evaluable sólo si la cota de esa parte (con su extremo superior registrado, o 5) no supera la criticidad de las partes conocidas. Un riesgo no evaluable va a una lista separada "no evaluable", con su motivo y su necesidad de validación, nunca mezclado en el ranking; las banderas se disparan también con el extremo superior registrado de una dimensión `unknown`. Los no evaluables y los riesgos con unknowns o incertidumbre alta entran en una cola de validación, separada del ranking, que prioriza qué información obtener primero.
- **Estado:** decidida (plan, Fase 0 "Unknowns"; evaluación, H7); texto modificado en v0.1 (Fase 3, aprobada por Emiliano 2026-10-05 20:46 UTC); texto modificado en v0.2 (Fase 5, aprobada por Emiliano 2026-10-07 02:02 UTC)
- **Antes:** v0.1: "Si existe un valor defendible más plausible (la mejor estimación profesional, no el peor valor no descartable): ese valor calcula la criticidad; se conserva el rango; el extremo superior genera un techo plausible; el techo no participa del ranking. Hay valor defendible si la evidencia fija el nivel o lo acota a un rango de como máximo tres niveles contiguos. Si no: el factor queda `unknown`; no se inventa un valor; se genera necesidad de validación. Si P es `unknown`, el riesgo es no evaluable. Si una dimensión de I o un aspecto de V es `unknown`, el riesgo es evaluable sólo si la cota de esa parte (con su extremo superior registrado, o 5) no supera la criticidad de las partes conocidas. Un riesgo no evaluable va a una lista separada "no evaluable", con su motivo y su necesidad de validación, nunca mezclado en el ranking; las banderas se disparan también con el extremo superior registrado de una dimensión `unknown`. Los no evaluables y los riesgos con unknowns o incertidumbre alta entran en una cola de validación, separada del ranking, que prioriza qué información obtener primero." v0.0: "Si existe un valor defendible más plausible: ese valor calcula la criticidad; se conserva el rango; el extremo superior genera un techo plausible; el techo no participa del ranking. Si no existe ningún valor plausible defendible: el factor queda `unknown`; no se inventa un valor; la criticidad puede quedar no evaluable; se genera necesidad de validación. Un riesgo no evaluable va a una lista separada "no evaluable", con su motivo y su necesidad de validación, nunca mezclado en el ranking; si tiene consecuencia extrema, la bandera también aplica." Antes de v0.0: "Ante un rango, se conserva el rango y para priorización provisional se usa el extremo superior plausible" (pre-revisión D8; similar en plan-pasos §3.2).
- **Origen del cambio:** Fase 5, grupo 1: contradicción §4.2.3 ↔ §9.2, AN-0001, AN-0002 (CH-080). (metodologia v0.2, Fase 5). Antes: Fase 3: unknowns en factores compuestos (protocolo PA 3); criterio de valor defendible y cola de validación pedidos por Emiliano; CP-08. (metodologia v0.1, Fase 3).
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
- **Texto vigente:** Banda → C_raw → I efectivo → I_personas → empate legítimo, dentro de una misma organización (el ranking es siempre dentro de una organización; CH-075). Después de C_raw sólo se aplican desempates con justificación normativa establecida; si un desempate daría una preferencia arbitraria, se conserva el empate: no se busca un orden total. La vulnerabilidad no es desempate, porque ya está en C_raw. Se quita la amplitud de I porque cuenta dos veces la misma pérdida. P no es desempate. I efectivo con una dimensión `unknown` se muestra como `≥ n` (máximo de las conocidas); si lo desconocido podría cambiar el orden, el paso queda indeterminado y los riesgos conservan la misma posición, marcada como provisional; el techo nunca gana un desempate. Compiten riesgos evaluables; los padres se muestran en la posición de su hijo prioritario (D21); quedan fuera los hijos, los escenarios por causa común, los no evaluables, el techo y la incertidumbre. Las banderas no mueven el orden. Un orden técnico por risk_id/nombre puede usarse en la UI para estabilidad, sin representar prioridad. Los desempates y su orden son hipótesis experimentales.
- **Estado:** decidida (Fase 3; respuestas F3-4; aprobada 2026-10-05). Los desempates siguen siendo hipótesis experimentales.; texto modificado en v0.2 (Fase 5, aprobada por Emiliano 2026-10-07 02:02 UTC)
- **Antes:** v0.1: "Versión inicial: banda → C_raw → I efectivo → I_personas → empate legítimo, dentro de una misma organización. Se quita la amplitud de I porque cuenta dos veces la misma pérdida. P no es desempate. Compiten sólo riesgos evaluables y riesgos padre (con la posición de su sub-riesgo determinante); quedan fuera los sub-riesgos, los escenarios por causa común, los no evaluables, el techo y la incertidumbre. Las banderas no mueven el orden. Un orden técnico por risk_id/nombre puede usarse en la UI para estabilidad, sin representar prioridad. Los desempates y su orden son hipótesis experimentales. El orden entre organizaciones distintas queda abierto (Fase 6)." v0.0: "Versión inicial a definir en la Fase 3. Default que usa esa fase: banda → C_raw → I efectivo → amplitud de I (dimensiones en nivel ≥ I efectivo − 1) → I_personas → empate legítimo; P deja de ser desempate. La incertidumbre no participa del ranking. Un orden técnico por risk_id/nombre puede usarse en la UI para estabilidad, sin representar prioridad. Los desempates y su orden son hipótesis experimentales." Antes de v0.0: ver D10 (pre-revisión).
- **Origen del cambio:** Fase 5, grupo 6: AN-0014, AN-0160; Emiliano rechazó el desempate por preparación (CH-086). (metodologia v0.2, Fase 5). Antes: F3-4 aprobada por Emiliano; CP-13 (la amplitud cuenta dos veces la misma pérdida). (metodologia v0.1, Fase 3).
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
- **Texto vigente:** Quedan fuera del score salvo que los casos demuestren que son necesarios: velocidad de materialización, detectabilidad, correlación/dependencia entre riesgos, asegurabilidad como factor de criticidad. La correlación sigue fuera del score de cada riesgo; se representa sólo en el escenario por causa común (D24), fuera del ranking. Reputación queda fuera de v0. Reputación y la observación que sostiene cada factor se registran como texto, sin entrar en el score.
- **Estado:** decidida (pre-revisión D13 y D5, ratificada por plan Fase 0; evaluación, H15 para el registro textual); texto modificado en v0.1 (Fase 3, aprobada por Emiliano 2026-10-05 20:46 UTC)
- **Antes:** v0.0: "Quedan fuera salvo que los casos demuestren que son necesarios: velocidad de materialización, detectabilidad, correlación/dependencia entre riesgos, asegurabilidad como factor de criticidad. Reputación queda fuera de v0. Reputación y la observación cuantitativa que sostiene cada factor se registran como texto, sin entrar en el score." Antes de v0.0: sin cambio en la lista (plan-pasos §3.2).
- **Origen del cambio:** F3-5 aprobada por Emiliano; CP-20. (metodologia v0.1, Fase 3).
- **Qué la pone a prueba:** ninguno todavía.
- **Uso en v1:** no aplica (excluye elementos).

### D14 · Fórmula bajo prueba
- **Texto vigente:** Para cada dimensión d de I: `C_d = P × I_d × V_d`, donde `V_d` sale de la combinación secuencial de contención y recuperación de D15. `C_raw = max_d C_d`; la dimensión que da el máximo es la dimensión determinante. P, I_d y V_d son categorías ordenadas 1–5. `C_raw` es un índice heurístico de prioridad calculado sobre categorías ordenadas: no es una medición cardinal ni actuarial, ni una escala ordinal bien definida, porque depende de haber codificado los niveles como 1 a 5. Toma 30 valores no equiespaciados y no se presenta como escala continua. Se trata explícitamente como hipótesis falsable. **Falsación:** si 3 casos independientes previamente adjudicados producen órdenes incorrectos que no pueden corregirse mediante calibración, anclas o desempates simples, la regla de combinación se considera falsada y se reabre; la alternativa a estudiar es una tabla de decisión calibrada o un agregador basado en escenarios, no pesos. **Conteo al cierre de la Fase 5: 1 de 3** (eventos recurrentes por encima de P = 5: P satura e I describe un solo evento; no aísla todavía al producto como causa); D14 no falsada; CP-01 R1/R5 y CP-16 dudosos.
- **Estado:** decidida (plan, Fase 0 "Fórmula bajo prueba", Fase 3 y Fase 5 "Criterio de falsación"; respuestas, pregunta 7); texto modificado en v0.1 (Fase 3, aprobada por Emiliano 2026-10-05 20:46 UTC); texto modificado en v0.2 (Fase 5, aprobada por Emiliano 2026-10-07 02:02 UTC)
- **Antes:** v0.1: "Para cada dimensión d de I: `C_d = P × I_d × V_d`, donde `V_d` es el peor de los aspectos de V que actúan sobre esa dimensión (D15). `C_raw = max_d C_d`; la dimensión que da el máximo es la dimensión determinante. P, I_d y V_d son categorías ordenadas 1–5. `C_raw` es un índice heurístico de prioridad calculado sobre categorías ordenadas: no es una medición cardinal ni actuarial, ni una escala ordinal bien definida, porque depende de haber codificado los niveles como 1 a 5. Toma 30 valores no equiespaciados y no se presenta como escala continua. Se trata explícitamente como hipótesis falsable. **Falsación:** si 3 casos independientes previamente adjudicados producen órdenes incorrectos que no pueden corregirse mediante calibración, anclas o desempates simples, la regla de combinación se considera falsada y se reabre; la alternativa a estudiar es una tabla de decisión calibrada o un agregador basado en escenarios, no pesos." v0.0: "`C_raw = P × I × V`, con P, I y V ordinales 1–5. Es un índice ordinal de priorización, no una medición cardinal ni actuarial, y se trata explícitamente como hipótesis falsable. Toma 30 valores no equiespaciados (reemplaza "rango 1–125") y no se presenta como escala cardinal continua. **Falsación:** si 3 casos independientes previamente adjudicados producen órdenes incorrectos que no pueden corregirse mediante calibración, anclas o desempates simples, la regla de combinación se considera falsada y se reabre." Antes de v0.0: "C_raw = P × I × V … Rango posible: 1–125" (pre-revisión D14). Antes aún: matriz (plan-pasos §3.2 D6).
- **Origen del cambio:** Fase 5: V secuencial (CH-082) y conteo de falsación aceptado por Emiliano. (metodologia v0.2, Fase 5). Antes: Emiliano: un aspecto de V que no actúa sobre la dimensión dominante no debe multiplicarla; el producto de ordinales no es una escala ordinal. (metodologia v0.1, Fase 3).
- **Qué la pone a prueba:** Fase 2 #1, #3; falsación en Fase 5.
- **Uso en v1:** priorizar; ordenar la lista.

### D15 · V y frontera P/V
- **Texto vigente:** V representa la vulnerabilidad desde que el evento ocurre. P y V quedan separados mediante un corte temporal en el evento iniciador: el primer punto de la cadena en que el peligro se materializó y, si nada actúa después, la consecuencia se desarrolla sola (ignición, robo o uso de la credencial). P cubre todo lo anterior. Todo control que actúa después del evento iniciador va a V, incluidos los pasivos (rociadores, detección, sectorización, restricción de acceso, copias de seguridad). V tiene dos aspectos que se evalúan y registran por separado, cada uno 1–5 y contra el escenario bruto de I: contención (cuánto daño se produce; incluye respuesta, y toda medida que hace que la función no llegue a detenerse o el bien no llegue a perderse, aunque sea redundancia) y recuperación (lo que actúa después de que la función se detuvo o el bien se perdió: cuánto dura la interrupción y qué se repone). Las rúbricas describen capacidades y su prueba, sin contar niveles de I. La combinación es secuencial: primero actúa la contención y la recuperación actúa sólo sobre lo que la contención deja pasar. Personas y Legal: `V_d` = contención. Continuidad: `V_d = min(contención, recuperación)`. Económico: `V_d = min(contención, ⌈(contención + recuperación)/2⌉)` [H]. Que esta regla haga pasar casos usados para diseñarla es regresión de consistencia, no evidencia de generalización (primera prueba ciega: Fase 8). Anti doble conteo: un mismo control o condición no se descuenta simultáneamente en varios factores salvo mecanismos causales diferentes y explícitamente documentados. Rúbricas: `metodologia-v0.md` §5.
- **Estado:** decidida (plan, Fase 0 "V" y Fase 3 "V 1–5"; anti doble conteo de pre-revisión); texto modificado en v0.1 (Fase 3, aprobada por Emiliano 2026-10-05 20:46 UTC); texto modificado en v0.2 (Fase 5, aprobada por Emiliano 2026-10-07 02:02 UTC)
- **Antes:** v0.1: "V representa la vulnerabilidad desde que el evento ocurre. P y V quedan separados mediante un corte temporal en el evento iniciador: el primer punto de la cadena en que el peligro se materializó y, si nada actúa después, la consecuencia se desarrolla sola (ignición, robo o uso de la credencial). P cubre todo lo anterior. Todo control que actúa después del evento iniciador va a V, incluidos los pasivos (rociadores, detección, sectorización, restricción de acceso, copias de seguridad). V tiene dos aspectos que se evalúan y registran por separado, cada uno 1–5 y contra el escenario bruto de I: contención (cuánto daño se produce; incluye respuesta) y recuperación (cuánto dura la interrupción y qué se repone; incluye redundancia). Las rúbricas describen capacidades y su prueba, sin contar niveles de I. Un aspecto sólo actúa sobre las dimensiones a las que causalmente afecta: contención sobre las cuatro; recuperación sobre Continuidad y Económico. Para cada dimensión, `V_d` es el peor de los aspectos que actúan sobre ella. Anti doble conteo: un mismo control o condición no se descuenta simultáneamente en varios factores salvo mecanismos causales diferentes y explícitamente documentados. Rúbricas: `metodologia-v0.md` §5." v0.0: "V representa la vulnerabilidad desde que el evento ocurre: contención, respuesta, redundancia, recuperación. P y V quedan separados mediante un corte temporal en el instante del evento: P cubre todo lo anterior. V se evalúa post-evento, con rúbrica de contención y recuperación; ante perfiles mixtos, se documenta qué aspecto domina. Escala 1–5 (anclas en Fase 3). Anti doble conteo: un mismo control o condición no se descuenta simultáneamente en varios factores salvo mecanismos causales diferentes y explícitamente documentados." Antes de v0.0: "V mide qué tan susceptible es la organización a sufrir consecuencias relevantes si el evento ocurre, considerando controles, preparación, redundancias, capacidad de respuesta y recuperación actuales" (pre-revisión). Antes aún: "P = frecuencia del evento en el entorno; V = qué tan preparada está esta empresa" (plan-pasos §6).
- **Origen del cambio:** Fase 5, grupo 2: perfiles PV-1 a PV-5; G1 de la Fase 4 (AN-0003, AN-0019, AN-0004) (CH-081). (metodologia v0.2, Fase 5). Antes: F3-6 aprobada; F3-3 rechazada como regla universal y reemplazada por V por dimensión; CP-06, CP-07, CP-14; cierra la contradicción abierta #4. (metodologia v0.1, Fase 3).
- **Qué la pone a prueba:** Fase 2 #6, #7, #14, #CI.
- **Uso en v1:** priorizar; plan de acción.

### D16 · Acciones
- **Texto vigente:** Una acción no modifica automáticamente P, I o V. El cambio esperado de una acción es sólo una hipótesis. Una acción puede modificar P, V o dimensiones específicas de I solamente cuando existe un mecanismo causal explícito compatible con la definición de ese factor; más de un factor sólo con mecanismos diferentes claramente explicados, sin doble contar el mismo beneficio. Una acción que declara mejorar V nombra el aspecto (contención o recuperación). El estado y la eficacia de la acción se rigen por D25.
- **Estado:** decidida (plan, Fase 0 "Dinámica"; mecanismo causal de pre-revisión D16); texto modificado en v0.1 (Fase 3, aprobada por Emiliano 2026-10-05 20:46 UTC)
- **Antes:** v0.0: "Una acción no modifica automáticamente P, I o V. El cambio esperado de una acción es sólo una hipótesis. Una acción puede modificar P, V o dimensiones específicas de I solamente cuando existe un mecanismo causal explícito compatible con la definición de ese factor; más de un factor sólo con mecanismos diferentes claramente explicados, sin doble contar el mismo beneficio." Antes de v0.0: sin cambio de fondo en pre-revisión. Antes aún: "Cada acción declara qué factor pretende mejorar y en cuánto" (plan-pasos §6).
- **Origen del cambio:** V partida en aspectos; CP-10. (metodologia v0.1, Fase 3).
- **Qué la pone a prueba:** Fase 2 #10.
- **Uso en v1:** plan de acción.

### D17 · Seguro y transferencia
- **Texto vigente:** La transferencia aseguradora no modifica la criticidad. La criticidad utiliza siempre impacto económico bruto. La exposición económica retenida se registra y visualiza separadamente en `risk-transfer`. Los eventos de una póliza (firma, consumo del límite, renovación) tienen su propio historial en `risk-transfer`, enlazado desde el riesgo; no generan una reevaluación del riesgo ni usan `motivo`.
- **Estado:** decidida (plan, Fase 0 "Seguro y transferencia" y Fase 15); texto modificado en v0.1 (Fase 3, aprobada por Emiliano 2026-10-05 20:46 UTC)
- **Antes:** v0.0: "La transferencia aseguradora no modifica la criticidad. La criticidad utiliza siempre impacto económico bruto. La exposición económica retenida se registra y visualiza separadamente en `risk-transfer`." Antes de v0.0: "Se propone conservar impacto económico bruto e impacto económico retenido. La cobertura puede reducir el retenido y modificar I efectivo si esa dimensión era dominante" (pre-revisión D17): **superada**. Antes aún: "baja el impacto económico para la empresa" (plan-pasos §6).
- **Origen del cambio:** Emiliano: un evento de póliza no cambia el riesgo, así que no usa `cambio_contexto`. (metodologia v0.1, Fase 3).
- **Qué la pone a prueba:** Fase 2 #9, #LC.
- **Uso en v1:** transferencia.

### D18 · Cuándo cambia la criticidad
- **Texto vigente:** Los factores cambian únicamente después de una reevaluación sustentada en evidencia aceptada. La criticidad no baja porque una acción fue planificada o figura como completada. Puede subir o bajar sin ninguna acción, por información nueva que muestra que P, I o V eran distintos de lo registrado, o por un cambio de contexto real. Cada cambio lleva su `motivo` (D22): `informacion_nueva` si la evaluación anterior no registraba el hecho; `correccion_evaluacion` si lo registraba como cierto y era falso. Un cambio de versión de la metodología puede cambiar el score o la banda sin que cambie el riesgo, y nunca cuenta como mejora ni empeoramiento. Todo cambio debe quedar históricamente reconstruible.
- **Estado:** decidida (plan, Fase 0 "Dinámica"; resto de pre-revisión D18); texto modificado en v0.1 (Fase 3, aprobada por Emiliano 2026-10-05 20:46 UTC)
- **Antes:** v0.0: "Los factores cambian únicamente después de una reevaluación sustentada en evidencia aceptada. La criticidad no baja porque una acción fue planificada o figura como completada. Puede subir sin ninguna acción si nueva información muestra que P, I o V eran mayores. Todo cambio debe quedar históricamente reconstruible." Antes de v0.0: sin cambio de fondo en pre-revisión. Antes aún: "al ejecutarla con evidencia (base: observed)" (plan-pasos §6).
- **Origen del cambio:** CP-19: la criticidad cambia en los dos sentidos sin acción; criterio de motivo aprobado por Emiliano. (metodologia v0.1, Fase 3).
- **Qué la pone a prueba:** Fase 2 #4, #10.
- **Uso en v1:** historial; plan de acción.

### D19 · A qué está condicionado I
- **Texto vigente:** I representa la magnitud potencial bruta de las consecuencias para esta organización, dado que el evento ocurrió, antes de considerar controles posteriores al evento y antes de transferencia financiera. Lo que la organización es (personas, activos, datos y procesos que el evento alcanzaría hoy) va a I; lo que hace o tiene preparado desde el evento va a V. Test: si la medida puede fallar y la consecuencia llegaría igual, es una barrera y va a V; si lo expuesto no está ahí, es exposición y va a I. I-continuidad es la interrupción con la reparación o reposición normal de lo dañado; la ausencia de plan de continuidad, de alternativas o de redundancia no sube I: va a V-recuperación.
- **Estado:** decidida (plan, Fase 0 "I"; respuestas, pregunta 1); texto modificado en v0.1 (Fase 3, aprobada por Emiliano 2026-10-05 20:46 UTC)
- **Antes:** v0.0: "I representa la magnitud potencial bruta de las consecuencias para esta organización, dado que el evento ocurrió, antes de considerar controles posteriores al evento y antes de transferencia financiera." Antes de v0.0: no existía. La revisión (C2) proponía "suponiendo una organización de capacidad típica para su tamaño y sector"; **gana el plan** ("esta organización"). Lo que la empresa *es* (tamaño, activos, personas expuestas, procesos) va a I; lo que hace desde el evento va a V (evaluación, H2).
- **Origen del cambio:** CP-16: la falta de continuidad va a V; cierra la contradicción abierta #1; test de la barrera aprobado. (metodologia v0.1, Fase 3).
- **Qué la pone a prueba:** Fase 2 #CI, #11.
- **Uso en v1:** priorizar; transferencia.

### D20 · Consecuencia extrema
- **Texto vigente:** No existen pisos automáticos de banda en v0. Las consecuencias extremas generan `consecuencia_extrema = true`, que debe permanecer explícitamente visible y filtrable y no altera la banda ni el ranking. Se dispara cuando cualquier dimensión de I = 5 (valor plausible). Convive con `safety_critical` (D23), que es la regla normativa de seguridad que pidieron los casos de propiedad; tampoco fija un piso de banda.
- **Estado:** decidida (plan, Fase 0 "Consecuencias extremas" y Fase 3 "Extremos"; respuestas, pregunta 3); texto modificado en v0.1 (Fase 3, aprobada por Emiliano 2026-10-05 20:46 UTC)
- **Antes:** v0.0: "No existen pisos automáticos de banda en v0. Las consecuencias extremas generan `consecuencia_extrema = true`, que debe permanecer explícitamente visible y filtrable y no altera la banda. Se dispara cuando cualquier dimensión de I = 5. Los casos de propiedad determinarán si hace falta algún piso normativo específico." Antes de v0.0: pisos de D7.
- **Origen del cambio:** F3-1 (modificada por Emiliano); CP-02, CP-15. (metodologia v0.1, Fase 3).
- **Qué la pone a prueba:** Fase 2 #2, #15.
- **Uso en v1:** ordenar la lista (filtro); matriz.

### D21 · Granularidad del riesgo
- **Texto vigente:** Un riesgo representa un escenario: un evento con una cadena de consecuencias que comparte P y V. Si la consecuencia es distinta, son riesgos distintos. Si la consecuencia concreta que sufre la organización (el mismo problema de negocio, no la misma dimensión de impacto) es la misma pero las causas o los eventos iniciadores son distintos, o tienen P o V diferentes, es un riesgo padre: un agrupador sin factores ni score propios, con un hijo por escenario, cada uno evaluado completo; nunca se toma la P de un hijo y la V de otro. El padre se muestra en la posición de su hijo prioritario (el primero por D10); si hay hijos empatados, muestra todos; si algún hijo es no evaluable, su posición es provisional (`prioridad_provisional`) y el hijo no evaluable va a la lista no evaluable con sus banderas; si todos lo son, no tiene posición. Los hijos son detalle de análisis y tratamiento. La posición del padre no representa la unión de los escenarios: se abandona la invariancia padre/simple. En la evaluación ciega ambos evaluadores trabajan sobre la misma lista de riesgos ya definida.
- **Estado:** decidida (plan, Fase 1 "Granularidad del riesgo"); texto modificado en v0.1 (Fase 3, aprobada por Emiliano 2026-10-05 20:46 UTC); texto modificado en v0.2 (Fase 5, aprobada por Emiliano 2026-10-07 02:02 UTC)
- **Antes:** v0.1: "Un riesgo representa un escenario: un evento con una cadena de consecuencias que comparte P y V. Si el evento o la cadena de consecuencias son distintos, son riesgos distintos. Si el evento y la consecuencia que sufre la organización son los mismos pero las causas tienen P o V diferentes, es un riesgo padre: un agrupador sin factores propios, con un sub-riesgo por causa, cada uno evaluado como escenario completo; nunca se toma la P de un sub-riesgo y la V de otro. Sólo el padre compite en el ranking principal, con la posición de su sub-riesgo determinante (el primero por D10); los sub-riesgos son detalle de análisis y tratamiento. Esa función de agregación es una hipótesis a validar, junto con la invariancia de granularidad. En la evaluación ciega ambos evaluadores trabajan sobre la misma lista de riesgos ya definida." v0.0: "Un riesgo representa un evento con una cadena de consecuencias que comparte P y V. Si dos consecuencias requieren P o V diferentes, probablemente deben representarse como riesgos distintos. En la evaluación ciega ambos evaluadores trabajan sobre la misma lista de riesgos ya definida." Antes de v0.0: no existía (sólo la anomalía A7).
- **Origen del cambio:** Fase 5, grupo 3: dictamen de la Fase 4 y precisiones 3a–3c; AN-0009, AN-0015, AN-0022, AN-0024 (CH-083). (metodologia v0.2, Fase 5). Antes: F3-2 aprobada como modelo; roll-up rediseñado por pedido de Emiliano; CP-12; revisión I8. (metodologia v0.1, Fase 3).
- **Qué la pone a prueba:** Fase 2 #12.
- **Uso en v1:** ordenar la lista.

### D22 · Motivo de cada reevaluación
- **Texto vigente:** Cada reevaluación registra `motivo = accion_ejecutada | informacion_nueva | cambio_contexto | correccion_evaluacion | cambio_version_metodologia`, para distinguir mejora real, aprendizaje, cambio externo, corrección y cambio metodológico.
- **Estado:** decidida (plan, Fase 1 "Causa de cada reevaluación").
- **Antes:** no existía.
- **Origen del cambio:** C9, I17. Número nuevo.
- **Qué la pone a prueba:** Fase 2 #10, #LC.
- **Uso en v1:** historial; plan de acción.

### D23 · `safety_critical`
- **Texto vigente:** Un riesgo con I-personas ≥ 4 (al menos una muerte plausible o daño irreversible grave) lleva `safety_critical = true`. Obliga a que aparezca siempre en una vista de seguridad y a que tenga registrada en todo momento una acción en curso o una decisión explícita de la dirección sobre su tratamiento, con fecha de revisión; sin ninguna de las dos, alerta visible. No fuerza banda, no fija piso y no mueve el ranking. Un riesgo remoto puede llegar a la banda más alta por el producto, pero no está obligado.
- **Estado:** decidida (v0.1 (Fase 3, aprobada por Emiliano 2026-10-05 20:46 UTC)).
- **Antes:** no existía.
- **Origen del cambio:** F3-1 modificada por Emiliano: una muerte plausible no puede quedar fuera; CP-02, CP-15.. Número nuevo.
- **Qué la pone a prueba:** Fase 2 #2, #15 (CP-02, CP-15; circulares).
- **Uso en v1:** vista de seguridad; plan de acción.

### D24 · Escenario por causa común
- **Texto vigente:** Cuando una misma causa puede materializar de forma plausible y material dos o más riesgos de la organización a la vez, se registra un escenario por causa común con sus miembros. Plausible: una sola ocurrencia de la causa puede producir los eventos de los miembros sin coincidencias independientes. Material: la consecuencia conjunta alcanza en alguna dimensión un nivel más alto que cualquier miembro solo. Se evalúa con P, I y V propios sobre la materialización conjunta (Económico sumado sin contar dos veces una pérdida; Personas conjunto; Continuidad la interrupción conjunta; Legal el máximo). Se ve en una vista aparte para acumulación de exposición y transferencia; nunca entra al ranking principal, no modifica los factores de sus miembros y no les suma.
- **Estado:** decidida (v0.1 (Fase 3, aprobada por Emiliano 2026-10-05 20:46 UTC)).
- **Antes:** no existía.
- **Origen del cambio:** F3-5 aprobada, con el criterio de creación cambiado por Emiliano; CP-20.. Número nuevo.
- **Qué la pone a prueba:** Fase 2 CP-20 (circular).
- **Uso en v1:** vista de escenarios agregados; transferencia.

### D25 · Estado y eficacia de una acción
- **Texto vigente:** Una acción cuya ejecución material está verificada queda `cumplida`, aunque su efecto sea menor al esperado. Su eficacia es un campo aparte: `efecto_total`, `efecto_parcial` o `sin_efecto_medible`, con nota de lo esperado, lo obtenido y la brecha. El factor toma el valor reevaluado, no el esperado.
- **Estado:** decidida (v0.1 (Fase 3, aprobada por Emiliano 2026-10-05 20:46 UTC)).
- **Antes:** no existía.
- **Origen del cambio:** CP-10, aprobado por Emiliano; cierra la contradicción abierta #5.. Número nuevo.
- **Qué la pone a prueba:** Fase 2 #10 (CP-10; circular).
- **Uso en v1:** plan de acción; historial.

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

1. **D19 ↔ D15 en continuidad.** "Tiempo sin operar" es I-continuidad (bruto, de esta organización) y "recuperación" es V; un mismo hecho (no hay plan de continuidad) puede cargarse en cualquiera de los dos. → **Resuelta en v0.1** por D19 (CP-16: la falta de continuidad va a V-recuperación).
2. **P6 ↔ D20 + D12.** Sin pisos, un extremo remoto queda en la banda que le da el producto; P6 se cumple sólo por la bandera y el filtro (evaluación H6). Si un riesgo remoto puede llegar a Crítica sigue sin decidir. → **Resuelta en la regla en v0.1** por D20 y D23 (`safety_critical`); el número queda para la Fase 9.
3. **D20 (disparo con cualquier I = 5) ↔ C6.** Con `max()` sobre cuatro dimensiones la bandera puede marcar buena parte de la lista y dejar de distinguir. → medir la frecuencia en el dry run, Fase 4 (evaluación H4).
4. **D15 (perfil mixto: "documentar qué aspecto domina") ↔ P4.** No hay regla que fije V ante un perfil mixto, así que dos evaluadores pueden divergir sin error. → **Resuelta en v0.1** por D15 (contención y recuperación separadas, V por dimensión).
5. **D16 + D18 ↔ P10 cuando la reevaluación no confirma el cambio esperado.** No está escrito qué estado toma la acción ni qué se registra (I16). → **Resuelta en v0.1** por D25 y protocolo §6.3 (CP-10).
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
