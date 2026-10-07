# Reporte de la Fase 8 · evaluación ciega y comparación de evaluadores

> Fase 8c del plan EMI-15 + EMI-41 (T-0021) · 2026-10-07 · mide la **metodologia v0.2** y el **protocolo v0.2** congelados (`v0/fase-8/congelamiento.md`). Esta sesión no evaluó en la 8b. Scripts: `comparar.py` (pasos 2 y 5) y `comparar_intencion.py` (pasos 4 y 6); los dos sólo leen y se pueden volver a correr con `python3 <script> RAIZ`.

## Resumen

1. **Los ocho factores superan el 80% dentro de ±1** (P 96,7% con n = 30; las dimensiones de I, I efectivo, contención y recuperación, 100%). El acuerdo exacto va de 61,9% (I efectivo) a 83,3% (Legal) y el kappa lineal de 0,42 (contención) a 0,89 (Continuidad). Hay **una sola A1** de más de un nivel: P de S22-R02 (Emiliano 4, agente 2), por una regla ambigua de §3.2.
2. **La divergencia real está en la evaluabilidad, que ±1 no ve.** En 9 de 30 riesgos Emiliano dejó `unknown` un impacto (8 en Económico, 4 en Continuidad) donde el agente fijó un valor: Emiliano tiene 7 no evaluables y el agente 1. El acuerdo de evaluabilidad cae a 73,3% en Económico y en I efectivo, y el de `evaluable` a 80% (kappa 0,20). Las causas son tres: fichas que juntan causas sin escenario plausible claro (§9.2), la magnitud de referencia sin RO positivo (§4.2) y el costo bruto de lesiones que paga la ART.
3. **Ranking:** 2 de 3 pares de una misma empresa ordenados igual; el par S22 se invierte por la A1 en P, no por la combinación. Otros 3 pares quedan fuera porque Emiliano no evaluó uno de los dos riesgos.
4. **Intención de diseño (v0.1).** Las fichas del agente quedan dentro de ±1 de lo pretendido en 92–98% por factor. De sus 483 factores distintos de lo pretendido, 171 podrían explicarse por un cambio de regla de v0.1 a v0.2 (sobre todo CH-080, CH-084 y CH-081/085) y 312 no. Las que no se explican son sobre todo la degradación de §4.4 sin umbral mínimo (21 casos de Continuidad 3–4 donde se pretendía 1), Legal 4 por "responsabilidad penal posible" y recuperación asignada donde se pretendía `no_aplica`.
5. **Contrastes:** produjeron el comportamiento buscado C01, C02, C03, C10, C12, C15, C16, C17, C19, C21 (rangos), C22, C30, C34 y C35. En la mayoría de los demás los niveles quedaron donde se pretendía, pero la fricción buscada casi no se registró. Salieron a medias C11, C20, C25 y C29, y **no** salió C33. De las anomalías que la intención esperaba, el agente registró 73 de 239 (31%); a cambio registró muchas no esperadas: A2 67, A6 56, A12 25, A4 17.
6. **Banderas en las 252 fichas del agente:** `consecuencia_extrema` 19,8% (50) y `safety_critical` 29,8% (75). Ninguna sale por Legal y 42 de las 50 extremas salen por Económico. En los casos de propiedad la proporción con alguna dimensión en 5 era 70% (14 de 20).
7. **Para Emiliano:** aprobar el reporte y las filas de changelog (las de la 8a y las de este anexo); decidir si S22-R02/R03, S27-R02/R06 y S31-R02/R01 cuentan para D14 (el reporte no los cuenta); y llevar las siete divergencias interpretables de §7 a la Fase 11.

---

## 1. Condiciones (paso 1)

