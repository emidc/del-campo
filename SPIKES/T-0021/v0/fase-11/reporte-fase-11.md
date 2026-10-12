# Reporte · Fase 11b · metodología v1 candidate

> 2026-10-11 · Corrida **F11-REG-01** · de metodologia v0.3 / protocolo v0.3 a **metodologia v1 candidate / protocolo v1 candidate**. Primera ronda: lo que Emiliano decidió el 2026-10-11 12:18 UTC (`decisiones-11a.md`). Segunda ronda: sus respuestas al "Para aprobar", el 2026-10-11 13:21 UTC. **La v1 candidate quedó congelada** (`v1/congelamiento.md`).

## Resumen

1. **Respuestas de Emiliano:** 1 sí; 2 opción c; 3 sí, pending; 4 no al umbral de F11-4, reevaluar por sustituibilidad real; 5 a 7 sí; 8 sí, con fichas nuevas sin sobrescribir; 9 congelar después de aplicar 2, 4 y 8 y una última regresión con 0 FAIL.
2. **Opción c:** el peor creíble fuera del rango de tres niveles dispara bandera como un `unknown`. Está en el borrador (§8.1, §8.2, §9.1, §9.2), en protocolo §2.3, en la regresión y en el arnés.
3. **F11-4 sin umbral:** se corrigieron las 17 fichas que lo aplicaron. Aplica en 6, donde las demás unidades toman el trabajo, y en 11 vuelve el valor de la Fase 8 (S28-R02, las tres de S32, las cuatro de S33, S09-R01 y S20-R02/R03).
4. **Tus fichas:** hay 2 propuestas nuevas, pending (S02-R07 a evaluable con C 40; S15-R04 a no evaluable por la ART). Las otras 6 se revisaron y no cambian; S36-R03 es derivada.
5. **Regresión final:** casos 20 sin cambio (13 PASS). EMI-41: cambian 55 de 255 del agente y 4 de 30 tuyas, todas con regla. Pares de prueba 23/25; banda entre evaluadores 16/23.
6. **Distribución del agente:** Media 62,2% → 61,3%; `consecuencia_extrema` 53 → 61; `safety_critical` 75 → 84 (de 252).
7. **Arnés final:** 213 tests, 211 pass, 0 fail, 2 `todo` fuera de v1. Coincide con la regresión de Python en las 285 filas.
8. **Cerrado:** changelog CH-098 a CH-110; `decisiones-v0.md` y `protocolo.md` en v1 candidate; `v1/metodologia-v1-candidate.md` y `v1/congelamiento.md`; PR al repo y comentario en EMI-15.

## Segunda ronda

### F11-4 por sustituibilidad real (punto 4)

No se usó ningún umbral de unidades ni de porcentaje. F11-4 aplica si las demás unidades de la función toman el trabajo de la que se pierde y la función no pierde capacidad, throughput ni nivel de servicio de forma material. Si no, Continuidad vuelve al nivel por duración de la ficha de la Fase 8. Como tu "no" invalida la lectura de la primera ronda, revisé las 17 fichas que la usaron, no sólo las 4 de borde. Cada una tiene una ficha de corrección (`correccion_evaluacion`, EV-11-0046 a EV-11-0062), y la de la primera ronda queda intacta.

| Aplica (Continuidad 1) | Por qué |
|---|---|
| S03-R01, S03-R02 | La flota, con 4 tractores equivalentes en la base, toma los viajes de la unidad en el día |
| S07-R07 | Tras la pérdida de 2025, la flota mantuvo el movimiento planificado durante 11 meses (observado) |
| S09-R03 | Los demás pozos suben 15 L/s, más que un pozo, dentro del permiso |
| S11-R04 | El transporte no cambia mientras falten 2 camiones o menos (observado dos veces) |
| S27-R02 | Hay al menos 4 sucursales por ciudad para la misma dispensa (sin medición del traslado: validar) |

| No aplica (vuelve el valor de la Fase 8) | Por qué |
|---|---|
| S28-R02 (cont 4) | La venta es del local: 4 de 15 son únicos en su ciudad, y el traslado a otro local es recuperación, no redundancia |
| S32-R01 (4), S32-R02 (3), S32-R04 (3) | Cada equipo trabaja para su operadora y no hay equipo de reserva: se pierden sus días facturables |
| S33-R02 (3), S33-R04 (4), S33-R05 (2), S33-R06 (4) | La energía de un bloque no la genera otro |
| S09-R01 (3) | La salmuera perdida no se repone: el bombeo está cerca del máximo permitido |
| S20-R02 (3), S20-R03 (2) | La capacidad del silo no la toman los otros 11 |

