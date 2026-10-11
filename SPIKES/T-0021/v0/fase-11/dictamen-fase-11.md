# Dictamen de la Fase 11a · condiciones para la v1 candidate

> 2026-10-11 · sobre metodologia v0.3, protocolo v0.3 y decisiones v0.3. Diagnóstico y propuesta: esta fase no cambia ninguna regla, ficha ni documento vigente y no corre ninguna regresión con reglas nuevas. Lo escribió una sesión que no evaluó en la 8b.

## Resumen

1. **Casos de propiedad satisfactorios:** se cumple con limitación (propuesto; lo juzga Emiliano). 13 PASS de 20, sólo 5 no circulares; 4 FAIL de la Fase 5 y 3 FAIL — calibración.
2. **Divergencias interpretables:** se cumple con limitación. Las 7 de la 8c tienen causa nombrada; 4 son reglas ambiguas. Acuerdo de `evaluable` 80% (kappa 0,20).
3. **Bandas que discriminan:** se cumple con limitación. Banda 16/23 = 69,6% (target 70%), 62,2% en Media, 61 riesgos en `C_raw` 45–48.
4. **Ranking defendible:** se cumple con limitación. 23 de 25 pares de prueba en el orden esperado; 2/3 pares de la muestra; D10 sigue abierto.
5. **Regresión estable:** se cumple con limitación. F10-REG-01 sin cambios inesperados, pero el arnés sigue en v0.2 con 7 `todo`.
6. **D14:** propuesto **1 de 3** (G3); con la lectura más adversa, 2. No está falsada. Los pares S22, S27 y S31 no cuentan en la propuesta (`conteo-d14.md`).
7. **Salidas de los 46 puntos:** 12 a corregir (8 cambian la asignación o la combinación, 4 son texto o arnés), 20 b limitación, 9 c pregunta para la Fase 12, 3 d fuera de v1; 1 ya resuelto (CH-092) y 1 es la decisión de D14.
8. **Recomendación:** crear la v1 candidate en la 11b con las correcciones que apruebes y las limitaciones declaradas. Nada de lo que queda es evidencia fuera de la muestra.

---

## 1. Qué evidencia hay y qué no prueba

El inventario completo está en `inventario-evidencia.csv` (46 puntos, EV-01 a EV-46). Las fuentes son los casos de propiedad (Fase 5, recalculados en las fases 9 y 10), las 285 fichas de EMI-41 (255 del agente y 30 de Emiliano), las 228 anomalías del agente, las notas AN-F8 de Emiliano, la calibración de la Fase 9 y la regresión y el arnés de la Fase 10.

**Nada de eso es evidencia fuera de la muestra.** Los casos de propiedad motivaron las reglas de la v0.2 y la v0.3; EMI-41 y sus anomalías motivan las correcciones que propongo acá. Cualquier corrección que apruebes se ajusta a esa misma evidencia, y la regresión de la 11b sólo puede mostrar consistencia, no generalización. La primera evidencia independiente sobre la v1 candidate es la Fase 12.

## 2. Las cinco condiciones

### 2.1 Casos de propiedad satisfactorios · se cumple con limitación (propuesto)

| Resultado (F10-REG-01, v0.3) | n | Casos |
|---|---|---|
| PASS | 13 | CP-02, 03, 04, 06, 08, 09, 10, 11, 13, 14, 15, 19, 20 |
| de ellos, no circulares | 5 | CP-03, 04, 09, 11, 19 (CP-09 y CP-11 sin criterio ejecutable) |
| FAIL de la Fase 5 | 4 | CP-01 (combinación, G2 y G3), CP-12 (combinación, recurrencia), CP-16 (combinación, borde), CP-07 (ranking) |
| FAIL — calibración | 3 | CP-05, CP-17, CP-18 (aprobados en la Fase 9) |

**Por qué con limitación.** 8 de los 13 PASS son circulares: la regla se escribió conociendo el caso. Los 7 FAIL tienen causa nombrada y ninguno es inesperado. Si son "satisfactorios" no lo puedo dar por hecho: es tu juicio, y el plan lo pide así.
**Qué haría falta para "se cumple":** casos nuevos adjudicados antes de correr la v1 candidate (Fase 12).

