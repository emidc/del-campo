# Protocolo experimental · metodología de criticidad

> Fecha: 2026-10-05 · Versión: **protocolo v0.1** (v0.0 aprobado por Emiliano en la Fase 1; v0.1 pedido por Emiliano el 2026-10-05 20:50 UTC para alinear la ficha con la metodología v0.1, antes de ver ningún resultado).
> Se apoya en `decisiones-v0.md` **v0.1** y en `metodologia-v0.md` **metodologia v0.1** (Fase 3). Cita sus números: D8 unknowns y techo, D10 ranking, D14 fórmula por dimensión y falsación, D15 V (contención y recuperación) y corte P/V, D17 seguro bruto, D20 `consecuencia_extrema`, D21 granularidad y riesgo padre, D22 `motivo`, D23 `safety_critical`, D24 escenario por causa común, D25 estado y eficacia de una acción.
> **Cambios de v0.1** (fila CH-074 del changelog): campos de la ficha para contención y recuperación por separado, V por dimensión, dimensión determinante, `safety_critical`, tipo de objeto (riesgo, padre, sub-riesgo, escenario); "visible" en la Fase 4 incluye la vista de seguridad; métricas por aspecto de V. Lo marcado **[PA n]** remite al "Para aprobar" de v0.0, ya aprobado.

**Abreviaturas de fuentes.** *respuestas* = `fuentes/respuestas-emiliano.md` · *plan* = `fuentes/plan-emi15-emi41.md` · *evaluación* = `evaluacion-plan-emi15-emi41.md` · *revisión* = `revision-adversarial-v0.md` · *plan-pasos* = `plan-pasos-1-2.md` · *decisiones* = `v0/decisiones-v0.md`. Las reglas que no salen literales de una fuente están marcadas **[PA n]** y se confirman en "Para aprobar".

---

## 1. Alcance y versión

1. Este protocolo gobierna las fases 2 a 12 del plan: casos de propiedad, metodología v0, dry run, adjudicación, cobertura y construcción de EMI-41, evaluación ciega, calibración, regresión, v1 candidate y revisión profesional.
2. Versión vigente: `protocolo v0.1`. Toda ficha, registro y reporte escribe la versión del protocolo y la de la metodología con la que se produjo.
3. **Preregistro.** Lo que no está escrito acá antes de ver un resultado no puede usarse para aprobar ni para descartar la metodología.
4. **Desviaciones.** Cambiar el protocolo después de haber visto cualquier resultado de la fase afectada exige una fila en `changelog-metodologia.md` con la razón, sube la versión (`protocolo v0.1`, …) y queda marcado como **desviación del preregistro** en el informe de la fase y en el cierre de EMI-15. Un cambio hecho antes de ver resultados también va al changelog, sin la marca.
5. La tipología de anomalías de la sección 4 reemplaza la tabla "Tipología de anomalías A1–A10" de `decisiones-v0.md` (que la deja a cargo de esta fase). Las filas de changelog que lo registran están en el Anexo A y se agregan al aprobarse este documento **[PA 1]**.

---

## 2. Ficha de evaluación

Una ficha = **un evento de evaluación** de un riesgo por un evaluador: la evaluación inicial y cada reevaluación son fichas distintas (sección 6). Nombres de campo: `plantillas/ficha-evaluacion.csv`. Campo vacío = no aplica; nunca se usa vacío para decir "no sé" (para eso está `unknown`).

### 2.1 Identificación y contexto

| Campo | Tipo | Valores permitidos |
|---|---|---|
| `evaluacion_id` | texto | único, `EV-NNNN` |
| `risk_id` | texto | el de la lista de riesgos; en evaluación ciega viene dado |
| `caso_empresa` | texto | caso de propiedad (`CP-NN`) o empresa sintética |
| `tipo_objeto` | enum | `riesgo` \| `padre` \| `sub_riesgo` \| `escenario` (D21, D24; metodología §1.2). Una ficha de `padre` no lleva factores propios: toma los de su sub-riesgo determinante (metodología §1.4) |
| `riesgo_padre_id` | texto | obligatorio si `tipo_objeto = sub_riesgo` |
| `miembros` | texto | obligatorio si `tipo_objeto = escenario`: `risk_id` de los riesgos que lo componen, separados por `;` |
| `evaluador` | texto | identificador de la persona o de la sesión de agente |
| `actor` | enum | `human` \| `ai` \| `import` (EMI-17). **Ficha de agente: `ai` obligatorio.** |
| `fase` | entero | 2–12 |
| `corrida_id` | texto | identificador de la corrida (sección 7) |
| `version_metodologia` | texto | p. ej. `metodologia v0.1` |
| `version_protocolo` | texto | p. ej. `protocolo v0.1` |
| `fecha` | fecha | ISO `AAAA-MM-DD` |
| `tipo_evaluacion` | enum | `inicial` \| `reevaluacion` |
| `evaluacion_anterior_id` | texto | obligatorio si `reevaluacion` |
| `motivo` | enum | D22: `accion_ejecutada` \| `informacion_nueva` \| `cambio_contexto` \| `correccion_evaluacion` \| `cambio_version_metodologia`; obligatorio si `reevaluacion` |
| `accion_id` | texto | obligatorio si `motivo = accion_ejecutada` |
| `accion_cambio_esperado` | texto | el cambio que la acción declaraba ("V 4→2"); sólo con `accion_id` |
| `accion_efecto` | enum | `efecto_total` \| `efecto_parcial` \| `sin_efecto_medible`; sólo con `accion_id` (sección 6.3) **[PA 9]** |
| `accion_brecha_nota` | texto | obligatorio si `accion_efecto` ≠ `efecto_total` |
| `riesgo_causa` | texto | causa |
| `riesgo_evento` | texto | evento iniciador: el corte P/V de D15 (metodología §2.1) |
| `riesgo_consecuencia` | texto | cadena de consecuencias |
| `informacion_ref` | texto | referencia a la ficha de información usada (sección 10) |

