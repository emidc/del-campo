# Remediación del arnés de regresión tras la revisión en frío · T-0021

> Workstream `BOS` (Risk OS). Remediación dirigida de `SPIKES/T-0021/regresion-ejecutable/`
> después de `COLD-REVIEW.md` (commit `916037b`, veredicto B). Quien remedia no construyó el
> arnés ni hizo la revisión. La revisión se trató como evidencia a reproducir, no como verdad.
>
> Fecha: 2026-10-07. Rama: `claude/optimistic-galileo-387njb`. Node 22.22.0, pnpm 11.19.0.
>
> **Aislamiento de la Fase 8.** No se leyó nada de `v0/fase-8/` ni de `v0/fase-9/` (en este
> checkout no existen). No se leyeron salidas de evaluadores. No se modificó ningún archivo de
> `v0/`: ni la metodología, ni el protocolo, ni las adjudicaciones, ni las fichas de la Fase 5.
>
> **Qué cambió.** Sólo el arnés: un archivo nuevo de tests (`sinteticos.test.ts`), tres tests
> existentes reforzados, un campo de evidencia en el veredicto (`verificacion.ts`), el README
> donde sus afirmaciones de cobertura dejaron de ser ciertas, y este informe. La capa de
> referencia (`metodologia.ts`) no se tocó. No se cableó nada en CI.

---

## 1. Línea de base antes de la remediación

| Comprobación | Resultado |
|---|---|
| `node --run test` | 144 tests, 144 pass, 0 fail |
| `node --run typecheck` | sin errores |
| `eslint --no-ignore` sobre la carpeta | sin errores |
| Las 19 sobrevivientes de COLD-REVIEW §7 | **las 19 reproducidas**: cada una, plantada en una copia limpia del arnés, deja la suite en verde (0 tests fallan) |

La reproducción usó un runner propio (copia del arnés en el scratchpad, `v0/` enlazado en
modo lectura, reporter de `node:test` que lista los tests hoja que fallan). Las mutaciones se
reescribieron desde la descripción de la revisión, no se copiaron sus scripts.

Antes de escribir cada test se verificó, a mano y en el comentario del test, que el caso
separa la regla de v0.2 de la implementación incorrecta (por ejemplo, para O01: A 4×5×3 = 60
con I efectivo 5 e I-personas 1, B 3×4×5 = 60 con 4 y 4; v0.2 pone A primero, la mutación B).

---

## 2. Hallazgos de la revisión que se atendieron

| COLD-REVIEW | Hallazgo | Qué se hizo |
|---|---|---|
| §8.1 (O01) | Orden de los pasos 3 y 4 de D10 sin probar | Caso con `C_raw` igual y criterios cruzados, por `rankingPrincipal` |
| §8.2 (O02, O03) | Desempate por amplitud reintroducible | Empate legítimo con distinta amplitud; variante donde sólo I-personas decide; lo mismo entre hijos de un padre |
| §8.3 (O13, D04) | `iEfectivo()` nunca recibía un `unknown` | Casos de punta a punta desde `Factores`: `≥ n` en el derivado, `n` sin el techo, posición provisional; propiedad 4 comprueba `≥ n` en todo el dominio |
| §8.4 (U01) | Frontera `≤` de §9.3 sin probar; propiedad 4 sólo solidez | Bordes de igualdad (por I, por un aspecto de V, con dos `unknown`); propiedad 4 reescrita como equivalencia (solidez **y** completitud) |
| §8.5 (P01, P02, P03, D08) | Padre con un solo caso real que es copia de su hijo | Padre sintético con fila propia distinta, dos hijos de igual `C_raw` separados por D10, un tercero que haría ganar al roll-up, y riesgos simples alrededor |
| §8.6 (D03) | `consecuencia_extrema` con `unknown` y máx sin probar | Caso de riesgo no evaluable con máx 5 (dispara) y máx 4 (no) |
| §8.8 (D01) | Costos directos en el máximo del rango sin margen | Caso donde la multa cruza exactamente el corte del 100% |
| §8.9 (J02, J03, J04, J06) | Ramas de `juzgar` sin datos | Una prueba por rama con fichas sintéticas |
| §5, §11 | PASS vacuos y órdenes de un riesgo inflan la evidencia | `evidencia` en el veredicto; `sin_orden` pasa a `no_juzgado`; tests que cuentan y nombran lo trivial |
| §4 #5 | El control de §9.2 no miraba `v_rec` | Se agrega `v_rec` (9 fichas con rango; todas cumplen) |
| §6, §11 | Propiedad 4 sin mensajes; sin dos `unknown`; sin I 2 y 4; sin monotonía con `unknown` | Ver §3 |
| §9 a, b, c, d, e | Lecturas resueltas en silencio | Aisladas como `todo` (ver §8). La aserción "unknown sin max no dispara" se sacó del test normativo |

