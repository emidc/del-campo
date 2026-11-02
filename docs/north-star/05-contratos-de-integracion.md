# Contratos de integración CSV y MCP · prototipo v25

Reglas comunes a los dos puentes:

1. Todo lo que entra es **borrador** (MCP) o **vista previa** (CSV). Nada cambia el estado de Broker OS hasta que una persona con permiso confirma.
2. Cada registro conserva su **origen**: puente (`csv` | `mcp`), herramienta o archivo, fecha y hora, persona que ejecutó la sesión del LLM, y LLM usado.
3. IDs estables por empresa (`RSK-CL-12`, `BRE-CL-01`, `VER-CL-1`, `INF-CL-2026`). Una reimportación nunca borra comentarios, avances ni evaluaciones (append-only).
4. Nunca se aceptan ni se devuelven datos de tarjetas o bancarios (INV-P9): se omiten y se avisa.
5. Prohibido: puntajes o índices de riesgo por empresa o cartera (X-01); campos que marquen una decisión humana (`verificada`, `aceptada`, `aprobado`, `validada`).
6. Escritura atómica: si una fila tiene error, no se escribe ninguna.

## A · CSV

Formato: UTF-8, separador `;` o `,` (se detecta), primera fila de encabezados (sin distinguir mayúsculas ni tildes), máximo 500 filas y 200 KB.

### A1 · Evaluación de riesgos (implementado en el prototipo)

| Columna | Obligatoria | Regla |
|---|---|---|
| `id` | No | Vacío = riesgo nuevo (Broker OS asigna el código). Con valor: `RSK-<EMP>-<n>` de la misma empresa (RV-ID-01 a RV-ID-05). |
| `riesgo` | Sí | Nombre (RV-TXT-01). |
| `descripcion` | No | Texto. |
| `zona` | No | Nombre de una zona de la empresa (RV-ZON-01). |
| `probabilidad` | Con factores | Entero 1 a 5 (RV-FAC-03). |
| `impacto_economico`, `impacto_personas`, `impacto_continuidad`, `impacto_legal` | Con factores | 1 a 5 o `≥n` si falta un dato (RV-FAC-03). |
| `vulnerabilidad_economico`, `…_personas`, `…_continuidad`, `…_legal` | Con factores | Entero 1 a 5. |
| `que_falta_saber` | No | Texto: queda como información faltante del riesgo. |
| `seguridad_personas`, `consecuencia_extrema` | No | `sí` / `no` (RV-BOO-01). |

Todos los factores o ninguno (RV-FAC-01): sin factores, el riesgo queda «sin evaluar». Un riesgo con reevaluación pendiente no recibe otra (RV-EVA-01). Resultado: lote con filas nuevas, cambios, conflictos (con avances posteriores de la empresa) y errores; al importar, cada evaluación queda **pendiente** y la acepta otra persona.

### A2 · Brechas de cobertura (contrato; sin importador en el prototipo)

`id; riesgo_id; poliza_numero; cobertura_existente; posible_brecha; fundamento; evidencia (lista separada por |); informacion_faltante; accion_recomendada`

Estado inicial siempre `sin_revisar`. No admite columnas de puntaje, prioridad numérica ni estado.

### A3 · Comparación de póliza (contrato)

`poliza_numero; concepto; pedido; propuesta; emitida; necesidad_transferencia; resultado (coincide|difiere|incierto); evidencia; documentos_fuente`

Una fila por concepto. Las decisiones (aceptada, aclaración, reclamo, resuelta) son solo de Broker OS.

### A4 · Informe anual (contrato)

`empresa_id; periodo; resumen; recomendacion_1 … recomendacion_n`

Solo texto. Las cifras y listas no se importan: Broker OS las calcula con sus datos al aprobar.

## B · MCP + skills (preferido a futuro; demostración en el prototipo)

El servidor MCP de Broker OS autentica a la persona del equipo y limita cada llamada a las empresas que esa persona puede ver. Las skills (metodología de Risk OS, guía de inspección, comparación de pólizas, redacción del informe) viven del lado del LLM.

| Herramienta | Tipo | Entrada | Salida / efecto |
|---|---|---|---|
| `leer_empresa` | Lectura | `empresa_id` | Datos, actividad, contactos (sin bancarios) |
| `leer_riesgos` | Lectura | `empresa_id` | Riesgos con banda, factores vigentes, `que_falta_saber`, zonas, acciones y transferencias |
| `leer_polizas` | Lectura | `empresa_id` | Pólizas, vigencias, documento (enlace) |
| `listar_faltantes` | Lectura | `empresa_id` | Preguntas abiertas, riesgos sin evaluar, transferencias sin verificar |
| `registrar_borrador_evaluacion` | Escritura en borrador | filas del contrato A1 | Lote en vista previa (mismas reglas RV-*) |
| `registrar_borrador_brechas` | Escritura en borrador | filas del contrato A2 | Brechas `sin_revisar` con origen |
| `registrar_borrador_comparacion` | Escritura en borrador | filas del contrato A3 | Comparación sin decisiones |
| `registrar_borrador_informe` | Escritura en borrador | contrato A4 | Informe en `borrador` |

No existen herramientas para aceptar, confirmar, verificar, aprobar, compartir ni validar. Cada llamada queda en la auditoría con persona, LLM, herramienta, entrada resumida y efecto. El envío de datos a un proveedor externo requiere la autorización registrada de R-19.

## Contratos de datos que el sistema real debe respetar

| Entidad | Campos mínimos | Estados | Reglas |
|---|---|---|---|
| Relevamiento | empresa, org, ciclo, responsable, pasos[6] con estado y fecha | pendiente, en_curso, hecha | Pasos 1 y 3 solo guardan resultados externos |
| Candidato | título, origen (preliminar, inspección, refinamiento), riesgo vinculado | candidato, confirmado, descubierto, incierto, descartado | Descartar exige motivo; no es un riesgo hasta el registro |
| Inspección | modalidad, fecha, participantes, fotos (zona), observaciones, relatos | — | Fotos con permiso de la empresa |
| Pregunta | número, pregunta, riesgo, responsable, enviada, vence, respuesta, quién y cuándo, validación (quién, cuándo, cómo) | pendiente, respondida (informada por la empresa · a validar), validada | Validar no cambia la evaluación |
| Evaluación | P, I y V por tipo de daño, autor, revisor, evidencia, motivo, lote | pendiente, aceptada | Append-only; acepta otra persona |
| Brecha | riesgo, póliza, cobertura existente, posible brecha, fundamento, evidencia[], faltante, acción recomendada, origen, revisión (quién, cuándo, motivo) | sin_revisar, info_pedida, confirmada, descartada, aceptada_cliente | Sin puntajes; motivo o constancia obligatorios según la decisión |
| Comparación | póliza, transferencias, documentos, conceptos (pedido, propuesta, emitida, necesidad, resultado, evidencia, decisión) | coincide, difiere, incierto · aceptada, aclaración, reclamo, resuelta | «Verificada» solo por persona y sin diferencias abiertas |
| Transferencia | riesgo, póliza o referencia, incisos, revisión | propuesta, en_poliza_sin_verificar, verificada, referencia_sin_poliza | Transferir no cambia la banda |
| Informe anual | empresa, período, resumen, recomendaciones, origen, aprobado (quién, cuándo), instantánea de datos, compartido | borrador, aprobado, compartido | Aprueba alguien distinto de quien lo registró; datos congelados al aprobar |
