---
id: T-0011
title: Escribir el contrato de software de Vertical Slice 01
kind: REVIEW
status: DRAFT
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-09-08
blockedBy: [T-0004]
contextRefs: [DOMAIN.md, decisions.yaml, PROJECT.md, REVIEWS/T-0004-insumos-vs01.md]
decisionRefs: [D-0019, D-0020, D-0021, D-0025]
---

## Why

`DOMAIN.md` §63-66 define el dominio de VS01 y `D-0019` decide qué es la rebanada, pero
nadie decidió su software: superficie, origen de los datos, criterio medible de éxito,
autenticación interna y despliegue. VS01 son al menos cuatro tareas que necesitan la
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
```

Comprobaciones humanas:

- [ ] El criterio de éxito es medible sin interpretación: dice qué se mide, contra qué
      valor y con qué instrumento.
- [ ] Cada afirmación de dominio del archivo es una referencia a `DOMAIN.md` o a
      `decisions.yaml`, no una reformulación.
- [ ] El alcance declarado es sostenible con los números que produjo T-0004, y el
      documento nombra qué resultado lo habría cambiado.
- [ ] Ninguna decisión `OPEN` quedó resuelta de hecho por este documento.

## Notes

**Inputs requeridos — bloquean el pase a `READY`.** Ninguno de los cuatro es derivable
de un documento del repositorio. El agente puede llegar hasta un borrador con opciones y
consecuencias; la elección es tuya.

- **Q-8 · ¿Cuál es la superficie?** ¿Aplicación web, CLI, otra cosa? ¿Qué ve un usuario
  de la correduría cuando la abre? Es la decisión que más condiciona el resto.
- **Q-9 · ¿Cuál es el criterio medible de éxito?** "Más rápido que Zoho + Drive" no es
  verificable como está escrito. Hace falta qué se mide —tiempo hasta encontrar una
  póliza y sus documentos, por ejemplo—, contra qué línea de base y con cuántos casos.
- **Q-10 · ¿Hay autenticación interna en VS01?** SSO de Google Workspace, o ninguna
  porque corre local y de solo lectura. Afecta si `User` entra al schema de T-0012 más
  allá del mínimo de §63.
- **Q-11 · ¿Dónde corre?** Local en las máquinas de la correduría, o hosteado. Cambia el
  costo de T-0014 y toca `D-0014`, que sigue provisional.

Las respuestas se incorporan a `## Outcome` antes de que este archivo llegue a `main`:
después de T-0005 las cuatro secciones de contrato quedan congeladas.
