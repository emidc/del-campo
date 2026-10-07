# Arnés de regresión de la metodología de criticidad · T-0021

Convierte las reglas mecánicas de **metodologia v0.2** (`v0/metodologia-v0.md`, aprobada el
2026-10-07 02:02 UTC y congelada para la Fase 8) y los casos adjudicados de la Fase 5 en tests
que se pueden ejecutar. No rediseña la metodología ni cambia ninguna adjudicación. Las
fichas y los registros de `v0/` son la evidencia. Acá se leen tal cual y no se tocan.

Workstream `BOS` (Risk OS). Es código descartable de spike, igual que `SPIKES/T-0020`: queda
fuera del workspace de pnpm, del tsconfig raíz y de `pnpm check`. Se eligió así por tres
motivos. Todavía no existe `contexts/risk`, que T-0021 deja fuera de alcance. Ninguna regla
tiene implementación de producto contra la cual probar. Y cablearlo en CI necesitaría
aprobación humana (R-13). La capa de referencia (`metodologia.ts`) está escrita como
funciones puras y versionadas, que es lo que pide §14 "Insumos para EMI-16". Cuando exista
`contexts/risk`, las fixtures y los tests se pueden portar sin cambiar nada.

## Cómo se corre

```bash
pnpm install --frozen-lockfile                      # desde la raíz, una vez
cd SPIKES/T-0021/regresion-ejecutable
node --run test                                     # 195 tests (188 + 7 todo), ~6 s
node --run typecheck                                # tsc estricto con el tsconfig raíz
cd ../../.. && ./node_modules/.bin/eslint --no-ignore SPIKES/T-0021/regresion-ejecutable/*.ts
```

Necesita Node con type stripping (≥ 22.18). Se verificó con Node 22.22. El repo pide ≥ 24,
pero este contenedor trae la 22.

## Qué hay

| Archivo | Qué es |
|---|---|
| `metodologia.ts` | Capa de referencia: una función pura por regla mecánica de v0.2, cada una con la sección que transcribe. |
| `fichas.ts` | Carga tipada de `v0/fase-5/regresion/fichas-regresion.csv` (51 fichas de F5-REG-01). De `v0/dry-run/fichas-dry-run.csv` sólo toma identidad, historial y acción, y nunca los factores de v0.1. |
| `casos.ts` | Los 20 casos de propiedad como datos tipados: expectativas adjudicadas, veredicto aprobado de F5-REG-01, orden registrado, bandas adjudicadas y criterios de juicio. Incluye los perfiles PV-1 a PV-5. |
| `verificacion.ts` | Recalcula los derivados de cada ficha, arma el ranking principal de una organización y clasifica un caso con las categorías de protocolo §8. |
| `metodologia.test.ts` | Reglas contra oráculos externos (ejemplos de la metodología y del log, números de los casos) y las propiedades de §14 sobre toda la escala. |
| `fichas.test.ts` | Las 51 fichas: derivados, rangos, unknown, historial, objetos fuera del ranking, recodificación. |
| `casos.test.ts` | Veredicto de los 20 casos contra el aprobado, orden de cada momento, comprobaciones propias de cada caso y diagnóstico de bandas. |
| `sinteticos.test.ts` | Casos sintéticos de la remediación: D10 después de `C_raw`, `unknown` y `≥ n` de punta a punta, padre, banderas con `unknown`, rango económico, una prueba por rama de `juzgar`, y las lecturas ambiguas como `todo`. |
| `COLD-REVIEW.md`, `REMEDIATION.md` | Revisión adversarial en frío del arnés y su remediación (mutaciones, matriz de sobrevivientes, alcance del oráculo). |

**Para que los tests no reproduzcan su propia lógica**, el valor esperado nunca sale de
`metodologia.ts`. Sale de alguna de estas fuentes:

- los derivados que escribió la corrida F5-REG-01 en el CSV;
- los ejemplos numéricos de la metodología y del log (PV-1 a PV-5, AN-0158, AN-0159, §4.2, §2.4);
- los números de los casos (CP-11, CP-13, CP-16);
- los veredictos y órdenes del reporte de regresión;
- propiedades enunciadas en §14 que se comprueban de forma independiente de la fórmula.

## Reglas cubiertas

Tipo de aserción: **E** exacta (invariante), **O** ordinal, **R** rango o banda, **J** juicio
profesional (se lista y no se afirma).

