# T-0056 — Revisión

No es una revisión ciega de R-33: la escribió el mismo agente que implementó, con el
modo mínimo que pidió el owner. Existe porque el diff toca controles de acceso de
`apps/risk` (`lib/llamada.ts` y `deny.test.ts`) y CI exige un reporte. El diseño lo
revisó aparte otra sesión (el hilo de diseño de riesgos en la ficha), que aceptó el
desvío descrito abajo y pidió el test de integración con el registro por defecto.

## Qué se miró

- `withLlamada` es el único camino de entrada a `api/entre-contextos/`: fuera de OIDC
  responde 404, sin `RISK_JWKS_BROKER` o sin `RISK_OIDC_DATABASE_URL` responde 503, y
  sólo acepta un JWT Bearer. `deny.test.ts` fija que esas rutas usan sólo `withLlamada`
  y sólo GET, que ninguna otra ruta lo usa y que sólo `lib/llamada.ts` importa la
  verificación de tokens.
- Firma, emisor, audiencia y vencimiento se verifican antes de tocar la base: esos
  rechazos son 401 y no se auditan. El resto pasa por `admitirLlamada` con el registro
  de `jti` en Postgres; un token reusado es 401 y queda auditado
  (`acceso.token:REUTILIZADO`), y una persona sin permiso es 403.
- La lectura (`riesgosDeEmpresa`) exige `riesgo.ver_resultados` y corre con la
  transacción de la persona: RLS oculta las organizaciones que no ve, y una no asignada
  responde igual que una empresa sin vínculo.

## Riesgo aceptado

- Los rechazos previos a la base (token mal firmado, de otro emisor o vencido) no dejan
  evento de auditoría. Se eligió para que un token basura no genere escrituras.
