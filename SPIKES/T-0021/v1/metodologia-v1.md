# Metodología de criticidad · v1

> Fecha: 2026-10-14 · Versión: **metodologia v1** · sale de la **v1 candidate** (`v1/metodologia-v1-candidate.md`, congelada el 2026-10-11 13:37 UTC, que queda como registro y no se edita) · **no cambia ninguna regla**: el cuerpo (§1 a §14, §16 a §18) es el de la candidate; cambian este encabezado y las secciones de estado (evidencia, cinco condiciones, uso de `C_raw`, §15 y §19). Promovida por Emiliano el 2026-10-14 15:01 UTC (Fase 13, `v0/fase-13/decisiones-13.md`). Changelog: CH-098 a CH-112. Va con `v0/decisiones-v0.md` y `v0/protocolo.md` en v1 candidate y con la plantilla `v0/plantillas/ficha-evaluacion.csv`. Congelada en `v1/congelamiento-v1.md`.
>
> **Alcance de la promoción.** La v1 es una baseline estable para uso experimental en Risk OS. No implica que `P × I × V` esté validado como modelo universal ni como orden profesional definitivo (Emiliano, 2026-10-14).
>
> **Resultado de la Fase 12** (revisión profesional, piloto S06, un revisor: Emiliano; `v0/fase-12/reporte-fase-12.md`): la v1 se reproduce con los factores registrados (banda 6/6, orden 15/15 frente a la referencia histórica del agente), pero el revisor no acepta el producto como orden principal: rechazó 2 de 15 pares (S06-R01/R05 y S06-R04/R05) y lo aceptó sólo como tamizaje con condiciones.
>
> **Decisión sobre `P × I × V`** (Fase 13): **retenido provisionalmente como índice heurístico de tamizaje, no validado como función de orden final.** D14: 2 de 3, no falsada.
>
> Cualquier cambio de regla es una fila nueva del changelog y una versión nueva (v1.1, EMI-43), con su regresión.

## Qué prueba y qué no prueba la evidencia

Casi todo lo que sostiene esta versión es **evidencia dentro de la muestra**. Los casos de propiedad motivaron las reglas de la v0.2 y la v0.3; las 285 fichas de EMI-41 (255 del agente y 30 de Emiliano) y sus anomalías motivaron las correcciones de la v1 candidate. La regresión F11-REG-01 y el arnés ejecutable muestran que las reglas son **consistentes** con esa evidencia y entre sí, no que **generalicen**. La población sintética de EMI-41 tampoco es la población de aplicación.

**La Fase 12 es la única evidencia fuera de muestra, y es acotada:** un revisor, que además adjudicó los casos de propiedad; una empresa sintética (S06, cuyas fichas del agente sí están en la muestra); seis riesgos; piloto guiado; respuestas a §16 posteriores a la revelación. La validación independiente con evaluadores nuevos es EMI-44.

Qué cambió de la v0.3 a la v1 candidate (detalle en el changelog):

| Fila | Regla |
|---|---|
| CH-098 | §1.3.4: un único escenario de referencia por ficha; sin base para elegirlo, el factor es `unknown` |
| CH-099 | §4.1.7 y D17: lo que paga un seguro obligatorio (ART) sigue en I bruto |
| CH-100 | §3.2: una frecuencia sólo fija P si mide el mismo evento iniciador |
| CH-101 | §4.4: perder una unidad sustituible sin degradación material es Continuidad 1, juzgado por sustituibilidad real, sin umbral |
| CH-102, CH-105 | §8, §9.1, §9.2: banderas con `unknown` por su máximo; un peor creíble fuera del rango de tres niveles también alimenta las banderas |
| CH-103 | §3.3, §6.2, §7.2: lecturas del arnés (ancla 5 de P, dimensión determinante, I efectivo con cota) |
| CH-104 | Decisiones faltantes #3 y #12 resueltas |
| CH-106 | §4.3: muerte plausible en Personas como consecuencia directa y creíble del evento |
| CH-107 | §5.1: la medida anticipatoria se clasifica por criterio causal |
| CH-108 | Plantilla: columna `prioridad_provisional` |
| CH-109 | §6.6: uso del techo plausible |
| CH-110 | Corrida F11-REG-01, sin cambio de regla |
| CH-111 | Cierre de EMI-15: decisión sobre `P × I × V` y D14, sin cambio de regla |
| CH-112 | Esta versión, v1, sin cambio de regla |

## Uso de `C_raw` en Risk OS v1 (decisión de Emiliano, 2026-10-14)

No cambia ninguna regla de cálculo; fija cómo se lee y se usa el resultado.

1. `C_raw = P × I × V` se retiene **provisionalmente como índice heurístico de tamizaje**. **No está validado como función de orden final.**
2. **`C_raw` no es una medida cardinal**: sus diferencias o cocientes no tienen interpretación cuantitativa de criticidad. Un 80 no es "el doble" de un 40 ni 5 puntos más que un 75 significa algo.
3. `C_raw` se muestra **siempre junto con el vector de factores** (P, las cuatro dimensiones de I, contención y recuperación) **y las banderas** (`consecuencia_extrema`, `safety_critical`), nunca solo.
4. El orden que resulta de §7 puede **reordenarse profesionalmente**, según lo que defina EMI-16; cada reordenamiento se registra como discrepancia con su causa.

## Las cinco condiciones del plan (estado al cierre de EMI-15)

| Condición | Estado | Números |
|---|---|---|
| 1. Casos de propiedad satisfactorios | **Suficientes para v1, con limitaciones; no validados independientemente.** La Fase 12 no los tocó | 13 PASS de 20, 8 circulares; 4 FAIL estructurales (CP-01, CP-12, CP-16 combinación; CP-07 ranking) y 3 de calibración (CP-05, CP-17, CP-18) |
| 2. Divergencias interpretables | **Se cumple con limitación.** No hubo repetición independiente: el revisor de la Fase 12 es el evaluador humano de la Fase 8 | `evaluable` 80% en la Fase 8 (24/30, kappa 0,20); 23/30 con la v1 y EV-11-0063/0064 aceptadas. Fase 12: las 2 inversiones tienen explicación mecánica y fundamento profesional; de 8 diferencias de factor, 6 tienen causa y 2 no (n 6 riesgos) |
| 3. Bandas que discriminan | **Target de 70% no alcanzado; aceptado como limitación no bloqueante de v1** (Emiliano, 2026-10-14). Los desacuerdos EV-08 y EV-11 pasan a v1.1 | Banda entre evaluadores 16/23 = 69,6% < 70%. Agente: Baja 7,7%, Media 61,3%, Alta 22,1%, Crítica 8,9% (235 evaluables); concentración en `C_raw` 45–48. Fase 12: 6/6 (n 6, guiada; no cambia la medida preregistrada) |
| 4. Ranking profesionalmente defendible | **No validado como orden final por la revisión profesional; retenido como índice de tamizaje** | 23 de 25 pares de prueba en el orden esperado. Fase 12: 13 de 15 pares del orden previo del revisor; rechazó R05 sobre R01 y sobre R04. D10 sigue abierto (CP-07) |
| 5. Regresión estable | **Se cumple.** | F11-REG-01: casos 20/20 sin cambio; en EMI-41 todo cambio tiene regla; D23 se cumple. Arnés: 213 tests, 211 pass, 0 fail, 2 `todo` fuera de v1 (EV-44), reverificado el 2026-10-14. Piloto S06: 144 derivados iguales en Python y TypeScript |

**D14:** **2 de 3, no falsada** (Emiliano, 2026-10-14). Cuentan CP-01 R4 y CP-12 (recurrencia, G3) y S06 como un único caso: los pares S06-R01/R05 y S06-R04/R05 son manifestaciones del mismo mecanismo de compensación y comparten R05. Los pares S22, S27 y S31 no cuentan: no tuvieron adjudicación humana previa. Un tercer caso independiente falsa D14 (disparadores en `v0/fase-13/dossier-cierre-emi15.md` §5).

---

**Abreviaturas.** *decisiones* = `v0/decisiones-v0.md` · *protocolo* = `v0/protocolo.md` · *adjudicación* = `v0/adjudicacion-casos.md` · *respuestas* = `fuentes/respuestas-emiliano.md` · *plan* = `fuentes/plan-emi15-emi41.md` · *revisión* = `revision-adversarial-v0.md` · *dictamen* = revisión de Emiliano del borrador, 2026-10-05 20:35 UTC. RO = resultado operativo anual.

**Marcas.**
- **[E]**: decidido por Emiliano en el dictamen (respuesta a una F3 o a un punto del borrador).
- **[H]**: hipótesis de calibración. Aprobada para experimentar; la Fase 4 en adelante puede corregirla sin que eso sea un cambio de criterio.
- **Casos de origen**, al final de cada sección: los casos de propiedad cuya adjudicación motivó una regla de esa sección. Toda regresión reporta el resultado de esos casos sobre esa regla como **circular**: no cuenta como evidencia a favor.

**Cómo se usa.** Cada sección dice qué campo de la ficha (protocolo §2) se llena y con qué regla. Si una regla exige juicio, la sección dice qué tiene que quedar escrito para que una divergencia entre evaluadores sea visible. Ningún nivel se asigna sin escribir en `<f>_observacion` el hecho que lo sostiene (§12).

