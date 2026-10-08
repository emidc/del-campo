# Propuesta de umbrales de banda preliminares · Fase 9a

> 2026-10-07 · pasos 1 a 3 de protocolo §12 (más la regresión de bandas del paso 7 sobre los casos) · metodologia v0.2 y protocolo v0.2 (congelados) · corrida `F9A-CAL-01` · agente: sesión del thread "Fase 9a umbrales preliminares".
> **Emiliano revisa esto recién después de entregar sus 30 fichas de la Fase 8.**
> Fuentes: `adjudicacion-casos.md`, `fase-5/regresion/fichas-regresion.csv` y `reporte-regresion.md`, `fase-5/log-adjudicacion.md`. No se leyó nada de `v0/emi41/`, `v0/fase-8/` ni `cerrado/`.

## Resumen

1. Sin `consecuencia_extrema`, un solo corte Media/Alta es compatible con lo adjudicado: **Alta desde `C_raw` 50**. Respeta 12 de 13 bandas; falla CP-05 R1, que ninguna regla sobre `C_raw` puede cumplir (Media y Alta con el mismo 64).
2. **Crítica no tiene ningún caso adjudicado.** Lo único que fijan los casos es que empiece por encima de 64; entre 75 y 125 el corte es arbitrario. Propongo 75, por la nota de CP-02.
3. **El corte Baja/Media tampoco tiene casos:** nadie adjudicó un riesgo como sólo Baja. Cualquier valor entre 2 y 20 da el mismo resultado en los casos. Propongo 20.
4. Con los extremos, el mejor juego respeta 20 de 24 bandas. Hay cuatro que **ningún** juego de cortes puede respetar a la vez: CP-01 R1, CP-05 R1, CP-17 y una de CP-03 R2 o CP-18.
5. Juego recomendado **A: Media ≥ 20, Alta ≥ 50, Crítica ≥ 75**. Con él, 13 casos pasan, 3 quedan FAIL — calibración (CP-05, CP-17, CP-18) y 4 siguen con el FAIL de la Fase 5.
6. **Contradicción #2:** con cualquier juego compatible con los casos sin extremos, un riesgo remoto (P 1) llega como mucho a Media, y uno con P 2 como mucho a Alta. El texto vigente de D23 ("un riesgo remoto puede llegar a la banda más alta por el producto") queda falso. Lo decidís vos.
7. Todo esto es ajuste dentro de la muestra, sobre 20 casos contrastantes por diseño (I15) y en buena parte ya usados para diseñar reglas. No es evidencia de que los cortes generalicen; eso se mira en la 9b.

---

## 1. Tabla de calibración (paso 1)

Archivo completo: `tabla-calibracion.csv` (las 51 fichas de la corrida F5-REG-01, con factores, `C_raw` v0.2, dimensión determinante, banderas, banda esperada tal como la escribiste, tipo de expectativa, si la adjudicación se revisó en la Fase 5, de qué reglas es caso de origen y la banda con cada juego). Recalculé los 50 `C_raw` evaluables desde los factores con la v0.2 (§5.5, §6) y coinciden todos con el CSV de la Fase 5.

**Cómo leí cada `banda_esperada`.** No agregué bandas que no escribiste. Donde la frase admitía dos lecturas, elegí una y lo dejé escrito:
- **Duras** (cuentan para elegir cortes): las que dicen una banda o un rango ("R2 Alta", "R1 Baja/Media", "Alta/Media").
- **Blandas** (se reportan, no eligen cortes): CP-09 "Global **posiblemente** Alta" y CP-15 R1 "**puede ser** Alta".
- **Revisada:** CP-14 R1 "Alta". En la Fase 5 decidiste que prevalece PV-1 (casi protegida); la banda original de R1 se informa aparte y no elige cortes. CP-14 R2 (Media/Alta) se mantiene.
- **Lecturas mías:** CP-10 "Media/Alta" la apliqué al riesgo **después** de la acción (es de lo que habla la nota); CP-16 "Alta/Media" a **R1**; CP-18 "Alta" a los dos momentos ("puede permanecer Alta"); CP-12 "R1 Alta" al padre y a la forma A; CP-20 "Escenario agregado Alto" al escenario E1.
- **Sin banda:** CP-08 ("—"), CP-19 ("Fluctuante") y todos los riesgos que no nombraste. CP-08 R2 es el único no evaluable: queda fuera, sin banda.

