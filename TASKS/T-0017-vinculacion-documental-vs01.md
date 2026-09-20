---
id: T-0017
title: Preparar la vinculación documental de VS01 con conciliación asistida
kind: FEATURE
status: DRAFT
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-09-20
blockedBy: [T-0011, T-0013]
contextRefs: [DOMAIN.md, decisions.yaml, SLICES/VS01.md, ENGINEERING_RULES.md,
              REVIEWS/T-0004-insumos-vs01.md, REVIEWS/T-0004-drive-validation.md]
decisionRefs: [D-0009, D-0019, D-0032, D-0034, D-0040]
---

## Why

La muestra de discovery no acredita acceso del usuario final ni vínculo inequívoco de
póliza a documento. La app debe consumir vínculos sustentados y presentar los pendientes.

## Outcome

Existe una carga repetible de referencias documentales revisadas y una consulta para la
app, según `SLICES/VS01.md` §2–3 y `DOMAIN.md` §47–49. Los insumos registran quién y con
qué evidencia validó la relación; los casos pendientes conservan el tratamiento canónico.
Los conteos distinguen recursos sin referencia de referencias no resueltas y se pueden
reconciliar contra el lote. Se prueban archivos y carpetas, y acceso bajo la identidad
configurada. Se entrega evidencia redactada del carácter de solo lectura en Drive.

## Non-scope

- Sin creación, movimiento, renombrado, modificación o eliminación en Drive.
- Sin ampliación automática de permisos ni asignación por similitud de nombres.
- Sin editor de conciliación en la app, crawling general ni lectura masiva de contenido.
- Sin declarar un 404 prueba de inexistencia ni convertir la muestra en un censo.

## Verification

```bash
pnpm check
```

- [ ] Una segunda carga del mismo insumo no duplica ni cambia las referencias aprobadas.
- [ ] Se comprueban archivo, carpeta, falta de referencia, referencia ambigua y acceso
      denegado/no verificable sin ocultar la póliza ni inventar vínculos.
- [ ] Los resultados y denominadores documentales coinciden con el lote consultado.
- [ ] La evidencia de llamadas demuestra solo lecturas en Drive, sin secretos ni PII.
- [ ] La identidad de uso puede abrir los destinos validados; se registran por separado
      los pendientes. Las pruebas del componente no se confunden con la aceptación final.

## Data effects

Escribe referencias y metadata en una base local a partir de un insumo revisado; lee
Drive por la vía que resuelva Q-15. No modifica el origen ni ACLs. La carga es trazable
al lote y su reversión local no elimina fuentes. No se ejecuta con datos reales ni se
habilita una integración externa al escribir esta tarea. Aplican R-13, R-16 y R-19.

## Notes

Parte de la descomposición de T-0014 en T-0011.

**Q-15 sigue pendiente antes de READY:** concretar identidad de acceso, vía de conexión,
permisos mínimos, administrador, custodia de credenciales y relación entre acceso de la
integración y acceso del usuario. La solución se documenta con el ADR que corresponda
por R-05 antes de implementar; no se presume cuenta de servicio ni delegación.

Los mapeos de conciliación requieren evidencia humana suficiente conforme D-0032.
