# Log de adjudicación · Fase 5

> Fase 5 del plan EMI-15 + EMI-41 · desde 2026-10-06 · agente: sesión del thread "Fase 5 adjudicación de FAIL".
> Un bloque por grupo, en el orden del dictamen de Emiliano (`v0/dry-run/reporte-dry-run.md`, "Dictamen de Emiliano"). Cada bloque: problema, causa, opciones, recomendación, **decisión de Emiliano con fecha y hora**, regla resultante y casos de origen nuevos. Lo que no tiene decisión todavía dice **PENDIENTE**.
> La metodología candidata está en `metodologia-v0.2-candidata.md`. `metodologia-v0.md`, `protocolo.md`, `decisiones-v0.md` y el changelog no se tocan hasta la aprobación final.
> Esta fase no lee nada de EMI-41 salvo el texto ya aprobado de CH-075 y CH-077 (copiado del changelog).

---

## Grupo 1 · §4.2.3 ↔ §9.2 (margen de contribución desconocido)

**Anomalías:** AN-0001 (A12), AN-0002 (A8). **Casos:** 11 de las 12 contradicciones (CP-01, 02, 03, 05, 06, 07, 08, 13, 14, 16, 20).

**Problema.** §4.2.3 manda `i_econ = unknown` cuando no se conoce el margen de contribución y los extremos "margen operativo" y "facturación perdida entera" caen en niveles distintos. §9.2 dice que un factor acotado a un rango de hasta tres niveles con un valor más plausible tiene valor defendible. Ningún caso trae el margen de contribución, así que con la lectura literal 8 de 45 riesgos salen del ranking (CP-02 queda sin ranking).

**Causa.** §4.2.3 trata un dato auxiliar desconocido (el margen) como si el factor entero lo fuera. El margen sólo mueve el monto dentro de un rango que casi siempre es de dos o tres niveles.

**Opciones.**
- **A (recomendada, es la de Emiliano).** Gana §9.2. Sin margen de contribución, el evaluador registra el rango (mínimo con el margen operativo, máximo con la facturación perdida) y elige el valor más plausible dentro, escribiendo en `i_econ_observacion` el margen de contribución que supone y por qué (tipo de actividad, estructura de costos que la narrativa deja ver). `i_econ_base = assumed` o `inferred`; `uncertainty` al menos `medium` si el rango cruza niveles. `unknown` queda sólo si no hay magnitud de referencia (§4.2, punto 4) o si ni siquiera se puede acotar el monto a tres niveles.
- B. Convención fija: el valor es el extremo calculado con el margen operativo. Reproducible, pero sesgado hacia abajo, porque el margen de contribución siempre es mayor que el operativo.
- C. Convención fija: un margen de contribución supuesto por defecto (por ejemplo, el doble del operativo). Reproducible, pero es un número inventado que la metodología impondría a todas las actividades.

**Recomendación: A.** La generalizo en §9.2 para que no quede atada al margen: *un dato auxiliar desconocido no vuelve `unknown` un factor si la evidencia lo acota a tres niveles con un valor plausible*. La reproducibilidad del valor elegido se mide en la Fase 8; para que una divergencia sea visible, el supuesto de margen queda escrito.

**Efecto esperado (del reporte de la Fase 4, a confirmar en la regresión).** Los 8 riesgos vuelven al ranking. CP-14 pasaría; CP-02, 05, 06, 08 y 13 tendrían el orden adjudicado y quedarían pendientes de sus anomalías de definición; CP-01, 03, 07, 16 y 20 seguirían fallando por otras reglas (grupos 2, 4 y 6).

**Lo que no arregla.** La regla de la cota de §9.3 sigue existiendo para los `unknown` verdaderos, y con ella dos contraejemplos de la Fase 4: un techo peor puede sacar a un riesgo del ranking (AN-0021, monotonía de la posición) y una recuperación `unknown` puede sacar del ranking un riesgo determinado por personas (AN-0023). Con la opción A casi no quedan `unknown` en los casos, así que no los toco en este grupo; los listo para el grupo 5 (regresión) y, si no aparecen, como fuera de alcance.

