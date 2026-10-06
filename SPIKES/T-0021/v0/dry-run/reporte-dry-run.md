# Reporte del dry run · Fase 4

> Plantilla de `protocolo.md` §8. Completar sin borrar secciones; si una no aplica, escribir "no aplica" y por qué.
> Corrida `F4-DR-01` · metodologia v0.1 · protocolo v0.1 · 2026-10-05 · agente: sesión del thread "Fase 4 dry run" (distinta de la que escribió la metodología). Todo lo de este reporte es propuesta: lo adjudica Emiliano en la Fase 5.

## Resumen

1. Se corrieron los 20 casos: 51 fichas (`fichas-dry-run.csv`) y 156 anomalías (`registro-anomalias.csv`), de las cuales 131 son A1 contra el anexo de diseño.
2. **PASS: 5** (CP-09, CP-11, CP-15, CP-17, CP-18). Ninguno es del todo no circular; sólo dos aportan evidencia no circular en parte: el orden de CP-15 (R2 sobre R1 por el producto) y que la póliza de CP-09 no mueva ningún factor.
3. **FAIL: 15.** Contradicción 12 (CP-01, 02, 03, 05, 06, 07, 08, 12, 13, 14, 16, 20) · definición 1 (CP-19) · combinación 1 (CP-04) · ranking 1 (CP-10).
4. Una sola contradicción explica 11 de las 12: §4.2.3 manda `i_econ = unknown` cuando no se conoce el margen de contribución (nunca se conoce en los casos), y §9.2 dice que un rango de hasta tres niveles es un valor defendible (AN-0001). Con la lectura literal, 8 riesgos salen del ranking. Con la de §9.2, CP-14 pasaría, CP-02, 05, 06, 08 y 13 tendrían el orden correcto pero quedarían en FAIL por definición (anomalías propias), y CP-01, 03, 07, 16 y 20 seguirían fallando.
5. **D14:** propongo **1 caso de 3** que no tiene corrección simple: la regla V_d = "el peor de contención y recuperación" (§5.5). Explica CP-01 (R3 y R2 sobre R1), CP-03, que CP-04 no se mueva con el sitio alternativo, CP-10 y CP-19 (mayo y julio). Todos fallan por la misma regla, así que cuentan como uno. Un segundo candidato (remoto y catastrófico debajo de probable y moderado: CP-01 R5 sobre R1, CP-04 antes) parece corregible con las anclas económicas, y eso hay que verificarlo con la regresión. No declaro nada falsado.
6. Las tres anomalías que más pesan son estas. AN-0003 y AN-0019: con V_d = "el peor de los dos", una contención probada no baja la criticidad si la recuperación es débil, y una recuperación probada no la baja si la contención es débil; por eso cuatro mejoras reales no mueven `C_raw`. AN-0001 y AN-0002: la regla del margen vuelve no evaluables 8 riesgos. AN-0018 y AN-0025: el producto cambia lo remoto y catastrófico por lo probable y moderado; recodificar los niveles como 1, 2, 3, 5, 8 da vuelta 5 pares, y 3 de ellos quedan como lo adjudicado.

---

## 1. Corrida

| Campo | Valor |
|---|---|
| `corrida_id` | F4-DR-01 |
| Versión de metodología (congelada) | metodologia v0.1 (`metodologia-v0.md`, md5 `d563766b…` al empezar; no se editó) |
| Versión de protocolo | protocolo v0.1 (md5 `888f203d…`) |
| Fecha de inicio / cierre | 2026-10-05 21:08 UTC / 2026-10-05 21:32 UTC |
| Casos de propiedad ejecutados | 20 de 20 adjudicados |
| Casos no ejecutados y por qué | Ninguno entero. Hay dos momentos sin ficha. **CP-09 y CP-17 "después"**: §11.3 dice que firmar o consumir una póliza no genera ficha de reevaluación ni `motivo`, porque el evento va al historial de `risk-transfer`. **CP-19 septiembre**: la versión nueva de escalas es hipotética y no se puede puntuar; el protocolo §6.4 dice qué se hace (ficha nueva `cambio_version_metodologia`, sin tocar las anteriores). |

**Orden de trabajo (protocolo §8).** Paso 1: fichas a ciegas, guardadas a las 21:21 UTC (md5 `4c179da3…` de la versión sin la columna `anomalias`). Paso 2: recién después abrí el anexo. Paso 3: calculé y guardé los rankings antes de abrir la adjudicación (21:23 UTC). Paso 4: abrí la adjudicación. Después del paso 1 no cambié ningún factor; sólo agregué la columna `anomalias`.

**Lecturas literales elegidas** (cada una con su anomalía):
- `i_econ` con margen desconocido: §4.2.3 (unknown) y no §9.2 (AN-0001). La sección 2 da también el resultado con la lectura §9.2.
- V_d: tabla fija de §5.5. Personas y legal usan contención; continuidad y económico, el peor de los dos aspectos.
- Padre: prueba de §1.3.5 (misma consecuencia) para CP-12 forma B (AN-0009).
- Factores que la narrativa no describe se infirieron con base `inferred` o `assumed` y rango. No los marqué `unknown` salvo que no hubiera ninguna base: P de CP-08-R2 y su V.

