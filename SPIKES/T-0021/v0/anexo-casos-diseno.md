# ⛔ No abrir antes de completar adjudicacion-casos.md.

# Anexo de diseño · casos de propiedad v0

> Fase 2 del plan EMI-15 + EMI-41 · 2026-10-05. Intención del diseñador para cada caso de `casos-de-propiedad.md`: qué reglas de `decisiones-v0.md` pone a prueba, qué terna espera para cada riesgo y qué anomalías puede disparar.
> Este anexo **no** contiene productos `P × I × V`, combinaciones de factores ni el orden resultante. Eso lo hace el dry run de la Fase 4, que además verifica si la narrativa lleva sin ambigüedad a estas ternas; si no lleva, es un FAIL — definición.

## Notación y supuestos del diseñador

Terna: `P / I(eco, personas, continuidad, legal) / V`. Rango, cuando lo hay: `valor plausible [mín–máx]`.

Las anclas de nivel se escriben en la Fase 3. Para fijar las ternas, el diseñador usó estas anclas provisorias. **No son reglas**: si la Fase 3 escribe otras, las ternas se revisan con ellas.

| Nivel | P (12 meses) | Económico (pérdida / resultado operativo anual) | Personas | Continuidad | Legal/regulatorio | V (desde el evento) |
|---|---|---|---|---|---|---|
| 1 | Nunca aquí ni en comparables conocidas | < 5% | Sin lesiones | Horas | Sin consecuencia | Contiene y recupera rápido con medios probados |
| 2 | No aquí; sí en comparables | 5–15% | Lesiones leves | Hasta un día | Observación, acta | Buena, con huecos menores |
| 3 | Aquí una vez en años recientes, o condiciones causales presentes | 15–40% | Lesiones con baja | Días a una semana | Sanción | Parcial: algo existe, sin probar o incompleto |
| 4 | Aquí alrededor de una vez por año | 40–100% | Una muerte o lesión grave permanente | Semanas a un mes | Suspensión temporaria, responsabilidad relevante | Débil: casi nada organizado |
| 5 | Aquí varias veces por año | > 100% | Varias muertes | Meses, o no puede recuperar funciones críticas | Pérdida de habilitación, clausura definitiva | Nula |

Anomalías A1–A10: las de `decisiones-v0.md` (la Fase 1 puede ajustarlas).

---

## CP-01 · Cinco riesgos de una planta de envases

Plan, Fase 2 #1 · revisión, caso 1.
**Pone a prueba:** P5, D14 (simetría del producto, C4), D10 (desempates), P3.

| Riesgo | Terna |
|---|---|
| R1 · caldera | 1 / I(5, 5, 5, 4) / 4 |
| R2 · sala de impresión | 4 / I(5, 4, 5, 2) / 1 |
| R3 · corte de red | 5 / I(3, 1, 4, 1) / 1 |
| R4 · rechazo de lotes | 5 / I(2, 1, 1, 1) / 2 |
| R5 · pago a cuenta falsa | 2 / I(2, 1, 1, 1) / 5 |

- R1: P1 porque no hubo explosiones ni en la planta ni en el sector en quince años y la caldera está inspeccionada. Eco 5 (destrucción de la planta y meses parada, muy por encima de USD 6 M); personas 5 (40 operarios contiguos); continuidad 5 (meses, planta única); legal 4 (clausura probable, no definitiva). V4: hay plan escrito y bomberos, pero sin brigada, sin ensayo y sin reemplazo.
- R2: P4 por dos principios de incendio en tres años. I bruto es el fuego sin nada que lo detenga: eco 5 y continuidad 5 (pérdida de la planta); personas 4 (pocos operarios en la sala); legal 2. V1: CO₂ automático probado, cortafuego, brigada con simulacros y planta hermana.
- R3: P5 por ocho a diez cortes por año. Eco 3 (USD 1,5 M ≈ 25%); continuidad 4 (dos a tres semanas). V1: grupo con transferencia automática probado y UPS; en los últimos cortes no se detuvo nada.
- R4: P5 por seis a ocho rechazos por año. Eco 2 (USD 300–500 mil ≈ 5–8%). V2: trazabilidad, reproceso y respuesta en el día, pero el costo igual se paga.
- R5: P2 (no pasó aquí, sí a dos empresas de la zona; doble firma). Eco 2 (USD 400 mil ≈ 7%). V5: nada después del pago.

**Anomalías posibles:** A4 (colisiones), A8, A10 en R2 (¿el muro cortafuego es contención, V, o algo que la planta *es*, I?), A7/A10 en R3 (si el evento se define como "parada de línea" en lugar de "corte de red", el grupo electrógeno pasa a P).