### 2.2 Por factor

Siete factores: `p`, `i_econ`, `i_pers`, `i_cont`, `i_legal`, `v_cont` (contención) y `v_rec` (recuperación). V ya no se asigna como un factor único: sus dos aspectos se evalúan por separado y V se aplica por dimensión (D15, metodología §5). Cada factor lleva los mismos seis campos (`<f>` = prefijo del factor). Es la procedencia **por factor** que pide I13, con el vocabulario de EMI-17 sin campos nuevos de procedencia: sólo cambia a qué se aplica.

| Campo | Tipo | Valores permitidos |
|---|---|---|
| `<f>_valor` | enum | `1`–`5` (valor plausible de D8) \| `unknown` (D8: la evidencia no fija el nivel ni lo acota a tres niveles contiguos; metodología §9.2) \| `no_aplica` (sólo `v_rec`: no hay nada que restablecer ni reponer; metodología §5.5) |
| `<f>_min` | entero | `1`–`5`, ≤ `<f>_valor`; vacío si no hay rango |
| `<f>_max` | entero | `1`–`5`, ≥ `<f>_valor`; vacío si no hay rango. Es el **techo del factor** (D8) |
| `<f>_base` | enum | `observed` \| `reported` \| `inferred` \| `assumed` (EMI-17) |
| `<f>_evidencia` | texto | 0..n referencias separadas por `;`, o `sin_evidencia` explícito (EMI-17: la ausencia queda explícita) |
| `<f>_observacion` | texto | el hecho que sostiene el nivel, en palabras ("tres incidentes en dos años", "nunca en 15 años de operación"). No reemplaza el nivel ordinal (O4, D13) |

Reglas de llenado:
- Si `<f>_valor = unknown`, `<f>_min` y `<f>_max` pueden registrarse si el evaluador puede acotarlo; si no, quedan vacíos **[PA 2]**.
- Con rango, `<f>_valor` es el que entra en la criticidad; el rango se conserva y `<f>_max` sólo alimenta el techo (D8).
- Con `<f>_valor` conocido, el rango cubre como máximo tres niveles contiguos (`<f>_max − <f>_min ≤ 2`); si la evidencia no lo acota a eso, el factor es `unknown` (metodología §9.2).

### 2.3 Resultado y cierre

| Campo | Tipo | Valores permitidos |
|---|---|---|
| `i_efectivo` | enum | `1`–`5` \| `unknown`. `max(dimensiones)` (D5); se muestra y desempata (D10). Con una dimensión `unknown`, se aplica metodología §9.3 |
| `i_efectivo_dimensiones` | texto | dimensión o dimensiones que dan el máximo (`econ;cont`) |
| `v_aspectos_aplicables` | texto | derivado, nunca a mano: por dimensión, qué aspectos de V entraron en `V_d` (`econ:cont,rec;pers:cont;cont:cont,rec;legal:cont`); con `v_rec = no_aplica`, recuperación no figura (metodología §5.5) |
| `c_dimension_determinante` | texto | derivado: dimensión o dimensiones cuyo `C_d = P × I_d × V_d` da `c_raw` (D14) |
| `consecuencia_extrema` | booleano | `true` si alguna dimensión de I tiene `<f>_valor = 5` (D20, respuesta 3) **[PA 4]** |
| `consecuencia_extrema_dimensiones` | texto | dimensiones que la disparan |
| `safety_critical` | booleano | `true` si `i_pers_valor ≥ 4`; en un riesgo no evaluable, también si `i_pers` es `unknown` y `i_pers_max ≥ 4` (D23) |
| `evaluable` | booleano | `false` si `p` es `unknown`, o si la cota de alguna dimensión con partes `unknown` supera el `c_raw` de las conocidas (D8, metodología §9.3) |
| `motivo_no_evaluable` | texto | obligatorio si `evaluable = false`: qué factor y por qué |
| `necesidad_validacion` | texto | obligatorio si `evaluable = false` o hay algún `unknown`: qué hay que averiguar |
| `uncertainty` | enum | `low` \| `medium` \| `high` (EMI-17, a nivel de riesgo, D9) |
| `uncertainty_nota` | texto | obligatorio si `medium` o `high`: qué falta confirmar |
| `c_raw` | entero | `max_d (P × I_d × V_d)` (D14), vacío si `evaluable = false`. Índice heurístico interno: no se muestra como escala (D12) |
| `banda` | enum | `Baja` \| `Media` \| `Alta` \| `Crítica`; **vacío hasta que la Fase 9 fije umbrales** |
| `techo_plausible` | entero | `max_d (P_max × I_d_max × V_d_max)`, con `<f>_max` donde hay rango y `<f>_valor` donde no; no participa del ranking (D8) |
| `reglas_aplicadas` | texto | números de regla separados por `;` (`D8;D15;D20`) |
| `justificacion` | texto | 1–3 frases que expliquen el resultado citando reglas (P3) |
| `reputacion_texto` | texto | opcional; observación reputacional en texto. **No entra en I** (D13, O7) |
| `review_status` | enum | `pending` \| `accepted` \| `needs_revision` \| `rejected` (EMI-17). **Ficha de agente: nace `pending` obligatoriamente.** Aplica a este evento, no al riesgo entero (I13; ver 6.2) |
| `revisado_por` | texto | quien cambió el `review_status`; para `accepted`, una persona (EMI-17: la revisión por otra IA no equivale a aceptación profesional) |
| `fecha_revision` | fecha | ISO |
| `anomalias` | texto | `anomalia_id` del registro, separados por `;` |

