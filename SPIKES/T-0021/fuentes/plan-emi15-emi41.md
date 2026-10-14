Plan de trabajo EMI-15 + EMI-41 · Risk OS
Copia del contenido del mensaje de Emiliano del 2026-10-05 15:02 UTC (thread "Plan EMI-15 + EMI-41 y prompts" del proyecto del-campo OS). Es el registro de las decisiones tomadas después de la revisión adversarial. Contenido sin cambios; sólo se normalizaron encabezados y algunas listas se pasaron a línea. No editar: si algo cambia, se registra en changelog-metodologia.md.

Objetivo
Trabajar EMI-15 y EMI-41 como un único experimento iterativo:

EMI-15 define y valida una metodología de criticidad explicable, reproducible y ejecutable.
EMI-41 genera casos sintéticos y riesgos suficientemente contrastantes para intentar romper esa metodología.
La metodología no se considera correcta por diseño. Se considera una hipótesis falsable que debe sobrevivir casos adversariales, evaluación independiente, regresión y revisión profesional.

Flujo general: decisiones consolidadas → protocolo → casos de propiedad → metodología v0 → dry run → adjudicación → empresas sintéticas → evaluación ciega → calibración → regresión → v1 candidate

Fase 0 · Consolidar las decisiones actuales
Objetivo
Crear un único source of truth de la metodología antes de seguir experimentando.

Trabajo del agente
Crear:

decisiones-v0.md
changelog-metodologia.md
Consolidar P1–P10 y D2–D19 incorporando todas las decisiones posteriores a la revisión adversarial.

Decisiones especialmente importantes
Criticidad
La criticidad sirve para:

priorizar riesgos;
ordenar la lista;
representarlos en la matriz.
No equivale automáticamente a prioridad del plan de acción.

Fórmula bajo prueba
C_raw = P × I × V Es un índice ordinal de priorización, no una medición cardinal ni actuarial. Debe tratarse explícitamente como una hipótesis falsable.

P
Probabilidad de que el evento ocurra durante los próximos 12 meses. P incorpora:

exposición;
condiciones actuales;
controles preventivos.
Conceptualmente cubre todo lo anterior al evento.

I
I representa la magnitud potencial bruta de las consecuencias para esta organización, dado que el evento ocurrió:

antes de considerar controles posteriores al evento;
antes de transferencia financiera.
Dimensiones:

económico;
personas;
continuidad;
legal/regulatorio.
I efectivo = max(dimensiones). Las dimensiones no son convertibles entre sí, pero deben ser comparables nivel a nivel.

V
V representa la vulnerabilidad desde que el evento ocurre:

contención;
respuesta;
redundancia;
recuperación.
P y V quedan separados mediante un corte temporal en el instante del evento.

Estado actual
La criticidad representa el estado actual/residual mediante: P_actual × I_bruto × V_actual Se conserva historial y baseline.

Unknowns
Si existe un valor defendible más plausible:

ese valor calcula la criticidad;
se conserva el rango;
el extremo superior genera un techo plausible;
el techo no participa del ranking.
Si no existe ningún valor plausible defendible:

el factor queda unknown;
no se inventa un valor;
la criticidad puede quedar no evaluable;
se genera necesidad de validación.
La incertidumbre nunca modifica directamente el score.

Consecuencias extremas
No existen pisos automáticos de banda en v0. Las consecuencias extremas generan: consecuencia_extrema = true y deben permanecer explícitamente visibles y filtrables. Los casos de propiedad determinarán si posteriormente hace falta algún piso normativo específico.

Seguro y transferencia
La transferencia aseguradora no modifica la criticidad. La criticidad utiliza siempre impacto económico bruto. La exposición económica retenida se registra y visualiza separadamente en risk-transfer.

Dinámica
Una acción no modifica automáticamente P, I o V. El cambio esperado de una acción es sólo una hipótesis. Los factores cambian únicamente después de una reevaluación sustentada en evidencia aceptada.

Fase 1 · Definir el protocolo experimental
Objetivo
Preregistrar cómo vamos a evaluar la metodología antes de ver sus resultados.

Trabajo del agente
Crear protocolo.md. Debe definir:

Ficha de evaluación
Por riesgo y evaluador:

