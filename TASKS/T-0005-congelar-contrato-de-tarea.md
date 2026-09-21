---
id: T-0005
title: Congelar el contrato de tarea contra el merge-base
kind: CHORE
status: DONE
workstream: POS
riskClass: MEDIUM
size: S
created: 2026-09-08
blockedBy: []
contextRefs: [ENGINEERING_RULES.md, TASKS/_TEMPLATE.md, .github/workflows/project-os-check.yml]
decisionRefs: [D-0017]
---

## Why

Las cuatro secciones de contrato de una tarea son markdown editable por el mismo agente
que la implementa. El modo de falla clásico —no logro pasar la verificación, aflojo la
verificación— hoy no tiene ninguna defensa. Va primero porque su ausencia se vuelve cara
exactamente cuando aparece el incentivo: hoy ningún agente gana nada aflojando un
`## Verification`; a partir de T-0012 sí. Un control instalado después del primer código
de aplicación llega tarde a la única tarea para la que se construyó.

## Outcome

Un job de CI requerido en `main` falla cuando:

- **(a)** el nombre de la rama no es `task/T-xxxx-…` según R-29 **ni** lleva uno de los
  prefijos exentos declarados en el propio workflow —`docs/`, `chore/`—, de modo que una
  rama mal nombrada no puede evadir el control quedando fuera de su alcance;
- **(b)** la rama declara un task id y `TASKS/T-xxxx-*.md` **no existe en el
  merge-base** — mensaje: la tarea debe estar en `main` antes de implementarla;
- **(c)** `## Why`, `## Outcome`, `## Non-scope` o `## Verification` del archivo de esa
  tarea difieren byte a byte de su versión en el merge-base.

El resto del archivo —`## Notes`, `## Risks`, `## Evidence`, `## Data effects`— queda
libre y debe quedar libre: es donde el implementador registra lo que aprendió.

El control está comprobado en negativo: un PR descartable que altera una de las cuatro
secciones queda en rojo y se cierra sin integrar.

## Non-scope

- No se agrega `verificationHash` ni ningún campo nuevo de frontmatter.
- No se valida el contenido de las secciones, solo su inmutabilidad.
- No se impide la edición local: el control va en la puerta, no en el sandbox.
- No se modifica `.claude/`, ni los hooks, ni el esquema de AgentRun.
- No se cambia el estado de ninguna tarea existente.
- No se agregan prefijos exentos más allá de los dos que el workflow declara.

## Verification

```bash
# El repositorio sigue siendo válido.
pnpm check

# El job existe, corrió, y es requerido por la protección de main.
gh workflow view "Project OS check" --repo emidc/del-campo
gh api repos/emidc/del-campo/branches/main/protection \
  --jq '.required_status_checks.contexts'
```

Comprobaciones humanas:

- [ ] Un PR de prueba que altera `## Verification` de una tarea existente deja el job
      en rojo, y el PR se cierra sin integrar.
- [ ] Un PR que solo modifica `## Notes` de la misma tarea pasa en verde.
- [ ] Una rama `task/T-9999-inexistente` con el archivo de tarea creado en la propia
      rama queda en rojo por la regla (b).
- [ ] Una rama `feature/algo`, sin task id y sin prefijo exento, queda en rojo por la
      regla (a) con un mensaje que nombra R-29.
- [ ] Una rama `docs/…` pasa en verde sin tarea asociada.
- [ ] El job no recibe permisos de escritura que no necesita.

## Data effects

Agrega un job al workflow versionado y cambia la configuración remota de protección de
`main` para exigirlo. No toca producción ni datos de clientes. Reversible por un PR que
retire el job y una modificación explícita de la protección de rama; ambas requieren
aprobación humana.

## Notes

Sin inputs pendientes. Q-1 respondida: la rama sin task id falla salvo prefijo exento,
para que R-29 se haga cumplir por configuración y no por texto.

**Permisos.** Toca `.github/workflows/**`: R-13 exige aprobación humana y
`.claude/settings.json` deniega la escritura al agente. El agente produce el diff y la
comprobación negativa; el humano aplica el archivo y marca el check como requerido.

**2026-09-21.** Lógica escrita en `scripts/check-task-contract.mjs`, 16 tests en
`scripts/tests/check-task-contract.test.mjs`, entran a `pnpm check` por glob. Diff del
workflow propuesto y comandos `gh` exactos —aplicar el workflow, marcar el check
requerido, correr los cinco PRs de prueba— en `REVIEWS/T-0005-congelar-contrato-de-tarea.md`
y `REVIEWS/T-0005/project-os-check.proposed.yml`. Ninguno de los dos se aplicó: son
autorización humana. La tarea sigue sin poder pasar a DONE hasta que esos pasos corran:
las comprobaciones humanas de `## Verification` son parte de la verificación, no un
adorno. Evidencia parcial, con lo que sí se ejecutó, en `ops/evidence/T-0005.md`.


**Cierre 2026-09-21 — comprobaciones delegadas expresamente por el owner.**
Se aplicó exactamente `REVIEWS/T-0005/project-os-check.proposed.yml` (commit
`83ad66475cb7379a0d91e4d983f56c01de8fcc8a`). El PR #10 ejecutó el control en verde.
Los PRs descartables #11 (b), #12 (c), #14 (a) fallaron por la causa esperada;
#13 (Notes de T-0006) y #15 (docs/) pasaron. Los cinco se cerraron sin merge.
`check` ya era requerido en `main`; no se modificó ninguna protección. Los logs
confirman Contents: read y Metadata: read, sin escritura. Evidencia y salidas
literales en `ops/evidence/T-0005.md`.

Las seis comprobaciones de Verification están satisfechas. Sus casillas se conservan
byte a byte como en el merge-base: marcarlas alteraría el contrato congelado. Este
cierre sustituye el pendiente histórico de la nota anterior. El PR de entrega queda
abierto para revisión e integración; no se ejecutó merge a main. La continuación
Codex no tiene AgentRun capturado: el esquema vigente solo admite claude-code y no
se inventó un evento ni se modificó el esquema.