Ejemplo parcial de ficha, sin resultado: *riesgo* "Cortocircuito en tablero eléctrico → incendio en depósito → pérdida de stock y parada de despacho"; `p_valor = 3`, `p_base = reported`, `p_observacion = "dos principios de incendio en cinco años según el responsable de planta"`; `i_cont_valor = 4`, `i_cont_min = 3`, `i_cont_max = 5`, `i_cont_base = inferred`; `v_cont_observacion = "detección y rociadores probados en el último ensayo"`, `v_rec_observacion = "sin depósito alternativo ni acuerdo con terceros"`.

---

## 3. Granularidad (D21)

**Regla.** Un riesgo es un evento con una cadena de consecuencias que comparte P y V. Si el evento o las consecuencias son distintos, se representan como riesgos distintos. Si comparten P y V, son un solo riesgo con varias dimensiones de I. Si el evento y la consecuencia son los mismos pero las causas tienen P o V distintas, es un riesgo padre con un sub-riesgo por causa (D21, metodología §1.3).

Cuándo partir:
1. **V distinta.** "Incendio en la planta" e "incendio en el depósito tercerizado": el evento se parece, pero la planta tiene detección y brigada y el depósito no tiene ninguna; la respuesta post-evento es otra. Dos riesgos.
2. **P distinta.** "Accidente de un operario en la línea de envasado" y "escape de amoníaco de la cámara de frío": las dos consecuencias son sobre personas, pero las causas y su frecuencia no tienen nada en común. Dos riesgos.

Cuándo no partir:
3. "Falla del único proveedor de envases → la planta se detiene → incumplimiento de contratos de entrega con multas". Parada (I-continuidad) y multas (I-económico) salen del mismo evento, con la misma probabilidad y la misma capacidad de respuesta (stock de seguridad, proveedor alternativo). Un riesgo con dos dimensiones de I.

**En evaluación ciega** (fases 8 y 12) la lista de riesgos es fija. Ningún evaluador la reparte, la agrega ni la redacta de nuevo. Si cree que un riesgo debería partirse o fusionarse, lo evalúa igual tal como está y registra una anomalía A7.

---

## 4. Tipología de anomalías

Una anomalía es una fricción entre la metodología y un caso. Se registra en el momento y no se resuelve en la corrida (sección 7).

