---
id: T-0016
title: Implementar la búsqueda y consulta de VS01
kind: FEATURE
status: ACTIVE
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-09-20
blockedBy: [T-0011, T-0012, T-0019]
contextRefs: [DOMAIN.md, decisions.yaml, SLICES/VS01.md, ENGINEERING_RULES.md]
decisionRefs: [D-0019, D-0034, D-0036, D-0037, D-0038, D-0054]
---

## Why

La app necesita consultas verificables para encontrar la póliza correcta y distinguir
ambigüedades antes de integrar documentos y medir el recorrido completo.

## Outcome

La consulta soporta los campos de `DOMAIN.md` §65 y el recorrido de
`SLICES/VS01.md` §2. Los resultados permiten distinguir candidatos y muestran ausencia
sin seleccionar por el usuario. El detalle y su historial se limitan a §63 del dominio.
Las pruebas cubren cada campo de búsqueda, cero resultados, múltiples candidatos y
pólizas sin vínculo documental. Se consulta la base de prueba de T-0012 sin exponer
un servicio público antes de la autenticación de T-0018.

## Non-scope

- Sin UI final, autenticación, despliegue ni conexiones a Drive.
- Sin importación, edición de datos o cambios a decisiones de dominio.
- Sin búsqueda en contenido documental ni funcionalidades fuera de §66.

## Verification

```bash
pnpm check
```

- [ ] Los tests contra la base con datos sintéticos cubren los campos de §65 y las
      combinaciones ambiguas, sin falsos positivos presentados como resultado único.
- [ ] La falta de documentos no elimina una póliza de los resultados.
- [ ] La navegación y los límites de historial corresponden a §63 y §65.
- [ ] No existe un acceso público a datos sin la integración de sesión de T-0018.

## Data effects

Lee una base local de prueba; las fixtures son sintéticas. No consulta datos externos
ni modifica datos de negocio. No se crean índices o constraints que decidan cuestiones
abiertas del dominio sin pasar por su decisión correspondiente.

## Notes

Parte de la descomposición de T-0014 realizada en T-0011. Conserva DRAFT hasta revisar
el contrato de VS01 y completar el schema; no inicia implementación en esta pasada.

**Promovida a `READY` el 21/09/2026.** Las dos condiciones que esta nota ponía para salir
de `DRAFT` se cumplieron: `T-0011` cerró con el contrato de VS01 revisado y aprobado, y
`T-0012` está en `main` con el schema y su base de prueba. No quedan inputs humanos
pendientes —a diferencia de `T-0013`, que espera Q-14—, así que el contrato entra a
implementación tal como está escrito.

Es `FEATURE`, de modo que su PR pasa por revisión ciega antes del merge, no por decisión
de quien la implemente. → `D-0052`, `R-33`

El owner definió el 21/09/2026 que `OrganizationMembership` recibe un instante ISO-8601
con `Z` u offset explícito y compara directamente `timestamptz` con semántica
`[validFrom, validTo)`; no se aplica esa definición temporal a otras consultas. También
confirmó que la resolución canónica de Party debe seguir uno o varios saltos sin perder
Policies ni duplicar identidades.

T-0019 quedó integrada en `main` mediante PR #25 antes de consumirla acá. La consulta
distingue una Policy sin referencia documental de una referencia conocida no resuelta,
preserva su motivo y mantiene separada la Policy de pertenencia del destino intentado.
