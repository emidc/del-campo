# Metodología de criticidad · especificación ejecutable

> Fecha: 2026-10-05 · Versión: **metodologia v0.1** (aprobada por Emiliano, 2026-10-05 20:46 UTC) · Fase 3 del plan EMI-15 + EMI-41.
> Especificación ejecutable de `decisiones-v0.md` v0.1; se congela al comenzar la Fase 4. Con la aprobación de Emiliano pasa a llamarse metodologia v0.1.
> `decisiones-v0.md` está en v0.1: los cambios de `anexo-cambios-fase-3.md` se aplicaron al aprobarse este documento.

**Historia de este documento.** Un primer borrador v0.1 (20:08 UTC) usaba los defaults de F3-1 a F3-6 como supuestos y 25 reglas propias. Emiliano lo revisó a las 20:35 UTC: aprobó parte, pidió cinco correcciones estructurales (V efectivo, agregación del padre, disparo de seguridad, jerarquía de evidencia de P, fallbacks económicos) y varios ajustes. Esta versión las incorpora. Su dictamen punto por punto está en la sección "Estado de las reglas".

**Abreviaturas.** *decisiones* = `v0/decisiones-v0.md` · *protocolo* = `v0/protocolo.md` · *adjudicación* = `v0/adjudicacion-casos.md` · *respuestas* = `fuentes/respuestas-emiliano.md` · *plan* = `fuentes/plan-emi15-emi41.md` · *revisión* = `revision-adversarial-v0.md` · *dictamen* = revisión de Emiliano del borrador, 2026-10-05 20:35 UTC. RO = resultado operativo anual.

**Marcas.**
- **[E]**: decidido por Emiliano en el dictamen (respuesta a una F3 o a un punto del borrador).
- **[H]**: hipótesis de calibración. Aprobada para experimentar; la Fase 4 en adelante puede corregirla sin que eso sea un cambio de criterio.
- **[PA n]**: redacción de este documento que todavía no aprobó nadie. Se confirma en "Para aprobar".
- **Casos de origen**, al final de cada sección: los casos de propiedad cuya adjudicación motivó una regla de esa sección. La Fase 4 reporta el resultado de esos casos sobre esa regla como **circular**: no cuenta como evidencia a favor.

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
| **Riesgo padre** | Un agrupador de escenarios que producen el mismo evento y la misma consecuencia para la organización por causas distintas. No tiene factores propios. | Sí, en lugar de sus sub-riesgos [E] |
| **Sub-riesgo** | Un escenario completo del padre: una causa con su propia P, I y V. | No [E] |
| **Escenario por causa común** | La materialización simultánea de dos o más riesgos de la misma organización por una misma causa. | No, nunca [E] |

### 1.3 Regla de granularidad (reemplaza el texto vigente de D21)
1. **Mismo evento, misma cadena de consecuencias, mismas P y V → un solo riesgo** con varias dimensiones de I (protocolo §3, ejemplo 3).
2. **Evento distinto o consecuencias distintas → riesgos distintos**, aunque se parezcan (protocolo §3, ejemplos 1 y 2).
3. **Mismo evento y misma consecuencia, pero causas con P o V distintas → un riesgo padre con un sub-riesgo por causa** [E]. Que V cambie según la causa quiere decir que cada causa deja un estado posterior al evento distinto: son escenarios distintos, y cada uno se evalúa completo.
4. Un problema con causas de P o V distintas **no se puede** escribir como un riesgo simple: va como padre. Así la granularidad no queda a elección del evaluador. Si una lista fija (evaluación ciega) lo trae como riesgo simple, se evalúa como está y se registra A7.
5. La prueba entre 2 y 3 es: **¿la consecuencia que sufre la organización es la misma, cualquiera sea la causa?** El evaluador escribe en `justificacion` qué respondió.

### 1.4 Prioridad de un riesgo padre **[PA 3]**
1. Cada sub-riesgo se evalúa con su ficha completa (P, I por dimensión, contención, recuperación). Sus factores nunca se mezclan con los de otro sub-riesgo: no se toma la P de uno y la V de otro (dictamen, punto 2).
2. Los sub-riesgos se ordenan entre sí con D10 (§7). El primero es el **sub-riesgo determinante**.
3. El padre ocupa en el ranking principal la posición que le daría su sub-riesgo determinante, y muestra los factores de ese sub-riesgo con la lista de los demás.
4. Los sub-riesgos no reciben posición propia en el ranking principal; quedan como detalle de análisis y tratamiento.
5. **Hipótesis a validar [H]:** tomar el escenario determinante ignora que varias causas juntas hacen más frecuente el evento. La función de agregación definitiva se valida después; la Fase 4 tiene que probar si el resultado cambia entre escribir un problema como riesgo simple o como padre (§14).
6. Campos: `tipo_objeto` y `riesgo_padre_id` en cada ficha **[PA 13]**.