## 2. Resultados por caso

Categoría: la primera que se cumpla en el orden de §8 (contradicción → definición → combinación → ranking → PASS). "FAIL — calibración" no se usa en la Fase 4.

| Caso | Qué se adjudicó (resumen) | Qué produjo la metodología | Categoría | Categorías secundarias | Regla implicada | Factores del agente ≠ anexo | Anomalías |
|---|---|---|---|---|---|---|---|
| CP-01 | R1 > R4 > R5 > R2 = R3; R1 nunca en la mitad de abajo | R3 75 > R2 60 > R5 30 > R1 25 > R4 20. Orden casi invertido: R1 cuarto | FAIL — contradicción | definición; combinación (C_raw distintos: R3 y R2 sobre R1 por V_d = peor aspecto; R5 sobre R1 por el producto) | §4.2.3/§9.2; §5.5; §6 | 7 | AN-0001, AN-0003, AN-0004, AN-0005, AN-0006, AN-0014, AN-0017, AN-0018, AN-0025 |
| CP-02 | R2 > R1; R2 visible y `safety_critical` | Literal: los dos no evaluables (cotas 75 > 60 y 75 > 50), ranking vacío; R2 `safety_critical` y `consecuencia_extrema`, primero de los dos en la cola de validación. Con §9.2: R2 60 > R1 50 | FAIL — contradicción | definición (dos lecturas del econ; AN-0006) | §4.2.3/§9.2; §9.3 | 7 | AN-0001, AN-0002, AN-0006, AN-0025 |
| CP-03 | R2 > R1; no dejar R1 arriba sólo por su severidad inherente | Literal: R1 no evaluable (cota 125 > 100), R2 60 en el ranking; R1 visible por `safety_critical`. Con §9.2: R1 100 > R2 60 | FAIL — contradicción | definición; con §9.2, combinación (R1 queda arriba por recuperación 5, aunque la contención probada sea 1) | §4.2.3/§9.2; §5.5 | 6 | AN-0001, AN-0002, AN-0003 |
| CP-04 | Antes R1 > R2; después R2 > R1; R1 tiene que bajar claramente | Antes R2 60 > R1 50; después R2 60 > R1 50: el `C_raw` de R1 no se mueve (recuperación 4 → 1, contención 5) | FAIL — combinación | ranking (antes y después de R1 con igual `C_raw`) | §6 (producto); §5.5 | 10 | AN-0007, AN-0018, AN-0019, AN-0025 |
| CP-05 | R2 > R1, no a la par | Literal: R2 no evaluable (cota 100 > 80), R1 80 solo; R2 visible por `safety_critical`. Con §9.2: R1 = R2 = 80, I efectivo 4 = 4, I-personas 4 > 1 → R2 primero | FAIL — contradicción | definición (AN-0011) | §4.2.3/§9.2; D10 paso 4 | 5 | AN-0001, AN-0002, AN-0011 |
| CP-06 | R1 > R2; no igualarlos | R1 60 > R2 45; misma P; la diferencia está toda en V | FAIL — contradicción | definición (AN-0005, AN-0014) | §4.2.3/§9.2 (no cambia el resultado) | 5 | AN-0001, AN-0005, AN-0014 |
| CP-07 | R2 > R1 (empate permitido) | R1 48 > R2 36 | FAIL — contradicción | definición (AN-0012, AN-0013); orden invertido con factores en disputa: contención de R2 entre 3 y 4; en R1 la contención 3 anula la recuperación probada 2 | §4.2.3/§9.2; §2.1; §5.3; §5.5 | 7 | AN-0001, AN-0003, AN-0010, AN-0012, AN-0013, AN-0014 |
| CP-08 | R1 > R3; R2 visible y marcado como insuficientemente evaluado | R1 75 > R3 36 con el valor plausible (techo 100 aparte); R2 no evaluable por P `unknown`, con `consecuencia_extrema` y `safety_critical`, segundo en la cola de validación | FAIL — contradicción | definición (AN-0010, AN-0014). Órdenes y visibilidad correctos | §4.2.3/§9.2 (no cambia el resultado) | 11 | AN-0001, AN-0010, AN-0014 |
| CP-09 | La póliza no cambia el riesgo; la mejora financiera tiene que verse | Ningún factor cambia, sin ficha de reevaluación (§11.3); R1 30. El efecto financiero se registra en `risk-transfer` | PASS | — | D17; §11.3; §13 | 2 | AN-0005, AN-0016 |
| CP-10 | R1 baja menos de lo esperado; acción cumplida con eficacia parcial | Acción con `efecto_parcial` y brecha anotada; contención 4 → 3; `C_pers` y `C_legal` 48 → 36; `C_raw` 60 → 60 (econ = P × 4 × max(3, recuperación 5)) | FAIL — ranking | — | §5.5; D10 (antes y después con igual `C_raw`) | 8 | AN-0019 |
| CP-11 | B > A; no igualarlos por la pérdida absoluta | A: econ 2 (5% del RO), `C_raw` 20; B: econ 5 (150%), `C_raw` 50, `consecuencia_extrema` sólo en B. No hay regla para ordenar organizaciones distintas (§7.1.4, Fase 6) | PASS | — | §4.2 | 4 | — |
| CP-12 | Padre R1 > R2; la forma no tiene que cambiar la prioridad | Forma A 50, padre (forma B) 50: invariancia por coincidencia (P 5 en las dos). R2 60 queda arriba en las dos formas. Sub-riesgos fuera del ranking | FAIL — contradicción | definición (AN-0004); orden invertido con factores en disputa (econ asumido 2 contra 3 del anexo) | §2.1/§1.3 (AN-0009); §1.4 | 23 | AN-0004, AN-0008, AN-0009, AN-0015, AN-0022, AN-0024, AN-0025 |
| CP-13 | R1 ≥ R2 (empate defendible) | R1 80 = R2 80, I efectivo 4 = 4, I-personas 2 > 1 → R1 primero | FAIL — contradicción | definición (AN-0010, AN-0014). Orden correcto | §4.2.3/§9.2; D10 paso 4 | 3 | AN-0001, AN-0010, AN-0014 |
| CP-14 | R1 ≥ R2 (empate defendible); no esconder perfiles opuestos | Literal: R1 75, R2 no evaluable (cota 75 > 60). Con §9.2: R1 75 > R2 60. Contención y recuperación quedan visibles por separado; las dos `V_d` de econ y continuidad dan 5 | FAIL — contradicción | definición (dos lecturas del econ) | §4.2.3/§9.2; §5.5 | 4 | AN-0001, AN-0002, AN-0003 |
| CP-15 | R2 ≥ R1; R1 `safety_critical` sin forzar banda | R2 80 > R1 25; R1 con `safety_critical` y `consecuencia_extrema` en las cuatro dimensiones | PASS | — | §6; §8.2 | 1 | — |
| CP-16 | R1 ≥ R2 (empate defendible) | Literal: R1 no evaluable (cota 80 > 60), R2 64. Con §9.2: R2 64 > R1 60 | FAIL — contradicción | definición; orden invertido con las dos lecturas, con factores en disputa (contención de R2: 4 del agente, 2 del anexo) | §4.2.3/§9.2; §2.4 | 7 | AN-0001, AN-0002, AN-0021, AN-0023 |
| CP-17 | Sube la exposición retenida; tienen que verse límite, consumido, disponible y renovación | Ningún factor cambia, sin ficha de reevaluación (§11.3); el consumo va a `risk-transfer` | PASS | — | D17; §11.3; §13 | 2 | AN-0005, AN-0016 |
| CP-18 | Baja fuerte en personas; la criticidad global puede seguir alta | I-personas 5 → 1 (exposición, §2.3); `safety_critical` se apaga; `C_pers` 45 → 9; `C_raw` 75 → 75 (econ y continuidad); `consecuencia_extrema` sigue | PASS | — | §2.3; §6; §13 | 4 | — |
| CP-19 | Marzo ↑, mayo ↑, julio ↓, septiembre cambia el score y no el riesgo; los `motivo` correctos | `motivo` correctos (`informacion_nueva`, `correccion_evaluacion`, `cambio_contexto`). `C_raw` 50 → 75 → 75 → 75: marzo sube; mayo y julio no se mueven (sólo `C_pers` 45 → 60 → 45). Septiembre no ejecutable | FAIL — definición | ranking (mayo y julio sin movimiento) | §3.3/§3.4 (AN-0010); §5.5 | 8 | AN-0010, AN-0019 |
| CP-20 | R2 ≥ R1 > R3; escenario agregado aparte | Literal: R2 45; R1 y R3 no evaluables. Con §9.2: R1 = R2 = R3 = 45, empate legítimo. Escenario E1 (C 60, econ 4) en vista aparte, sin tocar a sus miembros | FAIL — contradicción | definición; ranking (R1 = R3 sin desempate, AN-0020) | §4.2.3/§9.2; D10 | 7 | AN-0001, AN-0002, AN-0020 |

