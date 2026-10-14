# Guía de factores · v1 candidate · piloto S06

Extracto de las rúbricas congeladas §§3–5. Se excluyen referencias a resultados de casos anteriores y ejemplos finales de combinación. No modifica la metodología ni contiene valores de referencia de S06. Usar información del caso al 2026-09-30 y RO 2025 USD 118.000. Las hipótesis de escenario se escriben como tales; no sustituir dato faltante por certeza.

Para cada riesgo entregar P, cuatro impactos, contención y recuperación con valor, rango si aplica y evidencia. Si no hay nivel plausible defendible, indicar unknown y explicar qué falta. Recuperación puede ser no_aplica sólo cuando no hay nada que restablecer/reponer. No inventar mínimos/máximos donde no se sostengan.

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

