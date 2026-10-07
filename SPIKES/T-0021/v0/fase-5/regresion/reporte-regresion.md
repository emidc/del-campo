# Reporte de regresión · Fase 5

> Corrida `F5-REG-01` · de metodologia v0.1 (corrida `F4-DR-01`) a **metodologia v0.2 (candidata)** con los grupos 1, 2, 3, 4A y 4B · protocolo §13 · 2026-10-06 · agente: sesión del thread "Fase 5 adjudicación de FAIL".
> Fichas: `fichas-regresion.csv` (EV-0052 a EV-0102, una por cada ficha de la Fase 4, `motivo = cambio_version_metodologia`, `evaluacion_anterior_id` = la de F4-DR-01, `review_status = pending`). Las fichas de F4-DR-01 no se tocaron. Anomalías nuevas: `registro-anomalias.csv` (AN-0157 a AN-0162).
> Actualización 2026-10-07: el paso de preparación de D10 se quitó (grupo 6). No cambia ningún resultado de este reporte: ese paso nunca decidió un orden. Ningún riesgo evaluable tiene una dimensión `unknown`, así que la regla `I efectivo ≥ n` tampoco cambia nada.

## 1. Qué se recalculó y qué se reevaluó

| Cambio | Tipo (protocolo §13) | Qué se hizo |
|---|---|---|
| F5-1 dato auxiliar (§4.2.3, §9.2) | asignación | 14 `i_econ` que eran `unknown` toman el valor plausible que la Fase 4 ya había escrito en cada observación, con el margen supuesto; `uncertainty` al menos `medium` |
| F5-2 V secuencial (§5.5) y frontera contención/recuperación | combinación + asignación | Se recalcularon todos los `V_d` y `C_d`. La frontera (AN-0004) no cambió ningún valor: la Fase 4 ya había cargado los grupos electrógenos en contención |
| F5-2 desempate de preparación (D10 paso 5) | combinación | Ranking recalculado; después se quitó el paso (grupo 6) sin cambio de resultados |
| F5-3 padre (§1.3, §1.4) | combinación | El padre de CP-12 se muestra con su hijo prioritario (R1c, 50); ya no hay empate entre hijos |
| F5-4A anclas de P | asignación | CP-11 A y B: P 2 → 3 (sector 2, +1 por una sola persona con firma propia). CP-19 marzo a julio: P 3 sin la lectura 5 (techo 4). El resto de los P no cambia de valor |
| F5-4B rúbricas de V | asignación | Se quitan los rangos de recuperación de AN-0005 (3 sin rango) y de contención de CP-07-R2 (3 sin rango). Ningún valor cambia |

## 2. Resultado por caso

`estado`: `sin_cambio`, `mejoró` (se acerca a lo adjudicado), `regresionó` (pasaba y ahora falla), según protocolo §13.