**Regla resultante (texto propuesto).**
- §4.2, Monto, punto 3: *"Si no se conoce el margen de contribución, se registra el rango: `i_econ_min` con el margen operativo (RO / facturación) e `i_econ_max` con la facturación perdida entera. `i_econ_valor` es el nivel más plausible dentro de ese rango (§9.1), y `i_econ_observacion` dice qué margen de contribución se supuso y por qué. Si el rango cruza niveles, `uncertainty` es al menos `medium`. Sólo es `unknown` si no se puede acotar a tres niveles (§9.2)."*
- §9.2, frase nueva al final: *"Un dato auxiliar desconocido (el margen de contribución, la duración exacta, el número exacto de personas) no vuelve `unknown` el factor si la evidencia lo acota así; el supuesto se escribe en la observación."*

**Casos de origen nuevos:** ninguno (la regla sale de una contradicción interna, no de la adjudicación de un caso).

**Decisión de Emiliano (2026-10-06 11:04 UTC): SÍ, con una precisión.** Gana §9.2 y se generaliza a cualquier dato auxiliar. Pero `unknown` no queda sólo para el rango de más de tres niveles: queda para cuando **no se puede elegir un valor más plausible defendible**. El tamaño del rango es condición necesaria para estimar, no fabrica el "más plausible".
- rango ≤ 3 niveles + valor más plausible defendible → evaluable;
- rango ≤ 3 niveles sin base para preferir un nivel → `unknown`;
- rango > 3 niveles o sin rango defendible → `unknown`.
Para el margen de contribución: rango entre margen operativo y facturación perdida, supuesto explícito, `base = assumed | inferred`, `uncertainty ≥ medium` si cruza niveles.

**Regla resultante (aplicada en la candidata, §4.2 punto 3 y §9.2):** *"Un dato auxiliar desconocido no vuelve `unknown` al factor si la evidencia permite acotarlo a un rango de como máximo tres niveles contiguos **y elegir dentro de él un valor más plausible defendible**. El supuesto y su fundamento quedan escritos en la observación. Si el rango cumple pero no hay base para preferir un nivel, el factor es `unknown`."*

---

## Grupo 2 · Cómo contención y recuperación producen V

**Anomalías:** AN-0003, AN-0019 (A8); también AN-0004 (A11, grupo electrógeno: ¿contención o recuperación?). **Casos:** CP-01 (R2 y R3 sobre R1), CP-03, CP-04 después, CP-10, CP-19 mayo y julio.

**Problema.** Hoy `V_d` de Económico y Continuidad es el peor de contención y recuperación (§5.5). Una contención probada que evita casi todo el daño no baja nada si la recuperación es débil, y una recuperación probada no baja nada si la contención es débil. Cuatro mejoras reales no mueven `C_raw`.

**Por qué pasa.** La recuperación se puntúa "si el daño bruto ocurre", sin mirar que una buena contención hace que casi nunca ocurra. Con "el peor de los dos", el aspecto bueno nunca cuenta.

**Antes de proponer una regla** (dictamen, punto 2): cinco perfiles para que digas qué esperás. Son la misma empresa y el mismo evento; sólo cambia lo que puede hacer después.

> **La situación.** Fábrica de pinturas, una sola planta, 15 personas trabajando cerca del depósito de solventes. Evento: ignición en el depósito. Si nada actúa: el fuego destruye el depósito y la nave contigua, puede haber heridos graves, la pérdida se lleva buena parte del resultado del año, la línea principal queda parada unos cuatro meses y el municipio clausura la planta temporariamente.
>
> - **Perfil 1 · Contiene muy bien, se recupera muy mal.** Espuma automática probada todos los meses; dos igniciones en los últimos años se apagaron en segundos sin pasar del depósito. Pero si algún día el depósito y la nave se pierden, no hay otra planta, ni acuerdo con terceros, ni equipos de reemplazo: se espera la reconstrucción.
> - **Perfil 2 · No contiene nada, se recupera muy bien.** No hay detección ni supresión: si hay ignición, el fuego se desarrolla completo. Pero hay una segunda planta propia, probada el año pasado, que toma toda la producción en 48 horas, con stock de producto terminado en otro sitio.
> - **Perfil 3 · Las dos cosas a medias.** Hay detectores y una brigada, pero nunca se ensayó. Hay un acuerdo firmado con un fasonista que podría producir la mitad de los pedidos, sin probar.
> - **Perfil 4 · Las dos cosas muy bien.** La espuma del perfil 1 y la segunda planta del perfil 2.
> - **Perfil 5 · Las dos cosas mal.** Matafuegos y nada más; ninguna alternativa para producir.