**Casos de origen:** CP-12 (padre y sub-riesgos fuera del ranking), CP-20 (escenario por causa común como objeto aparte).

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

### 3.2 Jerarquía de evidencia **[PA 5]**
Cada fuente disponible indica un nivel. Las fuentes se ordenan por calidad y relevancia (dictamen):

1. **Dato cuantitativo confiable y comparable**: una frecuencia medida sobre una exposición comparable y suficiente, documentada (estadística sectorial, base actuarial, registro propio con muchos años-equipo). Se traduce a nivel con la columna de porcentajes de §3.3.
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
| **5** | Ocurrió en esta organización al menos una vez por año en los últimos años, o las condiciones que lo producen están presentes y activas. | > 70% | Una línea que se detiene por la misma falla mecánica varias veces por año. |
| **4** | Ocurrió en esta organización en los últimos 3 años, sin ser anual; o es recurrente (varias veces por año) en organizaciones comparables. | 40–70% | Un intento de intrusión hace dos años, en una zona con robos habituales a depósitos. |
| **3** | Ocurrió en esta organización hace más de 3 años, o en organizaciones comparables en los últimos 5 años; o hay precursores observados en esta organización. | 15–40% | Nunca pasó en la empresa, pero una planta parecida de la región lo tuvo hace cuatro años. |
| **2** | Ocurrió en el sector en los últimos 10 años, pero no en esta organización ni en comparables cercanas, y no hay precursores. | 5–15% | Una falla que el sector registra un par de veces en la década, en otras regiones. |
| **1** | No se conocen ocurrencias en el sector salvo casos aislados a nivel global, y no hay precursores. | < 5% | Una falla estructural de un equipo certificado que aparece sólo en informes de accidentes excepcionales. |

"Cercana" = misma región o mercado. Los porcentajes son los de la escala pre-revisión (D4 "Antes") [H].

### 3.4 Ajustes por condiciones actuales [H]
Aprobados como hipótesis experimental (dictamen, PA 7).
1. **−1** si hay controles preventivos verificados que no existían durante el período de los antecedentes que fijaron el nivel, y actúan sobre su causa.
2. **+1** si hay condiciones causales presentes que no estaban durante ese período (degradación observada, control preventivo descubierto fuera de servicio, cambio de exposición).
3. Un nivel como máximo en cada sentido; pueden compensarse; nunca fuera de 1–5.
4. Cada ajuste se escribe en `p_observacion` con su hecho; sin hecho escrito, no se aplica.
5. No se ajusta por controles que ya existían durante los antecedentes, ni cuando la fuente es un dato de jerarquía 1 que ya refleja las condiciones actuales.

**Casos de origen:** CP-06 y CP-07 (las ocurrencias del iniciador cuentan aunque se hayan contenido).

---

## 4. Impacto I

### 4.1 Reglas comunes
1. Cuatro dimensiones, cada una 1–5. Se conservan las cuatro; `I efectivo = max(dimensiones)` se muestra y desempata (D5, D10), pero la criticidad se calcula por dimensión (§6).
2. **No convertibles, comparables nivel a nivel** (D11). La equivalencia de §4.6 es una hipótesis de calibración, no una equivalencia demostrada [H].
3. **Tipos de consecuencia, no capas causales** (revisión I9): todo lo monetario va a Económico. Continuidad y Legal sólo llevan la parte no monetaria. Personas nunca se monetiza.
4. **Escenario que se evalúa.** El que es plausible si el evento iniciador ocurre y ningún control posterior actúa (D19). El peor creíble va a `<f>_max` (D8) [E].
5. **Consecuencia completa** **[PA 11]**: todos los efectos causados por el evento hasta que la organización vuelve a operar con normalidad o la pérdida queda definitiva (cierre, baja del activo, fallecimiento). No incluye eventos posteriores que necesiten una causa nueva e independiente (eso es otro riesgo o un escenario por causa común), ni efectos reputacionales (D13).
6. **Exposición actual**, según el test de la barrera (§2.3).
7. **Bruto de transferencia.** El seguro no reduce ninguna dimensión (D17).

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