No se atendió lo que exige decidir una lectura (B01, U07, J01; §8) ni lo que la revisión
marca como fuera del alcance de un test (bandas, recodificación ajustada, ruta de anclas de
CP-08 R1, edades con precisión inventada).

---

## 3. Tests agregados o reforzados

**De 144 a 195 tests: 188 pass y 7 `todo`.** Las líneas con `assert.` pasan de 213 a 314.

### `sinteticos.test.ts` (nuevo, 46 tests: 39 normativos y 7 `todo`)

Todas las fichas son sintéticas y entran por el camino público: `Ficha` con `Factores` →
`rankingPrincipal`, `derivadosCalculados` y `juzgar`. Cada ranking se calcula también con la
entrada invertida (`rankingEstable`): el resultado no puede depender del orden de carga.

| Bloque | Tests | Qué fija |
|---|---|---|
| A · D10 después de `C_raw` | 4 | Paso 3 antes que paso 4; el paso 3 usa I efectivo (máximo), no el I de la determinante; sin amplitud (empate legítimo); sólo I-personas rompe el empate cercano |
| B · `unknown`, `≥ n`, §9.3 | 10 | Evaluable con un `unknown`; `≥ 4` en el derivado y `n` sin el techo; `≥ 4` contra 4 → provisional; `≥ 4` contra 3 → decide; `≥ 3` sin máx contra 5 → indeterminado; el bloque provisional no arrastra otros `C_raw`; bordes de igualdad de §9.3 por I, por un aspecto de V y con dos `unknown`; un nivel más → lista no evaluable con motivo |
| C · Padre | 6 | Hijo prioritario por D10 (paso 3 y paso 4), ítem exacto del hijo, posición entre riesgos simples, empate por amplitud entre hijos, hijos con paso 3 indeterminado → prioridad provisional |
| D · Banderas | 2 | `consecuencia_extrema` de un no evaluable con `unknown` máx 5 (dispara) y máx 4 (no) |
| E · Económico | 2 | 1,5 M + 0,5 M = 100% del RO → máximo 5; con 1 peso menos, 4 |
| F · `juzgar` | 15 | Empate no permitido, no especificado y permitido; combinación; `visible` por `safety_critical`, por lista no evaluable con y sin motivo, y no visible; `safety_critical` ausente; `movimiento` igual/baja/sube y con ficha no evaluable; mitad inferior con 4 y 6 riesgos; orden de categorías; PASS sin criterio ejecutable |
| Lecturas pendientes | 7 `todo` | §8 de este informe |

### `metodologia.test.ts`

| Test | Antes | Después |
|---|---|---|
| 4 · unknown, una parte | 12.150 casos; I ∈ {1, 3, 5}; max ∈ {sin, 1, 3, 5}; sólo solidez; sin mensaje | **656.250 casos**: I 1–5; max sin, 1, 2, 3, 4 (5 es idéntico a "sin max" para §9.3) y min 2 con max 4. Comprueba `evaluable ⇔ hay dimensión conocida ∧ ningún valor posible cambia C_raw`, el `C_raw`, y en I: `completo = false`, `n` = máximo de las conocidas, `n` ≤ I efectivo real de cada valor posible. El esperado recorre los valores posibles: no usa la cota |
| 4 · unknown, dos partes (nuevo) | — | **143.360 casos**: pares de partes (I_d, contención, recuperación), niveles {1, 2, 4, 5}, max {sin, 2, 4} y min 2 – max 4, P ∈ {2, 5} (P multiplica todas las `C_d` por igual y no cambia qué cota supera a `C_raw`) |
| 4 · P unknown (nuevo) | — | Las 93.750 combinaciones con P `unknown` máx 1: nunca evaluable |
| 1 · monotonía con `≥ n` (nuevo) | — | **477.514 transiciones**: un I `unknown` (sin max, max 2, max 4), subir un factor conocido nunca baja `C_raw` ni la posición en D10 |
| 1 y 3 | sin mensaje | mensaje con la combinación que falla (armado sólo al fallar) |
| §8 banderas | "unknown sin max, no" afirmado como regla | Se afirma sólo el caso con max (4 dispara, 3 no). El caso sin max pasa a `todo` (ambigüedad a) |