**Preguntas** (alcanza con respuestas cortas):
1. **Por perfil y por dimensión.** En cada perfil, para personas, plata (económico), operación (continuidad) y legal: ¿la empresa queda *casi tan expuesta como sin nada*, *a mitad de camino* o *casi protegida*?
2. **Orden.** Ordená los cinco de más a menos crítico. ¿El 1 y el 2 pueden empatar?
3. **Mejora en un solo aspecto.** Partiendo del perfil 5: si la empresa sólo instala y prueba la espuma (pasa al 1), ¿tiene que bajar la criticidad? ¿Y si sólo consigue la segunda planta (pasa al 2)? Partiendo del perfil 1: si consigue el acuerdo a medias del perfil 3 para recuperarse, ¿tiene que bajar algo?
4. **La pregunta de fondo.** En el perfil 1, ¿la recuperación pésima pesa poco porque casi nunca se va a necesitar, o pesa igual porque el día que falle la espuma la empresa no tiene salida?

Con tus respuestas diseño la regla mínima que las reproduzca y verifico P1 (monotonía) y P11 (sensible a la mejora). Si ninguna regla simple las reproduce, lo digo.

### Respuestas de Emiliano (2026-10-06 11:04 UTC)

| Perfil | Personas | Económico | Continuidad | Legal |
|---|---|---|---|---|
| PV-1 contención excelente / recuperación pésima | casi protegida | casi protegida | casi protegida | casi protegida |
| PV-2 sin contención / recuperación excelente | casi igual de expuesta | a mitad de camino | casi protegida | casi igual de expuesta |
| PV-3 ambas parciales sin probar | a mitad | a mitad | a mitad | a mitad |
| PV-4 ambas excelentes | casi protegida | casi protegida | casi protegida | casi protegida |
| PV-5 ambas malas | casi igual de expuesta | casi igual de expuesta | casi igual de expuesta | casi igual de expuesta |

- **Orden:** PV-5 > PV-2 > PV-3 > PV-1 > PV-4. PV-1 ≠ PV-2 en este escenario (la contención actúa antes de que se produzcan casi todas las consecuencias graves; la recuperación de PV-2 no deshace heridos ni la consecuencia legal). PV-4 es más robusta que PV-1 (defensa en profundidad), pero esa diferencia no puede volver "muy vulnerable" a PV-1.
- **Mejora de un solo aspecto:** *"Toda mejora causal real debe mejorar la vulnerabilidad de las dimensiones sobre las que actúa. No necesariamente tiene que bajar `C_raw` global."* PV-5 → PV-1: baja claramente. PV-5 → PV-2: bajan `V_continuidad` y parte de `V_económico`; `C_raw` puede no bajar si personas o legal siguen determinando. PV-1 + recuperación parcial: puede quedar en el mismo nivel, pero tiene que verse.
- **Recuperación en PV-1:** *pesa menos, no igual*: importa condicionada a que la contención falle. La cola catastrófica la conserva `consecuencia_extrema`, no V.
- **Instrucción:** regla secuencial/condicional; ni media ni `max(contención, recuperación)`.

### Regla (aprobada 2026-10-06 11:09 UTC)

**Secuencial: la recuperación actúa sólo sobre lo que la contención deja pasar.** Para cada dimensión, `V_d = min(contención, recuperación_d)`, donde `recuperación_d` es lo que la recuperación puede hacer sobre esa dimensión:

| Dimensión | `recuperación_d` | `V_d` | Por qué |
|---|---|---|---|
| Personas | no actúa | contención | La recuperación no deshace heridos (PV-2). |
| Legal | no actúa | contención | Ídem (PV-2). |
| Continuidad | recuperación | `min(c, r)` | Basta una de las dos barreras: PV-1 y PV-2 quedan casi protegidas. |
| Económico | `⌈(c + r) / 2⌉` | `min(c, ⌈(c + r) / 2⌉)` | La recuperación repone la parte de la pérdida que viene de la interrupción, no el daño físico: PV-2 queda a mitad de camino. [H] |

`recuperación = no_aplica` → `V_d = contención` en todas.

