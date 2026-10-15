# T-0029: cierre de los hallazgos de la revisión ciega

Respuesta de quien implementó a `REVIEWS/T-0029-blind-review.md` (revisión sobre
`a6de412`). Los arreglos están en el commit «T-0029: atender la revisión ciega», sobre
`db5925f`. No es una segunda revisión ciega: la escribe quien implementó.

## Act on

- **A1. Id mal cargado en el informe sin valores. Arreglado.** En modo sin valores, el id
  de una fila sale sólo si tiene formato de id de Risk OS (`esIdRiskOs`, en
  `validador.ts`, que usa la misma prueba que RV-ID-01); si no, sale `(id no válido)`. Lo
  mismo vale para el id de una celda sin destino. El test con marcadores
  (`informe.test.ts`) ahora carga un `accion_id` con un marcador, comprueba que el
  validador lo devuelve como id de un RV-ID-01 y que no aparece en ninguno de los cinco
  informes sin valores.

## Consider

- **C1. El comando de `## Verification`. Arreglado en la CLI, reportado en la tarea.** La
  cabecera y el `USO` de `cli-importar.ts` dicen `run import`. El contrato no se toca
  desde la rama (T-0005): la evidencia registra que el comando escrito en
  `## Verification` necesita `run` y lo propone como corrección al owner.
- **C2. RV-ACC-11 y RV-ECO-02 sobre riesgos registrados. Reportado al owner, sin cambio.**
  Son avisos y no bloquean. Evaluarlos con la cadena y las acciones de la base es un
  cambio de comportamiento del validador que conviene que decida el owner: queda en la
  evidencia como diferencia con el contrato.
- **C3. Diferencias entre contrato y esquema. Reportadas al owner.** Las tres van en la
  evidencia, con lo que vería el owner en cada caso.
- **C4. Argumentos desconocidos. Arreglado.** Todo lo que sigue a la carpeta tiene que
  ser una opción conocida o su valor; si no, la CLI sale con 2 sin conectarse.
  `importar-confirmado.integration.test.ts` lo prueba con `—sin-valores`, `sin-valores`
  y `--sin-valor`.

## Noted

- **N4. Fecha de corte por defecto. Arreglado.** Es la fecha local del equipo que
  importa, no la UTC.
- **N5. Conexión cortada.** Sin cambio: el `TypeError` sale de dentro de postgres.js
  3.4.9 al intentar el rollback, y la base queda limpia. Va en la evidencia.
- **N1, N2, N3, N6, N7 y N8.** Sin cambio. N3 y N7 van en la evidencia como pendiente y
  como lo que no se probó.

## Dismissed

Sin objeciones a los cinco descartes del revisor.
