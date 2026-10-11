# Decisiones de Emiliano sobre el dictamen de la Fase 11a

> Mensaje de Emiliano en el hilo "Fase 11a dictamen v1 candidate", **2026-10-11 12:18:47 UTC**, sobre el "Para decidir" de `dictamen-fase-11.md`. El mensaje está copiado tal cual en el anexo. La tabla resume lo que decidió. Donde pidió una precisión de redacción, el texto de "Texto aprobado" la incorpora con sus palabras. Ese texto final se vuelve a mostrar en el "Para aprobar" de `reporte-fase-11.md`.

## Resultado

**A / A / A / A / A / A / A / A / A / A / A / B / A.** Aprueba 12 de 13. Cambia el punto 12: los cinco veredictos llevan el estado que él escribió. Crea la v1 candidate en la 11b, sin una v0.4 intermedia.

## Por punto

| # | Punto | Salida | Decisión | Texto aprobado o nota |
|---:|---|---|---|---|
| 1 | D14 (S22, S27, S31) | — | A | No cuentan. **D14: 1 de 3, no falsada.** |
| 2 | EV-01 escenarios mezclados | a | A, con precisión | Metodología §1.3.4, agregar: "Cada factor se evalúa con **un único escenario de referencia**: el que la información muestra como más plausible o frecuente entre los que junta la ficha, si hay base para elegirlo. Todos los valores oficiales salen de ese mismo escenario; no se toma la P de uno y la I o la V de otro. Los demás escenarios van a `<f>_max` y a la observación. Si no hay base para elegir el escenario de referencia, el factor cuyas consecuencias difieren es `unknown` con el rango que cubre los escenarios (§9.2)." |
| 3 | EV-03 ART | a | A | Texto del dictamen (§4.1.7), sin cambio. |
| 4 | EV-04 comparabilidad | a | A | Texto del dictamen (§3.2.1), sin cambio. |
| 5 | EV-05 degradación | a | A, con precisión | Metodología §4.4, agregar: "Si la función pierde una unidad entre muchas equivalentes y sigue funcionando **sin degradación material de capacidad, throughput o nivel de servicio**, no es degradación de una función crítica: es nivel 1." |
| 6 | EV-16 banderas con `unknown` | a | A | Texto del dictamen (protocolo §2.3 y metodología §8.2), sin cambio. |
| 7 | EV-29 peor creíble | a | A | Texto del dictamen (§9.2), sin cambio. |
| 8 | EV-30 muerte plausible | a | A, con precisión | Metodología §4.3, agregar: "Para Personas este es el criterio del valor, no el resultado más frecuente de §9.1.1: si una muerte es **una consecuencia directa y creíble del evento definido**, sin agregar otra coincidencia causal, I-personas es al menos 4 aunque lo más frecuente sea una lesión. **No alcanza con que sea físicamente imaginable.** Si requiere una coincidencia adicional, la muerte va a `i_pers_max`." |
| 9 | EV-32 medida anticipatoria | a | A | Texto del dictamen (§5.1), sin cambio. Criterio causal, no cronológico. |
| 10 | EV-18, EV-28, EV-43, EV-17 | a | A | Se aplican los cuatro. **El arnés actualizado es un gate antes de congelar** (ver el punto 12, condición 5). |
| 11 | Salidas b, c y d | b/c/d | A | Se aceptan en bloque: 20 limitaciones, 9 puntos en 8 preguntas, 3 fuera de v1. |
| 12 | Cinco veredictos | — | **B** | Se reemplazan por los estados de la tabla siguiente. |
| 13 | Crear la v1 candidate | — | A | Sí, en la 11b: aplicar las correcciones, correr la regresión y el arnés, congelar y recién entonces la Fase 12. |

## Estado de las cinco condiciones (punto 12, palabras de Emiliano)

| Condición | Estado |
|---|---|
| 1. Casos de propiedad | **Suficientes para avanzar a candidate, con limitaciones; no validados independientemente.** 13 PASS de 20, 8 circulares; 4 FAIL estructurales y 3 de calibración. |
| 2. Divergencias interpretables | **Se cumple con limitación.** `evaluable` 80%, kappa 0,20: necesita repetición independiente. |
| 3. Bandas que discriminan | **No alcanza formalmente el target preregistrado; aceptable provisionalmente para candidate.** 16/23 = 69,6% < 70%; 62,2% en Media; concentración en 45–48. |
| 4. Ranking profesionalmente defendible | **Prometedor/provisional; pendiente de validación profesional.** 23/25 pares sintéticos. |
| 5. Regresión estable | **Pendiente de gate técnico 11b; si el arnés portado pasa, se cumple.** Condición para congelar: 0 fail, arnés portado a la candidate, tests de las reglas nuevas y los huecos relevantes cubiertos. Los `todo` que quedan sólo si están explícitamente fuera de v1; ningún test pendiente sobre una regla que entra en v1. |

