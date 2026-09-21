# T-0005 — Propuesta aplicada y comprobada

**Workstream:** POS · **Fecha:** 2026-09-21

**Actualización de cierre.** El owner autorizó expresamente ejecutar estos pasos.
Workflow aplicado sin diferencias respecto de `project-os-check.proposed.yml` en
`83ad664`; PR de entrega: https://github.com/emidc/del-campo/pull/10.
`check` ya estaba requerido: protección consultada y conservada íntegra.
Pruebas #11–#15 ejecutadas, verificadas y cerradas sin merge; detalle en
`ops/evidence/T-0005.md`. Lo que sigue conserva la propuesta histórica, no describe
pendientes actuales.

**Correcciones necesarias para ejecutar la receta:** las cinco ramas de prueba
heredaron `83ad664`, con implementación y workflow, y apuntaron a `main` (el control
todavía no está integrado). Para (c) y Notes se usaron ramas `task/T-0006-…` y la
tarea T-0006: T-9998 habría fallado antes por (b). Para (a) se usó `feature/algo`,
como pide Verification. No se alteraron los criterios ni se integraron las pruebas.


El control queda dividido en dos piezas por R-13/R-15: la lógica en
`scripts/check-task-contract.mjs`, escrita, corrida y testeada por el agente
(`scripts/tests/check-task-contract.test.mjs`, 16 tests, entra en `pnpm check` por glob);
y el paso de CI que la invoca, que toca `.github/workflows/**` y por eso requiere
aprobación humana explícita — el agente no puede escribir ahí.

Este archivo es el único lugar donde queda todo lo que falta para cerrar T-0005. Nada de
esto se hizo todavía.

## 1. Diff propuesto para `.github/workflows/project-os-check.yml`

El archivo completo, ya con el diff aplicado, está en
`REVIEWS/T-0005/project-os-check.proposed.yml`. Dos cambios sobre el workflow actual:

```diff
       - name: Check out repository
         uses: actions/checkout@v7.0.1
         with:
           persist-credentials: false
+          fetch-depth: 0

       - name: Set up pnpm and Node.js
         uses: pnpm/setup@v2.0.0
         with:
           runtime: node@24
           require-lockfile: true
           install: true

       - name: Check Project OS
         run: pnpm check
+
+      - name: Check task contract against merge-base
+        env:
+          CHECK_BRANCH_NAME: ${{ github.head_ref }}
+          CHECK_BASE_REF: origin/${{ github.base_ref }}
+        run: node scripts/check-task-contract.mjs
```

`fetch-depth: 0` es obligatorio: `actions/checkout` clona shallow por defecto y sin esto
`git merge-base` no tiene con qué trabajar — las reglas (b) y (c) quedarían decorativas.
`CHECK_BRANCH_NAME` se cablea a `github.head_ref`, nunca a `github.ref_name` /
`GITHUB_REF_NAME`: en un evento `pull_request` ese valor es `refs/pull/N/merge`, no el
nombre de la rama. `permissions: contents: read` no cambia — el paso nuevo no necesita
más.

Aplicar:

```bash
cp REVIEWS/T-0005/project-os-check.proposed.yml .github/workflows/project-os-check.yml
git add .github/workflows/project-os-check.yml
git commit -m "ci: congelar el contrato de tarea contra el merge-base (T-0005)"
git push
```

## 2. Marcar el check como requerido en la protección de `main`

Sólo después de que el paso nuevo haya corrido al menos una vez en un PR real (paso 1
mergeado o un PR abierto que ya lo ejecute), para que GitHub conozca el nombre exacto del
check:

```bash
gh api repos/emidc/del-campo/branches/main/protection --jq '.required_status_checks.contexts'
# agregar "check" a la lista existente si no aparece ya (el job existente ya se llama "check";
# el paso nuevo vive dentro del mismo job, así que probablemente no haga falta nada acá —
# confirmarlo con el comando de arriba antes de tocar la protección)
```