| Condición | Resultado |
|---|---|
| Siete familias de la 8b con `fichas.csv` y `notas.md` | Sí: 255 filas (252 con factores y 3 padres), además de `anomalias.csv` y `ranking.md` por familia |
| Fichas de Emiliano completas | Sí: 30 filas, los mismos `risk_id` de `sorteo/muestra-emiliano.csv`; 23 evaluables y 7 no evaluables; `actor = human` |
| Hashes contra `congelamiento.md` | **Los 346 coinciden** (3 de metodología, protocolo y decisiones; 7 listas de riesgos; 329 fichas de información; 7 archivos de intención), recalculados el 2026-10-07 durante esta fase |
| Versión declarada | Las 285 fichas (255 del agente y 30 de Emiliano) dicen `metodologia v0.2` + `protocolo v0.2` |
| Desviaciones | Ninguna. Emiliano confirmó en el thread de la 8a que los valores de los factores son suyos ("los elegí yo"), así que no hay desviación por asistencia |

Límite de verificación: Emiliano evaluó desde su checkout (`SPIKES/T-0021/v0/emi41/fichas/…`) y cita un `fuentes-leidas.json` con los SHA-256 de lo que leyó, que no está en la carpeta compartida. No se pudo comparar ese archivo con el congelamiento. Según la nota de la 8a, `main` coincide con los 339 hashes del congelamiento. No es una desviación, pero queda sin verificar desde acá.

## 2. Reproducibilidad (paso 2, protocolo §11)

`n` = pares donde los dos pusieron un valor 1–5. Los pares con `unknown`, `≥ n` o `no_aplica` en alguno de los dos van al acuerdo de evaluabilidad (regla 2). Detalle en `metricas.csv`.

| Factor | n | ±1 (target ≥ 80%) | Exacto | Kappa lineal | Evaluabilidad (n = 30) | Rango idéntico | Rangos solapados |
|---|---|---|---|---|---|---|---|
| P | 30 | **96,7%** ✓ | 70,0% | 0,596 | 100% | 53,3% | 96,7% |
| I-económico | 21 | **100%** ✓ | 71,4% | 0,791 | **73,3%** | 47,6% | 100% |
| I-personas | 30 | **100%** ✓ | 66,7% | 0,802 | 100% | 56,7% | 100% |
| I-continuidad | 26 | **100%** ✓ | 80,8% | 0,886 | 86,7% | 61,5% | 96,2% |
| I-legal | 30 | **100%** ✓ | 83,3% | 0,876 | 100% | 43,3% | 96,7% |
| I efectivo | 21 | **100%** ✓ | 61,9% | 0,616 | **73,3%** | — | — |
| Contención | 30 | **100%** ✓ | 66,7% | 0,416 | 100% | 36,7% | 86,7% |
| Recuperación | 25 | **100%** ✓ | 72,0% | 0,543 | 100% (5 pares con `no_aplica` en los dos) | 20,0% | 96,0% |

Cómo leerlo:
- El piso al azar de ±1 es ~52% (regla 1). Contra ese piso, todos los factores lo superan con margen. El kappa sólo es moderado en contención (0,42) y recuperación (0,54): ahí las diferencias son casi todas de un nivel (3 frente a 4, 2 frente a 3), en una escala donde los dos usan sobre todo 3 y 4.
- Hay **51 diferencias de un nivel** en los siete factores (P 8, Económico 6, Personas 10, Continuidad 5, Legal 5, contención 10, recuperación 7). No generan A1 con el criterio del prompt ("más de un nivel"); el protocolo §4 define A1 desde un nivel, así que con esa lectura serían 52 A1. Dejo registrada sólo la de más de un nivel, como pide el prompt.
- Por esas diferencias de un nivel, el `C_raw` coincide en 10 de 23 pares evaluables por los dos (43,5%). El producto amplifica diferencias chicas: una P 4 frente a 5 cambia `C_raw` un 25%.

**Nivel de riesgo (n = 30).**

| Campo | Coincidencia | Emiliano `true` | Agente `true` | Kappa |
|---|---|---|---|---|
| `evaluable` | 80,0% (24) | 23 | 29 | 0,204 |
| `consecuencia_extrema` | 76,7% (23) | 12 | 5 | 0,462 |
| `safety_critical` | 86,7% (26) | 12 | 8 | 0,706 |
| Banda | pendiente de la Fase 9 | | | |