## 3. Criterios no juzgables en la Fase 4

Criterios adjudicados que sólo se refieren a la banda; pasan a la Fase 9.

| Caso | Criterio | Motivo |
|---|---|---|
| CP-01 | R1 Alta | Banda |
| CP-02 | R2 Alta; R2 "puede alcanzar la banda más alta"; no ubicarlo en banda baja sólo por frecuencia | Banda |
| CP-03 | R2 Media; R1 Baja/Media | Banda |
| CP-04 | R1 pasa de Alta a Media/Baja | Banda (el movimiento sí se juzgó: `C_raw` no se mueve) |
| CP-05 | R2 Alta; R1 Media | Banda |
| CP-06 | R1 Alta; R2 Baja/Media | Banda |
| CP-07 | R1 Media; R2 Media/Alta | Banda |
| CP-09 | Global posiblemente Alta | Banda |
| CP-10 | Media/Alta | Banda |
| CP-11 | R2 Alta; R1 Baja/Media | Banda. El orden **entre empresas** tampoco es juzgable: §7.1.4 lo deja abierto para la Fase 6 |
| CP-12 | R1 Alta | Banda |
| CP-13 | R1 Alta | Banda |
| CP-14 | R1 Alta; R2 Media/Alta | Banda |
| CP-15 | R1 puede ser Alta; no forzarlo a la banda máxima por el score | Banda |
| CP-16 | Alta/Media | Banda |
| CP-17 | Global Alta | Banda |
| CP-18 | Alta patrimonial/operativa | Banda |
| CP-19 | Fluctuante | Banda |
| CP-20 | Escenario agregado Alto | Banda |

