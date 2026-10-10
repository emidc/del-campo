# CO01 — medición y recuperación

Workstream BOS · T-0026 · preparado 2026-10-09. Complementa `CO01-protocolo-72h.md`.
Esta entrega prepara herramientas; no ejecuta la corrida ni acepta CO01. T-0026 sigue
READY. El owner confirmó P1/P2 y autorizó temporalmente el dominio Vercel actual.

## 1. Antes de T0

Confirmar CONNECTED/CLOUD_API, las dos suscripciones y el despliegue usado (SHA).
Conservar la evidencia local del control de acceso, Data API y login que pide T-0026.
Coordinar con ambos participantes un bloque de 15 minutos dentro de las 72 horas para
la interrupción; fuera del horario de cron y sin otras personas usando Communication.
Tener Vercel y Supabase abiertos y comprobar acceso a los controles de restauración.

Copiar `contexts/communication/acceptance/manifest.example.json` a
`data/co01-acceptance.local/manifest.json` (Git lo ignora). Las fechas e identificadores
del ejemplo son sintéticos: sustituirlos. El informe se calcula desde este JSON; el
registro Markdown privado sirve para tomar notas. La lista `messages` se llena SOLO
con lo realmente enviado, cotejando las notas independientes de P1 y P2. No copiar la
lista de la base, no completar los 60 planificados como si hubieran ocurrido.

- `start` y `end`: T0 y T1 con zona; T1 es T0+72 h. Las horas de envío están en [T0,T1).
- `phoneNumberId`: identificador del número dedicado, en el archivo privado solamente.
- `participants`: id numérico de conversación de cada persona, visible en `/c/1`, etc.
  Ambos deben haber escrito antes de medir; no confundirlos con números telefónicos.
- `deployedAndSubscribed`: true solo cuando el owner verificó la continuidad de la
  configuración durante todo el periodo, incluyendo la caída coordinada documentada.
- `marker`: al principio del texto, seguido de espacio o fin; `CO01-P1-101`, etc.
  Un marcador por envío. No reutilizar los de hoy ni repetir números en otra corrida.
- `phoneOrder`: posición real en el teléfono, única por participante, mezclando IN/OUT.
- `sentAt`: hora real con zona; `direction`: inbound o outbound.
- `seenInUi` / `seenOnPhone`: comprobaciones humanas de aparición del mismo marcador.
- `fromUi`: true solamente para respuestas enviadas desde la UI.
- `observedStatus`: último estado visto en UI para el saliente: sent/delivered/read/failed;
  null para entrantes o cuando no se observó. Cotejarlo al ejecutar el informe; si cambia,
  actualizar la observación con su hora en el registro Markdown y volver a medir.
- `outage`: null hasta realizarla; después, horas reales de inicio/fin y marcadores
  entrantes enviados durante ella por ambas personas. No rellenar horas previstas.

## 2. Medición por el owner (solo lectura)

Desde la raíz, con dependencias instaladas. No ejecutarla desde el agente contra la
base alojada. En zsh, pedir la cadena del pooler sin mostrarla ni guardarla en historial:

```zsh
read -rs 'CO01_DATABASE_URL?URL privada de la base Communication: '
export CO01_DATABASE_URL
node contexts/communication/src/acceptance/cli.ts data/co01-acceptance.local/manifest.json > data/co01-acceptance.local/informe.json
CO01_RESULT=$?
unset CO01_DATABASE_URL
printf 'Resultado: %s\n' "$CO01_RESULT"
```

No usa DATABASE_URL ni lee `.env`. Usa una transacción consistente **READ ONLY**, con
30 s de límite por consulta y sin migraciones. La credencial necesita SELECT en
message, unsupported_message, outbound_attempt y outbound_status del esquema
communication. Puede usarse el rol limitado existente; no hace falta superusuario.

Códigos: 0 = nueve comprobaciones satisfechas con los datos y declaraciones aportados;
2 = al menos una no satisfecha (también durante una corrida incompleta); 1 = error,
informe inválido. Nunca interpretar un archivo vacío tras un error como éxito.
El resultado contiene marcadores, códigos, estados, conteos y tiempos; no devuelve
cuerpos, teléfonos, wamid, URL de base ni secretos. Los errores técnicos son genéricos
para que el driver no filtre valores; diagnosticar localmente sin pegar credenciales.

La consulta replica el orden por timestamp e id de la UI. Reconstruye la ventana con
entrantes ya recibidos al aceptar el saliente, incluidos los tipos no textuales, y
exige un intento `accepted` para respaldar el origen UI. Es una comprobación
conservadora al borde de las 24 h: no reemplaza el registro del operador ni audita la
hora exacta de cada click. Los mensajes sin marcador bien formado no se cuentan;
anotarlos como incidencia y reconciliarlos manualmente, nunca ocultarlos.

