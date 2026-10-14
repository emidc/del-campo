# Dossier de cierre · EMI-15 · Fase 13

> 2026-10-14 · BOS / Risk OS · T-0021 · Fase 13 · sobre la **metodología v1 candidate** congelada (`v1/congelamiento.md`) y la Fase 12 cerrada (PR #72, `main` en `7471463`). Fase de verificación: no cambia ninguna regla, no edita la v1 candidate y no valida fichas. Todo lo que dice "propongo" lo decidís vos en el **Para decidir**.
> Entregables: `criterios-cierre-emi15.csv` (22 criterios), `registro-discrepancias.csv` (66 filas), este dossier y `anexo-changelog-fase-13.md`.

## Resumen

1. **Criterios:** de 22 (12 del plan y 10 de EMI-15 en Linear), 8 cumplidos, 11 cumplidos con limitación, 3 para que decidas vos (calibración de bandas, falsa precisión y la validez de `P × I × V`). Ninguno queda en "no cumplido".
2. **D14, propuesta: 2 de 3, no falsada.** S06 suma un caso (R01/R05 y R04/R05 juntos). **La lectura adversa llega a 3 de 3**, si contás los dos pares como casos independientes: ver §5.
3. **`P × I × V`, recomendación: opción b**, válida provisionalmente para Risk OS v1 **como índice de tamizaje, no como orden final**, con condiciones antes de EMI-16 y disparadores concretos para reabrir.
4. **Metodología:** promover la v1 candidate a v1 sin cambios de regla y llevar las propuestas de la Fase 12 a una v1.1 con su regresión. Todas las de no compensación son de combinación y se recalculan desde los factores guardados, así que no bloquean EMI-16.
5. **EMI-15:** recomiendo cerrarla con 3 y 4. Es una recomendación ajustada, porque el revisor rechazó el índice como orden principal. Si preferís esperar la v1.1, la opción es dejarla abierta (Para decidir, punto 5).
6. EV-11-0063 y EV-11-0064 ya están aceptadas (2026-10-13), así que no hace falta reportar dos variantes.

---

## 1. Punto de partida

**Huellas.** Recalculé los SHA-256 de la tabla de `v1/congelamiento.md` sobre `main` (`7471463`). Coinciden 15 de 17. No coinciden `v0/fase-11/reevaluacion/fichas-ronda-2.csv` ni `fichas-ronda-2-factores.csv`. El cambio está explicado y autorizado en `v0/fase-11/aceptacion-fichas-emiliano-2026-10-13.md`: aceptaste EV-11-0063 y EV-11-0064 ("Acepto ambas fichas", 2026-10-13) y se cambiaron sólo `review_status`, `revisado_por` y `fecha_revision` de esas dos filas, como permite la regla 5 del congelamiento. Las huellas posteriores que registra ese documento coinciden (`7c8472b3…` y `5e96850b…`). Ningún archivo de reglas cambió, así que la Fase 12 corrió sobre la versión congelada.

**Arnés y verificación.** `node --run test` en `SPIKES/T-0021/regresion-ejecutable/`: 213 tests, 211 pass, 0 fail, 2 `todo` (EV-44), igual que en el congelamiento. `verificar-piloto.mjs` de la Fase 12: `PASS: 144 derivados y posiciones coinciden entre Python y TypeScript; 12 fichas, sin cambiar factores.`

**Dónde está la Fase 12.** En el repo (`v0/fase-12/`, PR #72), no en la carpeta compartida del proyecto. Aprobación escrita: `v0/fase-12/reporte-fase-12.md` y `fuentes/respuestas-emiliano.md` ("quiero cerrar la fase 12 con el piloto profesional hecho por mi", 2026-10-13).
- **Casos:** S06 (cámara frigorífica PyME, sintético de EMI-41), seis riesgos. No estaba entre tus 30 fichas de la Fase 8. Sus fichas del agente sí están dentro de la muestra que corrigió la v1 (S06-R02 cambió por F11-7).
- **Revisores:** uno, vos. Evangelina y Manuel no participaron; cerraste la fase sin ellos.
- **Exposición:** declaraste no conocer S06. El orden A se cerró antes de ver rúbricas y resultados (SHA-256 `4b456e73…`) y los factores B antes de revelar la referencia (`27922352…`). Las ocho respuestas de §16 son posteriores a la revelación. El piloto fue guiado: el coordinador señaló lecturas de regla durante B, y corregiste P, contención e I-continuidad de R03 antes de cerrar. La coordinación conocía los resultados generales de la Fase 11.

**Fichas pending.** Las 255 fichas del agente y tus 30 de la Fase 8 siguen en `review_status = pending`, igual que 62 de las 64 de la Fase 11 y las 6 de la Fase 12. Es un campo del experimento (metodología §17, EV-27); no propongo validarlas.

**Dos copias que no coinciden.** La carpeta compartida no tiene `v0/fase-12/`. Además, `fuentes/respuestas-emiliano.md` del repo sólo tiene las respuestas de la Fase 12 y perdió las históricas (preguntas 1 a 9, F3-1 a F3-6), que sí están en la copia compartida. No toqué ninguna de las dos; va en el Para decidir, punto 6.

## 2. Criterios de cierre

Detalle por fila en `criterios-cierre-emi15.csv`. Los que no son "cumplido":

| Criterio | Dictamen | Qué falta |
|---|---|---|
| P02 P/I/V definidos | con limitación | §4.6 sigue como hipótesis. El revisor objeta el techo de I-económico en 5 y la equivalencia de Personas 5 con Económico 5. No hay referencia económica sin RO positivo (S12 no tuvo ventas) |
| P03 Unknowns | con limitación | `evaluable` 23/30 (Fase 8 original 24/30, kappa 0,20). La Fase 12 no tuvo ningún factor `unknown` |
| P04 Reglas dinámicas | con limitación | Los motivos `accion_ejecutada`, `informacion_nueva` y `cambio_contexto` sólo aparecen en 6 fichas de CP-04, CP-10, CP-18 y CP-19, y CP-10 y CP-19 son casos de origen. Nunca hubo una reevaluación real con acción, eficacia o transferencia |
| P05 Casos de propiedad | con limitación | 13 PASS (8 circulares), 4 FAIL estructurales y 3 de calibración; la Fase 12 no los toca |
| P08 Reproducibilidad | con limitación | Fase 8, n 30, dentro de muestra. Fase 12, n 6, un revisor y guiada; la referencia es la ficha histórica del agente. No hay evaluador nuevo |
| P09 Calibración de bandas | **decide Emiliano** | 69,6% < 70% sin cambio. Tus respuestas EV-08 y EV-11 contradicen la banda de esos perfiles |
| P10 Discrepancias | con limitación | 93 filas de la Fase 12 sin causa individual (ver §3) |
| P11 Revisión profesional | con limitación | Un profesional, que además adjudicó los casos y aprobó cada regla |
| P12 Validez de `P × I × V` | **decide Emiliano** | §5 |
| L02 Combinación y desconocido | con limitación | D10 a fondo (CP-07) y P12 |
| L06 Discrepancias y ajustes | con limitación | Las propuestas de la Fase 12 no tienen destino decidido |
| L07 Explicable y repetible | con limitación | El producto amplifica diferencias de un nivel: `C_raw` igual en 10 de 23 pares (Fase 8) |
| L08 Sin falsa precisión | **decide Emiliano** | Va con P12: EV-24 lo plantea, y la Fase 5 ya mostró que recodificar 1-2-3-5-8 invierte 3 pares de casos y cambia 125 de 1.128 pares entre fichas |
| L10 Lista para `risks.csv` | con limitación | §7 de este dossier |

## 3. Registro de discrepancias

`registro-discrepancias.csv` junta 66 filas sin recalcular nada: Fase 4 (15), Fase 5 (5), Fase 8 (10), Fase 9 (17), Fase 11 (3) y Fase 12 (16, que agrupan los 112 registros del piloto).

**Fase 12, discrepancias sin causa nombrada: 93 de 112.**
- **2 de valor**, las más importantes: S06-R02 contención (referencia 2, revisor 1) y S06-R03 I-continuidad (3 y 2). Ningún documento de la Fase 12 las explica.
- **91 de rango y procedencia**, todas "abiertas" y sin explicación individual en `discrepancias.csv`: 52 de rango, muchas con rango registrado de un lado y vacío del otro, y 39 de procedencia, que del lado humano clasificó el coordinador y no vos.

Las otras 19 tienen causa:
- 6 diferencias de valor: P y recuperación de R03, Personas de R04, contención y recuperación de R05, y contención de R06.
- 11 derivados de esas diferencias.
- Las 2 inversiones de orden, que son desacuerdo de criterio profesional.

Aparte quedan dos tipos de fila que no son diferencias contra la referencia:
- Personas de R06: los dos dan 3, pero la regla de muerte directa (CH-106) podría pedir 4. Es un posible error de aplicación que nadie dictaminó.
- Errores de lectura de anclas que corregiste durante B: los cortes económicos de R02 y R06, y los antecedentes de R03.

## 4. Las cinco condiciones después de la Fase 12

| Condición | Antes (v1 candidate) | Evidencia fuera de muestra (Fase 12) | Estado que propongo |
|---|---|---|---|
| 1. Casos de propiedad | Suficientes para candidate; no validados independientemente | Ninguna: la Fase 12 no corrió casos de propiedad | Sin cambio |
| 2. Divergencias interpretables | Se cumple con limitación | Las 2 inversiones tienen explicación mecánica completa y fundamentos profesionales escritos. De 8 diferencias de factor, 6 tienen causa y 2 no (n 6 riesgos, 41 pares numéricos) | Sin cambio. No hubo repetición independiente: el revisor es el mismo evaluador humano de la Fase 8 |
| 3. Bandas que discriminan | No alcanza el target; aceptable provisionalmente | Banda 6/6 contra la referencia histórica (n 6, guiada, otra muestra: no cambia el 69,6% preregistrado). EV-08 y EV-11 contradicen la banda de dos perfiles | Sin cambio en el número; agregar el desacuerdo profesional sobre EV-08 y EV-11 |
| 4. Ranking profesionalmente defendible | Prometedor/provisional, pendiente de validación profesional | Orden A contra B: 13/15 pares (n 15, una empresa), tau-b 0,733. Rechazaste las 2 inversiones después de conocer su explicación. EV-24: no aceptás el producto como orden principal | **No validado como orden principal por la revisión profesional; aceptado sólo como tamizaje con condiciones** |
| 5. Regresión estable | Se cumple | Arnés y piloto reverificados (211/0/2; 144 derivados) | Sin cambio |

**Las ocho preguntas de §16.** Todas las contestaste vos, después de la revelación. Es una sola respuesta por pregunta y no la convierto en conclusión.

| Pregunta | Respuesta | Frente a la v1 candidate |
|---|---|---|
| 1. EV-02, referencia sin RO positivo | Facturación neta de impuestos, con patrimonio neto tangible y liquidez como controles, recalibrada | **No alcanza para decir.** §4.2 paso 3 ya admite "otra medida nombrada y justificada" pero no la calibra. Tu propuesta no aplica a S12, que no tuvo ventas |
| 2. EV-06/37, penal o clausura con una víctima fatal | Depende de conducta, conocimiento, rol, causalidad y autoridad. Legal 4 con omisiones evidentes y rol de garante | **Contradice en parte.** El ancla 4 de §4.5 da 4 por responsabilidad penal *posible*; tu criterio es más exigente |
| 3. EV-08, amenaza existencial con preparación media frente a grave con preparación débil | No deberían compartir banda | **Contradice.** Con P 3 la v1 deja a los dos en Media (45 y 48) |
| 4. EV-10, remoto extremo frente a probable moderado | Prioridad estratégica para el remoto si es terminal; táctica para el probable | **Contradice** el orden por `C` (D23: P 1 llega como máximo a Media). La bandera `consecuencia_extrema` lo deja visible, sin orden |
| 5. EV-11, probable, económico extremo y preparación media | Crítica incondicional | **Contradice.** P 4 · I 5 · V 3 da 60, Alta |
| 6. EV-20, remoto fatal frente a probable moderado | El remoto primero, incondicional | **Contradice.** Es el patrón G2 de CP-01 R1/R5 |
| 7. EV-22, empates | No dejarlos: Personas, Legal penal directa, causalidad sistémica, irreversibilidad, inminencia | **Coincide en parte.** D10 usa Personas después de `C` e I efectivo y admite empate legítimo; los otros cuatro criterios no son campos de la ficha |
| 8. EV-24, multiplicar niveles de 1 a 5 | No como orden principal; sí como tamizaje con no compensación, vector visible y orden fino profesional | **Contradice el uso de `C` para ordenar la lista** (§7, §18) |

## 5. Dossier de D14

**Conteo al cierre de la Fase 11:** 1 de 3, no falsada (CP-01 R4 y CP-12, recurrencia, G3). No cuentan S22, S27 y S31 (sin adjudicación previa). CP-01 R1 y CP-16 son dudosos.

**Candidatos de la Fase 12:** S06-R01/R05 y S06-R04/R05. Tu orden A pone R01 y R04 sobre R05; la v1, con tus propios factores B, da R05 80 > R01 75 > R04 60.

| Pregunta de protocolo §9 | Lectura |
|---|---|
| ¿Adjudicado antes? | En el sentido del protocolo, sí: el orden quedó escrito y con huella antes de ver rúbricas y resultados. En la letra hay una duda: la v1 ya había corrido sobre las fichas S06 del agente el 2026-10-11 (F11-REG-01), antes de tu orden A, aunque no las viste. La confirmación del fallo es tu dictamen del 2026-10-13, no una adjudicación de Fase 5 |
| ¿Es un fallo de la combinación y no de asignación? | Sí. El mismo orden sale con tus factores y con los del agente (15/15 pares). A diferencia de S22, no hay desacuerdo de factores que lo explique |
| ¿Corrección por bandas? | No. Las bandas son cortes monótonos sobre `C` y nunca invierten un orden (Fase 10) |
| ¿Corrección por desempates de D10? | No. Los `C` son distintos (80 contra 75 y 60) y D10 no llega a actuar |
| ¿Corrección por redacción de anclas? | Formalmente hay una, sin probar. Si una redacción de rúbrica bajara la contención de R05 de 4 a 3 (o su P de 4 a 3), R05 queda en 60: R01 75 lo supera y R04 le gana el empate por Personas 5. Pero los dos evaluadores dieron a R05 V económico 4 por caminos distintos, ninguna ancla está señalada como defectuosa en ese punto, y la corrección no toca tus razones (magnitud por encima de I 5, pasivos, vida). Sería ajustar la regla al resultado, no calibrar un ancla ambigua |
| ¿Independiente de lo ya contado? | Sí. G3 es saturación de P por recurrencia; la P 5 de R01 sale de un ajuste, no de recurrencia. No es G2 (R05 no es moderado: I 5). Toca en parte CP-05 (max() descarta amplitud: R04 tiene tres dimensiones en 5), pero tu razón es la vida, no la amplitud |
| ¿Los dos pares son uno o dos casos? | Mismo caso (S06), mismo riesgo que sube (R05), una sola razón de fondo (el producto compensa un I 5 cualitativamente más grave con P o V, EV-24). Cualquier cambio a R05 arregla los dos. Leídos por familia de regla, en cambio, son dos: techo de I-económico en un par, equivalencia Personas = Económico en el otro |

**Propuesta: 2 de 3, no falsada.** S06 cuenta como un caso. La distingo de CP-01 R1 y CP-16, que quedaron dudosos porque tenían un ancla o factores de borde señalados como problema; acá no.

Las otras dos lecturas posibles:
- **1 de 3** si seguís el precedente al pie de la letra: hay una corrección de rúbrica formalmente posible y sin probar, y entonces S06 queda dudoso hasta correr esa regresión.
- **3 de 3** si contás los dos pares como familias independientes. **Con esa lectura D14 queda falsada** y corresponde la opción c.

### Opciones sobre la validez provisional de `P × I × V`

**a. Válida provisionalmente para Risk OS v1**, con las limitaciones declaradas. `C` sigue ordenando la lista. Contradice tu EV-24, que no acepta el producto como orden principal.

**b. Válida con condiciones (recomendada).** Además de a, `C` se usa como índice de tamizaje y no como orden final. Condiciones antes de cerrar EMI-16:
1. El contrato de `risks.csv` y la lista de Risk OS muestran `C` siempre junto al vector (P, las cuatro dimensiones de I, contención, recuperación) y las dos banderas, nunca solo. Los datos ya existen (§13), así que no hay cambio de regla.
2. Decidís si la "pista no compensatoria" que propusiste es la vista de seguridad que ya existe (`safety_critical`, Personas ≥ 4, §8.2 y §13) o si necesita además Legal ≥ 4. Si necesita Legal, es la v1.1 con regresión y no entra en EMI-16.
3. EMI-16 define cómo se registra un reordenamiento profesional: como discrepancia con causa, para que el uso alimente D14.

**c. No validada.** Se reabre D14 y EMI-15 no se cierra. La alternativa ya nombrada es la de metodología §19: tabla de decisión o agregador por escenarios. No propongo otra.

**Disparadores que reabren (para a o b):**
1. **Tercer caso:** un par que un profesional ordenó por escrito antes de ver Risk OS, que la v1 invierte con los factores de ese mismo profesional, que no se arregla con bandas, redacción de anclas ni desempates (probado con la regresión de §13), y que no es G3 ni de la familia S06. Con el conteo en 2, eso es 3 de 3: D14 falsada y opción c.
2. **Repetición de la familia S06:** dos reordenamientos profesionales del mismo patrón (un I 5 de Personas o un daño mayor que el techo económico queda debajo de un I 5 económico por P o V) en dos empresas reales distintas durante los primeros ciclos de EMI-16. No suman a D14 (protocolo §9, variante en otra empresa), pero abren la v1.1 con tus propuestas de no compensación.
3. **Bandas en uso:** coincidencia de banda entre un profesional y Risk OS por debajo de 70% con n ≥ 23 riesgos evaluados por los dos. Abre la recalibración de D12.
4. **Seguridad:** un riesgo `safety_critical` que el profesional pone en el top-3 de una empresa real y Risk OS deja debajo de un riesgo sólo económico. Se registra cada vez; con dos, v1.1.

**Por qué b.** Con la pregunta 8 a la vista, la a contradice tu respuesta y la c no tiene todavía el tercer caso que la regla preregistrada exige. Además, lo que pediste en EV-24 es, en su mayor parte, uso y presentación (vector visible, orden fino profesional), que EMI-16 puede cumplir sin tocar reglas. Con el conteo en 2 de 3, la b deja escrito qué evidencia la tumba.

## 6. Estado de la metodología al cerrar

| Opción | Qué implica |
|---|---|
| **Promover la v1 candidate a v1 sin cambios de regla (recomendada)** | `v1/metodologia-v1.md` con el mismo cuerpo, encabezado nuevo y secciones de estado actualizadas (cinco condiciones, limitaciones, D14, puntos abiertos). EMI-16 parte de una versión estable. Las propuestas de la Fase 12 van a una v1.1 |
| Dejar EMI-15 abierta hasta una v1.1 | Hace falta una fase de corrección como la 11b, con regresión, antes de cerrar. EMI-16 espera o arranca sobre una candidate |
| Cerrar EMI-15 sobre la v1 candidate | Igual que promover, sin el nombre v1. EMI-16 depende de un archivo marcado "candidate" |

Cambios de regla que sugirió la Fase 12, sin aplicar. Conté las fichas sobre la última de cada cadena de la v1: 252 del agente que no son padre y 30 tuyas.

| Propuesta | Origen | Tipo (protocolo §13) | Fichas que afectaría (agente / tuyas) |
|---|---|---|---|
| Pista o veto no compensatorio por Personas ≥ 4 o Legal ≥ 4 | EV-24 | combinación | 100 / 14 con alguna de las dos ≥ 4; 83 de ellas evaluables del agente no están en Crítica |
| Vector siempre visible | EV-24 | ninguno: presentación (EMI-16) | 0 |
| Crítica incondicional para P ≥ 4, I-econ 5 y preparación media | EV-11 | combinación (piso de banda) | 10 / 1 evaluables con P ≥ 4, I-econ 5 y `C` < 75 |
| Banda o tratamiento propio para amenaza terminal | EV-08, EV-10/20 | asignación: "terminal" no es hoy un factor y hay que definirlo | no calculable sin la definición; de referencia, `consecuencia_extrema` 61 / 13 |
| Desempate Personas → Legal penal directa → causalidad sistémica → irreversible → inminencia | EV-22 | combinación en Personas; asignación en el resto (no son campos) | pares con igual `C` en una misma empresa: 61 del agente (33 también con igual I efectivo); 0 tuyos |
| Facturación neta como referencia sin RO positivo, con liquidez y solvencia | EV-02 | asignación (§4.2) | S36 y S12: 13 / 4 (S12 no tuvo ventas) |
| Criterio jurídico contextual para Legal 4 | EV-06/37 | asignación (§4.5) | Legal ≥ 4: 87 / 12 |
| Distinguir pérdidas por encima de I-econ 5 y pasivos | dictamen R01/R05 | asignación (cambia la escala, D4/D5) | I-econ 5: 39 / 2 |
| Dependencia causal entre riesgos (R01 → salida de clientes) | dictamen | asignación (objeto o escenario nuevo, §10) | no calculable |

Las de combinación se recalculan desde los factores guardados. Las de asignación piden reevaluar esas fichas con `cambio_version_metodologia`. Pistas, pisos y vetos son mecanismo nuevo según protocolo §9: si se adoptan, no cuentan como corrección simple.

## 7. Lista para `risks.csv`

**Lo que la Fase 15 necesita de la ficha** (plan, Fase 15; metodología §13 y §14):
- **Identidad:** `risk_id`, `tipo_objeto`, `riesgo_padre_id`, `miembros`, causa → evento → consecuencia.
- **Factores:** `p`, `i_econ`, `i_pers`, `i_cont`, `i_legal`, `v_cont`, `v_rec`, cada uno con `_valor`, `_min` y `_max` y estado (valor, `unknown`, `no_aplica`), y `_observacion`. Además `uncertainty` y su nota.
- **Evaluabilidad:** `evaluable`, `motivo_no_evaluable`, `necesidad_validacion`.
- **Derivados,** como salidas de funciones puras versionadas y no como datos editables: `i_efectivo`, `i_efectivo_dimensiones`, `v_aspectos_aplicables`, `c_dimension_determinante`, `c_raw`, `banda`, `techo_plausible`, `consecuencia_extrema` y sus dimensiones, `safety_critical`, `prioridad_provisional`.
- **Historial:** `version_metodologia`, `evaluacion_anterior_id`, `motivo`, `fecha`, `accion_id` (los campos `accion_*` van a `action-plan.csv`), `reglas_aplicadas`, `justificacion`.

**Sólo del experimento** (§18; no se borran): `corrida_id`, `fase`, `version_protocolo`, `informacion_ref`, `caso_empresa`, `anomalias`, §14.8, P4 y P7. Sin uso en v1: `reputacion_texto` y la bandera D9.

**Tensión que decide EMI-16.** El plan pone en `risks.csv` "evidencias por factor; procedencia; review_status", mientras que §17 y §18 marcan `<f>_base`, `<f>_evidencia`, `review_status`, `revisado_por` y `fecha_revision` como campos del experimento con destino Fase 15 (EV-27, EMI-17). Con la opción b, EMI-16 también define cómo se muestra `C` junto al vector y cómo se registra un reordenamiento profesional.

## 8. Lo que queda abierto

| Punto | Origen | Destino propuesto |
|---|---|---|
| Recurrencia por encima de P = 5 (G3) | §19, EV-19, EV-25 | versión posterior |
| CP-01 R1 (ancla 1 de P) y CP-16 (bordes), dudosos hacia D14 | §19, EV-21 | versión posterior |
| D10 a fondo (CP-07) | §19; EV-22 respondida | v1.1 |
| Validez del producto | §19 | se decide en esta fase; disparadores en uso (EMI-16) |
| Procedencia por factor frente a EMI-17; `review_status` | §19, EV-27 | Fase 15 (EMI-16) |
| `max()` descarta amplitud (CP-05) | EV-09 | versión posterior |
| Banda 69,6% y el agente una banda abajo | EV-12, EV-13 | evaluadores nuevos (issue nuevo, propuesto) |
| Pocos remotos con consecuencia extrema | EV-14 | issue nuevo, propuesto (casos nuevos) |
| Media 61,3%, bloque 45–48 | EV-15 | v1.1 (va con EV-08 y EV-11) |
| Techo que saca del ranking; frecuencia de banderas | EV-23, EV-26 | uso real (EMI-16) |
| Una sola contención | EV-31 | versión posterior |
| Guía de redacción del evento; fronteras contención/recuperación, controles previos, `no_aplica` | EV-33 a EV-42 | Fase 15 (guía), con lo nuevo de la Fase 12: frontera I/V de R05 y recuperación parcial probada frente a informal (§5.4) |
| Propuestas de no compensación (pista o veto, piso EV-11, amenaza terminal, lexicografía EV-22) | Fase 12 | **issue nuevo, propuesto:** "Risk OS · metodología v1.1: propuestas de la revisión profesional", con casos adjudicados y regresión |
| Referencia económica alternativa con liquidez (EV-02), Legal contextual (EV-06/37), magnitud por encima de I 5, dependencia causal | Fase 12 | el mismo issue de v1.1 |
| Personas de R06 frente a CH-106 | Fase 12 | v1.1 (adjudicar) |
| 93 discrepancias de la Fase 12 sin causa individual | Fase 12 | v1.1, junto con las propuestas |
| Revisores distintos de Emiliano | plan, Fase 12 | opcional: issue nuevo, propuesto |
| `fuentes/respuestas-emiliano.md`: el repo perdió las respuestas históricas | este dossier, §1 | PR de esta fase: unir las dos copias sin cambiar ningún texto |

No creé ningún issue en Linear.

---

## Para decidir

**0. EV-11-0063 y EV-11-0064.** No hace falta decidir: las aceptaste el 2026-10-13. Las métricas oficiales quedan `evaluable` 23/30 y banda 16/23; el 24/30 = 80% es el de la Fase 8 original.

**1. Conteo de D14.**
- a. **2 de 3**: S06 cuenta como un caso, no falsada **(recomendada)**.
- b. 1 de 3: S06 queda dudoso hasta probar la corrección de rúbrica de R05.
- c. 3 de 3: los dos pares son casos independientes; D14 falsada y punto 2 = c.

**2. Validez provisional de `P × I × V`.**
- a. Válida provisionalmente; `C` ordena la lista.
- b. **Válida con condiciones, como índice de tamizaje**, con las tres condiciones de §5 y los cuatro disparadores **(recomendada)**.
- c. No validada; se reabre D14 y EMI-15 no se cierra.

**3. Calibración de bandas (P09).**
- a. **Queda como limitación declarada**: 69,6%, más tu desacuerdo con la banda de EV-08 y EV-11, que va a la v1.1 **(recomendada)**.
- b. No cumplido: EMI-15 espera una recalibración.

**4. Falsa precisión (L08).** Sigue al punto 2. Con a o b queda "cumplido con limitación"; con c, "no cumplido".

**5. Estado de la metodología.**
- a. **Promover a v1 sin cambios de regla** y llevar lo de la Fase 12 a la v1.1 **(recomendada)**.
- b. Dejar EMI-15 abierta hasta la v1.1, con una fase de corrección como la 11b.
- c. Cerrar sobre la v1 candidate sin promoverla.

**6. Destino de lo abierto (§8), en bloque.**
- a. **Lo aceptás como está** **(recomendada)**. Incluye los issues propuestos y unir las dos copias de `respuestas-emiliano.md` en la PR de esta fase.
- b. Separás las filas que quieras cambiar.

**7. ¿Se cierra EMI-15?**
- a. **Sí, pasa a Done** **(recomendada si elegís 2b y 5a)**. Necesito que lo digas por escrito.
- b. No todavía.

Con tus respuestas escribo `decisiones-13.md`, agrego las filas del anexo al changelog con los ids libres, escribo `v1/metodologia-v1.md` y `v1/congelamiento-v1.md` si promovés, abro la PR desde `task/T-0021-fase-13-cierre-emi15` y dejo el comentario en EMI-15.