## 4. Resumen por categoría

| Categoría | Casos | N |
|---|---|---|
| PASS | CP-09, CP-11, CP-15, CP-17, CP-18 | 5 |
| FAIL — ranking | CP-10 | 1 |
| FAIL — definición | CP-19 | 1 |
| FAIL — contradicción | CP-01, CP-02, CP-03, CP-05, CP-06, CP-07, CP-08, CP-12, CP-13, CP-14, CP-16, CP-20 | 12 |
| FAIL — combinación | CP-04 | 1 |

**Lectura.** 11 de las 12 contradicciones vienen de una sola anomalía (AN-0001); la otra es CP-12 (AN-0009). En CP-06, CP-08 y CP-13 la contradicción no cambia ningún orden. En CP-02, CP-05 y CP-14, la lectura §9.2 da el orden adjudicado. Si se mira el orden sin contar las anomalías de definición, fallan **9 casos**: CP-01, 03 (con §9.2), 04, 07, 10, 12, 16, 19 y 20.

## 5. Frecuencia de `consecuencia_extrema` y `safety_critical` (H4)

| Medida | N / total |
|---|---|
| Casos con la bandera | 13 / 20 (CP-01, 02, 03, 04, 06, 08, 09, 11, 14, 15, 17, 18, 19) |
| … disparada por I-económico | 9 / 20 (CP-01, 04, 09, 11, 14, 15, 17, 18, 19) |
| … disparada por I-personas | 9 / 20 (CP-01, 02, 03, 08, 09, 15, 17, 18, 19) |
| … disparada por I-continuidad | 7 / 20 (CP-01, 04, 06, 08, 14, 15, 18) |
| … disparada por I-legal/regulatorio | 1 / 20 (CP-15) |
| Casos con `safety_critical` | 13 / 20 (CP-01, 02, 03, 05, 06, 08, 09, 10, 15, 16, 17, 18, 19) |

Por ficha (sin el padre ni el escenario): `consecuencia_extrema` 21 de 49, `safety_critical` 19 de 49. La bandera se apaga en una sola reevaluación: CP-18 después, en personas. En CP-04 la recuperación no la apaga, porque la bandera mide I y no V.

Nota obligatoria: los casos de propiedad son extremos por diseño; esta frecuencia no estima la de la población (§8, §12). Para comparar: el anexo estimaba 14 de 20 casos con alguna dimensión en 5.

## 6. Lista "no evaluable"

| Caso | Factor `unknown` | Motivo | Necesidad de validación | `consecuencia_extrema` | `safety_critical` | Lugar en la cola de validación |
|---|---|---|---|---|---|---|
| CP-03-R1 | i_econ [3–5] | cota econ 125 > `C_raw` conocido 100 | Pérdida y parada de una fuga mayor; margen | sí (personas) | sí | 1 |
| CP-08-R2 | p, v_cont, v_rec | P `unknown` | Visita técnica: silos, torre, antecedentes, brigada, polvo | sí (personas) | sí | 2 |
| CP-02-R2 | i_econ [4–5] | cota 75 > 60 | Duración de la clausura, facturación del sector, margen | sí (personas) | sí | 3 |
| CP-05-R2 | i_econ [4–5] | cota 100 > 80 | Margen; si el control de liberación es contención | no | sí | 4 |
| CP-14-R2 | i_econ [3–5] | cota 75 > 60 | Valor del stock; margen | no | no | 10 |
| CP-16-R1 | i_econ [2–4] | cota 80 > 60 | Margen | no | no | 11 |
| CP-20-R1 | i_econ [3–4] | cota 60 > 45 | Margen | no | no | 12 |
| CP-02-R1 | i_econ [1–3] | cota 75 > 50 | Margen y desglose de los USD 800 mil | no | no | 13 |
| CP-20-R3 | i_econ [3–4] | cota 60 > 30 | Margen | no | no | 15 |

