# Piloto profesional S06 · Fase 12 · Comparación inicial

2026-10-13 · BOS / Risk OS · T-0021 · `F12-PILOTO-EMILIANO-01`.

**Estado:** entregas A y B completadas; cálculos verificados; comparación revelada. Dictamen de Emiliano recibido: rechaza las dos inversiones para prioridad profesional. EV-24 respondida: rechaza el agregador como orden principal y lo acepta sólo como tamizaje condicionado. EV-06/37 respondida con criterio contextual; automatismos legales no verificados. EV-02 respondida con referencia alternativa y controles propuestos. EV-08 respondida: rechaza equivalencia de banda por amenaza terminal. EV-10/20 respondidas con distinción de terminalidad y prioridades estratégica/táctica. Pendientes EV-11, EV-22 y completar un fragmento final económico. La Fase 12 no se declara cerrada.

## Hallazgo principal

El orden calculado con los factores elegidos por Emiliano es **R03 > R05 > R01 > R04 > R06 > R02**. Su orden previo, conservado antes de aplicar las rúbricas, fue **R03 > R01 > R04 > R05 > R06 > R02**.

Hay dos inversiones entre los 15 pares: R05 supera a R01 y a R04 en el cálculo, mientras el juicio previo colocaba ambos por encima de R05. El resto de los pares coincide: **13/15**. No se modificó la v1 ni se reeligieron factores para corregir ese resultado.

La referencia histórica del agente produce el mismo orden que la evaluación B y coincide en las seis bandas. Eso es reproducibilidad dentro de este caso; no resuelve el rechazo profesional de las dos inversiones ni valida los supuestos.

## Dictamen recibido después de la comparación

Emiliano ratifica **R03 > R01 > R04 > R05 > R06 > R02**. Mantiene **R01 > R05** por efectos sistémicos y creación de pasivos frente a caída de ingresos; mantiene **R04 > R05** por vida humana e irreversibilidad. Comprende los cálculos pero no acepta esas prioridades como orden profesional. Las dos discrepancias quedan **confirmadas y no resueltas**; no se cambian factores ni candidate. Ver `dictamen-profesional-emiliano.md` para fundamentos, supuestos y límites. No se declara falsación automática de D14.

## EV-24: rol del producto ordinal

Emiliano **no acepta P × I × V como orden principal**. Aceptación sólo para tamizaje bajo condiciones propuestas de no compensación, vector visible y orden fino profesional. Esto no aprueba la v1 actual ni incorpora un veto: ver `preguntas-revision-profesional.md` y la respuesta indexada en `fuentes/respuestas-emiliano.md`. La Fase 12 sigue abierta, con dos preguntas explícitas pendientes y un fragmento económico incompleto.

## EV-06/37: criterio jurídico contextual

Emiliano distingue exposición penal posible de un veto y propone documentar conducta, conocimiento, rol/delegación, causalidad y decisión cautelar. La respuesta se conserva; no se adopta imputación o clausura automática. Las fuentes oficiales consultadas no respaldan la inevitabilidad propuesta. Detalles y enlaces en `preguntas-revision-profesional.md`. No se cambian factores B ya cerrados ni reglas.

## EV-02: referencia económica alternativa

Emiliano propone facturación normalizada cuando no existe RO positivo, con control patrimonial/liquidez y recalibración específica. El coordinador recomienda probar escala y resistencia financiera en dos lecturas paralelas, sin ponderación ni cortes universales predefinidos. Propuestas pendientes, sin modificación de §4.2. Fuentes y límites en `preguntas-revision-profesional.md`.

## EV-08: banda y amenaza terminal

Emiliano rechaza equivalencia de banda y propone tratamiento diferenciado para amenaza existencial. Se conserva como criterio profesional, con necesidad de distinguir terminalidad de I-econ5por pérdida≥unROanual. No se añade un piso de banda ni atribución cardinal de eficacia aV. Detalle en `preguntas-revision-profesional.md`.

