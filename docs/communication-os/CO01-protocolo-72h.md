# CO01 — preparación de la corrida de 72 horas

Workstream: BOS. Preparado el 2026-10-09 sobre `main` en `c0fd006`.
Contrato: `SLICES/CO01.md` §4 y `TASKS/T-0026-despliegue-y-aceptacion-co01.md`.
Estado: **PREPARACIÓN; inicio formal no fijado**. No modifica umbrales ni decisiones.

## Antes de iniciar el reloj

- [x] Owner confirmó el 2026-10-09 dos personas del equipo y consentimiento escrito
  previo. Se usan P1/P2; el owner conserva la correspondencia en privado.
- [ ] Alta CONNECTED/CLOUD_API comprobada y ambas suscripciones verificadas. Hay
  evidencia de recepción/envío y GET subscribed_apps aportada por el owner, pero falta
  guardar la comprobación explícita del estado de alta.
- [x] Owner autorizó el 2026-10-09 usar temporalmente
  `del-campo-communication.vercel.app` para esta prueba de 72 horas. Es una excepción
  de ensayo; el subdominio de `delcampobroker.com` del contrato sigue pendiente para
  el cierre, salvo que se apruebe expresamente modificar ese requisito.
- [ ] Completar las comprobaciones de acceso sin credencial/firma, Data API y login
  del informe de endurecimiento. Los grants de communication_app no prueban por sí
  solos que anon/authenticated carezcan de otros accesos.
- [ ] Decidir cadencia del reproceso: el cron versionado es diario; para el ensayo se
  propone además ejecución manual supervisada al revisar cada bloque, sin sustituir
  la comprobación de la ejecución automática.
- [x] Script de aceptación implementado y probado localmente; ver
  `CO01-medicion-y-recuperacion.md`. El owner lo ejecutará contra la base alojada.
  No usar el conteo de filas de la UI como sustituto.
- [ ] Coordinar el horario del plan en `CO01-medicion-y-recuperacion.md`. El SQL de
  fallo/restauración se prueba localmente; la pausa de Vercel y reintentos de Meta
  requieren ejecución y evidencia real del owner.

No tocar producción desde una sesión de agente. Estas comprobaciones las ejecuta el
owner. No se necesita pegar aquí contraseñas, tokens, teléfonos ni payloads reales.
La discrepancia de retención D-0065 sigue pendiente de decisión y bloquea el cierre;
no se resuelve por tratarse de un ensayo menor a 30 días.

## Inicio y final

El owner registra T0, dominio y SHA del despliegue probado. Usar timestamp completo
con zona, por ejemplo `AAAA-MM-DDTHH:MM:SS-03:00`; el ejemplo no fija un inicio.
T1 = T0 + 72 horas exactas. Los tres días son intervalos de 24 horas contados desde T0,
no simplemente tres fechas del calendario. Mantener el sistema desplegado hasta T1 y
terminar de observar las entregas/reintentos antes del informe final.

Los mensajes `CO01-P1-001` a `003` de la preparación no forman parte de la corrida.
No reiniciar el reloj en silencio ni borrar fallos para mejorar resultados. Cualquier
cambio de versión/configuración, interrupción o nueva corrida queda registrado.

## Mensajes propuestos

| Bloque | Por participante: desde WhatsApp | Por participante: respuesta desde la UI | Total entre ambos |
| --- | --- | --- | --- |
| T0 a T0+24 h | 6 | 4 | 20 |
| T0+24 a T0+48 h | 6 | 4 | 20 |
| T0+48 a T1 | 6 | 4 | 20 |
| Total | 18 por participante | 12 por participante | 60 |

Son objetivos de ejecución, no observaciones completadas. Mensajes con contenido
inventado; ningún dato de clientes, pólizas ni salud. Cada participante escribe primero
cada día y comprueba que la ventana está abierta antes de que el operador responda.
Todos los salientes se envían desde Communication. No mandar mensajes fuera de ventana
para probar el rechazo: se comprueba el bloqueo de la UI sin realizar un envío real.