- Las siete diferencias de `consecuencia_extrema`: S08-R03, S18-R03, S22-R02 (Personas 5 frente a 4), S24-R03 (Continuidad 5 frente a 4) y S04-R03, S12-R05, S13-R05. En estas tres últimas Emiliano dispara la bandera por el máximo de un impacto `unknown` en un riesgo no evaluable (metodología §8.2, su AN-F8-031), y el agente fijó un valor menor que 5.
- Las cuatro de `safety_critical` (S13-R05, S19-R06, S31-R06, S36-R04) son todas Personas 4 frente a 3, justo en el umbral.

**Ranking (CH-077).** Hay 6 pares de una misma empresa en la muestra. Se pueden comparar los 3 en que los dos evaluadores tienen ambos riesgos evaluables:

| Par | Emiliano | Agente | ¿Concuerda? |
|---|---|---|---|
| S01-R01 / S01-R02 | R01 antes (`C_raw`) | R01 antes (`C_raw`) | sí |
| S22-R02 / S22-R03 | R02 antes | R03 antes | **no** |
| S36-R03 / S36-R04 | R03 antes | R03 antes | sí |

Concordancia 2 de 3. Quedan fuera S04-R03/R05, S12-R01/R05 y S13-R04/R05, porque Emiliano dejó no evaluables S04-R03, S12-R05 y S13-R05; el agente sí los evaluó.

**A1.** Una sola, `AN-8C-0001` en `anomalias-a1.csv`: P de S22-R02, Emiliano 4 y agente 2, con la observación de cada uno.

## 3. Lectura de las divergencias (paso 3)

Ningún factor queda por debajo del target, así que el paso 3 no tiene grupos obligatorios. Igual clasifico la única A1 y los desacuerdos de evaluabilidad, porque son lo que el ±1 no mide. No decido quién tenía razón.

**AN-8C-0001 · S22-R02, P (4 frente a 2). Causa: regla ambigua de la metodología.** Los dos vieron el mismo hecho: la tasa de la cámara sectorial (3 liberaciones en ~9.000 descargas) cuenta sólo liberaciones **con lesionados**. El agente la tomó como jerarquía 1 de §3.2 (→ 1), registró rango 1–3 por la divergencia con la historia propia, aplicó +1 por el flexible vencido (→ 2) y anotó A2. Emiliano juzgó que no es "comparable" con el evento iniciador y la descartó: historia propia 2021 → ancla 3, +1 por el mismo flexible → 4 (AN-F8-020). §3.2 pide "una frecuencia medida sobre una exposición comparable" y no dice si una tasa que cuenta sólo una parte de los eventos lo es. Es el mismo choque que el agente registró como A12 en S31-R01 y S32-R03 (§3.2 jerarquía 1 frente a §3.3 precursor = ancla 3). La intención esperaba exactamente esta A1.

**Desacuerdos de evaluabilidad (Emiliano `unknown`, agente valor): 9 riesgos.**

| Grupo y causa | Riesgos | Regla o hecho |
|---|---|---|
| **Regla ambigua**: la ficha junta causas o escenarios con consecuencias muy distintas. Emiliano no encuentra base para preferir un nivel; el agente elige el escenario plausible y deja el resto en el máximo. | S02-R07 (Continuidad), S04-R03, S08-R03 (Económico y Continuidad), S12-R05 (Continuidad), S13-R05, S28-R07 (Económico y Continuidad) | §9.2 [F5-1]: "…y elegir dentro de él un valor más plausible defendible" frente a §4.1.4, "el escenario plausible si el evento ocurre". Ejemplo: en S08-R03, falla de rodamiento (1–4 días) o de motor (35–98 días). Los dos registraron A7 en varios de estos riesgos. |
| **Regla ambigua**: magnitud de referencia sin RO positivo | S36-R03 (y S12-R05 en parte) | §4.2, paso 3: "otra medida económica… nombrada y justificada". Emiliano usa ingresos (USD 6 M) y no llega a un monto; el agente usa el fondo de reserva (USD 350 mil) → 5. Con la misma pérdida, las dos medidas dan niveles opuestos. |
| **Ficha de información insuficiente** (y lectura de D17) | S19-R06, S37-R03 | La ficha informa lo que paga la ART y no el costo bruto de la lesión. Emiliano: "el costo neto a cargo del empleador no es I bruto" → `unknown`. El agente valora con lo informado → 1. D17 y §4.1.7 piden impacto bruto de transferencia; la ficha no da con qué calcularlo, y la metodología no dice si la ART cuenta como transferencia. |

