# T-0030: cierre de los hallazgos de la revisión ciega

Respuesta de quien implementó a `REVIEWS/T-0030-blind-review.md` (revisión sobre
`579f59f`). Los arreglos están en el commit «T-0030: atender la revisión ciega». No es una
segunda revisión ciega: la escribe quien implementó.

## Act on

- **A1. El detalle de un padre no decía qué evaluación usa su posición ni con qué
  versión. Arreglado.** `VistaDetalle` tiene `leePor`: el hijo prioritario por el que se
  lee el padre (§1.4), con su evaluación usada y si la prioridad es provisional. La página
  lo muestra en vez de «sin evaluación vigente», y todo detalle con posición lleva
  «Posición: calculado con las funciones de metodologia v1». En
  `paginas.integration.test.ts` se corrigió el comentario que excluía esos detalles, la
  regla 7 sólo exceptúa un detalle sin evaluaciones y sin posición, y un test nuevo
  prueba la regla 6 en cada detalle (los dos padres de las sintéticas incluidos).

## Consider

- **C1. Filtro por unidad con un padre y sus hijos en unidades distintas. Arreglado, y
  queda para el owner.** Un padre se muestra en su unidad y en la de cualquiera de sus
  hijos, con la posición de la organización. Lo prueba un caso nuevo en
  `vistas.integration.test.ts` (padre en `U-ADMIN`, hijos en `U-NAVE`). Si padre e hijos
  tienen que compartir unidad, es una regla que el owner puede agregar al contrato antes
  de cargar las históricas.
- **C2. La regex del test de estructura no comprobaba «primero». Arreglado.** Ahora exige
  que `const sesion = await requireSession()` sea la primera sentencia del componente de
  cada página. La negación de las páginas con requests reales está en la evidencia
  (`curl`: 307 a `/login`); un test con requests reales necesita el runtime de Next.js y
  no se agregó.
- **C3. La raíz exporta `migrate` e `importarLote`. Arreglado por lint.** Un bloque nuevo de
  `eslint.config.js` prohíbe importar `migrate`, `importarLote`, `leerArchivosDeLote` y
  `leerContrato` en `apps/risk` fuera de los `*.test.ts`. Se probó con una sonda que
  importa `migrate` desde una página: `no-restricted-imports`.

## Noted

- **N1. Límite disponible por cobertura y no por póliza.** Queda como pregunta para la
  metodología en la evidencia; la vista lo rotula con su regla.
- **N2. Exactamente 10 posiciones contra la regresión.** Es lo que dan las organizaciones
  sin filas de la 15b fuera de S15; el test imprime el número. El resto del ranking se
  compara con `rankingOrganizacion` sobre lo importado, que T-0029 ya comparó con la
  regresión.
- **N3. El JSON del detalle de sub-riesgos, escenarios y miembros.** Se prueba como HTML
  (la misma vista); el JSON sólo para el ranking y los no evaluables. Sin cambio.
- **N4.** Sin acción.
- **N5. El ADR llega en el mismo commit que la implementación.** Es cierto: se escribió
  antes de implementar, pero no se commiteó aparte. Queda dicho en la evidencia.

## Dismissed

Los cinco del informe, sin cambio.
