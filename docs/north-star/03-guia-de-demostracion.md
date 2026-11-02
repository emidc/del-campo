# Guía de demostración · recorrido integral de Bodega Cerro Liso (≈ 15 minutos)

Antes de empezar: Demo › Acerca › «Reiniciar demo». En el prototipo, Demo › Recorrido integral tiene un botón «Ir como…» por paso que cambia de perfil y abre la pantalla.

Mensajes a remarcar durante la demo:
- Lo que hace la IA ocurre **fuera** de Broker OS. Acá llega su resultado, rotulado: Puente A · CSV (funciona en el prototipo) o Puente B · MCP (demostración, sin servidor).
- Ninguna decisión la toma la IA. Cada confirmación tiene autor y queda en el registro de eventos.
- La empresa no ve puntajes ni índices: conteos por banda y motivos. El puntaje del panel es una herramienta interna del equipo.

| # | Paso | Perfil | Dónde | Qué mostrar y hacer |
|---|---|---|---|---|
| 1 | Empresa identificada | Evangelina | Clientes › Bodega Cerro Liso › Resumen | Datos, contactos (Laura Ferro), 3 pólizas, vínculo con Risk OS. |
| 2 | Riesgos preliminares preparados afuera | Evangelina | Riesgos › Relevamiento | Paso 1 «LLM externo»: 11 candidatos. «Un candidato no es un riesgo.» |
| 3 | Evidencia de una inspección | Evangelina | Riesgos › Relevamiento | Paso 2: inspección presencial del 08/10, 4 fotos ficticias por zona, observaciones y relatos. Paso 3: 2 descartados con motivo, 3 descubiertos (granizo, corte de ruta, estanterías), 3 inciertos. |
| 4 | Información faltante | Laura Ferro (portal) → Evangelina | Portal › Resumen → Relevamiento | Laura responde la pregunta 3 (electricista). Queda «Informada por la empresa · a validar». Evangelina valida la pregunta 2 escribiendo cómo («Registro de visitas de octubre»). La evaluación no cambia sola. |
| 5 | Evaluación revisada | Evangelina | Riesgos › Relevamiento | Paso 5: Risk OS v1, evaluó Evangelina, revisó Manuel, supuestos e incertidumbres. |
| 6 | Importación en Broker OS | Evangelina → Manuel | «Revisar y confirmar la importación» → Lote LOTE-CL-2 | Origen «Puente A · CSV». Vista previa: 2 nuevas, 3 cambios, 1 conflicto, 1 error (RV-FAC-03). Corregir la probabilidad a 3, «Conservar el avance» e «Importar el lote». Los riesgos nuevos quedan **pendientes**: Manuel los acepta desde su Inicio (Evangelina no puede aceptar lo que importó). |
| 7 | Visualización y gestión de riesgos | Manuel | Riesgos › Matriz y lista, Plan de acción | Granizo y corte de ruta aparecen; el paso 6 del relevamiento queda «Hecho». |
| 8 | Brecha de cobertura | Evangelina | Riesgos › Transferencia › Posibles brechas | Origen «Puente B · MCP: demostración». Abrir «02 · Pérdida de vino en tanques»: cobertura existente, fundamento (cláusula 4.2), evidencia, faltante, acción. «Confirmar brecha». Mostrar la de helada (información pedida = pregunta 5) y la de robo (riesgo que la empresa retiene, con constancia). |
| 9 | Comparación de una póliza emitida | Evangelina | Pólizas › ALT-TRO-20931 › Verificación contra lo pedido | 3 coinciden, 3 difieren, 1 incierta. «Marcar verificada» está deshabilitado. Reclamar la exclusión 4.2 (crea la gestión «Reclamo a la compañía»), aceptar el sublímite con justificación, pedir aclaración del acreedor. |
| 10 | Acción de mitigación o transferencia | Evangelina | Riesgos › Plan de acción / Transferencia | Registrar avance de «Línea de vida y arnés en pasarelas». Para terminar la transferencia: registrar cómo se resolvió el reclamo y la aclaración y recién entonces «Marcar verificada en póliza». |
| 11 | Informe anual preparado y aprobado | Manuel | Riesgos › Informe anual | Borrador del LLM; las ocho secciones salen de los datos (la brecha confirmada y la transferencia verificada ya aparecen). «Aprobar el informe» (Evangelina no puede: registró el borrador) y «Compartir en el portal». |
| 12 | Portal del cliente | Laura Ferro | Portal › Resumen → Ver el informe | Ve el informe sin el origen técnico ni las brechas en revisión, sus preguntas abiertas y su matriz. Cambiar a Hernán Ríos: «Sin acceso». |

## Qué decir si preguntan

- **¿Esto ya funciona con ChatGPT/Claude/Gemini?** No. El CSV de riesgos se importa de verdad en el navegador; MCP es una demostración con borradores precargados.
- **¿Se puede confiar en lo que dice la IA?** Broker OS muestra fundamento y evidencia, y obliga a una decisión humana con motivo.
- **¿Dónde está el puntaje?** Solo en el panel del equipo. La empresa (portal e informe anual) ve conteos por banda, como pide la metodología RO01.
