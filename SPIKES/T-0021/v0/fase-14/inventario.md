# Inventario e integridad del dataset de EMI-41 · Fase 14

> 2026-10-14 · T-0021, Fase 14 (cierre de EMI-41). RAIZ = `SPIKES/T-0021/` de la repo en `main` después de la PR #72 (Fase 12). Todo lo de abajo sale de `analisis_cierre.py` (esta carpeta), que sólo lee y deja sus mediciones en `analisis-cierre.json`. No se editó ninguna ficha, lista, archivo de diseño, de `cerrado/` ni de la tabla de `v1/congelamiento.md`.

**Fuente usada.** La copia de T-0021 en la carpeta compartida del proyecto está atrasada respecto de la repo: no tiene `v0/fase-12/`, `v0/fase-11/aceptacion-fichas-emiliano-2026-10-13.md` ni `regresion-ejecutable/`, y difieren `fuentes/plan-emi15-emi41.md`, `fuentes/respuestas-emiliano.md`, `prompts/README.md`, `v0/fase-11/reporte-fase-11.md` y los dos CSV de ronda 2. Esta fase usa la repo. `cerrado/emi41/` está en la repo y es idéntico (mismos SHA-256) al de la carpeta compartida.

## 1. Conteos

**37 empresas, 255 objetos en las listas fijas** (240 riesgos, 9 sub-riesgos de 3 padres, 3 escenarios por causa común, 3 padres). **252 fichas con factores propios** (todo menos los padres), igual que la cobertura §6.

| Familia | Empresas | Riesgos | Sub-riesgos | Padres | Escenarios | Con factores |
|---|---|---:|---:|---:|---:|---:|
| Agro y alimentos | S01, S06, S15–S21 | 58 | 0 | 0 | 1 (S19-E01) | 59 |
| Comercio y logística | S03, S13, S27, S28 | 26 | 0 | 0 | 0 | 26 |
| Energía y agua | S31–S34 | 24 | 0 | 0 | 0 | 24 |
| Industria y construcción | S02, S05, S22–S25, S37 | 47 | 3 | 1 (S05-P01) | 1 (S22-E01) | 51 |
| Minería | S07–S12 | 42 | 0 | 0 | 1 (S07-E01) | 43 |
| Servicios a personas | S14, S26, S35, S36 | 27 | 0 | 0 | 0 | 27 |
| Tecnología y pagos | S04, S29, S30 | 16 | 6 | 2 (S29-P01, S30-P01) | 0 | 22 |
| **Total** | **37** | **240** | **9** | **3** | **3** | **252** |

Los conteos por empresa están en `dataset/indice-empresas.csv`.

## 2. Cruces entre listas y carpetas

| Comprobación | Resultado |
|---|---|
| Ids duplicados en las siete listas | ninguno |
| Fila de lista sin ficha / ficha sin fila de lista | 0 / 0 |
| Ficha en la carpeta de otra empresa | 0 |
| Empresa en más de una familia | 0 |
| Carpetas sin `empresa.md` o sin `transferencia.md` | 0 de 37 |
| Fichas por carpeta = filas de lista por empresa | 37 de 37 |
| Cada padre lista en su ficha exactamente los hijos de la lista, y existen | S05-P01, S29-P01, S30-P01: sí |
| Sub-riesgo cuyo padre no existe | 0 |
| Escenarios cuyos miembros existen | S07-E01, S19-E01, S22-E01: sí |

## 3. Cruces con las evaluaciones

| Comprobación | Resultado |
|---|---|
| Fichas del agente de la Fase 8 | 255 filas, 255 riesgos distintos (incluye los 3 padres, con su resultado derivado) |
| Riesgo con factores propios sin ficha del agente de la Fase 8 | 0 |
| Riesgo con factores propios sin fila del agente en `fase-11/regresion-emi41.csv` | 0 (255 filas del agente y 30 de Emiliano) |
| Las 30 de Emiliano son la muestra sorteada (`fase-8/sorteo/muestra-emiliano.csv`) | sí, mismos 30 `risk_id`; los 30 tienen fila en la regresión |
| Fichas nuevas de la Fase 11b | 64 (45 en `fichas-reevaluadas.csv`, 19 en `fichas-ronda-2.csv`) |
| Fichas de la Fase 12 sobre EMI-41 | 6, de Emiliano, sobre S06-R01 a S06-R06 (`fase-12/piloto-emiliano/etapa-b/fichas-emiliano-cerradas.csv`) |

