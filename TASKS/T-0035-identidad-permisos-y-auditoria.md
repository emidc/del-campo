---
id: T-0035
title: Unificar identidad, permisos por rol y auditoría en los tres contextos (C1)
kind: FEATURE
status: DRAFT
workstream: BOS
riskClass: HIGH
size: L
created: 2026-11-02
blockedBy: []
contextRefs: [PROJECT.md, DOMAIN.md, ENGINEERING_RULES.md, SLICES/VS01.md, SLICES/CO01.md,
              SLICES/RO01.md, DECISIONS/0059-sesion-y-admision-vs01.md,
              DECISIONS/0066-credencial-compartida-co01.md,
              DECISIONS/0069-acceso-por-persona-risk-os.md,
              DECISIONS/0022-punto-de-enforcement-de-autorizacion.md,
              SPIKES/T-0002-enforcement-autorizacion.md,
              DECISIONS/0077-autenticacion-oidc-propio.md,
              docs/migration/T-0035-identidad-comun.md]
decisionRefs: [D-0013, D-0022, D-0027, D-0059, D-0060, D-0066, D-0069, D-0072, D-0077]
---

## Why

Broker OS, Communication OS y Risk OS usan tres esquemas de acceso: Google corporativo,
una credencial compartida y credenciales por persona. Ninguna experiencia integrada de
la north star v25 (Inicio por rol, autoría, revisión por una persona distinta del autor,
portal, MCP) se puede construir así. Este corte es la compuerta de la etapa 1.

## Outcome

Cada persona del equipo entra a los tres contextos con la misma identidad, según D-0072:
Google con cualquier cuenta, sólo por invitación de un administrador, con revocación
inmediata comprobada en el servidor. La autenticación es el OIDC de Google propio de
D-0060 extendido a los tres contextos, con una capa común y mínima de sesión y de
usuarios, sin Supabase Auth (D-0077). Los roles Administrador, Operador Del
Campo y Revisor profesional, y el alcance por empresa, se hacen cumplir en el servidor
con la autorización híbrida de D-0022: RLS decide las filas en cada contexto, la
aplicación decide la acción y la explica, y la regla de autor vive en las dos capas.
La estructura física de la asignación de empresas a personas (D-0027) se decide acá.
Cada acción que
cambia estado queda en un registro de auditoría con actor, origen, entrada resumida,
salida y efecto, sin datos bancarios. La credencial compartida de CO01 deja de existir.

## Non-scope

- Cuentas para contactos de empresas (portal, corte C12).
- Interfaz unificada (corte C4).
- Herramientas MCP (corte C13).
- Contratar servicios o cambiar de plan (D-0076).

## Verification

```bash
pnpm check
```

- [ ] Las reglas de `permisos.js`, `aislamiento.js` y `bancarios.js` del prototipo v25 están reescritas como pruebas contra el servidor y pasan.
- [ ] Condiciones de D-0022, cada una con su prueba contra Postgres:
      - autenticación real: el principal que llega a la base sale de una sesión verificada;
      - propagación segura de la identidad entre contextos, con admisión y alcance propios en cada uno;
      - principal local a la transacción en un único helper, sin `SET` de sesión (pooler);
      - funciones privilegiadas con `search_path` fijo y `EXECUTE` sólo para los roles que las usan;
      - toda tabla de datos con RLS habilitado y sus políticas, exigido por un chequeo;
      - revocación inmediata: la baja corta el acceso en el request siguiente, también con un token vigente;
      - ningún rol de app, worker o agente con `BYPASSRLS`.
- [ ] Revisión ciega del diff (D-0052).

## Data effects

Migra usuarios y credenciales de los tres contextos a una identidad común, con
migraciones sólo aditivas. El plan por fases, con su vuelta atrás en cada una, está en
`docs/migration/T-0035-identidad-comun.md`. Los pasos contra producción, la carga de
invitaciones con datos reales y el borrado de la credencial compartida los hace o los
aprueba el owner (R-13, R-14).