## EV-10/20: remoto extremo y prioridad

Emiliano prioriza el remoto fatal/prolongado y diferencia remoto económico terminal de absorbible: estratégico en el primero, acción táctica del probable moderado en el segundo. Las propuestas no se implementan en el ranking ni se traducen a transferencia que modifique factores. Su última frase sobre >50%ventas sin quiebra quedó incompleta; no se completa ni se usa como corte. Detalle en `preguntas-revision-profesional.md`.

## Resultados con los factores humanos

| Posición B | Riesgo | Posición previa A | C_raw | Banda | Determinante | Safety | Techo plausible |
|---|---|---|---|---|---|---|---|
| 1 | R03 | 1 | 80 | Crítica | econ | sí | 125 |
| 2 | R05 | 4 | 80 | Crítica | econ | no | 100 |
| 3 | R01 | 2 | 75 | Crítica | econ | no | 100 |
| 4 | R04 | 3 | 60 | Alta | econ;pers;cont | sí | 75 |
| 5 | R06 | 5 | 36 | Media | econ;pers | no | 80 |
| 6 | R02 | 6 | 5 | Baja | econ;pers;cont;legal | no | 100 |

Los seis son evaluables bajo sus factores registrados. Los techos no participan en el ranking. Los seis muestran `consecuencia_extrema` con sus valores/rangos; esa bandera tampoco modifica la banda ni el orden. Son derivados de la candidate, no validaciones de los escenarios.

## Explicación mecánica de las dos inversiones

- **R05 frente a R01:** R05 tiene P 4, I-económico 5 y V económico 4: C económico 80. R01 tiene P 5, I-económico 5 y V económico 3: C económico 75. La mayor vulnerabilidad asignada a R05 compensa su P menor. La distinta gravedad económica por encima de nivel 5 no se conserva en el producto ordinal: ambos impactos entran como 5.
- **R05 frente a R04:** R04 tiene P 3 e impactos económico, personas y continuidad 5; con V 4 sus máximos son 60. Sus múltiples dimensiones graves no se suman: el índice toma el máximo. R05 alcanza 80 por Económico. La gravedad humana de R04 se mantiene visible en `safety_critical`, pero esa bandera no impone un piso de banda ni orden.
- **R03 frente a R05:** ambos tienen C 80 e I efectivo 5. El desempate por I-personas coloca R03 (4) por encima de R05 (1), conforme a D10.

Estas son explicaciones del cálculo. Emiliano rechazó esas prioridades profesionales después de conocer la explicación; no se presenta una explicación mecánica como resolución de la divergencia.

## Comparación con la referencia histórica

La referencia es la última ficha de la cadena Fase 8 → Fase 11 para cada riesgo S06. Se recalcularon sus derivados con la v1 congelada. No se creó una evaluación nueva de agente, no se llamó a un producto desplegado y no se presenta como revisión independiente hecha después de este piloto.

| Riesgo | C humano / histórico | Banda humano / histórico | Diferencias en valores: histórico → humano |
|---|---|---|---|
| R01 | 75 / 75 | Crítica / Crítica | valores iguales; rangos/procedencia pueden diferir |
| R02 | 5 / 10 | Baja / Baja | v_cont: 2 → 1 |
| R03 | 80 / 100 | Crítica / Crítica | p: 5 → 4; i_cont: 3 → 2; v_rec: 4 → 5 |
| R04 | 60 / 60 | Alta / Alta | i_pers: 4 → 5 |
| R05 | 80 / 80 | Crítica / Crítica | v_cont: 5 → 4; v_rec: 3 → 4 |
| R06 | 36 / 48 | Media / Media | v_cont: 4 → 3 |