**Monto** **[PA 6]**.
1. La pérdida es el efecto sobre el resultado. La pérdida por interrupción es el **margen de contribución** que se deja de ganar más los costos extra, no la facturación perdida.
2. Si sólo se conoce la facturación perdida y se conoce el margen de contribución, se aplica.
3. Si no se conoce el margen de contribución: se registra un rango con `i_econ_min` calculado con el margen operativo (RO / facturación) y `i_econ_max` con la facturación perdida entera. Si los dos extremos caen en el mismo nivel, ese es el valor; si no, `i_econ_valor = unknown` con ese rango, y decide §9.3.

**Magnitud de referencia** **[PA 6]**. En este orden, la primera que exista:
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

"Plausible" = el escenario de §4.1.4 lo produce sin suponer coincidencias adicionales. El evaluador escribe cuántas personas están expuestas y por qué el número de víctimas es plausible.

### 4.4 Continuidad [H]
Consecuencia operativa no monetaria. La pérdida económica de esa interrupción va a Económico (CP-13).

"Función crítica" = actividad sin la cual la organización no entrega su producto o servicio principal. "Interrupción" = pérdida de al menos la mitad de la capacidad de una función crítica. Una degradación menor a la mitad se evalúa un nivel por debajo del que le correspondería a la misma duración como interrupción.

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

**Casos de origen:** CP-11 (ancla económica relativa al RO), CP-13 (la pérdida económica de una interrupción va a Económico y la parte operativa a Continuidad), CP-16 (I-continuidad bruta), CP-02 y CP-15 (umbral de Personas para `safety_critical`).

---

## 5. Vulnerabilidad V

### 5.1 Qué mide
Lo que la organización puede hacer desde el evento iniciador para que la consecuencia bruta de I no se produzca completa (D15). Escala 1–5: **1 = poco vulnerable, 5 = muy vulnerable**. El seguro no es V (D17).

Dos aspectos, evaluados y registrados por separado [E]:
- **Contención**: limita **cuánto daño** se produce: detectar, suprimir, aislar, evacuar, rescatar, frenar la pérdida de dinero o de datos, avisar a afectados. Incluye respuesta.
- **Recuperación**: acorta **cuánto dura** la interrupción y **repone** lo perdido: redundancia, sitio o equipo alternativo, procedimiento manual, acuerdos con terceros, restauración de datos, recupero de fondos o bienes.

Los dos se evalúan contra el escenario bruto de I, uno independiente del otro: la contención, por cuánto del daño bruto evita; la recuperación, por cuánto acorta y repone **si el daño bruto ocurre**.

### 5.2 Evidencia de funcionamiento **[PA 2]**
Una medida está **probada** si hay un ensayo documentado de la medida completa en los últimos 12 meses, o una actuación real registrada en los últimos 3 años con resultado conocido. Si no, está **presente sin prueba**. Una medida que falla parcialmente (equipos que pierden comunicación, cobertura incompleta) se evalúa por lo que efectivamente hace, no por su diseño. La prueba ya no se aplica como "un nivel peor": está dentro de la descripción de cada nivel.

### 5.3 Rúbrica de contención **[PA 2]**
Las rúbricas describen capacidades y resultados; no cuentan cuántos niveles de I baja la consecuencia, porque las escalas son ordinales (dictamen, punto 1).

| Nivel | Contención |
|---|---|
| 1 | Medidas **probadas** que actúan solas o en minutos y dejan el daño en un incidente menor, sin que pase del punto de origen. |
| 2 | Medidas **probadas** que limitan el daño a una parte acotada del daño bruto (un sector, un equipo, un lote, pocas personas). |
| 3 | Medidas que limitan parte del daño pero dejan que una parte importante se produzca; o medidas como las de 1 o 2 **presentes sin prueba**. |
| 4 | Medidas débiles: detección tardía o por terceros, respuesta sin entrenamiento, plan nunca ensayado. El daño se produce casi completo. |
| 5 | Nada contiene: una vez ocurrido el evento, el daño bruto se desarrolla completo. |

### 5.4 Rúbrica de recuperación **[PA 2]**