La cola de validación (§9.5) también incluye riesgos evaluables con algún `unknown` o con `uncertainty = high`: 5 CP-08-R1, 6 CP-06-R1, 7 CP-06-R2, 8 CP-13-R1, 9 CP-01-R3 y 14 CP-07-R1. Calculé la cola con todos los casos juntos porque §9.5 no dice si es por organización. Dentro de cada caso, el orden es el mismo.

## 6b. Propiedades (`metodologia-v0.md` §14)

Un renglón por propiedad, aunque no se haya encontrado contraejemplo.

| Propiedad | ¿Contraejemplo? | Caso y riesgos | Anomalía |
|---|---|---|---|
| Monotonía | Sí, de la **posición** (no de `C_raw`): un techo peor en un factor `unknown` saca al riesgo del ranking | CP-16-R1 con i_econ [2–3] tiene posición; con [2–4] no la tiene | AN-0021 |
| Invariancia de granularidad | Sí (par mínimo construido); en CP-12 se cumple por coincidencia | Tres causas con P 3: padre 45, riesgo simple con P 4 por la unión: 60 | AN-0022, AN-0009 |
| Causalidad de V | Sí, en la evaluabilidad (no en los `C_d`): recuperación `unknown` saca del ranking un riesgo determinado por personas | Variante de CP-16-R2 | AN-0023 |
| Unknowns | No para la propiedad tal como está escrita: ningún `unknown` dio un `C_raw` bajo ni cero. Hay dos efectos colaterales: I efectivo indefinido (AN-0014) y 8 riesgos que salen del ranking (AN-0002) | — | AN-0014, AN-0002 |
| Separación (sub-riesgos, escenarios) | No en los datos. Hay un hueco: qué pasa con el padre y la lista "no evaluable" si el sub-riesgo determinante es no evaluable; y con sub-riesgos empatados no está definido qué factores muestra el padre | CP-12 | AN-0024, AN-0015 |
| Historial | No. Ninguna ficha se sobrescribe; septiembre de CP-19 no es ejecutable | CP-19 | — |
| Producto (orden incorrecto o sensible a la codificación) | Sí, de los dos tipos | CP-01, CP-04 (orden); 5 pares en 4 casos cambian con 1, 2, 3, 5, 8 | AN-0003, AN-0018, AN-0025 |

## 6c. Resultados circulares

Casos cuyo resultado sobre una regla los lista como caso de origen; no cuentan como evidencia a favor.

| Caso | Regla (sección de la metodología) | Resultado |
|---|---|---|
| CP-02 | §4.6 y §8.2 (umbral de personas para `safety_critical`) | Se cumple: circular |
| CP-06 | §2.1, §2.2, §3.1, §5.5 (controles posteriores a V; antecedentes contenidos cuentan) | Se cumple (misma P, distinta V): circular |
| CP-07 | §2.2, §5.5 (restricción de acceso a V) | Se aplicó; el caso falla igual |
| CP-08 | §9 (unknowns, valor plausible, lista no evaluable) | Se cumple: circular |
| CP-09 | §13 (exposición retenida visible) | Sólo a nivel de especificación (AN-0016): circular y no verificado |
| CP-10 | §5.2, §5.5 (medida que falla parcialmente), §11.2 (cumplida más eficacia) | Se cumple: circular. El movimiento de la criticidad falla |
| CP-11 | §4.2 (ancla económica relativa al RO) | Se cumple: circular |
| CP-12 | §1.4, §7 (sólo el padre compite) | Se cumple: circular. El orden contra R2 falla |
| CP-13 | §4.4 (pérdida de interrupción a económico), §7 (sin amplitud) | Se cumple, desempatado por I-personas: circular |
| CP-14 | §5.5 (contención y recuperación por separado) | Se cumple (los dos aspectos quedan visibles): circular |
| CP-15 | §4.3, §8.2 (bandera de seguridad sin forzar banda) | Se cumple: circular |
| CP-16 | §2.4, §4.4, §5.5 (falta de continuidad a recuperación) | Se aplicó; el orden falla |
| CP-17 | §11.3 (consumo del límite en transferencia) | Se cumple: circular |
| CP-18 | §2.3 (test de la barrera), §13 (movimiento por dimensión visible) | Se cumple: circular |
| CP-19 | §11.1 (criterio de `motivo`) | Se cumple: circular |
| CP-20 | §10 (escenario por causa común) | Se cumple: circular |

## 7. Conteo hacia la falsación de D14 (propuesto)

