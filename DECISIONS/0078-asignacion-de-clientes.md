# ADR-0078 — La asignación de cartera es una asignación explícita de usuario a cliente, con intervalo de validez

- **Id en `decisions.yaml`:** D-0027
- **Estado:** ACCEPTED. El owner aprobó la decisión el 2026-11-03, con la precisión de
  alcance de los puntos 3 y 4 (migración 0009).
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
   tipo `ORGANIZATION` o `PERSON`: un cliente particular se asigna igual que una empresa
   (confirmado por el owner, 2026-11-03).
4. **Asignar una empresa no abre lo personal de sus miembros** (precisión del owner,
   2026-11-03). La asignación directa de un cliente da su alcance completo: perfil,
   roles, contactos, documentos y pólizas. La empresa asignada da además la
   identificación mínima de sus miembros vigentes (la fila de `Party`, la pertenencia y
   el nombre, por la vista `miembro_de_empresa_asignada`), pero no su perfil personal,
   sus contactos, sus documentos ni sus pólizas personales. Para eso hace falta asignar a
   la persona. Un ex miembro deja de aparecer.
   - `ContactPoint` no distingue contacto profesional de personal. Hasta que lo haga,
     ningún contacto de un miembro se expone por la empresa. Si hace falta, la
     distinción se agrega al modelo con su propia decisión.
   - **Pólizas y cambios de tomador.** La póliza completa (versiones, endosos y
     documentos) la ve quien tiene asignado al tomador de la versión vigente hoy, o de
     la última si ninguna está vigente (`authz.tomador_vigente()`). Quien tenía asignado
     a un tomador anterior conserva la cabecera y las versiones en las que su cliente fue
     tomador, y nada de lo posterior. Así, que un empleado pase a ser tomador de una
     póliza que era de la empresa no le abre su póliza al Operador de la empresa, y una
     póliza que pasa de una persona a la empresa queda completa para la cuenta de la
     empresa, que es su tomador actual.
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
- Las políticas RLS de Broker OS filtran parties, pólizas y sus dependientes. La 0007
  las introdujo con la empresa abriendo a sus miembros; la 0009 las corrige al alcance
  del punto 4 sin reescribir la 0007, que ya estaba en `main`.
- Las evaluaciones de Risk OS tendrán su propio alcance: `T-0035` decide en su
  incremento de Risk OS si se derivan de la empresa evaluada o se asignan aparte.

## Evidencia

- `packages/db/src/autorizacion.integration.test.ts`: matriz de visibilidad por rol,
  vencimiento de una asignación, baja, superposición rechazada (`23P01`) y ex miembro no
  visible.
- `packages/db/src/alcance-empresa.integration.test.ts`: pruebas negativas del punto 4,
  como `broker_app` y como `broker_mcp` (póliza personal, perfil, contactos y documentos
  de un empleado; ex miembro; columnas de la vista) y cambios de tomador, con y sin
  versión vigente. Con las políticas de 0007 fallan 7 de las 12, y con la política de
  versiones sin acotar al tomador, 2.