**Desempate nuevo (paso de D10, va al grupo 6):** con igual `C_raw`, I efectivo e I-personas, primero el de **peor preparación**: mayor `max(c, r)` y, si empatan, mayor `min(c, r)`. Es ordinal (no suma niveles) y no cuenta dos veces una pérdida.

**Precisión de AN-0004 (qué es contención y qué recuperación).** Una medida que hace que la función no llegue a detenerse o que el bien no llegue a perderse (grupo electrógeno con transferencia automática, UPS, redundancia en caliente) es **contención**, aunque sea redundancia. Recuperación es lo que actúa después de que la función se detuvo o el bien se perdió. Con `min` el aspecto no cambia `V_continuidad`, pero sí `V_económico`, así que hace falta la regla.

**Contra los perfiles** (P 3; I = 4 en las cuatro dimensiones):

| Perfil | c / r | V pers, legal, cont, econ | `C_raw` | Posición |
|---|---|---|---|---|
| PV-5 | 5 / 5 | 5, 5, 5, 5 | 60 | 1 (desempate: preparación 5/5) |
| PV-2 | 5 / 1 | 5, 5, 1, 3 | 60 | 2 (preparación 5/1) |
| PV-3 | 3 / 3 | 3, 3, 3, 3 | 36 | 3 |
| PV-1 | 1 / 5 | 1, 1, 1, 1 | 12 | 4 (preparación 5/1) |
| PV-4 | 1 / 1 | 1, 1, 1, 1 | 12 | 5 (preparación 1/1) |

Reproduce la tabla por dimensión y el orden PV-5 > PV-2 > PV-3 > PV-1 > PV-4.

**P1 (monotonía).** `min` y `⌈(c + r)/2⌉` no bajan cuando sube c o r, así que ningún `V_d` ni `C_d` baja al empeorar un aspecto. Se cumple por construcción.

**P11 (sensible a la mejora).** Mejorar la contención baja `V_personas` y `V_legal` siempre, un nivel por nivel. Mejorar la recuperación baja `V_continuidad` (y `V_económico` en su mitad) mientras quede por debajo de la contención; si la contención ya es mejor, no mueve `V_d` y sólo mueve el desempate de preparación (PV-1 + recuperación parcial). Es lo que pidió Emiliano en 2c y 2d; P11 queda redactada como "toda mejora baja `V_d` de alguna dimensión sobre la que actúa, salvo que la otra barrera ya la deje mejor; y siempre mejora la preparación".

**Efecto en los casos, sólo cambiando la combinación** (factores de F4-DR-01, `i_econ` con el valor plausible de §9.2; la regresión completa va en el grupo 5):

| Caso | Antes (v0.1) | Con la regla | ¿Lo adjudicado? |
|---|---|---|---|
| CP-01 | R3 75 > R2 60 > R5 30 > R1 25 > R4 20 | R5 30 > R1 = R2 = R4 20 > R3 15 | R2 y R3 bajan; R5 sigue sobre R1 (G2) |
| CP-03 | R1 100 > R2 60 | R2 48 > R1 25 | Sí |
| CP-04 | antes R2 60 > R1 50; después igual | antes R1 50 > R2 36; después R2 36 > R1 30 | Sí, los dos momentos |
| CP-10 | 60 → 60 | 48 → 36 | Sí, baja |
| CP-19 | 50 → 75 → 75 → 75 | 30 → 45 → 60 → 45 | Sí: sube, sube, baja |
| CP-07 | R1 48 > R2 36 | R1 36 = R2 36 | Empate permitido |
| CP-20 | R1 = R2 = R3 45 | R1 = R2 45 > R3 36 | Sí |
| **CP-14** | R1 75 > R2 (no evaluable) | **R2 36 > R1 15** | **No**: lo adjudicado es R1 ≥ R2 |

**Conflicto que tiene que decidir Emiliano.** CP-14 R1 (incendio de la freidora: supresión automática que lo apaga en segundos, reposición de nueve meses) es el mismo perfil que PV-1. En CP-14 adjudicaste "R1 probablemente arriba por nueve meses de reposición"; en PV-1 dijiste "casi protegida en las cuatro dimensiones". Las dos respuestas no pueden pasar con la misma regla. Opciones:
- **A (recomendada).** Prevalece PV-1, que es la respuesta más reciente y más explícita sobre esta pregunta exacta. CP-14 se marca como caso cuya adjudicación revisaste (no cuenta como FAIL contra D14) y queda visible que R1 tiene recuperación 5 y `consecuencia_extrema`.
- B. Prevalece CP-14: haría falta que la recuperación pésima pese más que en la regla secuencial, que es lo que descartaste en 2d.

