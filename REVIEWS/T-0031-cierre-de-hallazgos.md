# T-0031: cierre de los hallazgos de la revisión ciega

Respuesta de quien implementó a `REVIEWS/T-0031-blind-review.md`, que revisó `5c78bf7`. Los
arreglos están en el commit «T-0031: atender la revisión ciega». No es una segunda revisión
ciega: la escribe quien implementó.

## Act on

- **A1. Una reevaluación que cerró una revisión se podía rechazar después. Arreglado.** La
  base lo impide (`revision_humana_cierre_firme`, migración 0004: una evaluación con la que
  se cerró una revisión no pasa a `rejected` ni a `needs_revision`) y `revisar` lo rechaza
  antes con un motivo legible: para corregirla se carga otra reevaluación. Elegí impedirlo y
  no reabrir la revisión porque la tabla de cierres es de sólo inserción y el cierre fue
  cierto cuando se hizo; si el owner prefiere que un rechazo posterior reabra la revisión, es
  un cambio de regla. Casos: `esquema.integration.test.ts` (por nombre) y
  `actualizacion.integration.test.ts` («una reevaluación rechazada…», al final). Con eso,
  `contarCiclos` ya no puede contar un cierre con una reevaluación que dejó de estar
  aceptada.
- **A2. El orden previo aceptaba posiciones repetidas. Arreglado.** `registrarOrdenPrevio`
  rechaza una posición repetida y la base tiene `orden_previo_item_posicion_unica` (unique
  por orden previo y posición). Casos en los mismos dos archivos. Las bandas sí se pueden
  repetir.

Las dos reglas nuevas van en la migración 0004 de esta misma rama (no está en `main`), con
su reversa. Para aplicarlas, en este entorno se revirtió la 0004 vieja en
`delcampo_risk_test` y se recreó `delcampo_risk_dev` desde las sintéticas: el orden previo
de la sonda (todas las posiciones en 1) habría impedido agregar la restricción, y la base de
desarrollo no tiene datos que no se puedan reimportar. Las filas de la sonda ya no están.

## Consider

- **C1. El script de ciclos. Arreglado en parte.** `--empresas` con menos de cinco empresas
  distintas ya no da A7 por cumplido («A7 pide las 5 empresas históricas; se indicaron N»), y
  el informe separa los cierres con reevaluación aceptada de los sin cambio. **No** agregué
  el detalle de cada ciclo (referencia, quién, evaluación): el contrato limita la salida a
  códigos, conteos y fechas porque es la que sale del equipo del owner con datos reales, y
  ese detalle lleva ids y personas. Queda para el owner decidir si quiere una salida
  detallada local además de la resumida.
- **C2. La reevaluación precargada se puede enviar sin cambios. Sin cambio, para el owner.**
  Precargar los valores vigentes es a propósito (la persona cambia sólo lo que decidió
  cambiar). Rechazar una reevaluación idéntica a la anterior sería una regla nueva sobre la
  metodología (¿una reevaluación que confirma todos los niveles con otra evidencia es
  válida?), y no la invento.
- **C3. Las fallas inyectadas sólo corren dentro de un savepoint. Sin cambio.** `operar` usa
  la misma función para los dos caminos (`'savepoint' in db ? db.savepoint : db.begin`) y el
  test no puede usar `db.begin` sin confirmar datos en la base de tests. El recorrido por la
  app (evidencia) ejercita `db.begin` en cada operación.
- **C4. `formRevisar` llegaba con `accepted` elegido. Arreglado.** Ahora no trae estado
  elegido y el servidor rechaza uno vacío.
- **C5. `volver` con `%2e%2e`. Arreglado.** `volverA` también mira la ruta decodificada y
  rechaza `..`, `//` y `\`. Test nuevo: `apps/risk/src/lib/actualizar.test.ts`. Los avisos
  `?ok=` y `?error=` siguen viniendo de la URL (escapados, recortados a 300 caracteres):
  un enlace armado puede mostrar un texto, pero no escribe nada ni ejecuta nada.