---

## 1. Alcance y unidad de evaluación

### 1.1 Qué se evalúa
1. Se evalúa el estado actual: P actual, I bruto, V actual (D2), para una organización concreta. P, I y V son atributos del par riesgo–organización, no de la organización sola (revisión O5).
2. Horizonte de P: 12 meses (D3). I y V no tienen horizonte propio: I es la consecuencia completa del evento (§4.1) y V lo que la organización puede hacer desde el evento [E].
3. Todo riesgo se escribe `causa → evento → consecuencia` (protocolo §2.1). El evento es el punto de corte entre P y V (§2).

### 1.2 Cuatro tipos de objeto

| Objeto | Qué es | ¿Compite en el ranking principal? |
|---|---|---|
| **Riesgo** | Un escenario: un evento con una cadena de consecuencias que comparte P y V (D21). | Sí |
| **Riesgo padre** | Un agrupador de escenarios que producen **la misma consecuencia concreta** para la organización (el mismo problema de negocio) por causas o eventos iniciadores distintos. No tiene factores ni score propios: su score no representa la unión de los escenarios. | Se muestra en la posición de su hijo prioritario (§1.4) [E] |
| **Sub-riesgo (hijo)** | Un escenario completo del padre: una causa o un evento iniciador con su propia P, I y V. | No [E] |
| **Escenario por causa común** | La materialización simultánea de dos o más riesgos de la misma organización por una misma causa. | No, nunca [E] |

### 1.3 Regla de granularidad (reemplaza el texto vigente de D21)
1. **Mismo evento iniciador, misma cadena de consecuencias, mismas P y V → un solo riesgo** con varias dimensiones de I (protocolo §3, ejemplo 3).
2. **Consecuencias distintas → riesgos distintos**, aunque se parezcan (protocolo §3, ejemplos 1 y 2).
3. **Misma consecuencia concreta, pero causas o eventos iniciadores distintos, o P o V distintas → un riesgo padre con un hijo por escenario** [E]. Cada hijo se evalúa completo, con su propio evento iniciador (§2.1).
4. Un problema con causas de P o V distintas **no se puede** escribir como un riesgo simple: va como padre. Así la granularidad no queda a elección del evaluador. Si una lista fija (evaluación ciega) lo trae como riesgo simple, se evalúa como está y se registra A7. Cada factor se evalúa con **un único escenario de referencia**: el que la información muestra como más plausible o frecuente entre los que junta la ficha, si hay base para elegirlo. Todos los valores oficiales salen de ese mismo escenario; no se toma la P de uno y la I o la V de otro. Los demás escenarios van a `<f>_max` y a la observación. Si no hay base para elegir el escenario de referencia, el factor cuyas consecuencias difieren es `unknown` con el rango que cubre los escenarios (§9.2).
5. La prueba entre 2 y 3 es: **¿la consecuencia que sufre la organización es la misma, cualquiera sea la causa?** El evaluador escribe en `justificacion` qué respondió. "La misma consecuencia" es un problema concreto ("indisponibilidad de la línea de embotellado"), no una dimensión de impacto ("pérdida económica", "interrupción"): dos escenarios que sólo comparten la dimensión son riesgos distintos.
6. **No hay invariancia entre formas.** Escribir un problema como riesgo simple (cuando una lista fija lo trae así) o como padre puede darle posiciones distintas, porque el padre no suma la frecuencia de sus hijos. Es una consecuencia aceptada del modelo, no un contraejemplo (dictamen de la Fase 4).

### 1.4 Posición de un riesgo padre
1. Cada hijo se evalúa con su ficha completa (P, I por dimensión, contención, recuperación). Sus factores nunca se mezclan con los de otro hijo: no se toma la P de uno y la V de otro (dictamen, punto 2).
2. Los hijos evaluables se ordenan entre sí con D10 (§7). El primero es el **hijo prioritario**.
3. El padre **se muestra** en el ranking principal en la posición de su hijo prioritario, con los factores de ese hijo y la lista de los demás. Es una forma de mostrar el problema agrupado: el padre no tiene score propio y esa posición no representa la unión de los escenarios ni la frecuencia del problema por cualquier causa.
4. **Hijos empatados.** Si dos o más hijos empatan en el primer lugar por D10, el padre muestra los factores de todos los empatados y comparte su posición.
5. **Hijo no evaluable.** Si al menos un hijo es no evaluable, el padre puede mostrar como referencia la posición de su hijo evaluable mejor ubicado, pero queda marcado `prioridad_provisional` (`tiene_hijo_no_evaluable`): hasta resolverlo, no afirma que ese hijo sea el prioritario definitivo (P2: `unknown` no es bajo). El hijo no evaluable entra además en la lista "no evaluable" y en la cola de validación con sus propias banderas (§9.4, §9.5). Si todos los hijos son no evaluables, el padre no tiene posición evaluable.
6. Los hijos no reciben posición propia en el ranking principal; quedan como detalle de análisis y tratamiento.
7. Campos: `tipo_objeto` y `riesgo_padre_id` en cada ficha; `prioridad_provisional` (derivado) en el padre.

**Casos de origen:** CP-12 (padre y sub-riesgos fuera del ranking), CP-20 (escenario por causa común como objeto aparte). S02-R07, S04-R03, S08-R03, S12-R05, S13-R05 y S28-R07 de EMI-41 (divergencia de evaluabilidad de la Fase 8).

---

## 2. El evento y el corte P/V

### 2.1 Regla del evento [E]
1. **El evento es el evento iniciador**: el primer punto de la cadena en el que el peligro ya se materializó en la organización y, si nada actúa después, la consecuencia se desarrolla sola.
2. Ejemplos: la **ignición** (no "el incendio destructivo"); el **robo o uso indebido de una credencial válida** (no "la descarga masiva"); la **rotura** del equipo o la estructura (no "la parada de varios meses"); el **ingreso del contaminante** a la red o al producto (no "el brote").
3. Si el texto del riesgo viene escrito con un evento posterior al iniciador, el evaluador toma como evento el iniciador que ese texto implica y lo escribe en `riesgo_evento`. Si no se puede identificar, registra A6.

### 2.2 Qué va a P y qué va a V [E]
1. **P cubre todo lo anterior al evento iniciador**: exposición, condiciones causales y controles preventivos, en su estado actual (D4, D15).
2. **V cubre todo lo que actúa desde el evento iniciador**: detección, contención, respuesta, redundancia, recuperación (D15).
3. **Test**: ¿el control actúa para que el evento iniciador no ocurra, o después de que ocurrió? Antes → P. Después → V.
4. **Los controles pasivos que actúan después del evento van a V**, aunque estén instalados de antemano: rociadores, detección automática, muros cortafuego, sectorización, restricción de acceso por rol o por sede, segmentación de red, copias de seguridad, stock de seguridad, sitio alternativo.
5. **Anti doble conteo (D15).** Un mismo control se carga en un solo factor, salvo dos mecanismos distintos nombrados en la observación de cada factor; si no los nombra, va sólo al factor del punto 3 y se registra A10.

### 2.3 Qué va a I y qué va a V [E]
Lo que la organización **es** va a I; lo que **hace o tiene preparado** desde el evento va a V (D19, evaluación H2).

**Test de la barrera.** *Si esta medida fallara, ¿la consecuencia llegaría igual?*
- **Sí → barrera → V.** La restricción de acceso por sede limita qué datos alcanza una credencial robada; si fallara, la credencial alcanzaría todo.
- **No, porque lo que se dañaría no está ahí → exposición → I.** Si en la zona de una posible explosión no trabaja nadie durante la operación, no hay barrera que pueda fallar: las personas no están.

El evaluador escribe en `<f>_observacion` qué respondió para cada hecho que usó.

### 2.4 La falta de plan de continuidad va a V [E]
- **I-continuidad** mide la interrupción bruta: qué funciones críticas se detienen y cuánto tiempo **si la organización no hiciera nada más que esperar la reparación o reposición normal de lo dañado**, al plazo de mercado.
- **V-recuperación** mide cuánto acorta la organización ese tiempo con lo que tiene preparado.
- Que no exista un plan de continuidad no hace más grave el evento: hace que la organización no acorte la interrupción bruta. Va a V-recuperación y nunca sube I-continuidad.

**Ejemplo.** Una panificadora industrial tiene un único horno; si falla la placa de control, el repuesto importado tarda tres semanas.
- *I-continuidad*: tres semanas sin hornear, porque esa es la reposición normal.
- *V-recuperación, versión A*: no hay plan, ni horno alternativo, ni acuerdo con otra planta. No acorta nada.
- *V-recuperación, versión B*: hay un acuerdo firmado y ensayado con otra panificadora que hornea desde el día dos.
- En A y en B, I-continuidad es la misma; sólo cambia V.

**Casos de origen:** CP-06 y CP-07 (evento iniciador; detección, rociadores y restricción de acceso a V), CP-16 (falta de continuidad a V), CP-18 (test de la barrera).

---

## 3. Probabilidad P