**Decisión de Emiliano sobre CP-14 (2026-10-06 11:08 UTC): A, prevalece PV-1.** CP-14 queda como adjudicación revisada: no cuenta como FAIL contra D14; R1 sigue visible con recuperación 5 y `consecuencia_extrema`.

**Casos de origen nuevos:** PV-1 a PV-5 para §5.5 y el desempate de preparación; CP-14 pasa a ser caso de origen de §5.5 (su resultado sobre esa regla es circular).

**Decisión de Emiliano sobre la regla y el desempate (2026-10-06 11:09 UTC): SÍ.** Aplicada en la candidata (§5.1, §5.5, §7.2 paso 5, §14 propiedad 7).

---

## Grupo 3 · Padre y granularidad

**Anomalías:** AN-0009 (A12), AN-0022 (A7), AN-0015 (A4), AN-0024 (A2); también AN-0007 y AN-0008 (A7). **Caso:** CP-12.

**Decisión ya tomada por Emiliano** (dictamen, 2026-10-06 10:38 UTC): se abandona la invariancia padre/simple; el padre es un agrupador que puede mostrarse en la posición de su hijo prioritario, sin que su score represente la unión de los escenarios. Este grupo sólo redacta §1.3, §1.4 y la propiedad 2 de §14 en ese sentido.

Para redactarlo hacen falta tres precisiones que la decisión no cubre. Propongo defaults; respondé sí o no a cada uno:
- **3a · Qué agrupa un padre (AN-0009).** Con el evento iniciador de §2.1, "mismo evento con causas distintas" casi no existe: un corte eléctrico y una falla de climatización son eventos iniciadores distintos. **Default:** el padre agrupa escenarios con **la misma consecuencia para la organización**, aunque sus eventos iniciadores sean distintos; §1.3.2 queda sólo para consecuencias distintas.
- **3b · Hijos empatados (AN-0015).** **Default:** si dos hijos empatan en el primer lugar por D10, el padre muestra los factores de todos los empatados (la posición es la misma).
- **3c · Hijo prioritario no evaluable (AN-0024).** **Default:** el padre toma la posición del primer hijo evaluable y queda marcado "tiene un hijo no evaluable"; el hijo no evaluable entra a la lista "no evaluable" con sus banderas, enlazado al padre.

**Decisión de Emiliano sobre 3a–3c (2026-10-06 11:04 UTC):**
- **3a: Sí**, siempre que sea la misma consecuencia o problema concreto ("indisponibilidad de la línea de embotellado"), no la misma dimensión de impacto ("pérdida económica", "interrupción").
- **3b: Sí.** Se muestran todos los hijos determinantes empatados; el padre comparte su posición.
- **3c: No, como estaba redactado.** Por P2 (`unknown` ≠ bajo), si hay un hijo no evaluable no se sabe que el primer evaluable sea el determinante. Texto de Emiliano: *"Si existe al menos un hijo no evaluable, el padre puede mostrar como referencia la posición de su hijo evaluable mejor posicionado, pero queda marcado `prioridad_provisional` / `tiene_hijo_no_evaluable`. El hijo no evaluable entra además en la lista de validación con sus propias banderas. Hasta resolverlo, el padre no afirma que el hijo evaluable sea el determinante definitivo."* Si todos los hijos son no evaluables, el padre queda sin posición evaluable.

**Regla resultante:** candidata §1.2, §1.3, §1.4, §14 propiedad 2 y §15. Campo derivado nuevo `prioridad_provisional` (va a `cambios-protocolo-v0.2.md`).

**Casos de origen nuevos:** ninguno de los 20 (CP-12 ya era origen de §1.4).

---

## Grupo 4 · Anclas ambiguas o solapadas

> Preparado mientras se espera el grupo 2; se presenta a Emiliano después. Criterio del dictamen: sólo cuentan las anomalías donde dos lecturas literales de v0.1 dan niveles distintos (A2, A6, A11), y las A1 contra el anexo sólo si revelan una ancla ambigua de v0.1.

**Qué queda en este grupo y qué no.**