| Regla | Sección | Tipo | Cómo se prueba |
|---|---|---|---|
| `V_d` secuencial: personas y legal = c; cont = min(c, r); econ = min(c, ⌈(c+r)/2⌉) | §5.5 [F5-2] | E | PV-1 a PV-5 contra la tabla del log; `no_aplica` |
| Respuestas cualitativas de Emiliano ↔ `V_d` | log grupo 2 | O | "casi protegida < a mitad < casi expuesta" es monótona con `V_d` en las 20 celdas |
| Mejora de un solo aspecto (2c–2d) y P11 | §5.5, §14.7 | E/O | Transiciones PV-5→PV-1, PV-5→PV-2, PV-1+r3; P11 sobre las 25 combinaciones (c, r) |
| `C_d = P × I_d × V_d`, `C_raw = max_d`, dimensión determinante | §6.1–6.2 | E | Ejemplos de AN-0158 y AN-0159; los 50 `C_raw` y las 50 determinantes registradas; 30 valores posibles (§6.3) |
| Techo plausible | §6.6 | E | Las 51 fichas, `CP-08-R2` incluida (125 con los unknown en 5) |
| I efectivo y `≥ n` | §4.1.1, §7.2 [F5-6] | E | Las 51 fichas; de punta a punta desde `Factores` con un `unknown` (derivado `≥ n`, `n` sin el techo, posición provisional o decidida); `n` y su cota inferior en todo el dominio de la propiedad 4 |
| `consecuencia_extrema` y `safety_critical`, incluido no evaluable con `max` | §8.1, §8.2 | E | Las 51 fichas; umbral 4/3 de personas; unknown con `max` en y debajo del umbral, para las dos banderas. Unknown sin `max` y evaluable con unknown: pendientes del owner (`todo`) |
| Nivel económico por % del RO, el corte va arriba | §4.2 | E | Ejemplo de §4.2 (30% → 4), cuatro cortes exactos, CP-11 A/B contra las fichas |
| Rango económico sin margen de contribución | §4.2.3 [F5-1] | R | CP-13 R1 (3–4) y CP-16 R1 (2–4) recalculados desde los montos del caso y comparados con la ficha; caso sintético donde los costos directos cruzan el corte del 100% en el máximo |
| Dato auxiliar: base `assumed`/`inferred`, `uncertainty ≥ medium` si cruza niveles | §4.2.3, §9.2 [F5-1] | R | Los 14 `i_econ` que F4 dejó unknown (identificados desde el CSV de F4, no a mano) |
| Valor defendible: tabla de tres filas | §9.2 [F5-1] | E | Las tres filas, más rango ≤ 3 niveles que contiene al valor en las 51 fichas (P, I, contención y recuperación) |
| Criticidad con partes unknown (cota) | §9.3 | E | Casos sintéticos de cada rama y del borde de igualdad (por I, por un aspecto de V, con dos unknown); CP-08 R2 no evaluable |
| Unknown nunca da un `C_raw` bajo | §14.4 | E | Equivalencia (solidez y completitud): evaluable ⇔ hay dimensión conocida y ningún valor posible de lo desconocido cambia `C_raw`. 656.250 casos con una parte unknown (I 1–5, `max` y `min`), 143.360 con dos, y P unknown |
| Incertidumbre y rango no mueven `C_raw`, sólo el techo | §9.1 | E | Caso sintético; CP-08 R1 se ordena por 60 y no por el techo de 100 |
| No evaluable: lista aparte con motivo y necesidad de validación | §9.4 | E | CP-08 R2 |
| Continuidad por duración bruta, degradación un nivel abajo | §4.4 | E | Panificadora (§2.4), CP-13, CP-14 y CP-16 contra las fichas; bordes |
| P por antecedentes (5, 4 con 36 meses incluidos, 3), sin ocurrencias no indica nivel | §3.2, §3.3 [F5-4A] | E | CP-12 R1a/R1b/R1c/R2 y CP-16 R1 contra las fichas; bordes de 36 y 37 meses |
| Precursor = 3, condición causal sólo ±1 contra la fuente, tope 1–5 | §3.3, §3.4 [F5-4A] | E | CP-11 A/B, CP-19 base y marzo, CP-08 R1, CP-13 R1 contra las fichas |
| D10: C_raw → I efectivo → I-personas → empate; sin P ni V ni amplitud como desempate | §7.2 [F5-6] | O | Casos sintéticos por `rankingPrincipal`, entre ellos igual `C_raw` con criterios cruzados y distinta amplitud; los 28 órdenes registrados (16 con más de un riesgo); PV-5 = PV-2 y PV-1 = PV-4 |
| Ranking sólo dentro de una organización | §7.1.4 (CH-075) | E | `rankingPrincipal` rechaza CP-11 A+B |
| Padre: hijo prioritario, empatados, provisional, sin posición | §1.4 [F5-3] | E | Las cuatro ramas; padre sintético con fila propia distinta, hijos de igual `C_raw` separados por D10 (pasos 3 y 4), ítem exacto del hijo, sin roll-up; CP-12 R1-B con los factores de R1c |
| Sub-riesgos y escenarios fuera del ranking | §7.1.2, §10.4, §14.5 | E | `rankingPrincipal` los rechaza |
| Escenario por causa común: miembros, materialidad, legal = máximo | §10.2–10.3 | E | CP-20 E1 |
| Monotonía de `C_raw` y de la posición | §14.1 | O | Las 93.750 combinaciones y cada vecino que empeora un factor; 477.514 transiciones con un I unknown (`≥ n`) |
| Causalidad de V | §14.3 | E | La recuperación nunca cambia `C_personas` ni `C_legal`, en las 93.750 combinaciones |
| Historial: cambio de versión sin sobrescribir | §11.1, §14.6, protocolo §6.4 | E | Las 51 fichas apuntan a su ficha de F4, del mismo riesgo y con id distinto |
| `motivo` de cada reevaluación | §11.1 | E | CP-19: `informacion_nueva`, `correccion_evaluacion`, `cambio_contexto`, encadenados |
| Acción cumplida con eficacia parcial; el factor toma el reevaluado | §11.2 | O | CP-10: esperado (24) < obtenido (36) < antes (48); CP-04 `efecto_total` |
| Transferencia sin ficha ni cambio de factores | §11.3, D17 | E | CP-09 y CP-17: una sola ficha cada uno, con factores idénticos |
| Banda vacía hasta la Fase 9 | §6.5 | E | Las 51 fichas |
| Bandas adjudicadas | protocolo §8, §12 | R | Diagnóstico, no veredicto (ver "Bandas") |
| Recodificación 1, 2, 3, 5, 8 | §14.8, AN-0161 | E | Reproduce los números del reporte: 125 de 1128 pares y los 6 pares dentro de los casos |
| Categorías de veredicto (combinación / ranking / PASS) | protocolo §8 | E | Los 20 veredictos y sus secundarias contra el reporte de regresión; una prueba sintética por rama de `juzgar`; PASS sin criterio ejecutable reportado como tal |

