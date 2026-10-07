# Notas de Emiliano · entrega de la Fase 8

> Texto de la entrega de Emiliano (2026-10-07 20:19 UTC), copiado sin cambios desde el mensaje del thread. El CSV va aparte en `fichas-emiliano.csv`.


Evaluación ciega Fase 8 — síntesis y registro de anomalías

Fecha de evaluación: 2026-10-07. 

Entregable: `fichas-emiliano.csv`, UTF-8, separado por comas, con los 88 campos del esquema proporcionado y las 30 fichas en su orden original. Se completaron las observaciones, procedencia y evidencia de los siete factores por ficha. Hay 23 riesgos evaluables y 7 no evaluables; todas las bandas quedan vacías. Los campos condicionales que no corresponden quedan vacíos.

La evaluación fue realizada por Emiliano: `actor=human`, `evaluador=Emiliano`.
## Fuentes y alcance

Se usaron exclusivamente la metodología v0.2, el protocolo §2 y las fichas de riesgo, empresa y transferencia de los 30 riesgos seleccionados (24 empresas). En este checkout están bajo `/Users/emilianodelcampo/repos/del-campo/SPIKES/T-0021/v0/emi41/fichas/`. No estaba disponible el directorio `v0/fase-8`; se usaron la selección y el esquema contenidos en la conversación referida.

No se consultaron contenidos de `RAIZ/cerrado/`, `v0/fase-8/agente/` ni `v0/fase-9/`. No se investigaron fuentes externas ni se verificaron los documentos de respaldo citados dentro de las fichas. `fuentes-leidas.json` identifica mediante SHA-256 los 78 documentos de las empresas y riesgos, la metodología y el texto de §2 del protocolo. Los originales permanecen intactos.

## Criterios aplicados

- **Probabilidad:** ventana de 12 meses; historia al corte de información. Se distingue el iniciador de su daño posterior y se documenta la comparabilidad de tasas. Se usa trienio móvil cuando la frontera temporal importa. Condiciones presentes no equivalen automáticamente a un precursor ni justifican repetir ajustes ya contenidos en la historia.
- **Impacto bruto:** se excluye el efecto de medidas posteriores y seguros. Se usa resultado operativo normalizado; si no hay resultado positivo, se aplica la alternativa de §4.2 y se explicita el denominador. Los supuestos de margen, costos y duración quedan en cada observación. Reputación no entra en I.
- **Continuidad y personas:** duración de la función crítica sin recuperación preparada; la degradación inferior a la mitad recibe el ajuste previsto. Se distingue fatalidad plausible de muertes múltiples, sin añadir eventos independientes sólo para agravar el daño.
- **Contención y recuperación:** se distingue medida probada, presente sin prueba y alternativa informal. Se evita contar la misma medida también en P. Se aplica la tabla fija de V por dimensión, aun cuando una única contención represente capacidades desiguales entre daños; esa limitación se registra.
- **Valor, rango y desconocimiento:** el valor elegido debe ser defendible dentro de hasta tres niveles contiguos; cuando no lo es, se registra `unknown`. Los rangos no sustituyen el valor central. No se usa el peor caso como valor plausible por defecto.
- **Cálculo:** V económico = mínimo entre contención y el promedio redondeado hacia arriba de contención/recuperación; V personas y legal = contención; V continuidad = mínimo de ambos. Si recuperación no aplica, se usa contención. La criticidad es el máximo dimensional, sin inventar bandas ni ordenar empresas distintas.
- **Cotas:** un desconocido permite resultado sólo si no puede superar el máximo conocido (§9.3). El techo usa máximos registrados. Si un desconocido no tiene máximo defendible, el techo queda vacío e indeterminado; para la cota de validación se usa 5 conforme §9.5.

## Datos pendientes que impiden evaluar

Cada fila está completada; “no evaluable” es un resultado de la metodología, no una ficha omitida. La siguiente lista conserva el orden de la muestra, sin establecer prioridades entre empresas.

### S02-R07 — i_econ, i_cont

Un atraso aislado cuesta hasta USD 28 mil de multa más aceleración; una rescisión puede perder USD 2,4 M anuales frente a RO USD 1,52 M. Dos atrasos >10 días ya existen en la ventana. No hay duración defendible de reemplazo del cliente ni base para preferir un monto: rango 1–5, unknown.

Atraso sin interrupción (1) frente a rescisión con PH-800 ociosa 80% y soldadura 50% por plazo no informado (hasta 5): no puede elegirse duración plausible.

### S04-R03 — i_econ

USD 50–90 mil forenses, USD 0,08 por titular, multas hasta USD 1,5 M y reclamos sin límite por confidencialidad, contra RO USD 2 M. No se conocen titulares, clientes ni contenidos: niveles 2–5 y sin valor preferible.