| Código | Nombre | Señal observable | Ejemplo |
|---|---|---|---|
| A1 | Divergencia entre evaluadores | Dos evaluadores con la misma ficha de información difieren en ≥1 nivel en un factor o dimensión, o en banda, o en posición de ranking. Se registra **por factor** (campo `factor`). | Emiliano pone `v_rec = 2` y el agente `v_rec = 4` al mismo riesgo de ransomware. |
| A2 | Unknown sin regla | El evaluador no sabe qué valor poner, inventa uno, o D8 y `metodologia-v0.md` no dicen qué hacer (p. ej. I efectivo con una dimensión `unknown`). | Nadie sabe cuántas personas trabajan en el turno noche y no hay regla para elegir entre plausible y `unknown`. |
| A3 | Extremos | Un riesgo con `consecuencia_extrema = true` queda en una posición que el evaluador juzga incorrecta, o la bandera marca riesgos que no parecen extremos. | Un derrumbe remoto con víctimas fatales queda último en la lista y sólo la bandera lo distingue. |
| A4 | Colisión de ranking | Dos riesgos quedan empatados sin regla de desempate en D10, o su orden lo decide un desempate que el evaluador juzga irrelevante para la prioridad. | Dos riesgos con los mismos factores en distinto orden quedan empatados y el evaluador cree que uno es claramente más urgente. |
| A5 | Inconmensurabilidad | Hay que comparar niveles de dimensiones distintas de I y la comparación nivel a nivel de D11 no alcanza para decidir. | ¿I-personas 4 pesa igual que I-económico 4 al ordenar dos riesgos? |
| A6 | Alcance/objeto | No está claro qué estado se evalúa (actual para P y V, bruto para I según D2 y D19), el horizonte de 12 meses (D3) o la organización de referencia. | ¿El impacto se mide con el seguro contratado o sin él? (D17 dice bruto; la duda igual se registra si aparece.) |
| A7 | Granularidad | El riesgo es demasiado agregado, se solapa o duplica con otro, o mezcla consecuencias que requieren P o V distintas (D21). | "Interrupción de operaciones" junta falla eléctrica y caída de sistemas, con V muy distintas. |
| A8 | Resultado contraintuitivo | La regla se aplica sin dudas pero el resultado choca con el juicio profesional. | Un riesgo frecuente y menor queda arriba de uno grave y probable. |
| A9 | Procedencia que mueve la criticidad por fuera de D8 | La criticidad cambia por el `base` de la información (observed / reported / inferred / assumed) por un camino distinto de valor plausible, rango y techo; o un factor baja por falta de evidencia (P2). | El evaluador baja P de 3 a 2 "porque es sólo `assumed`". |
| A10 | Doble conteo | Un mismo control o condición se descuenta en más de un factor sin mecanismos causales distintos y documentados (D15). | Los rociadores bajan P y también V. |
| A11 | Solapamiento P/I/V | Un hecho admite cargarse en más de un factor y las definiciones (D4, D15, D19) no deciden cuál; distinto de A10 porque se carga una sola vez, pero dos evaluadores pueden elegir distinto. | "No hay plan de continuidad": ¿sube I-continuidad o sube V? (contradicción abierta #1). |
| A12 | Contradicción entre reglas | Dos reglas dan instrucciones incompatibles para el mismo caso. | Una regla pide registrar el valor esperado de la acción y D18 prohíbe moverlo sin reevaluación. |

Cambios respecto de A1–A10 de `decisiones-v0.md` **[PA 1]**:
- **A9 redefinida** (I12): con D8, que el `base` cambie la criticidad a través de valor plausible y techo es aplicación correcta de la regla, no anomalía. A9 queda para el camino patológico: cualquier otro efecto del `base`, o la baja por falta de evidencia.
- **A4 ampliada** de "empate sin desempate" a "colisión de ranking", que es lo que pide el plan.
- **A3 y A6** reescritas para v0 sin pisos (D20) y con D2/D19/D3.
- **A11 nueva**: el plan pide "solapamiento P/I/V" y no encaja en A6 ni A10.
- **A12 nueva**: el plan pide "contradicciones entre reglas" y no encaja en ninguna.

**Dato o metodología** (plan-pasos §2.2). Cada anomalía se clasifica:
- **problema del dato/caso** si con mejor información o mejor redacción del riesgo la fricción desaparece;
- **problema de la metodología** si persiste con información perfecta.

Si no se puede clasificar en la corrida, queda `sin_clasificar` y la clasifica la adjudicación.

---

## 5. Registro de anomalías

Plantilla: `plantillas/registro-anomalias.csv`. Una fila por anomalía; una fila nunca se borra.

| Campo | Tipo | Valores permitidos |
|---|---|---|
| `anomalia_id` | texto | único, `AN-NNNN` |
| `fase` | entero | 2–12 |
| `version_metodologia` | texto | versión con la que apareció |
| `codigo` | enum | `A1`–`A12` |
| `factor` | enum | `p` \| `i_econ` \| `i_pers` \| `i_cont` \| `i_legal` \| `i_efectivo` \| `v_cont` \| `v_rec` \| `banda` \| `ranking` \| `na` **[PA 5]** |
| `riesgos_involucrados` | texto | `risk_id` separados por `;` |
| `descripcion` | texto | qué pasó, en 1–3 frases |
| `dato_vs_metodologia` | enum | `dato` \| `metodologia` \| `sin_clasificar` |
| `estado` | enum | `abierta` \| `adjudicada` |
| `decision` | texto | lo que decidió Emiliano; vacío si abierta |
| `regla_resultante` | texto | número de regla creada o modificada; vacío si ninguna |
| `version_que_la_incorpora` | texto | versión de metodología o protocolo que aplica la decisión |

---

## 6. Reevaluaciones e historial (D22)

### 6.1 Historial
1. El historial de un riesgo es la secuencia de sus fichas, ordenada por `fecha`. **Ninguna ficha se edita ni se borra**; una corrección es una ficha nueva con `motivo = correccion_evaluacion`.
2. Cada cambio de un factor genera una ficha `reevaluacion` que registra: `motivo` (los cinco valores de D22), la evidencia del factor cambiado (`<f>_evidencia`), quién la aceptó (`revisado_por`) y la versión de metodología.
3. Un factor cambia sólo cuando esa ficha queda `accepted` (D18). Mientras está `pending`, el estado vigente del riesgo es el de la última ficha aceptada.

### 6.2 Línea de base
- La **línea de base** es la primera ficha `accepted` del riesgo. No cambia nunca: si después resulta errónea, se corrige con una ficha nueva y la línea de base sigue siendo la misma, con su error a la vista.
- `review_status` se aplica a cada ficha (evento). El estado del riesgo es el de su última ficha `accepted` (I13).
- Al medir cuánto mejoró el riesgo por el plan de acción, sólo cuentan los cambios con `motivo = accion_ejecutada`; los demás motivos se reportan aparte (C9) **[PA 6]**.

### 6.3 Acción cuyo efecto no se confirma (contradicción abierta #5)
Regla mínima propuesta **[PA 9]**:
1. El cambio esperado de una acción **nunca escribe** el valor de un factor (D16).
2. Verificada la ejecución, se abre una reevaluación con `motivo = accion_ejecutada`, `accion_id` y `accion_cambio_esperado`.
3. El factor toma el valor reevaluado, no el esperado. `accion_efecto` queda `efecto_total` si coinciden, `efecto_parcial` si el factor se movió menos de lo esperado, `sin_efecto_medible` si no se movió; con `accion_brecha_nota` explicando la brecha.
4. Si la reevaluación además descubre que el factor estaba mal estimado de antes (en cualquier dirección), eso se registra en una ficha separada con `motivo = informacion_nueva` o `correccion_evaluacion`, para que la medición del plan no lo absorba.

### 6.4 Cambio de versión de la metodología (I17)
1. Al publicarse una versión nueva, las evaluaciones vivas **no se reescriben**. Cada riesgo cuyo resultado podría cambiar queda marcado para reevaluar.
2. La reevaluación es una ficha nueva con `motivo = cambio_version_metodologia`, fechada en el cambio, con la versión nueva. Las fichas anteriores quedan intactas.
3. Estas fichas nunca cuentan como mejora del plan de acción (6.2).
4. En el experimento, esto se ejecuta como parte de la regresión (sección 13).

---

## 7. Reglas de corrida

1. Una **corrida** es la aplicación de una versión de metodología a un conjunto de casos o riesgos en una fase. Tiene `corrida_id`, versión de metodología y de protocolo, fecha de inicio y de cierre.
2. La versión de metodología **se congela** durante la corrida. Ningún archivo de la metodología se edita entre el inicio y el cierre.
3. Las dudas se registran como anomalías y **no se resuelven en el momento**. El evaluador aplica la lectura que le parezca más literal, la anota en `justificacion` y sigue.
4. Ningún evaluador ajusta, interpreta de forma especial ni exceptúa una regla para un riesgo puntual. Si cree que la regla no debería aplicarse a ese riesgo, la aplica igual y registra A8 o A12.
5. Los resultados de una corrida no se corrigen después de cerrada: una corrección es una corrida nueva.

---

## 8. Dry run (Fase 4)

Entrada: `metodologia-v0.md` congelada y los casos de propiedad adjudicados en la Fase 2. Plantilla del reporte: `plantillas/reporte-dry-run.md`.

**Qué se juzga (respuesta 4).** Sólo **orden** y **visibilidad**. Las bandas no existen hasta la Fase 9: un criterio adjudicado que sólo se refiera a la banda queda "no juzgable en Fase 4" y pasa a la Fase 9. **"FAIL — calibración" no se usa en la Fase 4**; queda reservado para la Fase 9.

**Cómo se ejecuta cada caso.** El agente puntúa cada caso con las anclas de `metodologia-v0.md`, sin abrir el anexo de ternas de la Fase 2; después compara sus factores con los del anexo y registra las diferencias (cada diferencia es una anomalía A1 entre el agente y el anexo) **[PA 7]**. La clasificación se hace sobre los factores del agente.

**Categorías y regla de decisión.** Se asigna una sola categoría por caso, la primera de esta lista que se cumpla; las demás que también se cumplan se anotan como secundarias.

| Orden | Categoría | Regla de decisión |
|---|---|---|
| 1 | **FAIL — contradicción** | Para el caso, dos reglas de la metodología dan instrucciones incompatibles (hay al menos una anomalía A12). |
| 2 | **FAIL — definición** | Algún factor no puede asignarse sin una anomalía A2, A6 o A11, o dos lecturas literales de la metodología dan valores distintos para el mismo factor. |
| 3 | **FAIL — combinación** | El orden contradice lo adjudicado entre riesgos con distinto `c_raw`: los factores no están en disputa y el producto mismo los ordena al revés. |
| 4 | **FAIL — ranking** | El orden contradice lo adjudicado entre riesgos con igual `c_raw`, es decir, lo decidió un desempate de D10 (o la falta de uno); o un riesgo que debía quedar visible no lo queda en la lista. |
| 5 | **PASS** | Todos los criterios adjudicados juzgables en la Fase 4 (quién queda arriba, si pueden empatar, si alguno debe quedar visible, qué sería profesionalmente incorrecto) se cumplen. |
| — | **FAIL — calibración** | No se usa en la Fase 4. |

"Visible" en la Fase 4 significa: el riesgo tiene `consecuencia_extrema = true` y aparece en el filtro de la bandera, o tiene `safety_critical = true` y aparece en la vista de seguridad, o figura en la lista "no evaluable" con motivo (D8, D20, D23) **[PA 7]**.

**Propiedades.** Además de los órdenes adjudicados, el dry run intenta romper las propiedades de `metodologia-v0.md` §14 (monotonía, invariancia de granularidad, causalidad de V, unknowns, separación, historial, producto) y registra cada contraejemplo como anomalía. **Casos de origen:** el resultado de un caso sobre una regla que lo lista como caso de origen se reporta como circular y no cuenta como evidencia a favor.

**Frecuencia de `consecuencia_extrema` (H4, contradicción abierta #3).** El reporte informa cuántos casos tienen la bandera sobre el total, y cuántos la tienen por cada dimensión de I; lo mismo para `safety_critical`. Como los casos de propiedad son extremos por diseño, ese número no estima la frecuencia en la población: se repite sobre las empresas sintéticas en las fases 7 y 8 y se reporta igual. No se fija un umbral **[PA 8]**.

---

## 9. Criterio de falsación de D14

**Regla (D14, respuesta 7).** Si **3 casos independientes** previamente adjudicados producen órdenes incorrectos que no pueden corregirse mediante calibración, anclas o desempates simples, `C_raw = P × I × V` se considera falsada y se reabre la regla de combinación.

**Qué cuenta como caso** **[PA 10]**: un caso de propiedad de la Fase 2, o cualquier par de riesgos cuyo orden esperado Emiliano haya adjudicado **antes** de que se corriera la versión que lo falla. El conteo es acumulado desde la Fase 4 hasta la v1 candidate.

**Qué cuenta como "orden incorrecto"**: un FAIL — combinación o FAIL — ranking confirmado en la adjudicación de la Fase 5.

**Independientes.** Dos casos fallidos son independientes si se cumplen las dos:
1. no son variantes del mismo par (mismo contraste con otros números, o el mismo caso en otra empresa);
2. no fallan por la misma regla mal calibrada: si una sola corrección simple arreglaría a ambos, cuentan como uno.

**No corregible por calibración, anclas o desempates simples.** Una corrección es simple si cambia sólo una de estas cosas: los umbrales de banda (D12); la redacción de los niveles de las anclas de un factor; o el orden o la presencia de un desempate de D10. No es simple si cambia la fórmula, agrega pesos o exponentes, o cambia la definición de un factor (D4, D5, D15, D19). Una corrección simple que arregla el caso pero hace fallar un caso que antes pasaba (según la regresión de la sección 13) **no cuenta como corrección**.

**Quién lo declara.** El agente propone, en el reporte de la Fase 5, qué casos cuentan, por qué son independientes y por qué no hay corrección simple. **Emiliano decide.** Hasta que decida, el conteo figura como "propuesto".

---

## 10. Evaluación ciega (Fase 8)

**Independencia (H12).**
1. El evaluador agente es una sesión distinta de la que diseñó las empresas (fases 6–7). No tiene acceso a la carpeta de diseño de EMI-41 ni a este registro de anomalías de fases anteriores.
2. Las fichas de información no contienen la intención de diseño ("este riesgo prueba el corte P/V", "acá queremos un V alto"). La intención vive en un archivo aparte que sólo se abre en la comparación. Emiliano tampoco lo abre antes de terminar sus evaluaciones **[PA 11]**.
3. Cada evaluador entrega todas sus fichas antes de ver nada del otro: ni factores, ni justificación, ni ranking.

**Misma información.** Ambos reciben exactamente la misma ficha de información por riesgo: contexto de la empresa (P, I, V y transferencia según la Fase 7) y la redacción `causa → evento → consecuencia`, **sin factores asignados**. La lista de riesgos es fija (D21, sección 3).

**Qué produce cada uno.** Una ficha (sección 2) por riesgo: factores con rango y procedencia, I efectivo, contención y recuperación, `uncertainty`, `c_raw`, techo y justificación. Las fichas del agente nacen `actor = ai`, `review_status = pending`.

**Muestra (respuesta 8).** Si hay **≤ 40** riesgos, se evalúan todos. Si hay más, **30 estratificados por empresa** **[PA 12]**:
- a cada empresa le tocan riesgos en proporción a cuántos tiene, con un mínimo de 3 por empresa (o todos, si tiene menos), redondeando hasta sumar 30;
- dentro de cada empresa, la selección es aleatoria, con semilla fija registrada antes de empezar;
- la hace un script que sólo ve `risk_id` y `caso_empresa`: ni fichas de información, ni intención de diseño, ni evaluaciones.

**Comparación.** La hace un proceso posterior (script) que calcula las métricas de la sección 11 y genera las anomalías A1 por factor.

---

## 11. Métricas de reproducibilidad

Se calculan sobre los pares de fichas (Emiliano, agente) de la Fase 8. Se reportan siempre con el número de pares (`n`), no sólo el porcentaje. Los targets son **criterios experimentales v0, no estándares** (P4).

| Nivel | Métrica | Target |
|---|---|---|
| Por factor: P, cada dimensión de I, I efectivo, contención, recuperación | % de pares dentro de ±1 nivel | **≥ 80%** en cada factor por separado |
| Por factor | % de acuerdo exacto | sin target (baseline) |
| Por factor | kappa ponderado (pesos lineales) **[PA 13]** | sin target (baseline) |
| Banda | % de coincidencia | **≥ 70%**, medible recién cuando existan umbrales (Fase 9) |
| Ranking | correlación de rangos (tau-b de Kendall) por empresa | sin target (baseline) |
| Ranking | solapamiento del top-3 por empresa **[PA 13]** | sin target (baseline) |

Reglas de cálculo:
1. **Por qué acuerdo exacto y kappa (H11).** Dos evaluadores al azar en una escala 1–5 caen dentro de ±1 en 13 de 25 combinaciones (~52%). El 80% se lee contra ese piso.
2. **Unknowns.** Un par donde alguno de los dos puso `unknown` (o `no_aplica` en recuperación) no entra en ±1, exacto ni kappa de ese factor; se reporta aparte como **acuerdo de evaluabilidad** (% de pares donde ambos pusieron valor o ambos `unknown`) **[PA 14]**.
3. **Rangos.** Se compara `<f>_valor` (el plausible). La coincidencia de rangos se reporta aparte, sin target.
4. **Banda.** Con los umbrales de la Fase 9, la banda de cada ficha de la Fase 8 se calcula desde sus factores; el informe declara que los umbrales se calibraron sobre parte de esas mismas empresas.
5. **Ranking.** Se ordena cada empresa con la versión de D10 vigente; los riesgos no evaluables quedan fuera del ranking y se cuentan aparte.
6. **No alcanzar un target** no falsa nada por sí solo: los factores por debajo del target se analizan con sus anomalías A1 y van a Emiliano como insumo de "divergencias interpretables" (Fase 11).

---

## 12. Calibración de bandas (Fase 9)

Procedimiento del plan, en este orden. El agente propone; Emiliano aprueba los umbrales.
1. Usar primero los casos de propiedad **sin** `consecuencia_extrema`.
2. Crear umbrales preliminares a partir de lo adjudicado en ellos. Sin cortes arbitrarios ni equiespaciados (D12).
3. Incorporar los casos con `consecuencia_extrema = true`. Acá se pone frente a Emiliano la contradicción abierta #2 (¿un riesgo remoto puede llegar a Crítica?); el protocolo no la decide.
4. Evaluar la distribución de bandas sobre todos los riesgos de todas las empresas sintéticas.
5. Verificar que las bandas discriminen: que riesgos con distinto resultado adjudicado no caigan sistemáticamente en la misma banda.
6. **Señal a revisar, no cuota:** si una sola banda concentra más de la mitad de los riesgos sintéticos, o una banda queda vacía, el agente lo reporta y Emiliano decide si ajustar **[PA 15]**. No hay porcentajes obligatorios por banda.
7. Ejecutar nuevamente todos los casos de propiedad (regresión, sección 13). En esta fase sí se usa "FAIL — calibración": la estructura y el orden son los adjudicados pero la banda no.

**Población (I15).** El conjunto de calibración (casos de propiedad + sintéticos) es contrastante por diseño y **no es la población** donde Risk OS se va a aplicar. El informe de la Fase 9 lo declara y no presenta la distribución obtenida como esperable en empresas reales.

---

## 13. Regresión (Fase 10)

**Qué se re-ejecuta.** Ante cada cambio de metodología (cada fila nueva del changelog que sube versión): **todos** los casos de propiedad y **todos** los riesgos de EMI-41.
- Si el cambio toca sólo cómo se combinan factores ya asignados (D10, D12, D14, D20, D23, o la tabla de aspectos de V por dimensión), se recalcula desde los factores guardados.
- Si toca cómo se asigna un factor (D4, D5, D8, D15, D19, D21 o las anclas y rúbricas), el agente reevalúa los factores afectados con fichas nuevas `motivo = cambio_version_metodologia`, `review_status = pending` (sección 6.4) **[PA 16]**.

**Formato del reporte.** Una fila por caso o riesgo:

| caso / risk_id | versión anterior | versión nueva | resultado anterior | resultado nuevo | estado | regla que produjo el cambio | fila del changelog |
|---|---|---|---|---|---|---|---|

`estado` = `sin_cambio` | `mejoró` (se acerca a lo adjudicado) | `regresionó` (un caso que pasaba ahora falla, o un cambio que el changelog no justifica, plan-pasos §2.4) | `cambió` (riesgo sin adjudicación: cambió, sin juicio).

**Aceptación.** Una corrección local no se acepta sin la regresión completa. Una corrección que regresiona algún caso no se acepta salvo que Emiliano lo apruebe explícitamente, y queda registrado en el changelog.

---

## 14. Qué decide Emiliano y qué el agente

Tomado de "División humano / agente" del plan, más lo que este protocolo le asigna a cada uno.

| Emiliano decide | El agente ejecuta y propone |
|---|---|
| Que las decisiones consolidadas representan lo acordado (Fase 0) y que este protocolo es el preregistro (Fase 1) | Protocolo, plantillas, changelog |
| El comportamiento esperado de cada caso de propiedad, sin ver el producto (Fase 2) | Casos, anexo de ternas, metodología escrita (Fase 3) |
| Los FAIL que requieren juicio profesional y la clasificación dato/metodología que no se pudo cerrar (Fase 5) | Dry run, clasificación PASS/FAIL, causa y corrección mínima de cada FAIL, regresión |
| Si se alcanzaron los 3 casos independientes que falsan D14 (sección 9) | La propuesta de conteo y su argumento |
| El conjunto de empresas sintéticas (Fase 6) | Cobertura, empresas, riesgos, fichas de información (fases 6–7) |
| Sus propias evaluaciones ciegas (Fase 8) | Evaluación independiente, comparación y métricas |
| Los umbrales de banda y si una señal de distribución exige ajuste (Fase 9) | Calibración asistida y propuesta de umbrales |
| Aceptar cada ficha (`accepted`) y aceptar o rechazar la v1 candidate (fases 11–12) | Todo lo demás, siempre con fichas `pending` |

---

## Anexo A · Filas de changelog agregadas al aprobar

Agregadas a `changelog-metodologia.md` el 2026-10-05, tras la aprobación de Emiliano **[PA 1]**.

| id | fecha | versión | elemento | antes | después | motivo | fuente |
|---|---|---|---|---|---|---|---|
| CH-048 | 2026-10-05 | protocolo v0.0 | A9 | La criticidad cambia según si la información es `observed` o `assumed` | La procedencia modifica la criticidad por un camino distinto de valor plausible, rango y techo (D8), o un factor baja por falta de evidencia | I12: con D8 la forma anterior se dispara por diseño | revisión I12; prompt Fase 1 |
| CH-049 | 2026-10-05 | protocolo v0.0 | A4 | Empate sin desempate | Colisión de ranking: empate sin regla, o orden decidido por un desempate irrelevante | El plan pide registrar "colisiones de ranking" | plan, Fase 1 "Anomalías" |
| CH-050 | 2026-10-05 | protocolo v0.0 | A3, A6 | Redacción con pisos e inherente/residual | Redacción sin pisos (D20) y con D2, D19 y D3 | Alinear con decisiones v0.0 | decisiones v0.0 |
| CH-051 | 2026-10-05 | protocolo v0.0 | A11 | — | Nueva: solapamiento P/I/V | El plan la pide y no encaja en A6 ni A10 | plan, Fase 1 "Anomalías" |
| CH-052 | 2026-10-05 | protocolo v0.0 | A12 | — | Nueva: contradicción entre reglas | El plan la pide y no encaja en ninguna | plan, Fase 1 "Anomalías" |
| CH-053 | 2026-10-05 | protocolo v0.0 | Protocolo | plan-pasos §2 | `protocolo.md` v0.0: ficha por factor, historial, dry run, falsación, evaluación ciega, métricas, calibración, regresión | Fase 1 del plan | plan, Fase 1 |

---

## Para aprobar

**Aprobado por Emiliano el 2026-10-05 18:31 UTC: sí a los 18 puntos.**

Cada punto se responde con sí o no.

1. **Anomalías y changelog.** ¿Aprobás la tipología A1–A12 de la sección 4 (A9 redefinida, A4 ampliada, A3 y A6 reescritas, A11 y A12 nuevas), que reemplaza la tabla de `decisiones-v0.md`, y que las filas del Anexo A se agreguen al changelog recién con tu aprobación?
2. **Unknown con rango.** Un factor `unknown` puede registrar `min` y `max` si el evaluador puede acotarlo, aunque no tenga valor plausible. ¿Sí?
3. **I efectivo con una dimensión `unknown`.** `decisiones-v0.md` no dice qué pasa; el protocolo lo deja a `metodologia-v0.md` (Fase 3) y mientras tanto lo registra como A2. ¿Sí?
4. **Disparo de la bandera.** `consecuencia_extrema` se dispara con el **valor plausible** = 5 en alguna dimensión, no con el extremo superior del rango. ¿Sí? (Si no, se dispara también cuando `<f>_max` = 5, y va a marcar más riesgos.)
5. **Campo `factor` en el registro de anomalías.** No está en plan-pasos §2.3; lo agrego para que A1 quede desagregada por factor (I14). ¿Sí?
6. **Mejora del plan de acción.** Sólo los cambios con `motivo = accion_ejecutada` cuentan como mejora atribuible al plan (C9). ¿Sí?
7. **Dry run.** El agente puntúa cada caso con las anclas sin mirar el anexo, después compara con el anexo; y "visible" en la Fase 4 es "aparece en el filtro de la bandera o en la lista no evaluable". ¿Sí?
8. **Frecuencia de la bandera sin umbral.** El dry run y las fases 7–8 reportan con qué frecuencia se dispara `consecuencia_extrema`, como baseline, sin un umbral preregistrado que obligue a revisar D20. ¿Sí? (Si querés umbral, decí cuál.)
9. **Acción cuyo efecto no se confirma (contradicción #5).** Regla de 6.3: el factor toma el valor reevaluado; la acción queda `efecto_total`, `efecto_parcial` o `sin_efecto_medible` con nota de la brecha; lo que la reevaluación descubre sobre el pasado va en una ficha aparte. ¿Sí?
10. **Falsación de D14.** Las definiciones de la sección 9 (qué es caso, independencia, corrección simple, una corrección que regresiona no cuenta, conteo acumulado de la Fase 4 a la v1 candidate). ¿Sí?
11. **Tu ceguera en la Fase 8.** Vos tampoco abrís el archivo de intención de diseño antes de terminar tus evaluaciones. ¿Sí?
12. **Estratificación.** Proporcional al número de riesgos por empresa, mínimo 3 por empresa, aleatoria con semilla fija, hecha por un script que sólo ve `risk_id` y empresa. ¿Sí?
13. **Elecciones de cálculo.** Kappa con pesos lineales; ranking por empresa con tau-b de Kendall y solapamiento del top-3. ¿Sí?
14. **Unknowns en las métricas.** Los pares con `unknown` salen de ±1, exacto y kappa y se reportan como acuerdo de evaluabilidad. ¿Sí?
15. **Señal de distribución en la Fase 9.** "Más de la mitad de los riesgos sintéticos en una banda, o una banda vacía" como señal para revisar, no como cuota. ¿Sí?
16. **Regresión.** Los cambios de combinación se recalculan desde los factores guardados; los de asignación de factores obligan a reevaluar con fichas nuevas `cambio_version_metodologia`. ¿Sí?
17. **Procedencia por factor vs EMI-17.** EMI-17 dice "no se requiere field-level lineage en v1". El protocolo registra `base` y evidencia por factor sólo en el experimento; si eso pasa a v1 se decide en la Fase 15 (EMI-16). ¿Sí?
18. **`review_status` por evento.** Se aplica a cada ficha y el riesgo toma el de su última ficha aceptada (I13), mientras EMI-17 lo define por riesgo. ¿Sí?

**Entradas de `decisiones-v0.md` que el protocolo usa y siguen abiertas o como supuesto:** D10 (ranking, abierta → Fase 3: el protocolo usa "la versión de D10 vigente"); umbrales de D12 (abiertos → Fase 9); contradicciones abiertas #1 y #2 (las adjudicás en la Fase 2; el protocolo no las decide).