Los recorridos agregan unos 5 s; la suite entera corre en ~6 s.

### `casos.test.ts` y `fichas.test.ts`

- `casos.test.ts`: "16 PASS = 13 con criterios juzgados + 3 sin criterio ejecutable"; "cobertura: 16 de los 28 momentos ordenan más de un riesgo"; los nombres de los tests vacuos y triviales lo dicen.
- `fichas.test.ts`: el control de §9.2 recorre también `v_rec`.

### `verificacion.ts`

- `sin_orden` devuelve `estado: 'no_juzgado'` (antes `cumple`). No entra en la categoría: ningún veredicto cambia.
- `Veredicto.evidencia`: `criterios_juzgados` o `sin_criterio_ejecutable`.

---

## 4. Las 17 sobrevivientes sustantivas de la revisión

O01, O02, O03, O13, D04, U01, P01, P02, P03, D08, D03, D01, B01, J02, J03, J04 y J06. Más dos
interpretativas (U07, J01) que no cuentan como incorrectas.

---

## 5. Matriz sobreviviente → test que la mata

"Directa": falla un test cuyo objeto es la regla mutada. Los números son tests que fallan
con la mutación plantada sobre la suite final.

| Id | Error | Ahora | Tests que la detectan | Detección |
|---|---|---|---|---|
| O01 | Pasos 3 y 4 de D10 invertidos | **muere** (4) | "igual C_raw, criterios cruzados: I efectivo (paso 3) decide antes que I-personas (paso 4)"; además 3 del padre | directa |
| O02 | Amplitud entre pasos 3 y 4 | **muere** (3) | "sin desempate por amplitud…", "cerca del mismo caso, sólo I-personas rompe el empate…", "hijos que sólo difieren en amplitud empatan…" | directa |
| O03 | Amplitud después de I-personas | **muere** (3) | los mismos tres | directa |
| O13 | `iEfectivo` siempre completo | **muere** (9) | "I efectivo se muestra ≥ n…", "≥ 4 contra 4 completo… provisional", propiedad 4 (una y dos partes), … | directa |
| D04 | `n` incluye el techo del `unknown` | **muere** (7) | "I efectivo se muestra ≥ n con n = máximo de las conocidas…", "≥ 4 contra 4…", propiedad 4 | directa |
| U01 | §9.3 con `<` en vez de `≤` | **muere** (6) | "borde de §9.3: una cota igual a C_raw es evaluable", "borde… por un aspecto de V", "dos unknown…", propiedad 4 (completitud), monotonía con `≥ n` | directa |
| P01 | Padre con sus propios factores | **muere** (2) | "el padre compite con el ítem exacto de su hijo prioritario…", "posición: debajo del par…; ni roll-up ni factores propios" | directa |
| P02 | Roll-up máx P × máx I × máx V | **muere** (2) | los mismos dos | directa |
| P03 | Hijo prioritario sólo por `C_raw` | **muere** (4) | "el hijo prioritario sale de D10 entre hijos de igual C_raw…", "paso 4 entre hijos…", … | directa |
| D08 | Ítem del padre con `iPers = 5` | **muere** (2) | "el padre compite con el ítem exacto…", "posición: debajo del par…" | directa |
| D03 | `consecuencia_extrema` ignora el máx de un `unknown` | **muere** (1) | "consecuencia_extrema: unknown con máx registrado 5 la dispara, por esa dimensión" | directa, un test |
| D01 | Costos directos fuera del máximo | **muere** (1) | "1,5 M + 0,5 M de multa = 100% del RO → el máximo es 5" | directa, un test |
| B01 | Ancla 5: hace exactamente 36 meses no cuenta | **sobrevive: bloqueada** | Ningún test normativo. Corre como `todo` | §8, ambigüedad d |
| J02 | `visible` ignora `safety_critical` | **muere** (1) | "visible sólo por safety_critical → cumple" | directa, un test |
| J03 | Empate `no_especificado` cuenta como cumple | **muere** (2) | "empate que la adjudicación no especifica → INDETERMINADO, nunca PASS", "categoría principal y secundarias…" | directa |
| J04 | Empate `no_permitido` cuenta como cumple | **muere** (1) | "empate no permitido → falla de ranking" | directa, un test |
| J06 | `igual` acepta `baja` | **muere** (1) | "movimiento: "igual" no acepta "baja"…" | directa, un test |
| U07 | Determinante incluye un `unknown` con cota = `C_raw` | sobrevive (interpretativa) | `todo` b | §8 |
| J01 | Mitad inferior con `floor` | sobrevive (interpretativa) | `todo` J01; con n par las dos lecturas coinciden y se afirma | §8 |

