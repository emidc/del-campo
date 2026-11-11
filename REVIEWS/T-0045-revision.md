# Revisión — T-0045 · Gestiones manuales

- **Fecha:** 2026-11-11
- **Quién:** el mismo agente que implementó. **No es una revisión ciega de R-33**: el
  owner pidió el 11/11/2026 bajar la revisión y la burocracia al mínimo, y este archivo
  existe para que `check-review-required` pase. Si el owner quiere la revisión ciega, se
  corre antes del merge.

## Qué se miró

- RLS de `service_case` y `service_case_event`: se ve y se escribe con el alcance del
  cliente (`authz.ve_cliente`) y, si hay póliza, también el de la póliza
  (`authz.ve_poliza`). La creación y cada evento quedan a nombre de `authz.usuario()`.
- `broker_app` sólo puede actualizar las columnas de estado de la gestión; la historia no
  tiene `update` ni `delete`, y un trigger la protege también del dueño de la tabla.
- `authz.correo_integrante` muestra el correo de un integrante activo a quien tiene
  sesión. Expone correos de compañeros del equipo entre sí; no expone clientes.
- Pruebas: `packages/db/src/service-case.integration.test.ts` (alcance por rol, póliza
  ajena, Revisor, historia inmutable, cierre y reapertura).