- Coincidencia de evaluabilidad: **6/6**.
- Coincidencia de banda entre ambos evaluables: **6/6**.
- Orden humano B frente a histórico: **15/15 pares**, sin empates; tau-b = 1; top-3 = 3/3.
- Orden previo A frente a B: **13/15 pares**, sin empates; tau-b = 11/15 ≈ 0,733; top-3 = 2/3.

| Factor | Acuerdo exacto | Dentro de ±1 | Pares numéricos |
|---|---|---|---|
| p | 5/6 | 6/6 | 6 |
| i_econ | 6/6 | 6/6 | 6 |
| i_pers | 5/6 | 6/6 | 6 |
| i_cont | 5/6 | 6/6 | 6 |
| i_legal | 6/6 | 6/6 | 6 |
| v_cont | 3/6 | 6/6 | 6 |
| v_rec | 3/5 | 5/5 | 5 |

El par `no_aplica` de recuperación de R06 coincide en ambas evaluaciones y se informa separado de los cinco pares numéricos. No se le asignó un número. No hubo factores `unknown`; varias cifras auxiliares sí son desconocidas y se conservaron como supuestos. Las clasificaciones de procedencia e incertidumbre introducidas por el coordinador están marcadas en el registro, no se atribuyen como nuevas decisiones numéricas de Emiliano.

## Discrepancias y supuestos que siguen abiertos

Los 112 registros de `discrepancias.csv` incluyen diferencias de valores, rangos, procedencia, derivados y orden. No son 112 problemas independientes: varias filas describen el efecto de una misma diferencia. `observaciones-de-interpretacion.csv` conserva por cada factor los supuestos y observaciones recogidos; las respuestas completas y aclaraciones siguen en `etapa-b/registro.md` y entrega A. Ninguna discrepancia se cierra sólo por haber recibido explicación del coordinador. Las dos inversiones A/B ahora tienen dictamen explícito y estado confirmado, no resuelto.

Puntos de mayor impacto:

1. **Defendibilidad de R05 sobre R01 y R04.** La relación es la misma con factores históricos y humanos, pero difiere del juicio previo. No basta el acuerdo entre evaluadores para aceptarla.
2. **I-personas de R06.** Emiliano eligió 3 con máximo 4 por considerar adicional la coincidencia de caída y persona. El objeto fijo ya incluye estiba que cae sobre una persona; debe decidirse si el máximo fatal está condicionado por otra coincidencia fuera del evento. No se alteró su 3. Con esa elección la bandera safety es false: máximo 4 no la dispara porque no es unknown ni queda fuera del rango de tres niveles (regla de banderas congelada). No se interpreta la ausencia de bandera como imposibilidad de muerte.
3. **Recuperación parcial probada frente a informalidad.** R01, R02 y R05 tienen antecedentes parciales; §5.4 admite alternativa probada parcial en nivel 3. El revisor dio mayor peso a disponibilidad futura, formalidad y corto plazo. La regla de 12 meses pertenece a P, no es un límite universal de duración para V.
4. **P y ajustes.** Algunas razones para no ajustar exigen recurrencia propia para alcanzar 4/5; §3.4 admite ajustes por condiciones distintas a la fuente. Valores humanos conservados y diferencias abiertas.
5. **Margen económico de R05.** USD 706.000 equivalen a pérdida de resultado sólo bajo el supuesto explícito de que ningún costo desaparece antes de respuesta; margen real permanece desconocido. Se conserva nivel 5 y rango 4–5, con ahorro activo supuesto separado, sin reescribir la regla. Captación spot aparece como contención y recuperación: frontera causal pendiente.
6. **Escenarios y costos brutos.** Liberación de amoníaco, curvas térmicas, daños homogéneos, víctimas y plazos judiciales son supuestos profesionales; no se realizaron mediciones ni dictámenes que los prueben. El nivel económico 5 de R03/R04 puede fijarse por el piso material supuesto aunque falten costos ART; eso no convierte la suma en costo bruto completo conocido.
7. **Prueba de contención en R06.** El incidente de marzo de 2023 queda fuera de tres años al corte; curso de 2024 no demuestra ensayo completo. Se corrigió esa etiqueta sin sustituir el valor humano 3.

