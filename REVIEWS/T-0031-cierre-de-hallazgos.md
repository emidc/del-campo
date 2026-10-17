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

- **C1. El script de ciclos. Arreglado.** `--empresas` con menos de cinco empresas
  distintas ya no da A7 por cumplido («A7 pide las 5 empresas históricas; se indicaron N»), y
  el informe separa los cierres con reevaluación aceptada de los sin cambio. El detalle de
  cada ciclo lo decidió el owner el 2026-10-17: va como salida local aparte, con
  `--detalle`, y el resumen no cambia (sigue sin ids ni personas, porque es el que puede
  salir de su equipo). El detalle muestra, por ciclo que cuenta, empresa, revisión,
  disparador y referencia, apertura, cierre, resultado, evaluación si la hay y la persona
  que cerró (`ciclosDetallados` e `informeDetalle` en `domain/ciclos.ts`).
- **C2. La reevaluación precargada se podía enviar sin cambios. Arreglado con la regla que
  fijó el owner el 2026-10-17.** Una reevaluación materialmente idéntica a la evaluación
  vigente se rechaza: mismos factores y mismos campos evaluativos, cambiando sólo metadatos
  (fecha, autor, motivo, acción, justificación, versión). Si la revisión concluye que no
  cambió nada, se cierra «sin cambio» con fundamento. Con un cambio evaluativo real (por
  ejemplo, evidencia o nota de uncertainty) entra aunque P, I y V den lo mismo. Lo decide
  `cambiosEvaluativos` (`domain/actualizacion.ts`) y lo aplica `cargarReevaluacion`. Es una
  regla del caso de uso, no de la base: compararlo en un trigger obligaría a repetir allí la
  lista de campos evaluativos. Casos: `domain/actualizacion.test.ts` y
  `actualizacion.integration.test.ts` («una reevaluación materialmente idéntica…»).
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