**16 de las 17 sustantivas mueren, todas de forma directa. La 17.ª (B01) queda bloqueada por
una ambigüedad que no se resolvió.** Ninguna detección depende de un snapshot.

---

## 6. Campaña de mutación nueva

37 mutaciones nuevas, independientes de las de la revisión, en dos rondas. La segunda se
diseñó después de ver los resultados de la primera. Cada una se plantó sobre la suite final.

| Id | Clase | Error plantado | Resultado |
|---|---|---|---|
| N01 | D10 | O01 + amplitud como paso final | muere (7) |
| N02 | D10 | Amplitud sólo como desempate final en `rankingD10` (no en `compararD10`) | muere (3) |
| N03 | D10 | Paso 3 con el I de la dimensión determinante | **sobrevivió a la primera ronda**; muere (1) con el test agregado |
| N04 | D10 | Bloque indeterminado sin marca provisional | muere (5) |
| N05 | D10 | `≥ n` acotado en n+1, no en 5, sin máx registrado | **sobrevivió a la primera ronda**; muere (1) con el test agregado |
| N06 | D10 | `≥ n` contra `n` se resuelve a favor del completo | muere (6) |
| N10 | unknown | Con dos `unknown`, sólo se mira la primera cota | muere (3) |
| N11 | unknown | Recuperación `unknown` acotada con 5 aunque tenga máx | muere (2) |
| N12 | unknown | I `unknown` cuenta como conocida con valor 1 | muere (6) |
| N13 | unknown | I efectivo completo si sólo falta personas | muere (2) |
| N14 | unknown | Contención `unknown` sólo afecta econ y cont | muere (3) |
| N15 | unknown | Aspectos de V `unknown` acotados con 4 | muere (2) |
| N16 | unknown | `n` incluye el min registrado del `unknown` | muere (2) |
| N20 | padre | Prioridad provisional ignora un paso indeterminado entre hijos | muere (1) |
| N21 | padre | Hijo prioritario = mayor I efectivo (ignora `C_raw`) | muere (8) |
| N22 | padre | `C_raw` del prioritario con I efectivo e I-personas máximos entre hijos | muere (2) |
| N23 | padre | Hijos comparados sin paso 4 | muere (1) |
| N24 | padre | Padre muestra sólo el primero de los hijos empatados | muere (3) |
| N30 | banderas | `unknown` dispara `consecuencia_extrema` desde máx 4 | muere (1) |
| N31 | económico | Costos directos contados dos veces en el máximo | muere (2) |
| N40 | juzgar | Empate permitido cuenta como falla | muere (4) |
| N41 | juzgar | Mitad inferior con `<=` | muere (2) |
| N42 | juzgar | No evaluable sin motivo cuenta como visible | muere (1) |
| N43 | juzgar | Empate no permitido clasificado como combinación | muere (1) |
| N44 | juzgar | `sin_orden` vuelve a contar como criterio cumplido | muere (1) |
| N45 | juzgar | INDETERMINADO antes que FAIL — ranking | muere (1) |
| N46 | juzgar | Movimiento con ficha no evaluable = cumple | muere (1) |
| N47 | juzgar | `safety_critical` esperado siempre cumple | muere (1) |
| R01 | D10 | Paso 3 indeterminado tratado como empate (decide el paso 4) | muere (5) |
| R02 | D10 | `≥ n` gana contra `n` (asimétrico) | muere (4) |
| R03 | unknown | Sin dimensión conocida se informa como "cota" | muere (1) |
| R04 | unknown | Cota económica con recuperación `unknown` ignora la recuperación | muere (2) |
| R05 | unknown | I-personas `unknown` con máx tratada como su máx en el paso 4 | **equivalente** por el camino público (ver abajo) |
| R06 | padre | Hijo prioritario = mayor I-personas entre los de `C_raw` máximo | muere (3) |
| R07 | padre | Ítem del prioritario con `C_raw` = máximo `C_d` entre todos los hijos | **equivalente**: el primero por D10 siempre tiene el `C_raw` máximo |
| R08 | juzgar | Categoría de orden por posición adyacente, no por `C_raw` | muere (7) |
| R09 | banderas | `safety_critical` de un `unknown` ignora el máx | muere (1) |