## 4. Intención de diseño (paso 4)

**Hashes.** Los siete `cerrado/emi41/intencion-*.md` coinciden con la última (y única) línea de su familia en `hashes-intencion.md` (2026-10-06 20:58 UTC). Se abrieron recién después de los pasos 2 y 3.

**Cómo se comparó.** `comparar_intencion.py` extrae de cada riesgo los niveles pretendidos (con rango), los contrastes que menciona, las anomalías esperadas y, recalculando desde los niveles pretendidos, la evaluabilidad y el `C_raw` con la regla de V de v0.1 y con la de v0.2. Los 255 títulos de riesgo coinciden con las 255 filas del agente; la extracción leyó los 7 factores de las 252 fichas con factores, uno a mano (S33-R06 Continuidad, marcado en el script). La regla candidata de cada diferencia sale del factor y de palabras de la observación: es una **candidata**, no una adjudicación (`diferencias-intencion.csv`).

| Factor | Agente vs intención (252): ±1 · exacto | Emiliano vs intención (30): ±1 · exacto |
|---|---|---|
| P | 98,4% · 63,7% (n 248) | 93,3% · 60,0% (n 30) |
| I-económico | 97,8% · 77,1% (n 231) | 100% · 78,9% (n 19) |
| I-personas | 98,4% · 83,0% (n 247) | 93,3% · 66,7% (n 30) |
| I-continuidad | 91,6% · 80,0% (n 250) | 100% · 84,6% (n 26) |
| I-legal | 96,8% · 79,7% (n 251) | 93,3% · 80,0% (n 30) |
| Contención | 98,4% · 65,5% (n 252) | 100% · 60,0% (n 30) |
| Recuperación | 94,1% · 65,2% (n 204) | 91,7% · 45,8% (n 24) |

**Diferencias explicadas y no explicadas por el cambio de v0.1 a v0.2.**

| | Agente (252 fichas) | Emiliano (30 fichas) |
|---|---|---|
| Factores distintos de lo pretendido | 483 (386 de un nivel, 58 de más de uno, 39 de estado: valor, `unknown` o `no_aplica`) | 75 (53 · 8 · 14) |
| Candidatas a CH-084 (P: antecedente, precursor, condición causal) | 91 | 3 |
| Candidatas a CH-081/CH-085 (frontera contención/recuperación, rúbricas) | 58 | 5 |
| Candidatas a CH-080 (`unknown` frente a valor más plausible) | 22 | 13 |
| Sin cambio de regla que las explique | 312 | 54 |

Lo que sí se explica por la v0.2:
- **CH-080 empuja en los dos sentidos.** El agente fijó valor en 15 Económicos y 3 P que la intención dejaba `unknown`. Emiliano hizo lo contrario en 7 Económicos y 4 Continuidades: valor pretendido y `unknown` suyo. La v0.2 agregó la condición "base para preferir un nivel", que un evaluador lee como permiso para fijar valor y el otro como exigencia para no fijarlo (el mismo grupo del §3).
- **CH-081 (V secuencial)** cambia el `C_raw` pretendido de 72 riesgos al recalcularlo con los mismos niveles, y la evaluabilidad de 3: S26-R05, S28-R07 y S34-R01 eran no evaluables con "el peor de los dos aspectos" y son evaluables con la combinación secuencial.
- **Evaluabilidad:** la pretendida (recalculada con v0.2) coincide con la del agente en 232 de 252. En 15 riesgos se pretendía no evaluable y el agente evaluó; en 14 de ellos porque fijó valor al factor (Económico o P) que la intención dejaba `unknown` (C11, C15, C21). En 5 pasa lo contrario. Con Emiliano coincide en 23 de 30: él deja no evaluables 5 que la intención hacía evaluables y evalúa 2 que se pretendían no evaluables (S12-R01, S21-R01).

