# Prompt · Fase 12 · Revisión profesional de metodología v1 candidate

Estado: preparado y cotejado con el plan y el README suministrados por Emiliano el 2026-10-13; la corrida no comenzó. Workstream BOS / Risk OS, T-0021.

## Cómo correrlo

En un chat del proyecto: «Corré el prompt de `/mnt/project-files/T-0021/prompts/fase-12-revision-profesional.md`». En una terminal de la repo: usar el contenido de este prompt. Definir RAIZ como la carpeta `T-0021/` del entorno; en esta repo es `SPIKES/T-0021/`. Todas las rutas siguientes son relativas a RAIZ. No depende de herramientas propias de los chats.

Necesita antes: Fase 11b aprobada y v1 candidate congelada; EV-11-0063/0064 aceptadas el 2026-10-13. Después, Emiliano revisa las discrepancias y el dictamen profesional. El cierre de EMI-15 y la decisión explícita sobre la validez provisional de P × I × V corresponden a Fase 13, no se declaran terminados en esta fase.

## Objetivo

Organizar y documentar una revisión profesional independiente de la v1 candidate congelada. Preguntas de cierre: ¿las prioridades son defendibles con la evidencia disponible?, ¿las divergencias entre profesionales y Risk OS tienen una explicación verificable? El acuerdo numérico es evidencia descriptiva, no una aprobación automática.

## Contexto y límites

Trabajar en RAIZ. Leer como coordinador:
- `v1/congelamiento.md` y `v1/metodologia-v1-candidate.md`, especialmente §§15–19.
- `v0/protocolo.md` (§§2, 4, 6, 10, 11 y 13), `v0/decisiones-v0.md` y `v0/plantillas/ficha-evaluacion.csv`.
- `v0/fase-11/reporte-fase-11.md` y el registro de aceptación de EV-11-0063/0064.
- `fuentes/plan-emi15-emi41.md`, sección «Fase 12», y `prompts/README.md`.
- `fuentes/respuestas-emiliano.md`, si está disponible: es la fuente de las respuestas de Emiliano. Si cambia una respuesta, actualizarla ahí, sin duplicarla ni reemplazarla en los prompts. Este checkout todavía no contiene ese archivo; no inventar su contenido.

El plan y el README fueron suministrados por Emiliano el 2026-10-13. El plan se conserva sin cambios en `fuentes/plan-emi15-emi41.md`; el índice recibido se conserva en `prompts/README.md` y se amplía con Fase 12. El plan pide aplicar la metodología sin mostrar antes resultados de Risk OS, comparar prioridades/factores/explicaciones y registrar discrepancias relevantes. Los pasos A/B/C de este prompt son una propuesta operativa para ejecutar esa revisión y distinguir juicio previo de aplicación de reglas; no son una nueva regla metodológica ni una exigencia textual adicional del plan. Acordar su uso al fijar muestra y revisores, antes de iniciar. Las inconsistencias se registran y se consultan: no se corrige el protocolo congelado en el camino. Su encabezado declara v1 candidate, aunque §1.2 conserva v0.2; registrar que la corrida usa el encabezado vigente y documentar esa inconsistencia.

No editar `v1/` ni los archivos de la tabla de congelamiento durante la revisión. Los cambios de aceptación autorizados por la regla 5 se documentan con huellas anteriores y posteriores en un registro separado. No regenerar CSV históricos para preparar la muestra. Una evaluación nueva es una ficha nueva, vinculada por `evaluacion_anterior_id` cuando corresponda. No ajustar reglas, umbrales, casos ni expectativas a partir de los resultados. Las propuestas de cambio quedan para otra versión y su regresión.

## 1. Preparación y preregistro

Crear `v0/fase-12/` con `preregistro.md`, `muestra.csv`, `revisores.csv`, `paquetes/`, `referencia/`, `evaluaciones/`, `comparacion/` y `reporte-fase-12.md`, conforme se produzcan sus contenidos. No declarar revisiones ni respuestas que todavía no ocurrieron.

Antes de entregar casos, acordar con Emiliano y registrar:
- Identificador de corrida, fecha, SHA del repositorio, versiones y huellas de las fuentes congeladas; listar por separado las excepciones de aceptación de Fase 11.
- Casos seleccionados, universo, tamaño y motivo de inclusión; cobertura de rubros, tamaños y situaciones de las preguntas de §16. Si se sortea, fijar semilla y procedimiento antes de abrir resultados. Una muestra dirigida se declara exploratoria; no convertirla en representativa.
- Revisores confirmados, experiencia pertinente, disponibilidad, asignación de casos y exposición previa a cada caso o a sus resultados. Posibles: Emiliano, Evangelina, Manuel y otros profesionales. No asumir participación ni contactar a nadie sin autorización explícita.
- Cada caso debe ofrecer varios riesgos de una misma empresa para poder comparar prioridades. Registrar cuáles comparaciones podrán hacerse y qué quedará fuera. No comparar rankings entre empresas.
- Información idéntica para todos los evaluadores; fecha de corte y política de aclaraciones. Una aclaración se entrega a todos, se versiona y se registra.

Emiliano y quien haya visto resultados previos pueden participar, pero sus casos expuestos se informan por separado de los revisores nuevos. La coordinación actual ya conoce resultados de Fase 11: no presentarla como evaluación independiente.

## 2. Paquetes y evaluación sin resultados previos