| Riesgo | `C_raw` v0.2 | Determinante | Extrema | Safety | Banda esperada | Tipo |
|---|---|---|---|---|---|---|
| CP-01 R1 | 20 | econ, pers, cont | sí | sí | Alta | dura |
| CP-02 R2 | 60 | pers | sí | sí | Alta | dura |
| CP-03 R1 | 25 | pers | sí | sí | Baja/Media | dura |
| CP-03 R2 | 48 | econ, pers | no | no | Media | dura |
| CP-04 R1 antes | 50 | econ | sí | no | Alta | dura |
| CP-04 R1 después | 30 | econ | sí | no | Media/Baja | dura |
| CP-05 R1 | 64 | econ | no | no | Media | dura |
| CP-05 R2 | 64 | las cuatro | no | sí | Alta | dura |
| CP-06 R1 | 60 | econ | sí | sí | Alta | dura |
| CP-06 R2 | 30 | econ, cont | sí | sí | Baja/Media | dura |
| CP-07 R1 | 36 | econ, legal | no | no | Media | dura |
| CP-07 R2 | 36 | econ, legal | no | no | Media/Alta | dura |
| CP-09 R1 | 30 | econ, pers | sí | sí | posiblemente Alta | blanda |
| CP-10 R1 después | 36 | econ, pers, legal | no | sí | Media/Alta | dura |
| CP-11 A R1 | 24 | econ | no | no | Baja/Media | dura |
| CP-11 B R2 | 60 | econ | sí | no | Alta | dura |
| CP-12 R1 forma A | 50 | econ | no | no | Alta | dura |
| CP-12 R1 padre (forma B) | 50 | econ, cont | no | no | Alta | dura |
| CP-13 R1 | 64 | econ, cont, legal | no | no | Alta | dura |
| CP-14 R1 | 15 | econ, cont | sí | no | Alta (original) | **revisada** |
| CP-14 R2 | 36 | econ, cont | no | no | Media/Alta | dura |
| CP-15 R1 | 25 | las cuatro | sí | sí | puede ser Alta | blanda |
| CP-16 R1 | 60 | econ | no | no | Alta/Media | dura |
| CP-17 R1 | 30 | econ, pers | sí | sí | Alta | dura |
| CP-18 R1 antes | 45 | econ, pers, cont | sí | sí | Alta | dura |
| CP-18 R1 después | 45 | econ, cont | sí | no | Alta | dura |
| CP-20 E1 (escenario) | 60 | econ | no | no | Alta | dura |

Quedan 24 expectativas duras: 13 sin `consecuencia_extrema` y 11 con ella.

**Valores posibles de `C_raw`** (30): 1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24, 25, 27, 30, 32, 36, 40, 45, 48, 50, 60, 64, 75, 80, 100, 125. Un corte "≥ x" significa que `x` ya pertenece a la banda de arriba.

---

## 2. Sin `consecuencia_extrema` (paso 2, protocolo §12.1–12.2)

Recorrí las 3.654 combinaciones de tres cortes sobre los 30 valores (el corte de Media empieza en 2 como mínimo) y conté cuántas de las 13 bandas duras respeta cada una.

**Lo que fijan los casos:**
- **Media/Alta:** el único corte que respeta 12 de 13 es **Alta ≥ 50**. CP-03 R2 (48) tiene que quedar en Media y CP-12 R1 (50) en Alta: no hay hueco, los dos casos están en valores contiguos.
- **Alta/Crítica:** nada adjudicado como Crítica. La única restricción es que lo adjudicado como Alta (hasta 64: CP-05 R2, CP-13 R1) no quede en Crítica, así que Crítica empieza en 75 o más. **Entre 75 y 125 es hueco**: ningún caso decide.
- **Baja/Media:** nada adjudicado como sólo Baja. Lo más bajo con banda es CP-11 A (24, Baja/Media), y lo más bajo que tiene que ser Media es CP-07 R1 (36). Cualquier corte entre 2 y 36 respeta lo adjudicado. **Hueco casi completo.**
- **Lo que ningún corte resuelve:** CP-05 R1 (64, Media) contra CP-05 R2, CP-13 R1, CP-12 y CP-20 E1 (50 a 64, Alta). En CP-05 los dos riesgos tienen el mismo `C_raw`, 64, y adjudicaste bandas distintas. Lo que los separa (R2 agrega personas, continuidad y legal en 4) es amplitud, y `max()` la descarta.

