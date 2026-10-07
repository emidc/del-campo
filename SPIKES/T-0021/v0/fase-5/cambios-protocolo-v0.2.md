# Cambios de protocolo para la v0.2 · Fase 5

> Propuestos por la Fase 5; se aplican a `protocolo.md` (que pasa a protocolo v0.2) sólo después de la aprobación final de Emiliano. Formato antes/después; el "antes" copia el texto vigente de protocolo v0.1.

## 1. §2.2 · `<f>_valor` (grupo 1, F5-1)

**Antes.**
> `unknown` (D8: la evidencia no fija el nivel ni lo acota a tres niveles contiguos; metodología §9.2)

**Después.**
> `unknown` (D8: la evidencia no fija el nivel, no lo acota a tres niveles contiguos, o lo acota pero no da base para preferir un nivel dentro del rango; metodología §9.2). Un dato auxiliar desconocido (margen de contribución, duración exacta, número de personas) no vuelve `unknown` al factor si hay valor más plausible defendible; el supuesto se escribe en `<f>_observacion`.

## 2. §2.1 · `tipo_objeto` (grupo 3, F5-3)

**Antes.**
> Una ficha de `padre` no lleva factores propios: toma los de su sub-riesgo determinante (metodología §1.4)

**Después.**
> Una ficha de `padre` no lleva factores ni score propios: se muestra en la posición de su hijo prioritario, con sus factores (o los de todos los hijos empatados en el primer lugar) (metodología §1.4)

## 3. §2.3 · campo derivado nuevo (grupo 3, F5-3)

**Antes.** No existe.

**Después.** Fila nueva:
> | `prioridad_provisional` | booleano | derivado, sólo en fichas de `padre`: `true` si algún hijo es no evaluable; la posición mostrada es la del hijo evaluable mejor ubicado y no se afirma como definitiva (metodología §1.4.5) |

## 4. §2.3 · `v_aspectos_aplicables` e `i_efectivo` (grupos 2 y 6)

**Antes.**
> derivado, nunca a mano: por dimensión, qué aspectos de V entraron en `V_d` (`econ:cont,rec;pers:cont;cont:cont,rec;legal:cont`); con `v_rec = no_aplica`, recuperación no figura (metodología §5.5)

**Después.**
> derivado, nunca a mano: por dimensión, qué aspectos de V entraron en `V_d` y cómo (`econ:cont,rec(secuencial);pers:cont;cont:cont,rec(secuencial);legal:cont`); con `v_rec = no_aplica`, recuperación no figura (metodología §5.5, combinación secuencial)

`i_efectivo`, **antes:**
> `1`–`5` \| `unknown`. `max(dimensiones)` (D5); se muestra y desempata (D10). Con una dimensión `unknown`, se aplica metodología §9.3

**Después (decisión de Emiliano, 2026-10-07 01:54 UTC):**
> `1`–`5` \| `≥ n`. `max(dimensiones)` (D5); se muestra y desempata (D10). Con una dimensión `unknown`, se registra `≥ n` con `n` = máximo de las dimensiones conocidas; el `<f>_max` de la `unknown` nunca se usa. Si lo desconocido podría cambiar un desempate, ese paso queda indeterminado (metodología §7.2)

## 5. §8 · lectura de "dos lecturas literales" (grupo 4)

Sin cambio de texto. Nota para la próxima corrida: AN-0010 (anclas de P solapadas), AN-0005 y AN-0013 (rúbricas de V) quedan resueltas por metodología §3.3–3.4 y §5.3–5.4 de la v0.2; si reaparecen, son anomalías nuevas.

## 6. §11 · métricas de ranking (CH-077, aprobado en la Fase 6)

**Antes.**
> | Ranking | correlación de rangos (tau-b de Kendall) por empresa | sin target (baseline) |
> | Ranking | solapamiento del top-3 por empresa **[PA 13]** | sin target (baseline) |

**Después.**
> | Ranking | concordancia de orden sobre los pares de fichas de una misma empresa que caigan en la muestra, con su `n` | sin target (baseline) |
>
> Si en algún momento se evalúan empresas completas, vuelven la tau-b de Kendall y el solapamiento del top-3 por empresa (CH-077).

Y en la regla de cálculo 5, **antes:** "Se ordena cada empresa con la versión de D10 vigente"; **después:** "Se ordenan las fichas de cada empresa que estén en la muestra con la versión de D10 vigente; los pares se forman sólo dentro de una empresa (metodología §7.1.4, CH-075)".

## 7. §13 · aceptación de la regresión (grupo 5)

**Antes.**
> Una corrección que regresiona algún caso no se acepta salvo que Emiliano lo apruebe explícitamente, y queda registrado en el changelog.

**Después.**
> Una corrección que regresiona algún caso no se acepta salvo que Emiliano lo apruebe explícitamente, y queda registrado en el changelog. Si Emiliano revisa la adjudicación de un caso (como CP-14 en la Fase 5), la regresión juzga contra la adjudicación revisada, informa también el resultado contra la original y el caso pasa a ser caso de origen de la regla que motivó la revisión.

## 8. §14 · propiedad 2 de la metodología

No toca el protocolo: la propiedad "invariancia de granularidad" que §8 manda intentar romper se reemplaza en metodología §14 por "padre como agrupador" (F5-3). En §8, "(monotonía, invariancia de granularidad, causalidad de V, …)" pasa a "(monotonía, padre como agrupador, causalidad de V, sensible a la mejora, …)".