| Nivel | Recuperación |
|---|---|
| 1 | Alternativa **probada** que restablece las funciones críticas en horas, o repone lo perdido casi por completo. |
| 2 | Alternativa **probada** que restablece la mayor parte de las funciones críticas en días, mucho antes que la reposición normal, o repone la mayor parte de lo perdido. |
| 3 | Alternativa **probada** que cubre sólo una parte de las funciones, de los clientes o de lo perdido; o una alternativa como las de 1 o 2 **presente sin prueba**. |
| 4 | Sólo capacidad improvisada o no escrita, que cubre poco. |
| 5 | Nada acorta ni repone: se espera la reposición normal de lo dañado. |

### 5.5 V por dimensión **[PA 1]**
Un aspecto de V sólo multiplica una dimensión de I si actúa causalmente sobre ella (dictamen, punto 1). Ya no hay un V efectivo único que multiplique cualquier dimensión.

| Dimensión de I | Aspectos de V que actúan sobre ella |
|---|---|
| Personas | Contención |
| Legal/regulatorio | Contención |
| Continuidad | Contención y recuperación |
| Económico | Contención y recuperación |

1. `V_d` = el peor de los aspectos que actúan sobre la dimensión `d`. Para Personas y Legal es la contención; para Continuidad y Económico, el peor de los dos [H].
2. **Recuperación `no_aplica`:** si la consecuencia no tiene nada que restablecer ni reponer (ni interrupción ni pérdida recuperable), recuperación queda `no_aplica` y no entra en ningún `V_d`.
3. La tabla es fija: el evaluador no elige qué aspecto aplica a cada dimensión. Si cree que en un riesgo un aspecto actúa sobre una dimensión que la tabla no le asigna, o al revés, registra A11.
4. `v_aspectos_aplicables` (derivado) guarda, por dimensión, qué aspectos entraron **[PA 13]**.
5. Una acción que declara mejorar V tiene que nombrar el aspecto (revisión I10).

**Casos de origen:** CP-14 (contención y recuperación por separado), CP-16 (falta de continuidad a recuperación), CP-06 y CP-07 (controles pasivos posteriores al evento a V), CP-10 (una medida que falla parcialmente se evalúa por lo que hace).

---

## 6. Criticidad y banda

1. **Por dimensión:** `C_d = P × I_d × V_d`, para cada dimensión de I con valor **[PA 1]**.
2. **Criticidad:** `C_raw = max_d C_d`. La **dimensión determinante** es la que da ese máximo (si empatan, todas); se guarda en `c_dimension_determinante` **[PA 13]**.
3. `C_raw` es un **índice heurístico de prioridad calculado sobre categorías ordenadas** **[PA 12]**. No es una medición cardinal ni actuarial, y tampoco es una escala ordinal bien definida: el producto depende de haber codificado los niveles como 1 a 5, y otra codificación que respete el mismo orden podría cambiar el ranking. Toma 30 valores no equiespaciados. Se trata como una función candidata sometida a falsación (D14, protocolo §9).
4. **Visible:** P, cada dimensión de I, I efectivo, contención, recuperación, dimensión determinante, banda, banderas, techo plausible (aparte). **Interno:** `C_raw` y los `C_d` (D12).
5. **Banda:** Baja, Media, Alta, Crítica (D12). Los umbrales se fijan en la Fase 9; hasta entonces `banda` queda vacía y la Fase 4 juzga sólo orden y visibilidad (protocolo §8).
6. **Techo plausible:** `max_d (P_max × I_d_max × V_d_max)`, usando `<f>_max` donde hay rango y `<f>_valor` donde no. No participa del ranking (D8).
7. **Si la Fase 4 o la 5 falsan el producto**, la alternativa a estudiar no es agregar pesos o exponentes: es una tabla de decisión calibrada o un agregador basado en escenarios (dictamen). Esto orienta la Fase 5; no es una decisión.

**Casos de origen:** ninguno.

---

## 7. Ranking (D10) [E]

### 7.1 Alcance
1. Se ordenan los riesgos evaluables de **una misma organización** que compiten en el ranking principal: riesgos simples y riesgos padre (con su sub-riesgo determinante, §1.4).
2. Quedan **fuera**: sub-riesgos, escenarios por causa común (§10), no evaluables (lista aparte, §9.4), el techo plausible y la incertidumbre (D9).
3. Las banderas no mueven el orden (§8).
4. El orden entre organizaciones distintas: abierto, Fase 6 (EMI-41).

