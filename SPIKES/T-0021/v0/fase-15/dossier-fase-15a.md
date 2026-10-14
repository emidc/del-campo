# Dossier · Fase 15a · contratos de EMI-16 y modelo mínimo de Risk OS

> 2026-10-14 · T-0021, Fase 15a. RAIZ = `SPIKES/T-0021/` de `emidc/del-campo` en `main` (`39f4c89`, con las PR #73 y #74). **Decidido el 2026-10-14:** Emiliano respondió el "Para decidir" del final y aprobó los formatos con un cambio (punto 8: la historia ramificada es rechazo). Sus decisiones, copiadas sin cambios, están en `decisiones-15a.md`. No cambia ninguna regla de la metodología, no edita nada congelado y no escribe CSV sintéticos, validador, export ni código de producto: eso es la 15b.

## Resumen

- **Tres formatos.** `risks.csv`: una fila por evaluación, con la identidad del riesgo repetida y validada; el padre va en una fila sin evaluación; 84 columnas, ningún derivado. `action-plan.csv`: un registro por acción y riesgo, más las decisiones de tratamiento de §8.2; 26 columnas. `risk-transfer.csv`: un registro por cobertura y riesgo, más los eventos de póliza como filas propias; 35 columnas, ninguna entra al cálculo.
- **71 reglas de validación: 55 de rechazo y 16 avisos**, cada una con id y texto de error. La 15b escribe un caso inválido por cada una de las 55.
- **8 empresas sintéticas** (S05, S06, S07, S15, S28, S29, S32 y S36: 59 objetos), más **10 registros de acción nuevos** y unos pocos casos válidos nuevos que EMI-41 no tiene.
- **Decisiones (2026-10-14, `decisiones-15a.md`):** ids globales con prefijo de entidad y ULID, con el histórico como origen (1a). `base = —` es un dato faltante, sin tocar el enum (2a). Procedencia por registro obligatoria y por factor opcional (3b). `review_status` por registro en los tres archivos (4a). `C_raw` sólo en salidas, con el vector y las banderas, y el reordenamiento como registro aparte (5a). Derivados nunca importados (6a). Padre como fila sin evaluación y escenario con evaluación propia (7a). Una sola historia por riesgo, lineal: una ramificación se rechaza; la evaluación vigente es la última aceptada (8a, con el cambio de Emiliano). Ciclo = revisión pendiente cerrada (9a). Export ciego por lista blanca y fuera del repo (11a). Guía del evento como anexo (12a). CH-113 y CH-114 siguen esperando (13a).

## 1. Punto de partida

Detalle en `inventario-campos.md`; script en `inventario_campos.py`.

- **Huellas:** las 18 de `v1/congelamiento-v1.md` coinciden.
- **Fichas:** 355 de EMI-41 (255 del agente y 30 de Emiliano en la Fase 8, 64 de la Fase 11b y 6 de la Fase 12). Uso de cada columna en `uso-columnas.csv`.
- **Las 15 `base = —` no están en ninguna evaluación.** Están en la tabla "Procedencia por dato" de las fichas de información. Las 15 tienen evidencia `sin_evidencia` y un "qué falta" que dice que el dato no existe o no está disponible. Ninguna celda de las 355 evaluaciones vale `—` y ninguna `<f>_base` sale del enum.
- **Ids:** siete patrones. 27 `evaluacion_id` se repiten dentro de EMI-41 (EV-0001 a EV-0027, en agro y en servicios a personas) y 51 se repiten con el dry run de los casos de propiedad. 7 fichas de la Fase 11b apuntan a un anterior repetido. `risk_id` no colisiona.
- **Lo que EMI-41 no tiene:** ninguna acción (`accion_*` vacío en las 355), ningún `prioridad_provisional` (ningún padre con hijo no evaluable), ningún hijo empatado y ninguna reevaluación por `accion_ejecutada`, `informacion_nueva` o `cambio_contexto`.

## 2. Mapeo desde la ficha

`mapeo-ficha-a-contrato.csv` tiene una fila por cada una de las 89 columnas de la plantilla, por cada elemento del plan (Fase 15), por cada punto de EMI-16 y por cinco cosas que pide la metodología y la plantilla no tenía.

| Tipo | Columnas de la plantilla | Qué pasa |
|---|---:|---|
| dato | 56 | Entran. Las `accion_*` pasan de la evaluación a `action-plan.csv`. Cada `<f>_valor` se parte en `<f>_estado` (known, unknown, no_aplica) y `<f>_valor` (1–5) |
| experimento | 20 | No entran: `caso_empresa`, `fase`, `corrida_id`, `version_protocolo`, `informacion_ref`, `anomalias`. Las 14 `<f>_base` y `<f>_evidencia` dependen de la decisión 3 |
| derivado | 12 | No se importan (decisión 6): `i_efectivo`, `prioridad_provisional`, `i_efectivo_dimensiones`, `v_aspectos_aplicables`, `c_dimension_determinante`, `consecuencia_extrema`, sus dimensiones, `safety_critical`, `evaluable`, `c_raw`, `banda`, `techo_plausible` |
| sin uso | 1 | `reputacion_texto`: no se usó nunca y ninguna pantalla de v1 la nombra (§18). No entra |

**Lo que se agrega**, porque una pantalla de v1 lo necesita y la ficha no lo tenía como columna:
- `organizacion_id`: el ranking es siempre dentro de una organización (§7.1.4). Es un id opaco, sin clave foránea a `Party` (D-0063). Emiliano lo aprobó así (1a); la relación con `Party` sigue fuera de esta fase (D-0063).
- `titulo`: la lista lo necesita; venía de las listas fijas.
- `i_econ_monto_bruto` y `moneda`: la vista de exposición retenida pide "por riesgo, monto económico bruto estimado" (§13), y la ficha sólo lo tenía en el texto de `i_econ_observacion`.
- `base` y `evidencia` del registro (EMI-17) y `revisado_por_actor` (para poder validar que sólo una persona acepta).
- `id_origen`, `evaluacion_id_origen` y `lote_origen`, para los ids históricos (decisión 1).

**Lo que queda como texto, sin estructura**, porque ninguna pantalla de v1 lo pide como dato: los controles actuales (son hechos en `<f>_observacion`), las personas expuestas (en `i_pers_observacion`, §4.3), la magnitud económica de referencia (en `i_econ_observacion`, §4.2) y la documentación (referencias en `evidencia`).

## 3. Los tres formatos

Las columnas, con tipo, obligatoriedad, condición, valores, regla, severidad, id de regla, origen y uso, están en `contrato/columnas-risks.csv`, `contrato/columnas-action-plan.csv` y `contrato/columnas-risk-transfer.csv`. Las reglas, en `contrato/reglas-validacion.csv`. Acá va la forma.

**Comunes a los tres.** CSV UTF-8, separado por comas, con comillas de RFC 4180 y una fila de encabezado con exactamente las columnas del contrato (RV-ARCH-01 a 04). Fechas `AAAA-MM-DD`, montos decimales con punto, monedas ISO 4217, listas separadas por `;`. Una importación es un lote de los tres archivos: si una regla de rechazo falla, se rechaza el lote entero, porque una referencia rota entre archivos no se puede importar a medias (EMI-17).

### 3.1 `risks.csv`

**Una fila por evaluación.** Separa `Risk` de `Assessment` (§14, "Insumos") sin un cuarto archivo: las columnas de identidad (`risk_id`, `organizacion_id`, `tipo_objeto`, `riesgo_padre_id`, `miembros`, `titulo`, `id_origen`) se repiten en cada evaluación del mismo riesgo y tienen que coincidir (RV-RSK-01). Lo demás es de la evaluación, que no se edita: una corrección es otra fila con `evaluacion_anterior_id` (congelamiento v1, regla 3).

- **Riesgo y sub-riesgo:** una fila por evaluación, con los siete factores.
- **Padre:** una sola fila, sin `evaluacion_id` ni factores; sólo identidad y `riesgo_consecuencia` (la consecuencia concreta común, §1.3.5). Sus hijos lo nombran en `riesgo_padre_id`. Si la fila del padre trae cualquier columna de evaluación, se rechaza (RV-RSK-06).
- **Escenario por causa común:** una fila por evaluación, con factores propios sobre la materialización conjunta y `miembros` (§10.3).
- **Cada factor** (`p`, `i_econ`, `i_pers`, `i_cont`, `i_legal`, `v_cont`, `v_rec`): `<f>_estado`, `<f>_valor`, `<f>_min`, `<f>_max`, `<f>_observacion` y, según la decisión 3, `<f>_base` y `<f>_evidencia`. Vacío nunca dice "no sé" (protocolo §2): un factor desconocido es `unknown` con nota de qué falta, y `no_aplica` existe sólo en V-recuperación (§5.5.2).
- **Un riesgo identificado y todavía sin evaluar** se importa con los siete factores `unknown` y su `necesidad_validacion`. La metodología ya lo resuelve: con P `unknown` es no evaluable y entra a la cola de validación (§9.3.1, §9.5). No hace falta un estado nuevo.
- **Historial:** `tipo_evaluacion`, `evaluacion_anterior_id`, `motivo` (D22), `accion_id`, `fecha`, `version_metodologia`, `evaluador` y `actor`.
- **Procedencia y revisión:** `base` y `evidencia` del registro (EMI-17), `uncertainty` y su nota, `review_status`, `revisado_por`, `revisado_por_actor` y `fecha_revision`.

**Derivados.** No hay ninguna columna derivada. `i_efectivo`, `V_d`, `C_raw`, banda, banderas, techo, dimensión determinante y `prioridad_provisional` los calcula Risk OS con las funciones puras de la v1 (§14, "Insumos"; `regresion-ejecutable/metodologia.ts` es la referencia). Si un archivo trae una, se rechaza por columna desconocida (RV-ARCH-04). `C_raw` no se edita a mano en ningún punto (decisión 6).

### 3.2 `action-plan.csv`

**Un registro por acción y riesgo.** Una acción real que alcanza a dos riesgos son dos registros (EMI-17). Dos tipos de registro:

- **`accion`:** `factor_objetivo` (uno o más; V siempre como `v_cont` o `v_rec`, así que el aspecto no puede faltar, §11.2.6), `mecanismo_causal` (D16), `cambio_esperado` como hipótesis, `estado` (`planificada`, `en_curso`, `cumplida`, `cancelada`), `fecha_cumplida` y `evidencia_ejecucion` (`cumplida` = ejecución verificada, D25). La eficacia es un campo aparte: `efecto` (`efecto_total`, `efecto_parcial`, `sin_efecto_medible`), `efecto_nota` y `evaluacion_efecto_id`, que apunta a la reevaluación de `risks.csv` con `motivo = accion_ejecutada` que observó el efecto.
- **`decision_tratamiento`:** la "decisión explícita de la dirección" de §8.2 (`tratar`, `aceptar` con fundamento, `transferir`), con `fecha_proxima_revision`. Va acá porque la vista de seguridad pide "acción en curso o decisión", y separarlas en dos archivos obligaría a cruzarlos para la misma alerta.

**`cambio_esperado` nunca escribe un factor** (D16). No es una regla de importación sino de diseño: la importación no tiene ninguna operación que lea esa columna para cambiar `risks.csv`.

### 3.3 `risk-transfer.csv`

**Un registro por cobertura y riesgo.** Una póliza que cubre tres riesgos son tres registros con la misma `poliza_ref` (EMI-17); si difieren en límite, moneda o vigencia, avisa (RV-TRF-07). `poliza_ref` es una referencia opaca, sin clave foránea a `Policy` de Broker OS (D-0063).

- **`cobertura`:** póliza, cobertura, vigencia, límite, sublímite aplicable y texto de sublímites, deducible (monto y texto, porque hay porcentajes, mínimos y períodos de espera; ver `emi41/fichas/S07/transferencia.md`), exclusiones, exposición retenida estimada y suficiencia (`suficiente`, `parcial`, `insuficiente`, `sin_cobertura`, `no_evaluada`) con nota. Lleva procedencia, incertidumbre y `review_status`, porque EMI-17 los pide para la "evaluación de transferencia".
- **`evento`:** firma, ampliación, renovación, consumo del límite, vencimiento o cancelación, con fecha y monto, apuntando a su cobertura con `transferencia_ref`. Es el historial propio de la póliza de §11.3. **No crea una reevaluación del riesgo ni usa `motivo`** (D17, dictamen PA 25).

**Ninguna columna de `risk-transfer.csv` entra al cálculo de criticidad** (D17; plan, Fase 15). La 15b lo convierte en test: cambiar cualquier valor de este archivo no cambia ningún derivado de ningún riesgo.

### 3.4 Identificadores y relaciones

```
organizacion_id (opaco)
   └─ Risk (risk_id) ── tipo_objeto: riesgo | padre | sub_riesgo | escenario
        ├─ sub_riesgo.riesgo_padre_id → padre (misma organización)
        ├─ escenario.miembros → 2+ riesgos o sub-riesgos (misma organización)
        ├─ Assessment (evaluacion_id) 1..n, salvo el padre (0)
        │     ├─ evaluacion_anterior_id → Assessment del mismo risk_id
        │     └─ accion_id → Action del mismo risk_id, cumplida (motivo accion_ejecutada)
        ├─ Action (accion_id) 0..n   ── evaluacion_efecto_id → Assessment del mismo risk_id
        └─ Transfer (transferencia_id) 0..n
              └─ TransferEvent (evento_id) 0..n, transferencia_ref → Transfer del mismo risk_id
```

No hay relación Action ↔ Transfer (EMI-17). Toda referencia apunta a una fila del mismo lote o a un registro que ya existe en Risk OS; si no existe, se rechaza.

### 3.5 Qué rechaza y qué no es una regla de importación

**Rechazo (55):** formato del archivo y de los ids, ids repetidos, referencias inexistentes o a otro riesgo, identidad inconsistente, padre con factores o con evaluación propia, sub-riesgo sin padre, escenario con menos de dos miembros o con un miembro de otra organización, más de una evaluación inicial por riesgo, historia ramificada, factor sin estado, valor fuera de 1–5 o fuera de su rango, `no_aplica` fuera de V-recuperación, factor `unknown` sin nota de qué falta, `unknown` sin `necesidad_validacion`, base fuera del enum, evidencia vacía (la ausencia se escribe `sin_evidencia`), `uncertainty` medium o high sin nota, aceptación sin una persona, `accion_ejecutada` sin acción cumplida, acción sin factor o sin mecanismo, `cumplida` sin evidencia, eficacia sin reevaluación, decisión de tratamiento sin fecha de revisión, evento de póliza sin cobertura.

**Aviso (16):** fechas desordenadas, versión de metodología anterior a la v1 candidate, causa, consecuencia, justificación u observación vacías, no evaluable sin motivo, base del registro más fuerte que la de sus factores, padre sin hijos, porcentajes de confianza en una nota, falta de monto bruto con transferencia, acción sobre un escenario, varios factores sin un mecanismo por factor, `safety_critical` sin acción en curso ni decisión vigente, póliza con datos distintos entre riesgos, suficiencia sin nota y cobertura vencida sin evento.

Dos criterios que no son de EMI-17 al pie de la letra, para que los veas:
- **Algunas reglas semánticas rechazan** porque hay una regla específica (EMI-17 lo permite: "salvo regla específica"): `unknown` sin nota (P2, §9.2), `uncertainty` sin nota (EMI-17 mismo), aceptación por IA (EMI-17 mismo), `accion_ejecutada` sin acción cumplida (D18).
- **Lo que la importación no puede violar, no es regla de importación.** "Sub-riesgo en el ranking", "el escenario modifica a sus miembros", "el padre tiene score" y "la transferencia cambia la criticidad" no se pueden escribir en estos archivos, porque no hay columnas de ranking, de score ni de cálculo. Son invariantes del cálculo (§14, propiedades 2 y 5; D17) y la 15b los escribe como tests, no como casos inválidos.

## 4. Modelo mínimo del contexto `risk`

Parte de §14, "Insumos". Cada entidad nombra la pantalla u operación de Risk OS v1 que la justifica (T-0021, riesgo de sobremodelar; §18). Nada de esto toca `DOMAIN.md` ni D-0029: vive en el contexto `risk` hasta el cierre de Q4.

| Entidad | Entra | Qué es | Pantalla u operación que la justifica |
|---|---|---|---|
| `Risk` | sí | Identidad estable: organización, tipo de objeto, padre, miembros, título | lista, matriz, escenarios, plan de acción |
| `Assessment` | sí | Evaluación inmutable bajo una versión: historial, procedencia, incertidumbre, revisión, monto bruto | historial, movimiento por dimensión, detalle, revisión |
| `FactorAssessment` | sí, como parte de `Assessment` | Los siete factores: estado, valor, rango, observación y, si se decide, base y evidencia | priorizar, matriz, cola de validación, detalle |
| Resultado calculado | no es entidad | `I efectivo`, `V_d`, `C_raw`, banda, banderas, techo, posición. Se calcula con funciones puras versionadas; se puede guardar para auditoría con la versión de las funciones | lista, matriz, vista de seguridad, cola |
| `Action` | sí | Acción o decisión de tratamiento, con su eficacia | plan de acción, vista de seguridad |
| `ActionEffect` | no | La eficacia son tres columnas de `Action`: una acción cumplida tiene a lo sumo un efecto observado, con la reevaluación que lo midió. Si una acción necesita dos mediciones, son dos reevaluaciones y la segunda corrige con su propio motivo | — |
| `Transfer` | sí | Cobertura de una póliza sobre un riesgo, con suficiencia | transferencia, exposición retenida |
| `TransferEvent` | sí | Historial propio de la póliza (§11.3) | transferencia (historial), límite disponible |
| `Scenario` | no como entidad aparte | Es un `Risk` con `tipo_objeto = escenario` y `miembros`; tiene `Assessment` propio como cualquier riesgo | escenarios agregados |
| `RevisionPendiente` | sí | Lo que abre un cambio de actividad y cierra una persona (§5 de este dossier) | revisión pendiente; cuenta de ciclos |
| `Reordenamiento` | sí | Reordenamiento profesional como discrepancia con causa (decisión 5) | lista (orden profesional visible), disparadores de reapertura |
| `Organización` | no | Sólo `organizacion_id` opaco; sin `Party` (D-0063) | — |
| `Evidencia` | no | Referencias de texto (0..n), como pide EMI-17 | — |
| `Control` (mitigación existente) | no | Los controles son hechos en las observaciones de P y V; ninguna pantalla de v1 los lista aparte | — |

**Los seis conceptos mezclados de `DOMAIN.md` §46:**

| Concepto de §46 | Qué queda con estructura | Qué queda sin estructura |
|---|---|---|
| riesgos | `Risk` y su `Assessment`: tipo, padre, miembros, causa → evento → consecuencia, siete factores | la redacción del riesgo (texto) |
| vulnerabilidades | dos aspectos de V con nivel, rango y estado (`v_cont`, `v_rec`) | qué controles o capacidades sostienen cada nivel (texto en la observación) |
| criticidad | nada guardado como dato: función pura versionada de los factores | — |
| mitigaciones | las que se planifican o ejecutan son `Action` con factor, mecanismo, estado y eficacia | las existentes son observaciones de P y V, no entidades |
| plan de acción | `Action` (acciones y decisiones de tratamiento) | responsable, presupuesto y fecha objetivo: ninguna pantalla nombrada los pide (ver `lista-casos-historicos.md` C10) |
| transferencia | `Transfer` y `TransferEvent`, con montos, vigencia y suficiencia | texto de sublímites, deducibles y exclusiones |

El "feed de actividad" de §76 no es una entidad: sale de unir `Assessment`, los cambios de estado de `Action`, `TransferEvent` y `RevisionPendiente` por fecha.

## 5. Ciclo de actualización y revisión pendiente

Sale de §11 (D18, D22), protocolo §6 y la restricción de T-0021 "sin recálculo automático".

**Revisión pendiente.** Un registro de un riesgo que dice "algo cambió y hay que mirar si los factores cambiaron". Lo abre un cambio de actividad; lo cierra una persona. Nunca recalcula consecuencias ni escribe un factor.

| Cambio de actividad | ¿Abre revisión del riesgo? | Motivo esperado de la reevaluación | Fuente |
|---|---|---|---|
| Una acción pasa a `cumplida` (ejecución verificada) | **Sí** | `accion_ejecutada` | D25, protocolo §6.3.2 |
| Acción creada, planificada, en curso o cancelada | No | — | D18 (no baja por planificar) |
| Información nueva sobre el riesgo (evidencia agregada, un hecho que la ficha no registraba) | **Sí** | `informacion_nueva` o `correccion_evaluacion` | D18, §11.1 |
| Cambio de contexto registrado (entorno, exposición, terceros, regulación) | **Sí** | `cambio_contexto` | D18, §11.1 |
| Versión nueva de la metodología | **Sí, sólo en los riesgos cuyo resultado podría cambiar** (los que marque la regresión) | `cambio_version_metodologia` | protocolo §6.4 |
| Evento de póliza (firma, ampliación, renovación, consumo, vencimiento) | **No** | — (D17: no hay reevaluación ni `motivo`) | §11.3 |
| Reordenamiento profesional | No: queda como discrepancia | — | decisión 5 |
| Reevaluación propuesta por IA | No la cierra | — | EMI-17 |

**Qué la cierra.** Una de dos, siempre por una persona:
1. **Reevaluación aceptada:** una evaluación nueva del riesgo, con el motivo de la tabla, queda `accepted` por una persona. Si la reevaluación queda `rejected` o `needs_revision`, la revisión sigue abierta.
2. **Sin cambio:** una persona registra que los factores no cambian, con fundamento. No se crea evaluación nueva: el riesgo no cambió.

**Ciclo de actualización = una revisión pendiente desde que se abre hasta que se cierra.** Deja en el historial: el id de la revisión, el riesgo, el disparador (tipo y referencia: la acción, el evento, la evidencia o la versión), la fecha de apertura, la fecha de cierre, quién la cerró, el resultado (`reevaluacion_aceptada` o `sin_cambio`) y, si hubo, la evaluación que la cerró. "Al menos diez ciclos" se cuenta así: diez revisiones cerradas, cada una con su disparador y su cierre trazables en el historial. Las abiertas no cuentan.

Los eventos de póliza tienen su propio historial y no son ciclos del riesgo (decisión 9 abre la otra opción).

## 6. `C_raw`: presentación y reordenamiento profesional

**Presentación.** `C_raw` no está en ningún archivo de importación. Aparece sólo en salidas calculadas (pantallas, exports), y ahí:
- **Nunca viaja solo.** Toda fila de salida que tenga `c_raw` trae en la misma fila el vector completo (`p`, las cuatro dimensiones de I, `v_cont`, `v_rec`, con estado y valor), `consecuencia_extrema` y `safety_critical`. La 15b lo escribe como test del export de salida.
- **Operaciones que no se permiten:** sumar, promediar, restar o dividir `C_raw`; mostrar diferencias o cocientes entre riesgos; agregarlo por organización o cartera; compararlo entre organizaciones (§7.1.4); usar cortes distintos de los de banda. Se permite sólo ordenar dentro de una organización (D10) y asignar banda.

**Reordenamiento profesional.** Decidido (5a): un **registro aparte del contexto `risk`**, creado en Risk OS y no en los CSV de importación, por tres razones: es sobre un par o una posición, no sobre un riesgo solo; tiene autor y fecha propios; y tiene que conservar el orden calculado de ese momento para que el uso alimente los disparadores de reapertura (dossier de la Fase 13, §5). Una columna de `risks.csv` no puede decir "R05 va debajo de R01".

Campos mínimos:

| Campo | Para qué |
|---|---|
| `reordenamiento_id`, `organizacion_id`, `fecha` | identidad; el orden es siempre dentro de una organización |
| `autor`, `autor_actor` (sólo `human`) | lo hace un profesional |
| `tipo`: `par` \| `posicion` \| `banda` | el disparador 3 de la Fase 13 necesita la banda que daría el profesional |
| `risk_id_sube`, `risk_id_baja` (par); `risk_id` y `posicion_profesional` (posición); `risk_id` y `banda_profesional` (banda) | qué se reordenó |
| `evaluaciones_vigentes` | los `evaluacion_id` vigentes de los riesgos involucrados: el orden calculado se puede reproducir |
| `orden_calculado` | posiciones y bandas de Risk OS en ese momento |
| `causa` | las categorías del registro de discrepancias de la Fase 13: `desacuerdo_de_criterio_profesional`, `regla_ambigua`, `ficha_insuficiente`, `lectura_distinta_del_mismo_hecho`, `limite_de_la_combinacion`, `error_de_aplicacion`, `sin_causa` |
| `fundamento` | texto |
| `patron`: `familia_s06` \| `safety_bajo_economico` \| `otro` | disparadores 2 y 4 |
| `orden_previo_escrito` (referencia con fecha anterior al primer resultado que vio el profesional) | disparador 1 (tercer caso de D14) |

El reordenamiento cambia el orden que se muestra, con el calculado visible al lado; no cambia factores, `C_raw` ni banda. Si los casos históricos traen un orden profesional escrito (`lista-casos-historicos.md` B7), habría que agregar un cuarto archivo de importación: lo dejo como opción en la decisión 5.

## 7. Empresas sintéticas y acciones nuevas

**Criterios** (`fase-14/cobertura-efectiva.csv`, `fase-14/dataset/indice-empresas.csv`, `indice-riesgos.csv` e `inventario_campos.py`). Cada uno tiene que quedar cubierto por al menos una empresa:

| # | Criterio | Por qué lo necesita la aceptación de Risk OS |
|---:|---|---|
| K1 | Las siete familias de actividad | rubros (T-0021) |
| K2 | Tamaño: micro o PyME (menos de 50 personas), mediana y grande (más de 1.000) | tamaños (T-0021) |
| K3 | Resultado operativo negativo | ancla económica sin RO positivo (§4.2) |
| K4 | Padre con sub-riesgos, en una banda alta y en una baja | §1.4; propiedad 2 |
| K5 | Escenario por causa común con transferencia propia (sublímite del escenario) | §10; D17 |
| K6 | No evaluable por P `unknown` y no evaluable por la cota de una dimensión | §9.3.1 y §9.3.2 |
| K7 | Historia de tres fichas (inicial, `cambio_version_metodologia`, `correccion_evaluacion`) | historial; movimiento por dimensión |
| K8 | Propuesta de IA sobre la ficha de otro evaluador, aceptada por una persona | decisión 8; EMI-17 |
| K9 | Dos evaluadores sobre el mismo riesgo | decisión 8 |
| K10 | Revisión profesional con reordenamiento | decisión 5 |
| K11 | Varias pólizas sobre varios riesgos, con sublímites, deducibles y exclusiones | `risk-transfer.csv` |
| K12 | Siniestros que consumieron límite (eventos de póliza) | §11.3 |
| K13 | Seguro obligatorio cuyo pago no baja I (CH-099) | D17 |
| K14 | `I efectivo ≥ n`, peor creíble fuera del rango, `v_rec = no_aplica`, `safety_critical`, `consecuencia_extrema` | banderas, cola, detalle |

**Aprobado (10a): 8 empresas, 59 objetos** (50 riesgos, 2 padres, 6 sub-riesgos, 1 escenario).

| Empresa | Familia, tamaño | Criterios que sólo cubre ella o que cubre mejor |
|---|---|---|
| S06 Frío Mendoza | agro; 22 personas | K10 (piloto de la Fase 12: R05 sobre R01 y R04, rechazado por el revisor); K2 micro |
| S07 Cobre Cordillerano | minería; 2.300 personas | K5 (S07-E01 con sublímite de terremoto propio); K11 (cuatro pólizas sobre nueve objetos); K2 grande; K7 (S07-R07) |
| S05 Constructora Cordillera | industria; 450 personas | K4 en Crítica (S05-P01, tres sub-riesgos); K6 por cota (S05-R09); K14 |
| S29 CuyoPay | tecnología; 600 personas | K1 (tecnología); K4 en Baja (S29-P01); K9 |
| S28 Supermercados Regionales | comercio; 1.500 personas | K1 (comercio); K7 completa (S28-R02: inicial, versión y corrección); K9 |
| S32 Servicios Petroleros Patagonia | energía; 400 personas | K1 (energía); K6 por P (S32-R06, el único P `unknown`); K7 en tres riesgos; K12 (siniestros 2023 y 2024 con indemnización) |
| S36 Colegio Privado Andino | servicios a personas; 130 personas | K1 (servicios); K3 (RO negativo); K14 (`I efectivo ≥ n`, `unknown`); K9 |
| S15 Viñedos del Valle | agro; PyME | K8 (EV-11-0064, propuesta del agente sobre la ficha de Emiliano, aceptada, no evaluable); K13 (lo cubierto por la ART queda en I bruto) |

**Por qué 8 alcanzan.** Con estas ocho están cubiertos los 14 criterios, y sacar cualquiera deja uno sin cubrir: S06 es la única con reordenamiento profesional; S07, el único escenario con transferencia propia; S05, el único padre en Crítica; S29, la de tecnología con el padre en Baja (S30 también lo tiene, pero la Fase 14 la registró sin aporte propio); S28, S32 y S36, las de sus familias con historia de tres fichas, P `unknown` y RO negativo; S15, la única propuesta aceptada no evaluable con ART. Agregar otra repetiría lo que ya está; la Fase 14 mostró que S01, S25 y S30 no aportan nada propio. Las 29 que quedan afuera siguen en el dataset: esto elige qué va a los CSV, no qué se conserva.

**Lo que EMI-41 no tiene y la 15b agrega como casos válidos nuevos**, marcados con `lote_origen = T-0021/15b` para que no se confundan con el dataset:
- Un padre con un hijo no evaluable (`prioridad_provisional`) y un padre con dos hijos empatados (§1.4.4-5).
- Un riesgo identificado sin evaluar (siete `unknown`).
- Una reevaluación por `informacion_nueva` y una por `cambio_contexto`.
- **10 registros de `action-plan.csv`** (no hay ninguno en el dataset):

| # | Para qué | Registros |
|---:|---|---:|
| 1 | **Caso consistente entre los tres archivos (EMI-16):** S07-R06, con acción cumplida, reevaluación `accion_ejecutada`, `efecto_parcial` y la cobertura de avería de maquinaria con su sublímite. Es además el ciclo con `accion_ejecutada` y eficacia parcial | 1 |
| 2 | Acción cumplida con `efecto_total` y su reevaluación | 1 |
| 3 | Acción cumplida con `sin_efecto_medible` y su reevaluación | 1 |
| 4 | Acción en curso y acción planificada sobre un riesgo `safety_critical`: la planificada no abre revisión ni baja nada | 2 |
| 5 | Decisión de tratamiento `aceptar` con fundamento y fecha de revisión sobre un riesgo `safety_critical` | 1 |
| 6 | Acción con dos factores y un mecanismo distinto para cada uno (D16) | 1 |
| 7 | Una acción real sobre dos riesgos, como dos registros (EMI-17) | 2 |
| 8 | Acción cancelada | 1 |

Más **55 casos inválidos**, uno por regla de rechazo, cada uno con el error esperado. Son variantes de un lote válido con una sola mutación; no son empresas nuevas.

## 8. Export ciego (especificación para la 15b)

Pedido de Emiliano en la Fase 14 (punto 4). La 15b escribe `v0/fase-15/export_ciego.py`.

- **Entrada:** la lista de empresas y la versión de la metodología que se prueba. **Salida:** una carpeta **fuera del repositorio** (el script se niega a escribir dentro del checkout), con un `MANIFIESTO.txt` que lista cada archivo con su SHA-256 y su origen.
- **Qué entra (lista blanca, modo 1 del manifiesto):** por cada empresa, `v0/emi41/fichas/SNN/empresa.md`, `transferencia.md` y las fichas de sus riesgos, copiadas sin cambios; una lista con sólo `risk_id`, `empresa`, `tipo_objeto`, `riesgo_padre_id`, `miembros` y `titulo`, sacada de `lista-riesgos-*.csv`; la metodología y el protocolo de la versión que se prueba; la plantilla vacía (sólo encabezado). Nada que no esté en la lista blanca.
- **Qué no puede aparecer nunca:** nada de `cerrado/`; ninguna evaluación (`fase-8/` a `fase-15/`); `regresion-*.csv`; los índices de la Fase 14; `cobertura-empresas.md` y `matriz-cobertura.csv`; ids de evaluación; la columna `contrastes_intencion`; columnas de resultados o de fases posteriores.
- **Cómo se comprueba que está limpio**, y el script falla si algo no pasa:
  1. Cada archivo copiado tiene la misma huella que su origen, y su ruta de origen está en la lista blanca.
  2. Ningún archivo contiene un id de evaluación de los siete patrones del inventario (`EV-NNNN`, `EV-8-<familia>-NNNN`, `EV-11-NNNN`, `EV-12-PILOTO-…`). Las referencias de evidencia de las fichas de información (`EV-S01-010`) no coinciden con esos patrones y están permitidas.
  3. Ningún CSV tiene en su encabezado una columna de resultado (`c_raw`, `banda`, `techo_plausible`, `evaluable`, `safety_critical`, `consecuencia_extrema`, `review_status`, `v1_*`, `contrastes_intencion`).
  4. **Contaminación por la metodología:** la v1 cita riesgos de 19 empresas (S06, S22, S33, S31, S02 y otras), algunos con resultados (por ejemplo, el orden de S06-R01, R04 y R05). El script lista los `risk_id` de las empresas exportadas que aparecen en la metodología o el protocolo exportados y falla si hay alguno, salvo que se le pase explícitamente que esa contaminación se acepta, y entonces la escribe en el manifiesto (como la Fase 8 aceptó la de `cobertura-empresas.md`).
- **Dónde queda:** el script en `v0/fase-15/`; los exports, nunca en el repo.

## 9. Casos históricos

`lista-casos-historicos.md` tiene 44 preguntas de estructura en cinco bloques (organización y riesgos, historia y procedencia, plan de acción, transferencia, cierre), con una columna por caso. No leí los casos ni pido sus valores (R-19). Con tus respuestas sé si el contrato necesita algún ajuste antes de la 15b.

## 10. Guía de redacción del evento y CH-113/CH-114

**Guía.** EV-33 a EV-42, la frontera I/V de S06-R05 y la recuperación parcial probada frente a informal (§5.4) son guía de evaluación, no forma de datos: §18 dice que la guía "no tiene pantalla". En el contrato sólo cabe `riesgo_evento` obligatorio (RV-EVA-09). Decidido (12a): un anexo aparte, que la 15b escribe como índice de esos casos apuntando a las reglas que ya los resuelven, sin reglas nuevas. Lo que no se pueda explicar con una regla existente va a EMI-43.

**CH-113 y CH-114.** Ninguna decisión de esta fase cambia una regla de la metodología: son decisiones de contrato y viven en `decisiones-15a.md` y en el spike. Si no hay filas propias de la Fase 15 para el changelog, mover sólo CH-113 y CH-114 cambiaría la huella del changelog sin otra razón que la regla 4, y vos dijiste que pasan "cuando se abra la siguiente versión".

---

## Para decidir

> **Respondido el 2026-10-14 a las 16:15:39 UTC.** Las respuestas de Emiliano están en `decisiones-15a.md`. Lo de abajo queda como se preguntó; los conteos de la opción 10a (54 casos inválidos) son los de antes del cambio del punto 8.

Para cada punto: la opción que elijas, o "recomendada". Con tus respuestas ajusto `contrato/` y el borrador del spike y no agrego nada que no decidas.

**1. Ids.**
- a. **Globales con prefijo de entidad y ULID** (`RSK-`, `EVA-`, `ACC-`, `TRF-`, `EVT-`), generados por quien escribe el archivo, sin coordinación central. Los ids históricos no se renombran: van a `id_origen` / `evaluacion_id_origen` con `lote_origen`, y el par tiene que ser único. La 15b escribe un `mapa-ids.csv` del dataset; la clave (`evaluacion_id`, `risk_id`) del manifiesto sigue valiendo para el experimento. `organizacion_id` opaco, como propuesta (D-0063). Contra: los ids no se leen a simple vista; se lee `id_origen` **(recomendada)**.
- b. Secuenciales globales que asigna Risk OS al importar, con ids locales del lote para relacionar los tres archivos. Se leen mejor, pero mientras dura la importación la clave es (lote, id local): es una clave compuesta escondida.
- c. Clave compuesta permanente (`lote_origen`, id). Va contra tu preferencia.

**2. `base = —`.**
- a. **Dato faltante**: las 15 son filas de la ficha de información que registran que un dato no existe; no afirman nada y no tienen base. En los tres CSV, `base` y `<f>_base` sólo aceptan el enum (RV-PRO-01, RV-PRO-05) y la ausencia se escribe `evidencia = sin_evidencia` y en la nota de qué falta. No cambia el enum de EMI-17. Las 15, una por una, en `base-guion.csv` **(recomendada)**.
- b. Mapearlas a `assumed`. No lo recomiendo: nadie supuso un valor, y debilitaría la procedencia del factor sin motivo.
- c. Agregar un valor al enum (`sin_base` u otro). Es un cambio de EMI-17; si lo elegís, lo dejo escrito para que actualices el issue.

**3. Procedencia por factor frente a por registro.**
- a. Sólo por registro (EMI-17 literal). El detalle muestra una base por evaluación. Costo histórico bajo. EMI-41 pierde su procedencia por factor al importarse (queda en los archivos del experimento).
- b. **Por registro obligatoria y por factor opcional.** El detalle muestra la del factor cuando está. Costo histórico nulo; EMI-41 entra completa (100% de los factores con base). Aviso si la base del registro es más fuerte que la del factor más débil **(recomendada)**.
- c. Por factor obligatoria en cada factor con valor. Costo alto en los casos históricos y riesgo de llenar `assumed` por llenar (P8). Va más allá de EMI-17 ("no se requiere trazabilidad por campo en v1").

**4. `review_status`.**
- a. **Por registro en los tres archivos**: cada evaluación, cada acción y cada cobertura (la evaluación de transferencia de EMI-17); los eventos de póliza no lo llevan, porque son hechos de un documento con su procedencia. Valores de EMI-17. Lo cambia sólo una persona desde Risk OS; un archivo puede traer otro estado sólo con `revisado_por`, `revisado_por_actor` y `fecha_revision`, y `accepted` sólo con `revisado_por_actor = human`. Lo de IA nace `pending` **(recomendada)**.
- b. Sólo en las evaluaciones de `risks.csv`.
- c. Por riesgo, no por evaluación. Contradice protocolo §6.2 (aplica al evento, no al riesgo).

**5. Presentación de `C_raw` y reordenamiento.**
- a. **`C_raw` sólo en salidas calculadas**, siempre con el vector y las dos banderas en la misma fila, sin operaciones aritméticas ni comparaciones entre organizaciones. **Reordenamiento como registro aparte creado en Risk OS** (campos de §6), con la causa del registro de discrepancias de la Fase 13 y los campos que alimentan los cuatro disparadores **(recomendada)**.
- b. Como a, más un cuarto archivo de importación `reordenamientos.csv`, si los casos históricos traen un orden profesional escrito.
- c. Reordenamiento como columna `posicion_profesional` de `risks.csv`. No expresa pares ni conserva el orden calculado del momento.

**6. Derivados.**
- a. **No se importan nunca**; Risk OS los calcula con las funciones de la v1 y puede guardarlos para auditoría con la versión de las funciones. Un archivo que los traiga se rechaza **(recomendada)**.
- b. Se importan y se verifican contra el cálculo; si no coinciden, rechazo. Sirve para migrar el experimento, pero eso la 15b lo puede probar como test sin meterlo en el contrato.
- c. Se aceptan y se ignoran (aviso).

**7. Padres, sub-riesgos y escenarios.**
- a. **Padre: una fila sin evaluación ni factores** (rechazo si los trae), con su consecuencia común; hijos con `riesgo_padre_id`. **Escenario: un riesgo con evaluación propia y `miembros`**, que nunca escribe en sus miembros. Acciones y transferencias, en los hijos y no en el padre **(recomendada)**.
- b. Padre implícito: sin fila, sólo un código de grupo en los hijos. Pierde el título y la consecuencia común.
- c. Padres y escenarios en archivos propios. Agrega archivos que EMI-16 no nombra.

**8. Evaluación vigente.**
- a. **Una sola historia por riesgo**: a lo sumo una evaluación inicial (rechazo), cada reevaluación apunta a una evaluación del mismo riesgo, aviso si la historia se ramifica. **Vigente = la última `accepted`**; si no hay ninguna, la última no rechazada, mostrada como "pendiente de revisión". Una propuesta sobre la ficha de otro evaluador (EV-11-0063/0064) es una reevaluación más de la cadena y es vigente sólo cuando una persona la acepta. Las evaluaciones paralelas del experimento (agente y Emiliano sobre el mismo riesgo) no se importan juntas: la 15b elige una por riesgo **(recomendada)**.
- b. Se permiten evaluaciones paralelas; vigente por prioridad: aceptada, después humana sobre IA, después la más reciente.
- c. El archivo marca explícitamente la vigente (`vigente = true`, una por riesgo).

**9. Ciclo y revisión pendiente.**
- a. **Como en §5**: abren la acción cumplida, la información nueva, el cambio de contexto y el cambio de versión (sólo donde el resultado podría cambiar); no abren la acción planificada ni el evento de póliza; cierra una persona con reevaluación aceptada o "sin cambio" con fundamento. **Ciclo = revisión cerrada**; diez ciclos = diez revisiones cerradas con disparador y cierre trazables **(recomendada)**.
- b. Como a, pero los eventos de póliza abren una revisión de la suficiencia de esa cobertura, y esas revisiones también cuentan como ciclos.

**10. Empresas sintéticas y acciones nuevas.**
- a. **8 empresas (S05, S06, S07, S15, S28, S29, S32, S36), 10 registros de acción nuevos, los casos válidos nuevos de §7 y 54 casos inválidos** **(recomendada)**.
- b. Cambiar la lista: decime cuáles salen o entran y reviso que los criterios sigan cubiertos.

**11. Export ciego.**
- a. **Como en §8**: lista blanca, fuera del repo, cuatro comprobaciones y falla ante contaminación no aceptada **(recomendada)**.
- b. Como a, pero sin la comprobación 4 (contaminación por la metodología).

**12. Guía de redacción del evento.**
- a. **Anexo aparte, como índice de casos que apunta a reglas existentes; lo nuevo va a EMI-43** **(recomendada)**.
- b. Una sección del borrador del spike.
- c. Nada en la Fase 15: todo a EMI-43.

**13. CH-113 y CH-114.**
- a. **Siguen esperando a la próxima versión**, como dijiste en la Fase 14; esta fase no agrega filas al changelog **(recomendada)**.
- b. Entran ahora por la regla 4 de `v1/congelamiento-v1.md`, y registro la huella nueva del changelog.

**14. Aprobar los tres formatos con estas decisiones.**
- a. **Sí**: con tus respuestas ajusto `contrato/` y el spike, y la 15b construye los CSV sintéticos y el validador **(recomendada si elegís las recomendadas)**.
- b. Sí, con cambios: decime cuáles.
- c. No todavía.

Además, cuando puedas, completá `lista-casos-historicos.md`. No bloquea la 15b, pero el spike no cierra sin esa confirmación (T-0021, Verification).