El texto de §4.4 suma tu criterio: "Se juzga por sustituibilidad real: las demás unidades tienen que tomar el trabajo de la que se pierde. No hay un umbral fijo de unidades ni de porcentaje." Con este criterio tu S33-R05 (cont 3) ya era consistente, así que sale de la lista de fichas afectadas.

### Fichas nuevas sobre tus fichas (punto 8)

Las hice yo como propuestas: `evaluador = agente-11b`, `review_status = pending`, apuntando a tu ficha. Las validás vos. Están en `reevaluacion/fichas-ronda-2.csv`.

| Tu ficha | Ficha nueva | Cambio | Resultado |
|---|---|---|---|
| S02-R07 (EV-8103) | EV-11-0063 | F11-1: el registro de entregas muestra atrasos repetidos y ninguna rescisión, así que el atraso es el escenario de referencia. Econ 2 [1–5] y cont 1 [1–5]; F11-7: la rescisión va al máximo | No evaluable → C 40, Media, posición 1; conserva `consecuencia_extrema` por la opción c |
| S15-R04 (EV-8115) | EV-11-0064 | F11-2: los USD 195 mil no incluyen lo que paga la ART, la información no lo trae y con eso el bruto puede pasar el 100% del RO. Econ `unknown` [3–5] | C 64, Alta → no evaluable; `consecuencia_extrema` true |

Las que revisé y no cambian:
- **S04-R03, S13-R05, S28-R07 y S08-R03.** Tus notas dicen que no hay base para elegir escenario ni valor, y con F11-1 eso deja el factor `unknown`, igual que ahora.
- **S18-R03.** Tu rango de econ 3–4 ya cubre lo que agregaría la ART, y `C_raw` lo determina Personas.
- **S33-R05.** Ver arriba.
- **S36-R03.** Su cambio de I efectivo es derivado y no necesita ficha nueva.

### Números finales

| Medida | v0.3 | v1 candidate congelada |
|---|---|---|
| Casos de propiedad | 13 PASS, 3 FAIL comb., 3 FAIL calib., 1 FAIL ranking | igual |
| Filas de EMI-41 que cambian | — | agente 55 de 255; Emiliano 4 de 30 |
| Evaluables del agente en el ranking | 233 | 235 |
| Baja / Media / Alta / Crítica | 8,6 / 62,2 / 20,6 / 8,6% | 7,7 / 61,3 / 22,1 / 8,9% |
| `consecuencia_extrema` (agente, 252) | 53 | 61 |
| `safety_critical` (agente, 252) | 75 (29,8%) | 84 (33,3%) |
| No evaluables (agente) | 10 | 8 |
| Pares de prueba de D14 | 23/25 | 23/25 |
| Misma banda entre evaluadores | 16/23 | 16/23 |
| `evaluable` coincide entre evaluadores | 24/30 | 23/30 |
| D23 | se cumple | se cumple |

La fila de `evaluable` baja porque tu S15-R04 pasa a no evaluable con la propuesta y la del agente sigue evaluable. Cuando valides las dos propuestas, ese número se recalcula.

---

## Resumen de la primera ronda