risk_id
empresa/caso
evaluador
versión de metodología
fecha
riesgo expresado como causa → evento → consecuencia
P
dimensiones de I
I efectivo
V
rangos si existen
evidencia utilizada
procedencia
uncertainty
criticidad obtenida
techo plausible
reglas aplicadas
justificación
review_status
anomalías/fricciones
Granularidad del riesgo
Regla inicial: Un riesgo representa un evento con una cadena de consecuencias que comparte P y V. Si dos consecuencias requieren P o V diferentes, probablemente deben representarse como riesgos distintos. En la evaluación ciega ambos evaluadores trabajan sobre la misma lista de riesgos ya definida.

Anomalías
Mantener y ajustar la tipología A1–A10. Registrar como mínimo:

divergencia entre evaluadores;
unknown sin regla;
solapamiento P/I/V;
doble conteo;
resultado contraintuitivo;
granularidad incorrecta;
colisiones de ranking;
contradicciones entre reglas.
Causa de cada reevaluación
Agregar: motivo = accion_ejecutada | informacion_nueva | cambio_contexto | correccion_evaluacion | cambio_version_metodologia Esto permite distinguir:

mejora real;
aprendizaje;
cambio externo;
corrección;
cambio metodológico.
Reproducibilidad
Preregistrar métricas:

acuerdo por factor;
acuerdo de banda;
acuerdo de ranking.
Targets experimentales iniciales:

al menos 80% de evaluaciones dentro de ±1 nivel por factor;
al menos 70% de coincidencia de banda;
registrar correlación/overlap del ranking como baseline inicial.
Estos porcentajes son criterios experimentales v0, no estándares universales.

Fase 2 · Construir casos de propiedad
Objetivo
Definir comportamientos esperados antes de ejecutar la fórmula.

Trabajo del agente
Crear casos-de-propiedad.md con aproximadamente 15–20 casos adversariales. Incluir como mínimo:

Varias combinaciones P/I/V con el mismo raw score.
Riesgo frecuente moderado vs remoto catastrófico.
P5 I5 V1 vs P3 I3 V3.
Riesgo con mejora fuerte de V pero I extremo.
I=(4,1,1,1) vs I=(4,4,4,4).
Incendio con rociadores y detección para probar P/V.
Riesgo tecnológico con controles preventivos y de recuperación.
Unknowns simultáneos en P/I/V.
Seguro sobre riesgo con consecuencias humanas.
Acción que espera V4→V2 pero la reevaluación produce V3.
Mismo riesgo en empresas de tamaños muy diferentes.
Riesgo agregado vs dividido en varios sub-riesgos.
Multa + suspensión operativa para probar dimensiones de I.
Contención fuerte con recuperación débil.
Riesgo de baja probabilidad con consecuencia extrema.
Trabajo de Emiliano
Para cada caso fijar antes de correr la fórmula:

qué riesgo debería quedar arriba;
si pueden empatar;
si sólo importa que alguno permanezca visible;
qué comportamiento sería profesionalmente incorrecto.
El agente no debe mostrar previamente qué resultado produce P×I×V.

Fase 3 · Formalizar metodologia-v0.md
Objetivo
Convertir las decisiones en una especificación ejecutable.

Trabajo del agente
Crear metodologia-v0.md. Debe incluir:

Escala P 1–5
Usar como ancla principal evidencia observable:

antecedentes;
recurrencia;
presencia de condiciones causales;
experiencia en empresas comparables.
Los porcentajes quedan como referencia secundaria cuando existe información cuantitativa real.

Escalas de I 1–5
Definir explícitamente:

Económico. Consecuencia monetaria para esta empresa. Debe ser relativa a su capacidad económica, no a montos absolutos universales. Incluye:

daño directo;
multas;
pérdida económica por interrupción.
Personas. Consecuencias humanas. No se monetizan.

Continuidad. Consecuencia operativa no monetaria:

tiempo sin operar;
degradación de servicio;
incapacidad de cumplir funciones críticas.
Legal/regulatorio. Consecuencia jurídica/regulatoria no monetaria:

pérdida de habilitación;
restricción de operar;
responsabilidad relevante;
intervención regulatoria.
V 1–5
Evaluar post-evento. Usar como rúbrica:

contención;
recuperación.
Ante perfiles mixtos, documentar qué aspecto domina la evaluación.

