# Reporte de la Fase 10 · regresión completa v0.2 → v0.3

> Fase 10 del plan EMI-15 + EMI-41 (T-0021) · 2026-10-10 · protocolo v0.3 §13 · corrida `F10-REG-01` · metodologia v0.2 → **v0.3** (sin cambios de regla en esta fase).
> Script: `regresion.py` (`python3 v0/fase-10/regresion.py RAIZ`), reusa las funciones de `fase-9/calibrar.py` y sólo lee fichas. Salidas: `regresion-casos.csv` (20 filas), `regresion-emi41.csv` (285 filas), con las columnas de protocolo §13 más `que_cambio` y `nota`.

## Resumen

1. **Ninguna regresión nueva.** Las 3 que hay (CP-05, CP-17, CP-18, de PASS a FAIL — calibración) son las de la Fase 9, que Emiliano ya aprobó (1A, 1a y 3a del 2026-10-08) y que CH-093 registra. Los otros 17 casos quedan sin cambio.
2. **EMI-41:** de las 255 fichas del agente, 248 cambian y 7 no. 245 cambian sólo porque reciben banda por primera vez. **3 cambian de bandera:** S10-R05, S17-R03 y S34-R01 pasan a `consecuencia_extrema = true` por CH-092. Las 30 fichas de Emiliano sólo ganan banda (23 evaluables).
3. **Nada más se mueve.** `C_raw`, evaluabilidad, dimensión determinante y posición en el ranking de cada empresa quedan iguales en todas las filas. La banda como paso 1 de D10 no invierte ningún orden: los cortes son monótonos sobre `C_raw`.
4. **La Fase 9 se reproduce.** Volví a correr `calibrar.py` y sus salidas salen idénticas byte a byte. Los 20 veredictos de casos coinciden con F9B-CAL-01 (juego E) y las 255 bandas coinciden con `bandas-sinteticos.csv`.
5. **El arnés ejecutable sigue verde:** 195 tests, 188 pass, 0 fail y 7 todo. Ninguna regla de v0.2 que prueba cambió en v0.3.

---

## 1. Qué cambió entre v0.2 y v0.3 y cómo se re-ejecuta

| Fila | Elemento | Tipo de cambio (§13) | Efecto en resultados |
|---|---|---|---|
| CH-092 | protocolo §2.3 `consecuencia_extrema` en no evaluables | combinación (se deriva de `_valor` y `_max` guardados) | La bandera pasa a `true` en no evaluables con una dimensión `unknown` y `_max` 5 |
| CH-093 | D12, metodología §6.5, protocolo §2.3 `banda` | combinación (cortes sobre `C_raw`) | Todo evaluable recibe banda; el paso 1 de D10 se activa |
| CH-094 | D23 y metodología §8.2 | sólo texto | Ninguno. Se comprobó como propiedad: con 20/50/75 la banda máxima es Media para P 1 y Alta para P 2, y Crítica exige P ≥ 3 en las 125 combinaciones |

Ninguna toca cómo se asigna un factor (D4, D5, D8, D15, D19, D21, anclas o rúbricas). Por eso, como pide §13, **todo se recalcula desde los factores guardados**, sin reevaluar ni crear fichas nuevas.

La verificación previa fue recalcular `C_raw` y `evaluable` desde los factores de las 252 fichas del agente, las 30 de Emiliano y las 51 de los casos. **No hubo ninguna diferencia** con lo escrito en las fichas.

## 2. Casos de propiedad (`regresion-casos.csv`)

Versión anterior: v0.2 sin umbrales (F5-REG-01). Versión nueva: v0.3.

| Resultado v0.3 | Casos |
|---|---|
| PASS (13) | CP-02, CP-03, CP-04, CP-06, CP-08, CP-09, CP-10, CP-11, CP-13, CP-14 (contra la revisada), CP-15, CP-19, CP-20 |
| FAIL — calibración, `regresionó` (3) | CP-05 R1 (64, Alta; adjudicado Media), CP-17 R1 (30, Media; adjudicado Alta), CP-18 R1 (45, Media; adjudicado Alta; circular) |
| FAIL de la Fase 5, `sin_cambio` (4) | CP-01 (combinación, con FAIL — calibración secundaria: R1 20 Media, adjudicado Alta), CP-07 (ranking), CP-12, CP-16 (combinación) |

