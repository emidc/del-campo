# Revisión en frío del arnés de regresión · T-0021

> Workstream `BOS` (Risk OS). Revisión adversarial e independiente del arnés que existe en
> `SPIKES/T-0021/regresion-ejecutable/` (commit `dd21497`). Quien revisa no lo construyó. Se
> trató como no confiable cada afirmación del README hasta comprobarla.
>
> Fecha: 2026-10-07. Rama: `claude/optimistic-galileo-387njb`. Node 22.22.0, pnpm 11.19.0.
>
> **Aislamiento de la Fase 8.** No se leyó nada de `v0/fase-8/` ni de `v0/fase-9/` (en este
> checkout no existen). No se leyeron salidas de evaluadores ni se buscaron resultados de la
> Fase 8. No se modificó ningún archivo de `v0/` ni del arnés. Las mutaciones se hicieron
> sobre una copia en el scratchpad de la sesión, y el árbol de trabajo quedó igual (lo único
> modificado es `ops/runs/2026-10-07.jsonl`, que el hook de captura escribió al iniciar la
> sesión). El único archivo nuevo es este informe.
>
> Fuentes leídas: `AGENTS.md`, `CLAUDE.md`, `ENGINEERING_RULES.md`, `v0/metodologia-v0.md`
> (v0.2 congelada; es idéntica byte a byte a `fase-5/metodologia-v0.2-candidata.md`),
> `v0/protocolo.md` §2 y §8, `v0/adjudicacion-casos.md`, `v0/dry-run/reporte-dry-run.md` §2,
> `v0/fase-5/cambios-protocolo-v0.2.md`, `v0/fase-5/log-adjudicacion.md` (grupo 4A),
> `v0/fase-5/regresion/` (reporte, fichas y anomalías) y `v0/dry-run/fichas-dry-run.csv`.

---

## 1. Veredicto ejecutivo

**B: útil pero incompleto.** No llega a C porque las áreas que cubre (fórmula, V secuencial,
banderas sin `unknown`, anclas numéricas, órdenes con `C_raw` distinto) están bien
cubiertas, y porque el código no es circular: ninguna fixture la generó la implementación
bajo prueba. Tampoco es A. Una implementación con errores metodológicos reales pasa la suite
en verde en tres zonas, y son justamente las zonas que la v0.2 cambió o que la Fase 8 va a
ejercitar:

1. **Desempates de D10 después de `C_raw`.** En las fichas, cada empate de `C_raw` lo
   resuelven I efectivo e I-personas en el mismo sentido. Por eso sobreviven dos
   implementaciones prohibidas: invertir los pasos 3 y 4, y **volver a meter el desempate
   por amplitud** que la v0.2 quitó a propósito (§7.2, CP-13).
2. **I efectivo `≥ n` y la cota de §9.3.** Ninguna ficha evaluable tiene un factor
   `unknown`. Los tests de `≥ n` construyen el `ItemRanking` a mano y nunca pasan por
   `iEfectivo()`. Sobrevive marcar `completo` siempre como verdadero, y también usar el
   techo del `unknown` como valor de I efectivo (lo que prohíbe F5-6). Sobrevive además
   mover la frontera de §9.3 de `≤` a `<`.
3. **Riesgo padre.** Hay un solo padre, y su fila del CSV ya trae copiados los factores del
   hijo prioritario. Sobrevive rankear al padre con sus propios factores, y también el
   roll-up "máx P × máx I × máx V" que §1.4.1 prohíbe.

A eso se suma que la maquinaria de veredicto (`juzgar`) tiene ramas que ningún dato
ejercita. Si mañana una implementación produjera un empate prohibido por la adjudicación,
lo juzgaría código que nunca se probó. Hay además 3 de los 16 PASS que no evalúan ninguna
expectativa (CP-09, CP-11, CP-17), y 12 de los 28 "órdenes" que tienen un solo riesgo.

Números de la campaña propia: **93 mutaciones**, de las cuales 4 resultaron equivalentes.
De las 89 no equivalentes, la suite detectó 70 y **sobrevivieron 19**: 17 son
sustantivamente incorrectas y 2 son lecturas alternativas de un texto ambiguo.

---

## 2. Arquitectura del arnés

### 2.1 Piezas

| Pieza | Qué hace | De dónde saca sus datos |
|---|---|---|
| `metodologia.ts` | Capa de referencia: `vPorDimension`, `criticidad`, `evaluar` (§9.3), `techoPlausible`, `iEfectivo`, banderas, `valorDefendible`, anclas de P, económico y continuidad, `compararD10`, `rankingD10`, `posicionPadre` | Texto de la v0.2 (lectura del autor) |
| `fichas.ts` | Parser CSV propio (RFC 4180) y tipado de las 51 fichas de F5-REG-01. De F4 lee sólo identidad, historial y acción | `v0/fase-5/regresion/fichas-regresion.csv`, `v0/dry-run/fichas-dry-run.csv` |
| `verificacion.ts` | Recalcula los derivados de cada ficha, arma el ranking principal por momento, juzga las expectativas con las categorías de protocolo §8 | `metodologia.ts` + fichas |
| `casos.ts` | 20 casos escritos a mano: `momentos`, `adjudicacion` (expectativas tipadas), `aprobado`, `ordenRegistrado`, `bandas`, `juicio`; perfiles PV-1 a PV-5 | Transcripción del autor de `adjudicacion-casos.md`, `reporte-regresion.md` §2 y `log-adjudicacion.md` grupo 2 |
| `*.test.ts` | 144 tests | Ver §2.2 |

### 2.2 Mapa de dependencias de los resultados esperados

```
fichas-regresion.csv ──┬─ factores ──► metodologia.ts ──► derivados calculados ─┐
(F5-REG-01, otra sesión│                                                         ├─► "sólo quedan las discrepancias conocidas"
 que aplicó v0.2)      └─ derivados registrados (c_raw, determinante, techo…) ───┘     "C_raw: los 50 evaluables"

fichas-regresion.csv ── factores ──► rankingPrincipal ──► posiciones ──┐
reporte-regresion §2 ── transcrito a mano en casos.ts.ordenRegistrado ─┴─► "orden de cada momento"

adjudicacion-casos.md ── leído por el autor ──► casos.ts.adjudicacion ──► juzgar() ──► categoría ─┐
reporte-regresion §2 ── transcrito en casos.ts.aprobado ────────────────────────────────────────┴─► "veredicto de cada caso"

metodologia §5.5 y log grupo 2 ── transcritos en casos.ts.PERFILES_V ──► tests PV-1 a PV-5
narrativa de casos y log 4A ── montos, edades y duraciones a mano en el test ──► función de ancla ──► comparada con el factor de la ficha
§14 ── propiedad reescrita por el autor ──► recorrido exhaustivo de metodologia.ts
reporte-regresion §4 ── 125/1128 y 6 pares, escritos en el test ──► recodificación con dos lecturas elegidas para reproducirlos
```

**Circularidad de código: no la hay.** Las fixtures son anteriores al arnés (`21188c4`
contra `dd21497`), el commit del arnés no toca `v0/` y ningún test escribe datos. El patrón
"la implementación calcula X, la fixture sale de la misma implementación, el test compara X
con X" no ocurre.

**Circularidad epistémica: sí, parcial.** Tiene tres fuentes:

- Los derivados del CSV, los órdenes y los veredictos del reporte los produjo **otra
  aplicación de la misma especificación**: la sesión de la Fase 5, que además redactó la
  v0.2. Que dos implementaciones coincidan prueba que la aritmética es consistente. No
  prueba que la lectura de la especificación sea la correcta.