---

## CP-02 · La falla de todos los días contra el accidente que nunca pasó

Plan, Fase 2 #2 · revisión, caso 2. **Fuerza la contradicción abierta #2 (P6 ↔ D20 + D12).**
**Pone a prueba:** P6, D20, D10, D12, D14.

| Riesgo | Terna |
|---|---|
| R1 · cinta clasificadora | 5 / I(3, 1, 3, 1) / 3 |
| R2 · colapso de estanterías | 2 / I(4, 5, 3, 4) / 4 |

- R1: P5 (una o dos veces por mes). Eco 3 (USD 800 mil ≈ 20%); continuidad 3 (uno a tres días de atraso). V3: mecánico en un turno, repuestos parciales, clasificación manual al 40%.
- R2: P2 (nunca aquí; golpes sin colapso; colapsos en el sector). Eco 4 (USD 3 M ≈ 75%); personas 5 (25 personas debajo); continuidad 3 (sector clausurado, el resto opera); legal 4 (clausura del sector). V4: sin rescate, sin ensayo, hospital a 40 minutos. Dispara `consecuencia_extrema`.

**Anomalías posibles:** A3, A8. A1 en la P de R2: los dos golpes sobre parantes pueden leerse como "condiciones causales presentes" (P3).

---

## CP-03 · Frecuente y peligroso, pero muy bien manejado

Plan, Fase 2 #3 · revisión, caso 4 (peligro mayor bien gestionado).
**Pone a prueba:** D14 (peso simétrico de V, I6), D19 (I bruto antes de controles posteriores), D15, D20.

| Riesgo | Terna |
|---|---|
| R1 · fuga de amoníaco | 5 / I(3, 5, 3, 4) / 1 |
| R2 · robo de camión | 3 / I(2, 3, 1, 1) / 3 |

- R1: P5 (cuatro a seis fugas por año). I bruto es la fuga sin detección ni ventilación: personas 5 (120 personas en nave cerrada); legal 4 (clausura e investigación); eco 3 y continuidad 3 (parada de días a semanas). V1: detección con cierre automático, ventilación, brigada, simulacros trimestrales y evacuación medida en menos de tres minutos. Dispara `consecuencia_extrema`.
- R2: P3 (un robo el año pasado; zona con robos). Eco 2 (USD 250 mil ≈ 12%); personas 3 (chofer herido). V3: GPS, sin recupero ni protocolo.

**Anomalías posibles:** A8; A10 si el evaluador cuenta los detectores en P (los detectores actúan después de la fuga) o carga en I el desenlace real de las fugas pasadas.

---

## CP-04 · La inversión más grande

Plan, Fase 2 #4 · revisión, caso 11. **No se fusionó con P11** (ver CP-18): acá la mejora es de V con I extremo intacto; en CP-18 la mejora es de la dimensión dominante de I.
**Pone a prueba:** P9, P11, D2, D16, D18, D20 (la bandera no se apaga), D22 (`accion_ejecutada`), P10.

| Riesgo | Antes | Después |
|---|---|---|
| R1 · centro de datos | 1 / I(5, 2, 5, 4) / 5 | 1 / I(5, 2, 5, 4) / 2 |
| R2 · fraude interno | 3 / I(3, 1, 1, 3) / 3 | sin cambio |

- R1: P1 (edificio nuevo, sin antecedentes aquí ni en la región). Eco 5 (penalidades por encima del resultado anual); personas 2 (pacientes con demoras en la dispensa); continuidad 5 (meses); legal 4 (incumplimiento con obras sociales). V antes 5: las copias evitan perder los datos pero no acortan los meses sin operar. V después 2: conmutación probada en seis horas con dos horas de pérdida, evidencia `observed` firmada por un auditor. No 1, por la pérdida de transacciones y porque hubo una sola prueba.
- R2: eco 3 (USD 500 mil ≈ 28%), legal 3 (sanción de la obra social).

**Anomalías posibles:** A8 si la banda no se mueve. A9 si el evaluador duda de la base de la evidencia.

---

## CP-05 · Un golpe fuerte en un lugar contra un golpe fuerte en todos

Plan, Fase 2 #5 · revisión, caso 8.
**Pone a prueba:** D5 (`max()`), D11, D10 (desempate por amplitud), P5.

| Riesgo | Terna |
|---|---|
| R1 · robo de producto | 3 / I(4, 1, 1, 1) / 3 |
| R2 · lote contaminado | 3 / I(4, 4, 4, 4) / 3 |

