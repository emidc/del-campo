# Preguntas de revisión profesional · Piloto S06

> **Actualización de cierre, 2026-10-13:** Emiliano cerró Fase 12 con este piloto como alcance suficiente. Ver `../reporte-fase-12.md`. Los estados abiertos anteriores son históricos; propuestas y discrepancias siguen registradas como insumos posteriores.


2026-10-13 · Emiliano · F12-PILOTO-EMILIANO-01. Respuestas posteriores a la revelación de resultados; no se atribuyen a un revisor sin exposición a las salidas.

## EV-24 · Producto de niveles ordinales

Pregunta de metodología §16: «¿Le parece razonable combinar probabilidad, consecuencia y vulnerabilidad multiplicando niveles de 1 a 5, sabiendo que otra numeración de los mismos niveles podría cambiar el orden?»

### Respuesta de Emiliano

**No acepta P × I × V como orden principal. Lo acepta únicamente como apoyo diagnóstico/tamizaje, bajo condiciones formales de no compensación.**

Fundamentos expresados:

1. Las etiquetas ordinales no tienen distancias métricas definidas. Un cambio monótono de numeración podría cambiar el producto y sus órdenes; cuestiona usar la convención aritmética como árbitro final de decisiones estratégicas. Cita a Cox y Hubbard como referencias de su argumento.
2. Objeta compensar peligro humano catastrófico con frecuencia/vulnerabilidad de un riesgo económico y reducir dimensiones éticas/jurídicas/financieras a un solo escalar.

Condiciones propuestas:

- Veto o pista obligatoria de atención por I-personas ≥ 4 o I-legal ≥ 4, con independencia del índice. Lo denomina criterio no compensatorio/lexicográfico. Debe precisarse si prioriza una pista separada, el orden principal o ambos; no se implementa ninguna de esas lecturas ahora.
- Mostrar obligatoriamente el vector P, I-econ, I-pers, I-cont, I-legal, V-cont, V-rec, sin lectura aislada del índice.
- Usar el producto para filtrar extremos, sin resolver por sí solo el orden fino de riesgos críticos; propone análisis multicriterio cualitativo y juicio experto de supervivencia del negocio.

### Estado y límites

Respuesta recibida y conservada. Se aplica al rol del agregador, no constituye autorización de una versión nueva ni de edición de la candidate. La v1 actual usa C para ranking y banderas sin piso automático; por ello la aceptación condicionada **no es aprobación de la v1 actual como orden principal**.

Se preserva como propuesta humana la prioridad por vida o responsabilidad penal; no se agrega un veto, peso, piso de banda ni regla de decisión. La exposición jurídica de ancla 4 vigente incluye responsabilidad penal *posible*, mientras el revisor propone responsabilidad *directa*: alcance pendiente de EV-06/37.

Las referencias a autores y afirmaciones de invalidez axiomatizada no se verificaron bibliográficamente en esta respuesta. Que otra recodificación pueda cambiar un orden no acredita que las recodificaciones propuestas produzcan inversiones «masivas» en los seis riesgos S06; no se ejecutó ni se atribuye esa prueba. No se invalida automáticamente D14 ni se alteran bandas/umbrales.

Las condiciones pendientes se analizarán después de la revisión y requerirán una versión nueva con evidencia/regresión si se adoptan. Se mantienen snapshots A/B, factores humanos y cálculo revelado.

## Pendientes de §16

- EV-02: respondida el 2026-10-13; facturación alternativa con controles de solvencia/liquidez y calibración pendiente (detalle abajo).
- EV-06/37: respondida el 2026-10-13; criterio contextual recibido, automatismos jurídicos pendientes de validación (detalle abajo).
- EV-08: respondida el 2026-10-13; rechaza misma banda y propone tratamiento diferenciado por amenaza terminal (detalle abajo).
- EV-10: respondida el 2026-10-13; prioridad estratégica terminal y distinción económica; fragmento final pendiente.
- EV-11: banda para probable, económico extremo y preparación media.
- EV-20: respondida el 2026-10-13; prioriza remoto fatal/prolongado (detalle abajo).
- EV-22: empate calculado y criterio profesional.