### 2.2 Divergencias interpretables · se cumple con limitación

- Reproducibilidad (30 pares): los ocho factores ≥ 80% dentro de ±1 (P 96,7%); exacto 61,9–83,3%; kappa lineal 0,42–0,89.
- Evaluabilidad: 73,3% en Económico e I efectivo; `evaluable` 80%, kappa 0,20. Emiliano dejó 7 no evaluables y el agente 1.
- Una sola A1 de factor (AN-8C-0001, P de S22-R02).
- Las 7 divergencias de la 8c tienen causa: 4 reglas ambiguas (§9.2 base para preferir, §4.2 sin RO positivo, §3.2 comparabilidad, §4.4 degradación), 1 información insuficiente con lectura de D17 (ART), 1 de anclas (§4.5 Legal 4) y 1 ya resuelta (CH-092).
- Las 312 diferencias con la intención de diseño tienen regla **candidata**, no adjudicada.

**Por qué con limitación.** Son interpretables, pero la mayor (evaluabilidad) sale de reglas que dos evaluadores leyeron distinto. Mientras no se aclaren, la reproducibilidad de `evaluable` es baja (n 30).
**Qué haría falta:** aclarar EV-01, EV-29 y EV-03 en la 11b y medir de nuevo el acuerdo de evaluabilidad con evaluadores nuevos (Fase 12).

### 2.3 Bandas que discriminan · se cumple con limitación

- Acuerdo de banda en la muestra: 16/23 = 69,6%, bajo el target de 70% (una ficha más lo cambia).
- 13 A1 de banda, todas con el agente una banda abajo (6 por evaluabilidad, 6 por ±1 que cruza un corte, 1 por la A1 de S22-R02).
- Distribución sintética (233): Baja 8,6%, Media 62,2%, Alta 20,6%, Crítica 8,6%. La intención de diseño da 68% en Media con los mismos cortes.
- 61 riesgos en `C_raw` 45–48; 15 extremos en Media, 10 de ellos en 45 (P 3, I 5, V 3).
- 36,3% de los pares que la intención separa quedan en la misma banda.
- Ningún juego de cortes deja a la vez CP-01 R1, CP-05 R1, CP-17 y CP-03 R2 o CP-18 donde se adjudicaron.

**Por qué con limitación.** Aprobaste los cortes 20/50/75 en la Fase 9 sabiendo esto. Las bandas separan los extremos de la escala, pero Media es ancha y el corte de 50 cae al lado del bloque 45–48.
**Qué haría falta:** el juicio de un revisor sobre el bloque 45–48 (EV-08, pregunta c) y casos remotos con consecuencia extrema, que hoy casi no hay (EV-14).

### 2.4 Ranking profesionalmente defendible · se cumple con limitación

- Pares de prueba del producto (intención de EMI-41): 23 de 25 evaluables en el orden esperado; 2 al revés (S27-R02/R06 y S31-R02/R01, familia G2).
- Pares de una misma empresa en la muestra: 2 de 3 iguales entre evaluadores; S22 se invierte por la A1 en P.
- D10: CP-07 sigue en FAIL — ranking; rechazaste el desempate por preparación y pediste revisar D10 a fondo.
- Recodificación 1, 2, 3, 5, 8: cambian 6 pares de casos y 125 de 1128 pares (AN-0161).

**Por qué con limitación.** "Profesionalmente defendible" sólo lo puede juzgar un profesional que no diseñó la regla. Hoy lo único que hay es la intención del agente generador y tus adjudicaciones.
**Qué haría falta:** la Fase 12.

### 2.5 Regresión estable · se cumple con limitación

- F10-REG-01: 20/20 casos iguales a F9B-CAL-01; en EMI-41, `C_raw`, evaluabilidad y posición sin cambio; D23 se cumple en las 125 combinaciones; la banda como paso 1 de D10 no invierte ningún orden.
- Arnés ejecutable: 195 tests, 188 pass, 0 fail, 7 `todo`, pero sigue en v0.2 (no tiene la banda ni CH-092).
- Huecos: la cola de validación (§9.5) no tiene test; un hijo no evaluable de un padre con posición no aparece en `noEvaluables` (§1.4.5); los evaluables con una dimensión `unknown` no tienen regla de banderas (EV-16).