- P3 en los dos: un intento o una falla hace dos años, condiciones presentes.
- R1: eco 4 (USD 2,5 M ≈ 62%); nada más.
- R2: eco 4 (retiro por USD 2,5 M); personas 4 (enfermedad grave, posible muerte); continuidad 4 (tres a cuatro semanas cerrada); legal 4 (suspensión temporaria).
- V3 en los dos: algo existe (alarma monitoreada; procedimiento de retiro escrito) sin respuesta efectiva probada.

**Anomalías posibles:** A4, A5, A8. A1 en V: la narrativa busca V iguales con hechos distintos; si los evaluadores no coinciden, el caso pierde su control.

---

## CP-06 · Dos depósitos, uno protegido

Plan, Fase 2 #6 · revisión, caso 6.
**Pone a prueba:** D15 (corte P/V), D4, P1, D19 (personas en bruto, antes de la evacuación).

| Riesgo | Terna |
|---|---|
| R1 · depósito Norte | 3 / I(4, 4, 3, 2) / 4 |
| R2 · depósito Sur | 3 / I(4, 4, 3, 2) / 2 |

- P3 en los dos: un principio de incendio en cada depósito en cinco años; prevención idéntica (termografía, zona de carga separada). Detección y rociadores actúan después de la ignición: no tocan P.
- I idéntico: eco 4 (USD 3 M ≈ 60%); personas 4 (30 personas sin alarma: una muerte o lesión grave es plausible); continuidad 3 (el otro depósito despacha reducido); legal 2.
- V: Norte 4 (matafuegos y brigada sin entrenamiento); Sur 2 (detección monitoreada, rociadores probados, brigada).

**Anomalías posibles:** A10 si el evaluador baja también la P del Sur ("se incendia menos"); A6 si define el evento como "incendio que se propaga". Personas podría leerse como 5 (varias muertes): A1.

---

## CP-07 · Un laboratorio y sus datos

Plan, Fase 2 #7 · revisión, caso 7. Doble evaluador recomendado.
**Pone a prueba:** D15, D4, D19, D5.

| Riesgo | Terna |
|---|---|
| R1 · ransomware | 3 / I(4, 2, 4, 3) / 2 |
| R2 · robo de datos con una credencial | 3 / I(3, 2, 1, 4) / 4 |

- R1: P3 (sector atacado, phishing semanal; doble factor, parches y antivirus lo bajan de la frecuencia del sector). I bruto sin respaldo: eco 4 (dos a cuatro semanas sin facturar en 14 sedes); continuidad 4; legal 3; personas 2 (resultados demorados). V2: copias inmutables, restauración probada en 72 horas, firma de respuesta contratada.
- R2: P3 (el acceso restringido no reduce el phishing). El evento es "descarga con la credencial de un empleado", y lo que esa credencial ve es parte de cómo está organizada la empresa: por eso el acceso por sede va a I (unos 30 mil pacientes), no a P. Legal 4 (datos de salud, notificación, responsabilidad); eco 3; personas 2. V4: sin monitoreo, sin alertas, sin procedimiento de notificación.

**Anomalías posibles:** A10 si el acceso por sede baja P y además limita I; A2 o A6 si el evaluador no sabe dónde ubicarlo; A1 en la P de R1.

---

## CP-08 · Lo que no se sabe

Plan, Fase 2 #8 · revisión, caso 10.
**Pone a prueba:** P2, D8 (valor plausible, rango, techo, `unknown`, lista "no evaluable"), D9, D20 sobre un riesgo no evaluable; toca la contradicción #6 (procedencia por factor).

| Riesgo | Terna |
|---|---|
| R1 · explosión de polvo | 2 [2–3] / I(3 [3–4], 3 [3–4], 3 [3–4], 2) / 3 [2–4], `uncertainty` high |
| R2 · planta recién comprada | `unknown` / I(3 [2–4], 5, 2, 3) / `unknown` |
| R3 · camiones en la cosecha | 4 / I(2, 3, 1, 1) / 2 |

- R1: P plausible 2 (no le pasó a la empresa; sí a una planta comparable), con condiciones causales visibles que llevan el techo a 3. I plausible 3 (sólo la torre), techo 4 (torre y dos silos); personas 3 (un operario en cabina) con techo 4. V plausible 3 (brigada sin ejercicios), rango 2–4.
- R2: no existe un valor defendible de P ni de V. I tiene valor plausible: personas 5 (12 trabajadores; en el sector estas explosiones suelen matar a varios); eco 3 [2–4] (planta chica frente a la empresa); continuidad 2; legal 3. Va a la lista "no evaluable" con `consecuencia_extrema = true`.
- R3: P4 (una vez cada uno o dos años). Eco 2, personas 3. V2: seguimiento y capacitación.