### S12-R05 — i_econ, i_cont

Referencia alternativa USD 34 M de presupuesto anual. Corrección USD 0,3–2 M + multa USD 0,01–1,5 M, más producción perdida por una suspensión sin duración estimable: no se puede acotar a tres niveles ni preferir valor, unknown.

Extracción y producción se detienen con permiso suspendido; falta toda base para duración. La pileta de 4,5 días es V y no resuelve la duración bruta.

### S13-R05 — i_econ

Producto 15–45 mil, remediación 20–400 mil, multas 11–530 mil: USD 46–975 mil/RO USD 2,05 M=2,2–47,6%. Reclamos de regantes no estimados pueden elevar a 5; no hay base para monto total preferible ni rango≤3 niveles: unknown 2–5.

### S19-R06 — i_econ

USD 500–1.500 sólo cubren primeros días y reemplazo bajo respuesta real; multas 2–60 mil y demanda civil no cuantificada. Faltan prestaciones brutas y consecuencias oculares permanentes. RO USD 15,3 M conocido, pero no monto ni rango total defendible: unknown.

### S28-R07 — i_econ, i_cont

Caída de horas cuesta pocos miles a cientos de miles; pérdida de servidor requiere 9–26 d (compra+instalación), con MC 13,6 mil/h×14 h/día×80% de ventas definitivamente perdidas: USD 1,37–3,96 M/RO USD 12,1 M=11,3–32,7%, más reposición y descartes. Rango global 1–4 sin preferencia causal: unknown.

Software o enlace: horas (1); servidor:9–26 d (3–4). Sin distribución de causas ni duración bruta más plausible, unknown 1–4.

### S37-R03 — i_econ

Referencia RO positivo 2023 USD 160 mil, único ejercicio positivo de los tres (§4.2.2); no se divide por RO negativo 2025. La ficha sólo remite prestaciones aART y no mide horas extra ni costo bruto médico/salarial; falta monto y rango defendible: unknown.

## Desconocidos que no impiden el resultado

En S08-R03, Personas determina el máximo conocido y domina las cotas de Económico y Continuidad. En S36-R03, Personas y Continuidad dominan la cota económica. Se conservan los desconocidos y `i_efectivo = ≥ 5`; no se imputa un impacto económico para completar el cálculo. Ambos permanecen sujetos a validación.

Además de los nueve riesgos con algún `unknown`, S12-R01, S22-R02 y S36-R04 quedan con incertidumbre alta por las ambigüedades detalladas abajo.

## Banderas

Hay 12 fichas con `safety_critical=true`. Hay 12 con `consecuencia_extrema=true`: 8 por un valor plausible de impacto 5 y 4 por el máximo registrado de un impacto desconocido en riesgos no evaluables, aplicando la excepción de metodología §8.2. Estas cuatro son S02-R07, S04-R03, S12-R05 y S13-R05; no equivalen a cuatro impactos 5 estimados. La diferencia de redacción con protocolo §2.3 se registra como AN-F8-031. Las banderas no alteran el resultado ni fijan banda.

## Registro de anomalías

Los identificadores de este registro son locales a esta entrega. La columna `anomalias` contiene las referencias; `uncertainty_nota` y las observaciones conservan el fundamento dentro del CSV. Las menciones A6/A7/A10/A11 remiten a los tipos de problema descritos en la metodología, no a registros externos consultados.


### AN-F8-001 — S01-R01

Perfil de contención varía por turno y sector; la rúbrica no fija cómo agregarlos (se usa 3, rango 3–4). El techo de Personas conserva muertes múltiples; no hay estudio de propagación. El dato económico faltante no cambia el nivel 5.

### AN-F8-002 — S01-R02

A 7: mezcla contaminación microbiológica y química con recuperación distinta; se conserva la ficha fija. A 6: reemplazo de botellas estimado con 750 ml y valor de vino a granel; confirmar envases y costo total. Ambigüedad entre trienio móvil y años calendario para P: se adopta móvil al corte.

### AN-F8-003 — S02-R07

A 7: chapa, capacidad y averías comparten consecuencia pero P/V distintas. A 6: falta plazo y escenario plausible para la rescisión; no se convierte automáticamente toda demora en pérdida del cliente. A 10: stock que evita incumplir es anterior al evento definido, no se puntúa también en V.

### AN-F8-004 — S04-R03

A 6: no hay inventario de datos ni alcance económico defendible. Comparabilidad del 23% sectorial no resuelta por un criterio cuantitativo en §3.2; se prioriza historia propia. Suspensión legal se conserva sólo como techo.

### AN-F8-005 — S04-R05

A 6/A 7: porcentaje de incidentes no equivale necesariamente a capacidad de mantenimiento; continuidad 4–5. Faltan horas sustituibles y calendario de rescisión. P de salida conjunta no se obtiene elevando al cuadrado la rotación individual. El monto es un supuesto de escenario contractual, no una pérdida observada.