**Qué haría falta:** portar el arnés a la v1 candidate en la 11b, con tests que fallen con la regla anterior.

## 3. Propuesta por punto

Criterio: prefiero **b** o **c** cuando una corrección sólo se justifica por los casos que la motivaron. Propongo **a** cuando dos reglas vigentes dan resultados opuestos para el mismo hecho, porque la v1 candidate necesita una sola respuesta para el usuario de Risk OS. No propongo ningún mecanismo nuevo (pesos, exponentes, pisos, otra fórmula): el conteo de D14 no lo pide.

### 3.1 Salida a · corregir antes de la v1 candidate

Todas están ajustadas dentro de la muestra. Las marcadas **en disputa** tienen dos lecturas defendibles y la tuya decide.

**EV-01 · Ficha que junta escenarios con consecuencias muy distintas (en disputa).** Tipo §13: asignación.
- Antes (§1.3.4): "Si una lista fija (evaluación ciega) lo trae como riesgo simple, se evalúa como está y se registra A7."
- Después: "Si una lista fija (evaluación ciega) lo trae como riesgo simple, se evalúa como está y se registra A7. Cada factor se evalúa con el escenario que la información muestra como más frecuente entre los que junta la ficha, si hay base para saberlo; los demás van a `<f>_max` y a la observación. Si no hay base para saber cuál es más frecuente, el factor cuyas consecuencias difieren es `unknown` con el rango que cubre los escenarios (§9.2)."
- Fichas: de Emiliano S02-R07, S04-R03, S08-R03, S12-R05, S13-R05, S28-R07 (ya aplicó esta lectura); del agente, esas seis y los 24 riesgos con A7.
- Efecto estimado: el agente pasa de 1 a hasta 7 no evaluables en la muestra; el acuerdo de `evaluable` sube. Sólo afecta listas fijas: en uso normal §1.3.4 obliga a escribir un padre.
- Alternativa: la lectura del agente (elegir siempre el plausible y dejar el resto en el máximo), que mantiene más riesgos en el ranking.

**EV-03 · Lo que paga la ART es transferencia.** Tipo: asignación.
- Antes (§4.1.7): "**Bruto de transferencia.** El seguro no reduce ninguna dimensión (D17)."
- Después: "**Bruto de transferencia.** El seguro no reduce ninguna dimensión (D17). Incluye los seguros obligatorios (ART u otros): lo que paga la aseguradora es transferencia, e I-económico se evalúa con el costo bruto de la consecuencia (prestaciones médicas y salariales, indemnizaciones), aunque no lo pague la organización. Si la información sólo trae lo que paga la aseguradora, el bruto se estima con §4.2 [F5-1]; si no se puede acotar, I-económico es `unknown`."
- Fichas: de Emiliano S19-R06, S37-R03 (ya `unknown`); 17 del agente que mencionan la ART.
- Efecto: Económico puede subir en las del agente; con Personas determinante, `C_raw` casi no se mueve. Es aplicación directa de D17, no una regla nueva.

**EV-04 · Cuándo un dato de jerarquía 1 es comparable.** Tipo: asignación.
- Antes (§3.2.1): "**Dato cuantitativo confiable y comparable**: una frecuencia medida sobre una exposición comparable y suficiente, documentada (estadística sectorial, base actuarial, registro propio con muchos años-equipo)."
- Después: agregar "Es comparable sólo si cuenta el mismo evento iniciador de la ficha. Una frecuencia que cuenta sólo una parte de esos eventos (por ejemplo, sólo los que tuvieron lesionados) o un evento distinto es una cota inferior: va a `p_observacion` y no fija el nivel."
- Fichas: de Emiliano S22-R02 y S32-R03 (sin cambio, ya aplicó esto); unas 28 del agente, entre ellas S22-R02, S31-R01, S32-R03, S33-R01, S33-R04.
- Efecto: la P del agente en S22-R02 pasaría de 2 a cerca de 4 y el par S22 dejaría de invertirse; S31-R01 subiría. Es la única A1 de factor.