**Anomalías posibles:** A2, A9; A1 en R1 si un evaluador usa el techo como valor. La bandera de revisión prioritaria de D9 depende de la banda de R1, que no existe hasta la Fase 9.

---

## CP-09 · La póliza

Plan, Fase 2 #9 · revisión, caso 13.
**Pone a prueba:** D17 (siempre bruto), D18, P9, P10, D22 (`accion_ejecutada`), D19, D20.

| Riesgo | Antes | Después |
|---|---|---|
| R1 · explosión en la nave de llenado | 2 / I(5, 5, 5, 3) / 3 | 2 / I(5, 5, 5, 3) / 3 |

- P2: dos explosiones en el sector en una década, ninguna aquí.
- I: eco 5 (nave, meses sin llenar y responsabilidad civil, muy por encima de USD 3 M); personas 5 (20 por turno); continuidad 5 (meses sin llenar en esa planta); legal 3. La otra planta es redundancia y va a V, no a I.
- V3: brigada entrenada y la otra planta abastece el 60%.
- Después: los factores no cambian. El retenido económico (≈ nivel 2) se registra en `risk-transfer`.

**Anomalías posibles:** A8 si el usuario espera ver bajar algo; A10 si la otra planta se cuenta en continuidad y en V.

---

## CP-10 · La acción que no rindió lo esperado

Plan, Fase 2 #10 · revisión, caso 18. **Fuerza la contradicción abierta #5 (D16 + D18 ↔ P10).**
**Pone a prueba:** D16, D18, P9, P10, D22 (`accion_ejecutada`), D2.

| Riesgo | Antes | Esperado por la acción | Reevaluado |
|---|---|---|---|
| R1 · contaminación de la red | 3 / I(2, 4, 2, 3) / 4 | V 2 | 3 / I(2, 4, 2, 3) / 3 |

- P3: una rotura con contaminación localizada en cuatro años.
- I: personas 4 (brote con enfermedad grave y posible muerte de vulnerables); legal 3 (intervención del ente); eco 2; continuidad 2.
- V antes 4 (muestreo semanal, sin aviso a la población). Esperado 2. Reevaluado 3: sensores instalados pero dos con cortes del 30%, protocolo sin ensayo.

**Regla faltante:** el estado de la acción cuando la reevaluación no confirma el cambio esperado, y qué se registra con la diferencia.
**Anomalías posibles:** A8; A2 sobre el estado de la acción.

---

## CP-11 · La misma pérdida en dos empresas

Plan, Fase 2 #11 · revisión, caso 9.
**Pone a prueba:** D5 (ancla económica relativa al resultado operativo), D19 ("esta organización"), D20, D11.

| Riesgo | Terna |
|---|---|
| R1 · empresa A, supermercados | 3 / I(2, 1, 1, 1) / 4 |
| R2 · empresa B, golosinas | 3 / I(5, 1, 1, 1) / 4 |

- P3 en las dos: una persona con firma propia, sin casos previos, auditoría anual (condiciones presentes).
- Eco: A, USD 1,5 M sobre USD 30 M = 5% (en el borde entre 1 y 2; el diseñador pone 2); B, USD 1,5 M sobre USD 1 M = 150% → 5, que dispara `consecuencia_extrema` sólo en B.
- V4 en las dos: sin seguro, poca chance de recuperar, descubrimiento tardío.

**Regla faltante:** cómo se ordenan riesgos de empresas distintas en una misma lista (EMI-41 compara empresas).
**Anomalías posibles:** A8; A1 en el eco de A, por el borde.

---

## CP-12 · Uno grande o tres chicos

Plan, Fase 2 #12 · revisión, caso 15.
**Pone a prueba:** D21, D10, D15 (perfil mixto en la forma A), P5.

| Riesgo | Terna |
|---|---|
| R1 · forma A, agregada | 4 / I(3, 1, 3, 2) / 3 (mixto) |
| R1a · corte eléctrico | 4 / I(3, 1, 3, 2) / 1 |
| R1b · climatización | 3 / I(3, 1, 3, 2) / 4 |
| R1c · enlace | 4 / I(3, 1, 3, 2) / 4 |
| R2 · filtración de datos | 3 / I(3, 1, 1, 4) / 3 |

- Forma A: P4 (cinco interrupciones en dos años por cualquier causa). I: eco 3 (penalidades y riesgo de perder un cliente), continuidad 3 (horas a dos días), legal 2. V3 como promedio declarado de un perfil que va del grupo electrógeno probado a nada; D21 dice que esto probablemente deberían ser riesgos distintos.
- Forma B: el mismo I en las tres. P4 para el corte y el enlace (una vez por año), P3 para la climatización (una vez en dos años). V1 con grupo probado; V4 sin respaldo de climatización; V4 con un solo proveedor y un solo ingreso.
- R2: P3 (un caso hace tres años). Eco 3, legal 4 (sanción del regulador trasladada).