**Total de la campaña final: 56 mutaciones** (las 19 de la revisión y las 37 nuevas). 51
mueren. Sobreviven 5: B01 (bloqueada), U07 y J01 (interpretativas), R05 y R07 (equivalentes).

**Por qué R05 es equivalente.** I-personas es una de las dimensiones de I efectivo (D5). Si
`i_pers` es `unknown`, I efectivo es `≥ n` y el paso 3 nunca devuelve `empate`: decide o queda
indeterminado. Desde `Factores` reales, el paso 4 con I-personas `unknown` es inalcanzable. El
test existente "I-personas unknown: misma regla en el paso 4" usa un ítem armado a mano (I
efectivo completo con I-personas `unknown`) que ninguna ficha puede producir. Se deja: protege
a `compararD10` como función, pero no prueba nada del flujo real.

---

## 7. Sobrevivientes sustantivas que quedan

**Ninguna en el dominio que el arnés reclama como oráculo** (§10, TRUSTED).

B01 es sustantiva sólo si el owner adopta la lectura excluyente; hasta entonces es una
ambigüedad y queda fuera del oráculo. Que la campaña no encuentre más no prueba que no haya:
93 + 37 mutaciones son una muestra, no una enumeración.

---

## 8. Ambigüedades que se dejaron sin resolver

Cada una corre como test `todo` en `sinteticos.test.ts` ("lecturas ambiguas de v0.2"). El
test muestra la lectura actual del arnés, pero su resultado no decide el veredicto de la
suite: si alguien cambia la lectura, el `todo` lo muestra sin poner la suite en rojo.

