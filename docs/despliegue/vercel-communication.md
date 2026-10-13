# Communication OS — despliegue y operación

Workstream: BOS. T-0026. Preparado el 2026-10-13 desde el código del repositorio.
Esta guía consolida el despliegue realizado por el owner; su recorrido completo y los
guía fue aprobada por el owner el 2026-10-13; las limitaciones al final se conservan. Los agentes no acceden a la
base alojada ni reciben secretos. No ejecutar otra prueba suspendida por esta guía.

## Proyecto y dominio

Proyecto Vercel propio de Communication OS, raíz `apps/communication`, framework
Next.js, dependencias del workspace incluidas. Base Supabase propia, separada de VS01.
No reutilizar variables ni credenciales de Broker OS. Registrar el SHA del deployment
production que se promueva; el SHA de main por sí solo no prueba lo desplegado.

Dominio actual: `del-campo-communication.vercel.app`. Por decisión del owner del
2026-10-13, el subdominio de delcampobroker.com queda aplazado hasta integrar Communication
OS con Broker OS y que Broker OS esté operativa para los miembros del equipo Del Campo.
El callback usa el dominio estable, no la URL de un deployment individual.

## Base y migraciones — solo el owner

1. Crear el proyecto de base separado. Guardar sus credenciales en el gestor privado.
2. Aplicar las migraciones del directorio `contexts/communication/migrations` en orden:
   0001, 0002, 0003 y 0004. El CLI del contexto está restringido a localhost y no debe
   modificarse para eludir esa protección.
3. Para aplicación manual con el SQL Editor o una sesión administrativa del owner,
   crear primero `communication` y el ledger
   `communication.schema_migrations(file text primary key, applied_at timestamptz not null default now())`.
   Consultar ese ledger antes de ejecutar. Para cada archivo pendiente, ejecutar en
   **una sola transacción** su SQL y el INSERT del nombre exacto del archivo en el
   ledger. No volver a ejecutar los ya registrados; no continuar si una transacción falla.
4. Crear la credencial limitada de la app y aplicar los permisos documentados en
   [endurecimiento, H5](../communication-os/t-0026-hardening-report.md).
   El runtime no debe usar la credencial administrativa.
5. Mantener Data API desactivada para este proyecto, como confirmó el owner durante
   el ensayo. Revisar los permisos del esquema al cambiar roles o exposición.
6. Usar Transaction pooler para el runtime. La conexión usa `prepare: false`.
   Para administración usar SQL Editor o Session pooler. Nunca copiar URLs completas
   a evidencias, capturas públicas o al repositorio.

La reversa local usa `pnpm --filter @del-campo/communication db:down`, una migración
por ejecución. En el entorno alojado, solo el owner puede aplicar el archivo homónimo
más reciente de `migrations/down/` y retirar su fila del ledger en la misma transacción.
Antes debe revisar la pérdida de datos y el backup; la reversa de esquema no es el
procedimiento habitual para revertir una versión de la app.

## Variables y credencial