| Caso | F4-DR-01 (v0.1) | F5-REG-01 (v0.2 candidata) | Categoría nueva | Estado | Regla que produjo el cambio |
|---|---|---|---|---|---|
| CP-01 | R3 75 > R2 60 > R5 30 > R1 25 > R4 20 · contradicción | R5 30 > R1 20 > R2 20 > R4 20 > R3 15 (los de 20 por I efectivo e I-personas) | **FAIL — combinación** (R5 sobre R1 y sobre R4); secundaria ranking (R2 sobre R4) | mejoró | F5-1, F5-2 |
| CP-02 | literal: los dos no evaluables · contradicción | R2 60 > R1 40; R2 `safety_critical` | PASS | mejoró | F5-1 |
| CP-03 | literal: R1 no evaluable; §9.2: R1 100 > R2 60 · contradicción | R2 48 > R1 25 | PASS | mejoró | F5-1, F5-2 |
| CP-04 | antes R2 60 > R1 50; después igual · combinación | antes R1 50 > R2 36; después R2 36 > R1 30 | PASS | mejoró | F5-2 |
| CP-05 | literal: R2 no evaluable · contradicción | R1 = R2 64, I efectivo 4 = 4, I-personas → R2 primero | PASS | mejoró | F5-1, F5-4A (AN-0011 resuelta por §2.1) |
| CP-06 | R1 60 > R2 45 · contradicción | R1 60 > R2 30 | PASS | mejoró | F5-1, F5-2 |
| CP-07 | R1 48 > R2 36 · contradicción | R1 = R2 36; R1 primero por I efectivo (4 contra 3) | **FAIL — ranking** | mejoró | F5-1, F5-2, F5-4B |
| CP-08 | R1 75 > R3 36; R2 no evaluable · contradicción | R1 60 > R3 36; R2 no evaluable, visible con `safety_critical` | PASS | mejoró | F5-1, F5-2 |
| CP-09 | 30, sin ficha por la póliza · PASS | 30 | PASS | sin_cambio | — |
| CP-10 | 60 → 60 · ranking | 48 → 36 | PASS | mejoró | F5-2 |
| CP-11 | A 20, B 50 · PASS | A 24, B 60; bandera sólo en B; sin orden entre empresas (CH-075) | PASS | sin_cambio | F5-4A |
| CP-12 | padre 50 = forma A 50 < R2 60 · contradicción | padre 50 (hijo prioritario R1c) = forma A 50 < R2 60 | **FAIL — combinación**, con el econ de la infraestructura `assumed` sin dato | mejoró (desaparece AN-0009) | F5-3 |
| CP-13 | R1 = R2 80 · contradicción | R1 = R2 64, I efectivo 4 = 4, I-personas 2 > 1 → R1 | PASS | mejoró | F5-1, F5-4A |
| CP-14 | literal: R2 no evaluable · contradicción | R2 36 > R1 15 | PASS contra la adjudicación **revisada** (prevalece PV-1); FAIL contra la original | mejoró | F5-1, F5-2 |
| CP-15 | R2 80 > R1 25 · PASS | R2 80 > R1 25 | PASS | sin_cambio | — |
| CP-16 | literal: R1 no evaluable; §9.2: R2 64 > R1 60 · contradicción | R2 64 > R1 60 | **FAIL — combinación** (factores en el borde, AN-0159) | mejoró (ya no hay contradicción) | F5-1 |
| CP-17 | sin ficha por el consumo · PASS | 30 | PASS | sin_cambio | — |
| CP-18 | `C_raw` 75 → 75; personas 45 → 9 · PASS | 45 → 45; personas 45 → 9 | PASS | sin_cambio | F5-2 |
| CP-19 | 50 → 75 → 75 → 75 · definición | 30 → 45 → 60 → 45; `motivo` correctos; septiembre no ejecutable | PASS | mejoró | F5-2, F5-4A |
| CP-20 | literal: R1, R3 no evaluables; §9.2: R1 = R2 = R3 45 · contradicción | R1 = R2 45 > R3 36; E1 60 aparte | PASS | mejoró | F5-1, F5-2 |

**Conteo: 16 PASS, 4 FAIL** (antes 5 y 15). FAIL — combinación: CP-01, CP-12, CP-16. FAIL — ranking: CP-07. Ningún caso regresionó: los cinco PASS de la Fase 4 siguen pasando.

## 3. PASS circulares y casos de origen nuevos

| Caso | Regla de origen | ¿Circular? |
|---|---|---|
| CP-06, CP-10, CP-14 | §5.5 (CP-14 pasa a ser origen por la adjudicación revisada) | Sí |
| CP-08 | §9 | Sí |
| CP-11, CP-17, CP-18 | §4.2, §11.3, §2.3 / §13 | Sí |
| CP-13 | §4.4, §7 | Sí |
| CP-19 | §11.1 (`motivo`) | Los `motivo` sí; el movimiento (sube, sube, baja) sale de §5.5 y §3.4, que no lo listan: **no circular** |
| CP-03, CP-04, CP-05, CP-20 (orden R1 > R3), CP-02 (orden) | §5.5, D10 paso 4, F5-1: ninguna los lista | **No circulares formalmente** |
| CP-09, CP-15 | igual que en la Fase 4 | En parte |

**Advertencia.** La regla secuencial se aprobó después de ver su efecto en CP-03, CP-04, CP-07, CP-10, CP-14, CP-19 y CP-20 (tabla del grupo 2 en el log). Los PASS de esos casos no son circulares según la definición del protocolo (ningún caso es origen de la regla, que sale de PV-1 a PV-5), pero no son evidencia ciega. La primera evidencia ciega de la v0.2 es la Fase 8.

**Casos de origen nuevos de esta fase:** PV-1 a PV-5 (§5.5 y desempate de preparación) y CP-14 (§5.5, adjudicación revisada).

## 4. Recodificación 1, 2, 3, 5, 8

Con las fichas de la regresión cambian **6 pares dentro de los casos** (Fase 4: 5) y **125 de 1128 pares** entre todas las fichas evaluables (Fase 4: 82 de 990; ahora hay 48 fichas evaluables porque F5-1 devolvió 8 al ranking).