- Algunas expectativas de `casos.ts` se ajustaron al veredicto aprobado, no a la
  adjudicación. CP-01 "R2 = R3" se codificó `sin_orden` porque "el reporte de F5 no contó
  como falla" esa diferencia. CP-11 quedó sin ninguna expectativa.
- La recodificación reproduce 125/1128 y los 6 pares sólo con dos lecturas elegidas para
  reproducirlos (README #15).

### 2.3 Valores copiados a mano en el código de test

- `casos.ts`: todas las expectativas, los veredictos aprobados, los 28 órdenes, las bandas y
  los perfiles PV.
- `metodologia.test.ts`:
  - montos de CP-11, CP-13 y CP-16;
  - edades en meses de CP-12 (`[6, 18]`, `[12]`, `[36]`) y de CP-16 (`[10]`), y los meses
    con registro (24, 60, 120);
  - las banderas de comparables/sector de CP-08, CP-11, CP-13 y CP-19;
  - duraciones de continuidad;
  - los ejemplos de AN-0158 y AN-0159.
- `fichas.test.ts`: `DISCREPANCIAS_CONOCIDAS`, 125, 1128, los 6 ids de pares, y los conteos
  51, 50, 48 y 14.
- `casos.test.ts`: los `C_raw` de los hijos de CP-12 (10, 40, 50), los `C_d` de CP-18
  (45, 9) y las cadenas de conflictos de bandas.

### 2.4 Comprobaciones sólo diagnósticas

El bloque de bandas (3 tests). No decide veredictos, pero sí afirma conclusiones exactas: que
"ningún corte monótono reproduce las bandas" y que el conflicto es `EV-0060(48)/EV-0052(20)`.

---

## 3. Matriz de independencia de los valores esperados

| Clase de aserción | Fuente del esperado | Clasificación | Observación |
|---|---|---|---|
| `V_d` (PV-1 a PV-5) | Tabla del log grupo 2 y ejemplo de §5.5 | **INDEPENDIENTE** (del código) | Son ejemplos del propio autor de la regla. Los cinco perfiles tienen I = 4 en todo y c, r ∈ {1, 3, 5}: ninguno ejercita ⌈·⌉ con c+r impar. Eso lo cubren las fichas (EV-0061: c 5, r 4) |
| `C_d`, `C_raw` sobre fichas | Columna `c_raw` del CSV (F5-REG-01) | **INDEPENDIENTE** (otra implementación) | Un tercer oráculo propio en Python (`csv` estándar, sin código del arnés) reproduce los 50 `C_raw` y las 50 determinantes |
| `C_raw` en casos sintéticos | Aritmética escrita en el comentario | INDEPENDIENTE | Pocos casos |
| "30 valores posibles" (§6.3) | Producto calculado dentro del test | **TAUTOLÓGICO** | No llama a ningún código del arnés |
| Dimensión determinante | Columna del CSV | INDEPENDIENTE | Sólo factores conocidos. Con `unknown` no hay ningún test (U07) |
| I efectivo completo | Columna del CSV | INDEPENDIENTE | |
| I efectivo `≥ n` | Casos sintéticos con `ItemRanking` armado a mano | **MÁS DÉBIL DE LO QUE DICE EL NOMBRE** | `iEfectivo()` nunca recibe un `unknown` en ningún test (O13 y D04 sobreviven) |
| Orden por momento | `reporte-regresion` §2, transcrito | INDEPENDIENTE del código, **débil** | 12 de 28 momentos tienen un solo riesgo. En los 16 restantes los empates nunca separan el paso 3 del 4 |
| Empates | CP-20, PV-5 = PV-2, PV-1 = PV-4 | INDEPENDIENTE | |
| Veredicto PASS/FAIL | `aprobado` del reporte + expectativas codificadas por el autor | **PARCIALMENTE INDEPENDIENTE** | Algunas codificaciones se ajustaron al veredicto aprobado. CP-09, CP-11 y CP-17 son PASS sin ninguna expectativa |
| Propiedades §14 | Texto de §14 reescrito como invariante | PARCIALMENTE INDEPENDIENTE | La 4 sólo prueba solidez, no completitud. La 7 y "techo ≥ C_raw" casi se siguen de la fórmula |
| Recodificación | Números del reporte §4 | **AJUSTADO** | Las dos lecturas se eligieron para reproducir el número |
| Incertidumbre (F5-1) | Regla aplicada al CSV | INDEPENDIENTE como control de la fixture | No hay ninguna función que implementar ni que mutar: no protege a una implementación futura |
| Padre / sub-riesgo | Sintéticos + fila del padre que copia a R1c | **MÁS DÉBIL DE LO QUE DICE EL NOMBRE** | `mismosFactores(EV-0079, EV-0082)` comprueba la fixture, no la implementación |
| Dato auxiliar (§4.2.3) | Montos de la narrativa (a mano) → rango de la ficha | PARCIALMENTE INDEPENDIENTE | No hay ningún caso con costos directos que crucen un corte en el máximo (D01) |
| Anclas de P | Lecturas a mano → P de la ficha | PARCIALMENTE INDEPENDIENTE | Precisión inventada en las edades. CP-08 R1 tiene una lectura distinta de la del log (§4) |
| Continuidad | Duración de la narrativa → factor de la ficha | PARCIALMENTE INDEPENDIENTE | |
| Bandas (diagnóstico) | Codificación del autor + supuesto "sólo cortan `C_raw`" | **UNCLEAR** | Afirma como test una conclusión de calibración que corresponde a la Fase 9 |

---

## 4. Integridad de las fixtures

Se recorrieron las 51 filas de F5 contra su ficha de F4, con un script propio, factor por
factor (valor, min, max, base) y `uncertainty`.

**F5 = F4 más los cambios que el reporte declara, y nada más.** Los únicos cambios son:

- 14 `i_econ` que pasan de `unknown` a un valor (los 14 que dice el reporte);
- rangos de V que se quitan (EV-0053, 0066, 0067, 0069, 0073, 0092, 0079);
- P 2 → 3 en CP-11 A y B;
- `p_max` 5 → 4 en CP-19 marzo a julio;
- `uncertainty` low → medium en EV-0066 y EV-0067;
- el padre EV-0079, que toma los factores de R1c.

Ningún factor cambió sin estar declarado. Esto es evidencia favorable que el arnés **no**
comprueba por sí mismo.

**Discrepancias confirmadas** (el arnés ya las registra y aquí se corroboran):

- EV-0066 y EV-0067: `consecuencia_extrema_dimensiones = cont`, debería ser `econ;cont`.
- EV-0071: `v_aspectos_aplicables` está en formato v0.1.
- Falta la columna `prioridad_provisional`. F4 y F5 tienen las mismas 88 columnas, y el
  encabezado de F5 es el de v0.1.

**Hallazgos nuevos:**

1. **CP-08 R1 tiene en el test una lectura de P distinta de la del log 4A.**
   - `metodologia.test.ts`, test "condición causal…", mete a EV-0070 junto con CP-11 y CP-19
     como "sector sin comparables" (base 2, +1).
   - `log-adjudicacion.md`, línea 204, dice: "CP-08-R1: comparable hace seis años (2) más
     polvo (+1): 3".
   - El número coincide y la lectura no. El test afirma una ruta de anclas que la
     adjudicación no siguió.
2. **Edades con precisión inventada.** "Dos en dos años" se transcribió como `[6, 18]` con
   24 meses de registro. El resultado no cambia con ninguna elección dentro de la narrativa,
   pero los números no están en la evidencia.
3. **Otra ficha con rango económico que cruza niveles y `uncertainty = low`.** La lista del
   README omite EV-0056 (CP-01 R5, `i_econ` 1–2). Su base es `reported`, así que F5-1 no se
   le aplica literalmente. Es una omisión menor.
4. **El padre tiene `C_raw` y `evaluable = true` propios.** EV-0079 lleva `c_raw = 50` y
   entra en "los 50 evaluables". Protocolo v0.2 §2.1 dice que el padre "no lleva factores ni
   score propios" y que se muestra con los del hijo. La fila es una copia, no un score, pero
   el test la valida como si fuera una ficha evaluable más. Esto esconde el punto ciego P01.
5. **El control de §9.2 no mira los rangos de `v_rec`.** El test "todo rango registrado
   tiene como máximo tres niveles" recorre P, I y `v_cont`, pero no `v_rec`. En los datos
   actuales los rangos de `v_rec` cumplen; el control queda incompleto.
6. **Expectativas que reflejan una adjudicación, no la metodología.** CP-14 (adjudicación
   revisada), CP-12 forma B ("debe usarse el padre", sacado de la nota) y CP-18 ("econ y
   cont `igual`", más estricto que "puede permanecer").

No se corrigió ninguna fixture.

---

## 5. Reproducción independiente de los casos

Se recalcularon desde las fuentes, sin código del arnés, los veredictos, órdenes y `C_raw`:

- **Fichas:** 51, de las cuales 50 son evaluables. La única no evaluable es EV-0071 (CP-08
  R2: P, contención y recuperación `unknown`). Ningún evaluable tiene un factor `unknown`.
- **Casos:** 20 casos en 28 momentos.
  - 16 PASS y 4 FAIL: CP-01, CP-12 y CP-16 por combinación; CP-07 por ranking. CP-01 tiene
    secundaria ranking. CP-14 es FAIL contra la adjudicación original.
  - El arnés lo reproduce y coincide con `reporte-regresion.md` §2.
- **Órdenes:** los 16 momentos con más de un riesgo coinciden con el reporte, empate de
  CP-20 R1 = R2 incluido. Los empates de `C_raw` se resuelven así:
  - CP-01 (R1, R2 y R4 en 20): R1 > R2 por I-personas, R2 > R4 por I efectivo;
  - CP-05 (64): por I-personas;
  - CP-07 (36): por I efectivo;
  - CP-13 (64): por I-personas;
  - CP-20 (45): empate;
  - PV-5 = PV-2 y PV-1 = PV-4: empates.
- **`C_raw`:** los 50 coinciden con el CSV y con los números del reporte (CP-10 48 → 36,
  CP-19 30 → 45 → 60 → 45, CP-18 45 → 45 con personas 45 → 9, CP-20 E1 60).
- **Expectativas no resueltas a propósito:** CP-04 y CP-12 con empate "No necesario"
  (`no_especificado`). CP-11 sin orden (CH-075). CP-12 sin invariancia (§1.3.6). CP-08: el
  "Sí" de empate se aplicó al único par ordenado.

**¿Puede un caso pasar con sólo una parte de su restricción?**

- **CP-01: no.** `cadena()` genera los 6 pares de R1 > R4 > R5 > R2, más R1/R4/R5 > R3. El
  test de fallas exige exactamente las tres que corresponden. Es el caso mejor codificado.
- **CP-01 "R2 = R3": no se exige.** Queda como `sin_orden`, que siempre cumple.
- **CP-09, CP-11 y CP-17:** su veredicto PASS es vacuo, porque `adjudicacion: []` pasa con
  cualquier metodología. Sus tests propios comprueban algo de la fixture: una sola ficha,
  factores iguales, nivel económico de B mayor que el de A.
- **CP-10 y CP-19:** dependen de un solo `movimiento` cada uno. Lo que agrega CP-10 ("menor
  que el esperado") está en un test aparte, que sí es fuerte.
- **CP-18:** "pers baja; econ y cont iguales". Una implementación que bajara `C_raw` no
  pasaría, pero la exigencia de igualdad exacta es del autor.
- **"Ningún criterio queda indeterminado"** es una buena defensa. Pero las ramas de empate
  de `juzgar` nunca se ejercitan con datos: J03 y J04 sobreviven.

---

## 6. Revisión de los tests de propiedades

| Propiedad | Regla | Dominio real | Problemas |
|---|---|---|---|
| 1 · Monotonía | §14.1 | 93.750 combinaciones de factores conocidos; vecinos que suben un factor un nivel | Es completa para factores conocidos. **No incluye `unknown` ni `≥ n`**, porque los ítems salen de `criticidad` e `iEfectivo` sobre factores conocidos. La "posición" se mide por pares con `compararD10`, no dentro de un ranking. No prueba si `evaluar` es monótona (AN-0021/0023 son puntos abiertos conocidos). No ve O01, O02 ni O03 porque los tres desempates son monótonos |
| 3 · Causalidad de V | §14.3 | 93.750 | Fuerte y correcta: compara contra `no_aplica` |
| 7 · Sensible a la mejora (P11) | §14.7 | 25 pares (c, r) sobre `vPorDimension` | Para la recuperación, la condición `bajaAlguna \|\| c ≤ r−1` se cumple siempre con la fórmula: el test casi se deduce de la tabla. Igual detectó V05 y V06 |
| 4 · Unknown | §14.4, §9.3 | 12.150 combinaciones: I ∈ {1, 3, 5}, un solo `unknown` a la vez, max ∈ {sin max, 1, 3, 5}; P nunca `unknown` | **Sólo prueba solidez** (si es evaluable, el `C_raw` es correcto), **no completitud** (que no saque del ranking a quien no corresponde). Por eso U01 sobrevive. Excluye I = 2 y 4, max 2 y 4, dos `unknown` a la vez y `unknown` con `min`. Sólo mira `C_raw`: ni determinantes, ni I efectivo, ni banderas. El `assert.equal` no tiene mensaje, así que un fallo de 12.150 iteraciones llega sin contexto |
| Techo ≥ `C_raw` | §6.6 | 93.750 combinaciones **sin rangos** (`aFactores` no pone min/max) | Sin rangos, el techo es idéntico a `C_raw`: el test casi no restringe nada. El techo con rangos lo cubren las fichas |
| 5 · Separación | §14.5 | Dos `assert.throws` | Ejemplos, no dominio. Suficiente para la regla |
| 6 · Historial | §14.6 | Las 51 fichas | Control de la fixture |
| 8 · Recodificación | §14.8 | 48 fichas | Ajustado a los números del reporte (ver §3) |
| 2 · Padre como agrupador | §14.2 | Cuatro sintéticos + un padre real | No hay prueba de que el padre no tenga score propio: P01 y P02 sobreviven |

Los recorridos exhaustivos son matemáticamente fuertes **sobre el dominio que recorren**.
Ese dominio excluye por construcción las partes nuevas de la v0.2 (`≥ n`, la cota de §9.3) y
todo lo que pasa después de `C_raw` en el ranking.

---

## 7. Campaña de mutación adversarial

Se plantaron 93 mutaciones, cada una en una copia limpia del arnés (`v0/` enlazado en modo
lectura). Cada mutación es un error plausible de implementación y se diseñó con
independencia de las 12 del autor. Se corrió la suite completa y se registraron los tests
que fallaron. "Directa" quiere decir que falló un test cuyo objeto es la regla mutada.
"Incidental" quiere decir que la detectó un snapshot amplio (`C_raw` de las fichas,
"sólo quedan las discrepancias conocidas", recodificación, conteo) sin un test de la regla.
"1 test" marca las mutaciones que detecta un único test: son reglas con una sola línea de
defensa.

| Resultado | Cantidad |
|---|---|
| Detectadas, directa | 38 |
| Detectadas, directa con un único test | 22 |
| Detectadas, sólo incidental | 9 |
| Detectadas, directa e incidental | 1 |
| **Sobreviven, sustantivamente incorrectas** | **17** |
| Sobreviven, lectura alternativa de un texto ambiguo | 2 |
| Equivalentes (no cuentan) | 4 (V02 `round`≡`ceil` sobre medios; V11 `no_aplica`≡5; V12; D09) |

### Tabla completa

| Id | Error plantado | Fallan | Detección | Tests que la detectan (primeros) |
|---|---|---|---|---|
| A01 | C_raw = min_d en vez de max_d (criticidad) | 8 | directa | PV-2 (c 5 / r 1): V_d y C_raw de la tabla del log; orden aprobado PV-5 = PV-2 > PV-3 > PV-1 = PV-4 (sin desem… (+6) |
| A02 | C_raw = min_d en evaluar (sólo evaluar) | 28 | directa | CP-01: FAIL — combinación; CP-03: PASS (+26) |
| A03 | C_d usa V = contención en todas las dimensiones (recuperación ignorada) en criticidad | 4 | directa | mejora de un solo aspecto (respuesta 2c–2d de Emiliano); ejemplo de AN-0159: CP-16 R2 4×4×4 = 64 por personas, R1 4×… (+2) |
| A04 | C_d = P × I efectivo × V_d (I único en vez de por dimensión) en evaluar | 11 | directa | CP-04: PASS; CP-07: FAIL — ranking (+9) |
| A05 | Determinante: sólo la primera dimensión que da el máximo (criticidad y evaluar) | 3 | directa | sólo quedan las discrepancias conocidas; mejora de un solo aspecto (respuesta 2c–2d de Emiliano) (+1) |
| A06 | Determinante: la dimensión de mayor I_d en vez de mayor C_d (evaluar) | 1 | incidental | sólo quedan las discrepancias conocidas |
| A07 | Corte económico 30% → 25% para el nivel 4 (ancla mal transcrita) | 2 | directa | los cuatro cortes exactos van al nivel superior; [F5-1] CP-13 R1 sin margen de contribución: multa 0,4 M + 1… |
| A08 | Corte económico 2% → 1% para el nivel 2 | 1 | directa (1 test) | los cuatro cortes exactos van al nivel superior |
| V01 | V_econ con floor en vez de ceil | 5 | directa | sólo quedan las discrepancias conocidas; C_raw: los 50 evaluables coinciden exactamente (+3) |
| V02 | V_econ con Math.round (¿equivalente?) | 0 | EQUIVALENTE | — |
| V03 | V_econ = promedio sin tope de contención | 26 | directa | CP-01: FAIL — combinación; CP-03: PASS (+24) |
| V04 | V_econ = min(c, r) (igual que continuidad) | 8 | directa | sólo quedan las discrepancias conocidas; C_raw: los 50 evaluables coinciden exactamente (+6) |
| V05 | Recuperación aplicada a personas (pers = min(c, r)) | 6 | directa | PV-2 (c 5 / r 1): V_d y C_raw de la tabla del log; las respuestas de Emiliano son ordinalmente consistentes con V_… (+4) |
| V06 | Recuperación aplicada a legal (legal = fórmula económica) | 6 | directa | PV-2 (c 5 / r 1): V_d y C_raw de la tabla del log; las respuestas de Emiliano son ordinalmente consistentes con V_… (+4) |
| V07 | Continuidad = sólo recuperación (contención no aplica a continuidad) | 25 | directa | CP-01: FAIL — combinación; CP-03: PASS (+23) |
| V08 | Continuidad = peor aspecto (max) — regla v0.1 sólo en continuidad | 31 | directa | CP-01: FAIL — combinación; CP-03: PASS (+29) |
| V09 | Secuencial invertido en econ: min(r, ⌈(c+r)/2⌉) | 30 | directa | CP-01: FAIL — combinación; CP-03: PASS (+28) |
| V10 | no_aplica tratado como recuperación 1 (mejor) | 9 | directa | CP-12: FAIL — combinación; conteo: 16 PASS y 4 FAIL (CP-01, CP-12, CP-16 combinación;… (+7) |
| V11 | no_aplica tratado como recuperación 5 (README: equivalente) | 0 | EQUIVALENTE | — |
| V12 | V_econ reescrito por casos: r<c → ⌈(c+r)/2⌉; si no, min(c, r) | 0 | EQUIVALENTE | — |
| P01 | Padre rankeado con los factores de su propia ficha (ignora a los hijos) | 0 | **SOBREVIVE** | — |
| P02 | Padre = roll-up prohibido: max P × max I_d × max V entre hijos (mezcla factores) | 0 | **SOBREVIVE** | — |
| P03 | Hijo prioritario por C_raw solamente (sin desempate D10: todos los de C_raw máximo empatan) | 0 | **SOBREVIVE** | — |
| P04 | Hijo prioritario = el último del ranking (comparador invertido) | 3 | directa | CP-12: los hijos se ordenan R1c > R1b > R1a, sin empate; el p…; §1.4 / protocolo v0.2 §2.1: el padre CP-12 R1-B lleva los f… (+1) |
| P05 | Padre: hijo no evaluable no vuelve provisional | 1 | directa (1 test) | un hijo no evaluable vuelve provisional la posición |
| P06 | Padre con un hijo no evaluable: sin posición (en vez de provisional) | 1 | directa (1 test) | un hijo no evaluable vuelve provisional la posición |
| P07 | Padre se muestra sólo con el primero de los hijos empatados | 1 | directa (1 test) | hijos empatados en el primer lugar: se muestran todos |
| U01 | §9.3 frontera: cota = C_raw ⇒ no evaluable (> cambiado a ≥) | 0 | **SOBREVIVE** | — |
| U02 | §9.3: unknown con max se trata como conocido con valor = max (supuesto) | 1 | directa (1 test) | 4 · unknown: si el riesgo es evaluable, ningún valor posible … |
| U03 | §9.3: unknown sin max acotado con 4 en vez de 5 | 1 | directa (1 test) | 4 · unknown: si el riesgo es evaluable, ningún valor posible … |
| U04 | §9.3: unknown acotado con su min (piso) en vez de max | 2 | directa | sin max, la cota usa 5: si supera C_raw, no evaluable; 4 · unknown: si el riesgo es evaluable, ningún valor posible … |
| U05 | §9.3: recuperación unknown vuelve desconocidas también personas y legal | 1 | directa (1 test) | recuperación unknown sólo afecta econ y continuidad: persona… |
| U06 | §9.3: recuperación unknown ignorada en econ (econ se cuenta como conocida) | 1 | directa (1 test) | 4 · unknown: si el riesgo es evaluable, ningún valor posible … |
| U07 | §9.3: determinantes incluyen dimensiones unknown cuya cota iguala C_raw | 0 | sobrevive (interpretativa) | — |
| U08 | §9.3: sin dimensión conocida ⇒ evaluable con la mayor cota | 2 | directa | contención unknown deja sin dimensión conocida → no evaluable; 4 · unknown: si el riesgo es evaluable, ningún valor posible … |
| U09 | §6.6 techo: rango colapsado al valor | 3 | directa | CP-08: R1 se ordena por C_raw (60), no por el techo (100); R2…; sólo quedan las discrepancias conocidas (+1) |
| U10 | §6.6 techo: unknown sin max usa 4 | 1 | incidental | sólo quedan las discrepancias conocidas |
| U11 | §8 banderas: unknown sin max dispara (P2 "unknown no es bajo") | 1 | directa (1 test) | no evaluable: unknown con max registrado en el umbral dispara… |
| U12 | §8 banderas: unknown nunca dispara (ignora max) | 1 | directa (1 test) | no evaluable: unknown con max registrado en el umbral dispara… |
| U13 | §9.2 tabla: rango de 4 niveles admitido (> 2 → > 3) | 1 | directa (1 test) | rango > 3 niveles → unknown, aunque haya preferencia |
| O01 | D10: pasos 3 y 4 intercambiados (I-personas antes que I efectivo) | 0 | **SOBREVIVE** | — |
| O02 | D10: reintroduce desempate por amplitud (nº de dimensiones en I efectivo) entre pasos 3 y 4 | 0 | **SOBREVIVE** | — |
| O03 | D10: amplitud después de I-personas (antes del empate legítimo) | 0 | **SOBREVIVE** | — |
| O04 | D10: paso 4 invertido (menor I-personas primero) | 8 | directa | CP-05: PASS; CP-13: PASS (+6) |
| O05 | D10: paso 3 invertido (menor I efectivo primero) | 7 | directa | CP-07: FAIL — ranking; conteo: 16 PASS y 4 FAIL (CP-01, CP-12, CP-16 combinación;… (+5) |
| O06 | D10: ≥ n tratado como valor exacto n (incompleto ignorado) | 2 | directa | ≥ n queda indeterminado si lo desconocido podría cambiar el o…; I-personas unknown: misma regla en el paso 4 |
| O07 | D10: indeterminado se resuelve como empate legítimo (no provisional) | 2 | directa | ≥ n queda indeterminado si lo desconocido podría cambiar el o…; I-personas unknown: misma regla en el paso 4 |
| O08 | Ranking: bloque indeterminado ordenado arbitrariamente (orden estable oculta el indeterminado) | 1 | directa (1 test) | ≥ n queda indeterminado si lo desconocido podría cambiar el o… |
| O09 | D10: P como desempate final (mayor P primero) — prohibido | 4 | directa | CP-01: FAIL — combinación; CP-01 unico (+2) |
| O10 | Ranking: desempate final por risk_id (orden total, sin empates legítimos) | 7 | directa | CP-20: PASS; conteo: 16 PASS y 4 FAIL (CP-01, CP-12, CP-16 combinación;… (+5) |
| O11 | D10: banda/C_raw comparado al revés en un solo sentido (menor C_raw primero) | 2 | directa | C_raw decide antes que I efectivo e I-personas; 1 · monotonía: subir P, una dimensión de I o un aspecto de… |
| O12 | D10 paso 4: I-personas unknown tratado como 1 conocido | 1 | directa (1 test) | I-personas unknown: misma regla en el paso 4 |
| O13 | I efectivo: completo siempre true (no se muestra ≥ n) | 0 | **SOBREVIVE** | — |
| I01 | Carga: i_legal se lee de la columna de i_cont | 9 | incidental | CP-04: PASS; CP-07: FAIL — ranking (+7) |
| I02 | Carga: v_rec ignorado (siempre no_aplica) | 11 | directa (CP-04/CP-14) + incidental | CP-04: PASS; CP-07: FAIL — ranking (+9) |
| I03 | Carga: v_cont "4" leído como 3 | 16 | incidental | CP-10: PASS; CP-16: FAIL — combinación (+14) |
| I04 | Carga: i_pers "5" leído como 4 | 4 | incidental | CP-18: la acción saca a la gente del radio (personas 5 → 1); …; sólo quedan las discrepancias conocidas (+2) |
| I05 | Carga: max vacío tratado como 5 | 2 | incidental | sólo quedan las discrepancias conocidas; §9.2: todo rango registrado tiene como máximo tres niveles y… |
| I06 | Carga: min vacío tratado como 1 (vacío = piso) | 1 | incidental | §9.2: todo rango registrado tiene como máximo tres niveles y… |
| I07 | Carga: primera ficha duplicada | 6 | directa | 51 fichas, todas de metodologia v0.2, con motivo cambio_vers…; §14 propiedad 6 · historial: cada ficha nueva apunta a la de… (+4) |
| I08 | Carga: una ficha omitida (EV-0101, CP-20 R3) | 10 | directa | CP-20: PASS; conteo: 16 PASS y 4 FAIL (CP-01, CP-12, CP-16 combinación;… (+8) |
| I09 | Casos: CP-17 omitido | 2 | directa | son los 20 casos de propiedad; conteo: 16 PASS y 4 FAIL (CP-01, CP-12, CP-16 combinación;… |
| I10 | Carga: caso_empresa ignorado (todas la misma organización) | 3 | directa | CP-11: el nivel económico refleja la escala de cada empresa …; §7.1.4 (CH-075): no existe un ranking con riesgos de organiz… (+1) |
| I11 | Carga: p_max ignorado | 2 | incidental | CP-08: R1 se ordena por C_raw (60), no por el techo (100); R2…; sólo quedan las discrepancias conocidas |
| I12 | Casos: CP-12 se queda con forma B sin R2 (momento incompleto) | 4 | directa | CP-12: FAIL — combinación; conteo: 16 PASS y 4 FAIL (CP-01, CP-12, CP-16 combinación;… (+2) |
| B01 | §3.3 ancla 5: la ocurrencia de hace exactamente 36 meses no cuenta para la frecuencia | 0 | **SOBREVIVE** | — |
| B02 | §3.3 ancla 5: ventana siempre 36 meses (ignora período con registro menor) | 1 | directa | CP-12 (log 4A y fichas): R1a/R1c dos en dos años = 5, R1b un… |
| B03 | §3.3 ancla 5: frecuencia "más de una por año" (estricto) | 2 | directa | bordes del 5: frecuencia media de al menos una por año en lo…; CP-12 (log 4A y fichas): R1a/R1c dos en dos años = 5, R1b un… |
| B04 | §4.4: 2 semanas exactas ya es nivel 4 | 1 | directa (1 test) | bordes: < 1 día, 1–3 días, hasta 2 semanas, hasta 3 meses, m… |
| B05 | §4.4: 3 días exactos ya es nivel 3 | 1 | directa (1 test) | bordes: < 1 día, 1–3 días, hasta 2 semanas, hasta 3 meses, m… |
| B06 | §4.4: 1 día exacto es nivel 1 | 1 | directa (1 test) | bordes: < 1 día, 1–3 días, hasta 2 semanas, hasta 3 meses, m… |
| B07 | §8.2 safety_critical desde 5 (sólo muertes múltiples) | 3 | directa (1 test) | sólo quedan las discrepancias conocidas; safety_critical si i_pers ≥ 4; el 3 no la dispara (+1) |
| B08 | §4.2.3 rango sin margen: costos directos no entran en el mínimo | 1 | directa (1 test) | [F5-1] CP-13 R1 sin margen de contribución: multa 0,4 M + 1,… |
| B09 | §3.4 ajustes: −1 y +1 no se compensan (gana +1) | 1 | directa (1 test) | ajustes: uno por sentido, compensables, nunca fuera de 1–5 |
| B10 | §3.3 comparables: precursor propio no da 3 (sólo comparables) | 1 | directa (1 test) | precursor sin antecedentes propios = ancla 3; con la condici… |
| J01 | Veredicto: "mitad inferior" con floor (R1 tercero de cinco ya está abajo) | 0 | sobrevive (interpretativa) | — |
| J02 | Veredicto: visible ignora safety_critical | 0 | **SOBREVIVE** | — |
| J03 | Veredicto: empate con columna no_especificado cuenta como cumple | 0 | **SOBREVIVE** | — |
| J04 | Veredicto: empate no permitido cuenta como cumple | 0 | **SOBREVIVE** | — |
| J05 | Veredicto: falla de orden siempre "combinación" | 4 | directa | CP-01: FAIL — combinación; CP-07: FAIL — ranking (+2) |
| J06 | Veredicto: movimiento "igual" acepta también "baja" | 0 | **SOBREVIVE** | — |
| D01 | §4.2.3 rango sin margen: costos directos no entran en el máximo | 0 | **SOBREVIVE** | — |
| D02 | I efectivo calculado sin la dimensión legal | 12 | directa | CP-05: PASS; CP-07: FAIL — ranking (+10) |
| D03 | §8.1 consecuencia_extrema ignora el max de un unknown | 0 | **SOBREVIVE** | — |
| D04 | I efectivo con unknown: n incluye el max del unknown (usa el techo, prohibido por F5-6) | 0 | **SOBREVIVE** | — |
| D05 | CH-075: sólo se rechaza con más de dos organizaciones | 1 | directa (1 test) | §7.1.4 (CH-075): no existe un ranking con riesgos de organiz… |
| D06 | I-personas tomado de la dimensión determinante en vez de pers (paso 4) | 6 | directa | CP-05: PASS; conteo: 16 PASS y 4 FAIL (CP-01, CP-12, CP-16 combinación;… (+4) |
| D07 | Ranking principal: los no evaluables con motivo vacío | 1 | directa (1 test) | CP-08: R1 se ordena por C_raw (60), no por el techo (100); R2… |
| D08 | Ítem del padre con un I-personas que no es el de su hijo prioritario (`iPers = 5`) | 0 | **SOBREVIVE** | — |
| D09 | V_econ: ⌈(c+r)/2⌉ con r tope 4 (recuperación 5 se trata como 4) | 0 | EQUIVALENTE | — |
| D10 | §9.3: con contención unknown, personas y legal se consideran conocidas | 2 | directa | contención unknown deja sin dimensión conocida → no evaluable; 4 · unknown: si el riesgo es evaluable, ningún valor posible … |
| D11 | Techo: V_d del techo con recuperación en su min | 1 | incidental | sólo quedan las discrepancias conocidas |
| D12 | Techo: P sin rango (usa valor de P) | 3 | directa | CP-08: R1 se ordena por C_raw (60), no por el techo (100); R2…; sólo quedan las discrepancias conocidas (+1) |

Lectura de la tabla:

- **La aritmética de V y la fórmula** se detectan muy bien, casi siempre con 5 a 31 tests y
  de forma directa.
- **Los errores de carga** se detectan casi siempre por los snapshots (`C_raw` de las
  fichas, discrepancias). Es una detección real, pero incidental: el diagnóstico obliga a
  leer un diff de snapshot.
- **22 reglas tienen una sola línea de defensa.** Entre ellas: corte del 2%, frontera de
  §9.2, 1 y 3 días, 2 semanas, compensación de ajustes, provisional del padre, CH-075 y
  `I-personas unknown`.

---

## 8. Mutaciones que sobreviven

Cada una se minimizó y se comprobó contra la capa de referencia, con la versión original y
con la mutada (script en el scratchpad de la sesión, fuera del repo).

### 8.1 D10: I-personas antes que I efectivo (O01)

```diff
- const paso3 = compararAcotado(iEfectivo a, b); if (paso3 !== 'empate') return paso3
- return compararAcotado(iPers a, b)
+ const paso4 = compararAcotado(iPers a, b); if (paso4 !== 'empate') return paso4
+ return compararAcotado(iEfectivo a, b)
```

- **Contraejemplo.** A: P 4, I (5, 1, 1, 1), contención 3, recuperación `no_aplica` →
  `C_raw` 60, I efectivo 5, I-personas 1. B: P 3, I (1, 4, 1, 1), contención 5 → `C_raw`
  60, I efectivo 4, I-personas 4. La v0.2 pone primero a A (paso 3). La mutación pone
  primero a B.
- **Por qué es incorrecto.** §7.2 fija el orden de los pasos.
- **Por qué no se detecta.** En las fichas, en cada empate de `C_raw` (CP-01, CP-05, CP-07,
  CP-13) los dos criterios eligen al mismo riesgo. Los sintéticos de D10 tienen I-personas
  igual o incompleto.
- **Test que falta.** El de este contraejemplo.

### 8.2 D10: vuelve el desempate por amplitud (O02, O03)

```diff
  if (paso3 !== 'empate') return paso3
+ const amp = a.iEfectivo.dimensiones.length - b.iEfectivo.dimensiones.length
+ if (amp !== 0) return amp > 0 ? 'antes' : 'despues'
```

- **Contraejemplo.** P 3, contención 3, recuperación `no_aplica`. A: I (4, 1, 4, 4). B: I
  (4, 2, 1, 1). Los dos tienen `C_raw` 36 e I efectivo 4. La v0.2 pone primero a B
  (I-personas 2 > 1). O02 pone primero a A. Con I-personas igual, B' = I (4, 1, 1, 1): la
  v0.2 da empate legítimo y O03 pone primero a A.
- **Por qué es incorrecto.** §7.2: "Se quita el desempate por amplitud de I: cuenta dos
  veces la misma pérdida (CP-13)". Es la regla que la Fase 5 decidió quitar.
- **Por qué no se detecta.** En CP-01, CP-05, CP-13 y CP-20 la amplitud coincide con
  I-personas o empata. Los sintéticos usan `dimensiones: []`. La monotonía no la detecta
  porque el desempate es monótono.
- **Test que falta.** "Con igual `C_raw`, I efectivo e I-personas, distinta amplitud: empate
  legítimo."

### 8.3 `iEfectivo` no marca `≥ n` (O13) o usa el techo del `unknown` (D04)

- **Contraejemplo de O13.** A: P 3, I (4, 1, unknown máx 5, 1), contención 5, recuperación
  1 → evaluable, `C_raw` 36 (la cota de continuidad es 15). B: P 3, I (4, 1, 1, 1),
  contención 3, recuperación 3 → 36. La v0.2 da paso 3 indeterminado y posición
  provisional común. O13 da empate legítimo con `provisional: false`, y el CSV derivado
  diría `4` en lugar de `≥ 4`.
- **Contraejemplo de D04.** Con los mismos A y B, D04 calcula I efectivo de A = 5 a partir
  del máx del `unknown`, y A queda primero. Es exactamente "el techo de la `unknown` nunca
  se usa como valor" (§7.2 [F5-6]).
- **Por qué no se detecta.** Ninguna ficha tiene un I `unknown`. Los tests "≥ n…" y "el
  techo nunca gana" construyen `{ n, completo }` a mano y no llaman a `iEfectivo()`.
- **Test que falta.** De punta a punta: `Factores` con un `unknown` → `evaluar` → `itemDe` →
  `rankingD10`.

### 8.4 Frontera de §9.3: `≤` pasa a `<` (U01)

- **Contraejemplo.** P 3, I (3, 2, 2, unknown máx 3), contención 3, recuperación 3. Las
  conocidas dan `C_raw` 27 por econ, y la cota legal también da 27. La v0.2 lo da evaluable
  ("todas esas cotas son ≤ `C_raw`"). La mutación lo saca del ranking.
- **Por qué no se detecta.** La propiedad 4 sólo prueba solidez. Los sintéticos tienen cotas
  estrictamente menores.
- **Test que falta.** El borde de igualdad, más la dirección de completitud de la propiedad
  4.

### 8.5 Padre: factores propios (P01), roll-up (P02), hijo prioritario sólo por `C_raw` (P03), ítem del padre distinto del hijo (D08)

- **P01.** `rankingPrincipal` toma `itemDe(f)` de la fila del padre. Sobrevive porque
  EV-0079 es copia de R1c.
- **P02.** P = máx P de los hijos, cada I_d = máx, V = máx. Con los hijos de CP-12 da 5 × 2 ×
  5 = 50, igual que R1c. Es la mezcla de factores que §1.4.1 prohíbe.
- **P03.** Contraejemplo: h1 = P 2, I (5, 1, 1, 1), contención 5; h2 = P 5, I (2, 1, 1, 1),
  contención 5. Los dos dan 50. La v0.2 elige a h1 (I efectivo 5 > 2). P03 muestra a h1 y a
  h2 como empatados.
- **Por qué no se detectan.** Hay un solo padre real, cuyos hijos tienen `C_raw` 10, 40 y 50,
  todos distintos. El sintético de "empatados" usa hijos idénticos.
- **Test que falta.** Un padre sintético cuya fila tenga factores distintos de los de sus
  hijos, con dos hijos de igual `C_raw` y distinto I efectivo.

### 8.6 Banderas con `unknown` (D03)

`consecuenciaExtrema` mira sólo `valor === 5` e ignora el `<f>_max` de un `unknown`. §8.2:
"las dos banderas aplican… si es `unknown` y su `<f>_max` registrado alcanza el umbral".
Existe test de `unknown` sólo para `safety_critical`, no para `consecuencia_extrema`.

### 8.7 Borde del ancla 5 de P (B01)

`nivelPorAntecedentes([3, 15, 36], 120)` da 5 con el código actual y 4 con la mutación.
Ningún test fija el borde de 36 meses para la frecuencia; sí está fijado para el nivel 4.
También es una ambigüedad (§9): el arnés eligió la lectura inclusiva sin un test y sin
declararlo.

### 8.8 Rango sin margen: los costos directos en el máximo (D01)

En CP-13 el máximo es 4 con o sin la multa (1,5 M o 1,9 M sobre un RO de 2 M). Falta un
caso donde los costos directos crucen un corte en el máximo.

### 8.9 Maquinaria de veredicto (J02, J03, J04, J06)

En el oráculo `juzgar` hay cuatro ramas que ninguna expectativa ejercita: empate con
`no_permitido`, empate con `no_especificado`, `visible` sólo por `safety_critical` (todos los
`visible` actuales tienen `consecuencia_extrema` o son no evaluables) y `movimiento: igual`
contra `baja`. Si una implementación futura produce el empate prohibido de CP-05 o CP-06,
el veredicto lo decide código que nunca se probó. Hace falta un test unitario por rama.

### 8.10 Sobrevivientes interpretativos (no cuentan como incorrectos)

- **U07.** Determinantes con una dimensión `unknown` cuya cota iguala `C_raw`.
- **J01.** "Mitad de abajo" con `floor`.

Los dos son lecturas de un texto ambiguo; ver §9.

---

## 9. Ambigüedades que el arnés resuelve en silencio

El README documenta 17 lecturas, y está bien que lo haga. Éstas **no** están declaradas, o
están afirmadas como si fueran regla:

| # | Dónde | Qué decide el arnés | Origen |
|---|---|---|---|
| a | §8.2, `alcanza` | Un `unknown` **sin** `<f>_max` no dispara las banderas. El test lo afirma como regla ("unknown sin max, no") | Interpretación del autor. Es literal respecto de §8.2, pero choca con P2 ("`unknown` no es bajo") y con §9.5, que trata a `i_pers` `unknown` sin máx como posible `safety_critical` |
| b | §9.3, `evaluar` | Las determinantes sólo pueden ser dimensiones conocidas | Interpretación del autor (U07) |
| c | §7.2 [F5-6], `compararAcotado` | `≥ n` se modela como [n, 5] aunque el `unknown` tenga `<f>_max` registrado. I-personas `unknown` se modela como [1, 5] e ignora min/max | Interpretación conservadora del autor, no declarada |
| d | §3.3 ancla 5 | La ocurrencia de hace exactamente 36 meses cuenta para la frecuencia | Interpretación del autor, sin test (B01) |
| e | protocolo §8, `no_en_mitad_inferior` | Una falla se clasifica siempre como "combinación", aunque el riesgo esté empatado en `C_raw` con los de arriba | Interpretación del autor. Protocolo §8 decide la categoría por igualdad de `c_raw` |
| f | CP-18 | Exige que `C_econ` y `C_cont` queden **exactamente** iguales. La adjudicación dice "puede permanecer Alta" y "es incorrecto que baje todo" | Interpretación del autor, más estricta que la adjudicación |
| g | CP-01 "R2 = R3" | `sin_orden`, porque el reporte de F5 no lo contó como falla | **Ajuste al veredicto aprobado** (está declarado en el README #10, pero el motivo es circular) |
| h | CP-08 R1, P | Ruta de anclas "sector sin comparables" | Distinta de la ruta del log 4A ("comparable hace seis años") |
| i | Padre | Acepta que la fila del padre tenga `C_raw` y `evaluable` propios | Fixture de la Fase 5. El arnés no lo señala |
| j | Bandas | Afirma como test que ningún corte monótono de `C_raw` reproduce las bandas firmes | Lectura del autor de textos de banda hedgeados. La conclusión pertenece a la Fase 9 |

Ninguna de estas lecturas se volvió normativa en un documento canónico. Pero un test que las
afirma funciona como norma de facto para cualquier implementación que se compare contra
este arnés.

---

## 10. Los tests más fuertes

1. **"Sólo quedan las discrepancias conocidas"**, con la lista exacta. Compara todos los
   derivados de las 51 fichas contra una implementación independiente (F5-REG-01). Falló en
   23 de las 93 mutaciones. Además falla si una discrepancia desaparece.
2. **"C_raw: los 50 evaluables coinciden exactamente".** Es un oráculo externo real, y un
   tercer cálculo propio lo confirma.
3. **PV-1 a PV-5 y la consistencia ordinal con las respuestas de Emiliano.** Fija la tabla
   de §5.5 con datos que no salen del código.
4. **Propiedades 1 y 3 recorridas sobre 93.750 combinaciones.** Detectaron V05, V06, O04,
   O05 y O11.
5. **La prueba de fallas de CP-01.** Exige el conjunto exacto de tres fallas con su
   categoría: no basta con "FAIL".
6. **El test de CP-10.** Calcula el residual esperado desde el texto de la acción
   (`4 -> 2`) y exige esperado < obtenido < antes.
7. **Orden y veredicto con secundarias** para los momentos con más de un riesgo.

---

## 11. Los tests más débiles

| Test | Problema |
|---|---|
| "C_raw toma exactamente 30 valores" | Tautológico: no ejecuta código del arnés |
| "Las preferencias PV-5 > PV-2… no ordenan" | Compara datos de `casos.ts` entre sí, sin la implementación |
| "El techo plausible nunca es menor que C_raw" | Recorre combinaciones sin rangos, donde el techo es igual a `C_raw` |
| Propiedad 7 | En la parte de recuperación, la condición se deduce de la fórmula |
| Los 12 "órdenes" de un solo riesgo (CP-09, CP-10 ×2, CP-11 ×2, CP-17, CP-18 ×2, CP-19 ×4) | No pueden fallar salvo por una excepción; inflan el conteo de 28 |
| Veredictos de CP-09, CP-11 y CP-17 | `adjudicacion: []`: PASS con cualquier metodología |
| `sin_orden` | Siempre cumple; se cuenta como criterio juzgado |
| Bandas (3 tests) | Snapshots de cadenas de conflicto derivadas de la codificación del autor. Afirman una conclusión de la Fase 9 |
| Recodificación 125/1128 | Ajustada para reproducir el número. Es un detector incidental útil, pero no un oráculo |
| Propiedad 4 | Sin mensaje de error, sólo solidez, y fuera de dominio para dos `unknown` |
| Tests de anclas de P | La entrada la decide el autor (edades inventadas, ruta de CP-08 distinta del log). El esperado es independiente, la entrada no |
| "≥ n…", "el techo nunca gana" | Los nombres prometen más de lo que prueban: no tocan `iEfectivo()` |
| "padre lleva los factores de R1c" | Comprueba la fixture, no que la implementación ignore los factores del padre |

---

## 12. Tests que faltan

Escritos para que cada uno mate un sobreviviente concreto. No se agregaron: quedan
documentados.

1. **Orden de pasos de D10** (O01). Igual `C_raw`; A con más I efectivo y menos I-personas.
   Se espera A primero.
2. **Sin amplitud** (O02, O03). Igual `C_raw`, I efectivo e I-personas, distinta cantidad de
   dimensiones en el máximo. Se espera empate legítimo. Una variante con distinto I-personas
   debe ordenar sólo por I-personas.
3. **`≥ n` de punta a punta** (O13, D04). `Factores` con un I `unknown` evaluable →
   `iEfectivo` da `completo: false`, `n` sin el máx del `unknown`, derivado `≥ n` →
   `rankingD10` provisional contra un par con I efectivo `n`.
4. **Igualdad en §9.3** (U01). Cota igual a `C_raw` → evaluable. Agregar a la propiedad 4 la
   completitud: si todas las cotas son ≤ `C_raw`, evaluable.
5. **Padre sintético** (P01, P02, P03, D08). Fila del padre con factores distintos de los de
   sus hijos; dos hijos con igual `C_raw` y distinto I efectivo. Se espera que el padre se
   muestre con el hijo que gana por D10 y con su ítem.
6. **`consecuencia_extrema` con `unknown` y máx 5** (D03).
7. **Borde del ancla 5 en 36 meses** (B01). Requiere que el owner decida la lectura.
8. **Rango sin margen con costos directos que cruzan un corte en el máximo** (D01).
9. **Una prueba unitaria por rama de `juzgar`** (J02 a J06): empate `no_permitido` → falla
   de ranking; `no_especificado` → indeterminado; visible sólo por `safety_critical`;
   `igual` contra `baja`; borde de "mitad inferior" con 4 y 6 riesgos.
10. **Rangos de `v_rec`** en el control de §9.2.
11. **Propiedad 4** con dos `unknown` a la vez, máx 2 y 4, e I ∈ {2, 4}. Con mensaje de
    error.
12. **Monotonía con `unknown`.** Subir un factor conocido de un riesgo con `≥ n` nunca lo
    mejora en D10.
13. **CP-09, CP-11 y CP-17.** O se codifica una expectativa juzgable, o se reporta "no
    juzgado por el arnés" en vez de PASS.

---

## 13. Reproducibilidad

| Comprobación | Resultado |
|---|---|
| `node --run test` (en la carpeta) | 144 pass, 0 fail, ~1,7 s |
| Dos corridas seguidas | Salida TAP idéntica sin `duration_ms` (md5 `00cb7ff5…` las dos veces) |
| Desde otro cwd (`cd / && node --test <ruta>/*.test.ts`) | 144 pass. Las rutas salen de `import.meta.url` y no dependen del cwd |
| Estado del repo después de correrlo | Sin cambios (sólo `ops/runs/2026-10-07.jsonl`, que escribe el hook y es previo) |
| Archivos generados o sin trackear | Ninguno. Los tests sólo usan módulos de Node: no necesitan `node_modules` |
| `node --run typecheck` | Sin errores. Necesita `pnpm install` en la raíz por `tsc`: sin install, `tsc` no existe |
| `eslint --no-ignore` sobre la carpeta | Sin errores |
| Versión de Node | Necesita type stripping (≥ 22.18). El repo pide ≥ 24 (`engines`) y el contenedor trae 22.22, así que pnpm avisa. No se probó con 24 |
| `pnpm check` | `check-docs`, `check-agent-run`, `scripts/tests` (74 pass), `typecheck` y `lint` pasan. `pnpm test` da 166 pass, 14 fail y 51 cancelados, todos `ECONNREFUSED 127.0.0.1:5432` (Postgres local ausente). No dependen del arnés |
| ¿Lo corre CI? | No. Está fuera del workspace y de `pnpm check` a propósito (README). Nada obliga a que siga verde |

---

## 14. Riesgos de usarlo como oráculo futuro

1. **Falso verde en D10.** Una implementación de `contexts/risk` que reordene los
   desempates, o que agregue amplitud, P o V como desempate después de I-personas, pasa.
   P y V los detectan dos sintéticos; amplitud y reordenamiento, nada.
2. **Falso verde en `unknown`.** La Fase 8 va a producir `unknown` en riesgos evaluables
   (empresas sintéticas). Ahí el arnés sólo tiene unos pocos sintéticos y una propiedad de
   solidez; `iEfectivo` con `unknown` está sin probar.
3. **Falso verde en el padre.** Cualquier agregación que dé 50 en CP-12 pasa.
4. **El oráculo de veredicto tiene ramas sin probar.** Un veredicto "igual al aprobado"
   puede salir de una rama defectuosa de `juzgar`.
5. **El conteo de evidencia está inflado.** "144 tests", "28 órdenes" y "16 PASS" incluyen
   vacuos y triviales. Leídos como evidencia, sobreestiman la cobertura.
6. **Normas de facto.** Las lecturas de §9 quedan afirmadas en tests. Una implementación que
   adopte otra lectura defendible fallaría, y el fallo parecería un bug.
7. **Fragilidad ante correcciones legítimas.** Los snapshots (discrepancias, 125/1128, 6
   pares, conflictos de bandas) fallan si el owner corrige la fixture. Es deseable que
   fallen, pero eso exige mantenimiento y criterio para no "arreglar el test".
8. **Acoplamiento a la API del arnés.** La mayoría de los sintéticos llaman funciones de
   `metodologia.ts` (`compararD10`, `posicionPadre`) con tipos propios. Lo que de verdad se
   porta a `contexts/risk` son las fichas, los órdenes y los veredictos, no esos tests. El
   README dice que "se pueden portar sin cambiar nada", y eso es optimista.
9. **Circularidad epistémica de fondo.** El acuerdo se da con otra aplicación de la misma
   especificación, hecha por quien la escribió. El arnés comprueba consistencia con la
   lectura de la Fase 5, no la validez de la metodología. La v0.2 lo dice en su propio
   encabezado; el arnés lo hereda.

---

## 15. Recomendación

- **Usarlo como guarda de regresión** de la aritmética (§5.5, §6), las banderas con factores
  conocidos, las anclas numéricas y los órdenes con `C_raw` distinto. Ahí la evidencia es
  sólida y las mutaciones se detectan de forma directa.
- **No usarlo todavía como oráculo** de D10 después de `C_raw`, del manejo de `unknown`
  (§9.3, `≥ n`), del riesgo padre ni del veredicto de protocolo §8. Antes de cualquier
  trabajo de implementación de Risk OS, agregar los tests 1 a 9 de §12. Son baratos (todos
  sintéticos) y matan los 17 sobrevivientes sustantivos.
- **Que el owner decida las lecturas de §9** (sobre todo a, c, d, e y f) antes de fijarlas
  en tests: o se aprueban y se citan, o se dejan como `juicio`.
- **Reportar los veredictos vacuos** (CP-09, CP-11, CP-17) como "no juzgados por el arnés", y
  separar en el conteo los órdenes de un solo riesgo.
- **No cablearlo en CI sin aprobación** (R-13). Si se cablea, que sea después de los puntos
  anteriores.

Todo esto es propuesta. No se resolvió ninguna decisión `OPEN` ni se tocó ninguna
adjudicación.

---

**Veredicto: B — USEFUL BUT INCOMPLETE.** Da evidencia fuerte en las áreas que cubre, pero
quedan puntos ciegos importantes: el orden de desempates de D10 y la amplitud prohibida,
`≥ n` y la frontera de §9.3, el riesgo padre y las ramas sin probar del oráculo de veredicto.