**Juegos candidatos sin extremos:**

| Juego | Media ≥ | Alta ≥ | Crítica ≥ | Respeta | Falla | Huecos |
|---|---|---|---|---|---|---|
| **A** | 20 | **50** | 75 | 12 / 13 | CP-05 R1 | Baja/Media (2–36) y Crítica (75–125) |
| **B** | 20 | **45** | 75 | 11 / 13 | CP-05 R1, CP-03 R2 | Baja/Media, Crítica, y el corte Alta entre 40 y 45 |
| **C** | 20 | **50** | **100** | 12 / 13 | CP-05 R1 | igual que A |

B no sale de los casos sin extremos: lo incluyo porque es el que mejor anda al sumar los extremos (sección 3). C es A con el otro extremo del hueco de Crítica.

### Por qué propongo Media ≥ 20 y Crítica ≥ 75 dentro de los huecos

- **Media ≥ 20.** Entre 2 y 20 todos los cortes clasifican igual las expectativas duras. Por encima de 20, CP-01 R1 (20, adjudicado Alta) cae a Baja, dos bandas lejos de lo que pediste en lugar de una; por encima de 25 cae también CP-15 R1, con lo que se acercaría a lo que marcaste como incorrecto ("bajar o esconder R1 sólo por su baja frecuencia"). 20 es el corte más alto que deja todos los riesgos con banda adjudicada fuera de Baja. Consecuencia: **Baja queda vacía de casos adjudicados**; sólo caen ahí CP-01 R3 (15, sin banda), CP-14 R1 (15, revisada) y el sub-riesgo CP-12 R1a (10).
- **Crítica ≥ 75.** En CP-02 escribiste que R2 "puede alcanzar la banda más alta analíticamente". R2 tiene P 3 e I-personas 5; con contención 5 daría 75. Con Crítica ≥ 75 eso es posible; con ≥ 80 o ≥ 100, imposible para cualquier riesgo con P 3. Es la única frase adjudicada que toca Crítica, y es una lectura mía de "puede". Con 75, en los casos sólo CP-15 R2 (80, sin banda adjudicada) queda en Crítica.

Qué exige cada corte de Crítica, en factores:

| Crítica ≥ | Combinaciones que llegan | P mínimo |
|---|---|---|
| 75 | 3·5·5 (y sus permutaciones) más todo lo de 80 o más | 3 |
| 80 | 4·4·5 (y sus permutaciones) más todo lo de 100 o más | 4 |
| 100 | 4·5·5, 5·4·5, 5·5·4, 5·5·5 | 4 |

---

## 3. Con `consecuencia_extrema` (paso 3, protocolo §12.3)

Con las 24 expectativas duras, el máximo que respeta algún juego es **20 de 24**. Hay pares de riesgos donde el de menor o igual `C_raw` tiene una banda adjudicada más alta: ningún corte monótono sobre `C_raw` respeta los dos.

| Riesgo con banda más alta | contra | Riesgo con banda más baja |
|---|---|---|
| CP-01 R1 (20, Alta, P 1) | | CP-03 R1 (25), CP-11 A (24), CP-04 después (30), CP-06 R2 (30), CP-07 R1 (36), CP-03 R2 (48), CP-05 R1 (64) |
| CP-17 (30, Alta, P 2) | | CP-04 después (30, Media/Baja), CP-06 R2 (30, Baja/Media), CP-07 R1 (36), CP-03 R2 (48), CP-05 R1 (64) |
| CP-18 antes y después (45, Alta) | | CP-03 R2 (48, Media), CP-05 R1 (64) |
| CP-05 R2, CP-13 R1, CP-12, CP-20 E1, CP-02 R2, CP-06 R1, CP-11 B, CP-04 antes (50–64, Alta) | | CP-05 R1 (64, Media) |