Lo que no se explica por un cambio de regla (diferencias de más de un nivel, agente):
- **§4.4, degradación sin umbral mínimo (21 casos de Continuidad).** Perder 1 camión de 80, 1 silo de 12 o 1 sucursal de 60 durante semanas da Continuidad 3–4 por la lectura literal ("un nivel por debajo… como interrupción"), donde la intención pretendía 1. El agente lo aplicó y registró A8 (por ejemplo AN-8-comercio-y-logistica-0014). §4.4 no cambió en la v0.2.
- **§4.5, Legal más alto que lo pretendido (8 casos en el agente).** En 5 se lee como ancla 4 la "responsabilidad penal posible de directivos" o la clausura temporal del sector en un escenario con víctimas, donde se pretendía 2; Emiliano hace lo mismo en S01-R01 y S08-R03. En los otros 3, el retiro con notificación o la suspensión en el escenario bruto dan 3–4 donde se pretendía 1.
- **§5.5.2, `no_aplica` (10 casos).** El agente asigna recuperación cuando hay cualquier interrupción que acortar (un puesto, una clausura), donde la intención pretendía `no_aplica` por ser un daño a personas.
- **Recuperación con más de un nivel de diferencia (12 casos, en los dos sentidos).** El patrón más visible es §5.2, "presente sin prueba": en S31-R06, ocho camionetas de reemplazo sin uso documentado dan 3 para los dos evaluadores, donde se pretendía 1.
- **Magnitud sin RO** (S36-R03, S36-R04): el fondo de reserva lleva Económico a 5 y a 3 donde se pretendía 3 y 1.

**Contrastes (C01–C35).** El "chequeo" es la propiedad observable del contraste cuando se puede mecanizar; si no, la lectura queda en "nivel como se pretendía". Las anomalías se cuentan sin A1, que no puede aparecer en el registro de un solo evaluador. Detalle por contraste e ids en `contrastes.csv`.