1. **Qué cambió.** Las 12 correcciones aprobadas, con los textos de Emiliano (EV-01, EV-05 y EV-30 con sus precisiones), están en `metodologia-v1-candidate-borrador.md`, `cambios-decisiones-v1.md` y `cambios-protocolo-v1.md`, marcadas [F11-1] a [F11-12].
2. **Casos de propiedad.** Los 20 quedan sin cambio: 13 PASS, 3 FAIL combinación, 3 FAIL calibración y 1 FAIL ranking. Ningún caso que pasaba falla.
3. **EMI-41.** Cambian 66 de 255 filas del agente y 2 de 30 de Emiliano. Cada cambio tiene su regla y su fila de changelog, y no hay ninguno sin regla. Hay 45 fichas nuevas del agente, pendientes de revisión, y ninguna anterior se sobrescribió.
4. **Distribución.** Media baja de 62,2% a 60,4% y `safety_critical` sube de 29,8% a 32,9%. Los no evaluables pasan de 10 a 8. Los pares de prueba siguen 23/25 y la banda entre evaluadores sigue 16/23.
5. **Arnés.** Queda portado a la candidate: 213 tests, 211 pass, 0 fail y 2 `todo`, los dos fuera de v1 (EV-44). El arnés y la regresión de Python coinciden en las 285 filas.
6. **Tus fichas.** Quedan afectadas 9 de tus 30 (sección 4). Decidís vos si las rehacés.
7. **Para decidir.** El texto aprobado de F11-7 dice que el peor creíble "alimenta el techo y las banderas", pero D20 dispara las banderas por valor (sección 5).
8. **Errores del dictamen.** Encontré cuatro errores del dictamen y los corregí (sección 6). D14 sigue en 1 de 3.

## 1. Qué se aplicó

| Marca | Punto | Dónde | Tipo (§13) | Fichas nuevas |
|---|---|---|---|---|
| F11-1 | EV-01 escenario de referencia único | metodología §1.3.4 | asignación | 2 |
| F11-2 | EV-03 seguros obligatorios (ART) | §4.1.7, D17 | asignación | 5 |
| F11-3 | EV-04 comparabilidad del dato | §3.2, jerarquía 1 | asignación | 6 |
| F11-4 | EV-05 redundancia natural | §4.4 | asignación | 17 |
| F11-5 | EV-16 banderas con `unknown` | §8.2, protocolo §2.3 | combinación | — |
| F11-6 | EV-18 ancla 5, determinante, I efectivo | §3.3, §6.2, §7.2, protocolo §2.3 | texto y combinación | — |
| F11-7 | EV-29 peor creíble | §9.2 | asignación | 11 (3 cambian el valor, 8 sólo el máx) |
| F11-8 | EV-30 muerte directa y creíble | §4.3 | asignación | 6 |
| F11-9 | EV-32 medida anticipatoria | §5.1 | asignación | 1 |
| F11-10 | uso del techo plausible | §6.6 | texto | — |
| F11-11 | EV-28 decisiones faltantes #3 y #12 | decisiones-v0 | texto | — |
| F11-12 | EV-43 `prioridad_provisional` | plantilla de ficha | texto | — |

Algunas fichas llevan más de una marca, así que la suma pasa de 45. Cada ficha nueva está en `reevaluacion/fichas-reevaluadas.csv`. Lleva `evaluacion_anterior_id` = la ficha de la Fase 8, `motivo = cambio_version_metodologia` y `review_status = pending`, y una nota "[F11-n, 2026-10-11]" en la observación de cada factor que cambió. `reevaluacion/cambios-por-factor.csv` lista los 52 factores que cambiaron, uno por fila.

Las filas del changelog están en `anexo-changelog-fase-11.md`, con ids provisorios CH-098 a CH-110. Ahí ya figuran tus textos, CH-109 por el uso del techo y CH-110 por esta corrida.

## 2. Regresión

**Casos de propiedad** (`regresion-casos.csv`). Ninguna corrección de asignación los alcanza: revisé sus factores de Personas, de degradación y de medidas anticipatorias, y ninguno cae en F11-1 a F11-9. Las reglas de combinación (F11-5 y F11-6) tampoco mueven ninguna bandera ni ningún I efectivo de los casos.

**EMI-41** (`regresion-emi41.csv`, una fila por riesgo con versión anterior, versión nueva, estado, regla y fila del changelog):