## Casos que quedan ejecutables

- **20 casos de propiedad** (CP-01 a CP-20) en 28 momentos. Para cada uno se ejecutan tres
  cosas: el veredicto contra el aprobado, el orden contra el registrado y las comprobaciones
  propias del caso. CP-14 se juzga contra la adjudicación revisada y también contra la
  original (protocolo v0.2 §13).
- **5 perfiles de V** (PV-1 a PV-5), que son los casos de origen de §5.5.
- **51 fichas** de F5-REG-01, con todos sus derivados recalculados.

**Resultado: ninguna diferencia contra lo aprobado.** El arnés reproduce:

- los 20 veredictos, es decir 16 PASS y 4 FAIL (CP-01, CP-12 y CP-16 por combinación; CP-07 por ranking), con sus secundarias. De los 16 PASS, 3 (CP-09, CP-11 y CP-17) no tienen ningún criterio ejecutable: el arnés los reporta como `sin_criterio_ejecutable`, no como evidencia;
- CP-14, que es FAIL contra la adjudicación original y PASS contra la revisada;
- los 28 órdenes registrados, de los que sólo 16 ordenan más de un riesgo;
- los 50 `C_raw`;
- los números de la recodificación.

Los 4 FAIL no son fallas de implementación: son FAIL aprobados de la metodología contra la
adjudicación (AN-0157 a AN-0160). Se conservan como FAIL, y el test exige que el arnés los
siga viendo. Si un cambio volviera PASS a alguno, el test también lo marca.

## Número y tipo de aserciones

**195 tests** en 4 archivos: 188 normativos y 7 `todo` (lecturas ambiguas que corren pero no
deciden el veredicto de la suite). **314 líneas con `assert.`**. Las de propiedades corren en
bucle y suman millones de comprobaciones.