Lo que esto deja:
- **CP-01 R1 y CP-17 no entran en ningún juego razonable.** Para poner CP-01 R1 (P 1) en Alta, Alta tendría que empezar en 20 y fallarían siete bandas. CP-17 tiene el mismo `C_raw` (30) que CP-04 después y CP-06 R2, que adjudicaste Media/Baja y Baja/Media.
- **CP-18 contra CP-03 R2.** Alta ≥ 45 (juego B) respeta CP-18 y rompe CP-03 R2; Alta ≥ 50 (A y C) al revés. B respeta 20 de 24 y A 19, porque CP-18 cuenta dos veces (antes y después).
- Los cuatro que fallan en todos los juegos (CP-01 R1, CP-05 R1, CP-17 y uno de CP-03 R2 o CP-18) tienen un patrón común en tres de ellos: **la banda que esperabas es más alta de lo que da el producto cuando la severidad es extrema y la probabilidad baja** (CP-01 R1 P 1, CP-17 P 2, CP-18 V 3 con I 5). Es el mismo patrón que el grupo G2 de la Fase 5. CP-05 R1 es el otro patrón: amplitud.

| Juego | Respeta (24 duras) | Falla | Blandas (CP-09, CP-15 R1) |
|---|---|---|---|
| **A** (20 / 50 / 75) | 19 | CP-01 R1, CP-05 R1, CP-17, CP-18 antes, CP-18 después | las dos quedan en Media |
| **B** (20 / 45 / 75) | 20 | CP-01 R1, CP-03 R2, CP-05 R1, CP-17 | las dos quedan en Media |
| **C** (20 / 50 / 100) | 19 | igual que A | las dos quedan en Media |

**CP-14 R1 contra la adjudicación original (Alta):** 15 queda en Baja con los tres juegos. Contra la revisada (PV-1, "casi protegida") no hay banda adjudicada; Baja es consistente con esa respuesta. Queda visible que es un riesgo con `consecuencia_extrema` en Baja.

### Contradicción abierta #2: ¿un riesgo remoto puede llegar a Crítica, y debe?

**Cómo la deja la v0.2.** D20 y D23 no fijan piso de banda; D23 dice además que "un riesgo remoto puede llegar a la banda más alta por el producto, pero no está obligado", y deja el número para esta fase.

**Qué pasa con estos cortes.** `C_raw` máximo por nivel de P: P 1 → 25, P 2 → 50, P 3 → 75.

| Juego | P 1 (remoto) llega a | P 2 llega a | Crítica necesita |
|---|---|---|---|
| A | **Media** (sólo con I 5 y V ≥ 4; si no, Baja) | Alta (sólo 2·5·5) | P ≥ 3 |
| B | **Media** | Alta (sólo 2·5·5) | P ≥ 3 |
| C | **Media** | Alta (sólo 2·5·5) | P ≥ 4 |

Con **cualquier** juego que respete al menos 11 de las 13 bandas sin extremos (Alta ≥ 40), un riesgo remoto **no puede** llegar a Alta, y mucho menos a Crítica. La frase de D23 "puede llegar a la banda más alta por el producto" es falsa con estos números. Para que P 1 llegue a Alta, Alta tendría que empezar en 25 o menos, y eso rompe CP-03 R1, CP-03 R2, CP-04 después, CP-06 R2 y CP-07 R1.

Tus adjudicaciones de casos remotos: CP-01 R1 (P 1) "Alta"; CP-15 R1 (P 1) "puede ser Alta"; CP-15 además dice que R1 debe recibir "un flag/piso normativo separado de safety-critical", y en la Fase 3 decidiste que D23 no fija piso.

**Opciones (no lo decido):**
- **a. No llega, y está bien.** El remoto extremo queda en Media o Baja por el producto; su visibilidad y su tratamiento los garantizan `consecuencia_extrema` y `safety_critical`, que la UI muestra al lado de la banda. CP-01 R1 queda FAIL — calibración, con la misma raíz que G2 (no suma un caso independiente a D14). En la 9b se corrige el texto de D23 y §8.2.
- **b. Debe llegar al menos a Alta: piso de banda por bandera.** Por ejemplo, `safety_critical` con I-personas 5 da piso Alta. Arregla CP-01 R1 y CP-15 R1 (y CP-17 y CP-09 si el piso es por `consecuencia_extrema`). Reabre D20 ("no hay pisos") y D23, no es una corrección de umbrales, y sería desviación del preregistro. CP-15 pedía no "forzarlo automáticamente a banda máxima mediante el score"; un piso Alta no es la máxima.
- **c. Que la severidad pese más en la combinación** (codificación convexa o tabla de decisión, metodología §6.7). Es D14, no calibración, y queda fuera de esta fase.

**Recomendación: a**, por ahora. Es la única que no cambia reglas congeladas, y la Fase 8 va a mostrar cuántos riesgos sintéticos remotos y extremos quedan en Media o Baja. Si son muchos, b o c vuelven con datos en la 9b.

