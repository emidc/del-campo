# Cambios en el protocolo para la v1 candidate (borrador, Fase 11b)

> Antes/después de lo que cambia en `protocolo.md` (v0.3) y en la plantilla por las decisiones de Emiliano del 2026-10-11 12:18 UTC. No se aplica hasta que Emiliano apruebe `reporte-fase-11.md`.

| Marca | Punto | Dónde | Antes | Después |
|---|---|---|---|---|
| [F11-5] [F11-7] | EV-16, EV-29 opción c | §2.3, `consecuencia_extrema` | "`true` si alguna dimensión de I tiene `<f>_valor = 5` (D20, respuesta 3); en un riesgo no evaluable, también si una dimensión es `unknown` y su `<f>_max` registrado es 5 (metodología §8.2) **[CH-092]**" | "`true` si alguna dimensión de I tiene `<f>_valor = 5` (D20, respuesta 3); si una dimensión es `unknown`, también si su `<f>_max` registrado es 5, sea el riesgo evaluable o no; y si una dimensión con valor tiene su `<f>_max` a más de tres niveles de `<f>_min` (o de `<f>_valor`, sin mínimo), también si ese `<f>_max` es 5 (metodología §8.2) **[F11-7]**" |
| [F11-5] [F11-7] | EV-16, EV-29 opción c | §2.3, `safety_critical` | "`true` si `i_pers_valor ≥ 4`; en un riesgo no evaluable, también si `i_pers` es `unknown` y `i_pers_max ≥ 4` (D23)" | "`true` si `i_pers_valor ≥ 4`; si `i_pers` es `unknown`, también si `i_pers_max ≥ 4`, sea el riesgo evaluable o no; si `i_pers` tiene valor y su `i_pers_max` está a más de tres niveles de `i_pers_min` (o de `i_pers_valor`), también si `i_pers_max ≥ 4` (D23, metodología §8.2) **[F11-7]**" |
| [F11-6] | EV-18 | §2.3, `i_efectivo` | "Con una dimensión `unknown`, se registra `≥ n` con `n` = máximo de las dimensiones conocidas; el `<f>_max` de la `unknown` nunca se usa." | "Con una dimensión `unknown`, se registra `≥ n` con `n` = máximo de las dimensiones conocidas, salvo que el `<f>_max` registrado de la `unknown` sea ≤ `n`: entonces se registra `n` (metodología §7.2). El `<f>_max` nunca se usa como valor." |
| [F11-12] | EV-43 | `plantillas/ficha-evaluacion.csv` | Sin columna `prioridad_provisional` (protocolo §2.3 ya la define como derivada del padre) | Se agrega la columna `prioridad_provisional` después de `i_efectivo`, en el orden de §2.3 |

**Corrección del dictamen.** El dictamen de la 11a (EV-43 y CH-108 del anexo) decía que faltaba el campo en protocolo §2.3. Ya está ahí; lo que falta es la columna en la plantilla. El cambio es sólo ése.