## Decisión adicional (antisobremodelado)

**Techo plausible (§6.6):** no se elimina. Uso en Risk OS v1: **detalle del riesgo, vista y cola de validación, y soporte de banderas; nunca ranking.**

---

## Anexo · mensaje de Emiliano, tal cual

> 2026-10-11 12:18:47 UTC · "say it" (Emiliano), en el hilo de la Fase 11a. Las marcas `:chatgpt-content-reference{…}` están en el original.

Sí. Revisé los 13 como gate para pasar de v0.3 a **v1 candidate**, no como aprobación automática de las recomendaciones. Mi resultado es:

**A / A / A / A / A / A / A / A / A / A / A / B / A.**

El único punto que **no aprobaría tal como está redactado es el 12**. Además haría pequeñas precisiones de redacción en EV-01, EV-05 y EV-30.

| # | Decisión | Mi criterio |
|---:|---|---|
| **1. D14** | **A** | **No cuentan** S22/S27/S31. No hubo adjudicación humana previa; usar ahora la intención del generador como verdad rompería el protocolo. S22 además falla por asignación de P, no aisla D14. S27 y S31 pertenecen al mismo patrón G2 ya conocido. D14 queda **1/3, no falsada**. |
| **2. EV-01 escenarios mezclados** | **A, con precisión** | Si la lista fija mezcla escenarios, usar **un único escenario de referencia más plausible/frecuente para los valores oficiales**, no permitir que cada factor elija implícitamente escenarios diferentes. Los demás alimentan máximos/observación. Sin base para seleccionar el escenario de referencia, el factor afectado queda `unknown`. |
| **3. EV-03 ART** | **A** | Es consecuencia directa de D17: la criticidad es bruta de transferencia. Que ART pague una consecuencia no debe hacer parecer que el evento produce menor daño económico bruto; la transferencia se muestra aparte. |
| **4. EV-04 comparabilidad** | **A** | Una frecuencia sólo puede fijar P si mide **el mismo evento iniciador**. Una estadística de "eventos con lesionados" no puede fijar la frecuencia de "todos los eventos"; es una cota inferior. Es una corrección de validez de medición, no sobreajuste. |
| **5. EV-05 degradación** | **A, con precisión** | Correcto que perder una unidad redundante sin afectar materialmente la función sea continuidad 1. Cambiaría "sin un cambio que el cliente note" por **"sin degradación material de capacidad, throughput o nivel de servicio de la función"**, porque hay funciones internas sin cliente visible. |
| **6. EV-16 banderas + unknown** | **A** | Es coherente con nuestra separación score/techo. Una dimensión unknown cuyo máximo plausible alcanza un extremo debe disparar la **bandera de visibilidad**, aunque no cambie `C_raw`, banda ni ranking. |
| **7. EV-29 peor creíble** | **A** | Es exactamente R1 bien aplicado: el límite de tres niveles controla la **incertidumbre sobre el valor oficial**, no la distancia hasta el tail credible. Un peor caso lejano debe ir al techo/banderas, no expulsar del ranking a un riesgo con valor plausible bien sustentado. |
| **8. EV-30 muerte plausible** | **A, con precisión** | Si una muerte es una **consecuencia directa y creíble del evento definido**, sin agregar otra coincidencia causal, `I_personas ≥ 4`. No basta con que sea físicamente imaginable. Si requiere una coincidencia adicional, va a `i_pers_max`. Esto coincide con nuestra semántica de impacto potencial. |
| **9. EV-32 medida anticipatoria** | **A** | El criterio correcto es causal, no cronológico. Si la medida evita el evento → P. Si el evento ya está en curso/inminente y la medida limita sus consecuencias → contención, aunque la acción material ocurra segundos/minutos antes del daño. |
| **10. EV-18/28/43/17** | **A** | Aplicaría los cuatro. Son cierres de texto/harness y no introducen un mecanismo nuevo. El arnés actualizado debe ser un gate antes de congelar la candidate. |
| **11. Salidas b/c/d** | **A** | La separación es buena: las limitaciones quedan explícitas, las cuestiones normativas van a revisión profesional y lo que no tiene uso en Risk OS v1 queda fuera. Evita seguir modelando para satisfacer el dataset. |
| **12. Cinco veredictos** | **B** | No aceptaría que los cinco digan "se cumple con limitación". Hay una diferencia importante entre **suficiente para crear una candidate** y **condición empíricamente demostrada**. Abajo propongo los cinco estados correctos. |
| **13. Crear v1 candidate** | **A** | Sí. Precisamente porque Fase 12 será la primera evidencia independiente. Aplicar estas correcciones, correr regresión y arnés, congelar y recién entonces exponerla a revisión profesional. No abriría una v0.4 adicional. |

