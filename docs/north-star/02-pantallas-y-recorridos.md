# Pantallas y recorridos · prototipo v25

## Navegación (orden fijo; los perfiles solo ocultan)

| Sección | Qué contiene | Quién la ve |
|---|---|---|
| Inicio | Tareas, a atender, gestiones en curso, evaluaciones por aceptar, indicadores con acción, accesos rápidos; pestaña Equipo (Manuel, Emiliano) | Equipo, R1 |
| Clientes | Personas, Empresas, Prospectos; fichas con Resumen, Contactos, Pólizas, Riesgos, Gestiones, Tareas, Notas, Historial | Equipo, R1 (solo sus empresas) |
| Pólizas | Lista y ficha de póliza (datos, documento, versiones, objetos, riesgos que la citan, **verificación contra lo pedido**) | Equipo, R1 |
| Comunicación | WhatsApp, correo, Sin asignar, Sin identificar; atención y delegación | Equipo |
| Gestiones | Siniestros, cotizaciones, renovaciones, facturación | Equipo según permiso |
| Riesgos | Cartera con conteos por banda (sin índice) y entrada a cada empresa | Manuel, Evangelina, Emiliano; Lucía y Matías en lectura; R1 |
| Automatizaciones | Ejecuciones de agentes (Futuro) y confirmaciones | Equipo |
| Importación | **Relevamientos**, Lotes de importación, **Puentes con LLM** | Manuel, Evangelina, Emiliano |
| Configuración | Permisos, llegadas de prospectos, datos para ser cliente, alertas, catálogos, integraciones, historial | Manuel, Emiliano |
| Demo | **Recorrido integral**, Registro de eventos, Acerca del prototipo | Todos |

### Riesgos de una empresa (subpestañas)

Panel de control · Matriz y lista · Plan de acción · Transferencia (+ posibles brechas, solo equipo) · Layout · Solicitudes y revisiones (equipo) · **Relevamiento** (equipo, antes «Investigación») · **Informe anual** (equipo siempre; empresa solo cuando está compartido).

### Portal de empresas

Resumen (conteo por banda, solicitudes, **información que pide Del Campo**, **informe anual compartido**, carpeta de Drive) · Riesgos (mismas subpestañas que el equipo, sin solicitudes, relevamiento ni brechas) · Solicitudes · Evidencias. Otra empresa ve «Sin acceso».

## Cambios de la v25 por pantalla

| Pantalla | Cambio |
|---|---|
| Riesgos › Relevamiento | Seis pasos con «dónde ocurre», candidatos y su destino, evidencia de inspección, cuestionario con validación, evaluación profesional, registro (lote CSV). |
| Riesgos › Transferencia | Bloque «Posibles brechas de cobertura» con origen MCP (demostración) y decisiones con motivo. Resumen de la comparación de póliza en la transferencia; «Marcar verificada» deshabilitado mientras haya diferencias abiertas. |
| Ficha de póliza | «Verificación contra lo pedido» (pedido, propuesta, emitida, necesidad, resultado, evidencia, decisión). |
| Riesgos › Informe anual | Borrador del LLM con datos de Broker OS; revisar texto, aprobar, compartir. |
| Panel de control | Equipo: «Puntaje de riesgo» y su curva, rotulados «solo para el equipo». Portal: «Críticos y altos» con conteo por banda, sin puntaje. Ambos: riesgos por banda por trimestre y criticidad de cada riesgo. |
| Importación | Pestañas Relevamientos / Lotes / Puentes con LLM; el lote muestra su origen y enlaza al relevamiento. |
| Portal › Resumen | Preguntas abiertas con respuesta; tarjeta del informe compartido. |
| Configuración › Integraciones | Filas de Puente A (funciona) y Puente B (demostración). |
| Demo | Pestaña «Recorrido integral» con los 12 pasos y botón «Ir como…»; versión y decisiones en «Acerca». |
| Toda pantalla | «Brecha a producción» pasa a llamarse «Qué falta para producción» (no se confunde con brechas de cobertura). |

## Recorridos

Los ocho recorridos del prompt maestro (R1 a R8: inicio por rol de Manuel, renovaciones de Evangelina, alta de Victoria, cotización de Lucía, facturación de Jimena, siniestro de Pilar, WhatsApp y correo) siguen igual y con sus pruebas (`r1-manuel.js` … `r7-r8-am32.js`).

El **recorrido integral de riesgos** (nuevo, `pruebas/cierre-v25.js`) está detallado en `03-guia-de-demostracion.md`.
