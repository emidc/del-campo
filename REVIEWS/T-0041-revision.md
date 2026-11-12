# T-0041 — Revisión

No es una revisión ciega de R-33: la escribió el mismo agente que implementó, con el modo
mínimo que pidió el owner. Existe porque el diff toca un control de acceso de `apps/risk`
(`lib/acceso.ts`) y CI exige un reporte. Además cambia dos políticas de RLS de Risk OS
(`revision_humana_revisar` y `cierre_revision_cerrar`), que es lo que conviene que mire otra
persona antes de aplicar la migración 0012 en la base hosteada.

## Qué se miró

- **La excepción es angosta.** `exigirAjenoOInterna` (`contexts/risk/src/application/actualizacion.ts`)
  deja pasar lo propio sólo a un Administrador, con revisión de IA de esa fila y 24 horas
  desde su registro. La usan `revisar` y `cerrarConReevaluacion`. `cerrarSinCambio` sigue con
  `exigirAjeno`, sin excepción.
- **La base exige lo mismo, sin depender de la app.** Las dos políticas pasan de «nunca lo
  propio» a «lo propio sólo con `aprobacion_interna`, lo ajeno sólo sin ella», y un trigger en
  cada tabla acepta la marca sólo si quien revisa es el autor, es Administrador, la fila tiene
  `revision_ia` y tiene 24 horas (`risk.aprobacion_interna_cumple`). El trigger corre para
  toda conexión: la marca no se puede poner sin cumplir, tampoco como `risk_app`.
- **La espera usa la hora de la base.** Las 24 horas se cuentan desde el `registrada_en` de la
  fila aprobada. Como la app escribe ese campo, tres políticas restrictivas impiden que
  `risk_persona` registre una evaluación, una acción o una cobertura con fecha anterior a su
  transacción.
- **El alcance por organización no cambió.** Las políticas conservan `authz_ve_resultados*`;
  un test muestra que quien pierde la asignación no aprueba ni lo propio.
- **`lib/acceso.ts`.** Sólo cambia cómo se clasifica el rechazo en la auditoría: los mensajes
  nuevos («falta la revisión de IA», «faltan N h») siguen quedando como `TRABAJO_PROPIO`.
- **Tests.** `esquema.integration.test.ts` prueba las condiciones una por una contra la base,
  y `autorizacion.integration.test.ts` las dos capas como `risk_persona`: rechazo sin revisión
  de IA, antes de 24 horas, con la revisión de IA de la versión anterior, por un Operador, con
  la marca sobre lo ajeno y fuera de la organización; aceptación después; lo ajeno como
  siempre, sin marca; `exigirEntregable` rechaza lo aprobado así.

## Riesgo aceptado

- **Nada comprueba que la revisión de IA haya ocurrido.** `revision_ia` la registra un
  Administrador con la CLI: en un operador único, la misma persona que después aprueba. Es lo
  que D-0083 pide (registro y pausa), no evidencia de independencia.
- **`exigirEntregable` no tiene quién la llame.** Risk OS no tiene exportación ni entrega. La
  regla «no llega al cliente» depende de que el primer canal la llame; queda escrito en la
  tarea y en el README del contexto, no en un test estructural (pedido del owner).
- **`legacy` sigue sin reglas.** Sin rol en la sesión, cualquiera acepta lo propio, sin marca
  ni espera, como antes de esta tarea. Una aceptación así no queda rotulada y
  `exigirEntregable` no la distingue. Deja de importar con `AUTH_MODE=oidc`.
- **El test simula el paso del tiempo** apagando `solo_insercion` dentro de su transacción,
  que se revierte. No hay otro modo de envejecer una fila en un esquema de sólo inserción.

## Pendiente

- Una revisión por otra persona u otra sesión de las políticas de 0012 antes de aplicarla en
  la base hosteada, que además necesita la aprobación del owner (R-13).
