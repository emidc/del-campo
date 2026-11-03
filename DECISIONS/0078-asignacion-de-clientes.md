# ADR-0078 — La asignación de cartera es una asignación explícita de usuario a cliente, con intervalo de validez

- **Id en `decisions.yaml`:** D-0027
- **Estado:** PROPUESTO. `D-0027` sigue `OPEN` en `decisions.yaml` hasta que el owner
  elija el alcance (punto 3) y apruebe el PR que lo introduce.
- **Fecha:** 2026-11-03
- **Supersede:** — (cierra `D-0027`; precisa la cláusula de alcance de `D-0072`)

## Contexto

`D-0027` dejó abierta la estructura física de la asignación de cartera hasta tener la
evidencia de `D-0022` y antes de autorizar en producción. Las dos condiciones se
cumplieron: el spike `T-0002` cerró `D-0022` (autorización híbrida, filas en
PostgreSQL con RLS) y `T-0035` implementa la autorización productiva.

Entretanto `D-0072` cambió el requisito. Ya no hay productores con cartera propia: hay
Operadores que trabajan sobre las empresas y evaluaciones que se les asignan, y un
Revisor profesional que opera sobre evaluaciones. Al aprobar el plan de `T-0035`
(2026-11-03), el owner fijó además que las asignaciones son explícitas y por empresa, y
que una carga masiva se registra como asignaciones individuales, "no como un privilegio
universal permanente".

## Decisión

1. **Tabla `client_assignment`** con `user_id`, `client_party_id` y `valid`, un
   `tstzrange` semiabierto `[desde, hasta)`. Una asignación se cierra fijando `hasta`,
   no se borra: la historia queda.
2. **Sin superposición.** Una restricción de exclusión GiST impide que el mismo usuario
   tenga dos intervalos superpuestos sobre el mismo cliente.
3. **Alcance: cliente, sea empresa o persona.** `client_party_id` admite una `Party` de
   tipo `ORGANIZATION` o `PERSON`, así un cliente particular se asigna igual que una
   empresa. *Pendiente de confirmar por el owner*: la alternativa es restringir a
   `ORGANIZATION` y dejar a los particulares fuera de toda asignación. La estructura no
   cambia entre una y otra; sólo cambia un `check`.
4. **Asignar una empresa incluye a sus miembros vigentes.** La función
   `authz.clientes_visibles()` suma a los clientes asignados las personas con
   `OrganizationMembership` vigente en esas empresas. Un ex miembro deja de ser visible.
5. **Vigencia en la base.** Un intervalo vencido no da acceso, en la transacción
   siguiente y sin depender de ninguna sesión.
6. **El rol fija el universo.** El Administrador ve todo sin asignación. El Operador ve
   lo que tiene asignado. El Revisor y un usuario sin rol no ven clientes por asignación.

## Alternativas descartadas

- **`PortfolioAssignment` con `validFrom` y `validTo` en dos columnas** (el esquema
  conceptual previo de `DOMAIN.md`). Equivalente, pero sin rango no hay exclusión
  nativa de superposición; habría que hacerla con trigger.
- **Asignar carteras con nombre en vez de clientes.** Agrega una entidad que hoy nadie
  pidió (`AGENTS.md`: no inventar requisitos).
- **Un permiso "ver todo" para operadores.** Es justamente el privilegio universal
  permanente que el owner excluyó.

## Consecuencias

- `DOMAIN.md` §55 pasa a ClientAssignment y §54 a los roles de `D-0072`.
- Las políticas RLS de Broker OS (migración 0007) filtran parties, pólizas y sus
  dependientes por `authz.clientes_visibles()`.
- Las evaluaciones de Risk OS tendrán su propio alcance: `T-0035` decide en su
  incremento de Risk OS si se derivan de la empresa evaluada o se asignan aparte.

## Evidencia

`packages/db/src/autorizacion.integration.test.ts`: matriz de visibilidad por rol,
vencimiento de una asignación, baja, superposición rechazada (`23P01`) y ex miembro no
visible.