---

## 4. Regresión de bandas sobre los 20 casos (paso 4, protocolo §8 y §12.7)

Se aplica cada juego a los factores de F5-REG-01; los factores no cambian, así que no hace falta reevaluar (protocolo §13). Un caso queda **FAIL — calibración** si su estructura y su orden pasaban pero alguna banda dura no. Los cuatro FAIL de la Fase 5 conservan su categoría; la calibración se anota como secundaria.

**Circular** = el caso es caso de origen de una regla que afecta `C_raw` (metodología §1.4, §2, §3.4, §4.6, §5.5, §9, §10). Que las bandas pasen en esos casos no es evidencia. Además, **todos** los PASS de esta tabla son ajuste dentro de la muestra: los cortes salieron de estos mismos casos.

| Caso | Criterios de banda | A | B | C | Circular |
|---|---|---|---|---|---|
| CP-01 | R1 Alta | R1 Media ✗ · FAIL — combinación (F5) + calibración | igual | igual | no |
| CP-02 | R2 Alta | ✓ PASS | ✓ PASS | ✓ PASS | sí |
| CP-03 | R2 Media; R1 Baja/Media | ✓ PASS (M, M) | ✗ R2 Alta · **FAIL — calibración** | ✓ PASS | no (visto al diseñar §5.5) |
| CP-04 | R1 de Alta a Media/Baja | ✓ PASS (A → M) | ✓ PASS | ✓ PASS | no |
| CP-05 | R2 Alta; R1 Media | ✗ R1 Alta · **FAIL — calibración** | igual | igual | no |
| CP-06 | R1 Alta; R2 Baja/Media | ✓ PASS | ✓ PASS | ✓ PASS | sí |
| CP-07 | R1 Media; R2 Media/Alta | ✓ bandas (M, M) · sigue FAIL — ranking (F5) | igual | igual | sí |
| CP-08 | R2 sin banda crítica automática | ✓ PASS (R2 no evaluable, sin banda) | ✓ | ✓ | sí |
| CP-09 | posiblemente Alta (blanda) | PASS; queda en Media | igual | igual | no |
| CP-10 | después Media/Alta | ✓ PASS (antes M, después M) | ✓ PASS (antes A, después M) | ✓ PASS | sí |
| CP-11 | B Alta; A Baja/Media | ✓ PASS | ✓ PASS | ✓ PASS | sí |
| CP-12 | R1 Alta | ✓ banda (padre y forma A Alta) · sigue FAIL — combinación (F5) | igual | igual | sí |
| CP-13 | R1 Alta | ✓ PASS | ✓ PASS | ✓ PASS | sí |
| CP-14 | R2 Media/Alta (R1 revisada) | ✓ PASS contra la revisada; R1 Baja, FAIL contra la original | igual | igual | sí |
| CP-15 | R1 puede ser Alta (blanda) | PASS; R1 Media, R2 Crítica | PASS; igual | PASS; R1 Media, R2 Alta | sí |
| CP-16 | R1 Alta/Media | ✓ banda (R1 y R2 Alta) · sigue FAIL — combinación (F5) | igual | igual | sí |
| CP-17 | Global Alta | ✗ Media · **FAIL — calibración** | igual | igual | no |
| CP-18 | Alta, antes y después | ✗ Media · **FAIL — calibración** | ✓ PASS | ✗ **FAIL — calibración** | sí |
| CP-19 | Fluctuante | PASS: M, M, A, M (no se ve la suba de marzo) | PASS: M, A, A, A (no se ve la baja de julio) | igual que A | no |
| CP-20 | E1 Alta | ✓ PASS | ✓ PASS | ✓ PASS | sí |

**Conteo por juego**

| Juego | PASS | FAIL — calibración | FAIL de la Fase 5 (sin cambio) | FAIL — calibración en casos no circulares |
|---|---|---|---|---|
| A | 13 | 3 (CP-05, CP-17, CP-18) | 4 (CP-01, CP-07, CP-12, CP-16) | CP-05, CP-17 (+ CP-01 secundaria) |
| B | 13 | 3 (CP-03, CP-05, CP-17) | 4 | CP-03, CP-05, CP-17 (+ CP-01) |
| C | 13 | 3 (CP-05, CP-17, CP-18) | 4 | CP-05, CP-17 (+ CP-01) |

