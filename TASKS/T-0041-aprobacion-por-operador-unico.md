---
id: T-0041
title: Hacer cumplir la aprobación interna por operador único en Risk OS
kind: FEATURE
status: DONE
workstream: BOS
riskClass: HIGH
size: M
created: 2026-11-07
blockedBy: [T-0038]
contextRefs: [DECISIONS/0083-aprobacion-interna-por-operador-unico.md,
              DECISIONS/0022-punto-de-enforcement-de-autorizacion.md,
              SLICES/RO01.md, contexts/risk/README.md]
decisionRefs: [D-0022, D-0083, D-0084]
---

## Notas de implementación

- **Qué verifica SOU-01b hoy.** Risk OS no tiene exportación, publicación ni entrega al
  cliente. Lo que existe es la guarda `exigirEntregable`
  (`contexts/risk/src/application/operador-unico.ts`) y su test en
  `autorizacion.integration.test.ts`: rechaza una evaluación aceptada sólo como aprobación
  interna por operador único, y la deja pasar cuando la acepta otra persona.
- **Qué tiene que verificar el primer canal de entrega real.** Que llama a
  `exigirEntregable` por cada evaluación que usa, en el servidor y antes de producir nada, y
  que su test muestra el rechazo. La lectura interna de Broker OS (`riesgosDeEmpresa`) no es
  una entrega y no la llama.

## Why

D-0083 permite que Emiliano apruebe lo propio para uso interno, con revisión de IA
registrada y 24 horas desde el último cambio material, y exige que la restricción se haga
cumplir en el servidor y en los permisos de base. Sin eso, RO01 no puede ejecutar sus
ciclos de actualización (T-0032) sin una segunda persona.

## Outcome

Dos partes, cada una con su aceptación:

- **SOU-01a, base.** La base de Risk OS rechaza que el autor apruebe lo propio sin una
  revisión de IA registrada sobre la versión vigente o antes de 24 horas desde el último
  cambio material, y lo acepta después. Un cambio material reinicia la espera. Quedan
  registrados versión, hallazgos, correcciones y aprobación humana.
- **SOU-01b, aplicación.** La aprobación se muestra como "aprobación interna por operador
  único", y exportar, publicar o entregar al cliente algo aprobado así se rechaza en el
  servidor.

## Non-scope

- Entregas al cliente sin segunda persona (sería otra decisión, no tomada).
- Elegir a la persona que aprueba entregas al cliente (PER-01, etapa 3).
- Aplicar la excepción a Broker OS o Communication OS.

## Verification

```bash
pnpm check
pnpm test
```

- [x] Un test de base muestra el rechazo antes de 24 h, sin revisión registrada y tras un
      cambio material, y la aceptación después.
- [x] Un test de servidor muestra el rechazo de exportar o entregar lo aprobado por
      operador único.

## Data effects

Agrega tablas o columnas de revisión y aprobación y sus permisos en la base de Risk OS,
mediante una migración versionada que se revierte con su migración inversa. No modifica
evaluaciones existentes.
