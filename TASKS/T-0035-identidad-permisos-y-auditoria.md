---
id: T-0035
title: Unificar identidad, permisos por rol y auditoría en los tres contextos (C1)
kind: FEATURE
status: DRAFT
workstream: BOS
riskClass: HIGH
size: L
created: 2026-11-02
blockedBy: [T-0002, T-0034]
contextRefs: [PROJECT.md, DOMAIN.md, ENGINEERING_RULES.md, SLICES/VS01.md, SLICES/CO01.md,
              SLICES/RO01.md, DECISIONS/0059-sesion-y-admision-vs01.md,
              DECISIONS/0066-credencial-compartida-co01.md,
              DECISIONS/0069-acceso-por-persona-risk-os.md]
decisionRefs: [D-0013, D-0022, D-0027, D-0059, D-0060, D-0066, D-0069, D-0072]
---

## Why

Broker OS, Communication OS y Risk OS usan tres esquemas de acceso: Google corporativo,
una credencial compartida y credenciales por persona. Ninguna experiencia integrada de
la north star v25 (Inicio por rol, autoría, revisión por una persona distinta del autor,
portal, MCP) se puede construir así. Este corte es la compuerta de la etapa 1.

## Outcome

Cada persona del equipo entra a los tres contextos con la misma identidad, según D-0072:
Google con cualquier cuenta, sólo por invitación de un administrador, con revocación
inmediata comprobada en el servidor. Un ADR (R-05) confirma Supabase Auth u otra opción
frente a D-0013 y D-0060 antes de implementar. Los roles Administrador, Operador Del
Campo y Revisor profesional, y el alcance por empresa, se hacen cumplir en el servidor
según la decisión de D-0022. Cada acción que
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
- [ ] Revisión ciega del diff (D-0052).

## Data effects

Migra usuarios y credenciales de los tres contextos a una identidad común. El plan de
migración y de vuelta atrás se define antes de pasar a READY.