A y B empatan en el conteo. A conserva el caso no circular (CP-03) y pierde uno circular (CP-18); B al revés. Por eso recomiendo A.

En ningún caso las bandas arreglan un FAIL de orden de la Fase 5: con estos cortes las bandas salen de `C_raw`, así que el paso 1 de D10 nunca contradice al paso 2. En CP-16 R1 y R2 quedan en la misma banda (Alta), que es el empate que permitiste; el orden lo sigue decidiendo `C_raw`.

---

## 5. Lo que esto dice sobre D14

Las bandas no cuentan para el criterio de falsación (protocolo §9 cuenta órdenes incorrectos, no bandas). Pero hay dos cosas que ningún corte sobre `C_raw` puede respetar, y las dejo anotadas:
1. **Severidad extrema con probabilidad baja** (CP-01 R1, CP-17, CP-18; blandas CP-09 y CP-15 R1): esperabas una banda más alta de la que deja el producto. Es el patrón de G2 (dudoso en la Fase 5). No suma un caso nuevo e independiente: lo arreglaría la misma corrección (un piso o una combinación que pese más la severidad).
2. **Amplitud** (CP-05 R1 contra R2, mismo 64): la banda que esperabas depende de cuántas dimensiones son graves, y `max()` lo descarta a propósito (D14; se quitó la amplitud de D10 por contar dos veces, CP-13). Es una tensión entre CP-05 y esa decisión, no un error de cálculo.

---

## 6. Qué queda para la 9b

- Ver la distribución de los tres juegos sobre los 252 riesgos sintéticos (protocolo §12.4–12.6). La señal a mirar ahí es Baja: en los casos queda casi vacía porque nadie adjudicó Baja, y el corte de 20 es el que más pesa en esa distribución.
- Ver cuántos riesgos sintéticos remotos con `consecuencia_extrema` o `safety_critical` quedan en Media o Baja (contradicción #2).
- Aplicar a la metodología y al changelog los cortes que apruebes (filas en `anexo-changelog-fase-9a.md`).
- Arreglar el texto de D23 y metodología §8.2 según lo que decidas en #2.
- La población de calibración no es la de aplicación (I15): la distribución de la 9b no se presenta como esperable en empresas reales.

---

## Para decidir

**1. Juego de cortes preliminar** (se vuelve a mirar en la 9b con los sintéticos)
- **A. Media ≥ 20, Alta ≥ 50, Crítica ≥ 75** ← recomendado. Es el único juego que respeta 12 de 13 bandas sin extremos, y conserva el caso no circular CP-03.
- B. Media ≥ 20, Alta ≥ 45, Crítica ≥ 75. Respeta una banda más con extremos (CP-18, que es circular) y rompe CP-03 R2.
- C. Media ≥ 20, Alta ≥ 50, Crítica ≥ 100. Como A, pero Crítica exige P ≥ 4 y CP-02 R2 no podría llegar nunca, aunque dijiste que puede.

Dentro del juego hay dos huecos sin casos que también decidís:
- **1a. Corte Baja/Media:** 20 ← recomendado (el más alto que deja todo lo adjudicado fuera de Baja); o algo más bajo, como 10 o 12 (Baja más chica, mismo resultado en los casos); o 24 o 25 (CP-01 R1 pasa a Baja).
- **1b. Corte de Crítica:** 75 ← recomendado (por CP-02); 80; o 100.

**2. Contradicción #2: ¿un riesgo remoto puede llegar a Crítica, y debe?**
Con cualquiera de estos juegos, un riesgo con P 1 llega como mucho a Media.
- **a. No llega, y está bien.** Visibilidad y tratamiento por las banderas, sin piso. CP-01 R1 queda FAIL — calibración dentro de G2. En la 9b se corrige el texto de D23. ← recomendado por ahora
- b. Piso Alta por bandera (`safety_critical` con I-personas 5, o `consecuencia_extrema`). Reabre D20 y D23 y es desviación del preregistro.
- c. Que la severidad pese más en la combinación. Es D14, fuera de la 9a.

**3. CP-05 R1** (Media con 64, igual que R2 Alta)
- **a. Queda FAIL — calibración** como evidencia de amplitud, sin cambiar reglas. ← recomendado
- b. Revisás la adjudicación de CP-05 R1 a Alta (como CP-14 en la Fase 5: pasaría a ser caso de origen de los cortes).