**EV-05 · Degradación sin mínimo.** Tipo: asignación.
- Antes (§4.4): "Una degradación menor a la mitad se evalúa un nivel por debajo del que le correspondería a la misma duración como interrupción."
- Después: agregar "Si la función pierde una unidad entre muchas equivalentes y sigue entregando su producto o servicio principal sin un cambio que el cliente note (redundancia natural), no es degradación de una función crítica: es nivel 1."
- Fichas: unas 21 del agente (S03-R01/R02, S20-R02, S27-R02, S33-R02/R04/R05/R06, entre otras); ninguna de Emiliano registró la objeción.
- Efecto: Continuidad baja a 1 en esas fichas; `C_raw` baja donde Continuidad determina (S33). No agrega un número.
- Alternativa (c): llevarlo como pregunta, porque toda la evidencia es de esta muestra y del contraste C33, que se diseñó para esto.

**EV-16 · Banderas en un evaluable con una dimensión `unknown`.** Tipo: combinación (se recalcula desde factores).
- Antes (protocolo §2.3): "`true` si alguna dimensión de I tiene `<f>_valor = 5` (D20, respuesta 3); en un riesgo no evaluable, también si una dimensión es `unknown` y su `<f>_max` registrado es 5 (metodología §8.2)". Metodología §8.2: "**Riesgo no evaluable** [E]: las dos banderas aplican si la dimensión tiene valor plausible en el umbral, o si es `unknown` y su `<f>_max` registrado alcanza el umbral."
- Después: "…; si una dimensión es `unknown`, también si su `<f>_max` registrado es 5, sea el riesgo evaluable o no". Lo mismo para `safety_critical` (`i_pers_max ≥ 4`). §8.2: "**Riesgo con una dimensión `unknown`** [E]: …", sin cambio en el resto. Un `unknown` sin `<f>_max` registrado no dispara bandera (lo prioriza la cola, §9.5).
- Fichas: del agente S31-R05 (`safety_critical` pasa a `true`) y S36-R07 (las dos); de Emiliano S08-R03 y S36-R03, a recalcular.
- Efecto: no cambia `C_raw`, banda ni posición. Cierra los `todo` a y a′ del arnés.

**EV-29 · Peor creíble frente al rango de tres niveles (en disputa).** Tipo: asignación.
- Antes (§9.2): "Hay valor defendible cuando la evidencia disponible permite fijar el nivel, o acotarlo a un rango de como máximo tres niveles contiguos (`<f>_max − <f>_min ≤ 2`) con un valor más plausible dentro."
- Después: agregar "El límite de tres niveles se aplica a la duda sobre el valor plausible. Si el valor plausible está fijado o acotado así y el peor creíble (§4.1.4) está más lejos, el factor es evaluable: el peor creíble va a `<f>_max` aunque el rango supere tres niveles, y sólo alimenta el techo y las banderas."
- Fichas: 11 del agente (S02-R07, S03-R01, S03-R04, S04-R01, S04-R03, S22-R04, S22-R06, S22-R08, S28-R07, S36-R02, S36-R04) y S21 (agro-0047); de Emiliano, revisar S02-R07, S04-R03, S28-R07, S36-R04.
- Efecto: S02-R07, S22-R04 y S22-R06 del agente vuelven al ranking. La cola catastrófica queda en el techo y, con EV-16, en la bandera.
- Alternativa: dejar la regla como está y declarar la limitación (b): un riesgo con valor plausible claro sale del ranking por su peor caso.

**EV-30 · Qué es "plausible" para una muerte (en disputa).** Tipo: asignación.
- Antes (§4.3): "\"Plausible\" = el escenario de §4.1.4 lo produce sin suponer coincidencias adicionales."
- Después: agregar "Para Personas este es el criterio del valor, no el resultado más frecuente de §9.1.1: si el escenario puede producir una muerte sin coincidencias adicionales, I-personas es al menos 4 aunque lo más frecuente sea una lesión. Si hace falta una coincidencia adicional, la muerte va a `i_pers_max`."
- Fichas: 32 del agente con `i_pers_valor` ≤ 3 e `i_pers_max` ≥ 4; ninguna de Emiliano (ya lo leyó así en 4 diferencias de `safety_critical`).
- Efecto: `safety_critical` sube desde 29,8% en la población sintética; `C_d` de Personas sube en esas fichas.
- Alternativa: la lectura del agente (mejor estimación de §9.1 también para muertes), que deja la bandera para los casos donde la muerte es lo esperable.

