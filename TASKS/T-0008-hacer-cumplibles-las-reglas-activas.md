---
id: T-0008
title: Hacer cumplibles las reglas ACTIVAS que el repositorio viola
kind: CHORE
status: DONE
workstream: POS
riskClass: MEDIUM
size: S
created: 2026-09-08
closed: 2026-09-20
blockedBy: []
contextRefs: [ENGINEERING_RULES.md, .claude/settings.json, decisions.yaml, DECISIONS/0000-template.md]
decisionRefs: [D-0016, D-0042, D-0043, D-0044]
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
- `decisions.yaml` contiene una nueva decisión «¿un segundo proveedor mejora la calidad
  de la revisión?», con identificador asignado al ejecutar T-0008, `status: OPEN` y su
  `unblocked_by`, para que la pregunta no se resuelva sola el día que alguien tenga
  ganas de probar otro proveedor. `D-0016` queda intacta.

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

- [x] El ADR de `yaml` existe, declara su id de `decisions.yaml`, y la entrada
      correspondiente lo referencia con `adr:`; `pnpm check` valida ambas direcciones.
- [x] Un intento de `sed -i` sobre `.claude/settings.json` desde una sesión de agente es
      rechazado por el hook, y la salida queda guardada como evidencia.
- [x] Un intento equivalente sobre `.github/workflows/` también es rechazado.
- [x] Un `sed -i` sobre un archivo cualquiera de `TASKS/` sigue funcionando: el hook no
      bloquea de más.
- [x] La nueva decisión sobre un segundo proveedor existe con un identificador asignado
      al ejecutar T-0008, `status: OPEN` y un `unblocked_by` que nombra trabajo real.

## Data effects

Modifica `.claude/settings.json` y agrega un hook. No toca datos. Reversible revirtiendo
el PR; el cambio está bajo revisión humana obligatoria por R-13 y R-15.

## Notes

Q-3 respondida: R-05 conserva los siete disparadores. La consecuencia a tener presente es
que T-0010 introduce varias dependencias de una vez y cada una dispara la regla.

Q-4 resuelta por defecto, y revisable: el `unblocked_by` de la nueva decisión sobre un
segundo proveedor describe el experimento pareado en texto, como ya hacen `D-0023` y
`D-0028`, en vez de nombrar una tarea que nadie va a ejecutar todavía. Crear un id de
tarea para trabajo no agendado produce una cola con ítems fantasma.

El identificador de esa decisión se asigna al ejecutar T-0008, verificando que esté
libre. `D-0031` ya corresponde al baseline de migración aprobado en T-0004 y se conserva
sin cambios; esta tarea no reserva otro identificador por adelantado.

**Permisos.** Toca `.claude/`: R-13 y R-15, aprobación humana obligatoria, y el agente
tiene la escritura denegada. El agente propone el diff y la prueba negativa; el humano
aplica.


## Evidence

Ejecución iniciada el 2026-09-20. D-0042 regulariza la dependencia yaml existente;
D-0043 registra la pregunta sobre un segundo proveedor; D-0044 documenta la propuesta
prospectiva de control Bash. D-0016, R-05 y los deny rules existentes no se modifican.
El owner eligió explícitamente revisión humana para comandos indirectos.

Propuesta, límites y aplicación: `REVIEWS/T-0008-control-bash.md`.
Patch aplicado: `REVIEWS/T-0008/protected-paths.patch`.
Las pruebas `scripts/tests/protect-paths.test.mjs` se ejecutan desde `pnpm check`,
incluido el CI existente, sin editar el workflow ni habilitar reglas LATENTES.

Tras el pedido del owner de terminar T-0008, se aplicó el patch mediante la operación
con aprobación requerida y se probó en una sesión real de Claude Code. Los dos intentos
protegidos fueron rechazados por PreToolUse; el sed sintético sobre TASKS ejecutó; el
comando opaco recibió ask y no ejecutó sin confirmación. No se cambiaron los deny rules
ni los hooks de AgentRun existentes. Evidencia literal: `ops/evidence/T-0008.md`.

## Closure

Cierre: **2026-09-20** (Mendoza; prueba registrada el 2026-09-21 UTC). El owner pidió
terminar la tarea tras integrar T-0006 y eligió revisión humana para comandos indirectos.
Las cinco comprobaciones se verificaron por el agente al completar ese pedido: ADR y
pregunta pendiente mediante checker/lectura, y las tres pruebas de sed mediante ejecución
real en Claude Code. No se atribuye al owner haber ejecutado personalmente esas pruebas.

Se resolvió el conflicto de package.json conservando ambas suites y sumando SLICES:
`node --test scripts/tests/*.test.mjs`. La fixture de SLICES ahora incluye ops/evidence
para respetar R-09b; el cambio a tests existentes queda señalado para revisión del PR
según R-13. El workflow permanece intacto.

El run de aceptación es `r_9d9b8778bcb64bbaa5dd`, capturado por el hook existente. No se
reconstruyen los AgentRuns faltantes de otras tareas: el hallazgo de T-0006 permanece
histórico. Los límites del control y lo no verificado están declarados en la evidencia.
El cierre no hace commit, push, PR ni merge y no inicia T-0010.