Criticidad
C_raw = P × I × V Mantener:

factores visibles;
raw score interno;
banda visible.
No presentar el índice como una escala cardinal continua.

Ranking
Definir una versión inicial explícita. Los desempates y su orden deben considerarse también hipótesis experimentales si los casos muestran problemas.

Extremos
Mostrar bandera consecuencia_extrema. No alterar la banda automáticamente en v0.

Unknowns
Aplicar la regla acordada de:

valor plausible;
rango;
techo plausible;
unknown no evaluable.
Fase 4 · Dry run sobre casos de propiedad
Objetivo
Intentar falsar la metodología antes de crear empresas sintéticas.

Trabajo del agente
Congelar metodologia-v0. Ejecutar todos los casos. Clasificar cada resultado como:

PASS: la metodología produce el comportamiento previamente adjudicado.
FAIL — calibración: la estructura parece correcta pero banda/umbral incorrecto.
FAIL — ranking: el orden resultante contradice el comportamiento esperado.
FAIL — definición: el caso no puede puntuarse de manera reproducible.
FAIL — contradicción: dos reglas generan instrucciones incompatibles.
FAIL — combinación: el problema parece provenir directamente de P×I×V.
Crear reporte de resultados y actualizar changelog-metodologia.md.

Fase 5 · Adjudicación y metodología v0.x
Trabajo de Emiliano
Revisar únicamente los FAIL. No reabrir decisiones que funcionaron correctamente.

Trabajo del agente
Para cada FAIL:

identificar regla afectada;
explicar causa;
proponer corrección mínima;
mostrar efectos sobre casos ya aprobados;
ejecutar regresión.
Criterio de falsación de D14
P × I × V debe permanecer como hipótesis. Si múltiples casos independientes previamente adjudicados producen órdenes incorrectos que no pueden corregirse mediante:

calibración;
anclas;
o desempates simples,
entonces la regla de combinación debe considerarse falsada y reabrirse.

Fase 6 · Diseñar la cobertura de EMI-41
Objetivo
Elegir empresas por el tipo de problema metodológico que permiten probar, no simplemente por industria.

Trabajo del agente
Identificar contrastes aún no cubiertos, por ejemplo:

alta severidad / baja probabilidad;
alta frecuencia / baja severidad;
exposición humana;
dependencia tecnológica;
regulación fuerte;
concentración de activos;
alta resiliencia;
alta vulnerabilidad;
PyME vs empresa grande;
transferencia aseguradora relevante;
información incompleta;
operaciones altamente redundantes;
exposición a terceros.
Proponer empresas sintéticas capaces de cubrir esos contrastes.

Trabajo de Emiliano
Aprobar el conjunto. Regla:

mínimo 5 empresas;
sin máximo fijado de antemano;
agregar una empresa sólo si aporta cobertura metodológica nueva.
Fase 7 · Construir empresas y riesgos sintéticos
Trabajo del agente
Para cada empresa crear contexto suficiente para evaluar:

P: exposición; antecedentes; controles preventivos; condiciones causales.

I: tamaño de la empresa; activos expuestos; personas expuestas; procesos críticos; consecuencias económicas; consecuencias legales.

V: contención; respuesta; redundancia; recuperación.

Transferencia (cuando sea útil): cobertura; límite; deducible; exclusiones; exposición retenida.

Riesgos. Crear un conjunto manejable y relevante. Preferir aproximadamente 6–12 riesgos sólidos por empresa antes que grandes catálogos superficiales. Incluir deliberadamente algunos casos con información incompleta para probar R1. Aplicar siempre las reglas de procedencia e incertidumbre de EMI-17.

Fase 8 · Evaluación ciega humano/agente
Objetivo
Medir reproducibilidad real.

Procedimiento
Cada riesgo ya debe estar definido antes de la evaluación. Emiliano y el agente reciben exactamente la misma ficha. El agente no ve:

evaluación de Emiliano;
justificación;
ranking;
valores asignados.
Ambos producen independientemente: P; dimensiones de I; I efectivo; V; uncertainty; criticidad; techo; justificación.

Comparación
Un proceso posterior calcula: divergencia P; divergencia por cada dimensión de I; divergencia V; divergencia de banda; divergencia de ranking; anomalías A1–A10.