**EV-32 · Medida anticipatoria.** Tipo: asignación.
- Antes (§5.1): "**Contención**: limita **cuánto daño** se produce: detectar, suprimir, aislar, evacuar, rescatar, frenar la pérdida de dinero o de datos, avisar a afectados. Incluye respuesta."
- Después: agregar "Una medida que se activa por el aviso de un evento ya en curso o inminente (alerta meteorológica, alarma de crecida, evacuación preventiva) y limita el daño cuando el evento ocurre es contención, aunque se ejecute antes. Si evita que el evento ocurra, es un control preventivo y va a P."
- Fichas: del agente S35-R02 y las de mineria-0002; de Emiliano S07-R01 (AN-F8-007).
- Efecto: contención mejor en esas fichas. Hay que mirar CP-18 en la regresión, porque es el caso de origen.

**Texto o arnés, sin efecto en fichas conocidas:**
- **EV-18 · Tres lecturas que el arnés no resuelve.** B01 (§3.3 ancla 5): "en los últimos tres años" son 36 meses, incluido el que ocurrió hace exactamente tres años, como en el ancla 4. U07 (§6.2): si la cota de una dimensión con `unknown` es igual a `C_raw`, esa dimensión no se lista como determinante. c (§7.2): si la dimensión `unknown` tiene `<f>_max` registrado ≤ `n`, I efectivo se muestra `n` y no `≥ n`, porque lo desconocido no puede superarlo (el mismo criterio de la cota de §9.3). Tipo: texto, y combinación para c.
- **EV-28 · Texto desactualizado en decisiones-v0.** Decisiones faltantes #3 ("abiertas → Fase 3") pasa a "Resuelta en metodología §3–§5"; #12 ("Parcial") a "Resuelta por protocolo §6.4". Tipo: texto.
- **EV-43 · `prioridad_provisional` en la lista de campos.** Agregarlo a protocolo §2.3 como campo derivado del padre (metodología §1.4.7 ya lo nombra). Tipo: texto.
- **EV-17 · Portar el arnés a la v1 candidate.** Banda, CH-092, las correcciones aprobadas, el hueco de §1.4.5 y un test de la cola §9.5. No cambia reglas.

### 3.2 Salida b · limitaciones declaradas

| Punto | Limitación | Qué la resolvería |
|---|---|---|
| EV-09 | CP-05: `max()` descarta la amplitud del impacto | otro agregador (fuera de v1) |
| EV-12, EV-13 | Banda: 69,6% de acuerdo (n 23) y 13 A1 con el mismo sentido | evaluadores nuevos, Fase 12 |
| EV-14 | Casi no hay casos remotos con consecuencia extrema | casos nuevos (ya declarada por Emiliano) |
| EV-15 | 62,2% en Media; 36,3% de pares separados quedan en la misma banda | juicio del revisor (EV-08) |
| EV-19, EV-25 | Recurrencia por encima de P = 5 (CP-01 R4, CP-12, 6 fichas); 1 de 3 hacia D14 | representación de la recurrencia, versión posterior |
| EV-21 | CP-16, factores en el borde | resolver los bordes y volver a correr |
| EV-23 | Un techo peor puede sacar a un riesgo del ranking (§9.3) | casos con `unknown` reales |
| EV-26 | `consecuencia_extrema` 19,8% (42 de 50 por Económico, 0 por Legal); `safety_critical` 29,8% | población real |
| EV-31 | Una sola contención para todas las dimensiones (7 fichas, 6 notas de Emiliano) | contención por dimensión, que sería mecanismo nuevo |
| EV-33 a EV-36 | Evento menor, ajuste con precursor, eventos crónicos, consecuencias sin fin natural | guía de redacción del evento, Fase 12 |
| EV-38 a EV-42 | Fronteras contención/recuperación, controles previos, procedimiento manual, recuperación `no_aplica` en Personas, causa común con escala saturada | ejemplos en la guía; las reglas ya resuelven |