### 3.1 Qué mide
La probabilidad de que el **evento iniciador** ocurra al menos una vez en los próximos 12 meses, con la exposición, las condiciones y los controles preventivos actuales (D4). P es residual.

- **Antecedente:** una ocurrencia del evento iniciador, aunque la consecuencia haya sido contenida. Lo que la contuvo cuenta para V [E].
- **Precursor:** una ocurrencia de la causa sin que se produzca el evento. Es una "condición causal presente".

### 3.2 Jerarquía de evidencia
Cada fuente disponible indica un nivel. Las fuentes se ordenan por calidad y relevancia (dictamen):

1. **Dato cuantitativo confiable y comparable**: una frecuencia medida sobre una exposición comparable y suficiente, documentada (estadística sectorial, base actuarial, registro propio con muchos años-equipo). Se traduce a nivel con la columna de porcentajes de §3.3. Es comparable sólo si cuenta el mismo evento iniciador de la ficha. Una frecuencia que cuenta sólo una parte de esos eventos (por ejemplo, sólo los que tuvieron lesionados) o un evento distinto es una cota inferior: va a `p_observacion` y no fija el nivel.
2. **Historia propia representativa**: registros de esta organización durante un período suficiente para observar el evento (al menos 5 años, o el evento es recurrente).
3. **Organizaciones comparables**: mismo tipo de actividad y escala parecida.
4. **Sector**.
5. **Juicio experto**, sólo si no hay ninguna de las anteriores (`p_base = assumed`).

**Regla.**
- `p_valor` = el nivel que indica la fuente de mayor jerarquía disponible.
- Las demás fuentes se escriben en `p_observacion`.
- Si otra fuente de jerarquía 1 o 2 indica un nivel distinto, no se elige en silencio: se registra el rango que cubre las dos (`p_min`, `p_max`), `uncertainty` al menos `medium`, y la nota dice qué fuentes divergen.
- Una historia propia sin ocurrencias no indica un nivel por sí sola: sólo dice que no corresponden los niveles 4 y 5 por historia propia. En ese caso decide la fuente siguiente.

### 3.3 Anclas

| Nivel | Ancla observable | % anual (para fuentes de jerarquía 1) | Ejemplo |
|---|---|---|---|
| **5** | Ocurrió en esta organización con una frecuencia media de al menos una vez por año en los últimos tres años ( 36 meses, incluido el que ocurrió hace exactamente tres años; o en el período con registro, si es menor). | > 70% | Una línea que se detiene por la misma falla mecánica varias veces por año. |
| **4** | Ocurrió en esta organización en los últimos 36 meses (incluido el que ocurrió hace exactamente tres años), sin llegar a la frecuencia del 5; o es recurrente (varias veces por año) en organizaciones comparables. | 40–70% | Un intento de intrusión hace dos años, en una zona con robos habituales a depósitos. |
| **3** | Ocurrió en esta organización hace más de 3 años, o en organizaciones comparables en los últimos 5 años; o hay precursores observados en esta organización. | 15–40% | Nunca pasó en la empresa, pero una planta parecida de la región lo tuvo hace cuatro años. |
| **2** | Ocurrió en el sector en los últimos 10 años, pero no en esta organización ni en comparables cercanas, y no hay precursores. | 5–15% | Una falla que el sector registra un par de veces en la década, en otras regiones. |
| **1** | No se conocen ocurrencias en el sector salvo casos aislados a nivel global, y no hay precursores. | < 5% | Una falla estructural de un equipo certificado que aparece sólo en informes de accidentes excepcionales. |

"Cercana" = misma región o mercado. Los porcentajes son los de la escala pre-revisión (D4 "Antes") [H].

**Antecedente, precursor y condición causal.** Son tres cosas distintas con tres efectos distintos:
- **Antecedente:** ocurrió el evento iniciador (aunque se haya contenido, §3.1). Fija el nivel por frecuencia y antigüedad (anclas 3 a 5).
- **Precursor:** ocurrió la causa sin que se produjera el evento (un golpe a un parante, un desvío de temperatura, un acta de advertencia). Es el ancla 3 cuando no hay antecedentes propios.
- **Condición causal:** un **estado**, no una ocurrencia: degradación, sobrecarga, acumulación, exposición, un control preventivo débil o ausente. **Nunca fija un nivel por sí sola**; sólo da el ajuste de §3.4.

### 3.4 Ajustes por condiciones actuales [H]
Aprobados como hipótesis experimental (dictamen, PA 7). El ajuste se mide contra **la fuente que fijó el nivel**: si es la historia propia, contra las condiciones de ese período; si son comparables o sector, contra lo habitual en ellos.
1. **−1** si hay controles preventivos verificados que actúan sobre la causa y que la fuente que fijó el nivel no refleja (no existían durante el período de los antecedentes, o son mejores que lo habitual en los comparables o el sector).
2. **+1** si hay condiciones causales presentes que la fuente que fijó el nivel no refleja (no estaban durante ese período, o son peores que lo habitual en comparables o sector): degradación observada, sobrecarga, control preventivo descubierto fuera de servicio o ausente, cambio de exposición.
3. Un nivel como máximo en cada sentido; pueden compensarse; nunca fuera de 1–5.
4. Cada ajuste se escribe en `p_observacion` con su hecho; sin hecho escrito, no se aplica.
5. No se ajusta por controles que ya existían durante los antecedentes, ni cuando la fuente es un dato de jerarquía 1 que ya refleja las condiciones actuales.

**Casos de origen:** CP-06 y CP-07 (las ocurrencias del iniciador cuentan aunque se hayan contenido). S22-R02 (AN-8C-0001) y las A12 de §3.2 del agente (S31-R01, S32-R03, S33-R01, S33-R04). sin casos de origen nuevos: la separación antecedente/precursor/condición sale de anomalías de definición (AN-0010) y no de una adjudicación.

---

## 4. Impacto I

### 4.1 Reglas comunes
1. Cuatro dimensiones, cada una 1–5. Se conservan las cuatro; `I efectivo = max(dimensiones)` se muestra y desempata (D5, D10), pero la criticidad se calcula por dimensión (§6).
2. **No convertibles, comparables nivel a nivel** (D11). La equivalencia de §4.6 es una hipótesis de calibración, no una equivalencia demostrada [H].
3. **Tipos de consecuencia, no capas causales** (revisión I9): todo lo monetario va a Económico. Continuidad y Legal sólo llevan la parte no monetaria. Personas nunca se monetiza.
4. **Escenario que se evalúa.** El que es plausible si el evento iniciador ocurre y ningún control posterior actúa (D19). El peor creíble va a `<f>_max` (D8) [E].
5. **Consecuencia completa**: todos los efectos causados por el evento hasta que la organización vuelve a operar con normalidad o la pérdida queda definitiva (cierre, baja del activo, fallecimiento). No incluye eventos posteriores que necesiten una causa nueva e independiente (eso es otro riesgo o un escenario por causa común), ni efectos reputacionales (D13).
6. **Exposición actual**, según el test de la barrera (§2.3).
7. **Bruto de transferencia.** El seguro no reduce ninguna dimensión (D17). Incluye los seguros obligatorios (ART u otros): lo que paga la aseguradora es transferencia, e I-económico se evalúa con el costo bruto de la consecuencia (prestaciones médicas y salariales, indemnizaciones), aunque no lo pague la organización. Si la información sólo trae lo que paga la aseguradora, el bruto se estima con §4.2; si no se puede acotar, I-económico es `unknown`.

### 4.2 Económico
Consecuencia monetaria para esta organización como proporción del **RO** (D5; respuesta 2). Incluye daño directo, reposición de activos, multas y penalidades, costos extraordinarios y pérdida económica por interrupción.

| Nivel | Pérdida como % del RO [H] | Lectura |
|---|---|---|
| 1 | < 2% | Se absorbe en el presupuesto corriente. |
| 2 | 2% a < 10% | Se nota en el año, sin cambiar planes. |
| 3 | 10% a < 30% | Obliga a corregir el presupuesto o los objetivos del año. |
| 4 | 30% a < 100% | Se lleva buena parte del resultado del año. |
| 5 | ≥ 100% | Se lleva más que el resultado de un año entero. |

Un porcentaje justo en el corte va al nivel superior.

**Monto**.
1. La pérdida es el efecto sobre el resultado. La pérdida por interrupción es el **margen de contribución** que se deja de ganar más los costos extra, no la facturación perdida.
2. Si sólo se conoce la facturación perdida y se conoce el margen de contribución, se aplica.
3. Si no se conoce el margen de contribución: se registra el rango, con `i_econ_min` calculado con el margen operativo (RO / facturación) e `i_econ_max` con la facturación perdida entera. `i_econ_valor` es el nivel más plausible dentro de ese rango (§9.1), y `i_econ_observacion` dice qué margen de contribución se supuso y por qué (tipo de actividad, estructura de costos). `i_econ_base` es `assumed` o `inferred`; si el rango cruza niveles, `uncertainty` es al menos `medium`. Es `unknown` sólo en los casos de §9.2: no se puede acotar a tres niveles, o no hay base para preferir un nivel dentro del rango.

