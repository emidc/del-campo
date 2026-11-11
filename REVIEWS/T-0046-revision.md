# Revisión — T-0046 · Asignar gestiones

- **Fecha:** 2026-11-11
- **Quién:** el mismo agente que implementó. **No es una revisión ciega de R-33**: sigue
  el modo mínimo que pidió el owner el 11/11/2026 (ver `REVIEWS/T-0045-revision.md`).

## Qué se miró

- `authz.integrantes_que_ven(cliente)` devuelve id y correo de integrantes activos que
  ven al cliente, y sólo a quien tiene sesión. Mismo criterio que `authz.ve_cliente`.
- La política de actualización de `service_case` rechaza un responsable que no está en
  ese conjunto, así que una gestión no queda asignada a quien no la puede ver.
- El down falla si ya hay eventos `ASIGNACION` en vez de borrarlos.
- Prueba: `packages/db/src/service-case.integration.test.ts`, caso de asignación.