**Anomalías posibles:** A7 (el caso existe para dispararla), A4, A1 en la V de la forma A.

---

## CP-13 · Multa más suspensión

Plan, Fase 2 #13 · revisión, caso 16. Doble evaluador recomendado.
**Pone a prueba:** D5 (el económico incluye la pérdida por interrupción), D11, D10 (amplitud), P4.

| Riesgo | Terna |
|---|---|
| R1 · clausura por incumplimiento sanitario | 4 / I(4, 2, 4, 4) / 4 |
| R2 · incobrable de la obra social | 4 / I(4, 1, 1, 1) / 4 |

- R1: P4 (acta de advertencia por el mismo tema el año pasado). Eco 4 (multa más un mes sin facturar ≈ USD 1,9 M ≈ 95%); continuidad 4 (un mes sin internación); legal 4 (suspensión de la habilitación); personas 2 (pacientes derivados). V4: abogado, sin plan de derivación ni de reapertura.
- R2: P4 (atrasos de un año, mora con otras clínicas). Eco 4 (USD 1,8 M ≈ 90%). V4: sin garantías ni seguro de crédito.
- El mes sin facturar aparece en eco y en continuidad: con `max()` no pesa dos veces, pero el desempate por amplitud de D10 sí lo cuenta dos veces.

**Anomalías posibles:** A1 (reparto entre dimensiones), A5, A10 entre dimensiones de I.

---

## CP-14 · Bien contenido, mal recuperado (y al revés)

Plan, Fase 2 #14 · revisión, caso 17 (invertido según el plan). **Fuerza la contradicción abierta #4 (perfil mixto de V ↔ P4).**
**Pone a prueba:** D15 (perfil mixto: "documentar qué aspecto domina"), P4.

| Riesgo | Terna |
|---|---|
| R1 · incendio en la línea de fritura | 3 / I(5, 3, 5, 2) / 4 (contención 1–2, recuperación 5) |
| R2 · inundación del depósito | 3 / I(3, 1, 3, 1) / 3 (contención 5, recuperación 1–2) |

- P3 en los dos: un evento de cada tipo en cinco años.
- R1: I bruto es la línea perdida: continuidad 5 y eco 5 (el 70% de las ventas durante meses); personas 3; legal 2. V: el diseñador documenta que domina la recuperación (nueve meses sin reemplazo) y pone 4; una lectura que priorice la contención daría 2.
- R2: eco 3 y continuidad 3 (stock y semanas de producción frenada). V: no hay contención, pero se recupera en días; el diseñador pone 3, y lo defendible va de 2 a 4.

**Regla faltante:** cómo se fija V ante un perfil mixto.
**Anomalías posibles:** A1 (esperado), A8. En R1, A10 si los nueve meses de reemplazo se cargan en continuidad y en V a la vez.

---

## CP-15 · Una aerosilla

Plan, Fase 2 #15 · revisión, caso 12, adaptado a la bandera (sin pisos). **Fuerza la contradicción abierta #2.**
**Pone a prueba:** P6, D20, D12, D14.

| Riesgo | Terna |
|---|---|
| R1 · caída de la aerosilla | 1 / I(5, 5, 5, 5) / 5 |
| R2 · avalancha en el acceso | 4 / I(4, 1, 4, 1) / 4 |

- R1: P1 (treinta años sin caídas; muy raro en el mundo). Personas 5, legal 5 (clausura definitiva), eco 5 y continuidad 5 (temporadas perdidas). V5: sin rescate en altura, trauma a tres horas, sin plan de evacuación de pasajeros. Dispara `consecuencia_extrema`.
- R2: P4 (tres de cinco inviernos). Eco 4 y continuidad 4 (dos a cuatro semanas en plena temporada). V4: sin acceso alternativo ni despeje contratado.

**Anomalías posibles:** A3 (el caso existe para dispararla), A8.

---

## CP-16 · Sin plan de continuidad