| Contraste | Riesgos | Factores ±1 | Evaluabilidad pretendida | Anomalías esperadas que aparecieron | Chequeo | Lectura |
|---|---|---|---|---|---|---|
| C01 alta severidad / baja P | 13 | 95,6% | 13/13 | 2/15 | bandera en I 5 o Personas ≥ 4: 11/11 | **sí**; el producto deja remotos abajo (A8 del agente en S22-R02 y S31-R01) |
| C02 frecuente / menor | 25 | 98,1% | 25/25 | 7/25 | pares de prueba del producto: lo frecuente debajo en 23/25 | **sí** (§6) |
| C03 exposición humana | 54 | 96,1% | 51/54 | 11/55 | `safety_critical` con Personas pretendido ≥ 4: 37/38 | **sí** |
| C04 dependencia tecnológica | 12 | 97,3% | 10/12 | 4/9 | — | nivel sí |
| C05 regulación fuerte | 31 | 94,3% | 28/31 | 12/40 | — | nivel sí; Legal 4 más alto que lo pretendido (§4.5) |
| C06 concentración de activos | 29 | 98,0% | 28/29 | 6/27 | — | nivel sí |
| C07 alta resiliencia | 5 | 88,6% | 5/5 | 2/6 | — | nivel sí |
| C08 alta vulnerabilidad | 6 | 97,5% | 5/6 | 1/8 | — | nivel sí |
| C09 PyME / grande | 18 | 96,7% | 17/18 | 5/21 | — | nivel sí |
| C10 transferencia relevante | 9 | 100% | 8/9 | 5/10 | — | **sí** |
| C11 información incompleta | 19 | 97,3% | 11/19 | 15/32 | misma evaluabilidad: 11/19 | **a medias**: el agente fija valor donde se buscaba `unknown` (CH-080) |
| C12 redundancia | 3 | 95,2% | 3/3 | 1/1 | — | **sí** |
| C13 terceros | 78 | 96,9% | 68/78 | 28/94 | — | nivel sí |
| C14 fuera del horizonte | 4 | 89,3% | 4/4 | 2/6 | — | nivel sí |
| C15 RO nulo o negativo | 9 | 98,3% | 6/9 | 5/7 | Económico `unknown` o A6: 9/9 | **sí**, con la divergencia de magnitud del §3 |
| C16 padre con sub-riesgos | 3 | 95,2% | 3/3 | 0/1 | sub-riesgo evaluado completo: 3/3 | **sí** |
| C17 escenario por causa común | 4 | 100% | 3/4 | 3/4 | escenario con ficha propia: 3/3 | **sí** |
| C18 pólizas con límites | 30 | 95,6% | 28/30 | 17/40 | — | nivel sí |
| C19 corrientes de severidad media | 90 | 96,7% | 88/90 | 20/61 | sin `consecuencia_extrema`: 85/87 | **sí** |
| C20 fuentes de P que divergen | 13 | 96,5% | 11/13 | 4/12 | P con rango: 10/13 | **a medias** (77%) |
| C21 margen desconocido | 11 | 91,4% | 5/11 | 7/18 | Económico con rango o `unknown`: 11/11 | **sí** en rangos; evaluabilidad 5/11 por CH-080 |
| C22 recuperación sin nada que reponer | 35 | 99,5% | 34/35 | 5/22 | `no_aplica` donde se pretendía: 27/33 | **sí** (82%); en 6 el agente asigna recuperación (§5.5.2) |
| C23 estacionalidad | 26 | 98,3% | 24/26 | 8/28 | — | nivel sí |
| C24 reglas de evidencia circular | 10 | 95,7% | 10/10 | 2/8 | — | nivel sí |
| C25 granularidad en lista fija | 7 | 100% | 6/7 | 2/10 | A7 donde se esperaba: 2/4 | **a medias** |
| C26 producto y retiro | 13 | 96,5% | 12/13 | 4/20 | — | nivel sí |
| C27 exposición cambiante | 11 | 94,7% | 11/11 | 0/5 | — | nivel sí; ninguna anomalía buscada |
| C28 personas vulnerables | 12 | 97,4% | 11/12 | 3/6 | — | nivel sí |
| C29 tecnología sin historia | 3 | 94,4% | 1/3 | 5/9 | — | **a medias**: evaluabilidad 1/3 |
| C30 gobernanza y terceros | 4 | 100% | 4/4 | 2/3 | — | **sí** |
| C31 ciclo productivo largo | 4 | 85,7% | 4/4 | 1/3 | — | nivel sí |
| C32 servicio crítico | 6 | 100% | 5/6 | 2/6 | — | nivel sí |
| C33 multi-sitio, redundancia natural | 3 | 85,7% | 3/3 | 2/4 | Continuidad como la pretendida: 1/3 | **no**: §4.4 sube Continuidad (S03-R01, S27-R02) |
| C34 activos sin personas | 3 | 100% | 3/3 | 2/4 | — | **sí** |
| C35 evento gradual | 5 | 90,3% | 4/5 | 7/12 | — | **sí** |

"Nivel sí" quiere decir que los factores quedaron donde se pretendía, pero la fricción que el contraste buscaba se registró en menos de la mitad de los casos. "Sí" exige además que el chequeo, si lo hay, dé al menos 80%, o, sin chequeo, que hayan aparecido al menos la mitad de las anomalías esperadas.