**Magnitud de referencia**. En este orden, la primera que exista:
1. RO del último ejercicio cerrado, positivo y normalizado (sin partidas extraordinarias identificadas).
2. Promedio normalizado de los ejercicios positivos de los últimos tres.
3. Otra medida económica de la organización, nombrada y justificada en `i_econ_observacion`; se registra además una anomalía A6, para que una divergencia entre evaluadores quede visible.
4. Si no hay ninguna, `i_econ = unknown`.

Se escribe en `i_econ_observacion` el monto, la magnitud usada y el porcentaje ("USD 600 mil / RO USD 2 M = 30%").

### 4.3 Personas
Consecuencias humanas para trabajadores, clientes, consumidores y público. No se monetizan.

| Nivel | Ancla |
|---|---|
| 1 | Sin lesiones, o primeros auxilios. |
| 2 | Lesiones leves con atención médica y sin incapacidad, en una o pocas personas. |
| 3 | Lesión o enfermedad grave con incapacidad temporal o internación, en una o pocas personas; o lesiones leves a muchas personas. |
| 4 | **Una muerte plausible, o daño irreversible grave** (incapacidad permanente, enfermedad grave en muchas personas). Dispara `safety_critical` (§8.2). |
| 5 | **Más de una muerte plausible** (catástrofe de seguridad). Dispara `safety_critical` y `consecuencia_extrema`. |

"Plausible" = el escenario de §4.1.4 lo produce sin suponer coincidencias adicionales. Para Personas este es el criterio del valor, no el resultado más frecuente de §9.1.1: si una muerte es una consecuencia directa y creíble del evento definido, sin agregar otra coincidencia causal, I-personas es al menos 4 aunque lo más frecuente sea una lesión. No alcanza con que sea físicamente imaginable. Si requiere una coincidencia adicional, la muerte va a `i_pers_max`. El evaluador escribe cuántas personas están expuestas y por qué el número de víctimas es plausible.

### 4.4 Continuidad [H]
Consecuencia operativa no monetaria. La pérdida económica de esa interrupción va a Económico (CP-13).

"Función crítica" = actividad sin la cual la organización no entrega su producto o servicio principal. "Interrupción" = pérdida de al menos la mitad de la capacidad de una función crítica. Una degradación menor a la mitad se evalúa un nivel por debajo del que le correspondería a la misma duración como interrupción. Si la función pierde una unidad entre muchas equivalentes y sigue funcionando sin degradación material de capacidad, throughput o nivel de servicio, no es degradación de una función crítica: es nivel 1. Se juzga por sustituibilidad real: las demás unidades tienen que tomar el trabajo de la que se pierde. No hay un umbral fijo de unidades ni de porcentaje (Emiliano, 2026-10-11 13:21 UTC).

| Nivel | Duración de la interrupción bruta de funciones críticas |
|---|---|
| 1 | Menos de 1 día, o sólo funciones no críticas. |
| 2 | De 1 a 3 días. |
| 3 | Más de 3 días y hasta 2 semanas. |
| 4 | Más de 2 semanas y hasta 3 meses. |
| 5 | Más de 3 meses, o cese definitivo de una función crítica. |

La duración es la bruta de §2.4.

### 4.5 Legal/regulatorio [H]
Consecuencia jurídica o regulatoria no monetaria. Las multas, indemnizaciones y costos legales van a Económico.

| Nivel | Ancla |
|---|---|
| 1 | Sin consecuencia jurídica, u observación administrativa menor. |
| 2 | Apercibimiento, acta o requerimiento formal del regulador; reclamo judicial individual acotado. |
| 3 | Sanción formal no monetaria, plan de adecuación obligatorio bajo inspección, notificación obligatoria a la autoridad y a afectados, o demandas de responsabilidad relevantes. |
| 4 | Suspensión temporal de una habilitación o clausura temporal; intervención regulatoria; responsabilidad penal posible de directivos. |
| 5 | Pérdida definitiva de la habilitación para la actividad principal, clausura definitiva, o intervención o administración de la organización por la autoridad. |

### 4.6 Equivalencia entre dimensiones [H]
Hipótesis de calibración: qué quiere decir cada nivel en las cuatro dimensiones. Si al evaluar un riesgo el evaluador cree que un nivel de una dimensión no equivale al mismo nivel de otra, registra A5.

| Nivel | Severidad para la organización | Económico | Personas | Continuidad | Legal |
|---|---|---|---|---|---|
| 1 | Se absorbe en la operación normal | < 2% RO | Primeros auxilios | < 1 día | Observación menor |
| 2 | Requiere atención de la gerencia; se recupera en el año | 2–10% RO | Lesión leve | 1–3 días | Requerimiento formal |
| 3 | Afecta los objetivos del año; interviene la dirección | 10–30% RO | Lesión grave | 3 días – 2 semanas | Sanción formal, notificación |
| **4** | **Daño grave y duradero que compromete el año, sin amenazar la existencia** | **30–100% RO** | **Una muerte o daño irreversible grave** | **2 semanas – 3 meses** | **Suspensión o clausura temporal** |
| 5 | Amenaza la existencia de la organización o produce muertes múltiples | ≥ 100% RO | Más de una muerte | > 3 meses o cese | Pérdida definitiva de habilitación |

**Casos de origen:** CP-11 (ancla económica relativa al RO), CP-13 (la pérdida económica de una interrupción va a Económico y la parte operativa a Continuidad), CP-16 (I-continuidad bruta), CP-02 y CP-15 (umbral de Personas para `safety_critical`). S19-R06 y S37-R03 (ART). Las A8 de continuidad del agente: aplica donde las demás unidades toman el trabajo de la que se pierde (S03-R01, S07-R07, S11-R04, S27-R02); no aplica donde la unidad no es sustituible (S28-R02, S32-R01, S33-R04; contraste C33). Las A12 de Personas del agente (comercio-0002) y las cuatro diferencias de `safety_critical` de la muestra.

---

## 5. Vulnerabilidad V

### 5.1 Qué mide
Lo que la organización puede hacer desde el evento iniciador para que la consecuencia bruta de I no se produzca completa (D15). Escala 1–5: **1 = poco vulnerable, 5 = muy vulnerable**. El seguro no es V (D17).

Dos aspectos, evaluados y registrados por separado [E]:
- **Contención**: limita **cuánto daño** se produce: detectar, suprimir, aislar, evacuar, rescatar, frenar la pérdida de dinero o de datos, avisar a afectados. Incluye respuesta. Una medida que se activa por el aviso de un evento ya en curso o inminente (alerta meteorológica, alarma de crecida, evacuación preventiva) y limita el daño cuando el evento ocurre es contención, aunque se ejecute antes. Si evita que el evento ocurra, es un control preventivo y va a P. El criterio es causal, no cronológico.
- **Recuperación**: acorta **cuánto dura** la interrupción y **repone** lo perdido: redundancia, sitio o equipo alternativo, procedimiento manual, acuerdos con terceros, restauración de datos, recupero de fondos o bienes.

Los dos se evalúan contra el escenario bruto de I, uno independiente del otro: la contención, por cuánto del daño bruto evita; la recuperación, por cuánto acorta y repone **si el daño bruto ocurre**. Cómo se combinan está en §5.5.

**Frontera entre los dos (AN-0004).** Una medida que hace que la función no llegue a detenerse o que el bien no llegue a perderse es **contención**, aunque sea redundancia: grupo electrógeno con transferencia automática, UPS, redundancia en caliente, conmutación automática sin corte. **Recuperación** es lo que actúa después de que la función se detuvo o el bien se perdió.

### 5.2 Evidencia de funcionamiento
Una medida está **probada** si hay un ensayo documentado de la medida completa en los últimos 12 meses, o una actuación real registrada en los últimos 3 años con resultado conocido. Si no, está **presente sin prueba**. Una medida que falla parcialmente (equipos que pierden comunicación, cobertura incompleta) se evalúa por lo que efectivamente hace, no por su diseño. La prueba ya no se aplica como "un nivel peor": está dentro de la descripción de cada nivel.

### 5.3 Rúbrica de contención
Las rúbricas describen capacidades y resultados; no cuentan cuántos niveles de I baja la consecuencia, porque las escalas son ordinales (dictamen, punto 1).

| Nivel | Contención |
|---|---|
| 1 | Medidas **probadas** que actúan solas o en minutos y dejan el daño en un incidente menor, sin que pase del punto de origen. |
| 2 | Medidas **probadas** que limitan el daño a una parte acotada del daño bruto (un sector, un equipo, un lote, pocas personas). |
| 3 | Medidas que limitan parte del daño pero dejan que una parte importante se produzca; o medidas como las de 1 o 2 **presentes sin prueba**. |

**Barreras pasivas (AN-0013).** Una barrera que no depende de detectar (permisos por rol o sede, muro cortafuego, sectorización, segmentación de red) se puntúa por el daño que deja pasar; la falta de detección no la empeora, porque la barrera actúa igual. Cuenta como **probada** si su configuración se verificó en los últimos 12 meses (auditoría, prueba de permisos, inspección); si no, está presente sin prueba. El plazo de 12 meses es una **regla operativa de v0.2** [H], elegida para alinear con §5.2; no es un estándar externo y se puede revisar.
| 4 | Medidas débiles: detección tardía o por terceros, respuesta sin entrenamiento, plan nunca ensayado. El daño se produce casi completo. |
| 5 | Nada contiene: una vez ocurrido el evento, el daño bruto se desarrolla completo. |