| Regla | Filas | Riesgos |
|---|---:|---|
| F11-4 continuidad → 1 | 17 | S03-R01/R02, S07-R07, S09-R01/R03, S11-R04, S20-R02/R03, S27-R02, S28-R02, S32-R01/R02/R04, S33-R02/R04/R05/R06 |
| F11-7 peor creíble | 10 | S02-R07, S22-R04, S22-R06 (vuelven al ranking); S03-R04, S06-R02, S10-R06, S21-R01, S28-R07, S36-R02, S36-R04 (sólo el máx) |
| F11-2 ART | 5 | S02-R01, S02-R02, S34-R06, S37-R02, S37-R03 |
| F11-3 comparabilidad | 5 | S04-R02, S15-R01, S22-R02, S29-R04, S29-P01-S02 |
| F11-8 muerte directa | 5 | S14-R04, S19-R06, S26-R03, S31-R06, S32-R05 (y S22-R04, junto con F11-7) |
| F11-1 escenario único | 2 | S04-R04, S08-R03 |
| F11-5 banderas | 2 | S31-R05, S36-R07 (`safety_critical` true) |
| F11-9 anticipatoria | 1 | S35-R02 |
| Sólo posición, por otro riesgo de su empresa | 19 | S02, S04, S09, S15, S19, S22, S26, S29, S31, S33 y S37 |
| **Emiliano**, F11-6 | 2 | S08-R03 y S36-R03: I efectivo `≥ 5` → `5` |

Los cambios que más se notan:
- S04-R02 pasa de 32 a 64 (Media → Alta) y del 5.º al 1.er lugar de su empresa.
- S14-R04 pasa de 60 a 80 (Crítica).
- S19-R06, S26-R03, S31-R06 y S32-R05 pasan de 45 a 60 (Alta), y los cuatro con `safety_critical`.
- S35-R02 pasa de 60 a 45 (Alta → Media).
- S37-R02 deja de ser evaluable por ART y peor creíble.
- El hijo prioritario de S29-P01 pasa a ser S29-P01-S02.
- S02-R07 y S22-R06 vuelven al ranking (C 30), pero pierden `consecuencia_extrema`: ver la sección 5.

| Medida | v0.3 | v1 candidate |
|---|---|---|
| Ranking principal, evaluables del agente | 233 | 235 |
| Baja / Media / Alta / Crítica | 8,6 / 62,2 / 20,6 / 8,6% | 8,5 / 60,4 / 22,1 / 8,9% |
| `safety_critical` (agente, 252) | 75 (29,8%) | 83 (32,9%) |
| `consecuencia_extrema` (agente) | 53 | 53 |
| No evaluables (agente) | 10 | 8 |
| Pares de prueba de D14 en el orden esperado | 23/25 | 23/25 (ninguno cambia) |
| Misma banda entre evaluadores (ambos evaluables) | 16/23 (69,6%) | 16/23 (69,6%) |
| `evaluable` coincide entre evaluadores | 24/30 | 23/30 |

La última fila baja porque S02-R07 del agente pasó a ser evaluable y la tuya no se rehízo. Las dos filas de acuerdo entre evaluadores comparan fichas del agente en v1 con las tuyas en v0.3, así que sólo valen como medida cuando rehagas tus fichas afectadas.

**D23 se mantiene.** Ningún riesgo remoto sube de banda por la bandera.

**Otras verificaciones.**
- El techo plausible coincide en las 280 fichas.
- `calibrar.py` (Fase 9) y la regresión de la Fase 10 dan el mismo resultado que antes.

## 3. Arnés ejecutable

Está en el repo, en `SPIKES/T-0021/regresion-ejecutable/`, en la rama `task/T-0021-fase-11-v1-candidate`. El commit es local y el PR va después de tu aprobación. El detalle está en la sección "Fase 11b" de su README.

- **Lo que se agregó:**
  - la banda (cortes 20/50/75 y paso 1 de D10);
  - F11-4 (redundancia natural), F11-5, F11-6 y F11-7 (`rangoRegistrado`);
  - el hueco de §1.4.5: el hijo no evaluable de un padre con posición ahora aparece en la lista "no evaluable";
  - la cola de validación de §9.5, que antes no tenía función.
- **Los tests de las reglas nuevas.** Cada regla nueva tiene un test que falla con la regla anterior. Las funciones que cambiaron entre versiones toman un parámetro con la versión de las reglas, así que las 51 fichas de la Fase 5 se siguen comparando contra la v0.2, con la que se registraron. Con las reglas de la candidate, lo único que cambia en esas fichas es que reciben banda.
- **`todo`.** Cinco de los siete pasaron a ser tests normales, con la regla que decidiste: B01, a, a′, b (U07) y c. Quedan dos, J01 y e. No son reglas de la metodología sino criterios del juez de casos de protocolo §8, que dejaste fuera de v1 (EV-44). Cada uno dice qué decisión espera.
- **Cruce con Python.** `fase11.test.ts` recalcula las 45 fichas nuevas y las 285 filas de `regresion-emi41.csv` con el arnés: C, banda, banderas, I efectivo y posición. No hay ninguna diferencia. Hay una salvedad de formato: tres fichas de tecnología y pagos traen de la Fase 8 el texto `rec(min)` en `v_aspectos_aplicables`, que da el mismo `V_d`.

