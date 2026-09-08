---
id: T-0003
title: Activar CI mínimo y proteger main
kind: CHORE
status: DONE
workstream: POS
riskClass: MEDIUM
size: S
created: 2026-09-08
blockedBy: []
contextRefs: [ENGINEERING_RULES.md, PROJECT.md]
decisionRefs: [D-0015, D-0017]
---

## Why

Project OS declara que los checks de CI son autoritativos y que `main` está protegida,
pero el repositorio remoto recién creado todavía no hace cumplir ninguna de las dos
reglas. Sin este bootstrap, un PR no puede demostrar que su verificación pasó y un
push directo puede eludir el proceso que T-0001 debe recorrer de punta a punta.

## Outcome

Cada pull request hacia `main` ejecuta `pnpm check` en GitHub Actions sobre una
instalación reproducible desde `pnpm-lock.yaml`. Un cambio documental inválido produce
un check rojo y su corrección produce un check verde en el mismo PR.

La rama `main` exige pull request y el check requerido de Project OS antes del merge.
Los force-pushes y la eliminación de la rama están deshabilitados. La configuración
puede inspeccionarse mediante la API de GitHub, sin depender de una afirmación manual.

## Non-scope

- No se cierra, integra ni cambia el estado de T-0001.
- No se agrega lint, cobertura, tests de aplicación, build ni despliegue.
- No se modifica `.claude/` ni ningún hook.
- No se agrega ninguna dependencia.
- No se crea código de Broker OS.
- No se automatizan merges ni commits desde CI.

## Verification

```bash
# El repositorio sigue siendo válido localmente.
pnpm check
git diff --check

# El workflow existe y GitHub reconoce sus ejecuciones.
gh workflow view "Project OS check" --repo emidc/del-campo
gh run list --workflow "Project OS check" --repo emidc/del-campo --limit 10

# La protección de main es inspeccionable por API.
gh api repos/emidc/del-campo/branches/main/protection
```

Comprobaciones humanas:

- [x] Un PR de prueba con un error documental deliberado muestra el check requerido
      en rojo y no puede integrarse en ese estado.
- [x] Corregir el error en el mismo PR vuelve verde el mismo check.
- [x] La protección de `main` exige PR y check verde, y prohíbe force-push y borrado.
- [x] El workflow no recibe permisos de escritura que no necesita.

## Data effects

Crea un workflow versionado en GitHub Actions y cambia la configuración remota de
protección de `main`. No toca producción ni datos de clientes. Es reversible mediante
un PR que retire el workflow y una modificación explícita de la protección de rama;
ambas operaciones requieren aprobación humana.

## Risks

- El check no puede marcarse como requerido hasta que GitHub conozca su nombre por una
  primera ejecución. El bootstrap debe respetar ese orden y verificarlo después.
- Una prueba negativa mal diseñada podría llegar a `main`. El fallo deliberado vive
  sólo en una rama de prueba y nunca se integra.

## Evidence

- PR de bootstrap y prueba: <https://github.com/emidc/del-campo/pull/1>
- Ejecución negativa `34245754018`: el commit `a3fe3ae` fue rechazado por el estado
  deliberadamente inválido `INVALID_FOR_CI_TEST`, y el PR quedó bloqueado.
- Ejecución de recuperación `34245878376`: el commit `23e80c8` restauró el estado
  válido mediante una reversión y el mismo check `check` volvió a verde.
- Commit de merge: `f2d19bca128532c43ef0144a222ccb1059f1ad4d`.
- Protección inspeccionada por API el 2026-09-08: PR requerido, check `check`
  requerido en modo estricto, reglas aplicadas a administradores, force-push y
  eliminación de `main` deshabilitados.
- El workflow declara únicamente `permissions: contents: read` y deshabilita la
  persistencia de credenciales en checkout.