No es prueba automática de continuidad, renderizado, origen humano, estado CONNECTED
ni comportamiento de Meta: necesita las observaciones independientes. No sustituye
el informe final revisado, las comprobaciones de seguridad, fixtures reales, revisión
ni la decisión D-0065 de retención. El resultado 0 no declara T-0026 DONE.

## 3. Interrupción coordinada del despliegue

La ejecuta el owner en el horario acordado. Se pausa **solo** el proyecto
`del-campo-communication`, incluyendo su UI; no VS01, Risk ni la base de datos.
[Vercel documenta pausa y reanudación](https://vercel.com/docs/projects/managing-projects#pausing-a-project)
(consultado 2026-10-09): en el proyecto, Settings → General → Pause Project; para
restaurar, Resume Project en la misma sección. La pausa produce 503 DEPLOYMENT_PAUSED;
la reanudación puede tardar unos minutos y no necesita redeploy.

1. Registrar SHA, hora y funcionamiento del despliegue; avisar a P1/P2. Confirmar que
   los botones corresponden al proyecto indicado y que Resume es accesible.
2. Pausar desde Vercel. Comprobar `/webhook` y registrar el primer 503; ese es el inicio
   real. No tocar la suscripción de Meta ni las variables. Si no hay 503, abortar el
   ensayo y reanudar, sin contar una caída no demostrada.
3. Durante la pausa, P1 y P2 envían cada uno dos marcadores de su plan y anotan hora y
   orden. No responder desde UI mientras esté pausada. Registrar comprobaciones 503
   al inicio, aproximadamente a los 5 minutos y antes de restaurar, conservando las
   horas reales. Mantener la pausa al menos 10 minutos desde el primer 503.
4. Reanudar en Vercel. Registrar cuándo vuelve el servicio y comprobar login/UI y
   llegada de nuevos mensajes. Si no vuelve, usar Resume nuevamente y revisar el
   estado del proyecto; no cambiar DNS, borrar despliegues ni reconstruir la base.
5. Esperar los reintentos de Meta; no reenviar manualmente los mensajes perdidos.
   Comprobar que los cuatro marcadores aparecen una vez, ordenados como en teléfonos.
   Anotar recuperación, retrasos y duplicados; no hay promesa de recuperación inmediata.
6. Rellenar `outage` con tiempos y marcadores reales y volver a medir. Si algo no
   recupera, conservar la evidencia y dejar recuperación como NO CUMPLE/PENDIENTE.

Esto cumple la variante «deploy caído» del contrato, aunque el HTTP sea 503 y no 500.
No se probó la pausa de Vercel desde desarrollo: la validación de la plataforma y los
reintentos reales se obtendrá en este ejercicio. Una emergencia obliga a restaurar
inmediatamente, aun antes de diez minutos; registrar el ensayo como incompleto.

## 4. Entrega failed y reproceso (ejercicio distinto)

Después de restaurar y recuperar los mensajes anteriores, realizar este ejercicio en
otro bloque coordinado, con acceso del owner al SQL Editor de **Communication**.
El fallo SQL se ensayó contra Postgres local con payload firmado sintético. Su alcance
es solo el texto entrante exacto `CO01-P1-901`; no deshabilita permisos ni borra datos.
El marcador es adicional a los 60 previstos. Si ya se usó, no reutilizarlo: preparar y
probar una variante con un marcador nuevo antes de repetir.

1. Tener abierto `contexts/communication/acceptance/restore.sql` ANTES de instalar el
   fallo. Comprobar que el marcador no existe usando solo un conteo:
   `select count(*) from communication.message where body = 'CO01-P1-901';` debe ser 0.
2. Ejecutar `contexts/communication/acceptance/fail-one.sql` completo. Si la creación
   falla porque el objeto existe, no reemplazarlo: ejecutar restore y revisar el estado.
3. P1 envía exactamente `CO01-P1-901` y registra hora/orden. El webhook debe recibirlo,
   responder 200 y dejar la entrega failed. Comprobar alerta y logs/conteos sin compartir
   el payload; no actualizar manualmente el estado de la entrega.
4. Ejecutar **siempre** `restore.sql`, también si se interrumpe el ensayo. Confirmar
   que no queda el trigger:
   `select count(*) from pg_trigger where tgname = 'co01_fail_one' and tgrelid = 'communication.message'::regclass;`
   debe ser 0. Eliminarlo no borra la entrega fallida ni los mensajes.
5. Ejecutar Run de `/api/jobs/reprocess` en Vercel. Verificar HTTP 200 y al menos una
   recuperación, desaparición del fallo y una sola aparición de `CO01-P1-901` en UI.
6. Repetir Run y confirmar que ese mensaje sigue apareciendo una sola vez. Incorporar
   el marcador al registro independiente/JSON y conservar los dos resultados.

El SQL es una herramienta manual de ensayo, no una migración ni un hook de despliegue.
No ejecutarlo durante la pausa ni dejarlo instalado esperando otro día. Si el cron lo
intenta mientras el trigger sigue activo, seguirá fallando; restaurar antes del Run.