| Comando | Resultado |
|---|---|
| `node --run test` | 213 tests: 211 pass, 0 fail, 2 todo |
| `tsc --noEmit -p .` | sin errores |
| `eslint --no-ignore` sobre la carpeta | sin errores |

La campaña de mutación de `REMEDIATION.md` no se volvió a correr.

## 4. Tus fichas afectadas (primera ronda; resueltas en la segunda)

| Ficha | Regla | Por qué | Qué podría cambiar |
|---|---|---|---|
| S02-R07 | F11-1, F11-7 | Econ y cont `unknown` [1–5], porque la ficha junta escenarios | Con un escenario de referencia, o con el peor creíble en el máx, puede volver al ranking (la del agente quedó en C 30) |
| S04-R03 | F11-1, F11-7 | Econ `unknown` [2–5] | Ídem |
| S13-R05 | F11-1, F11-7 | Econ `unknown` [2–5] | Ídem |
| S28-R07 | F11-1, F11-7 | Econ y cont `unknown` [1–4] | Ídem |
| S08-R03 | F11-1; F11-6 | Econ [1–4] y cont [2–5] `unknown`. Su I efectivo ya cambió de `≥ 5` a `5` | Un escenario de referencia puede dar valor a econ y a cont |
| S36-R03 | F11-6 | Econ `unknown` máx 5 con n = 5 | Ya cambió: I efectivo `≥ 5` → `5`. No hace falta rehacerla |
| S33-R05 | F11-4 | Cont 3 por 1 o 2 estaciones de 25 | Cont 1 si leés redundancia natural |
| S15-R04 | F11-2 | La justificación menciona ART | Si el econ 4 [3–5] descontó lo que paga la ART, sube |
| S18-R03 | F11-2 | La justificación menciona ART | Ídem, para el costo de las lesiones |

Ya eran consistentes con la v1 y no cambian:
- S19-R06 y S37-R03: econ `unknown` porque no se puede acotar el bruto (F11-2).
- S22-R02 y S32-R03: ya descartaban la estadística parcial (F11-3).
- S07-R01: el radar ya estaba en V (F11-9).
- S36-R04: es evaluable y su rango no pasa de tres niveles. El dictamen la había listado por EV-29.
- S12-R05: es un caso de EV-37, una pregunta para la Fase 12 que no cambia nada ahora.

## 5. El peor creíble y las banderas (decidido: opción c)

El texto de F11-7 que aprobaste (§9.2) dice que el peor creíble "sólo alimenta el techo **y las banderas**". También decidiste usar el techo como "soporte de banderas" (F11-10). Pero las banderas se disparan por **valor** (D20, protocolo §2.3), y §9.1 dice que `<f>_max` "sólo alimenta el techo". F11-5 sólo cubre las dimensiones `unknown`. La regresión aplicó D20 tal como está.

El efecto se ve en S02-R07 y S22-R06. En la v0.3 eran no evaluables con econ `unknown` máx 5, así que tenían `consecuencia_extrema` (CH-092). Con F11-7 pasan a econ 2 [2–5]: vuelven al ranking y **pierden la bandera**. El extremo sigue visible en el techo (75 y 100) y en la observación.

| Opción | Regla | `consecuencia_extrema` (agente) | `safety_critical` (agente) | Tus fichas |
|---|---|---|---|---|
| **a** | Sacar "y las banderas" de §9.2. Las banderas siguen por valor (D20) | 53 | 83 | sin cambio |
| **b** | Todo `<f>_max` dispara bandera | 120 (48%) | 110 | ext 12 → 20 |
| **c** (recomendada) | El peor creíble que queda fuera del rango de tres niveles (F11-7) dispara bandera como un `unknown`. Los rangos de hasta tres niveles no disparan | 60 | 83 | sin cambio |