### AN-F8-006 — S05-R08

A 7: varias causas de atraso en ficha fija. A 10: el plan de aceleración se cuenta en recuperación y no reduce también P. A 6: el régimen de costo de tratamiento ya comprometido dentro del I bruto es ambiguo; incluirlo o excluirlo no cambia I 2. La extensión del plazo puede actuar antes del evento si se concede antes del vencimiento.

### AN-F8-007 — S07-R01

A 6: ambigüedad del alcance de historia propia (otra pared) en P. A 10/A 11: evacuación previa al derrumbe reduce daño sin evitar el evento; se asigna a V por función causal, aunque §2.2 usa corte temporal. Un V de contención único traslada a daño material una capacidad primordialmente humana. Se aplica tabla fija sin corregirla.

### AN-F8-008 — S08-R03

A 7: rodamiento, motor y suministro mezclan severidades y duraciones. A 6: mayor parte/parte de funciones no tiene umbral; se usa 3 para 55%. Refugios sin inventario no se acreditan como probados. No se sustituye duración bruta por 55% de producción de respaldo.

### AN-F8-009 — S10-R03

A 6: MC desconocido; se usa 50% como supuesto por estructura de costos y rango obligatorio de §4.2. Los 14 mil extrajudiciales identificados en 2025 se normalizan. A 10: stocks pasan a V; no se deducen del impacto bruto. Ancla P conserva registro recurrente incompleto, sin tasa por voladura.

### AN-F8-010 — S12-R01

A 6: se elige presupuesto operativo anual USD 34 M ante RO no positivo; no hay conversión calibrada entre este denominador y RO. A 10: reserva que repone material se mueve de contención a recuperación. A 6: precursor industrial justifica P 3, pero no existe tasa ni extrapolación validada.

### AN-F8-011 — S12-R05

A 6: extrapolación de un único evento de 2,5 meses distingue P 3/P 4; se usa literal F 5-4 A. A 10: desvío previo a reinyección se carga en P, no también V. A 6: presupuesto USD 34 M sustituye RO; falta duración de suspensión, sin asignar plazo arbitrario.

### AN-F8-012 — S13-R04

A 6: penalidad basada en borrador sin contrato firmado. Continuidad depende de qué se considera función crítica (línea versus abastecimiento global), se usa 4 con techo 5. Precursores no reciben doble aumento en P.

### AN-F8-013 — S13-R05

A 7: transportista propio/contratado, varios productos y eventos iniciadores tienen capacidades distintas. A 6: reclamos de regantes sin monto impiden I económico defendible. El techo de Personas no se aumenta por una lesión no descrita.

### AN-F8-014 — S14-R01

A 6: costos y duración bruta extrapolados desde brote con respuesta, no observados sin ella. Se usa evento mediano y techo de boda 400, sin sumar cancelaciones reputacionales (D 13). Evento iniciador se adelanta a contaminación de la comida según §2.1; controles de inocuidad van a P.

### AN-F8-015 — S15-R04

A 6/A 7: flota con y sin arco tiene V distinta; no hay regla para un único V agregado. Costos civiles informados por encima de ART no cuantifican toda pérdida bruta; no se deduce la póliza. Continuidad se calcula con reposición normal, no con cobertura de otros tractores.

### AN-F8-016 — S18-R03

A 6: fuga pequeña mal etiquetada como precursor se cuenta como antecedente. Escenario monetario y días brutos se infieren del comparable con respuesta; se conserva rango. Perfil de contención difiere por lugar/turno y no permite acreditar nivel 1 sólo por cierre rápido de una válvula.

### AN-F8-017 — S19-R06

A 6: el costo neto a cargo de empleador no es I bruto; la fuente no permite costo de secuelas. Se mantiene unknown sin inventar indemnizaciones. A 11: V único de lavado parcial se aplica por tabla también a la dimensión legal, aunque su efecto causal puede diferir.

### AN-F8-018 — S20-R06

A 7/A 6: se evalúa campaña continua del fraude, aunque el evento está redactado por registro individual; extrapolar cuatro trimestres no prueba duración ni atribución. Se adopta rango 2–3 económico. A 10: detección posterior no reduce también P.

### AN-F8-019 — S21-R01

A 6: denominador de P mide campañas con daño y no toda caída de granizo; se usa mejor registro disponible y rango 3–4. MC no calculado: supuesto 30% con rango obligatorio 3–5. A 7: V por finca distinta; se conserva escenario finca 2. Ambigüedad entre duración de reducción de empaque y ciclo de cosecha.

### AN-F8-020 — S22-R02