### 3.3 Salida c · preguntas para la revisión profesional (Fase 12)

Redactadas para un revisor que no vio resultados de Risk OS.

1. **EV-02.** Si una organización no tiene resultado operativo positivo en los últimos tres ejercicios, ¿con qué magnitud compararía una pérdida para juzgar su gravedad: ingresos, fondo de reserva, presupuesto u otra?
2. **EV-06, EV-37.** Ante un evento con una víctima fatal posible, ¿la exposición penal posible de directivos o la clausura de un sector es por sí sola una consecuencia jurídica grave, o depende de la conducta de la organización y de la decisión de la autoridad?
3. **EV-08.** Un riesgo de probabilidad media, consecuencia que amenaza la existencia de la organización y preparación media, ¿debería estar en la misma banda que uno de probabilidad media, consecuencia grave y preparación débil?
4. **EV-10.** Un evento remoto con consecuencia extrema, ¿qué prioridad de atención debería tener frente a eventos probables y moderados?
5. **EV-11.** (CP-18) Un evento probable con consecuencia económica extrema y preparación media: ¿qué banda le daría?
6. **EV-20.** Entre un evento remoto que puede matar a una persona y paralizar la operación meses, y uno probable que causa una pérdida moderada, ¿cuál atendería primero y por qué?
7. **EV-22.** Si dos riesgos tienen la misma prioridad calculada, ¿qué criterio usaría para ordenarlos, o los dejaría empatados?
8. **EV-24.** ¿Le parece razonable combinar probabilidad, consecuencia y vulnerabilidad multiplicando niveles de 1 a 5, sabiendo que otra numeración de los mismos niveles podría cambiar el orden?

### 3.4 Salida d · fuera de v1

- **EV-27.** Procedencia por factor (`<f>_base`, `<f>_evidencia`) y `review_status` por ficha: campos del experimento. Destino: Fase 15 (EMI-16). No se borran.
- **EV-44.** `todo` J01 y e del arnés: criterios para juzgar casos de propiedad, no reglas de v1.
- **EV-45.** D9, bandera de revisión prioritaria: no está implementada y ninguna pantalla la usa.

## 4. Antisobremodelado

Cada regla tiene que nombrar la pantalla u operación de Risk OS v1 que la usa (priorizar, ordenar la lista, matriz, plan de acción, transferencia, historial, vistas de §13) o queda fuera.

| Regla | Uso en Risk OS v1 |
|---|---|
| §1 granularidad, padre (§1.4) | ordenar la lista (posición del padre); plan de acción (hijos) |
| §2 evento y corte P/V; §3 P | priorizar, matriz |
| §4 I por dimensión | priorizar, matriz, movimiento por dimensión |
| §4.6 equivalencia | guía de evaluación; ninguna pantalla (hipótesis de calibración) |
| §5 contención y recuperación | priorizar, plan de acción (la acción nombra el aspecto), movimiento |
| §6 `C_raw` y banda | priorizar, ordenar la lista, matriz |
| §6.6 techo plausible | **sin pantalla nombrada**: o se asigna a la vista de no evaluables y cola, o sale de v1 |
| §7 D10 | ordenar la lista. El paso 1 (banda) nunca cambia el orden respecto del paso 2: queda como explicación |
| §8 banderas | vista de seguridad, filtro de extremos |
| §9 unknowns, no evaluables, cola | vista de no evaluables y cola de validación |
| §10 causa común | escenarios agregados |
| §11 dinámica, acciones, transferencia | plan de acción, transferencia, historial |
| §12 observación por factor | historial y detalle del riesgo |
| §14 propiedades | tests de EMI-16, no pantalla |