La b deja de discriminar: casi la mitad de los riesgos quedaría marcada como extrema, que es la contradicción #3 de la Fase 9. La c es la que más se acerca a lo que escribiste para EV-29 ("un peor caso lejano debe ir al techo/banderas"). Además devuelve la bandera a los riesgos que la tenían en la v0.3. Suma 7 riesgos con `consecuencia_extrema` (S02-R07, S03-R04, S04-R04, S06-R02, S21-R01, S22-R06 y S36-R04) y no cambia ningún `C_raw`, banda ni posición. Los números de la tabla se calcularon desde los factores guardados.

Si elegís la c, hay que cambiar tres textos: §8.2, protocolo §2.3 y la nota "sólo alimenta el techo" de §9.1. Después, el arnés y la regresión se vuelven a correr antes de congelar.

## 6. Errores del dictamen de la 11a

- **CH-108 / EV-43.** El dictamen decía que a protocolo §2.3 le faltaba el campo `prioridad_provisional`. Ya está ahí; lo que falta es la columna en la plantilla. Lo corregí en `cambios-protocolo-v1.md` y en CH-108.
- **El par S22.** El dictamen decía que con F11-3 el par dejaba de invertirse. Sigue invertido: S22-R02 sube de 16 a 32, pero S22-R03 está en 48. La diferencia restante viene de V-contención, no de P.
- **S31-R01.** El dictamen decía que subía. No sube: el dato que usa cuenta el mismo evento, así que F11-3 no lo alcanza.
- **CP-18.** El dictamen lo listaba como caso de origen de F11-9, pero es un cambio de exposición, no una medida anticipatoria. Lo saqué del borrador y de CH-107.

## 7. Lecturas mías dentro de reglas aprobadas

- **F11-4.** Usé este umbral: una unidad entre diez o más equivalentes, con una pérdida de hasta un décimo de la capacidad, y la función sigue entregando. Es mi lectura, no una regla. Hay dos bordes:
  - S28-R02: un local de 15 cerrado de 10 a 16 meses. Más de un año al 93% puede leerse como degradación material.
  - S32-R01, S32-R02 y S32-R04: un equipo de 12, pero cada equipo atiende un contrato.
- **F11-3.** Una cota inferior no fija el nivel. Leí además que tampoco deja el nivel por debajo de lo que la cota misma implica. Por eso los hijos de S05-P01 no cambian.
- **F11-8.** Juzgué si una muerte es "directa y creíble" sólo con la evidencia que cita cada ficha.
- **F11-2.** Revisé sólo las fichas que descuentan la ART de forma explícita.

## Para aprobar (respondido el 2026-10-11 13:21 UTC)

1. ¿Aceptás el borrador, con [F11-1] a [F11-12], como texto de la v1 candidate, salvo lo que cambie el punto 2?
2. ¿Elegís la opción c para el peor creíble y las banderas (sección 5), con su ajuste a §8.2, protocolo §2.3 y §9.1 y una nueva corrida antes de congelar? Si es no, queda la opción a: se saca "y las banderas" de §9.2.
3. ¿Aceptás las 45 fichas nuevas del agente (EV-11-0001 a EV-11-0045, pendientes de revisión) como fichas de la v1 candidate?
4. ¿Aceptás mi lectura de F11-4, incluidos los bordes S28-R02 y S32-R01, S32-R02 y S32-R04?
5. ¿Aceptás que una cota inferior (F11-3) no fija el nivel ni lo deja por debajo de lo que ella implica?
6. ¿Aceptás las cuatro correcciones del dictamen (sección 6), incluida CH-108 sólo para la plantilla?
7. ¿Das por cumplido el gate técnico (0 fail, arnés portado, reglas nuevas con tests, huecos de §1.4.5 y §9.5 cubiertos, 2 `todo` fuera de v1), de modo que la condición 5 pase a "se cumple"?
8. ¿Vas a rehacer tus fichas afectadas (sección 4) antes de congelar? Si es no, se congela con ellas en v0.3 y la lista entra como limitación.
9. ¿Congelar la v1 candidate para la Fase 12?

Con los sí, agrego las filas CH-098 a CH-110 al changelog, paso decisiones y protocolo a la v1 candidate, escribo `v1/metodologia-v1-candidate.md` y `v1/congelamiento.md`, abro el PR desde `task/T-0021-fase-11-v1-candidate` y dejo un comentario corto en EMI-15.
