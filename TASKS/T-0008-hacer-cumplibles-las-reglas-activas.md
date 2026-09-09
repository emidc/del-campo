---
id: T-0008
title: Hacer cumplibles las reglas ACTIVAS que el repositorio viola
kind: CHORE
status: READY
workstream: POS
riskClass: MEDIUM
size: S
created: 2026-09-08
blockedBy: []
contextRefs: [ENGINEERING_RULES.md, .claude/settings.json, decisions.yaml, DECISIONS/0000-template.md]
decisionRefs: [D-0016]
---

## Why

R-05 exige ADR para toda dependencia nueva y la dependencia `yaml` entró con lockfile y
sin ADR, en el mismo ciclo en que se escribió la regla. R-15 dice que un agente no puede
editar sus propios guardrails, y los deny rules cubren `Edit` y `Write` sobre
`.claude/**` y `.github/workflows/**` pero no la vía `Bash(sed -i …)`.

Una regla ACTIVA que el repositorio viola le enseña al agente que el corpus de reglas es
aspiracional. En un arnés de gobernanza esa erosión no falla ruidosamente: degrada. La
salida elegida es cumplir la regla, no acomodarla.

## Outcome

Cero reglas marcadas ACTIVA violadas por el estado del repositorio. Concretamente:

- **R-05 conserva sus siete disparadores, sin cambios.** La dependencia `yaml` queda
  regularizada con un ADR en `DECISIONS/` y su entrada en `decisions.yaml` apuntándolo
  con `adr:`, de modo que el checker valida la relación en las dos direcciones. El ADR
  dice por qué se eligió un parser YAML estándar en lugar de parsear a mano, y qué
  costaría revertirlo.
- Un hook `PreToolUse` bloquea las escrituras por `Bash` a `.claude/**` y
  `.github/workflows/**`, con una prueba negativa que lo demuestra.
- `decisions.yaml` contiene `D-0031 · ¿un segundo proveedor mejora la calidad de la
  revisión?` con `status: OPEN` y su `unblocked_by`, para que la pregunta no se resuelva
  sola el día que alguien tenga ganas de probar otro proveedor. `D-0016` queda intacta.

## Non-scope

- No se reducen ni se amplían los disparadores de R-05: la regla queda exactamente como
  está y el repositorio se ajusta a ella.
- No se activa ninguna regla LATENTE.
- No se agrega ningún execution provider, ni se ejecuta el experimento pareado.
- No se amplían los deny rules a rutas nuevas fuera de las dos ya protegidas.
- No se escriben ADR retroactivos para nada que no sea la dependencia `yaml`.

## Verification

```bash
pnpm check
```

Comprobaciones humanas:

- [ ] El ADR de `yaml` existe, declara su id de `decisions.yaml`, y la entrada
      correspondiente lo referencia con `adr:`; `pnpm check` valida ambas direcciones.
- [ ] Un intento de `sed -i` sobre `.claude/settings.json` desde una sesión de agente es
      rechazado por el hook, y la salida queda guardada como evidencia.
- [ ] Un intento equivalente sobre `.github/workflows/` también es rechazado.
- [ ] Un `sed -i` sobre un archivo cualquiera de `TASKS/` sigue funcionando: el hook no
      bloquea de más.
- [ ] `D-0031` existe con `status: OPEN` y un `unblocked_by` que nombra trabajo real.

## Data effects

Modifica `.claude/settings.json` y agrega un hook. No toca datos. Reversible revirtiendo
el PR; el cambio está bajo revisión humana obligatoria por R-13 y R-15.

## Notes

Q-3 respondida: R-05 conserva los siete disparadores. La consecuencia a tener presente es
que T-0010 introduce varias dependencias de una vez y cada una dispara la regla.

Q-4 resuelta por defecto, y revisable: el `unblocked_by` de `D-0031` describe el
experimento pareado en texto, como ya hacen `D-0023` y `D-0028`, en vez de nombrar una
tarea que nadie va a ejecutar todavía. Crear un id de tarea para trabajo no agendado
produce una cola con ítems fantasma.

**Permisos.** Toca `.claude/`: R-13 y R-15, aprobación humana obligatoria, y el agente
tiene la escritura denegada. El agente propone el diff y la prueba negativa; el humano
aplica.