| Anomalía | ¿Ancla ambigua de v0.1? | Dónde se trata |
|---|---|---|
| AN-0010 (P: "condiciones presentes y activas" 5, "precursores" 3, ajuste +1) | **Sí** | 4A |
| AN-0094, AN-0096 (CP-11: condición que existió siempre, ¿+1 o no?) | **Sí**, misma raíz que AN-0010 | 4A |
| AN-0103, AN-0118 (bordes de P: "dos en dos años", "hace tres años") | **Sí**, bordes sin regla | 4A |
| AN-0005 (recuperación parcial presente sin prueba: ¿3 o 4?) | **Sí** | 4B, después del grupo 2 (la rúbrica puede cambiar) |
| AN-0013 (contención: limitador fuerte sin prueba + detección nula) | **Sí** | 4B, después del grupo 2 |
| AN-0004 (grupo electrógeno: ¿contención o recuperación?) | Sí, pero es sobre la definición de los aspectos de V | Grupo 2 |
| AN-0014 (I efectivo con una dimensión `unknown`) | Sí, decide un desempate | Grupo 6 |
| AN-0006, AN-0011 (la narrativa da el costo con la respuesta actuando; qué es el evento en CP-05) | No: la regla es clara (§4.1.4, §2.1), falta el dato | Nada que cambiar; posible aviso a la Fase 7 |
| AN-0012 (antivirus "antes del evento") | No: §2.1 y el test de §2.2.3 lo resuelven (actúa después de la intrusión) | Nada que cambiar |
| AN-0016 (monto bruto sin campo en la ficha) | No es ancla; es un campo faltante | `cambios-protocolo-v0.2.md` |
| A1 de anclas económicas, de continuidad y de legal (12,5% del RO = 3 contra 2; contractual a económico; "producción reducida" como degradación) | No: v0.1 es literal y distinta del anexo; es calibración | Grupo 5 (aislar D14) |
| A1 de V único contra V_d (41) | No: cambio de metodología | Grupo 2 |

### 4A · Anclas de P

**Decisión de Emiliano (2026-10-06 11:09 UTC): SÍ** a la opción A. Aplicada en la candidata (§3.3, §3.4).

**Problema.** Un mismo hecho (phishing semanal, polvo acumulado, fallas sanitarias acumuladas, cableado sobrecargado, una sola persona con firma en tesorería) puede leerse como "condiciones presentes y activas" (nivel 5), como "precursores observados" (nivel 3) o como ajuste +1 (§3.4.2). Los bordes "en los últimos 3 años" contra "hace más de 3 años" y "al menos una vez por año en los últimos años" no dicen qué pasa justo en el límite.

**Causa.** v0.1 usa la palabra "condición" en tres lugares con tres efectos, y no separa un *estado* (una condición causal) de una *ocurrencia* (un precursor o un antecedente).

**Opciones.**
- **A (recomendada).** Tres conceptos, tres efectos:
  - **Antecedente** (ocurrió el evento iniciador): fija el nivel por frecuencia y antigüedad, como hoy.
  - **Precursor** (ocurrió la causa sin el evento: un golpe a un parante, un desvío de temperatura): ancla 3 si no hay antecedentes propios, como hoy.
  - **Condición causal** (un estado: degradación, sobrecarga, acumulación, un control preventivo débil o ausente): nunca fija un nivel; sólo da el +1 de §3.4 cuando **la fuente que fijó el nivel no la refleja** (si la fuente es la historia propia, cuando no existía en ese período; si es comparables o sector, cuando es peor que lo habitual en ellos). El −1 es simétrico.
  - Sale del nivel 5 "o las condiciones que lo producen están presentes y activas".
  - Bordes: nivel 4 = "en los últimos 36 meses, incluido el que ocurrió hace exactamente tres años"; nivel 5 = "una frecuencia media de al menos una por año en los últimos tres años (o en el período con registro, si es menor)".
- B. Dejar las anclas y agregar un orden de lectura (primero antecedentes, después precursores, después condiciones). Resuelve el solapamiento sin cambiar el +1, pero deja la condición que existió siempre (CP-11) sin regla.