Usar marcadores únicos desde `CO01-P1-101` / `CO01-P2-101`. El registro local propone
seis entrantes seguidos de cuatro respuestas por bloque; pueden distribuirse en varias
sesiones manteniendo los marcadores y registrando el orden real del teléfono. Nunca
reutilizar un marcador para ocultar un intento fallido. Un reintento se anota como tal.

## Registro independiente

Cada participante conserva su propio registro contemporáneo de lo enviado/recibido.
El owner puede consolidarlo en `data/co01-acceptance.local/registro.md`, ignorado por
Git mediante la regla existente `*.local`. No obtener la lista de esperados de la base:
eso impediría detectar mensajes perdidos. No versionar este registro lleno ni capturas
con nombres/teléfonos. La ausencia de una marca significa **no comprobado**, no éxito.

Por mensaje registrar: marcador, dirección, hora de envío con zona, recepción observada
en el teléfono/UI, posición real en el teléfono, último estado observado y hora de la
observación. Mantener las incidencias; no completar recuerdos como si fueran mediciones.
El texto visible no permite medir con precisión la latencia interna; se calculará con
`received_at - wa_timestamp` de los entrantes persistidos.

## Revisión de cada bloque

1. Enviar/contestar los mensajes planificados y completar los registros de ambos lados.
2. Comparar el orden del hilo con el teléfono de cada participante; anotar discrepancias.
3. Revisar alertas de entregas pendientes/fallidas/ignoradas y registrar conteos y hora.
4. Guardar evidencia saneada de los cron automáticos: fecha, ruta, HTTP y resumen.
   Las ejecuciones manuales de hoy no prueban el disparador automático.
5. Si hay error, conservar el marcador y detener nuevos intentos de ese envío hasta
   distinguir rechazo de resultado incierto, para no duplicarlo.

## Caída y recuperación: todavía no ejecutar

El contrato exige un receptor con respuesta 500 o despliegue caído durante al menos
10 minutos, con aviso y hora de inicio/restauración. No alcanza desuscribir Meta,
invalidar la firma (401) o cerrar el navegador. El mecanismo exacto debe estar preparado
con reversión y probado antes de afectar producción; no se improvisa quitando permisos
ni borrando tablas. Durante la ventana habrá mensajes numerados de ambos participantes.
El owner observará los reintentos y verificará cada marcador después de restaurar.

T-0026 exige además recuperar una entrega `failed` mediante reproceso sin duplicación.
No es lo mismo que un reintento de Meta tras un 500. Una ejecución con cero filas, como
la observada hoy, no demuestra esa recuperación. Ambos escenarios requieren evidencia.

## Cierre y dictamen

El informe final será `ops/evidence/T-0026-aceptacion.md`, cuando existan mediciones.
Debe evaluar los **nueve renglones** de CO01 §4 (la tarea dice ocho, pero la tabla del
contrato contiene nueve): duración, volumen, pérdidas, duplicados, orden, latencia,
recuperación, estados y respuestas desde UI/ventana.

- Al menos 50 mensajes, al menos 10 salientes en total y 10 entrantes de cada persona.
- Cero marcadores enviados ausentes de base/UI y cero filas duplicadas por wamid.
- Orden coincide con teléfonos; mediana de latencia de entrantes menor a 10 s.
- Recuperación de la caída de al menos 10 minutos sin pérdidas ni duplicados.
- Cada saliente muestra su último estado conocido, todos se originan en UI y dentro
  de ventana. Una captura de «Leído» no sustituye la comprobación de todos los salientes.

El informe compartido solo contiene códigos, marcadores, conteos y tiempos. Sin wamid,
identificadores personales ni cuerpos completos. Una fila sin evidencia queda PENDIENTE;
una que incumple queda NO CUMPLE. No declarar aceptación por transcurrir 72 horas.

Pendientes de T-0026 que siguen fuera de esta preparación: guía de despliegue completa,
fixtures reales redactados, medición real, revisión final, postura Data API/login,
dominio y decisión de retención. Esta guía no los cierra.