A 6: falta distribución de fugas y población realmente afectada; escenario económico de 3 víctimas se explicita y rango 3–5. Estadística de lesionados no mide P de liberación. A 11: compra de hipoclorito no restaura autorización legal; se respeta tabla fija.

### AN-F8-021 — S22-R03

A 6: se adelanta evento de ingreso al pluvial a derrame, según§2.1; cambia el conteo de antecedentes. A 10: kits, bordillo y cubre-rejillas pasan a V. A 6: reclamos aguas abajo y usos de agua faltantes; rango económico supone escenario de 5 m³ sin pérdidas agrícolas adicionales, requiere validación.

### AN-F8-022 — S24-R03

A 6: impacto monetario fuente presupone que sobrecorriente limita daño a reductor; se explicita monto no cotizado y techo 5. El límite de tres años vence antes del corte para pruebasagosto 2023. P no se calcula como 4 sólo por estar el antecedente en el año 2023.

### AN-F8-023 — S28-R07

A 7: actualización, hardware y enlace mezclan P/I/V. A 6: evento se adelanta a falla técnica que causa indisponibilidad; no es posible una única causa iniciadora más fina en ficha fija. Restauración desconocida y ausencia de soporte impiden duración preferible. No se confunden ventas con MC.

### AN-F8-024 — S29-R06

A 6: régimen nuevo puede contar antecedentes anteriores; se adopta interpretación del área legal, con rango 2–3. No se añade margen perdido por un cuarto incumplimiento (§4.1.5). A 6: efectividad pasada de descargos no prueba resultado con régimen actual.

### AN-F8-025 — S31-R06

A 7: camiones, camionetas y colectivos reúnen severidades diferentes; se conserva escenario típico 4 y techo 5 de Personas. A 6: costos provienen de eventos con respuesta; proxy económico 1–2 no implica costo de fatalidad observado. Datos de kilómetros faltantes no impiden P 5 recurrente.

### AN-F8-026 — S32-R03

A 7: rescisión por seguridad y sin causa tienen P/V distintas. A 6: no se asume renovación contractual para pérdida completa sin señalarlo; escenario económico 9 meses y rango 4–5. La tasa sectorial por contratos-año aproximada no resuelve el plazo individual ni exposición actual.

### AN-F8-027 — S33-R05

A 6: se adelanta evento de robo consumado a intrusión, para contar actuación contenida y ubicar cámaras en V. Plano dice cámaras sur/oeste pero actuación informa norte: inconsistencia de fuente sin resolver. A 6: daño humano no cuantificado; supuesto 2 sin añadir falla eléctrica independiente.

### AN-F8-028 — S36-R03

A 6: denominador económico elegido ingresosUSD 6 M, no RO ni reserva; víctimas y pérdidas sin monto preferible. I económico unknown puede no impedir resultado si Personas 5 domina su cota. Alcance del incendio cambia duración:3–5. Se usa recuperación formal parcial segúnF 5-4 B aun sin plan integral.

### AN-F8-029 — S36-R04

A 7: maltrato verbal/físico/sexual tiene severidad y dinámica distintas. A 6: irreversible psicológico se asimila a daño irreversible grave; rúbrica no explicita salud mental. Intervenir dirección no necesariamente equivale a administración total del colegio: legal 4, rango 3–5. Denominador económico ingresosUSD 6 M.

### AN-F8-030 — S37-R03

A 6: ancla Personas 2 dice sin incapacidad y 3 exige lesión grave con incapacidad temporal; lesiones leves con días de baja quedan entre ambas. Se usa 2 con techo 3. A 7: cortes, golpes y esfuerzos agrupados. I económico no se presume cero porque pagueART; falta costo bruto.

### AN-F8-031 — Bandera extrema con impacto desconocido

Protocolo §2.3 describe el disparo por valor 5; metodología §8.2 extiende ambas banderas a riesgos no evaluables cuyo máximo registrado alcanza el umbral. Se aplica esa excepción explícita a S02-R07, S04-R03, S12-R05 y S13-R05. El valor del factor sigue siendo unknown y no se calcula criticidad para esos riesgos.

## Verificación de la entrega

Se verificaron 30 riesgos únicos en el orden solicitado, encabezado exacto de 88 columnas, lectura posterior del CSV sin desplazamientos de celdas, 210 observaciones y referencias de factores, rangos compatibles, cálculo de V y máximos, dominancia de cotas, 30 bandas vacías, procedencia humana y revisión pending. Los campos numéricos faltantes por no evaluabilidad permanecen vacíos según el protocolo.
---

**Procedencia (registrada en la Fase 8a, 2026-10-07 20:25 UTC).** Consultado en el thread "Fase 8a congelamiento y muestra", Emiliano confirmó: "los elegí yo". Los valores de los factores son suyos; `actor = human` vale sin desviación.