El fundamento general del punto 13 está muy bien expresado en el propio dictamen: toda la evidencia usada hasta acá está dentro de la muestra y cualquier corrección de 11b también estará ajustada a esa evidencia; **la primera evidencia independiente de la v1 candidate será Fase 12**. :chatgpt-content-reference{index="0"}

### El cambio importante: punto 12

No cambiaría los datos; cambiaría **el lenguaje de los veredictos** para no afirmar más evidencia de la que tenemos.

**1. Casos de propiedad:**
→ **"Suficientes para avanzar a candidate, con limitaciones; no validados independientemente."**

No diría simplemente "se cumple". Hay 13 PASS de 20, pero 8 de esos PASS son circulares y siguen existiendo cuatro FAIL estructurales conocidos más tres de calibración. :chatgpt-content-reference{index="1"}

**2. Divergencias interpretables:**
→ **"Se cumple con limitación."**

Acá sí estoy de acuerdo. Los desacuerdos tienen causas identificadas y las correcciones propuestas atacan las ambigüedades principales. Pero la evaluabilidad todavía tiene sólo 80% de acuerdo y kappa 0,20, así que necesita repetición independiente. :chatgpt-content-reference{index="2"}

**3. Bandas que discriminan:**
→ **"No alcanza formalmente el target preregistrado; aceptable provisionalmente para candidate."**

Ésta es importante: `16/23 = 69,6%` es **menor que 70%**. Que falte una sola ficha no convierte el target en cumplido. Además 62,2% cae en Media y existe una concentración grande en 45–48. :chatgpt-content-reference{index="3"}

No bloquearía la candidate por 0,4 puntos porcentuales con n=23, pero tampoco diría que el requisito se cumplió.

**4. Ranking profesionalmente defendible:**
→ **"Prometedor/provisional; pendiente de validación profesional."**

Tenemos 23/25 pares sintéticos como se esperaba, pero "profesionalmente defendible" es precisamente algo que todavía **no evaluó un profesional independiente**. El propio informe reconoce esto. :chatgpt-content-reference{index="4"}

**5. Regresión estable:**
→ **"Pendiente de gate técnico 11b; si el arnés portado pasa, se cumple."**

La regresión actual está estable, pero el arnés todavía está en v0.2 y tiene siete `todo`. :chatgpt-content-reference{index="5"} Antes de congelar la candidate exigiría:

**0 fail + portado a candidate + tests de las nuevas reglas + los huecos relevantes cubiertos.**

No necesitamos que todos los `todo` conceptuales desaparezcan si explícitamente están fuera de v1, pero no congelaría con tests pendientes sobre reglas que sí entran en v1.

### Tres precisiones de diseño que sí pondría en el texto

Para **EV-01**, evitaría un "Frankenstein" en el que P venga del escenario A, I del B y V del C. La regla debe decir **"escenario de referencia"** en singular para los valores oficiales. La propuesta actual aparece en el dictamen como corrección de las fichas que mezclan escenarios. :chatgpt-content-reference{index="6"}

Para **EV-05**, conservaría la idea pero hablaría de **degradación material de la función** y no sólo de algo que "el cliente note". El hallazgo original está bien: una unidad entre muchas equivalentes no debería generar una interrupción crítica si la capacidad/servicio permanece materialmente intacta. :chatgpt-content-reference{index="7"}

Para **EV-30**, especificaría que "puede producir una muerte" significa **consecuencia directa y creíble del escenario**, no mera posibilidad física. La diferencia es importante porque esta decisión puede elevar `I_personas` en muchas fichas y, por ende, alterar materialmente la distribución de `safety_critical`. :chatgpt-content-reference{index="8"}

### Un asunto adicional que cerraría antes de congelar

El análisis antisobremodelado encontró que el **techo plausible §6.6 todavía no tiene una pantalla explícita asignada**, mientras que EV-29 depende justamente de separar valor oficial de peor creíble. :chatgpt-content-reference{index="9"}

Yo no lo eliminaría. Le asignaría explícitamente este uso:

> **Techo plausible → detalle del riesgo + vista/cola de validación + soporte de banderas; nunca ranking.**

Eso vuelve a cerrar el circuito de R1 sin crear una nueva pantalla obligatoria.

Mi dictamen final sería entonces: **aprobar 12 de las 13 decisiones propuestas; modificar el punto 12 para distinguir rigurosamente "candidate-worthy" de "validado". Luego ejecutar 11b, exigir regresión/arnés verde y congelar `v1 candidate` para Fase 12.**
