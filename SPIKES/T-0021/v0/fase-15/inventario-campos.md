# Inventario de campos · Fase 15a

> 2026-10-14 · T-0021, Fase 15a (contratos para EMI-16). RAIZ = `SPIKES/T-0021/` de `emidc/del-campo` en `main` (`39f4c89`, con las PR #73 y #74). Todo lo de abajo sale de `inventario_campos.py` (esta carpeta), que sólo lee y deja sus resultados en `uso-columnas.csv`, `ids-evaluacion.csv` e `inventario-campos.json`. No se usó la copia de la carpeta compartida del proyecto, que está atrasada.

## 1. Huellas de la v1

Las 18 huellas de `v1/congelamiento-v1.md` **coinciden** con los archivos de `main`. Ningún archivo congelado cambió desde la Fase 13.

## 2. Qué fichas se contaron

355 fichas de evaluación, las mismas del manifiesto del dataset:

| Fuente | Archivos | Fichas |
|---|---|---:|
| Agente, Fase 8 | `v0/fase-8/agente/*/fichas.csv` (7) | 255 |
| Emiliano, Fase 8 | `v0/fase-8/emiliano/fichas-emiliano.csv` | 30 |
| Agente, Fase 11b | `v0/fase-11/reevaluacion/fichas-reevaluadas.csv` y `fichas-ronda-2.csv` | 64 |
| Emiliano, Fase 12 | `v0/fase-12/piloto-emiliano/etapa-b/fichas-emiliano-cerradas.csv` | 6 |

Las 51 fichas del dry run de los casos de propiedad (`v0/dry-run/fichas-dry-run.csv`) no son de EMI-41. Entran sólo en el cruce de ids de §4, porque usan el mismo esquema de id, y en la nota sobre acciones de §3.

**Encabezados.** Sólo la Fase 12 tiene las 89 columnas de la plantilla. Los otros 10 archivos no tienen `prioridad_provisional`, que se agregó con CH-108 después de que se escribieran.

## 3. Uso de cada columna

La tabla completa, una fila por columna de la plantilla, está en `uso-columnas.csv` (con valor, vacía, `unknown`, `no_aplica`, `—`, ausente del archivo, valores distintos). Lo que importa para el contrato:

- **Ninguna celda de las 355 fichas vale `—`.** Tampoco hay ninguna `<f>_base` fuera del enum de EMI-17: las 2.464 bases con valor son `observed`, `reported`, `inferred` o `assumed`. Las 3 fichas sin factores son los padres de la Fase 8.
- **`unknown`** aparece en 35 factores: P 1, I-económico 22, I-personas 5, I-continuidad 6, I-legal 1, V-contención 0, V-recuperación 0. **`no_aplica`** aparece sólo en V-recuperación, 52 veces.
- **Nunca se usaron en EMI-41:** `accion_id`, `accion_cambio_esperado`, `accion_efecto`, `accion_brecha_nota` (0 de 355; el dry run de los casos de propiedad los usa en 3 reevaluaciones: CP-04, CP-10 y CP-18), `reputacion_texto` (0 de 355) y `prioridad_provisional` (0 de 6 donde existe la columna; ningún padre de EMI-41 tiene un hijo no evaluable).
- **Casi vacías por cómo se hizo el experimento:** `banda` (62 de 355, porque la v0.2 de la Fase 8 no tenía bandas), `revisado_por` y `fecha_revision` (2, las de EV-11-0063 y EV-11-0064), `evaluacion_anterior_id` y `motivo` (64, sólo la Fase 11b).
- **`review_status`:** 353 `pending` y 2 `accepted`. **`actor`:** 319 `ai` y 36 `human`. **`version_metodologia`:** 285 `metodologia v0.2` y 70 `metodologia v1 candidate`. **`motivo`:** 47 `cambio_version_metodologia` y 17 `correccion_evaluacion`; los otros tres motivos de D22 no aparecen en EMI-41.
- **`uncertainty`:** vacía en 2 (padres de la Fase 8); `medium` 232, `high` 69, `low` 52.

## 4. Las 15 `base = —`

**No están en las fichas de evaluación sino en las fichas de información** de EMI-41 (`v0/emi41/fichas/SNN/*.md`), en la tabla "Procedencia por dato". Son las 15 filas de las 1.605 que contó la Fase 14 (`fase-14/criterios-cierre-emi41.csv`, P5) cuya columna `base` dice `—`.

Las 15 tienen tres cosas en común:
1. La evidencia es `sin_evidencia`.
2. "Qué falta confirmar" dice que el dato no existe o no está disponible (no hay registro, se perdió, no se midió, no se relevó).
3. La ficha tiene sección "Faltantes".

Ninguna afirma un valor: registran un dato que falta. Los evaluadores no lo propagaron: en la ficha de la Fase 8 de cada riesgo, el factor que ese dato alimenta tiene una base del enum, tomada de los otros datos (columna `base_que_dio_el_agente_f8` de `base-guion.csv`).

| # | Ficha | Dato | Qué falta confirmar | Factor que alimenta (inferido por la sección de la ficha) |
|---:|---|---|---|---|
| 1 | S02-R04 | Días de baja 2023 | Las liquidaciones de la ART de 2023 no están en el archivo de la empresa | I-personas |
| 2 | S02-R06 | Cortes anteriores a 2023 | No hay registro propio ni de la distribuidora antes de 2023 | P |
| 3 | S06-R05 | Ahorro de una cámara vacía | Separación de costos fijos y variables | I-económico |
| 4 | S07-E01 | Daño sísmico a planta y campamento | Estimación | I-económico |
| 5 | S07-R04 | Informe trimestral del segundo trimestre de 2026 | Emisión y contenido | P |
| 6 | S10-R05 | Contenido de sílice del material | No hay análisis mineralógico de la caliza ni del conglomerado | P; I-personas |
| 7 | S11-R04 | Disponibilidad del detector en 2023-11 a 2024-12 | Los registros se perdieron en una migración de servidor en 2025-01 | P |
| 8 | S17-R03 | Cláusula de indemnización vigente | Texto del contrato 2025-12 con el mayor cliente | I-económico |
| 9 | S22-R02 | Válvula de exceso de flujo de la cisterna | Fecha y resultado de su última prueba | V-contención |
| 10 | S22-R04 | Choques y cuasi-accidentes antes de 2025 | No se registraban | P |
| 11 | S22-R06 | Espesor actual | Medición por ultrasonido | P |
| 12 | S31-R06 | Kilómetros 2023 | Ver faltantes | P |
| 13 | S32-R06 | Registro de intrusiones de la operadora A | No disponible | P |
| 14 | S33-R02 | Ensayo de granizo del lote B | Ver faltantes | I-económico |
| 15 | S34-R01 | Contrato con el cliente B | Ver faltantes | I-económico; I-legal |

La interpretación propuesta y la regla para el contrato están en `base-guion.csv` y en el punto 2 del "Para decidir" del dossier.

## 5. Esquemas de `evaluacion_id` y colisiones

Siete patrones en las 406 fichas (355 de EMI-41 más 51 del dry run). Los "cuatro esquemas" de la Fase 14 son estos agrupados por forma (`EV-NNNN`, `EV-8-<familia>-NNNN`, `EV-11-NNNN`, `EV-12-PILOTO-…`):

| Patrón | Dónde | Rango | Fichas |
|---|---|---|---:|
| `EV-NNNN` | agente, agro y alimentos | EV-0001 a EV-0059 | 59 |
| `EV-NNNN` | agente, servicios a personas | EV-0001 a EV-0027 | 27 |
| `EV-NNNN` | agente, comercio y logística | EV-8401 a EV-8426 | 26 |
| `EV-NNNN` | Emiliano, Fase 8 | EV-8101 a EV-8130 | 30 |
| `EV-NNNN` | dry run (casos de propiedad) | EV-0001 a EV-0051 | 51 |
| `EV-8-<familia>-NNNN` | agente: energía y agua, industria y construcción, minería, tecnología y pagos | desde 0001 en cada familia (24, 52, 43 y 24) | 143 |
| `EV-11-NNNN` | agente, Fase 11b | EV-11-0001 a EV-11-0064 | 64 |
| `EV-12-PILOTO-EMI-SNN-RNN` | Emiliano, Fase 12 | S06-R01 a S06-R06 | 6 |

**Colisiones:**
- **Dentro de EMI-41, 27 ids se repiten:** EV-0001 a EV-0027, en agro y alimentos y en servicios a personas. Es lo que registra CH-113 (prov.).
- **Con el dry run, 51 ids se repiten:** EV-0001 a EV-0051 también son fichas de los casos de propiedad. De esos, EV-0001 a EV-0027 aparecen en tres fuentes. La lista está en `ids-evaluacion.csv`.
- **7 fichas de la Fase 11b apuntan con `evaluacion_anterior_id` a un id repetido:** EV-11-0009 → EV-0009 (S06-R02), EV-11-0016 → EV-0004 (S14-R04), EV-11-0017 → EV-0014 (S15-R01), EV-11-0025 → EV-0010 (S26-R03), EV-11-0041 → EV-0016 (S35-R02), EV-11-0042 → EV-0022 (S36-R02) y EV-11-0043 → EV-0024 (S36-R04). Se resuelven sólo con el `risk_id`.
- El par (`evaluacion_id`, `risk_id`) **es único** en las 355 de EMI-41, como dijo la Fase 14.
- **`risk_id` no colisiona:** 255 distintos en EMI-41 (`SNN-…`) y 45 en el dry run (`CP-NN-RN`), sin ninguno en común.

## 6. Lo que esto dice para el contrato

- Los ids históricos no sirven como id global de evaluación. Hace falta un id nuevo y conservar el histórico como origen (decisión 1).
- La `—` es un dato faltante de la ficha de información, no una base de una evaluación. Se puede resolver sin tocar el enum de EMI-17 (decisión 2).
- Las columnas `accion_*` no tienen datos en EMI-41: `action-plan.csv` necesita registros sintéticos nuevos (dossier §7).
- `prioridad_provisional`, los hijos empatados y tres motivos de D22 (`accion_ejecutada`, `informacion_nueva`, `cambio_contexto`) no aparecen en EMI-41. Los CSV sintéticos los necesitan como casos nuevos.

## Reproducir

```bash
cd SPIKES/T-0021/v0/fase-15
python3 inventario_campos.py
```
