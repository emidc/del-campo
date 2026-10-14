# Spike T-0021 — Formatos de importación, modelo mínimo y datos sintéticos de Risk OS

- **Tarea:** `TASKS/T-0021-spike-formatos-y-modelo-risk-os.md`
- **Fecha:** 2026-10-14
- **Estado:** **aprobado por el owner** el 2026-10-14 (`SPIKES/T-0021/v0/fase-15/decisiones-15b.md`), salvo la comprobación de casos históricos, que espera su respuesta en `SPIKES/T-0021/v0/fase-15/lista-casos-historicos.md`. Lo escribió la Fase 15a y lo completó la 15b. Las decisiones de los formatos están en `SPIKES/T-0021/v0/fase-15/decisiones-15a.md`. Los CSV sintéticos, el validador, los casos inválidos y el export ciego están en `SPIKES/T-0021/v0/fase-15/dossier-fase-15b.md`.
- **Decisiones que alimenta:** el contrato de Risk OS (análogo a `SLICES/VS01.md`) con su aceptación de Q4, y la primera tarea de implementación que crea `contexts/risk` bajo D-0063. No resuelve D-0029 ni cambia `DOMAIN.md`.
- **Fuentes:** la metodología de criticidad v1 (`SPIKES/T-0021/v1/metodologia-v1.md`, congelada en `v1/congelamiento-v1.md`), EMI-16 y EMI-17 en Linear (leídos el 2026-10-14), el plan de EMI-15 + EMI-41 (`SPIKES/T-0021/fuentes/plan-emi15-emi41.md`, Fase 15) y el dataset sintético de EMI-41 (`SPIKES/T-0021/v0/fase-14/dataset/manifiesto.md`). Ningún agente leyó casos históricos reales (R-19).

## Comprobaciones de T-0021

Aprobadas por el owner el 2026-10-14 (`v0/fase-15/decisiones-15b.md`):

- [x] Cada columna de los tres formatos tiene tipo, obligatoriedad y regla de validación, y cada relación entre archivos tiene su identificador.
- [x] Los CSV sintéticos cumplen los formatos, e incluyen al menos un caso inválido por regla de rechazo, con el error esperado escrito.
- [x] El número de empresas sintéticas está justificado por criterios de cobertura explícitos, no elegido de antemano.
- [ ] El owner confirmó por escrito que los cinco casos históricos se pueden expresar en los formatos, o qué ajuste necesitan, sin exponer sus valores. *(Espera la respuesta en `v0/fase-15/lista-casos-historicos.md`.)*
- [x] Está definido qué es un ciclo de actualización y qué evidencia deja cada ciclo en el historial.
- [x] Está escrito qué cambio de actividad abre una revisión pendiente y qué la cierra.

## Resumen y recomendación

**Recomendación: tres archivos sin columnas derivadas, con ids globales y la identidad del riesgo separada de su evaluación.**

- **`risks.csv`** tiene una fila por evaluación. La identidad del riesgo (organización, tipo de objeto, padre, miembros, título) se repite en cada evaluación y se valida. El padre va en una fila sin evaluación ni factores. Cada uno de los siete factores lleva estado (`known`, `unknown`, `no_aplica`), valor, rango y observación.
- **`action-plan.csv`** tiene un registro por acción y riesgo, más las decisiones de tratamiento que pide la vista de seguridad.
- **`risk-transfer.csv`** tiene un registro por cobertura y riesgo, más los eventos de póliza como filas propias. Ninguna de sus columnas entra al cálculo de criticidad.
- **`C_raw`, banda, banderas, techo e `I efectivo` no se importan:** los calculan funciones puras versionadas. `C_raw` aparece sólo en salidas, siempre junto al vector de factores y las banderas, porque no es una medida cardinal (decisión del owner, 2026-10-14).

Las columnas están en `SPIKES/T-0021/v0/fase-15/contrato/` y no se copian acá. Hay 71 reglas de validación: 55 de rechazo y 16 avisos. El owner aprobó 8 empresas sintéticas.

**Decidido por el owner el 2026-10-14** (`v0/fase-15/decisiones-15a.md`): las catorce decisiones de contrato, todas con la opción recomendada salvo la evaluación vigente, donde una historia ramificada pasa de aviso a rechazo porque en v1 la historia es una cadena lineal.

## Los tres formatos