Si el contexto `check` **no** está ya en la lista de checks requeridos:

```bash
gh api -X PUT repos/emidc/del-campo/branches/main/protection/required_status_checks \
  -f strict=true \
  -f 'contexts[]=check'
```

## 3. PRs de prueba de las comprobaciones humanas (`## Verification` de T-0005)

Correr en este orden, cada uno contra una rama descartable, y cerrar sin mergear una vez
observado el resultado:

```bash
# 3.1 — task/T-9999-inexistente: la tarea se crea en la propia rama, sin pasar por main.
#      Tiene que quedar en rojo por la regla (b).
git checkout -b task/T-9999-inexistente main
cat > TASKS/T-9999-inexistente.md <<'EOF'
---
id: T-9999
title: Tarea de prueba de la regla b
kind: CHORE
status: DRAFT
workstream: POS
riskClass: LOW
contextRefs: []
---

## Why

Existe solo para probar T-0005.

## Outcome

Nunca se mergea.

## Non-scope

- No es trabajo real.

## Verification

```bash
true
```
EOF
git add TASKS/T-9999-inexistente.md
git commit -m "prueba: T-9999 no existe en main"
git push -u origin task/T-9999-inexistente
gh pr create --title "[prueba T-0005] regla (b): tarea inexistente en merge-base" \
  --body "Descartable. Verifica T-0005 regla (b)." --base main

# 3.2 — modificar ## Verification de una tarea existente (por ejemplo T-0006, ya DONE):
#      tiene que quedar en rojo por la regla (c), y el PR se cierra sin integrar.
git checkout -b task/T-9998-prueba-regla-c main
# editar a mano la sección "## Verification" de un TASKS/T-000x-*.md existente
git add TASKS/
git commit -m "prueba: modifica Verification de una tarea existente"
git push -u origin task/T-9998-prueba-regla-c
gh pr create --title "[prueba T-0005] regla (c): Verification alterado" \
  --body "Descartable. Verifica T-0005 regla (c)." --base main

# 3.3 — mismo PR que 3.2 pero tocando solo ## Notes de la misma tarea: tiene que
#      pasar en verde. (Puede hacerse como commit adicional en la misma rama, revirtiendo
#      el cambio de Verification y dejando solo el de Notes, o como PR separado.)

# 3.4 — rama sin task id y sin prefijo exento: tiene que quedar en rojo por la regla (a)
#      con un mensaje que nombre R-29.
git checkout -b sin-prefijo-exento main
git commit --allow-empty -m "prueba: rama sin convención"
git push -u origin sin-prefijo-exento
gh pr create --title "[prueba T-0005] regla (a): rama sin task id ni prefijo exento" \
  --body "Descartable. Verifica T-0005 regla (a)." --base main

# 3.5 — rama docs/... sin tarea asociada: tiene que pasar en verde.
git checkout -b docs/prueba-t0005 main
git commit --allow-empty -m "prueba: rama docs/ sin tarea"
git push -u origin docs/prueba-t0005
gh pr create --title "[prueba T-0005] regla exenta: docs/" \
  --body "Descartable. Verifica que docs/ pasa sin tarea asociada." --base main
```

Para cada PR: mirar el resultado del check en la pestaña Checks, confirmar el veredicto
esperado, y cerrarlo sin mergear:

```bash
gh pr close <numero> --delete-branch
```

## 4. Confirmación de permisos (última comprobación humana de T-0005)

```bash
gh api repos/emidc/del-campo/actions/workflows/project-os-check.yml/runs --jq '.workflow_runs[0].id' \
  | xargs -I{} gh api repos/emidc/del-campo/actions/runs/{}/jobs --jq '.jobs[0].name'
```

Y verificar a ojo en la definición aplicada que el bloque `permissions:` del workflow
sigue siendo exactamente:

```yaml
permissions:
  contents: read
```

Sin `write` en ningún scope — el paso nuevo no necesita ninguno: no comenta, no pushea, no
crea checks vía API.