**Inconsistencia: `evaluacion_id` no es único.** Las fichas del agente de agro y alimentos usan `EV-0001` a `EV-0059` y las de servicios a personas `EV-0001` a `EV-0027`: 27 ids se repiten entre las dos familias (y el mismo esquema `EV-00NN` aparece también en las fichas del dry run de los casos de propiedad). Las otras familias usan `EV-8401…`, `EV-8-<familia>-NNNN`. Dentro de EMI-41 el par (`evaluacion_id`, `risk_id`) sí es único, y `regresion-emi41.csv` siempre trae el `risk_id`, así que ningún resultado queda ambiguo; los dos scripts de esta fase usan ese par como clave. No se corrige: renombrar ids cambiaría fichas de la Fase 8. Para la Fase 15 es un error referencial que, según EMI-17, rechazaría una importación (ver manifiesto).

**`review_status`.** Las 255 del agente y las 30 de Emiliano de la Fase 8 siguen `pending`: es un campo del experimento (EV-27, metodología v1 §17), no una revisión que falte hacer en bloque. De las 64 de la Fase 11b, 62 siguen `pending` y 2 están `accepted`. Las 6 de la Fase 12 siguen `pending`.

### Propuestas EV-11-0063 y EV-11-0064

**Ya están decididas.** Emiliano respondió «Acepto ambas fichas» el 2026-10-13 (`v0/fase-11/aceptacion-fichas-emiliano-2026-10-13.md`). Las dos filas tienen `review_status = accepted`, `revisado_por = emiliano`, `fecha_revision = 2026-10-13`, con el autor original `agente-11b` y sus factores sin cambio.

| Propuesta | Riesgo | Sobre | Resultado con la v1 candidate |
|---|---|---|---|
| EV-11-0063 | S02-R07 | EV-8103 | C 40, Media, techo 100, `consecuencia_extrema` true, `safety_critical` false |
| EV-11-0064 | S15-R04 | EV-8115 | no evaluable (falta el costo bruto cubierto por ART), techo 80, `consecuencia_extrema` true, `safety_critical` true |

El índice las muestra como evaluación vigente de Emiliano en la v1, con su estado. No hay propuestas pendientes que el dataset tenga que dejar al lado.

## 4. Huellas

**Intención de diseño.** Los siete `cerrado/emi41/intencion-*.md` coinciden con la última línea de su familia en `emi41/hashes-intencion.md`. Cada familia tiene una sola línea (2026-10-06 20:58 UTC): la revisión de plausibilidad de la Fase 7 no pidió cambios que agregaran líneas. Sin diferencias.

**Congelamiento de la v1.** De los 17 archivos de la tabla de `v1/congelamiento.md`, 15 coinciden con su huella congelada. Los otros dos, `v0/fase-11/reevaluacion/fichas-ronda-2.csv` y `fichas-ronda-2-factores.csv`, difieren porque registran la aceptación de EV-11-0063 y EV-11-0064 (regla 5 del congelamiento), y coinciden con las huellas "tras aceptación" de `aceptacion-fichas-emiliano-2026-10-13.md` (`7c8472b3…` y `5e96850b…`). No es una edición no autorizada.

## 5. Criterios de la cobertura efectiva (cómo se atribuye un hallazgo)

`cobertura-efectiva.csv` separa, por contraste, lo **propio** de lo que aparece **en sus riesgos**:

- **Propio** (cuenta para el dictamen `tensionó`): un punto del inventario de evidencia de la Fase 11 cuyo tema es ese contraste (tabla `EV_TEMA` de `analisis_cierre.py`, asignada por lo que cada punto discute, no por qué riesgos cita); el chequeo del contraste en `fase-8/comparacion/contrastes.csv` cuando no se cumple en todos; pares que la intención separa y la banda del agente junta (`fase-9/discriminacion-contrastes.csv`); y lo que el piloto de la Fase 12 discutió cuando corresponde al tema del contraste (C08, C09, C21).
- **En sus riesgos** (contexto, no decide): A1, divergencias de más de un nivel o de estado frente a la intención, cambios de resultado con la v1 y anomalías del agente. Un riesgo lleva varios contrastes, así que estos hallazgos no se pueden atribuir a uno solo sin releer la intención, que esta fase no hace.
- `cobertura insuficiente`: sin hallazgo propio y tres riesgos o menos. `cubierto sin hallazgo`: sin hallazgo propio y más de tres.
- `riesgos_directo` cuenta los riesgos que la intención etiqueta con el contraste y son de una empresa marcada `directo` en la matriz; `riesgos_costado`, los etiquetados de las demás empresas. C25 no está en la matriz (lo eligió la Fase 7 en `cerrado/`), por eso todos sus riesgos cuentan de costado.

## 6. Reproducir

```bash
cd SPIKES/T-0021/v0/fase-14
python3 analisis_cierre.py          # analisis-cierre.json y cobertura-efectiva.csv
python3 dataset/construir_indice.py # dataset/indice-empresas.csv e indice-riesgos.csv
```