**Anomalías esperadas frente a aparecidas.**
- **Agente (252 fichas).** La intención esperaba 239 anomalías sin contar A1, en 190 riesgos, y el agente registró 73 (31%). Por código: A6 29 de 81, A11 17 de 58, A8 11 de 31, A2 10 de 20, A7 4 de 10, A3 1 de 16, A10 1 de 9, A9 0 de 8, A5 0 de 4, A12 0 de 2. En total registró 228 anomalías, muchas en riesgos donde ese código no se esperaba: A2 67, A6 56, A11 30, A12 25, A8 24, A7 20, A4 17. **A9 no apareció nunca.**
- **A1 en la muestra.** La intención esperaba A1 en 21 de los 30 riesgos. En 19 de ellos los dos evaluadores difieren en algún factor, pero sólo en S22-R02 (P) por más de un nivel. Esa A1 era una de las esperadas.
- **Emiliano (30 fichas).** Registró A6 en 29 entradas, A7 14, A10 8 y A11 3. De las esperadas en sus riesgos: A6 11 de 12, A7 1 de 1, A10 2 de 2, A11 1 de 10, A8 0 de 4, A3 0 de 3, A2 0 de 4.

## 5. Banderas sobre la población sintética (paso 5, contradicción abierta #3)

252 fichas del agente con factores (sin los 3 padres). La dimensión cuenta cada dimensión que dispara la bandera, así que un riesgo puede sumar en más de una.

| Familia | Fichas | `consecuencia_extrema` | Económico | Personas | Continuidad | Legal | `safety_critical` |
|---|---|---|---|---|---|---|---|
| Agro y alimentos | 59 | 12 (20,3%) | 11 | 1 | 8 | 0 | 17 (28,8%) |
| Comercio y logística | 26 | 5 (19,2%) | 5 | 0 | 4 | 0 | 7 (26,9%) |
| Energía y agua | 24 | 3 (12,5%) | 3 | 0 | 3 | 0 | 4 (16,7%) |
| Industria y construcción | 51 | 12 (23,5%) | 10 | 1 | 6 | 0 | 18 (35,3%) |
| Minería | 43 | 10 (23,3%) | 6 | 5 | 8 | 0 | 21 (48,8%) |
| Servicios a personas | 27 | 7 (25,9%) | 6 | 4 | 1 | 0 | 8 (29,6%) |
| Tecnología y pagos | 22 | 1 (4,5%) | 1 | 0 | 1 | 0 | 0 |
| **Total** | **252** | **50 (19,8%)** | **42** | **11** | **31** | **0** | **75 (29,8%)** |

- `consecuencia_extrema` marca uno de cada cinco riesgos, frente a 70% en los casos de propiedad (14 de 20 con alguna dimensión en 5, cobertura C19). La bandera sale casi siempre por Económico o Continuidad: sólo 11 riesgos tienen Personas 5 y ninguno Legal 5.
- `safety_critical` (Personas ≥ 4) es más frecuente que `consecuencia_extrema` en todas las familias salvo Tecnología y pagos, y llega casi a la mitad en Minería.
- En las 30 de la muestra, Emiliano marca 12 extremas (8 por un valor 5 y 4 por el máximo de un `unknown` en un no evaluable) y 12 de seguridad; el agente, 5 y 8.
- **Derivación inconsistente en 3 fichas del agente.** S17-R03, S34-R01 y S10-R05 son no evaluables, con un impacto `unknown` de máximo 5, y no llevan `consecuencia_extrema`. S02-R07, en la misma situación, sí la lleva. Protocolo §2.3 define la bandera sólo por un valor 5, y metodología §8.2 la extiende a los no evaluables por el máximo. Emiliano registró la misma contradicción (AN-F8-031).

## 6. D14 (paso 6)

**Pares de la muestra donde el orden del agente contradice el de Emiliano:** uno, S22-R02 / S22-R03. Se invierte **por los factores, no por la combinación**: con sus propios factores, los dos aplican la misma fórmula y el mismo D10. La diferencia viene de P (4 frente a 2, la A1) y, en menor medida, de Personas (5 frente a 4) y de contención (3 frente a 2). No hay pares que se inviertan por la combinación.