## Procedencia y límites

- Emiliano declaró no conocer S06. El caso no estaba en sus 30 fichas de Fase 8; no se deduce de eso independencia completa ni ausencia de exposición al diseño general de la metodología.
- Un caso sintético, seis riesgos, un profesional. Muestra dirigida, no representativa. Fue un piloto guiado con aclaraciones del coordinador, registradas. La coordinación tenía exposición a resultados generales de Fase 11.
- A se cerró antes de mostrar rúbricas y resultados calculados. B se completó antes de abrir la referencia histórica para este cruce. Se conservaron snapshots y huellas. Las fichas siguen `pending`: entrega completa no es aceptación profesional del resultado.
- No participaron Evangelina, Manuel ni otros revisores. No hubo estudio de dispersión, inspección del compresor, ensayo de equipos, asesoramiento médico ni dictamen jurídico. No hay conclusión de generalización ni falsación automática de D14.
- Esta comparación no cierra Fase 12 ni EMI-15. Se recibió el dictamen profesional sobre las inversiones; faltan las preguntas de §16, otros estados de discrepancias y decidir alcance de revisión con profesionales nuevos.

## Verificación reproducible

Se usaron funciones congeladas de `v0/fase-11/regresion.py` y del arnés TypeScript; no se editaron para este cálculo. `comparar-piloto.py` reconstruye CSV, métricas y registro de diferencias desde el snapshot B y las fuentes históricas. `verificar-piloto.mjs` cruza las doce fichas calculadas con la segunda implementación.

Salida literal de la comprobación independiente:

```
PASS: 144 derivados y posiciones coinciden entre Python y TypeScript; 12 fichas, sin cambiar factores.
```

El acuerdo prueba reproducción mecánica de la v1 para estos factores; no prueba que los factores ni los escenarios sean correctos.

## Próxima respuesta profesional

Emiliano ya valoró las dos inversiones y mantuvo el orden previo. EV-24 y EV-06/37 fueron respondidas y registradas; EV-02 también fue respondida; EV-08 también fue respondida; EV-10 y EV-20 también fueron respondidas; continúan EV-11 y EV-22, y se solicita completar el fragmento económico final. Todas estas respuestas son posteriores a revelación y se registran por separado. Cualquier cambio posterior conserva A/B y la v1 congelada.

## Huellas

HEAD del checkout usado: `89b31bac2df588463e91c4e8c15ad47746c57451`. Fuentes y entregas con cambios locales explícitos; no se afirma que el HEAD contenga el piloto.

| Archivo relativo a T-0021 | SHA-256 |
|---|---|
| `v0/fase-12/piloto-emiliano/entrega-a-cerrada-2026-10-13.md` | `4b456e73737f901371a223cb89299085a61e0e2a72cb6f60c9d80c686c193c72` |
| `v0/fase-12/piloto-emiliano/etapa-b/fichas-emiliano-cerradas.csv` | `27922352243c5e3f92f82509e0c733038906eea5b5d2756c32afc11e686dcdaf` |
| `v1/metodologia-v1-candidate.md` | `c21ebbec07c65854c03746809ff53e80c36811cb373ed10973a165f84347fec0` |
| `v0/fase-8/agente/agro-y-alimentos/fichas.csv` | `71bbff86f57b1a9ec5a0c5b3ad5bd5f0fd082f612f07f0de0b29f50c27634a1f` |
| `v0/fase-11/reevaluacion/fichas-reevaluadas.csv` | `e6997c42a531328b750b7edab85cc68b86bde280a12a3f900d514d86e423d018` |
| `v0/fase-11/reevaluacion/fichas-ronda-2.csv` | `7c8472b3e23cb6c5db97278c9ea57e15c4a0ebb5db0dd691f4bdfcdc13f35ce7` |