**Efecto esperado en los casos (a confirmar en la regresión).** CP-19 marzo: sin incendios propios, el nivel lo fija el sector (2) y el cableado sobrecargado da +1: 3, sin la lectura 5. CP-08-R1: comparable hace seis años (2) más polvo (+1): 3. CP-13-R1: el acta de advertencia es precursor (3) y las fallas acumuladas, +1: 4. CP-11 A y B: sector (2) más una persona con firma propia, peor que lo habitual (+1): 3 en las dos, sin cambio de orden. CP-12-R1a: dos cortes en dos años = una por año: 5; R1b, una falla en dos años: 4.

**Casos de origen nuevos:** ninguno de los 20 (la regla sale de anomalías de definición, no de la adjudicación de un caso).

### 4B · Rúbricas de V

**Sin cambio de criterio:** precisa dos niveles de las rúbricas sin mover ningún valor de la Fase 4 (sólo quita rangos). Aplicada en la candidata como redacción (§5.3, §5.4) y listada en "Para aprobar" para que Emiliano la confirme.

- **AN-0005 · Recuperación parcial, formal y sin prueba** (planta hermana, otro depósito, otra planta al 60%). Hoy cae entre el 3 ("probada parcial" o "1–2 sin prueba") y el 4 ("improvisada o no escrita"). **Propuesta:** el nivel 3 dice explícitamente "o una alternativa parcial **formal** (escrita, contratada o propia) presente sin prueba"; el 4 queda para lo improvisado. Mantiene los valores que puso la Fase 4 (3 con máximo 4) y les quita el rango.
- **AN-0013 · Contención con un limitador estructural y sin detección** (restricción por sede en CP-07 R2). **Propuesta:** una barrera pasiva que no depende de detectar (permisos por rol o sede, muro cortafuego, sectorización, segmentación) se puntúa por el daño que deja pasar; la falta de detección no la empeora, porque la barrera actúa igual. Cuenta como **probada** si su configuración se verificó en los últimos 12 meses (auditoría, prueba de permisos, inspección); si no, es "presente sin prueba". CP-07 R2: la restricción limita a una parte acotada y no está verificada → 3, el valor de la Fase 4 sin el rango 3–4.

**Casos de origen nuevos:** ninguno de los 20 (vienen de anomalías de definición).

## Grupo 5 · Regresión y aislamiento de D14

Corrida `F5-REG-01` con los grupos 1 a 4 aplicados: `regresion/reporte-regresion.md`.

**Resultado.** 16 PASS y 4 FAIL (Fase 4: 5 y 15). FAIL — combinación: CP-01, CP-12, CP-16; FAIL — ranking: CP-07. Ningún PASS de la Fase 4 regresionó. CP-14 pasa contra la adjudicación revisada. Recodificación 1, 2, 3, 5, 8: 6 pares dentro de los casos (3 inversiones estrictas y 3 empates que se rompen) y 125 de 1128 pares entre todas las fichas.

**Conteo propuesto hacia la falsación de D14: 1 de 3.**
- **G3 · recurrencia por encima del techo de P** (CP-01 R4 bajo R5; CP-12, con econ `assumed`): cuenta 1. Un evento que pasa seis a ocho veces por año queda con P 5 e I de un solo evento; ninguna ancla lo representa sin medir I sobre la pérdida anual, que cambia la definición de I (D5, D19).
- **G2 · remoto y catastrófico contra probable y moderado** (CP-01 R1 bajo R5): 0, dudoso. Se corregiría redactando el ancla 1 de P (sin dato sectorial completo, piso 2), pero eso hay que decidirlo y volver a correr.
- **CP-16:** 0, dudoso; factores en el borde.
- **CP-07:** 0; es un desempate (grupo 6).

**Decisión de Emiliano sobre el conteo (2026-10-07 01:54 UTC): SÍ, 1 de 3; D14 no falsada.** Precisión: no demuestra todavía que la multiplicación sea el problema aislado; demuestra que el modelo de criticidad que alimenta D14 pierde información cuando P se satura en 5 e I describe un solo evento (un evento anual y ocho por año quedan indistinguibles). Arreglarlo cambia la semántica de P, de I, o agrega una representación explícita de la recurrencia: es un fallo estructural independiente. Queda como hipótesis abierta: tratamiento de la recurrencia una vez alcanzado P = 5. La caldera contra el fraude y CP-16 no cuentan: siguen dudosos hasta resolver el ancla de P y los bordes y volver a correr.

