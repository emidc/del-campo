---
id: T-0011
title: Escribir el contrato de software de Vertical Slice 01
kind: REVIEW
status: DONE
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-09-08
closed: 2026-09-20
blockedBy: [T-0004, T-0015]
contextRefs: [DOMAIN.md, decisions.yaml, PROJECT.md, REVIEWS/T-0004-insumos-vs01.md,
              TASKS/T-0015-alinear-dominio-con-evidencia.md]
decisionRefs: [D-0019, D-0020, D-0021, D-0025]
---

## Why

`DOMAIN.md` §63-66 define el dominio de VS01 y `D-0019` decide qué es la rebanada, pero
falta consolidar el contrato de software con los inputs ya respondidos en `T-0015`:
superficie, criterio medible de éxito, autenticación interna y despliegue, junto con el
origen de los datos documentado por `T-0004`. VS01 son al menos cuatro tareas que necesitan la
misma respuesta a "qué es VS01"; si esa respuesta vive dentro de una de ellas, una tarea
cerrada pasa a leerse como especificación vigente, que es precisamente lo que las tareas
no son.

Va después de T-0004 y no antes. Si la conformidad de las carpetas de Drive resulta baja,
vincular pólizas a documentos automáticamente deja de ser viable y la rebanada cambia de
forma. Escribir esto antes de la medición es escribir ficción con buen formato.

## Outcome

Existe `SLICES/VS01.md` y contiene **únicamente** lo que no está en `DOMAIN.md` ni en
`decisions.yaml`: superficie de software, origen de los datos, criterio medible de éxito,
autenticación interna en VS01, despliegue, y el non-scope **adicional** al de §66.

Referencia entidades, invariantes y decisiones por id; no las reformula. Declara en su
encabezado que caduca al entregarse VS01, momento en el cual pasa a ser historia y el
sistema se describe por `DOMAIN.md` y por el código.

El checker valida las referencias `D-xxxx` dentro de `SLICES/`, igual que ya lo hace con
los documentos canónicos.

La descomposición de T-0014 en tareas concretas sale de este documento.

## Non-scope

- No se implementa nada.
- No se reformula el dominio: cada afirmación de dominio es una referencia.
- No se decide el portal externo ni autorización productiva — eso es `D-0022` y T-0002.
- No se crea `SPECS/` ni un archivo por feature.
- No se escribe una especificación para rebanadas posteriores a VS01.

## Verification

```bash
pnpm check
node --test scripts/tests/check-docs-slices.test.mjs
git diff --check
```

Comprobaciones humanas:

- [x] El criterio de éxito es medible sin interpretación: dice qué se mide, contra qué
      valor y con qué instrumento.
- [x] Cada afirmación de dominio del archivo es una referencia a `DOMAIN.md` o a
      `decisions.yaml`, no una reformulación.
- [x] El alcance declarado es sostenible con los números que produjo T-0004, y el
      documento nombra qué resultado lo habría cambiado.
- [x] Ninguna decisión `OPEN` quedó resuelta de hecho por este documento.

## Notes

**Inputs resueltos.** Q-8 (superficie), Q-9 (criterio medible de éxito), Q-10
(autenticación interna) y Q-11 (despliegue) ya fueron respondidos por el owner y están
registrados en [T-0015, §Notes](T-0015-alinear-dominio-con-evidencia.md#notes), bajo
«Inputs ya respondidos». No requieren una nueva elección ni bloquean por falta de
respuesta. El dominio y las decisiones canónicas siguen en `DOMAIN.md` y
`decisions.yaml`; `D-0014` conserva el pendiente relativo al worker.

**Ejecución del 2026-09-20.** T-0004 y T-0015 ya están integradas y no quedan bloqueos
por Q-8–Q-11. Se activa esta tarea para producir el contrato; T-0005 todavía no está
implementada. Esta actualización sustituye la nota histórica sobre incorporar inputs
antes del primer merge: las respuestas ya están disponibles y se consumen aquí.

El contrato fue revisado por el owner, junto con la descomposición de T-0014 en T-0016
(búsqueda), T-0017 (vinculación documental) y T-0018 (app y aceptación). Q-15 permanece
explícita en T-0017 y no se decide por inferencia. El protocolo de medición concreta los
umbrales aprobados; las cuatro comprobaciones humanas están completas.


## Evidence

Verificación automática ejecutada el 2026-09-20:

- `pnpm check`: PASS; 41 decisiones, 11 ADRs, 18 tareas, cero avisos; AgentRun PASS.
- `node --test scripts/tests/check-docs-slices.test.mjs`: 5 tests PASS. Incluyen
  referencias válidas, rechazo de ids inexistentes en raíz y subdirectorios,
  rechazo de estados duplicados y compatibilidad sin directorio SLICES.
- `git diff --check`: PASS.

Revisión del agente: §4 concreta medidas e instrumento; §1–3 referencia la semántica
canónica; §3 registra límites de la muestra y el resultado que impediría entregar;
§5–7 conserva las decisiones pendientes. La revisión del agente se complementa con la
confirmación explícita del owner de haber realizado las cuatro comprobaciones humanas.

No se modificaron DOMAIN.md, decisions.yaml, hooks ni CI. No se consultaron exports
privados, Zoho ni Drive. No se ejecutaron las nuevas tareas de implementación.

## Closure

Cierre: **2026-09-20**. El owner confirmó explícitamente: «Comprobaciones humanas
hechas, podemos continuar». Las cuatro comprobaciones de Verification ya estaban
marcadas por el usuario al retomar y se conservan. Se registra la aprobación del
contrato y se cierra T-0011, sin afirmar que VS01 esté implementado o entregado.

T-0014 queda DROPPED por descomposición; T-0016, T-0017 y T-0018 conservan DRAFT y sus
precondiciones. T-0012 todavía depende del entorno T-0010 (precedido por T-0008) y de su
input Q-12. Este cierre no activa implementación, migración ni despliegue.