> Comprobación de T-0021: *cada columna de los tres formatos tiene tipo, obligatoriedad y regla de validación, y cada relación entre archivos tiene su identificador.*

**Lo que ya está.**

| Archivo | Columnas | Contrato |
|---|---:|---|
| `risks.csv` | 84 | `v0/fase-15/contrato/columnas-risks.csv` |
| `action-plan.csv` | 26 | `v0/fase-15/contrato/columnas-action-plan.csv` |
| `risk-transfer.csv` | 35 | `v0/fase-15/contrato/columnas-risk-transfer.csv` |
| Reglas | 71 | `v0/fase-15/contrato/reglas-validacion.csv` |

Cada columna trae tipo, obligatoriedad, condición, valores, regla, severidad, id de regla, origen y la pantalla u operación de Risk OS v1 que la usa. Toda relación entre archivos tiene su id: `risk_id`, `evaluacion_id`, `accion_id`, `transferencia_id` y `evento_id`. Las relaciones y lo que rechaza la importación están en el dossier, §3.4 y §3.5. Las 89 columnas de la ficha del experimento están mapeadas en `v0/fase-15/mapeo-ficha-a-contrato.csv`: 56 entran, 12 son derivadas, 20 son sólo del experimento y una no tiene uso en v1.

**Qué falta.** Nada para los formatos: las decisiones 1 a 8 están aplicadas en `contrato/` y cada columna que depende de una cita la decisión en `condicion` u `origen`. Los ids son globales con prefijo de entidad y ULID, con el histórico en `id_origen` y `lote_origen` (1a). La procedencia por factor es opcional (3b). `review_status` va por registro en evaluaciones, acciones y coberturas (4a). Los derivados se rechazan (6a). El padre no tiene evaluación (7a). La historia es una cadena lineal y la vigente es la última `accepted` (8).

**Respuesta a la comprobación:** sí. El validador de la 15b lee las columnas, los enums y los textos de error de `contrato/`, y cada referencia entre archivos tiene su regla y su caso inválido (RV-EVA-02, RV-EVA-05, RV-ACC-01, RV-ACC-08, RV-TRF-01 y RV-TRF-04).

## Modelo mínimo del contexto `risk`

**Lo que ya está** (dossier §4): `Risk`, `Assessment` con sus siete `FactorAssessment`, `Action`, `Transfer`, `TransferEvent`, `RevisionPendiente` y `Reordenamiento`. Cada una se justifica con una pantalla u operación de v1.

No entran como entidades:
- `ActionEffect`: tres columnas de `Action`.
- `Scenario`: un `Risk` con `tipo_objeto = escenario`.
- El resultado calculado: es una función.
- La organización: un id opaco sin `Party` (D-0063).
- Los controles existentes: texto en las observaciones de P y V.

Para cada uno de los seis conceptos de `DOMAIN.md` §46, el dossier dice qué queda con estructura y qué queda como texto.

**Qué falta.** Nada: el owner aprobó el modelo con los formatos (decisión 14b). El reordenamiento es un registro de Risk OS, fuera de los CSV de importación en v1 (5a).

## Empresas sintéticas

> Comprobación de T-0021: *el número de empresas sintéticas está justificado por criterios de cobertura explícitos, no elegido de antemano*, y *los CSV sintéticos cumplen los formatos, e incluyen al menos un caso inválido por regla de rechazo, con el error esperado escrito.*

**Lo que ya está** (dossier §7): 14 criterios de cobertura. Cubren rubros, tamaños, resultado operativo negativo, padres, escenarios, no evaluables, historia, propuestas sobre la ficha de otro evaluador, revisión profesional, transferencia y banderas.

El owner aprobó **8 empresas de EMI-41** (decisión 10a): S05, S06, S07, S15, S28, S29, S32 y S36, con 59 objetos. Con ellas los 14 criterios quedan cubiertos, y sacar cualquiera deja uno sin cubrir. Las otras 29 empresas siguen en el dataset.

El dataset no tiene acciones, así que hacen falta **10 registros de acción nuevos**. Uno de ellos es el caso consistente entre los tres archivos que pide EMI-16: S07-R06, con una acción cumplida, su reevaluación con eficacia parcial y la cobertura de avería de maquinaria. Hacen falta además algunos casos válidos que EMI-41 no tiene:
- un padre con un hijo no evaluable;
- hijos empatados;
- un riesgo sin evaluar;
- reevaluaciones por información nueva y por cambio de contexto.