### 5.4 Rúbrica de recuperación

| Nivel | Recuperación |
|---|---|
| 1 | Alternativa **probada** que restablece las funciones críticas en horas, o repone lo perdido casi por completo. |
| 2 | Alternativa **probada** que restablece la mayor parte de las funciones críticas en días, mucho antes que la reposición normal, o repone la mayor parte de lo perdido. |
| 3 | Alternativa **probada** que cubre sólo una parte de las funciones, de los clientes o de lo perdido; o una alternativa como las de 1 o 2 **presente sin prueba**; o una alternativa parcial **formal** (escrita, contratada o propia: planta hermana, otro depósito) presente sin prueba. |
| 4 | Sólo capacidad improvisada o no escrita, que cubre poco ( lo que no es formal). |
| 5 | Nada acorta ni repone: se espera la reposición normal de lo dañado. |

### 5.5 V por dimensión, combinación secuencial
Un aspecto de V sólo multiplica una dimensión de I si actúa causalmente sobre ella (dictamen, punto 1). Ya no hay un V efectivo único que multiplique cualquier dimensión.

**Regla secuencial.** Primero actúa la contención; la recuperación actúa sólo sobre lo que la contención deja pasar. Por eso una contención probada no queda anulada por una recuperación débil, y una recuperación probada protege las dimensiones sobre las que actúa aunque la contención sea débil. La recuperación débil detrás de una buena contención pesa menos, no igual: queda visible en su campo (recuperación se muestra siempre, §6.4) y no entra en el ranking por otra vía, y la cola catastrófica la conserva `consecuencia_extrema` (dictamen de Emiliano sobre los perfiles PV-1 a PV-5, 2026-10-06 11:04 UTC). Que la regla haga pasar casos de propiedad que se conocían al diseñarla es regresión de consistencia, no evidencia de generalización: la primera prueba ciega es la Fase 8.

| Dimensión de I | Qué hace la recuperación sobre ella | `V_d` |
|---|---|---|
| Personas | Nada: no deshace lesiones | contención |
| Legal/regulatorio | Nada | contención |
| Continuidad | Acorta la interrupción | `min(contención, recuperación)`: alcanza con una de las dos barreras |
| Económico | Repone la parte de la pérdida que viene de la interrupción, no el daño físico | `min(contención, ⌈(contención + recuperación) / 2⌉)` [H] |

1. `V_d` sale de la tabla. `min` es "el menos vulnerable de los dos"; `⌈·⌉` redondea hacia arriba.
2. **Recuperación `no_aplica`:** si la consecuencia no tiene nada que restablecer ni reponer (ni interrupción ni pérdida recuperable), recuperación queda `no_aplica` y no entra en ningún `V_d`.
3. La tabla es fija: el evaluador no elige qué aspecto aplica a cada dimensión. Si cree que en un riesgo un aspecto actúa sobre una dimensión que la tabla no le asigna, o al revés, registra A11.
4. `v_aspectos_aplicables` (derivado) guarda, por dimensión, qué aspectos entraron.
5. Una acción que declara mejorar V tiene que nombrar el aspecto (revisión I10).

**Ejemplos de la regla (PV-1 a PV-5, P 3, I = 4 en las cuatro dimensiones).** PV-5 (5/5): `V` 5, 5, 5, 5. PV-2 (contención 5, recuperación 1): personas 5, legal 5, continuidad 1, económico 3. PV-3 (3/3): 3 en todas. PV-1 (1/5) y PV-4 (1/1): 1 en todas. Orden por `C_raw`: PV-5 = PV-2 > PV-3 > PV-1 = PV-4. Emiliano esperaba PV-5 > PV-2 y PV-1 > PV-4; esas dos diferencias quedan visibles por dimensión y en los campos de V, pero no ordenan: un desempate por preparación volvería a pesar V dos veces (decisión del 2026-10-07 01:54 UTC).

**Casos de origen:** CP-14 (contención y recuperación por separado; y su adjudicación revisada por Emiliano a favor de PV-1, 2026-10-06 11:08 UTC), CP-16 (falta de continuidad a recuperación), CP-06 y CP-07 (controles pasivos posteriores al evento a V), CP-10 (una medida que falla parcialmente se evalúa por lo que hace). PV-1 a PV-5 (perfiles de V, `fase-5/log-adjudicacion.md`). S07-R01 (AN-F8-007) y S35-R02 (medida anticipatoria).

---

## 6. Criticidad y banda

1. **Por dimensión:** `C_d = P × I_d × V_d`, para cada dimensión de I con valor.
2. **Criticidad:** `C_raw = max_d C_d`. La **dimensión determinante** es la que da ese máximo (si empatan, todas); se guarda en `c_dimension_determinante`. Una dimensión con parte `unknown` cuya cota (§9.3) iguala `C_raw` no se lista como determinante.
3. `C_raw` es un **índice heurístico de prioridad calculado sobre categorías ordenadas**. No es una medición cardinal ni actuarial, y tampoco es una escala ordinal bien definida: el producto depende de haber codificado los niveles como 1 a 5, y otra codificación que respete el mismo orden podría cambiar el ranking. Toma 30 valores no equiespaciados. Se trata como una función candidata sometida a falsación (D14, protocolo §9).
4. **Visible:** P, cada dimensión de I, I efectivo, contención, recuperación, dimensión determinante, banda, banderas, techo plausible (aparte). **Interno:** `C_raw` y los `C_d` (D12).
5. **Banda:** Baja, Media, Alta, Crítica (D12), por cortes sobre `C_raw`: **Baja** < 20 ≤ **Media** < 50 ≤ **Alta** < 75 ≤ **Crítica**. Un riesgo no evaluable no recibe banda (§9.4). Un padre toma la banda de su hijo prioritario (§1.4). Los cortes Baja/Media y Alta/Crítica cayeron en huecos sin casos adjudicados y se revisan con evidencia nueva; la concentración en Media sobre la población sintética (62%) y el bloque de `C_raw` 45–48 quedan abiertos para la Fase 11 (`fase-9/reporte-fase-9.md`). Antes de la Fase 9 `banda` quedaba vacía y la Fase 4 juzgaba sólo orden y visibilidad (protocolo §8).
6. **Techo plausible:** `max_d (P_max × I_d_max × V_d_max)`, usando `<f>_max` donde hay rango y `<f>_valor` donde no. No participa del ranking (D8). Se usa en el detalle del riesgo, en la vista y la cola de validación y como soporte de las banderas; nunca en el ranking.
7. **Si la Fase 4 o la 5 falsan el producto**, la alternativa a estudiar no es agregar pesos o exponentes: es una tabla de decisión calibrada o un agregador basado en escenarios (dictamen). Esto orienta la Fase 5; no es una decisión.

**Casos de origen:** ninguno.

---

## 7. Ranking (D10) [E]

### 7.1 Alcance
1. Se ordenan los riesgos evaluables de **una misma organización** que compiten en el ranking principal: riesgos simples y riesgos padre (con su sub-riesgo determinante, §1.4).
2. Quedan **fuera**: sub-riesgos, escenarios por causa común (§10), no evaluables (lista aparte, §9.4), el techo plausible y la incertidumbre (D9).
3. Las banderas no mueven el orden (§8).
4. **[CH-075]** El ranking es siempre dentro de una organización; no existe una lista ordenada con riesgos de organizaciones distintas. Las comparaciones entre empresas se hacen sólo con métricas agregadas del experimento (distribución de bandas, frecuencia de banderas, reproducibilidad); ninguna compara posiciones ni `C_raw` de riesgos de empresas distintas. La banda se puede contar entre empresas, pero no se lee como equivalencia de magnitud.

### 7.2 Versión inicial
Cada paso se aplica sólo si el anterior empata.

| Paso | Criterio | Explicación en una frase |
|---|---|---|
| 1 | Banda (más alta primero) | La banda es la lectura visible de la criticidad. Mientras los umbrales sólo corten `C_raw`, este paso no cambia nada respecto del 2; queda para cuando la Fase 9 los fije. |
| 2 | `C_raw` (mayor primero) | La peor combinación de probabilidad, consecuencia y vulnerabilidad pone el riesgo antes. |
| 3 | I efectivo (mayor primero) | Con igual criticidad, va primero el que tiene la consecuencia más grave. |
| 4 | I-personas (mayor primero) | Con igual criticidad y gravedad, va primero el que daña más a las personas. |
| 5 | Empate legítimo | Comparten posición; ninguna regla los distingue. |

**Principio de D10.** Después de `C_raw` sólo se aplican desempates con justificación normativa establecida. Si un desempate daría una preferencia arbitraria, se conserva el empate: D10 no busca un orden total. No se usa la preparación (V) como desempate, porque V ya está en `C_raw` y volver a usarla le daría un segundo peso escondido.