- **Las 3 regresiones ya están aprobadas.** Emiliano adoptó 20/50/75 sabiendo los FAIL de CP-17 y CP-18 (1A y 1a). CP-05 queda como FAIL — calibración por su decisión 3a, como evidencia del límite de `max()`. CH-093 las registra como "evidencia abierta", que es lo que pide la aceptación de §13. **No hay ninguna regresión nueva para decidir.**
- **CP-14:** pasa contra la adjudicación revisada (PV-1). Contra la original, R1 queda en Baja, igual que en la Fase 9.
- **Expectativas blandas no alcanzadas:** CP-09 y CP-15 R1 quedan en Media, y la adjudicación admitía Alta como posible. No cambian el veredicto.
- **CH-092 no toca ningún caso.** El único no evaluable (CP-08 R2) ya tenía `consecuencia_extrema` por I-personas 5.
- **Orden:** en ningún momento de ningún caso la banda invierte un par ordenado por `C_raw`. Los 28 órdenes de F5-REG-01 quedan iguales.

## 3. Riesgos de EMI-41 (`regresion-emi41.csv`)

Una fila por ficha: las 255 del agente (240 riesgos, 9 sub-riesgos, 3 escenarios y 3 padres) y las 30 de Emiliano. Cada resultado dice `C_raw`, posición D10 dentro de la empresa, banda y las dos banderas. Como son riesgos sin adjudicación, el estado es `cambió` o `sin_cambio`, sin juicio (§13).

| Evaluador | Fichas | `sin_cambio` | `cambió`: sólo banda nueva | `cambió`: bandera | `cambió`: `C_raw`, evaluable o posición |
|---|---|---|---|---|---|
| Agente | 255 | 7 (no evaluables) | 245 | 3 | 0 |
| Emiliano | 30 | 7 (no evaluables) | 23 | 0 | 0 |

**Bandas v0.3 del agente** (las 245 fichas con banda, incluidos sub-riesgos, escenarios y padres): Baja 26 · Media 149 · Alta 49 · Crítica 21. Restringido al ranking principal da la distribución de la Fase 9 (Baja 20 · Media 145 · Alta 48 · Crítica 20 de 233), con la misma señal de Media sobre 50%, que va a la Fase 11 sin ajuste.

**Los 3 cambios de bandera (CH-092):**

| risk_id | Dimensión `unknown` con `_max` 5 | `consecuencia_extrema` | `safety_critical` |
|---|---|---|---|
| S10-R05 | Personas | false → **true** | true (sin cambio) |
| S17-R03 | Económico | false → **true** | false |
| S34-R01 | Económico | false → **true** | false |

Son los tres que el reporte de la Fase 8 (§5) señaló como inconsistentes con S02-R07, y los que motivaron CH-092. Con v0.3 quedan alineados con S02-R07, S22-R06 y S23-R01, y con la práctica de Emiliano (AN-F8-031). Las fichas de la Fase 8 no se reescriben: son el registro de v0.2 y la bandera v0.3 se deriva de sus campos. Las 30 fichas de Emiliano ya aplicaban la regla, así que no cambia ninguna.

**Padres:** S05-P01, S29-P01 y S30-P01 toman la posición y la banda de su hijo prioritario (§1.4). No tienen factores propios, y sus banderas se dejan como están registradas.

## 4. Lo que esta fase no cubre

- **Evaluables con una dimensión `unknown`.** CH-092 sólo alcanza a los no evaluables. Hay 2 fichas del agente que son evaluables y tienen I-personas `unknown`: S31-R05 (`_max` 4) y S36-R07 (`_max` 5). En S36-R07 la bandera ya es `true` por otra dimensión. En S31-R05, `safety_critical` queda `false` porque el protocolo extiende la bandera sólo a los no evaluables. No es un cambio de v0.3: es la lectura que el arnés deja como `todo` ("evaluable con unknown", pendiente del owner). Se registra acá para la Fase 11.
- **El arnés ejecutable sigue en v0.2.** Sus tests leen las fichas registradas, que no tienen banda. La banda y CH-092 se prueban en este script y no en el arnés. Portarlos al arnés es trabajo de la Fase 11, si se quiere que la v1 candidate quede cubierta por tests.

## 5. Verificación ejecutada

| Comando | Resultado |
|---|---|
| `python3 v0/fase-10/regresion.py .` (en `SPIKES/T-0021`) | 0 diferencias de `C_raw`/evaluable; 20/20 casos iguales a F9B-CAL-01; 0 inversiones de orden por banda; D23 se cumple |
| `python3 v0/fase-9/calibrar.py .` | salidas de `fase-9/` idénticas (`git status` limpio) |
| Bandas de `regresion-emi41.csv` contra `bandas-sinteticos.csv` (`banda_E`) | 255/255 iguales |
| `node --run test` en `regresion-ejecutable/` | 195 tests: 188 pass, 0 fail, 7 todo |

## Para decidir

**1. Registrar la corrida.** Con tu aprobación agrego a `changelog-metodologia.md` la fila de `anexo-changelog-fase-10.md`: CH-097, corrida F10-REG-01, v0.3 sin cambio. No hay ninguna regresión nueva que aprobar.