El conteo es por bloque de tests, y el tipo es el que predomina en cada bloque. Algunos
bloques mezclan tipos, y se marcan así.

| Bloque | Tests | Tipo |
|---|---|---|
| Veredicto de cada caso (20, más CP-14 original, conteo, PASS juzgados/vacuos, sin indeterminados) | 25 | Ordinal |
| Orden de cada momento contra F5-REG-01 (más el conteo de cobertura) | 29 | Ordinal; 12 de los 28 son de un solo riesgo y lo dicen en el nombre |
| Comprobaciones propias de cada caso | 12 | Exacta y ordinal (movimientos de CP-10 y CP-18) |
| Perfiles PV-1 a PV-5 | 10 | 6 exactas, 4 ordinales |
| §14: monotonía (con y sin unknown), causalidad de V, mejora, unknown (una parte, dos partes, P), techo | 8 | Monotonía ordinal; las demás exactas |
| §7.2 D10 | 6 | Ordinal |
| §6, §4.2, §4.4, §3.3–3.4, §9.3, §8, §1.4 | 35 | Exacta (las 2 de rango económico de §4.2, de rango) |
| Fichas: forma, derivados, objetos fuera del ranking, recodificación | 14 | Exacta |
| §9.2 y §9 rangos/unknown | 7 | Rango |
| Bandas | 3 | Banda (diagnóstico) |
| Sintéticos de la remediación (D10, unknown, padre, banderas, económico, `juzgar`) | 39 | Exacta y ordinal |
| Lecturas pendientes del owner | 7 `todo` | No deciden: ver `REMEDIATION.md` §8 |
| Juicio profesional | 0 | Los criterios están listados en el campo `juicio` de cada caso en `casos.ts` y abajo; no se afirman |

**Prueba del arnés por mutación.** La campaña vigente es la de `REMEDIATION.md` §5–§6: 56
mutaciones (las 19 que sobrevivían a la revisión en frío y 37 nuevas). Mueren 51. Sobreviven
B01 (bloqueada por una ambigüedad), U07 y J01 (lecturas alternativas) y dos equivalentes.

La primera campaña, de esta misma carpeta, plantó 12 errores en `metodologia.ts` y la suite
detectó 11:

- V_econ calculado con `max`;
- la regla v0.1 de "el peor de los dos";
- quitar el paso de I efectivo;
- el corte económico hacia abajo;
- extrema desde 4;
- `safety_critical` desde 3;
- quitar la cota de §9.3;
- empates separados;
- el borde de 36 meses;
- el techo calculado con el valor;
- el padre tomando el peor hijo.

Cada uno hizo fallar entre 2 y 31 tests. El que sobrevivió (tratar `no_aplica` como
recuperación 5) es equivalente: con `min`, los dos dan el mismo `V_d`.

## Reglas que no se automatizan

Estas reglas exigen juicio o datos que las fichas no tienen. El arnés no inventa una
aserción exacta para ellas.

- **Asignar los factores desde la narrativa.** Elegir el evento iniciador (§2.1), aplicar el
  test P/V (§2.2), el test de la barrera (§2.3), las rúbricas de contención y recuperación
  (§5.3, §5.4), "probada" (§5.2) y las anclas de personas y legal (§4.3, §4.5). El arnés toma
  los factores registrados como dato. Sólo automatiza la parte numérica de las anclas de P,
  económico y continuidad, y la compara con lo registrado cuando el caso trae el número.
- **El valor más plausible dentro de un rango** (§9.1, §4.2.3), la fuente de mayor jerarquía
  (§3.2) y si un control o una condición es nuevo respecto de la fuente (§3.4). Son juicio.
  El arnés recibe esas lecturas como entrada, citadas del log 4A o de la ficha.
- **La granularidad** (§1.3): si dos escenarios comparten "la misma consecuencia concreta".
  **La creación de un escenario** (§10.2): que la causa común sea plausible. La parte
  "material" sí se prueba en CP-20.
- **La cola de validación** (§9.5). Está especificada, pero no hay ningún orden registrado
  ni adjudicado contra el cual comparar. No se implementó para no crear un test que sólo
  copiaría la especificación.
- **La consecuencia conjunta del escenario** (§10.3.3): la suma económica sin doble conteo y
  las personas expuestas en el conjunto.