Preparar un paquete por caso con contexto de empresa y los riesgos `causa → evento → consecuencia`, evidencia y transferencia, sin factores asignados, score, banda, ranking, banderas calculadas, intención de diseño ni evaluaciones anteriores. Inspeccionar contenido y enlaces para que no filtren esas salidas. Entregar a los revisores sólo este paquete, nunca el árbol completo de la repo.

Separar tres momentos y registrar su fecha y huella:

**A. Juicio profesional previo.** Antes de mostrar resultados o fórmula de Risk OS, cada profesional ordena los riesgos, permite empates, indica prioridades de atención, factores que las justifican, explicaciones y datos faltantes. No exigir un número donde el profesional no pueda defenderlo. Registrar su escala propia, sin convertirla silenciosamente en bandas Risk OS.

**B. Aplicación de la v1 candidate.** Entregar metodología, protocolo y plantilla congelados, todavía sin resultados de Risk OS ni de otros revisores. Cada profesional asigna P, I por dimensión, contención y recuperación, con rangos, procedencia, evidencia, incertidumbre y explicación. Guardar una ficha por riesgo con identificador único, `actor = human`, `fase = 12`, versiones y corrida. Calcular los derivados con las reglas congeladas. Conservar el juicio A y explicar diferencias con el orden obtenido en B.

La referencia de Risk OS usa exactamente la misma información y v1 candidate. Registrar autor, fecha, versión y origen; si es una salida del arnés, identificarla como cálculo de referencia, sin atribuirla a una aplicación de producto. No llamar independiente a una evaluación histórica reutilizada. Una nueva evaluación de agente nace `actor = ai`, `review_status = pending`.

**C. Revelación y comparación.** Sólo cuando estén cerradas todas las entregas A y B de los revisores asignados al caso, abrir la referencia y los resultados de los demás. Conservar entregas originales; cualquier corrección posterior es un registro nuevo y se etiqueta como posterior a la revelación.

## 3. Comparación y discrepancias

Comparar por caso y por revisor:
- Juicio A frente al orden y explicación de Risk OS; declarar empates y prioridades indeterminadas.
- Factores B frente a la referencia: valores, rangos, `unknown`, procedencia, escenario de referencia y corte entre P y V.
- Derivados: evaluabilidad, `C_raw`, banda, dimensión determinante, I efectivo, banderas, techo y orden dentro de la empresa. Separar ranking, seguridad y cola de validación: el techo nunca ordena el ranking principal.
- Diferencias entre revisores y cambios de juicio después de la revelación.

Registrar **todas** las discrepancias, incluso las explicables y las que no cambian una banda. Usar `comparacion/discrepancias.csv` con al menos: id, corrida, empresa, risk_id o par, revisor, etapa, campo, referencia, juicio_profesional, evidencia_ref, regla_ref, explicación, impacto_en_prioridad, clasificación, estado, responsable y respuesta_profesional_ref. Una clasificación propuesta por el coordinador no implica aceptación del profesional.

Usar la tipología del protocolo cuando aplique. Distinguir información faltante o distinta, interpretación de evidencia, asignación de factores, escenario/granularidad, error de cálculo, criterio profesional y limitación de reglas. Conservar las discrepancias sin explicación como abiertas. Una causa debe apuntar a evidencia o una regla; «criterio distinto» solo no alcanza.

Reportar acuerdo exacto y ±1 por factor, coincidencia de banda sobre ambos evaluables y coincidencia de evaluabilidad, siempre con numerador y denominador. Separar `unknown` y `no_aplica`; no codificarlos como números. En orden usar pares comparables de la misma empresa, con empates e indeterminados explícitos; tau-b y top-3 sólo cuando se evalúen empresas completas. Los targets de Fase 8 no son umbrales nuevos de aprobación de Fase 12.

## 4. Conversación profesional y cierre

Después de la entrega independiente, presentar las ocho preguntas de metodología §16 con sus ids EV-02, EV-06/37, EV-08, EV-10, EV-11, EV-20, EV-22 y EV-24. Guardar respuestas atribuibles al profesional y vinculadas a casos cuando los haya. No orientar las respuestas con las conclusiones previas del coordinador.

El reporte debe incluir: alcance efectivo, revisores y exposición previa, muestra y límites, versiones y huellas, secuencia de entregas/revelación, métricas con n, inventario completo de discrepancias, explicación e impacto de cada una, casos profesionalmente defendibles y cuestionados, pendientes y respuestas de §16.

Responder las preguntas de cierre con evidencia por caso. Pedir a Emiliano el dictamen humano de la fase y registrar sus términos reales. No declarar que la metodología generaliza por haber coincidido en una muestra sintética ni dar por resueltas divergencias sin respuesta profesional. Si falta información o revisión, el cierre queda pendiente.

Las propuestas para una versión posterior se describen aparte: problema observado, evidencia, cambio propuesto y regresión necesaria. Durante Fase 12 la v1 sigue congelada.

## Verificación de la ejecución

- Preregistro y selección anteriores a las entregas; misma información para cada evaluador.
- Entregas A/B fechadas y conservadas antes de revelar la referencia; exposición previa declarada.
- Cada discrepancia del cruce aparece en el registro, con evidencia y estado; totales reconciliados con el reporte.
- Métricas reproducibles desde las fichas; denominadores y exclusiones declarados.
- Huellas congeladas sin cambios salvo las aceptaciones autorizadas de Fase 11, trazadas por separado.
- Aceptación profesional atribuida sólo a una respuesta humana explícita. No inventar sesiones, participantes, dictámenes ni aceptación de fichas.