| Par | 1–5 | 1,2,3,5,8 | Efecto |
|---|---|---|---|
| CP-04 después R1/R2 | 30 / 36 | 48 / 45 | se aleja |
| CP-12 padre/R2 | 50 / 60 | 128 / 120 | se acerca |
| CP-12 forma A/R2 | 50 / 60 | 128 / 120 | se acerca |
| CP-01 R1/R4 | 20 / 20 | 40 / 32 | se rompe el empate, se acerca |
| CP-01 R2/R4 | 20 / 20 | 40 / 32 | se rompe el empate, se aleja |
| CP-07 R1/R2 | 36 / 36 | 50 / 45 | se rompe el empate, se aleja |

La dependencia de la codificación sigue (AN-0161). Como en la Fase 4, una codificación convexa favorece la severidad: arregla CP-12 y aleja CP-04.

## 5. Los FAIL que sobreviven y D14 (propuesta; decide Emiliano)

Criterio de protocolo §9: casos independientes con orden incorrecto que no se corrigen con umbrales, redacción de anclas o desempates de D10.

| Grupo | Casos | ¿Factores en disputa? | ¿Corrección simple? | Cuenta propuesta |
|---|---|---|---|---|
| **G3 · recurrencia por encima del techo de P** (AN-0157) | CP-01 R4 bajo R5 y bajo R2; CP-12 forma A y padre bajo R2 | CP-01 no; CP-12 sí (econ `assumed`) | No: P 5 ya es el máximo e I mide un evento. Medir I sobre la pérdida anual de un evento recurrente cambia la definición de I (D5, D19) | **1** |
| **G2 · remoto y catastrófico contra probable y moderado** (AN-0158) | CP-01 R1 bajo R5 | No | Posible con redacción del ancla 1 de P (sin dato sectorial completo, el piso sería 2): R1 40 > R5 30. Hay que decidirla y correr la regresión | 0 (dudoso) |
| **CP-16** (AN-0159) | R2 64 sobre R1 60 (empate permitido) | En el borde: econ plausible 3 en [2–4], contención 4 | Probablemente: cortes económicos [H] o rúbrica de contención para lesiones instantáneas | 0 (dudoso) |
| **CP-07** (AN-0160) | R1 = R2, R1 primero | No | Desempate de D10; Emiliano no quiso uno nuevo (queda abierto) | 0 |

**Total propuesto: 1 de 3** (G3), con G2 y CP-16 dudosos. El grupo G1 de la Fase 4 desapareció al cambiar cómo se construye V, como anticipó el dictamen. No declaro nada falsado.

**Decisión de Emiliano (2026-10-07 01:54 UTC): 1 de 3, D14 no falsada.** La recurrencia por encima de P = 5 queda como hipótesis abierta; G2 y CP-16 siguen dudosos. CP-07 no se arregla con un desempate nuevo: queda FAIL — ranking, abierto para la revisión de D10.

## 6. Anomalías de la Fase 4: dónde quedaron

| Anomalía | Estado tras la regresión |
|---|---|
| AN-0001, AN-0002 | Resueltas por F5-1 |
| AN-0003, AN-0019 | Resueltas por F5-2 |
| AN-0004 | Resuelta por F5-2 (frontera contención/recuperación) |
| AN-0005, AN-0013 | Resueltas por F5-4B |
| AN-0006 | Resuelta por F5-1 (el bruto se estima como dato auxiliar con valor plausible) |
| AN-0007, AN-0008 | Siguen como A7 de dato: los casos traen riesgos que §1.3.4 mandaría como padre |
| AN-0009, AN-0015, AN-0022, AN-0024 | Resueltas por F5-3 (AN-0022 deja de ser contraejemplo) |
| AN-0010 | Resuelta por F5-4A |
| AN-0011, AN-0012 | Sin cambio de regla: §2.1 y §2.2.3 las resuelven; eran de dato |
| AN-0014 | Abierta, grupo 6 (en esta regresión no decide ningún orden: no quedan `unknown` en riesgos evaluables) |
| AN-0016 | Fuera de alcance (falta de campo de monto bruto; CP-09 pasa) |
| AN-0017, AN-0018, AN-0025 | Reemplazadas por AN-0158 y AN-0161 |
| AN-0020 | Resuelta: CP-20 pasa |
| AN-0021, AN-0023 | Abiertas, fuera de alcance: la cota de §9.3 sigue sacando del ranking a un riesgo con techo peor; con F5-1 casi no quedan `unknown` y ningún caso las dispara en esta corrida |
| AN-0026 a AN-0156 (A1 contra el anexo) | No se reevalúan: comparan dos metodologías (dictamen) |