- **Las vistas de §13**: exposición retenida, límite y consumo de la póliza (CP-09, CP-17),
  antes y después para el directorio (CP-04), y la vista de seguridad con su acción
  registrada (§8.2.2, CP-15). Esos datos no están en las fichas: viven en `risk-transfer` y en
  las acciones (AN-0016).
- **Las bandas** (§6.5): los umbrales se fijan en la Fase 9.
- **Criterios de magnitud adjudicados**: que R1 de CP-04 baje "claramente", que CP-10 baje
  "menos de lo esperado" dentro de qué brecha, y que los PV-1 a PV-5 queden "casi protegidos"
  (el arnés prueba que la relación es ordinal, no los nombres). El resto está en `juicio` de
  cada caso en `casos.ts`.

## Ambigüedades y contradicciones encontradas

Ninguna se resolvió en silencio. Las de datos se conservan como evidencia en
`DISCREPANCIAS_CONOCIDAS` (`fichas.test.ts`). Si aparece una nueva, o si una de ellas
desaparece, el test falla.

**En las fichas de F5-REG-01.** Para que el owner decida si se corrigen.

1. **EV-0066 y EV-0067 (CP-06 R1 y R2): `consecuencia_extrema_dimensiones` incompleto.** Dice
   `cont` y debería decir `econ;cont`. F5-1 llevó `i_econ` de unknown a 5 y la lista no se
   actualizó. El booleano está bien y ningún resultado cambia.
2. **EV-0071 (CP-08 R2): `v_aspectos_aplicables` con el formato de protocolo v0.1.** Le falta
   `(secuencial)`. No tiene efecto en ningún resultado.
