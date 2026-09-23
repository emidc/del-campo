---
id: T-0017
title: Preparar la vinculación documental de VS01 con conciliación asistida
kind: FEATURE
status: READY
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-09-20
blockedBy: [T-0011, T-0013]
contextRefs: [DOMAIN.md, decisions.yaml, SLICES/VS01.md, ENGINEERING_RULES.md,
              REVIEWS/T-0004-insumos-vs01.md, REVIEWS/T-0004-drive-validation.md]
decisionRefs: [D-0009, D-0019, D-0032, D-0034, D-0040, D-0054, D-0057]
---

## Why

La muestra de discovery no acredita acceso del usuario final ni vínculo inequívoco de
póliza a documento. La app debe consumir vínculos sustentados y presentar los pendientes.
Q-15 quedó resuelta por D-0057: la vinculación se sustenta con comprobación humana y
enlaces, sin integración API con Drive.

## Outcome

Existe una carga repetible, desde un insumo local revisado, de referencias documentales
de VS01 y una consulta para la app, según `SLICES/VS01.md` §2–3, `DOMAIN.md` §47–49 y
D-0057. Por cada relación, el insumo registra tipo de destino (archivo o carpeta), a qué
se vincula (documento de la Policy o carpeta del cliente), quién la verificó, con qué
evidencia, cuándo y bajo qué cuenta comprobó la apertura, o por qué quedó pendiente.

- Un archivo con asociación revisada se asocia con su Policy mediante la pertenencia de
  D-0054 y la consulta lo ofrece como documento de la póliza.
- Una carpeta cuya relación con el cliente está sustentada se ofrece como carpeta del
  cliente; la Policy conserva su pendiente documental.
- Los casos no comprobados, ambiguos o inaccesibles quedan pendientes con su motivo y
  el tratamiento canónico de `ExternalReference`, sin ocultar la póliza ni inferir
  inexistencia. Sin referencia sustentada, la consulta devuelve la ausencia.

Los conteos distinguen Policies con documento, con solo carpeta del cliente, con
referencias pendientes y sin referencia, y se reconcilian contra el insumo y el lote.
La conciliación prioriza las Policies de los 20 casos congelados para la aceptación.

## Non-scope

- Sin llamadas a la API de Drive, OAuth, proyecto de Google Cloud, cuenta de servicio,
  delegación ni cuenta de integración (D-0057).
- Sin creación, movimiento, renombrado, modificación o eliminación en Drive, ni cambios
  de permisos o ACLs (D-0040).
- Sin asignación por similitud de nombres ni vínculo automático Policy-documento.
- Sin editor de conciliación en la app, crawling ni lectura de contenido documental.
- Sin declarar un 404 prueba de inexistencia ni convertir la muestra en un censo.
- Sin garantizar que la comprobación bajo una cuenta implique acceso de otros usuarios
  o acceso permanente.
- Sin la superficie de la app ni la medición de aceptación, que pertenecen a T-0018.

## Verification

```bash
pnpm check
```

- [ ] Una segunda carga del mismo insumo no duplica ni cambia las referencias; una carga
      con una relación modificada cambia solo esa relación y deja rastro trazable.
- [ ] Pruebas sintéticas cubren archivo revisado, carpeta del cliente sin documento,
      falta de referencia, referencia ambigua, inaccesible/no comprobada y fila
      inválida del insumo, sin ocultar la póliza ni inventar vínculos.
- [ ] La consulta distingue documento de la póliza, carpeta del cliente y ausencia, y
      nunca presenta una carpeta como documento.
- [ ] Los conteos por categoría coinciden con el insumo y con el lote consultado, con
      denominador explícito.
- [ ] Cada relación cargada conserva verificador, evidencia, fecha y cuenta de
      comprobación; la carga rechaza filas aprobadas sin esos datos.
- [ ] Las Policies de los 20 casos congelados tienen su relación verificada o su
      pendiente registrado; la evidencia versionada es agregada y sin PII (R-19).

## Data effects

Escribe referencias, pertenencia y metadata de verificación en la base local a partir de
un insumo revisado ubicado fuera de Git. No lee ni escribe Drive por API y no modifica el
origen ni ACLs. La carga es trazable al insumo y al lote; su reversión local no elimina
fuentes. El insumo real contiene URLs e identificadores de clientes: lo prepara y verifica
una persona autorizada; los agentes de desarrollo trabajan con fixtures sintéticas salvo
excepción registrada según R-19. Aplican R-13, R-16 y R-19.

## Notes

Parte de la descomposición de T-0014 en T-0011.

**Q-15 resuelta el 2026-09-23 por D-0057.** Identidad de comprobación: cuenta corporativa
del owner, registrada por relación. Administrador del Workspace: Manuel. No se requiere
configuración de Google Cloud ni custodia de credenciales. La consulta automática de
metadatos se evaluará en otra tarea solo ante una necesidad concreta.

**Insumo (CSV UTF-8, una fila por relación o pendiente).** Columnas:
`policy_source_id` (id de Zoho de la Policy, no número ni nombre), `target_url`,
`target_kind` (`FILE` | `FOLDER`), `link_scope` (`POLICY_DOCUMENT` | `CLIENT_FOLDER`),
`status` (`VERIFIED` | `PENDING`), `pending_reason` (`UNVERIFIED` | `AMBIGUOUS` |
`INACCESSIBLE` | `NO_REFERENCE`; vacío si `VERIFIED`), `verified_by`, `verified_at`
(ISO 8601 con zona), `verified_account` y `evidence` (texto breve, sin contenido
documental). `POLICY_DOCUMENT` exige `FILE`. `VERIFIED` exige verificador, fecha, cuenta
y evidencia. Una Policy puede tener a lo sumo un `POLICY_DOCUMENT` verificado; más de uno
es `AMBIGUOUS`. Cambiar este formato durante la ejecución requiere revisar el contrato.

Los mapeos de conciliación requieren evidencia humana suficiente conforme D-0032.