| Caso | Categoría | ¿Independiente de cuáles? | ¿Hay corrección simple? Cuál | Cuenta |
|---|---|---|---|---|
| Grupo G1: CP-01 (R3 y R2 sobre R1), CP-03 (con §9.2), CP-04 después, CP-10, CP-19 mayo y julio | combinación (secundaria en CP-01 y CP-03); ranking (CP-10 y secundaria en CP-04 y CP-19) | Fallan todos por la misma regla: V_d = el peor de contención y recuperación (§5.5). Por §9, criterio 2, cuentan como **uno**. Es independiente de G2 | No. Cambiar cómo se combinan los aspectos de V cambia la definición de V (D15) y la fórmula de D14: no es simple según §9 | **1** |
| Grupo G2: CP-01 (R5 sobre R1), CP-04 antes (R2 sobre R1) | combinación (principal en CP-04) | Es el mismo contraste con otros números (remoto y catastrófico contra probable y moderado, con la misma V): cuenta como uno. Independiente de G1 | Probablemente sí: recalibrar las anclas económicas (§4.2, marcadas [H]) parece reordenar los dos. Hay que confirmar en la regresión que no rompa CP-11, CP-13 ni CP-15 | 0 (dudoso) |
| CP-20 (R1 = R3 con §9.2) | ranking (secundaria) | Independiente | Probablemente sí: agregar o cambiar un desempate de D10 | 0 |
| CP-07, CP-12, CP-16 | orden invertido con factores en disputa | — | No se juzga: primero se resuelven los factores (definición) | — |

Total propuesto: **1 de 3** (G1), con G2 pendiente de la regresión. Lo decide Emiliano (§9).

## 8. Anomalías nuevas

`anomalia_id` agregados al registro en esta corrida, por código.

| Código | N | `anomalia_id` |
|---|---|---|
| A1 | 131 | AN-0026 a AN-0156 (agente contra anexo, una por factor) |
| A2 | 5 | AN-0005, AN-0010, AN-0013, AN-0014, AN-0024 |
| A3 | 1 | AN-0017 |
| A4 | 2 | AN-0015, AN-0020 |
| A6 | 3 | AN-0006, AN-0011, AN-0016 |
| A7 | 3 | AN-0007, AN-0008, AN-0022 |
| A8 | 7 | AN-0002, AN-0003, AN-0018, AN-0019, AN-0021, AN-0023, AN-0025 |
| A11 | 2 | AN-0004, AN-0012 |
| A12 | 2 | AN-0001, AN-0009 |

**Cómo se distribuyen las 131 A1.** Hay cuatro fuentes sistemáticas:
1. V único del anexo contra V_d de v0.1 (41).
2. `i_econ unknown` por §4.2.3 (14).
3. Anclas provisorias del anexo contra las de v0.1 en P, continuidad y económico. Por ejemplo, "ocurrió hace dos años" es P 3 en el anexo y P 4 en v0.1, y 12% del RO es económico 2 en el anexo y 3 en v0.1.
4. Hechos que el anexo pone en I y v0.1 pone en V: el otro depósito en CP-06 y la restricción por sede en CP-07.

Las divergencias de juicio sobre hechos que la narrativa no da son pocas pero grandes: el económico de CP-10 (4 contra 2) y el de la infraestructura de CP-12 (2 contra 3).

## 9. Filas propuestas para el changelog

| id | elemento | antes | después | motivo |
|---|---|---|---|---|
| CH-079 (aplicado; CH-075 a CH-078 los usó la Fase 6) | Corrida F4-DR-01 | — | Dry run de la Fase 4 con metodologia v0.1 y protocolo v0.1 sobre los 20 casos de propiedad: 5 PASS, 15 FAIL, 156 anomalías; no cambia ninguna regla ni sube versión | Fase 4 del plan; registro de la corrida |

Detalle en `anexo-changelog-fase-4.md`.

## 10. Para adjudicar

Sólo los FAIL, numerados, cada uno con la regla afectada y la causa. La corrección mínima la propone la Fase 5: el prompt de esta fase prohíbe proponer arreglos.