**Para marcar en la 11b:**
- **Sin uso:** D9 revisión prioritaria (EV-45); `reputacion_texto` (D13), que necesita una pantalla de detalle nombrada o sale.
- **Detalle y explicación (P3):** `v_aspectos_aplicables`, `i_efectivo_dimensiones`, `reglas_aplicadas`, `justificacion`.
- **Sólo experimento:** §14.8 (recodificación), P4 y P7; y los campos `corrida_id`, `fase`, `version_protocolo`, `informacion_ref`, `caso_empresa`, `anomalias`, `<f>_base`, `<f>_evidencia`, `review_status`, `revisado_por`, `fecha_revision`. Van marcados para la Fase 15, no se borran.

## 5. Plan para la 11b

1. Copiar tus decisiones en `v0/fase-11/decisiones-11a.md`.
2. Aplicar las correcciones aprobadas en el borrador con marca [F11-n] y los casos de origen.
3. Regresión (§13): EV-16 y la parte c de EV-18 se recalculan desde factores. EV-01, 03, 04, 05, 29, 30 y 32 piden fichas nuevas del agente en `v0/fase-11/reevaluacion/` (`cambio_version_metodologia`, `pending`). Revisar CP-18 si se aprueba EV-32.
4. Listar las fichas de Emiliano afectadas, sin reevaluarlas: S22-R02, S32-R03 (EV-04); S19-R06, S37-R03 (EV-03); S02-R07, S04-R03, S28-R07, S36-R04 (EV-29); S13-R05, S12-R05, S08-R03 (EV-01); S08-R03, S36-R03 (EV-16); S07-R01 (EV-32); y las que la regresión encuentre.
5. Repetir las verificaciones de la Fase 10 (D23, orden por banda, `calibrar.py`).
6. Portar el arnés y anotar pass, fail y `todo`.
7. Escribir y congelar la v1 candidate en `v1/` sólo después de tu sí.

---

## Para decidir

**1. D14.** Propuesto 1 de 3 (G3). ¿Cuentan los pares S22-R02/R03, S27-R02/R06 y S31-R02/R01?
- **A (recomendada): no cuentan.** Ninguno tiene adjudicación tuya previa a la corrida. S22 se invierte por factores, y S27 y S31 son la misma familia G2 que CP-01 R1/R5.
- B: adjudicás ahora el orden de S27 y S31 y valen para la próxima corrida, como un solo caso G2.
- C: la intención de diseño vale como adjudicación previa. Cambia protocolo §9.

**2. EV-01, ficha con escenarios mezclados (en disputa).** A (recomendada): el texto propuesto (el más frecuente si se sabe; si no, `unknown`). B: la lectura del agente. C: limitación (b).

**3. EV-03, ART como transferencia.** A (recomendada): corregir. B: pregunta para la Fase 12.

**4. EV-04, comparabilidad de jerarquía 1.** A (recomendada): corregir. B: pregunta para la Fase 12.

**5. EV-05, degradación sin mínimo.** A (recomendada): corregir con "redundancia natural", sin número. B: pregunta (c).

**6. EV-16, banderas en evaluables con `unknown`.** A (recomendada): corregir. B: dejar el hueco como limitación.

**7. EV-29, peor creíble y tres niveles (en disputa).** A (recomendada): corregir; el límite es sobre la duda del plausible. B: limitación (b).

**8. EV-30, muerte plausible (en disputa).** A (recomendada): la lectura de §4.3. B: la mejor estimación de §9.1.

**9. EV-32, medida anticipatoria.** A (recomendada): corregir. B: limitación.

**10. EV-18, EV-28, EV-43 y EV-17 (texto y arnés).** A (recomendada): aplicar los cuatro. B: separarlos.

**11. Salidas b, c y d en bloque** (20 limitaciones, 9 puntos en 8 preguntas, 3 fuera de v1; sección 3). A (recomendada): aceptar en bloque. B: decime qué puntos separás.

**12. Los cinco veredictos.** A (recomendada): aceptarlos como están, incluido "casos satisfactorios: se cumple con limitación". B: cambiar alguno.

**13. Crear la v1 candidate.** A (recomendada): sí, en la 11b, con las correcciones aprobadas y las limitaciones declaradas. B: no todavía; lo que decidas se trabaja como v0.4 con su propia regresión.