Respuesta 6 · revisión, caso 5 (#CI). **Fuerza la contradicción abierta #1 (D19 ↔ D15 en continuidad).** Doble evaluador recomendado.
**Pone a prueba:** D19, D15, P4.

La narrativa está escrita para que las dos lecturas sean razonables. El diseñador no elige una: el caso existe para que la elija Emiliano y quede escrita como regla.

| Riesgo | Lectura | Terna |
|---|---|---|
| R1 · caída del sistema de gestión | A: la dependencia total es lo que la empresa *es* | 3 / I(3, 1, 4, 1) / 3 |
| R1 · caída del sistema de gestión | B: el plazo largo es falta de respuesta | 3 / I(2, 1, 2, 1) / 4 |
| R2 · accidente con autoelevador | — | 3 / I(2, 4, 1, 2) / 2 |

- R1: P3 (una caída de un día el año pasado). Lectura A: cinco a diez días sin operar son el bruto de esta organización (sin papel, todo en el sistema), continuidad 4, eco 3; V3 porque pueden improvisar desde el segundo día. Lectura B: el bruto de una falla de servidor es horas a un día, continuidad 2 y eco 2; los cinco a diez días vienen de no tener plan, V4.
- R2: P3 (dos accidentes leves en tres años, circulación mixta). Personas 4 (incapacidad permanente). V2: enfermería y ambulancia a 15 minutos.

**Anomalías posibles:** A1 y A10 (esperadas), A6.

---

## CP-17 · El límite se consume

Respuesta 6 · revisión, caso 14 (#LC).
**Pone a prueba:** D17, D18, P10, D22 (`cambio_contexto`).

| Riesgo | Antes | Después |
|---|---|---|
| R1 · explosión en la nave de llenado | 2 / I(5, 5, 5, 3) / 3 | 2 / I(5, 5, 5, 3) / 3 |

- La terna es la de CP-09. El límite consumido devuelve el retenido económico a ≈ nivel 5 en `risk-transfer`; nada del riesgo cambió.

**Anomalías posibles:** A8 si el usuario espera que suba; A6 si se pregunta si el seguro forma parte del objeto evaluado.

---

## CP-18 · Sacar a la gente de la zona

Respuesta 6 · revisión, O8 (#P11). **No se fusionó con CP-04**: CP-04 mejora V; este mejora la dimensión dominante de I, y prueba si `max()` puede esconder la mejora más grande posible (I4 de la revisión).
**Pone a prueba:** P11, D16 (una acción puede cambiar una dimensión de I con mecanismo causal), D5 (`max()`), D19, D20, P9, D10 (amplitud), D22 (`accion_ejecutada`).

| Riesgo | Antes | Después |
|---|---|---|
| R1 · reacción descontrolada | 3 / I(5, 5, 5, 4) / 3 | 3 / I(5, 2, 5, 4) / 3 |

- P3: varios accidentes en el sector en una década y dos desvíos controlados aquí.
- I antes: eco 5 y continuidad 5 (planta destruida, más de un año para reconstruir); personas 5 (14 personas en el radio); legal 4.
- Después: personas 2 (nadie en el radio durante la operación; sólo entra personal con el reactor vacío). La exposición de personas es lo que la empresa *es* (D19), así que el cambio va a I y no a V. Eco 5 sigue: I efectivo y la bandera no cambian.
- V3: brigada y plan ensayado, sin reemplazo de planta.

**Anomalías posibles:** A8 (esperada); A10 si el evaluador además baja V por "evacuación más simple".

---

## CP-19 · Un año de cambios sin acciones

Agregado por el diseñador (no está en la lista del plan ni en la revisión). Prueba la mitad de P9 y D18 que ningún caso cubría: la criticidad cambia sin acciones, y `motivo` distingue los cuatro valores restantes.
**Pone a prueba:** D18, P9 (segunda oración), P10, D22 (`informacion_nueva`, `correccion_evaluacion`, `cambio_contexto`, `cambio_version_metodologia`), D2, D20.

| Momento | Terna | `motivo` |
|---|---|---|
| Enero | 2 / I(5, 5, 5, 4) / 2 | — (baseline) |
| Marzo | 3 / I(5, 5, 5, 4) / 2 | `informacion_nueva` |
| Mayo | 3 / I(5, 5, 5, 4) / 3 | `correccion_evaluacion` |
| Julio | 3 / I(5, 5, 5, 4) / 2 | `cambio_contexto` |
| Septiembre | según las escalas nuevas | `cambio_version_metodologia` |

- Enero: P2 (sin historia de incendios aquí; sí en hoteles). I: personas 5 (huéspedes durmiendo), eco 5 y continuidad 5 (meses cerrado), legal 4. V2: presurización, detectores, brigada, bomberos a 25 minutos.
- Marzo: el cableado sobrecargado es una condición causal presente: P3.
- Mayo: la presurización apagada era un error de la evaluación de enero (base `assumed` que nadie verificó): V3.
- Julio: bomberos a seis minutos: V2. Baja sin ninguna acción de la empresa.
- Septiembre: el diseñador no fija valores; el caso pregunta qué pasa con una evaluación viva cuando cambia la versión.

**Regla faltante:** qué se hace con las evaluaciones vivas al cambiar la versión de la metodología (decisión faltante 12, parcial; Fase 1). D18 dice que la criticidad puede subir sin acción y no dice explícitamente si puede bajar sin acción (julio).
**Anomalías posibles:** A9 (mayo), A8.

---

## CP-20 · Dos riesgos que vienen juntos

Agregado por el diseñador. Prueba D13 (correlación entre riesgos, excluida "salvo que los casos demuestren que es necesaria"), que ningún caso cubría.
**Pone a prueba:** D13, D21, P5.

| Riesgo | Terna |
|---|---|
| R1 · inundación del depósito | 3 / I(3, 1, 3, 1) / 4 |
| R2 · corte por anegamiento de la subestación | 3 / I(3, 1, 3, 1) / 4 |
| R3 · robo de premezclas | 3 / I(3, 1, 3, 2) / 4 |

- R1 y R2: P3 (dos desbordes en diez años, la misma causa). Eco 3 (USD 600 y 700 mil ≈ 24–28%); continuidad 3 (una a dos semanas). V4: sin barreras, sin bombas, sin grupo con potencia.
- R3: P3 (un robo hace cuatro años). Eco 3 (USD 500 mil ≈ 20%), continuidad 3, legal 2 (medicamentos de uso veterinario). V4: alarma sin monitoreo.
- D21 los separa (comparten P pero no V). Juntos, R1 y R2 producen una consecuencia mayor que cualquiera de los dos por separado, y nada en v0 la representa.

**Regla faltante:** cómo se tratan riesgos con causa común.
**Anomalías posibles:** A7, A4, A8.

---

## Matriz de cobertura

● lo prueba directamente · ○ lo toca de costado.

| Entrada | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Propósito | | | | | | | | | | | | | | | | | | | | |
| P1 Monotonía | | | | | | ● | | | | | | | | | | | | | | |
| P2 Desconocido ≠ bajo | | | | | | | | ● | | | | | | | | | | | | |
| P3 Explicable | ○ | | | | | | | | | | | | | | | | | | | |
| P4 Reproducible | | | | | | | ○ | | | | | | ○ | ○ | | ○ | | | | |
| P5 Orden explícito | ● | | | | ● | | | | | | | ○ | | | | | | | | ○ |
| P6 Extremos visibles | | ● | ○ | | | | | | | | | | | | ● | | | | | |
| P7 Cambiable | | | | | | | | | | | | | | | | | | | | |
| P8 Sin falsa precisión | | | | | | | | ○ | | | | | | | | | | | | |
| P9 Coherencia dinámica | | | | ● | | | | | ○ | ● | | | | | | | | ○ | ● | |
| P10 Atribuible | | | | ○ | | | | | ● | ● | | | | | | | ● | | ● | |
| P11 Sensible a la mejora | | | | ● | | | | | | | | | | | | | | ● | | |
| D1 (superada) | | | | | | | | | | | | | | | | | | | | |
| D2 Estado evaluado | | | | ● | | | | | | ○ | | | | | | | | | ○ | |
| D3 Horizonte | | | | | | | | | | | | | | | | | | | | |
| D4 Probabilidad P | | | | | | ● | ● | | | | | | | | | | | | | |
| D5 Impacto I | | | | | ● | | ○ | | | | ● | | ● | | | | | ● | | |
| D6 (superada) | | | | | | | | | | | | | | | | | | | | |
| D7 (superada) | | | | | | | | | | | | | | | | | | | | |
| D8 Unknowns | | | | | | | | ● | | | | | | | | | | | | |
| D9 Incertidumbre | | | | | | | | ● | | | | | | | | | | | | |
| D10 Ranking | ● | ● | | | ● | | | | | | | ○ | ○ | | | | | ○ | | |
| D11 Comparabilidad | | | | | ● | | | | | | ○ | | ● | | | | | | | |
| D12 Bandas | ○ | ● | | ○ | | | | | | | | | | | ● | | | | | |
| D13 Excluidos | | | | | | | | | | | | | | | | | | | | ● |
| D14 Fórmula | ● | ○ | ● | | | | | | | | | | | | ○ | | | | | |
| D15 V y frontera P/V | | | ● | | | ● | ● | | | | | ○ | | ● | | ● | | | | |
| D16 Acciones | | | | ● | | | | | | ● | | | | | | | | ● | | |
| D17 Seguro | | | | | | | | | ● | | | | | | | | ● | | | |
| D18 Cuándo cambia | | | | ● | | | | | ● | ● | | | | | | | ● | | ● | |
| D19 A qué está condicionado I | | | ● | | | ○ | ● | | ○ | | ● | | | | | ● | | ○ | | |
| D20 Consecuencia extrema | | ● | ○ | ○ | | | | ○ | ○ | | ○ | | | | ● | | | ○ | ○ | |
| D21 Granularidad | | | | | | | | | | | | ● | | | | | | | | ● |
| D22 Motivo | | | | ○ | | | | | ○ | ● | | | | | | | ● | ○ | ● | |
| #1 D19 ↔ D15 continuidad | | | | | | | | | | | | | | | | ● | | | | |
| #2 P6 ↔ D20 + D12 | | ● | | | | | | | | | | | | | ● | | | | | |
| #3 D20 ↔ C6 (frecuencia de la bandera) | ○ | ○ | ○ | ○ | | | | ○ | ○ | | ○ | | | ○ | ○ | | ○ | ○ | ○ | |
| #4 Perfil mixto de V ↔ P4 | | | | | | | | | | | | ○ | | ● | | | | | | |
| #5 Acción que no cumple ↔ P10 | | | | | | | | | | ● | | | | | | | | | | |
| #6 Procedencia por factor | | | | | | | | ○ | | | | | | | | | | | | |

### Entradas sin ningún caso

- **D3 Horizonte (12 meses):** decidida y sin caso. Un riesgo cuyo evento probable cae a los 14–18 meses la probaría; quedó afuera por el límite de 20 casos.
- **P7 Cambiable:** criterio de diseño, no comportamiento observable en un caso.
- **Propósito, D1, D6, D7:** sin texto propio (superadas) o sin comportamiento que adjudicar.
- **Sólo de costado:** P3 (aplica a todos), P8 (CP-08), P4 (la mide la Fase 8), #3 (la mide la Fase 4) y #6 (la resuelve la Fase 1).
- **D13, parcial:** CP-20 prueba la correlación; velocidad de materialización, detectabilidad y asegurabilidad no tienen caso.

**Nota sobre #3.** 14 de los 20 casos tienen algún riesgo con una dimensión en 5. Es un sesgo del diseño (casos adversariales buscan extremos), no una estimación de la frecuencia de la bandera en una población real: la Fase 4 la mide sobre este conjunto y la Fase 7 sobre empresas sintéticas.

### Reglas faltantes

| Falta | Caso | Dónde podría escribirse |
|---|---|---|
| Estado de la acción y registro cuando la reevaluación no confirma lo esperado | CP-10 | Fase 1 (historial) o Fase 3 |
| Cómo se fija V ante un perfil mixto | CP-14, CP-12 | Fase 3 |
| Cómo se elige el evento (dónde cae el instante del corte P/V) | CP-01 (R3), CP-06, CP-07 | Fase 3 |
| Cómo se ordenan riesgos de empresas distintas en una lista | CP-11 | Fase 6 (EMI-41) |
| Qué pasa con las evaluaciones vivas al cambiar la versión | CP-19 | Fase 1 |
| Si la criticidad puede bajar sin acción por un cambio de contexto (D18 sólo dice que puede subir) | CP-19 | Fase 3 |
| Riesgos con causa común | CP-20 | Fase 3, o queda excluido por D13 |
| Anclas de nivel de P, I y V | todos | Fase 3 |

---

## Filas propuestas para `changelog-metodologia.md`

Emiliano aprobó la Fase 2 el 2026-10-05 19:37 UTC; las filas ya se agregaron al final del changelog. Los números CH-048 a CH-053 están reservados por la Fase 1. Estas filas no cambian ninguna regla, así que no suben la versión.

| id | fecha | versión | elemento | antes | después | motivo | fuente |
|---|---|---|---|---|---|---|---|
| CH-054 | 2026-10-05 | v0.0 | Casos Fase 2 | Lista mínima de 15 casos más #CI, #LC y #P11 | 20 casos: CP-01–CP-15 = lista del plan; CP-16 = #CI; CP-17 = #LC; CP-18 = #P11 | Respuesta 6; #P11 no se fusionó con el caso 4 porque este mejora V y #P11 mejora la dimensión dominante de I | plan, Fase 2; respuestas, pregunta 6 |
| CH-055 | 2026-10-05 | v0.0 | Casos Fase 2 | — | Suma CP-19 "Un año de cambios sin acciones" | Ningún caso probaba la criticidad que cambia sin acciones ni los valores de `motivo` distintos de `accion_ejecutada` (D18, P9, D22) | Fase 2, matriz de cobertura |
| CH-056 | 2026-10-05 | v0.0 | Casos Fase 2 | — | Suma CP-20 "Dos riesgos que vienen juntos" | Ningún caso probaba la exclusión de la correlación entre riesgos (D13) | Fase 2, matriz de cobertura |