3. **CP-19 (EV-0095 a EV-0098): posible incumplimiento de §4.2.3 [F5-1].** El `i_econ` está
   en un rango de 4 a 5, la observación cita el margen operativo ("el mínimo con margen
   operativo ya ronda el RO") y aun así `uncertainty = low`. La regla dice que si el rango
   cruza niveles, `uncertainty` es al menos `medium`. **No se afirma en un test**: saber si
   la regla aplica exige leer la observación, porque la regla depende de que el margen de
   contribución sea desconocido.

   Hay otras fichas con el económico en un rango que cruza niveles y `uncertainty = low`
   (EV-0072 a EV-0075, EV-0079 a EV-0083, EV-0092). Sus observaciones no invocan el margen,
   así que la regla F5-1 no se les aplica literalmente.
4. **El CSV no tiene la columna `prioridad_provisional`.** Protocolo v0.2 §2.3 la agrega,
   pero el encabezado es el de v0.1. El arnés la calcula: `false` para CP-12.
5. **Las fichas de F5 no copian `accion_*`.** El arnés la lee siguiendo
   `evaluacion_anterior_id` hasta F4. Es correcto por protocolo §6, pero conviene saberlo.

**En la lectura de las adjudicaciones.** Cada lectura figura en `casos.ts` junto al caso.

6. **CP-11: "R2 > R1" no se puede juzgar como orden.** Compara riesgos de dos empresas, y
   CH-075 (§7.1.4) lo prohíbe. F5-REG-01 lo juzgó por el nivel económico y la bandera, y el
   arnés hace lo mismo.
7. **CP-12: "la prioridad no debe cambiar al descomponer" quedó reemplazado** por §1.3.6
   (F5-3, sin invariancia entre formas). No se afirma.
8. **CP-13: el orden se reproduce, el motivo no.** La adjudicación pone a R1 arriba "por su
   carácter multidimensional". D10 ya no desempata por amplitud, y R1 queda arriba por
   I-personas.
9. **Columna de empate imprecisa en CP-03, CP-04 y CP-12, y "Sí" sin par en CP-08.**
   - "No necesario" (CP-03, CP-04, CP-12) se codificó `no_especificado`: si la metodología
     diera empate, el arnés devolvería `INDETERMINADO` en vez de elegir. Ningún veredicto
     actual depende de esto.
   - En CP-08 el "Sí" no dice a qué par se refiere. Se aplicó al único par ordenado.
10. **CP-01: dos lecturas.**
    - "R2 = R3" se leyó como "sin orden exigido". El reporte de F5 no contó como falla que
      R2 (20) quede sobre R3 (15).
    - "La mitad de abajo" de cinco riesgos se leyó como las dos últimas posiciones.
11. **§4.4: "3 meses" no está definido en días.** Entre 89 y 92 días, `nivelContinuidad`
    devuelve `ambiguo`. CP-04 ("3–4 meses" → 5) queda como juicio.
12. **§3.3, CP-12: "en el período con registro" decide entre 5 y 4.** La narrativa sólo
    informa "los últimos dos años". Con dos ocurrencias, eso da 5, que es lo que hicieron el
    log 4A y la ficha. Si el registro fuera de tres años, daría 4.
13. **§7.2 sólo define el paso indeterminado para dos riesgos.** Para un bloque de tres o más
    riesgos con igual `C_raw` y algún par indeterminado, el arnés deja todo el bloque en una
    posición provisional común. Hoy no hay ninguna ficha así (ningún evaluable de la Fase 5
    tiene unknown), y los sintéticos sólo prueban bloques de dos.
14. **§6.6 no dice cómo es el techo con un factor unknown.** El dato registrado (CP-08 R2 =
    125) coincide con usar su `max`, o 5, como en §9.3. El arnés sigue al dato.
15. **Los números de la recodificación (§4 del reporte) sólo se reproducen con dos
    lecturas.** El universo son las 48 evaluables sin el padre ni el escenario, con los
    sub-riesgos adentro. Y se recodifica el `V_d` ya combinado en la escala 1–5. Es la única
    lectura con la que se reproducen 125/1128 y los 6 pares.

**Bandas.** Es un diagnóstico para la Fase 9, no un veredicto. Vale sólo si los umbrales
cortan únicamente `C_raw`, que es el supuesto de §7.2, paso 1.

16. **Dentro de un caso, CP-05 es incompatible.** R1 (Media) y R2 (Alta) tienen el mismo
    `C_raw` (64), y ningún corte puede separarlos. El caso pasa igual porque D10 los separa
    por I-personas.
17. **Entre todos los casos, ningún corte monótono reproduce las bandas firmes adjudicadas.**
    Por ejemplo, CP-01 R1 tiene 20 y es Alta, y CP-03 R2 tiene 48 y es Media. Parte del
    conflicto viene de FAIL ya aprobados (CP-01, CP-14 original).

## Fallas contra lo aprobado

**Ninguna.** Ningún resultado del arnés contradice el veredicto, el orden ni el `C_raw`
aprobados en F5-REG-01. Las únicas diferencias con los datos registrados son las tres
discrepancias de derivados de arriba. Son errores de transcripción en la ficha, no
resultados distintos.

## Verificación ejecutada

| Comando | Resultado |
|---|---|
| `node --run test` (en esta carpeta) | 195 tests: 188 pass, 0 fail, 7 todo |
| `node --run typecheck` | sin errores |
| `eslint --no-ignore` sobre esta carpeta | sin errores |
| Mutación (`REMEDIATION.md`, 56 mutaciones) | 51 detectadas; sobreviven 1 bloqueada, 2 interpretativas y 2 equivalentes |
| `node scripts/check-docs.mjs`, `node scripts/check-agent-run.mjs`, `pnpm typecheck`, `pnpm lint` | pasan |
| `pnpm test` (raíz) | 166 pass. Los 14 fail y 51 cancelados son tests de integración que necesitan el Postgres local (`ECONNREFUSED 127.0.0.1:5432`). Este contenedor no lo tiene y el arnés no los toca. |

## Aislamiento de la Fase 8

En este checkout no existen `v0/fase-8/` ni `v0/fase-9/`. No se leyó ninguna salida de
evaluador de la Fase 8. No se modificó ningún archivo de `v0/`:

- `metodologia-v0.md`, `protocolo.md` y los CSV quedan intactos;
- los tests sólo leen;
- uno de ellos comprueba que el CSV de F4 sigue con sus 51 filas de v0.1.

Las fuentes usadas son:

- de la Fase 5: el log, el reporte de regresión, las fichas y las anomalías;
- de antes de la Fase 8: los casos de propiedad, la adjudicación, la metodología v0.2, el
  protocolo y el reporte y las fichas del dry run.

## Archivos

Todos en `SPIKES/T-0021/regresion-ejecutable/`: `README.md`, `package.json`,
`tsconfig.json`, `metodologia.ts`, `fichas.ts`, `casos.ts`, `verificacion.ts`,
`metodologia.test.ts`, `fichas.test.ts`, `casos.test.ts`, `sinteticos.test.ts`,
`COLD-REVIEW.md` y `REMEDIATION.md`. Ninguno modifica archivos fuera de la carpeta.
