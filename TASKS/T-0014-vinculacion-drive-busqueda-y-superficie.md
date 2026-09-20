---
id: T-0014
title: Entregar la vinculación con Drive, la búsqueda y la superficie de VS01
kind: FEATURE
status: DRAFT
workstream: BOS
riskClass: MEDIUM
size: L
created: 2026-09-08
blockedBy: [T-0013]
contextRefs: [DOMAIN.md, decisions.yaml, SLICES/VS01.md, REVIEWS/T-0004-insumos-vs01.md]
decisionRefs: [D-0009, D-0019]
---

## Why

Es lo que convierte tres tareas de infraestructura en algo que alguien de Del Campo
Broker usa en lugar de Zoho más Drive. `D-0019` exige que la rebanada sea útil aunque el
resto del programa se cancele; hasta este incremento no lo es.

## Outcome

`DocumentLink` vincula pólizas con sus carpetas de Drive, con el estado de reconciliación
que define `D-0009` y en la modalidad que T-0004 haya demostrado sostenible: vinculación
automática, conciliación asistida o alcance reducido.

Existe la búsqueda única de `DOMAIN.md` §65 sobre los campos que ese documento nombra, y
la superficie mínima que decidió `SLICES/VS01.md`, con el camino Party → Policies →
Policy y su versión vigente → documentos de Drive.

El criterio medible de éxito declarado en `SLICES/VS01.md` se cumple, medido y no
estimado.

## Non-scope

- Drive es autoritativo y de solo lectura: no se crean, mueven, renombran, modifican ni
  eliminan archivos ni carpetas — `D-0009` y R-14.
- Sin efectos externos, sin agentes, sin portal, sin cotización, sin emisión.
- Sin autorización multi-principal: `D-0022` sigue abierta y VS01 es interno.
- Sin integración de Gmail ni de WhatsApp — §66.
- El agente no recibe credenciales de Google: llama a algo que las tiene, R-16.

## Verification

```bash
pnpm check
```

Comprobaciones humanas:

- [ ] El criterio medible de `SLICES/VS01.md` se comprueba con una medición registrada,
      no con una impresión.
- [ ] Una persona de la correduría encuentra una póliza y sus documentos sin abrir Zoho.
- [ ] Ninguna operación del sistema escribió en Drive: se verifica sobre el log de la
      integración.
- [ ] Las pólizas sin documentos vinculados están contadas y son visibles, no
      silenciosamente ausentes.

## Data effects

Lee Drive y la base poblada por T-0013. No escribe en Drive. Las credenciales viven en
el componente que las posee y nunca en el contexto de un agente — R-16 y R-18.

## Notes

**Inputs requeridos — bloquean el pase a `READY`.**

- **Q-15 · ¿Cómo se monta el acceso a Google Workspace?** Por R-16 el agente no recibe
  credenciales: llama a algo que las tiene. Construir ese algo —cuenta de servicio,
  delegación, alcance de los permisos, quién lo administra— es trabajo humano de
  configuración, y conviene no descubrirlo el día que esta tarea arranca. La respuesta
  cambia el `## Outcome` y `## Data effects`.

**Advertencia de tamaño.** Este incremento es `L` y probablemente sean dos o tres tareas:
vinculación, búsqueda y superficie. No lo parto todavía porque su forma depende de lo que
decida `SLICES/VS01.md`, que a su vez depende de T-0004. Partirlo antes de esa evidencia
sería inventar una descomposición. La partición se hace al escribir T-0011, y ahí este
número deja de ser uno solo.
