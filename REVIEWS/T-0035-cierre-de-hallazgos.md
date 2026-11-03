# T-0035: cierre de los hallazgos de la revisión ciega

Respuesta de quien implementó a `REVIEWS/T-0035-blind-review.md`, la revisión retrospectiva
de la fase 0 sobre `9451e67`. No es una segunda revisión ciega: la escribe quien implementó.
Los arreglos van en el PR #112, antes de su merge.

## Act on

- **1. Cierre «sin cambio» de la revisión propia. Arreglado en las dos capas.**
  `cerrarSinCambio` rechaza con `TRABAJO_PROPIO` cuando quien cierra es quien abrió la
  revisión pendiente. La migración `0007` agrega `authz_autor_revision` y la misma condición
  en `cierre_revision_cerrar`. La prueba nueva en
  `contexts/risk/src/application/autorizacion.integration.test.ts` («quien abrió una
  revisión pendiente no la cierra…») cubre a la Operadora y al Administrador por el caso de
  uso y por el `insert` directo, y comprueba que otra persona sí la cierra. Con la línea de
  la aplicación quitada, la prueba falla.
  - **Decidido por el owner (2026-11-03):** quien abrió la revisión sí puede cerrarla con la
    reevaluación de otra persona (`cerrarConReevaluacion`), porque lo que se acepta es trabajo
    ajeno. Queda como está.

## Consider

Ninguno se corrige en este PR. El owner decidió (2026-11-03) que el 2, el 3 y el 6 se
corrigen en un PR aparte antes de la fase 4. El 4 y el 5 quedan como condiciones antes de la
fase que los activa.

- **2. Orden previo vacío.** La base exige que exista el orden previo, no que cubra los
  riesgos. Sólo se explota con SQL directo como `risk_persona`. Antes de la fase 4.
- **3. `authz_*` invocables con cualquier argumento.** Dejan ver el rol de cualquier
  persona y el riesgo de una evaluación ajena. Mismo vector: SQL directo como
  `risk_persona`. Antes de la fase 4.
- **4. `legado_risk_app` abierta con `oidc`.** Falta en el plan de migración el paso que la
  retira después de la fase 4.
- **5. `jti` sin registro persistente.** Ya era condición de la primera llamada real entre
  contextos; el revisor agrega que el verificador hoy acepta `registroJti: null`.
- **6. Eventos de auditoría arbitrarios a nombre propio.** Mismo vector que 2 y 3.

## Noted

- **Contrato y ADR-0078 sobre acceso universal.** El texto del contrato es del owner; queda
  para que lo ajuste.
- **Recuento de Communication OS.** La evidencia anotaba «fail 1» porque el suite padre de
  los 4 cancelados cuenta como fallido en esa salida; el revisor contó 0 fallas y los
  mismos 4 cancelados. Es el mismo resultado.