**Lo que hizo la 15b** (`v0/fase-15/dossier-fase-15b.md`, `verificacion-15b.md`):
- **CSV:** `v0/fase-15/sinteticos/` tiene `risks.csv` (84 filas), `action-plan.csv` (10) y `risk-transfer.csv` (33) de las 8 empresas, con los 10 registros de acción y los casos válidos nuevos, todos con `lote_origen = T-0021/15b`, `actor = ai` y `pending`.
- **Validador:** `v0/fase-15/validador/`, escrito desde `contrato/`, no rechaza ninguna fila y deja 103 avisos: fichas en v0.2, falta de monto bruto y riesgos `safety_critical` sin acción.
- **Derivados:** los que Risk OS calcularía desde los CSV coinciden con `regresion-emi41.csv` en los 59 objetos.
- **Casos inválidos:** `v0/fase-15/invalidos/` tiene 55 casos, uno por regla de rechazo, con su error esperado en `errores-esperados.csv`. Un test comprueba que cada uno produce exactamente su error y ningún otro rechazo.
- **Lo que no cupo:** 73 datos de las fichas, listados con campo, ficha y salida propuesta en `v0/fase-15/sinteticos/no-cupo.csv`. El owner decide; ningún formato cambió.

**Respuesta a la comprobación:** sí. Los CSV cumplen los formatos (0 rechazos) y hay un caso inválido por cada una de las 55 reglas de rechazo, con el error esperado escrito. El número de empresas está justificado por los 14 criterios de cobertura (dossier de la 15a, §7). Dos criterios quedan sólo en el dataset del experimento y no en los CSV, por las decisiones 5a y 8a: K9 (dos evaluadores) y K10 (reordenamiento).

## Casos históricos

> Comprobación de T-0021: *el owner confirmó por escrito que los cinco casos históricos se pueden expresar en los formatos, o qué ajuste necesitan, sin exponer sus valores.*

**Lo que ya está:** `v0/fase-15/lista-casos-historicos.md`, con 44 preguntas de estructura que el owner responde por caso (Sí, No o Ajuste), sin valores.

**Qué falta: la respuesta del owner, lista para completar.** Cada fila de `v0/fase-15/lista-casos-historicos.md` se responde con Sí, No o Ajuste para H1 a H5, sin cifras ni nombres. Si pide ajustes, se aplican al contrato antes de cerrar el spike. Esta comprobación queda sin tildar hasta entonces.

## Ciclo de actualización

> Comprobación de T-0021: *está definido qué es un ciclo de actualización y qué evidencia deja cada ciclo en el historial.*

**Lo que ya está** (dossier §5). Un ciclo es una revisión pendiente desde que se abre hasta que la cierra una persona. La cierra una reevaluación aceptada o un "sin cambio" con fundamento.

Cada ciclo deja en el historial:
- el riesgo y el disparador (tipo y referencia);
- las fechas de apertura y de cierre;
- quién la cerró;
- el resultado y, si hubo, la evaluación que la cerró.

"Al menos diez ciclos" son diez revisiones cerradas con disparador y cierre trazables.

**Confirmado por el owner** (decisión 9a): los eventos de póliza conservan su propio historial y no cuentan como ciclos del riesgo.

**Probado en la 15b** (`v0/fase-15/sinteticos/ciclo.ts` y su test):
- En S07-R06, la acción cumplida 15B-A01 abre la revisión, y la reevaluación 15B-R01 (`accion_ejecutada`) la cierra.
- La eficacia queda en la acción, no en la evaluación.
- P toma el valor reevaluado (3), no el esperado (2).
- El evento 15B-E01 no crea reevaluación ni cambia la criticidad.

**Respuesta a la comprobación:** sí, definido en el dossier de la 15a, §5, y ejercitado en los CSV.

## Revisión pendiente

> Comprobación de T-0021: *está escrito qué cambio de actividad abre una revisión pendiente y qué la cierra.*

**Lo que ya está** (dossier §5).

**Abren una revisión pendiente:**
- una acción que pasa a `cumplida`;
- información nueva;
- un cambio de contexto;
- un cambio de versión de la metodología, sólo en los riesgos cuyo resultado podría cambiar.