**I efectivo con una dimensión `unknown` (AN-0014).** Se muestra como **`≥ n`**, donde `n` es el máximo de las dimensiones conocidas; el techo de la `unknown` nunca se usa como valor (D8, D9). En el paso 3, si `≥ n` alcanza para decidir sin depender de lo desconocido (el otro riesgo tiene I efectivo menor que `n`), decide; si saber el valor de la `unknown` podría cambiar el orden, el paso queda **indeterminado** y los dos riesgos conservan la misma posición, marcada como provisional. Lo mismo en el paso 4 si I-personas es `unknown`. Si la dimensión `unknown` tiene `<f>_max` registrado ≤ `n`, I efectivo se muestra `n`, porque lo desconocido no puede superarlo (mismo criterio que la cota de §9.3).

- Se quita el desempate por amplitud de I: cuenta dos veces la misma pérdida (CP-13).
- P no es desempate.
- Un empate legítimo se muestra con la misma posición; la UI puede listar los empatados por `risk_id` para estabilidad, sin que eso represente prioridad.
- Los pasos y su orden son hipótesis experimentales (plan, Fase 3 "Ranking").

**Casos de origen:** CP-13 (sale la amplitud), CP-12 (sólo el padre compite), CP-07 queda como caso abierto: D10 rompe un empate que se adjudicó como permitido (AN-0160); se revisa D10 más a fondo fuera de esta fase.

---

## 8. Banderas