1. **CP-01 · contradicción** (§4.2.3 contra §9.2; secundarias: definición y combinación). Causa: el orden sale casi invertido. R3 y R2 quedan arriba porque su contención probada no entra en V_d de económico y continuidad (G1), y R5 queda sobre R1 por el intercambio de P por I del producto (G2).
2. **CP-02 · contradicción** (§4.2.3 contra §9.2). Causa: con la lectura literal, los dos riesgos salen del ranking por la cota económica; con §9.2 el orden es el adjudicado.
3. **CP-03 · contradicción** (§4.2.3 contra §9.2). Causa: con la lectura literal, R1 sale del ranking; con §9.2, R1 queda 100 contra 60 porque la recuperación 5 domina sobre la contención probada 1 (G1).
4. **CP-04 · combinación** (§6; secundaria: ranking por §5.5). Causa: antes, P 2 × I 5 queda debajo de P 4 × I 3 (G2; con las ternas del anexo, 25 contra 27). Después, la recuperación 4 → 1 no mueve `C_raw` porque manda la contención 5 (G1).
5. **CP-05 · contradicción** (§4.2.3 contra §9.2). Causa: con la lectura literal, R2 sale del ranking; con §9.2 empata con R1 y gana por I-personas.
6. **CP-06 · contradicción** (§4.2.3 contra §9.2). Causa: el econ es `unknown`, pero no cambia el resultado (R1 60 > R2 45).
7. **CP-07 · contradicción** (§4.2.3 contra §9.2; secundaria: definición). Causa: R1 queda sobre R2. La contención sin prueba de R1 domina sobre su recuperación probada, y la contención de R2 depende de cómo se combinan la restricción por sede y la detección nula (AN-0013).
8. **CP-08 · contradicción** (§4.2.3 contra §9.2). Causa: el econ de R1 es `unknown` sin efecto en el resultado; los órdenes y la visibilidad se cumplen.
9. **CP-10 · ranking** (§5.5). Causa: la contención mejora (4 → 3) pero `C_raw` queda en 60, porque la recuperación 5 fija V_d de la dimensión económica, que es la determinante (G1).
10. **CP-12 · contradicción** (§2.1 contra §1.3, AN-0009; secundaria: definición). Causa: R2 queda sobre el problema de infraestructura en las dos formas. El econ de la infraestructura es asumido (2 contra 3 del anexo) y la invariancia entre formas se cumple por coincidencia.
11. **CP-13 · contradicción** (§4.2.3 contra §9.2). Causa: el econ de R1 es `unknown` sin efecto; el empate se rompe por I-personas en el sentido adjudicado.
12. **CP-14 · contradicción** (§4.2.3 contra §9.2). Causa: con la lectura literal, R2 sale del ranking; con §9.2, R1 75 > R2 60, como lo adjudicado.
13. **CP-16 · contradicción** (§4.2.3 contra §9.2; secundaria: definición). Causa: R2 queda sobre R1 con las dos lecturas, con la contención de R2 en disputa (4 contra 2 del anexo).
14. **CP-19 · definición** (§3.3 y §3.4 se solapan, AN-0010; secundaria: ranking). Causa: en marzo, el cableado sobrecargado da P 3 o P 5 según qué ancla se lea; en mayo y julio la contención cambia y `C_raw` no se mueve (G1).
15. **CP-20 · contradicción** (§4.2.3 contra §9.2; secundaria: ranking). Causa: con la lectura literal, R1 y R3 salen del ranking; con §9.2 los tres empatan y ningún desempate de D10 pone a R1 sobre R3.

---

## PASS circulares

Paso 5 del prompt. Los 5 PASS:

| Caso | Regla de origen sobre la que pasa | ¿Queda evidencia no circular? |
|---|---|---|
| CP-09 | §13 (exposición retenida); D17 sin caso de origen en §4.1 | Sí, en parte: que la póliza no mueva ningún factor (D17, §4.1.7) no lista a CP-09 como origen. La visibilidad financiera es circular y no se pudo verificar (AN-0016) |
| CP-11 | §4.2 (CP-11 es origen del ancla relativa al RO) | No |
| CP-15 | §4.3, §8.2 (bandera de seguridad) | Sí, en parte: el orden R2 > R1 sale del producto (§6, sin casos de origen) |
| CP-17 | §11.3 (CP-17 es origen) | No |
| CP-18 | §2.3 y §13 (CP-18 es origen de los dos) | No |

**PASS no circulares: 0 completos; 2 parciales** (CP-09 por D17, CP-15 por el orden). La evidencia a favor que deja esta corrida es muy poca: casi todo lo que pasa, pasa sobre reglas escritas a partir del mismo caso.

## Contraejemplos de propiedades

Paso 6 del prompt. Cada contraejemplo está en el registro.

**1. Monotonía (AN-0021).** `C_raw` es monótono por construcción: es el máximo de productos de factores que crecen con cada factor. La **posición** no lo es. CP-16-R1 con i_econ `unknown` [2–3] tiene cota 4 × 3 × 5 = 60 ≤ 60: es evaluable y queda segundo. Si el techo económico empeora a [2–4], la cota pasa a 80 > 60 y el riesgo sale del ranking. Un factor que podría ser peor le quita el lugar al riesgo en vez de subirlo. Lo mismo pasa con CP-20-R1 y R3 (techo 4 contra 3). Además, una mejora de un aspecto de V no baja `C_raw` cuando el otro aspecto es peor (AN-0019). Eso no rompe la monotonía, que es "no baja"; es insensibilidad.

**2. Invariancia de granularidad (AN-0022, AN-0009).** Par mínimo: tres causas independientes con P 3 cada una (una vez en cinco años), I-económico 3 y V 5.
- Como padre: el sub-riesgo determinante da 3 × 3 × 5 = 45.
- Como riesgo simple: el evento ocurre por cualquiera de las tres causas, P ≈ 1 − 0,8³ ≈ 49% anual = 4, y da 4 × 3 × 5 = 60.

Frente a otro riesgo de 50, la forma decide el orden; es la hipótesis [H] de §1.4.5. En CP-12 las dos formas dan 50 sólo porque los dos sub-riesgos determinantes ya tienen P 5, igual que la forma agregada. Además, con el evento iniciador de §2.1, "mismo evento con causas distintas" casi no existe: las causas son eventos distintos, y §1.3.2 y §1.3.3 dan instrucciones opuestas (AN-0009).

