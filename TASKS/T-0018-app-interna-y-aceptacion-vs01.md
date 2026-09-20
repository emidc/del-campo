---
id: T-0018
title: Entregar la app interna y medir la aceptación de VS01
kind: FEATURE
status: DRAFT
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-09-20
blockedBy: [T-0013, T-0016, T-0017]
contextRefs: [DOMAIN.md, decisions.yaml, SLICES/VS01.md, ENGINEERING_RULES.md]
decisionRefs: [D-0013, D-0014, D-0019, D-0040]
---

## Why

Las consultas y referencias documentales solo entregan valor cuando una persona de la
correduría puede usarlas con su cuenta interna y se mide el ahorro frente a Zoho + Drive.

## Outcome

La app web integra T-0016 y T-0017 con la superficie de `SLICES/VS01.md` §2,
autenticación interna de §5 y despliegue de §6. La implementación de autenticación tiene
su decisión y ADR según R-05, pruebas negativas de acceso y configuración reproducible
sin secretos versionados. El acceso a datos requiere sesión válida en servidor.

Existe evidencia de los 20 casos y de cada umbral de §4. La entrega solo se declara
cuando todos se cumplen. La configuración y el procedimiento de volver a una versión
anterior están documentados y verificados en el entorno de prueba; la puesta en
producción se realiza con la aprobación de R-13. Al entregar VS01 se marca su contrato
como histórico, sin borrarlo.

## Non-scope

- Sin nuevos roles de dominio, permisos por cartera, portal ni agentes de producto.
- Sin escrituras de negocio en Zoho/Drive ni editor de conciliación.
- Sin ampliar alcance para compensar un criterio de aceptación incumplido.
- Sin decidir hosting de worker, RLS u otros mecanismos de D-0022 por implicación.

## Verification

```bash
pnpm check
```

- [ ] Tests de acceso prueban sesión ausente, inválida/expirada y cuenta no admitida,
      tanto en páginas como en consultas directas de datos; ninguno expone información.
- [ ] El recorrido completo incluye búsqueda, selección, detalle y apertura documental,
      con los estados sin resultados, ambiguos y documentales pendientes visibles.
- [ ] El informe de aceptación permite recalcular los cuatro resultados de §4 y conserva
      los fallos, sin reemplazar casos ni exponer PII.
- [ ] La medición acredita utilidad sin consultar Zoho durante el recorrido de VS01.
- [ ] Configuración, regreso a la versión anterior y autorizaciones de despliegue quedan
      documentados sin secretos. El contrato se marca histórico solo al entregar.

## Data effects

Lee datos de la base preparada y abre recursos de Drive. La sesión utiliza la integración
Google elegida mediante su ADR. No escribe datos de negocio en origen. La medición real
la ejecuta una persona autorizada; el repositorio recibe evidencia redactada conforme
R-19. La carga de datos en el entorno hosteado se planifica y autoriza antes de ejecutarse,
sin tratar la base local de T-0013 como si ya estuviera desplegada.

## Notes

Parte de la descomposición de T-0014 en T-0011. Q-8–Q-11 se consumen desde el contrato;
no se vuelven a pedir. Antes de READY deben concretarse la implementación de sesión,
población interna admitida y su regla de admisión, entorno de entrega y preparación del
piloto. Si la implementación alcanza un disparador de T-0002, ese spike precede al
acceso correspondiente; esta tarea no redefine ni elimina sus disparadores.