### 8.1 `consecuencia_extrema` (D20, sin cambio de disparo)
- **Disparo:** alguna dimensión de I con `<f>_valor = 5` (respuesta 3). También una dimensión `unknown` o con el peor creíble fuera del rango de tres niveles: ver el final de §8.2.
- **Efecto:** visible y filtrable; no altera la banda ni el ranking.
- Convive con `safety_critical`. Su frecuencia la mide la Fase 4 (contradicción abierta #3).

### 8.2 `safety_critical` (nueva, D23)
- **Disparo:** `i_pers_valor ≥ 4`: al menos una muerte plausible o daño irreversible grave. Con las anclas de §4.3 las dos formulaciones del dictamen ("fatalidad plausible o daño irreversible grave" y "I-personas ≥ 4") son la misma regla. El nivel 5 de Personas sigue reservado a muertes múltiples.
- **Qué obliga** [E]:
  1. **Visibilidad:** aparece siempre en una vista de seguridad propia, cualquiera sea su posición o su banda.
  2. **Tratamiento:** tiene que tener registrada en todo momento una acción en curso o una decisión explícita de la dirección sobre su tratamiento (tratar, aceptar con fundamento, transferir lo transferible), con fecha de revisión. Sin ninguna de las dos, alerta visible.
- **Qué no hace:** no fuerza banda, no fija un piso, no mueve el ranking.
- **Cierra la contradicción abierta #2**: Con la fórmula y los umbrales vigentes, P 1 llega como máximo a Media y P 2 como máximo a Alta. Alcanzar Crítica requiere P ≥ 3, aunque esa condición no es suficiente. Las banderas garantizan visibilidad y obligaciones de tratamiento, sin imponer un piso de banda.
- **Riesgo con una dimensión `unknown`** [E]: las dos banderas aplican si la dimensión tiene valor plausible en el umbral, o si es `unknown` y su `<f>_max` registrado alcanza el umbral, sea el riesgo evaluable o no. Un `unknown` sin `<f>_max` registrado no dispara bandera (lo prioriza la cola, §9.5).
- **Peor creíble fuera del rango de tres niveles** [E]: si un factor con valor registra en `<f>_max` un peor creíble a más de tres niveles del piso de la duda plausible (`<f>_max − <f>_min > 2`; sin `<f>_min`, desde `<f>_valor`; §9.2), las dos banderas lo toman como un `unknown`: aplican si ese `<f>_max` alcanza el umbral. Un rango de hasta tres niveles no dispara por su máximo: vale el valor (D20). No cambia `C_raw`, la banda ni el ranking.
- Campo nuevo: `safety_critical` (booleano).

**Casos de origen:** CP-02 y CP-15 (bandera de seguridad separada del score, sin forzar banda). S31-R05 y S36-R07 (evaluables con Personas `unknown`; Fase 10). S02-R07 y S22-R06 del agente (con la v0.3 eran no evaluables con la bandera; con la regla del peor creíble (§8.2) vuelven al ranking y la conservan).

---

## 9. Unknowns y no evaluables (D8, D9)

### 9.1 Valor plausible, rango y techo
1. Si hay un valor defendible más plausible, entra en la criticidad (`<f>_valor`). Es la mejor estimación profesional con la información disponible, no el peor valor que no se puede descartar ni el mejor.
2. Si el evaluador duda entre niveles, registra el rango. El rango no mueve la criticidad; `<f>_max` sólo alimenta el techo (§6.6). Si el peor creíble queda fuera del rango de tres niveles, alimenta también las banderas (§8.2).
3. La incertidumbre no baja ni sube la criticidad (D9). Va en `uncertainty` con nota de qué falta conocer.

### 9.2 Cuándo un factor es `unknown`
Hay valor defendible cuando la evidencia disponible permite fijar el nivel, o acotarlo a un rango de como máximo tres niveles contiguos (`<f>_max − <f>_min ≤ 2`) con un valor más plausible dentro. El límite de tres niveles se aplica a la duda sobre el valor plausible. Si el valor plausible está fijado o acotado así y el peor creíble (§4.1.4) está más lejos, el factor es evaluable: el peor creíble va a `<f>_max` aunque el rango supere tres niveles, y sólo alimenta el techo y las banderas (§8.2), nunca la criticidad ni el ranking. Conocer un solo dato suelto no alcanza si no discrimina el nivel (dictamen). Si la evidencia no acota el factor a ese rango, el factor es `unknown`: no se inventa un valor. `<f>_observacion` dice qué falta y `necesidad_validacion` qué hay que averiguar.

**Datos auxiliares desconocidos.** Un dato auxiliar desconocido (el margen de contribución, la duración exacta, el número exacto de personas) no vuelve `unknown` al factor si la evidencia permite acotarlo a un rango de como máximo tres niveles contiguos **y elegir dentro de él un valor más plausible defendible**. El supuesto y su fundamento quedan escritos en `<f>_observacion`. El tamaño del rango es condición necesaria, no suficiente:

| Situación | Resultado |
|---|---|
| Rango ≤ 3 niveles y valor más plausible defendible | Evaluable con ese valor |
| Rango ≤ 3 niveles, sin base para preferir un nivel | `unknown` con ese rango |
| Rango > 3 niveles, o sin rango defendible | `unknown` |

### 9.3 Criticidad con partes `unknown`
1. **P `unknown`** → riesgo no evaluable.
2. **Una dimensión de I o un aspecto de V `unknown`:** se calcula `C_raw` con las dimensiones cuyos factores son todos conocidos. Para cada dimensión con alguna parte `unknown` se calcula su cota `P × I_d × V_d` poniendo en cada parte `unknown` su `<f>_max` registrado, o 5 si no tiene.
   - Si todas esas cotas son ≤ `C_raw` de las dimensiones conocidas, el riesgo es evaluable con ese `C_raw`: lo desconocido no puede cambiar el resultado.
   - Si alguna cota lo supera, o no hay ninguna dimensión conocida, el riesgo es no evaluable.
3. Esto reemplaza "I efectivo con una dimensión `unknown`" del borrador y cierra el PA 3 del protocolo.

### 9.4 Riesgo no evaluable
- `evaluable = false`, `c_raw` vacío, con `motivo_no_evaluable` y `necesidad_validacion` (D8).
- Va a la **lista "no evaluable"**, separada del ranking (D8; evaluación H7). No recibe banda por falta de datos.
- Las banderas aplican (§8.2).
- Entra en la **cola de validación** (§9.5).

### 9.5 Cola de validación
Una prioridad independiente del ranking: **qué información conviene obtener primero** (dictamen). No es criticidad y no se mezcla con el ranking principal.
- **Entran:** los riesgos no evaluables y los evaluables con algún factor `unknown` o con `uncertainty = high`.
- **Orden:**
  1. Primero los que podrían ser `safety_critical`: `i_pers_valor ≥ 4`, o `i_pers` `unknown` sin `<f>_max` o con `<f>_max ≥ 4`.
  2. Después, por **cota de validación**: `max_d (P × I_d × V_d)` poniendo `<f>_max` donde hay rango y 5 donde hay `unknown` sin rango (mayor primero).
  3. Después, por `i_pers` máximo posible (mayor primero).
- Se calcula; no hay campo nuevo en la ficha.

**Casos de origen:** las A12 del agente sobre peor creíble y tres niveles (S02-R07, S22-R04, S22-R06 y otras 9). CP-08 (la incertidumbre no baja ni sube la criticidad; la mejor estimación, no el peor no descartable; qué tiene que quedar visible de lo que no se sabe).

---

## 10. Escenario por causa común [E]

### 10.1 Qué es
Un registro aparte que representa la materialización simultánea de dos o más riesgos de la misma organización por una misma causa. No es un riesgo más: es una vista de acumulación de exposición. D13 sigue excluyendo la correlación del score de cada riesgo; este escenario es el único lugar donde se ve.

### 10.2 Cuándo se crea
Cuando una misma causa **puede materializar de forma plausible y material** dos o más riesgos de la organización a la vez (dictamen). No hace falta que pase en la mayoría de los casos: qué tan remoto es lo dice su P.
- **Plausible:** una sola ocurrencia de la causa puede producir los eventos iniciadores de los miembros sin suponer coincidencias independientes.
- **Material:** la consecuencia conjunta alcanza, en alguna dimensión de I, un nivel más alto que cualquiera de los miembros por separado.
- El evaluador escribe en la observación del escenario los dos hechos. Si no puede sostener alguno, no crea el escenario y registra A7.

### 10.3 Cómo se evalúa
1. Ficha propia con `tipo_objeto = escenario` y `miembros` (los `risk_id`).
2. **P:** probabilidad de que la causa produzca la materialización conjunta en 12 meses (§3).
3. **I por dimensión, sobre la consecuencia conjunta:** Económico, suma de las pérdidas de los miembros sin contar dos veces una misma pérdida; Personas, las personas expuestas en el conjunto; Continuidad, la interrupción conjunta; Legal, el máximo.
4. **Contención y recuperación** frente al escenario conjunto, que puede exigir más que cada miembro solo; `V_d` como en §5.5.
5. Tiene `C_raw`, banda (con los mismos umbrales) y banderas propias.

### 10.4 Dónde se ve y qué no hace
- Se ve en una vista de escenarios agregados, con sus miembros enlazados.
- **No entra al ranking principal**, **no modifica** los factores de sus miembros y **no les suma**. Los miembros conservan su evaluación, sus controles y sus acciones individuales.
- Sirve para acumulación de exposición y como insumo de transferencia (D17).

**Casos de origen:** CP-20.

---

## 11. Dinámica

### 11.1 Cuándo cambia la criticidad (D18 en los dos sentidos) [E]
1. Los factores cambian sólo con una reevaluación sustentada en evidencia y aceptada (D18; protocolo §6.1).
2. La criticidad **puede subir o bajar sin ninguna acción**, por información nueva o por un cambio de contexto real. Nunca baja porque una acción se planificó o figura como completada.
3. Cada reevaluación lleva `motivo` (D22):

| `motivo` | Cuándo | Ejemplo |
|---|---|---|
| `accion_ejecutada` | Se verificó la ejecución de una acción del plan. | Se instaló y probó un sistema de detección. |
| `informacion_nueva` | Aparece un hecho que ya existía y que la ficha anterior **no registraba**. | Se descubre un defecto de instalación que nadie había relevado. |
| `correccion_evaluacion` | La ficha anterior **registraba como cierto** algo falso, o aplicó mal una regla. | La ficha anterior contó como operativo un sistema que estaba apagado. |
| `cambio_contexto` | El riesgo cambió sin acción del plan: entorno, exposición, terceros, regulación. Puede mejorar o empeorar. | Abre un cuartel de bomberos a pocas cuadras. |
| `cambio_version_metodologia` | Cambian las anclas o reglas; los hechos son los mismos. | Una versión nueva de las escalas. |

4. `informacion_nueva` y `correccion_evaluacion` dicen que el riesgo **ya era** distinto de lo registrado. `cambio_contexto` y `accion_ejecutada` dicen que el riesgo **cambió**.
5. Un cambio de versión puede cambiar `C_raw` y banda sin que cambie el riesgo; nunca cuenta como mejora ni empeoramiento (protocolo §6.4).

### 11.2 Acciones: estado y eficacia [E]
1. El cambio esperado de una acción nunca escribe un factor (D16).
2. **Estado:** `cumplida` cuando la ejecución material está verificada, aunque el efecto sea menor al esperado.
3. **Eficacia, campo aparte** (protocolo §6.3): `efecto_total`, `efecto_parcial` o `sin_efecto_medible`, con nota de lo esperado, lo obtenido y la brecha.
4. **El factor toma el valor reevaluado, no el esperado.**
5. Lo que la reevaluación descubra sobre el estado anterior va en una ficha separada con `informacion_nueva` o `correccion_evaluacion`.
6. Una acción modifica sólo el factor o la dimensión sobre el que tiene mecanismo causal (D16). Si declara V, nombra el aspecto.

### 11.3 Transferencia (D17)
- Firmar, ampliar, renovar o consumir una póliza no cambia ningún factor ni la criticidad.
- Los eventos de la póliza tienen **su propio historial en `risk-transfer`** (firma, consumo del límite, renovación, con fecha). El riesgo enlaza esos eventos; **no** se crea una ficha de reevaluación del riesgo ni se usa ningún `motivo`, porque el riesgo no cambió (dictamen, PA 25).

**Casos de origen:** CP-10 (cumplida más eficacia), CP-19 (cambios sin acción, criterio de `motivo`), CP-17 (el consumo del límite se registra en transferencia).

---

## 12. Observación por factor (O4)

1. Cada factor con valor (`p`, `i_econ`, `i_pers`, `i_cont`, `i_legal`, `v_cont`, `v_rec`) lleva en `<f>_observacion` el hecho que sostiene el nivel, en palabras y con números si los hay.
2. Un factor `unknown` lleva en la observación qué falta.
3. La observación no reemplaza el nivel ordinal ni entra en el cálculo (D13).
4. Un nivel sin observación es una ficha incompleta.
5. **Procedencia por factor (`<f>_base`, `<f>_evidencia`)**: se usa en el experimento, pero **no es una decisión de v1**. EMI-17 dice que v1 no requiere trazabilidad por campo; queda abierta hasta la Fase 15 (EMI-16).

**Casos de origen:** ninguno.

---

## 13. Qué datos deja cada evaluación para las vistas

No se diseñan pantallas. Ninguna de estas vistas es parte del score.

| Vista | Qué tiene que existir en los datos | De dónde sale |
|---|---|---|
| **Movimiento por dimensión antes/después** | Cada ficha guarda las cuatro dimensiones de I, contención, recuperación y la dimensión determinante, con `evaluacion_anterior_id`, `motivo` y `accion_id`. Se compara contra la ficha anterior aceptada. | Protocolo §2 más §5.5 y §6 |
| **Exposición retenida (transferencia)** | Por riesgo: monto económico bruto estimado. Por póliza, en `risk-transfer`, con historial propio: riesgos cubiertos, límite original, consumido, disponible, franquicia, renovación. | D17, §11.3 |
| **Seguridad** | `safety_critical`, personas expuestas, acción en curso o decisión registrada y su fecha de revisión. | §8.2 |
| **Escenarios agregados** | Ficha del escenario con `miembros`, factores, `C_raw` y banderas. | §10 |
| **No evaluables y cola de validación** | `evaluable`, `motivo_no_evaluable`, `necesidad_validacion`, rangos y `unknown` por factor, banderas. | §9.4, §9.5 |
| **Historial** | Todas las fichas, nunca editadas, con `motivo` y `version_metodologia`. | Protocolo §6 |

**Casos de origen:** CP-04, CP-09, CP-17 y CP-18 (movimiento por dimensión y exposición retenida visibles), CP-20 (escenario agregado), CP-08 (lo que no se sabe, visible).

---

## 14. Propiedades que las regresiones tienen que intentar romper

El dictamen pide usar los casos como test adversarial de propiedades, no sólo como verificación de órdenes. La Fase 4 registra cualquier contraejemplo como anomalía; no corrige nada. Son también los invariantes que EMI-16 tendría que convertir en tests automáticos.

1. **Monotonía (P1):** subir P, una dimensión de I o un aspecto de V, con lo demás igual, nunca baja `C_raw` ni la posición.
2. **Padre como agrupador** (reemplaza "invariancia de granularidad", abandonada en el dictamen de la Fase 4): el padre nunca tiene factores ni score propios; se muestra en la posición de su hijo prioritario (o de los empatados); con un hijo no evaluable su posición es provisional. Que la forma (simple o padre) cambie la posición **no** es un contraejemplo (§1.3.6).
3. **Causalidad de V:** un aspecto de V nunca cambia el `C_d` de una dimensión sobre la que no actúa (§5.5).
4. **Unknown:** un `unknown` nunca produce un `C_raw` bajo ni cero; o el riesgo es evaluable porque lo desconocido no puede cambiar el resultado, o va a la lista no evaluable.
5. **Separación:** un sub-riesgo nunca entra al ranking principal; un escenario por causa común nunca modifica los factores de sus miembros.
6. **Historial:** un cambio de versión nunca sobrescribe una ficha anterior.
7. **Sensible a la mejora (P11):** toda mejora real de un aspecto de V baja el `V_d` de alguna dimensión sobre la que actúa, salvo que el otro aspecto ya la deje mejor. Si no baja ningún `V_d`, la mejora igual queda visible en el campo del aspecto. No exige que baje `C_raw`: si la dimensión determinante es una sobre la que el aspecto no actúa, la mejora se ve por dimensión (§13).
8. **El producto:** buscar activamente pares donde `P × I × V` dé un orden profesionalmente incorrecto, y pares donde recodificar los niveles (manteniendo el orden) cambie el ranking.

### Insumos para EMI-16 (no son decisiones de esta fase)
Del dictamen, para el modelo de dominio de Risk OS: separar `Risk` (identidad estable), `Assessment` (evaluación inmutable bajo una versión de metodología, con `previous_assessment_id`, `reason`, `accepted_at`), `FactorAssessment` (`known` | `unknown` | `not_applicable`, valor o rango, observación, evidencia, incertidumbre), `Action`, `ActionEffect`, `Transfer` y `Scenario`. `I efectivo`, `V_d`, `C_raw`, banda, banderas y ranking salen de funciones puras versionadas, no son datos editables; se puede guardar el resultado calculado para auditoría, siempre reproducible.

---

## 15. Limitaciones declaradas

Aceptadas por Emiliano (2026-10-11 12:18 UTC, punto 11; las de la Fase 12, 2026-10-14). Los números son los de F11-REG-01 sobre la v1 candidate, salvo los de la Fase 12.

| Punto | Limitación | Qué la resolvería |
|---|---|---|
| EV-09 | CP-05: `max()` descarta la amplitud del impacto | otro agregador (fuera de v1) |
| EV-12, EV-13 | Banda: 69,6% de acuerdo entre evaluadores (n 23) y 13 A1 con el mismo sentido (el agente una banda abajo) | evaluadores nuevos, Fase 12 |
| EV-14 | Casi no hay casos remotos con consecuencia extrema | casos nuevos |
| EV-15 | 61,3% de los evaluables del agente en Media; 36,3% de los pares que la intención separa quedan en la misma banda | juicio del revisor (pregunta 3) |
| EV-19, EV-25 | Recurrencia por encima de P = 5 (CP-01 R4, CP-12, 6 fichas); 1 de 3 hacia D14 | representación de la recurrencia, versión posterior |
| EV-21 | CP-16, factores en el borde | resolver los bordes y volver a correr |
| EV-23 | Un techo peor puede sacar a un riesgo del ranking (§9.3) | casos con `unknown` reales |
| EV-26 | Frecuencia de banderas en el agente: `consecuencia_extrema` 61 de 252 fichas que no son padre; `safety_critical` 84 de 252 (33,3%) | población real |
| EV-31 | Una sola contención para todas las dimensiones | contención por dimensión, que sería mecanismo nuevo |
| EV-33 a EV-36 | Evento menor, ajuste con precursor, eventos crónicos, consecuencias sin fin natural | guía de redacción del evento, Fase 12 |
| EV-38 a EV-42 | Fronteras contención/recuperación, controles previos, procedimiento manual, recuperación `no_aplica` en Personas, causa común con escala saturada | ejemplos en la guía; las reglas ya resuelven |
| EV-24 (Fase 12) | `C_raw` no se aceptó como orden principal; el revisor rechazó 2 de 15 pares en S06 por compensación de P y V frente a un I 5 más grave | uso como tamizaje (ver "Uso de `C_raw`"); propuestas de no compensación en v1.1 (EMI-43) |
| EV-08, EV-11 (Fase 12) | El revisor no acepta la banda de dos perfiles: amenaza existencial con preparación media junto a grave con preparación débil; P 4 · I-econ 5 · V 3 en Alta (él daría Crítica) | v1.1 (EMI-43) |
| EV-02, EV-06/37 (Fase 12) | Referencia económica sin RO positivo y Legal 4 por penal posible: el revisor propone criterios propios, sin calibrar | v1.1 (EMI-43) |
| Fase 12 | Revisión profesional de un solo revisor, guiada, sobre una empresa sintética; 93 de 112 discrepancias del piloto sin causa individual | validación independiente (EMI-44) |

## 16. Preguntas para la revisión profesional (Fase 12)

Redactadas para un revisor que no vio resultados de Risk OS. Esta versión no elige casos ni revisores.

1. **EV-02.** Si una organización no tiene resultado operativo positivo en los últimos tres ejercicios, ¿con qué magnitud compararía una pérdida para juzgar su gravedad: ingresos, fondo de reserva, presupuesto u otra?
2. **EV-06, EV-37.** Ante un evento con una víctima fatal posible, ¿la exposición penal posible de directivos o la clausura de un sector es por sí sola una consecuencia jurídica grave, o depende de la conducta de la organización y de la decisión de la autoridad?
3. **EV-08.** Un riesgo de probabilidad media, consecuencia que amenaza la existencia de la organización y preparación media, ¿debería estar en la misma banda que uno de probabilidad media, consecuencia grave y preparación débil?
4. **EV-10.** Un evento remoto con consecuencia extrema, ¿qué prioridad de atención debería tener frente a eventos probables y moderados?
5. **EV-11.** Un evento probable con consecuencia económica extrema y preparación media: ¿qué banda le daría?
6. **EV-20.** Entre un evento remoto que puede matar a una persona y paralizar la operación meses, y uno probable que causa una pérdida moderada, ¿cuál atendería primero y por qué?
7. **EV-22.** Si dos riesgos tienen la misma prioridad calculada, ¿qué criterio usaría para ordenarlos, o los dejaría empatados?
8. **EV-24.** ¿Le parece razonable combinar probabilidad, consecuencia y vulnerabilidad multiplicando niveles de 1 a 5, sabiendo que otra numeración de los mismos niveles podría cambiar el orden?

## 17. Fuera de v1

- **EV-27.** Procedencia por factor (`<f>_base`, `<f>_evidencia`) y `review_status` por ficha: campos del experimento. Destino: Fase 15 (EMI-16). No se borran.
- **EV-44.** Los `todo` J01 y e del arnés: son criterios para juzgar casos de propiedad, no reglas de v1.
- **EV-45.** D9, bandera de revisión prioritaria: no está implementada y ninguna pantalla la usa.

## 18. Antisobremodelado: qué usa cada regla en Risk OS v1

Cada regla nombra la pantalla u operación de Risk OS v1 que la usa.

| Regla | Uso en Risk OS v1 |
|---|---|
| §1 granularidad, padre (§1.4) | ordenar la lista (posición del padre); plan de acción (hijos) |
| §2 evento y corte P/V; §3 P | priorizar, matriz |
| §4 I por dimensión | priorizar, matriz, movimiento por dimensión |
| §4.6 equivalencia | guía de evaluación; ninguna pantalla (hipótesis de calibración) |
| §5 contención y recuperación | priorizar, plan de acción (la acción nombra el aspecto), movimiento |
| §6 `C_raw` y banda | priorizar, ordenar la lista, matriz |
| §6.6 techo plausible | detalle del riesgo, vista y cola de validación, soporte de banderas; **nunca ranking** (Emiliano, 2026-10-11) |
| §7 D10 | ordenar la lista. El paso 1 (banda) nunca cambia el orden respecto del paso 2: queda como explicación |
| §8 banderas | vista de seguridad, filtro de extremos |
| §9 unknowns, no evaluables, cola | vista de no evaluables y cola de validación |
| §10 causa común | escenarios agregados |
| §11 dinámica, acciones, transferencia | plan de acción, transferencia, historial |
| §12 observación por factor | historial y detalle del riesgo |
| §14 propiedades | tests de EMI-16, no pantalla |

Marcas sobre campos y reglas:
- **Sin uso en v1:** D9 revisión prioritaria (EV-45); `reputacion_texto` (D13), que necesita una pantalla de detalle nombrada o sale.
- **Detalle y explicación:** `v_aspectos_aplicables`, `i_efectivo_dimensiones`, `reglas_aplicadas`, `justificacion`.
- **Sólo experimento (para la Fase 15, no se borran):** §14.8 (recodificación), P4 y P7; los campos `corrida_id`, `fase`, `version_protocolo`, `informacion_ref`, `caso_empresa`, `anomalias`, `<f>_base`, `<f>_evidencia`, `review_status`, `revisado_por`, `fecha_revision`.

## 19. Puntos abiertos

| Punto | Estado | Fase |
|---|---|---|
| Recurrencia por encima de P = 5 | Hipótesis abierta; cuenta 1 de los 2 de 3 hacia D14, que no está falsada | posterior |
| Casos dudosos hacia D14 | CP-01 R1 (ancla 1 de P) y CP-16 (factores en el borde) no cuentan hasta resolver el ancla y los bordes | posterior |
| D10 a fondo | CP-07: D10 rompe un empate adjudicado como permitido; EV-22 respondida en la Fase 12 | v1.1 (EMI-43) |
| Validez del producto como agregador | Retenido provisionalmente como índice heurístico de tamizaje, no validado como orden final; D14 en 2 de 3 (Emiliano, 2026-10-14). Alternativa si se falsa: tabla de decisión o agregador por escenarios | uso en EMI-16; EMI-44 |
| Reputación | Fuera de v1, sólo texto (D13) | — |
| Procedencia por factor frente a EMI-17 | Se usa en el experimento; no es decisión de v1 | 15 (EMI-16) |
| Propuestas de la Fase 12 | No compensación (EV-24, EV-11, EV-08, EV-10/20, EV-22), referencia económica (EV-02), Legal contextual (EV-06/37), magnitud por encima de I 5, dependencia causal; no bloquean EMI-16 | v1.1 (EMI-43) |
| Validación independiente | Evaluadores nuevos, casos remotos extremos, órdenes profesionales previos | EMI-44 |