| # | Pregunta exacta | Alternativas | Lectura actual del arnés | Tests bloqueados |
|---|---|---|---|---|
| d (B01) | §3.3 ancla 5: ¿una ocurrencia de hace exactamente 36 meses cuenta para "al menos una vez por año en los últimos tres años"? | Sí (simétrico con el ancla 4, que lo dice explícito) / No ("últimos tres años" excluyente) | Cuenta | Cualquier test que mate B01 |
| a | §8.2: ¿un `unknown` **sin** `<f>_max` dispara `consecuencia_extrema` o `safety_critical`? | No (literal de §8.2) / Sí (P2 "unknown no es bajo"; §9.5.1 trata a `i_pers` sin máx como posible `safety_critical`) | No dispara | Banderas con `unknown` sin máx. Se quitó del test normativo de §8 |
| a′ | §8.1–8.2: en un riesgo **evaluable** con una dimensión `unknown` de máx 5, ¿se dispara `consecuencia_extrema`? | Sí (misma regla que el no evaluable) / No (§8.1 dice `<f>_valor = 5`; la regla de `unknown` está bajo "Riesgo no evaluable") | Dispara | Banderas de evaluables con `unknown` |
| b (U07) | §9.3: si la cota de una dimensión `unknown` iguala `C_raw`, ¿esa dimensión es también determinante? | No (`C_raw` sale de las conocidas) / Sí (§6.2 "si empatan, todas") | No | Determinantes en el borde de igualdad. Los tests de igualdad de §9.3 no afirman determinantes |
| c | §7.2 [F5-6]: ¿`≥ n` se acota con el `<f>_max` registrado del `unknown`? | No: vale de n a 5 / Sí: vale de n a max(n, máx) | De n a 5 | Comparaciones con `≥ n` cuyo `unknown` tiene máx ≤ n. Todos los casos normativos usan `unknown` sin máx o con máx 5, donde las dos lecturas coinciden |
| J01 | Protocolo §8: con un número impar de riesgos, ¿el del medio está en la "mitad de abajo"? | No (`ceil`) / Sí (`floor`) | No (README #10) | Mitad inferior con n impar. Con 4 y 6 riesgos se afirma |
| e | Protocolo §8: ¿qué categoría lleva una falla de "mitad inferior" o de "movimiento"? | La regla de §8 se define para dos riesgos ordenados por `c_raw` | Mitad: combinación. Movimiento: por `c_raw` igual o distinto | Ningún test sintético afirma esas categorías; sólo el estado `falla` |

Además quedan, sin cambios, las 17 lecturas que el README ya declaraba (#1 a #17) y las de
COLD-REVIEW §9 f a j (CP-18 "igual" exacto, CP-01 "R2 = R3", ruta de anclas de CP-08 R1, padre
con `c_raw` propio en la fila, conclusiones de bandas). No se tocaron: cambiarlas cambiaría la
codificación de adjudicaciones aprobadas.

**Hueco de la capa de referencia que se encontró y no se corrigió.** §1.4.5 dice que un hijo
no evaluable "entra además en la lista no evaluable". `rankingPrincipal` sólo lista a los
riesgos simples y a los padres sin ningún hijo evaluable: un hijo no evaluable de un padre con
posición no aparece en `noEvaluables`. Ningún resultado de la Fase 5 depende de esto (los
hijos de CP-12 son todos evaluables). Corregirlo cambia la capa de referencia, no los tests,
y queda fuera de esta remediación.

---

## 9. Evidencia vacua o trivial, ahora reportada como tal

| Antes | Ahora |
|---|---|
| CP-09, CP-11 y CP-17: "PASS", con `adjudicacion: []` | Siguen PASS (el veredicto aprobado no cambia), pero `evidencia = sin_criterio_ejecutable`, y el nombre del test lo dice: "(sin criterio ejecutable: no juzgado por el arnés)". Un test fija que son exactamente esos tres: **13 PASS con criterios juzgados + 3 sin criterio** |
| `sin_orden` contaba como criterio cumplido | `estado = no_juzgado`; no cuenta como evidencia ni como falla |
| "28 órdenes registrados" | Un test fija que **16 ordenan más de un riesgo**; los otros 12 se nombran "(un solo riesgo: trivial, no es evidencia de orden)" |

Los 20 veredictos, las secundarias, el FAIL original de CP-14 y los 28 órdenes no cambiaron.

---

## 10. Alcance final del oráculo

### TRUSTED: una implementación que se equivoque acá falla en forma directa

- `V_d` secuencial (§5.5), fórmula `C_d`, `C_raw` y determinantes con factores conocidos (§6).
- **D10 después de `C_raw`** (§7.2): el orden de los pasos 3 y 4, I efectivo como máximo de
  las dimensiones, sin amplitud, sin P ni V como desempate, empate legítimo.
- **`≥ n` en el paso 3** con un `unknown` sin máx o con máx 5: decide sólo si lo desconocido
  no puede cambiar el orden; si no, posición común provisional.
- **§9.3**: evaluabilidad con una o dos partes `unknown`, en las dos direcciones (solidez y
  completitud) y en el borde de igualdad; P `unknown`; sin dimensión conocida; `C_raw` de las
  conocidas.
- **I efectivo con `unknown`**: `≥ n`, `n` = máximo de las conocidas, nunca el techo.
- **Padre** (§1.4): sin score propio, sin roll-up, hijo prioritario por D10 completo (pasos 2
  a 4), ítem exacto del hijo, hijos empatados, prioridad provisional por hijo no evaluable o
  por paso indeterminado entre hijos, sin posición si ninguno es evaluable.
- Banderas con factores conocidos y con `unknown` **con** máx en un riesgo no evaluable.
- Anclas numéricas de económico (incluidos costos directos en los dos extremos del rango sin
  margen), continuidad y P (salvo el borde de B01).
- **`juzgar`**: cada rama de `orden`, `visible`, `safety_critical`, `movimiento` (estado),
  mitad inferior con n par, orden de categorías, `sin_orden` y evidencia vacua.
- Monotonía (§14.1, también con un `unknown`) y causalidad de V (§14.3) en todo el dominio.

### PARTIALLY COVERED

- **Veredictos de los 20 casos**: reproducen los aprobados, pero heredan la codificación de
  las adjudicaciones (COLD-REVIEW §2.2) y la circularidad epistémica de la Fase 5.
- **Bloques de tres o más riesgos con un par indeterminado** (README #13): el arnés pone todo
  el bloque en una posición provisional; la metodología sólo define el caso de dos.
- **Paso 4 con I-personas `unknown`**: probado sobre `compararD10` con un ítem a mano, pero
  inalcanzable desde fichas reales (§6, R05).
- **Lista no evaluable con hijos de un padre**: falta el hijo no evaluable (§8).
- **Recodificación 125/1128 y 6 pares**: detector incidental, ajustado a dos lecturas.
- **Techo plausible con `unknown`** (README #14): sigue al dato registrado.

### NOT ORACLE: juicio profesional o datos que las fichas no tienen

- Asignar factores desde la narrativa, el valor más plausible dentro de un rango, la jerarquía
  de fuentes de P, si un control o una condición es nuevo (§2, §3.2, §3.4, §9.1).
- Granularidad y creación de escenarios (§1.3, §10.2), consecuencia conjunta (§10.3.3).
- Cola de validación (§9.5), vistas de §13, bandas (Fase 9) y las conclusiones del bloque de
  bandas.
- Criterios de magnitud adjudicados ("claramente", "menos de lo esperado").

### BLOCKED BY METHODOLOGY AMBIGUITY

- d (B01), a, a′, b (U07), c, J01 y e de §8. Hasta que el owner decida, cualquier
  implementación que adopte la otra lectura no debe tratarse como incorrecta por este arnés.

---

## 11. Verificación

| Comando | Resultado |
|---|---|
| `node --run test` (en la carpeta) | 195 tests: **188 pass, 0 fail, 7 todo**, ~6 s |
| Tres corridas seguidas (`node --test --test-reporter=tap "*.test.ts"`, sin `duration_ms`) | salida idéntica las tres veces (md5 `ad21bdc0…`) |
| Desde otro cwd (`cd / && node --test <ruta>/*.test.ts`) | 188 pass, 0 fail |
| `node --run typecheck` | sin errores |
| `eslint --no-ignore SPIKES/T-0021/regresion-ejecutable/*.ts` | sin errores |
| Campaña de mutación final (56 mutaciones, cada una en una copia limpia, base 195 pass) | 51 mueren; sobreviven B01 (bloqueada), U07 y J01 (interpretativas), R05 y R07 (equivalentes) |
| `node scripts/check-docs.mjs` | ✓ 66 decisiones, 29 ADRs, 26 tareas, 0 avisos |
| `node scripts/check-agent-run.mjs` | ✓ |
| `node --test scripts/tests/*.test.mjs` | 74 pass, 0 fail |
| `pnpm typecheck`, `pnpm lint` | pasan |
| `pnpm test` (raíz) | 166 pass, 14 fail, 51 cancelados: todos `ECONNREFUSED 127.0.0.1:5432` (no hay Postgres local en el contenedor). Igual que en la revisión; no tocan el arnés |
| `git status` | Sólo cambian archivos del arnés y `ops/runs/2026-10-07.jsonl` (hook de captura). Nada en `v0/` |

**Limitaciones.** El contenedor trae Node 22.22; el repo pide ≥ 24 (`engines`). No se probó
con Node 24. El runner de mutación vive en el scratchpad de la sesión, fuera del repo: las
mutaciones están descritas en §5 y §6 con el error exacto para poder replantarlas. El arnés
sigue fuera de CI: cablearlo requiere aprobación humana (R-13).