Fase 9 · Calibrar las bandas
Objetivo
Definir Baja / Media / Alta / Crítica usando evidencia del experimento. No usar cortes arbitrarios o equiespaciados.

Procedimiento
Utilizar primero casos de propiedad sin consecuencias extremas.
Crear umbrales preliminares.
Incorporar casos extremos.
Evaluar distribución sobre todas las empresas sintéticas.
Verificar que las bandas realmente discriminen.
Ajustar si la metodología coloca una proporción excesiva de riesgos en una sola banda.
Ejecutar nuevamente los casos de propiedad.
No fijar de antemano porcentajes obligatorios de riesgos que deben caer en cada banda.

Fase 10 · Regresión completa
Cada modificación metodológica obliga a ejecutar nuevamente:

todos los casos de propiedad;
todos los riesgos de EMI-41.
El reporte debe indicar: qué resultados cambiaron; cuáles mejoraron; cuáles regresionaron; qué regla produjo cada cambio; qué versión metodológica produjo el resultado.

No aceptar correcciones locales sin comprobar su impacto global.

Fase 11 · Metodología v1 candidate
Cuando: los casos de propiedad sean satisfactorios; las divergencias sean interpretables; las bandas discriminen; el ranking sea profesionalmente defendible; la regresión esté estable; crear metodologia-v1-candidate.md. Congelar temporalmente esa versión.

Fase 12 · Revisión profesional
Aplicar la metodología sobre una selección de casos sin mostrar previamente el resultado de Risk OS. Revisores potenciales: Emiliano; Evangelina; Manuel; otros profesionales relevantes. Comparar: prioridades; factores; discrepancias; explicaciones. El objetivo no es coincidencia numérica perfecta. La pregunta es: ¿La metodología produce prioridades profesionalmente defendibles y podemos explicar por qué aparecen las divergencias? Registrar todas las discrepancias relevantes.

Fase 13 · Cierre de EMI-15
EMI-15 se considera terminada cuando existe: metodología documentada; P/I/V definidos; reglas de unknowns; reglas dinámicas; casos de propiedad; dry run; regresiones; evidencia de reproducibilidad; calibración de bandas; discrepancias documentadas; revisión profesional; decisión explícita sobre la validez provisional de P × I × V.

Fase 14 · Cierre de EMI-41
EMI-41 se considera terminada cuando existe: al menos 5 empresas sintéticas; diversidad metodológicamente justificada; riesgos plausibles; controles y condiciones documentados; procedencia e incertidumbre; escenarios con unknowns; resultados P/I/V; cobertura suficiente para haber tensionado la metodología; dataset reutilizable para Risk OS.

Fase 15 · Handoff a EMI-16
Una vez estabilizada la metodología, derivar el contrato de datos.

risks.csv deberá poder representar, según lo que confirme el experimento: P; dimensiones de I; I efectivo; V; rangos; valor plausible; evidencias por factor; procedencia; uncertainty; consecuencia extrema; criticidad; banda; techo plausible; versión metodológica; review_status; historial/referencias necesarias.

action-plan.csv deberá poder representar: riesgo relacionado; acción; factor o factores objetivo; mecanismo causal; cambio esperado; estado de ejecución; evidencia; efecto observado posteriormente.

risk-transfer.csv deberá representar: riesgo relacionado; póliza/cobertura; límites; sublímites; deducibles; exclusiones; exposición económica retenida; evaluación de suficiencia de transferencia.

La transferencia no modifica la criticidad.

División humano / agente
Emiliano
Interviene principalmente en cuatro momentos:

aprobar que las decisiones consolidadas representen correctamente lo acordado;
adjudicar los resultados esperados de los casos de propiedad;
resolver los FAIL que requieran juicio profesional;
aceptar o rechazar la metodología candidata final.
Agente
Puede ejecutar: consolidación documental; protocolo; generación de casos; investigación; metodología escrita; dry runs; análisis de inconsistencias; empresas sintéticas; catálogo de riesgos; evaluación independiente; comparación de evaluadores; métricas; calibración asistida; regresiones; changelog; preparación de contratos para EMI-16.

Principio operativo
El humano fija criterio. El agente convierte ese criterio en reglas, intenta falsarlas, genera evidencia y devuelve únicamente las excepciones que requieren juicio humano.