**Sobre la evidencia:** Fase 5 = consistencia interna y regresión; Fase 8 = primera prueba genuina de reproducibilidad y generalización. Emiliano está de acuerdo con que los avisos a la Fase 7 describan datos y no resultados esperados.

## Grupo 6 · D10 y desempates

**Problemas.** CP-07 (AN-0160): R1 = R2 = 36 y el paso 3 de D10 (I efectivo) pone primero a R1, que tiene prevención y recuperación maduras; lo adjudicado es R2 > R1 con empate permitido. AN-0014: I efectivo no está definido con una dimensión `unknown`. CP-20 (AN-0020) ya no necesita desempate: pasa por `C_raw`.

**Opciones para el orden de D10.**
- **A (recomendada).** El desempate de preparación sube antes de I efectivo: `C_raw` → preparación → I efectivo → I-personas → empate legítimo. CP-07 pasa (R2 primero: contención 3 sin recuperación posible, contra 3/2). No cambia ningún otro caso de la regresión: CP-05 y CP-13 empatan en preparación y deciden por I-personas como hoy; en CP-01 los tres riesgos de 20 quedan R1 > R2 > R4, igual que ahora; en CP-20, R1 y R2 siguen en empate legítimo. CP-07 pasa a ser caso de origen (circular).
- B. Dejar el orden aprobado (preparación después de I-personas). CP-07 queda FAIL — ranking, sin contar para D14.

**AN-0014 · I efectivo con una dimensión `unknown` (default).** Para mostrar y desempatar, I efectivo es el máximo entre las dimensiones conocidas y el `<f>_max` de las `unknown` (5 si no tienen rango), y se muestra como "≥ n". Es la misma lógica de la cota de §9.3: lo desconocido no baja la prioridad.

**Decisión de Emiliano (2026-10-07 01:54 UTC):**
- **Preparación como desempate: No**, ni antes de I efectivo ni en ningún lugar. V ya representa la preparación; usarla como desempate le daría un segundo peso escondido. En CP-07 el empate ya era aceptable: no hace falta una regla global para hacerlo pasar. Principio: `banda → C_raw → [desempates realmente justificados] → empate legítimo`; si los desempates restantes dan una preferencia arbitraria, se conserva el empate; no hace falta un orden total. Esto pide revisar D10 más a fondo (fuera de esta fase).
- **Consecuencia sobre el grupo 2:** sale el paso 5 "preparación" que se había aprobado a las 11:09 UTC (la decisión más nueva manda). PV-5 = PV-2 y PV-1 = PV-4 quedan empatados por `C_raw`; sus diferencias se ven por dimensión y en los campos de V. En la regresión no cambia ningún resultado: el paso nunca decidió un orden.
- **I efectivo con `unknown`: No al máximo posible.** Se muestra `I efectivo ≥ n` con el máximo de las conocidas; si `≥ n` alcanza para decidir, decide; si el valor de la `unknown` podría cambiar el orden, el desempate queda indeterminado (empate o provisionalidad); nunca se usa el extremo del rango para ganar un desempate (R1, D9).

**Regla resultante:** candidata §7.2 (D10 sin preparación, principio, `≥ n`). CP-07 sigue FAIL — ranking, no cuenta para D14 y queda abierto para la revisión de D10.

---

## Cambios ya aprobados en la Fase 6 que entran en la v0.2

- **CH-075** (metodología §7.1.4): el ranking es siempre dentro de una organización; no existe lista ordenada con riesgos de organizaciones distintas. Se copia en la candidata.
- **CH-077** (protocolo §11): métricas de ranking por empresa reemplazadas por la concordancia de orden sobre pares de fichas de una misma empresa en la muestra. Va en `cambios-protocolo-v0.2.md`.

---

## Aprobación final

**Emiliano, 2026-10-07 02:02 UTC: sí a los 11 puntos del "Para aprobar"**, con dos precisiones que se escribieron en la v0.2:
1. La regla de V secuencial forma parte de D14/D15; que ahora haga pasar casos usados para diseñarla no es evidencia de generalización, es regresión de consistencia. La primera evidencia ciega sigue siendo la Fase 8.
2. La verificación en 12 meses de una barrera pasiva es una regla operativa de v0.2 susceptible de revisión, no un estándar externo.

Fase 5 cerrada; metodología, protocolo y decisiones v0.2 congelados para la Fase 8.