**No abren:**
- una acción planificada, en curso o cancelada (D18);
- un evento de póliza (D17, §11.3);
- un reordenamiento profesional.

**La cierra** una persona. No hay recálculo automático: el cambio esperado de una acción nunca escribe un factor (D16) y una propuesta de IA no cierra nada (EMI-17).

**Confirmado por el owner** (decisión 9a). En los CSV, la acción planificada 15B-A05 y la cancelada 15B-A10 no abren nada, y las tres cumplidas tienen su revisión cerrada.

**Respuesta a la comprobación:** sí.

## Export para evaluaciones ciegas

No es una comprobación de T-0021, pero el owner lo pidió en el cierre de EMI-41.

**Lo que ya está:** la especificación en el dossier, §8. Trabaja con una lista blanca, escribe fuera del repositorio y hace cuatro comprobaciones de limpieza. Una de ellas detecta la contaminación que trae la propia metodología, que cita riesgos de 19 empresas.

**Lo que hizo la 15b:**
- El script está en `v0/fase-15/export-ciego/export-ciego.ts`, en TypeScript para que su test corra en `pnpm check`.
- Se niega a escribir dentro del repositorio y deja un `MANIFIESTO.txt` con la huella y el origen de cada archivo.
- Falla ante cualquier archivo, columna o id prohibido.
- La metodología v1 cita `EV-11-0063` (de S02-R07), así que cada export la acepta explícitamente en el manifiesto.
- La plantilla vacía está exenta de la comprobación de columnas mientras no tenga filas.
- Hay una muestra de S29 en `/mnt/project-files/T-0021/fase-15b/export-ciego-S29/`; su manifiesto está en `v0/fase-15/export-ciego/muestra-S29-MANIFIESTO.txt`.

## Cómo regenerar y comprobar todo

Desde `SPIKES/T-0021/`:

```bash
node v0/fase-15/sinteticos/generar.ts --check     # los CSV, mapeo-ids y no-cupo, byte por byte
node v0/fase-15/invalidos/generar.ts --check      # base/, los 55 casos y errores-esperados.csv
node v0/fase-15/validador/validar.ts v0/fase-15/sinteticos --corte 2026-10-14
node --test v0/fase-15/*/*.test.ts                # CSV, inválidos, avisos y export ciego
cd regresion-ejecutable && node --run test        # arnés: 211 pass, 0 fail, 2 todo
```

Sin `--check`, los dos `generar.ts` escriben. Desde la raíz del repo, `pnpm check` corre los tests de la 15b (`scripts/tests/t0021-fase-15b.test.mjs`).

## Qué no se probó

- **Casos históricos.** Ningún agente los leyó (R-19). La lista de estructura espera al owner.
- **Una importación real.** No hay importador, base ni `contexts/risk`. El validador y `ciclo.ts` muestran que los CSV alcanzan para lo que v1 promete, pero no son el importador.
- **Ids que ya existen en Risk OS.** El validador acepta `existentes` (ids y riesgos ya importados), pero sólo se probó con lotes completos.
- **Una persona aceptando las filas nuevas.** La aceptación y el rechazo de una reevaluación se simularon en memoria. No se escribió ninguna aceptación.
- **Las 29 empresas que no se aprobaron.** El conversor está escrito para las 8. En el dataset completo hay más procedencia por factor que el contrato rechaza (51 `v_rec_base` en `no_aplica` y 39 evidencias mezcladas) y 5 bases sobre factores sin rango.
- **La suficiencia de la transferencia y la exposición retenida.** Quedaron `no_evaluada` y vacías: las fichas no las traen.

## Qué no se hizo

- No se escribió código en `contexts/`, `apps/` o `packages/`, ni importador, migraciones, UI o worker. Los CSV, el validador y el export de la 15b viven en `SPIKES/T-0021/v0/fase-15/`.
- No se cambió ninguna regla de la metodología ni nada de la tabla de `v1/congelamiento-v1.md`.
- No se leyeron casos históricos reales.
- Linear se leyó sin escribir.
- Ninguna ficha histórica se renombró, se sobrescribió ni se validó en nombre del owner.
- No se agregó ninguna fila al changelog: CH-113 y CH-114 siguen en `v0/fase-14/anexo-changelog-fase-14.md` hasta la próxima versión (decisión 13a).