### 7.2 Versión inicial
Cada paso se aplica sólo si el anterior empata.

| Paso | Criterio | Explicación en una frase |
|---|---|---|
| 1 | Banda (más alta primero) | La banda es la lectura visible de la criticidad. Mientras los umbrales sólo corten `C_raw`, este paso no cambia nada respecto del 2; queda para cuando la Fase 9 los fije. |
| 2 | `C_raw` (mayor primero) | La peor combinación de probabilidad, consecuencia y vulnerabilidad pone el riesgo antes. |
| 3 | I efectivo (mayor primero) | Con igual criticidad, va primero el que tiene la consecuencia más grave. |
| 4 | I-personas (mayor primero) | Con igual criticidad y gravedad, va primero el que daña más a las personas. |
| 5 | Empate legítimo | Comparten posición; ninguna regla los distingue. |

- Se quita el desempate por amplitud de I: cuenta dos veces la misma pérdida (CP-13).
- P no es desempate.
- Un empate legítimo se muestra con la misma posición; la UI puede listar los empatados por `risk_id` para estabilidad, sin que eso represente prioridad.
- Los pasos y su orden son hipótesis experimentales (plan, Fase 3 "Ranking").

**Casos de origen:** CP-13 (sale la amplitud), CP-12 (sólo el padre compite).

---

## 8. Banderas

