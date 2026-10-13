# CO01 — acta de aceptación con alcance reducido

Workstream: BOS. Registro: 2026-10-12. Tarea: T-0026.

## Dictamen y autoridad

**CO01 aceptado por decisión del owner, con validación limitada al bloque uno;
las pruebas restantes quedan en suspenso indefinido.**

El owner decidió ejecutar únicamente el primer bloque y aceptar CO01 al concluirlo,
dejando escrita esa reducción de alcance. El 2026-10-12 confirmó: «el bloque terminó
sin incidentes, la ventana se cerro en el momento esperado».

Esta decisión es una excepción explícita al requisito conjunto de
`SLICES/CO01.md` §4 y al outcome de aceptación de T-0026. El contrato original se
conserva como historia: no se declara cumplido el protocolo de 72 horas, no se bajan
sus umbrales para producir un resultado técnico aprobado y no se presenta como
exitoso un informe automático que no se ejecutó. La aceptación funcional del owner
no equivale a completar todos los pendientes de despliegue y verificación de T-0026.

## Intervalo y fuentes

- Bloque uno: **2026-10-10 10:17:17 a 2026-10-11 10:17:17**, hora de Mendoza
  (UTC−03:00), 24 horas.
- Dos participantes, P1 y P2; consentimiento escrito confirmado por el owner.
- Evidencia: capturas de UI, WhatsApp, logs y resultado SQL aportados por el owner,
  más sus confirmaciones explícitas en esta conversación. El agente no se conectó a
  producción ni ejecutó consultas contra la base alojada.
- Las capturas originales y la correspondencia de participantes permanecen privadas;
  este informe no incorpora nombres, teléfonos, cuerpos, credenciales ni wamid.
- El comienzo inicialmente inferido de la lista de conversaciones (10:18:54) se
  corrige a 10:17:17 con el hilo completo. Los horarios de P2 copiados inicialmente
  como 10:28:13 y 10:28:39 fueron retractados por el owner y no se usan como evidencia.
- No se atribuye un SHA al despliegue probado: no fue comprobado en esta evidencia.

## Resultados frente al contrato original

| Medida original | Evidencia disponible y alcance de la conclusión |
| --- | --- |
| Duración: 72 h | Se cerró un bloque de 24 h. Las otras 48 h de prueba quedan suspendidas por decisión del owner. |
| Volumen: ≥50, ≥10 salientes y ≥10 entrantes por persona | Recuento manual visible del bloque: P1 8 entrantes y 4 salientes; P2 6 entrantes y 5 salientes; total 23. Incluye los dos envíos manuales de P1-101 y ambas direcciones de P2-102. No alcanza los umbrales originales ni sustituye una conciliación automática completa. |
| Cero pérdidas | Los cuatro mensajes enviados durante la caída se recuperaron en base y UI. El owner confirmó el cierre sin incidentes. No se ejecutó la conciliación integral del protocolo original. |
| Cero duplicados por wamid | La consulta aportada muestra una fila por cada uno de los cuatro marcadores de caída. Eso no sustituye una auditoría global de wamid. P1-101 fue enviado dos veces manualmente, confirmado por el owner. |
| Orden | Las capturas muestran los mensajes de caída ordenados por hora del mensaje pese a recibirse fuera de orden. No se aporta una comparación automática de todos los mensajes con los teléfonos. |
| Mediana de latencia <10 s | No calculada para el conjunto; no se declara cumplimiento. Los tiempos de recuperación están documentados abajo. |
| Recuperación tras caída ≥10 min | Observaciones 503 separadas por 10 min 04 s y recuperación de los cuatro marcadores, una fila por marcador. Alcance observado satisfactorio. |
| Estados | El owner confirmó entrega y lectura de las respuestas posteriores a la recuperación. Las capturas muestran respuestas leídas; P1-112 está leído en la captura final. El último estado documentado de P2-111 es entregado. |
| Respuesta desde UI y ventana | Respuestas desde Communication confirmadas por el owner. Captura final de P1 muestra ventana cerrada y controles de envío deshabilitados; no demuestra por sí sola un rechazo del servidor fuera de ventana. |

Los recuentos excluyen la preparación del 9 de octubre. Son observaciones manuales,
no salida del script de aceptación. No se fabrican valores para los criterios no medidos.

## Interrupción y recuperación

El owner aportó GET /webhook con 503 a las 10:25:59, 10:29:28, 10:35:08 y
10:36:03 del 10 de octubre. Son observaciones puntuales que acreditan una separación
mínima de 10 min 04 s, no monitoreo continuo. A las 10:36:30 el GET devolvió 403:
es la primera observación de respuesta tras restaurar, no la hora exacta de restauración
ni una prueba suficiente de recepción POST. El mensaje P1-105 recibido a las 10:39:19
comprobó recepción posterior.

La consulta SQL aportada por el owner mostró:

| Marcador | Filas | Hora del mensaje (10/10, UTC−03:00) | Primera recepción (10/10, UTC−03:00) |
| --- | --- | --- | --- |
| CO01-P1-103 | 1 | 10:27:38 | 12:11:53.659 |
| CO01-P1-104 | 1 | 10:28:00 | 11:03:49.264 |
| CO01-P2-103 | 1 | 10:28:42 | 11:29:05.289 |
| CO01-P2-104 | 1 | 10:28:59 | 11:42:04.732 |

Los cuatro se recuperaron y aparecieron en sus hilos. La última recepción ocurrió
aproximadamente 1 h 35 min después de la primera observación de restauración.
Este ensayo no prueba el reproceso interno de una entrega `failed` ya reconocida con 200;
ese ejercicio queda suspendido junto con las pruebas restantes.

## Desvíos de ejecución y cierre de ventana

El owner atribuyó los desvíos a su ejecución de la prueba, no al sistema:
P1-101 enviado dos veces, P2-102 reutilizado en ambas direcciones y marcadores 110
entrantes en vez de salientes. No se borraron ni sustituyeron para mejorar el resultado.
P2-105 no aparece en las capturas; no se clasifica como perdido sin evidencia de envío.
P1-112 fue la cuarta respuesta de P1, enviada el 10/10 a las 15:22:56 y visible como leída.

La captura final muestra el último entrante de P1 a las 14:46:36 del 10/10 y la ventana
cerrada desde las **14:46:36 del 11/10**, con composición y envío deshabilitados.
El owner confirmó que cerró en el momento esperado. Esta ventana de servicio por
conversación es distinta del bloque de ensayo, que terminó a las 10:17:17 del 11/10.

## Alcance que permanece abierto

- No se ejecutarán los bloques dos y tres ni las demás pruebas suspendidas sin una
  nueva decisión del owner. No quedan aprobadas por omisión.
- No se declara DONE toda T-0026: su verificación original y sus otros pendientes
  se conservan. Esta acta cierra la aceptación funcional con alcance reducido.
- Actualización del 2026-10-13: el owner aplaza el dominio propio hasta la integración
  de Communication OS con Broker OS y que Broker OS esté operativa para el equipo.
  Se mantiene el dominio actual; DNS no bloquea este cierre por esa decisión.
- El mismo día confirmó la retención de 30 días también para crudos pendientes/fallidos.
  La corrección se prepara en la rama; no se afirma desplegada en producción.
- Esta aceptación no acredita fixtures reales redactados o una auditoría adicional
  de seguridad.
- La suspensión afecta a las pruebas; no ordena apagar la aplicación ni sus cron,
  borrar datos o habilitar el uso con clientes. No cambia D-0063, D-0065 ni D-0066.