**Pares que la intención marcó como prueba del producto** (A8 "si queda arriba de…"; `pares-d14.csv`). Son 26 pares, ninguno con los dos riesgos en la muestra de Emiliano. En las fichas del agente, lo frecuente y menor queda debajo de lo grave en 23 pares, con un no evaluable (S24-R05/R04) que no entra al ranking, y queda **arriba** en 2:
- **S31-R02** (rotura de línea con derrame) arriba de **S31-R01** (pérdida de control del pozo). El agente registró A8 (AN-8-energia-y-agua-0002): Legal 3 × P 5 supera a la surgencia, que tiene P baja por la estadística de jerarquía 1. La intención ya calculaba ese orden (C_legal 45 frente a 32).
- **S27-R02** (faltante de medicamentos de stock regulado) arriba de **S27-R06** (incendio en el centro de distribución).

Fuera de esos pares, el agente registró A8 de ranking en S22-R02: la liberación de cloro queda sexta de siete en S22 (AN-8-industria-y-construccion-0021).

No cuento ningún caso hacia la falsación: lo decide Emiliano (protocolo §9). Son pares de una misma empresa que nadie adjudicó antes de la corrida, así que por la definición de "qué cuenta como caso" de §9 no califican automáticamente.

## 7. Qué queda para Emiliano

1. **Aprobar este reporte.** Después: las filas del anexo de la 8a y de `anexo-changelog-fase-8.md` entran al changelog, y se abre la PR con todo `v0/fase-8/` y `cerrado/emi41/`.
2. **D14:** decidir si S22-R02/R03, S31-R02/R01 o S27-R02/R06 se adjudican como casos. El reporte no los cuenta.
3. **Divergencias interpretables para la Fase 11.** Ninguna se resuelve acá:
   - §9.2 [F5-1]: cuándo hay "base para preferir un nivel" en una ficha que junta causas con consecuencias muy distintas (9 riesgos de la muestra; es la mayor fuente de desacuerdo).
   - §4.2, paso 3: qué medida usar sin RO positivo (ingresos, fondo de reserva o presupuesto), que con la misma pérdida da niveles opuestos.
   - D17 y §4.1.7: si lo que paga la ART es transferencia y cómo se obtiene el costo bruto de una lesión.
   - §3.2: cuándo un dato de jerarquía 1 es "comparable" (la A1 de S22-R02) y su choque con §3.3 (precursor = ancla 3).
   - §4.4: degradación sin umbral mínimo (21 casos y A8 del agente; C33 no funcionó).
   - §4.5: si "responsabilidad penal posible" o la clausura de un sector en un escenario con víctimas es Legal 4.
   - Protocolo §2.3 frente a metodología §8.2: si la bandera extrema aplica por el máximo en un no evaluable. Hay fila propuesta en el anexo.

## Archivos

| Archivo | Qué tiene |
|---|---|
| `comparar.py` | Pasos 1 (versiones), 2 y 5 → `metricas.csv`, `anomalias-a1.csv` |
| `metricas.csv` | Por factor: ±1, exacto, kappa, evaluabilidad, rangos; por riesgo: `evaluable` y banderas; ranking por par; banderas del agente por familia y dimensión |
| `anomalias-a1.csv` | La A1 con el formato del registro, las observaciones de los dos y la causa del paso 3 |
| `comparar_intencion.py` | Pasos 4 y 6 → los cuatro CSV que siguen |
| `intencion-vs-fichas.csv` | Por ficha del agente: niveles pretendidos, del agente y de Emiliano; evaluabilidad y `C_raw` pretendidos con v0.1 y v0.2; anomalías esperadas y registradas |
| `diferencias-intencion.csv` | Cada factor distinto de lo pretendido, con su regla candidata |
| `contrastes.csv` | Por contraste: riesgos, ±1, evaluabilidad, anomalías y chequeo |
| `pares-d14.csv` | Los 26 pares de prueba del producto y su orden D10 |
| `anexo-changelog-fase-8.md` | Filas propuestas para el changelog |