### 8.1 `consecuencia_extrema` (D20, sin cambio de disparo)
- **Disparo:** alguna dimensión de I con `<f>_valor = 5` (respuesta 3).
- **Efecto:** visible y filtrable; no altera la banda ni el ranking.
- Convive con `safety_critical`. Su frecuencia la mide la Fase 4 (contradicción abierta #3).

### 8.2 `safety_critical` (nueva, D23)
- **Disparo:** `i_pers_valor ≥ 4`: al menos una muerte plausible o daño irreversible grave **[PA 4]**. Con las anclas de §4.3 las dos formulaciones del dictamen ("fatalidad plausible o daño irreversible grave" y "I-personas ≥ 4") son la misma regla. El nivel 5 de Personas sigue reservado a muertes múltiples.
- **Qué obliga** [E]:
  1. **Visibilidad:** aparece siempre en una vista de seguridad propia, cualquiera sea su posición o su banda.
  2. **Tratamiento:** tiene que tener registrada en todo momento una acción en curso o una decisión explícita de la dirección sobre su tratamiento (tratar, aceptar con fundamento, transferir lo transferible), con fecha de revisión. Sin ninguna de las dos, alerta visible.
- **Qué no hace:** no fuerza banda, no fija un piso, no mueve el ranking.
- **Cierra la parte de regla de la contradicción abierta #2**: un riesgo remoto puede llegar a la banda más alta por el producto, pero no está obligado; su visibilidad y su tratamiento los garantiza la bandera. Si con los umbrales concretos puede llegar a Crítica lo muestra la Fase 9.
- **Riesgo no evaluable** [E]: las dos banderas aplican si la dimensión tiene valor plausible en el umbral, o si es `unknown` y su `<f>_max` registrado alcanza el umbral.
- Campo nuevo: `safety_critical` (booleano).

**Casos de origen:** CP-02 y CP-15 (bandera de seguridad separada del score, sin forzar banda).

---

## 9. Unknowns y no evaluables (D8, D9)

### 9.1 Valor plausible, rango y techo
1. Si hay un valor defendible más plausible, entra en la criticidad (`<f>_valor`). Es la mejor estimación profesional con la información disponible, no el peor valor que no se puede descartar ni el mejor.
2. Si el evaluador duda entre niveles, registra el rango. El rango no mueve la criticidad; `<f>_max` sólo alimenta el techo (§6.6).
3. La incertidumbre no baja ni sube la criticidad (D9). Va en `uncertainty` con nota de qué falta conocer.

### 9.2 Cuándo un factor es `unknown` **[PA 8]**
Hay valor defendible cuando la evidencia disponible permite fijar el nivel, o acotarlo a un rango de como máximo tres niveles contiguos (`<f>_max − <f>_min ≤ 2`) con un valor más plausible dentro. Conocer un solo dato suelto no alcanza si no discrimina el nivel (dictamen). Si la evidencia no acota el factor a ese rango, el factor es `unknown`: no se inventa un valor. `<f>_observacion` dice qué falta y `necesidad_validacion` qué hay que averiguar.

### 9.3 Criticidad con partes `unknown` **[PA 8]**
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

### 9.5 Cola de validación **[PA 9]**
Una prioridad independiente del ranking: **qué información conviene obtener primero** (dictamen). No es criticidad y no se mezcla con el ranking principal.
- **Entran:** los riesgos no evaluables y los evaluables con algún factor `unknown` o con `uncertainty = high`.
- **Orden:**
  1. Primero los que podrían ser `safety_critical`: `i_pers_valor ≥ 4`, o `i_pers` `unknown` sin `<f>_max` o con `<f>_max ≥ 4`.
  2. Después, por **cota de validación**: `max_d (P × I_d × V_d)` poniendo `<f>_max` donde hay rango y 5 donde hay `unknown` sin rango (mayor primero).
  3. Después, por `i_pers` máximo posible (mayor primero).
- Se calcula; no hay campo nuevo en la ficha.

**Casos de origen:** CP-08 (la incertidumbre no baja ni sube la criticidad; la mejor estimación, no el peor no descartable; qué tiene que quedar visible de lo que no se sabe).

---

## 10. Escenario por causa común [E]

### 10.1 Qué es
Un registro aparte que representa la materialización simultánea de dos o más riesgos de la misma organización por una misma causa. No es un riesgo más: es una vista de acumulación de exposición. D13 sigue excluyendo la correlación del score de cada riesgo; este escenario es el único lugar donde se ve.

### 10.2 Cuándo se crea **[PA 7]**
Cuando una misma causa **puede materializar de forma plausible y material** dos o más riesgos de la organización a la vez (dictamen). No hace falta que pase en la mayoría de los casos: qué tan remoto es lo dice su P.
- **Plausible:** una sola ocurrencia de la causa puede producir los eventos iniciadores de los miembros sin suponer coincidencias independientes.
- **Material:** la consecuencia conjunta alcanza, en alguna dimensión de I, un nivel más alto que cualquiera de los miembros por separado.
- El evaluador escribe en la observación del escenario los dos hechos. Si no puede sostener alguno, no crea el escenario y registra A7.

### 10.3 Cómo se evalúa
1. Ficha propia con `tipo_objeto = escenario` y `miembros` (los `risk_id`) **[PA 13]**.
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

### 11.3 Transferencia (D17) **[PA 10]**
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

## 14. Propiedades que la Fase 4 tiene que intentar romper

El dictamen pide usar los casos como test adversarial de propiedades, no sólo como verificación de órdenes. La Fase 4 registra cualquier contraejemplo como anomalía; no corrige nada. Son también los invariantes que EMI-16 tendría que convertir en tests automáticos.

1. **Monotonía (P1):** subir P, una dimensión de I o un aspecto de V, con lo demás igual, nunca baja `C_raw` ni la posición.
2. **Invariancia de granularidad:** escribir el mismo problema como riesgo simple o como padre con sub-riesgos no cambia su lugar en el ranking principal (revisión I8). Con el roll-up de §1.4 no está garantizada: es la propiedad que más hay que buscar romper.
3. **Causalidad de V:** un aspecto de V nunca cambia el `C_d` de una dimensión sobre la que no actúa (§5.5).
4. **Unknown:** un `unknown` nunca produce un `C_raw` bajo ni cero; o el riesgo es evaluable porque lo desconocido no puede cambiar el resultado, o va a la lista no evaluable.
5. **Separación:** un sub-riesgo nunca entra al ranking principal; un escenario por causa común nunca modifica los factores de sus miembros.
6. **Historial:** un cambio de versión nunca sobrescribe una ficha anterior.
7. **El producto:** buscar activamente pares donde `P × I × V` dé un orden profesionalmente incorrecto, y pares donde recodificar los niveles (manteniendo el orden) cambie el ranking.

### Insumos para EMI-16 (no son decisiones de esta fase)
Del dictamen, para el modelo de dominio de Risk OS: separar `Risk` (identidad estable), `Assessment` (evaluación inmutable bajo una versión de metodología, con `previous_assessment_id`, `reason`, `accepted_at`), `FactorAssessment` (`known` | `unknown` | `not_applicable`, valor o rango, observación, evidencia, incertidumbre), `Action`, `ActionEffect`, `Transfer` y `Scenario`. `I efectivo`, `V_d`, `C_raw`, banda, banderas y ranking salen de funciones puras versionadas, no son datos editables; se puede guardar el resultado calculado para auditoría, siempre reproducible.

---

## 15. Puntos abiertos

| Punto | Estado | Fase |
|---|---|---|
| Procedencia por factor frente a EMI-17 | Se usa en el experimento; no es decisión de v1 | 15 (EMI-16) |
| Frecuencia de `consecuencia_extrema` (contradicción #3) | Se mide; I bruto con cuatro dimensiones puede dar muchos 5 | 4, y 7–8 |
| Umbrales de banda | Sin fijar | 9 |
| Si un riesgo remoto **puede** llegar a Crítica con los umbrales concretos | La regla está (§8.2); falta el número | 9 |
| Orden de riesgos de organizaciones distintas | Sin regla | 6 (EMI-41) |
| Función de agregación del padre | v0 usa el sub-riesgo determinante; ignora la acumulación de frecuencia entre causas | 4–5 |
| Validez del producto como agregador | Hipótesis bajo falsación; alternativa si falla: tabla de decisión o agregador por escenarios | 4–5 |
| Reputación | Fuera de v0, sólo texto (D13) | — |

### Reglas faltantes que detectó la Fase 2

| Falta | Dónde se resuelve |
|---|---|
| Cómo se fija V ante un perfil mixto | §5.5 (V por dimensión) |
| Cómo se elige el evento y dónde cae el corte P/V | §2 |
| Si la criticidad puede bajar sin acción por un cambio de contexto | §11.1 |
| Riesgos con causa común | §10 |
| Anclas de P, I y V | §3, §4, §5 |
| Cómo se ordenan riesgos de empresas distintas en una misma lista | Abierto, Fase 6 |

---

## Estado de las reglas

Dictamen de Emiliano del 2026-10-05 20:35 UTC sobre el borrador, y dónde quedó cada punto en esta versión.

| Punto del borrador | Dictamen | En esta versión |
|---|---|---|
| F3-1 `safety_critical` | Modificar: incluir una muerte plausible | §8.2, disparo `I_personas ≥ 4` → PA 4 |
| F3-2 Padre | Sí al modelo; no al roll-up | §1.3–1.4 → PA 3 |
| F3-3 V = peor de los dos | No como regla universal | §5.5 V por dimensión → PA 1 |
| F3-4 Ranking sin amplitud | Sí | §7 [E] |
| F3-5 Escenario por causa común | Sí, sin "mayoría de los casos" | §10 [E]; criterio → PA 7 |
| F3-6 Evento iniciador | Sí | §2 [E] |
| PA 1 I sin horizonte | Sí, definiendo el límite de la consecuencia completa | §1.1 [E]; límite → PA 11 |
| PA 2 Roll-up del padre | No | Reemplazado → PA 3 |
| PA 3, 4, 5, 8 | Sí | §2.3, §2.4, §3.1, §4.1.4 [E] |
| PA 6 Anclas de P | Modificar jerarquía de evidencia | §3.2 → PA 5 |
| PA 7 Ajustes ±1 | Sí como hipótesis | §3.4 [H] |
| PA 9 Cortes económicos | Sí para calibrar | §4.2 [H] |
| PA 10 Facturación perdida | No | §4.2 → PA 6 |
| PA 11 Fallback 5% facturación | No | §4.2 → PA 6 |
| PA 12 Anclas de Personas | Modificar semántica de seguridad | §4.3 nivel 4 incluye daño irreversible grave → PA 4 |
| PA 13, 14 Continuidad y Legal | Sí para experimentar | §4.4, §4.5 [H] |
| PA 15 Equivalencia | Hipótesis, no equivalencia demostrada | §4.6 [H] |
| PA 16 "Probada" | Modificar | §5.2 → PA 2 |
| PA 17 Rúbricas de V | Modificar sustancialmente | §5.3–5.5 → PA 1, PA 2 |
| PA 18 Tratamiento obligatorio | Sí, con nuevo disparo | §8.2 [E] |
| PA 19 Banderas en no evaluables | Sí | §8.2 [E] |
| PA 20 Valor defendible | Modificar | §9.2–9.3 → PA 8 |
| PA 21 Campos nuevos | Sí, sujeto al nuevo V | → PA 13 |
| PA 22 Creación del escenario | Modificar criterio | §10.2 → PA 7 |
| PA 23, 24 `motivo` y `cumplida` | Sí | §11 [E] |
| PA 25 Póliza como `cambio_contexto` | Parcial: historial propio en `risk-transfer` | §11.3 → PA 10 |
| Lenguaje "índice ordinal" | Cambiar a índice heurístico | §6.3 → PA 12 |
| `validation_priority` | Propuesta del dictamen | §9.5 → PA 9 |
| Punto 32 | No todavía | → PA 14 |

---

## Para aprobar

**Aprobado por Emiliano el 2026-10-05 20:46 UTC: sí a los 14 puntos.** Las marcas [PA n] del texto quedan como decisiones aprobadas.

Sólo lo que cambió desde el borrador. Cada punto se responde con sí o no.

1. **V por dimensión.** Contención actúa sobre Personas y Legal; contención y recuperación sobre Continuidad y Económico; `V_d` = el peor de los aspectos que actúan sobre la dimensión; `C_d = P × I_d × V_d` y `C_raw = max_d C_d`, con la dimensión determinante visible (§5.5, §6). Cambia la fórmula de D14 de `P × I efectivo × V` a `max_d (P × I_d × V_d)`. ¿Sí?
2. **Rúbricas de V sin contar niveles de I**, con "probada" dentro de cada descripción en lugar de "un nivel peor" (§5.2–5.4). ¿Sí?
3. **Padre como agrupador.** Cada sub-riesgo es un escenario completo; un problema con causas de P o V distintas va siempre como padre; el padre toma la posición de su sub-riesgo determinante (el primero por D10), como hipótesis a validar en la Fase 4 (§1.3, §1.4). ¿Sí?
4. **`safety_critical` con `I_personas ≥ 4`**, y el nivel 4 de Personas = una muerte plausible o daño irreversible grave (§4.3, §8.2). ¿Sí?
5. **Jerarquía de evidencia de P:** dato cuantitativo confiable y comparable > historia propia representativa (5 años o evento recurrente) > comparables > sector > juicio experto; si dos fuentes fuertes divergen, rango y `uncertainty` al menos `medium` (§3.2). ¿Sí?
6. **Económico:** pérdida por interrupción = margen de contribución; sin margen conocido, rango entre margen operativo y facturación perdida, y `unknown` si los extremos caen en niveles distintos; magnitud de referencia: RO normalizado → promedio normalizado de ejercicios positivos → otra medida documentada con A6 → `unknown` (§4.2). ¿Sí?
7. **Criterio del escenario por causa común:** plausible (una sola ocurrencia de la causa puede producir los eventos) y material (la consecuencia conjunta supera en alguna dimensión a cada miembro solo) (§10.2). ¿Sí?
8. **Valor defendible y partes `unknown`:** defendible si la evidencia fija el nivel o un rango de como máximo tres niveles contiguos; un riesgo con partes `unknown` es evaluable sólo si la cota de lo desconocido no supera el `C_raw` de lo conocido (§9.2, §9.3). ¿Sí?
9. **Cola de validación:** posible `safety_critical` primero, después la cota de validación, después I-personas máximo posible; separada del ranking (§9.5). ¿Sí?
10. **Póliza:** historial propio en `risk-transfer`, enlazado desde el riesgo, sin ficha de reevaluación ni `motivo` (§11.3). ¿Sí?
11. **Límite de la consecuencia completa:** hasta que se vuelve a operar con normalidad o la pérdida queda definitiva; sin eventos que necesiten una causa nueva e independiente, ni reputación (§4.1.5). ¿Sí?
12. **Lenguaje:** "índice heurístico de prioridad calculado sobre categorías ordenadas", con la advertencia de que depende de la codificación 1–5; reemplaza "índice ordinal" en D14 (§6.3). ¿Sí?
13. **Campos nuevos de la ficha:** `v_cont_*` y `v_rec_*` (seis campos cada uno), `v_aspectos_aplicables` y `c_dimension_determinante` (derivados), `safety_critical`, `tipo_objeto` (`riesgo` | `padre` | `sub_riesgo` | `escenario`), `riesgo_padre_id` y `miembros`; `v_valor` y `v_aspecto_dominante` salen. Requiere `protocolo v0.1` antes de la Fase 4. ¿Sí?
14. **Aplicar el anexo:** los cambios a `decisiones-v0.md` y las filas de changelog de `anexo-cambios-fase-3.md`, subiendo `decisiones-v0.md` a v0.1, y registrar tus respuestas a F3-1 a F3-6 en `respuestas-emiliano.md`. ¿Sí?