El dictamen previo aporta contexto a varias preguntas, pero no se inventan respuestas a sus contrastes. EV-24 y EV-06/37 tienen respuestas explícitas; las restantes dos preguntas siguen pendientes; hay además un fragmento económico por completar. Fase 12 permanece abierta.

## EV-06 / EV-37 · Respuesta recibida · 2026-10-13

Emiliano afirma que exposición penal y clausura no nacen automáticamente de una muerte: dependen de conducta, evidencia de negligencia y decisiones/estándar probatorio de la autoridad. Propone comprobar cinco aspectos para aplicar prioridad jurídica:

1. Incumplimientos de normas obligatorias documentados.
2. Conocimiento previo del riesgo por la dirección y omisión de actuar.
3. Rol/competencias del responsable y delegación efectiva.
4. Nexo causal y evitabilidad mediante la medida omitida.
5. Régimen y criterio cautelar de autoridades de la jurisdicción.

Distingue I-legal 4 por exposición penal *posible* de un veto que propone más exigente. Considera suficiente para 4 una víctima fatal bajo omisiones evidentes y rol de garante; para veto exige ausencia de diligencia debida que, a su juicio, vuelva inexorable imputación/parálisis. También afirma que toda muerte laboral inicia de oficio causa, peritaje y clausura/inmovilización inmediata; que la delegación desplaza responsabilidad; y que una conducta exclusiva del operario permitiría desestimación rápida. Estas afirmaciones más fuertes se conservan como opinión del revisor, no conclusiones jurídicas automáticamente verificadas.

### Contraste de fuentes oficiales del coordinador

Consulta realizada el 2026-10-13, separada de la respuesta humana:

- [Código Penal, texto actualizado, arts. 84 y 94](https://www.argentina.gob.ar/normativa/nacional/ley-11179-16546/actualizacion): vinculan muerte o daño con imprudencia, negligencia, impericia o inobservancia de reglamentos/deberes. No establecen en esos artículos imputación automática al socio gerente por toda muerte laboral ni transferencia automática de responsabilidad por delegación.
- [Anexo I oficial del Decreto 351/79, art. 232](https://www.argentina.gob.ar/normativa/recurso/32030/dto351-1979-anexo1/htm): contempla suspensión de tareas por riesgos graves inmediatos a requerimiento de la autoridad. Ese texto no demuestra clausura judicial automática universal ante cualquier muerte.
- No se acreditó en las fuentes consultadas una regla general que garantice imputación o clausura inexorable por falta de documentos. Tampoco se determinó la jurisdicción exacta de la empresa sintética (Cuyo genérico) ni su procedimiento cautelar aplicable. No se extrapolan búsquedas de Mendoza a todo Cuyo.
- Del paquete no surge prueba de cada incumplimiento normativo específico propuesto (permisos, memorial eléctrico, delegación o plan registrado), ni se convierte falta de auditoría desde 2019 en falta probada de todas las obligaciones legales.

### Estado metodológico

Respuesta recibida: criterio de evaluación jurídica contextual y sustentado en evidencia, no automatismo por gravedad física. Los cinco aspectos son criterios propuestos por el revisor, no una regla jurídica exhaustiva ni un requisito implementado en la v1. La inevitabilidad del veto queda sin respaldo verificado y requiere reformulación/validación posterior si se pretende adoptar. No se introduce veto, no se modifica I-legal de fichas B cerradas y no se cambia el conteo D14.

Siguiente pregunta: EV-02, magnitud de referencia económica cuando ninguno de los tres ejercicios tiene RO positivo. Dos preguntas de §16 siguen sin respuesta explícita completa.

## EV-02 · Respuesta recibida · 2026-10-13

Emiliano elige como referencia alternativa a tres ejercicios sin RO positivo **facturación anual de la actividad, neta de impuestos**, con **patrimonio neto tangible como control de solvencia**. Rechaza caja/presupuesto/patrimonio como único denominador por volatilidad, discrecionalidad o distorsiones que considera posibles.

Condiciones que propone:

1. Recalibrar cortes, sin trasladar los porcentajes de RO a ventas. Ilustra con <0,5% para nivel1 y >5–10% de ingresos para nivel5; son ejemplos del revisor, no umbrales aprobados.
2. Moneda homogénea y referencia temporal compatible con el monto de pérdida.
3. Verificación de capital de trabajo/liquidez necesaria para ciclo operativo; una pérdida proporcionalmente moderada puede agotar fondos y amenazar continuidad.
4. Promedio ponderado de tres años o ajuste por contracción estructural para no usar escala de actividad ya desaparecida.

### Fuentes y límites verificados por el coordinador

- [Basilea II, marco primario del indicador básico, §650](https://www.bis.org/publ/bcbs118.pdf): gross income es ingreso neto por intereses más ingreso neto no financiero, con ajustes definidos para bancos. No equivale automáticamente a facturación de cualquier empresa. Ese esquema es un antecedente bancario histórico, no validación de cortes universales de Risk OS.
- [FACPCE, RT6: estados contables en moneda homogénea](https://www.facpce.org.ar/wp-content/uploads/2020/05/RT06-modificaciones2018.pdf): respalda la necesidad de comparabilidad monetaria en contexto inflacionario. Aplicabilidad exacta de normas/adopciones vigentes por entidad y jurisdicción no se resolvió en el piloto.
- [Ley General de Sociedades, texto actualizado](https://www.argentina.gob.ar/normativa/nacional/ley-19550-25553/actualizacion): art.206 trata reducción obligatoria bajo condiciones de pérdidas; no se usa como equivalente automático a disolución ni como umbral de una escala de riesgos. La fuente contiene notas de vigencia/suspensión que requieren análisis de aplicabilidad; no se da un dictamen societario para S06.
- Facturación puede ser cero en entidades sin ventas/startups/inactividad; actividad no garantiza un denominador positivo y pertinente. Facturación «bruta» y ventas netas de impuestos deben definirse sin ambigüedad para cada entidad.
- Margen típico5–15%, viabilidad amenazada para «cualquier empresa» al superar5–10%ventas y sesgos contables generales son hipótesis del revisor, no parámetros empíricos demostrados del dataset.

### Recomendación del coordinador, propuesta para una versión posterior

Preferir dos lecturas paralelas, no promedio ponderado ni cambio automático de denominador según tamaño del evento:

- Escala económica: RO pertinente cuando exista y facturación normalizada como referencia alternativa cuando no, con calibración propia antes de declarar equivalencia de niveles.
- Resistencia financiera: flujo de pagos del daño y obligaciones operativas contra liquidez efectivamente disponible y financiación comprometida en un horizonte explícito. Patrimonio tangible como control adicional de solvencia.

Capital de trabajo contable puede contener inventarios/créditos no realizables en el momento requerido; no sustituye automáticamente caja disponible. No se diseña una bandera existencial ni un veto con esos controles durante Fase12. Evitar ponderar ambos en un escalar o alternar denominadores por magnitud: se ocultaría si la señal se debe a escala, tiempo de pago o acceso a financiación.

Antes de fijar cortes: seleccionar casos de márgenes diferentes, resultados negativos/cero, estacionalidad, deuda y liquidez distinta; adjudicar comportamientos profesionales; comparar referencias alternativas y verificar regresión global/comparabilidad. No adoptar5–10%ventas como norma general sin evidencia.

Estado: respuesta humana recibida; recomendación del coordinador propuesta, no aprobada ni implementada. §4.2 de la v1 permanece intacto. Dos preguntas explícitas siguen pendientes: EV-11 y EV-22; EV-10/20 respondidas con fragmento final por completar.

## EV-08 · Respuesta recibida · 2026-10-13

**Emiliano responde que no deberían compartir banda** un riesgo de probabilidad media con amenaza existencial/preparación media y otro de consecuencia grave/preparación débil. Propone banda superior reservada o tratamiento diferenciado por severidad terminal, independiente de defensas parciales.

Fundamentos expresados:

- Diferencia cualitativa entre supervivencia comprometida y daño grave absorbible.
- Considera que preparación intermedia ante una catástrofe puede resultar insuficiente y que daño residual importante aún puede ser terminal.
- Objeta equivalencias numéricas como I5×V3=I3×V5, con la misma P.
- Considera que bandas iguales inducirían competencia por recursos/atención de gobierno corporativo.

### Precisiones del coordinador

La igualdad aritmética del ejemplo no valida equivalencia profesional, pero tampoco demuestra por sí sola terminalidad del escenario. I-econ5en la v1 es pérdida≥100%deROanual; no equivale automáticamente a insolvencia o desaparición. La amenaza terminal requiere evidencia causal y económica/operativa adicional. El propio §4.6 presenta equivalencia entre dimensiones como hipótesis: se conserva esa tensión para revisión, no se redefine5duranteFase12.

El ejemplo usa I3para «consecuencia intermedia»; el ancla general de gravedad4y la pregunta EV08no se sustituyen silenciosamente por aquel número. No se prueba aquí un nuevo caso ni se adjudica una banda concreta. Reducir40–50%es una ilustración del revisor, no lectura cardinal de V3ni dato de eficacia medido.

Rúbricas V3incluyen capacidad parcial o capacidad buena sinprueba; no se establece que todo evento conV3 necesariamente desborde barreras o sea terminal. Las proposiciones de desborde, facilidad/costo de mejorar defensas y efectos de comités/presupuestos se conservan como supuestos del argumento; el experimento vigente no define una obligación de comité, plazo o presupuesto por banda.

Estado: rechazo profesional de equivalencia de banda recibido, y propuesta posterior de banda/tratamiento no compensatorio. No se incorpora piso de banda, veto o umbral. Factores/cálculosA/Bcontinúanintactos y no se modificaD14. Dos preguntas pendientes: EV-11 y EV-22; fragmento final económico de EV-10/20 aún incompleto.

## EV-10 / EV-20 · Respuestas recibidas · 2026-10-13

### EV-10

Emiliano da prioridad estratégica al remoto extremo y gestión táctica rutinaria al probable moderado. Fundamenta en supervivencia/ruina frente a acumulación de pérdidas absorbibles, y propone atención de dirección/apetito/barreras para extremo y supervisión/SOPpara moderado. Referencias a no ergodicidad y equivalencia de valor esperado son argumentos del revisor, no pruebas empíricas ni nuevas reglas de la candidate.

### EV-20

Ante remoto capaz de matar a una persona y paralizar meses, elige atender primero al remoto de forma incondicional, por irreversibilidad de vida, exposición jurídica que propone y posible interrupción terminal. Se conserva como criterio profesional propuesto; no se agrega un orden lexicográfico a la v1. Las consecuencias judiciales/expulsión de clientes/extinción de empresa no son automáticas verificadas, en línea con los límites de EV-06/37.

### Distinción económica propuesta

- Extremo económico terminal: mantiene prioridad estratégica, con instrumentos de respuesta financiera/contractual que menciona y gestión paralela de pérdidas moderadas.
- Extremo económico absorbible: prioriza acción inmediata sobre probable/moderado; mantiene monitoreo/contingencia/transferencia para extremo remoto.

Se distingue exposición bruta de riesgo de selección de acciones y transferencia: la propuesta no reduce I ni V por seguro y no es asesoramiento de cobertura validado. «Extremo» no equivale automáticamente a ruina, ni una paralización larga demuestra por sí sola cierre irreversible. No se evalúa aquí la eficacia o viabilidad de pólizas, avales o límites de responsabilidad mencionados.

### Fragmento final incompleto

El mensaje termina exactamente en: «En el caso de un riesgo económico extremo que no cause la quiebra directa pero amenace con consumir más del 50% de la facturación anual». No se infiere su continuación ni se adopta50%deventas como corte nuevo. Se consulta cómo completaría ese caso particular.

Estado: respuestas a los contrastes EV-10/EV-20 recibidas, criterio profesional conservado; fragmento económico pendiente. Dos preguntas de §16restan: EV-11yEV-22. Reglas, factores y snapshots sin cambios.

## EV-11 / EV-22 · Respuestas finales · 2026-10-13

### Compleción de EV-10/20

Emiliano propone, ante pérdida>50%deventas sin quiebra patrimonial inmediata, estrategia financiera/jurídica previa: topes de responsabilidad por3–5tarifas mensuales o seguro del cliente con renuncia a subrogación, RCdeguarda para saldo no limitado trasladando prima al precio y crédito standby para proteger pagos operativos.

La afirmación de que ese porcentaje necesariamente destruye capital de trabajo queda como hipótesis: proporción de ventas no da liquidez, vencimientos ni financiación. Los instrumentos son propuestas del revisor, no condiciones contractuales válidas redactadas ni cobertura implementada. No se presume costo cero o aceptación de la renuncia por aseguradoras. [Código Civil y Comercial actualizado, art.1743](https://www.argentina.gob.ar/normativa/nacional/norma-235975/actualizacion) contempla invalidez de ciertas limitaciones por derechos indisponibles, normas imperativas, abuso o dolo; no se decide aquí validez de un tope específico paraS06. No se contactan clientes, bancos o aseguradoras.

### EV-11

**Emiliano asigna Crítica incondicional** a probable/económicoextremo/preparaciónmedia. Propone piso que preparación intermedia no pueda rebajar y tratamiento por dirección, monitoreo y fondos. Es una propuesta distinta a regla congelada: P4,I-econ5,V-cont3,V-rec3da V-econ3y C-econ60→Alta; P5conmismoperfilda75→Crítica. Ejemplo hipotético de combinación, sin cambios en factoresS06.

V3noes porcentaje40–50%de mitigación yP≥4no garantiza materialización en el ejercicio. I-econ5no demuestra automáticamente terminalidad. No se cambia banda ni se agrega piso/obligaciones de gobierno enFase12.

### EV-22

**Emiliano rechaza empates** para asignación ejecutiva y propone lexicografía:

1. Personas/vida y salud.
2. Penal directa o suspensión de habilitación.
3. Causalidad sistémica/punto único de falla.
4. Pérdida irreversible no transferible frente a pérdida temporal de ingresos.
5. Proximidad de ventana de actuación/materialización.

Propuesta posterior: D10actual compara banda,C,Iefectivo,Personas, no esa secuencia ni Legal/grafo causal/retención/fecha. Usar seguro para desempatar criticidad cambiaríaD17; no se incorpora. Si son prioridades de acciones, distinguirlas del orden de criticidad. No se inventa desempate final si también esos criterios coinciden.

### Estado final

**Ocho preguntas de§16respondidas y fragmento completado. Piloto guiadoS06completado; Fase12global abierta.** Las respuestas son posteriores a revelación; propuestas no aprobadas como nueva versión. Reglas, factores y snapshots cerrados sin cambios.

## Índice de estado al cierre

| Pregunta | Estado final |
|---|---|
| EV-02 | Respondida; referencia económica alternativa y controles propuestos |
| EV-06/37 | Respondida; exposición jurídica contextual, automatismos sin respaldo verificado |
| EV-08 | Respondida; rechaza equivalencia de banda de amenaza terminal |
| EV-10 | Respondida; estratégico/táctico y distinción económica; fragmento completado |
| EV-11 | Respondida; propone Crítica incondicional, no implementada |
| EV-20 | Respondida; prioridad al remoto fatal/prolongado |
| EV-22 | Respondida; propone lexicografía nueva, no implementada |
| EV-24 | Respondida; rechaza orden principal, tamizaje sólo condicionado |

Las menciones de pendientes en entradas anteriores son estado histórico durante la recopilación; este índice expresa el estado final. No quedan preguntas pendientes del piloto.