**3. Causalidad de V (AN-0023).** Por fórmula, ningún aspecto cambia el `C_d` de una dimensión sobre la que no actúa: con contención fija, los `C_pers` y `C_legal` no dependen de la recuperación. Pero sí cambia la evaluabilidad. Variante de CP-16-R2 con I-económico 4 y recuperación `unknown`: `C_pers` = 64 no cambia, la cota económica 4 × 4 × 5 = 80 supera 64, y el riesgo de seguridad sale del ranking por un aspecto que no actúa sobre personas.

**4. Unknowns.** Sin contraejemplo de la propiedad tal como está escrita. Hay dos efectos colaterales:
- I efectivo no está definido con una dimensión `unknown` en un riesgo evaluable, y decide el paso 3 de D10 (AN-0014).
- La regla del margen manda 8 riesgos a la lista no evaluable con rangos de sólo dos niveles, como [3–4] (AN-0002).

**5. Separación (AN-0024, AN-0015).** En los datos, ningún sub-riesgo entra al ranking y el escenario E1 no toca a R1 ni a R2. Hay dos huecos:
- Si el sub-riesgo primero por D10 es no evaluable, §1.4 no dice qué hace el padre ni si ese sub-riesgo entra a la lista "no evaluable" con sus banderas.
- Con dos sub-riesgos determinantes empatados, no está definido qué factores muestra el padre.

**6. Historial.** Sin contraejemplo. Cada reevaluación es una ficha nueva con `evaluacion_anterior_id`. Las pólizas no generan ficha (§11.3). Septiembre de CP-19 no se puede ejecutar, y §6.4 del protocolo dice qué se haría.

**7. Producto (AN-0003, AN-0018, AN-0025).**
- **Órdenes profesionalmente incorrectos.** En CP-01, R3 queda primero: los cortes de red, con un grupo electrógeno probado que hizo que las líneas no se detuvieran. R2 queda segundo: la sala con CO₂ probado. Los dos quedan arriba porque la recuperación "si el daño bruto ocurre" fija V_d. R1, caldera con muertes múltiples, queda cuarta. En CP-04 antes, el centro de datos queda debajo del fraude interno.
- **Recodificación 1, 2, 3, 5, 8** (con la lectura §9.2 para tener todos los pares). Cambian de orden 5 pares dentro de 4 casos:
  - CP-01 R1/R5: 25/30 → 64/48. Acerca a lo adjudicado.
  - CP-02 R1/R2: 50/60 → 128/120. Aleja.
  - CP-04 R1/R2 antes: 50/60 → 128/120. Acerca.
  - CP-04 R1/R2 después: igual que antes. Aleja.
  - CP-12 R1/R2: 50/60 → 128/120. Acerca.

  Entre todas las fichas evaluables cambian 82 de 990 pares (8%). Los empates de CP-05, CP-13 y CP-20 se mantienen. El ranking depende de la codificación en los pares donde se cambia P por I. Una codificación convexa favorece la severidad y arregla G2, pero rompe CP-02 y el después de CP-04.

---

## Dictamen de Emiliano (2026-10-06 10:38 UTC)

**Fase 4 aprobada** como experimento: la corrida fue limpia y encontró lo que tenía que encontrar antes de EMI-41, aunque metodologia v0.1 no pasó el dry run.

- **D14:** queda **bajo sospecha, con 0 de 3 casos aislados**, no 1 de 3. G1 puede estar en cómo se construye V (D15) y no en el producto P×I×V; G2 tiene factores y anclas en discusión. Primero se corrige V y después se vuelve a probar el producto.
- **Las 131 A1** no se leen como baja reproducibilidad: comparan en parte dos metodologías (anexo pre-v0.1 contra v0.1). La reproducibilidad (P4) se mide en la Fase 8 con dos evaluadores sobre la misma versión.
- **0 PASS no circulares:** los casos de propiedad son tests de diseño; EMI-41 es el primer conjunto fuera de muestra.
- **Recodificación:** confirma que el ranking depende de la codificación; no se cambia la fórmula ni se hacen las escalas convexas todavía.
- **Orden de trabajo para la Fase 5**, por grupos y no caso por caso:
  1. `§4.2.3 ↔ §9.2`. Su recomendación: gana §9.2. Un dato auxiliar desconocido, como el margen, no vuelve `i_econ` unknown si hay un valor o rango plausible defendible; `unknown` queda para cuando no hay base ni para un valor plausible. Se adjudica formalmente en la Fase 5.
  2. Cómo contención y recuperación producen V. Antes de proponer una regla, se le presentan 4–5 ejemplos (contención excelente y recuperación pésima, al revés, ambas medias, ambas excelentes, ambas malas) para que diga qué comportamiento espera.
  3. Padre y granularidad: abandona la invariancia padre/simple; el padre es un agrupador que puede mostrarse en la posición de su hijo prioritario, sin que su score represente la unión de los escenarios.
  4. Anclas ambiguas o solapadas (CP-19 y factores en disputa).
  5. Volver a correr y aislar D14 (CP-01, CP-04 y los que sobrevivan).
  6. Recién después, D10 y desempates (CP-20).