La lista canónica, obligatoriedad y generación del hash están en
[README de la app](../../apps/communication/README.md#variables-de-entorno).
Configurar para el entorno Production:

- `COMMUNICATION_DATABASE_URL`.
- `COMMUNICATION_UI_USER`, `COMMUNICATION_UI_PASSWORD_HASH` y
  `COMMUNICATION_UI_SESSION_SECRET`.
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_GRAPH_API_VERSION`,
  `WHATSAPP_APP_SECRET` y `WHATSAPP_VERIFY_TOKEN`.
- `CRON_SECRET`.

No configurar `WHATSAPP_GRAPH_BASE_URL` en producción: es exclusivamente para el
simulador local. El hash es scrypt, generado con el script de la app; el secreto de
sesión y el de cron tienen al menos 32 caracteres. Usar token de usuario del sistema
y una versión de Graph API habilitada para la app. Los carga el owner y vuelve a
desplegar para que entren en vigencia. No exponerlos mediante variables NEXT_PUBLIC.

## Webhook y número

El owner verifica el alta CONNECTED/CLOUD_API y configura el callback HTTPS
`https://del-campo-communication.vercel.app/webhook` con el mismo verify token del
despliegue. Debe comprobar **ambas** suscripciones: el campo `messages` de la app y la
app asociada a la WABA mediante `subscribed_apps`. Un GET de verificación exitoso no
prueba por sí solo que se reciban mensajes. Conservar solo resultados saneados.

El receptor valida firma, guarda la entrega antes del 200 y programa procesamiento
con `after` de Next.js. La recepción y el procesamiento son hechos distintos: observar
los dos timestamps y los avisos de pendientes/fallidas. El cron de reproceso cubre
entregas guardadas pero no procesadas; los reintentos de Meta cubren solicitudes que
no recibieron respuesta exitosa. No son el mismo ensayo.

## Operación y retención

`apps/communication/vercel.json` declara reproceso diario a las 10:00 UTC y retención
a las 06:00 UTC. Equivalen a 07:00 y 03:00 de Mendoza; registrar el disparo real, no
confundir el horario configurado con precisión garantizada del plan.

Los dos endpoints `/api/jobs/reprocess` y `/api/jobs/retention` exigen Bearer con
`CRON_SECRET`. El panel Run sirve para ejecución manual; los logs con user agent de
cron permiten distinguir el disparo automático. El owner confirmó ambos durante el
ensayo. Sin configuración devuelven 503; sin autorización válida, 401.

Desde la corrección aprobada el 2026-10-13, la retención borra el crudo de cualquier
estado con `received_at` anterior o igual al corte de 30 días, en su siguiente ejecución.
`unprocessedDeleted` cuenta pendientes/fallidas borradas: ya no pueden reprocesarse.
Los mensajes persistidos permanecen. El cambio requiere desplegar esta versión;
no se presume activo en producción antes del merge y deployment.

## Reversión y apagado

Para revertir código, el owner promueve el deployment anterior conocido y verifica
sus variables y compatibilidad con el esquema actual. No ejecutar downs solo por
revertir la app. Volver al código anterior de retención vuelve a conservar los crudos
pendientes/fallidos vencidos; no recupera lo ya borrado.

Para apagar definitivamente, el owner desuscribe esta app de la WABA y revisa que no
haya otro consumidor afectado, desactiva los cron y pausa el proyecto de Communication.
Revoca sus credenciales y, solo con decisión explícita de descarte/backup, elimina la
base propia. No tocar el proyecto ni la base de Broker OS. Ninguna de esas acciones
está solicitada por el cierre del bloque uno.

## Planes y presupuesto — confirmación del owner, 2026-10-13

| Servicio | Plan actual informado | Costo actual mensual | Presupuesto mensual futuro informado |
| --- | --- | --- | --- |
| Vercel | Gratuito | USD 0 | USD 20 |
| Supabase | Gratuito | USD 0 | USD 25 |
| Total | | USD 0 | USD 45 |

El owner prevé pasar a los planes pagos cuando Broker OS esté listo para la
operatividad del equipo Del Campo. Los importes futuros son su presupuesto declarado,
no una cotización verificada ni un costo máximo garantizado. No se contrataron planes
ni se ejecutó una actualización. No se confirmó cómo se distribuirá ese gasto entre
proyectos; no se atribuyen USD 45 adicionales exclusivamente a Communication OS.
La confirmación de costo no acredita por sí sola la adecuación de uso a las condiciones
de cada plan; esa comprobación sigue separada de la aceptación funcional.

## Estado confirmado y seguimiento posterior

- SHA productivo informado por el owner el 2026-10-13:
  `6d432c2ae165196f883519f930372ec80035ecec`. Fecha del deployment no aportada.
  Registrar el nuevo SHA después del merge y deployment de la corrección.
- Adecuación del uso actual a las condiciones de los planes informados; no se deduce
  de que el despliegue funcione ni del costo declarado.
- Guía aprobada por el owner el 2026-10-13. Las cuatro
  copias saneadas de fixtures ya fueron revisadas y confirmadas; sus límites de
  procedencia están en contexts/communication/fixtures/PROVENANCE.md.

El acta de [aceptación reducida](../../ops/evidence/T-0026-aceptacion.md) conserva las
pruebas realizadas y las suspendidas. Esta guía no las reinicia ni las da por cumplidas.
