# ADR-0088 — Las cuentas de Claude y de ChatGPT/Codex del owner quedan registradas para información de nivel 2

- **Id en `decisions.yaml`:** D-0088
- **Estado:** ACCEPTED
- **Fecha:** 2026-11-10
- **Supersede:** en parte D-0074 (el registro nombraba cada modelo, no la familia).
- **Aprobación:** el owner, el 2026-11-10, en el hilo «Ejecutar los próximos pasos del plan»,
  con el merge de este cambio.

## Contexto

D-0074 permite enviar información confidencial de clientes (nivel 2) a una interfaz de IA
sólo por cuentas registradas antes en `decisions.yaml`. Al 2026-11-02 no había ninguna. El
plan 12 lo pide como IA-01, y de eso dependen RO-04a, IA-02, C9-01 y C13-00.

El 2026-11-10 el owner informó sus tres cuentas, dijo que en las tres el entrenamiento está
apagado, que no quiere restringir modelos y que el nivel 2 vale sólo para Claude y Codex.

## Decisión

| Cuenta | Proveedor y plan | Entrenamiento | Modelos | Nivel 2 |
|---|---|---|---|---|
| Cuenta personal de Emiliano | Anthropic, Claude Pro | Apagado (declarado por el owner) | Todos los del plan | **Registrada** |
| Cuenta personal de Emiliano | OpenAI, ChatGPT Plus (incluye Codex) | Apagado (declarado por el owner) | Todos los del plan | **Registrada** |
| Cuenta de Workspace de Del Campo | Google, Gemini en Workspace (Work Pro) | Apagado (declarado por el owner) | — | No registrada: sólo nivel 1 |

- Las usa sólo Emiliano. Otra persona necesita su propio registro.
- El registro no guarda direcciones de correo: identifica la cuenta por su dueño y su tipo.
- El nivel 3 (datos personales innecesarios, salud, datos bancarios, secretos y
  credenciales) sigue excluido en todas.
- No cambia R-19. Claude Code y Codex, como agentes de desarrollo del repositorio, siguen sin
  recibir PII real de clientes ni credenciales (D-0082).

**Por qué se reemplaza en parte D-0074.** D-0074 pedía nombrar el modelo y no la familia,
igual que D-0070, para saber exactamente qué procesó la información. El owner prefiere no
restringir modelos: los planes cambian de modelos con frecuencia, y un registro por modelo
quedaría viejo con cada lanzamiento. Lo que protege la información es la cuenta (quién la
controla y si entrena), no el modelo. D-0070 no cambia: su pareja de proveedor y modelo
sigue rigiendo la preparación de datasets de Risk OS.

## Pendiente de verificación

- La retención y la región de cada plan no se verificaron contra las condiciones vigentes
  del proveedor. Lo que consta es lo que declaró el owner sobre el entrenamiento.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Registrar con un modelo nombrado, como pide D-0074 | El owner no quiere restringir modelos; el registro envejecería con cada lanzamiento |
| Registrar también Gemini para el nivel 2 | El owner sólo lo permite con Claude y Codex |
| Registrar las direcciones de correo | No hacen falta para identificar la cuenta y son datos personales en el repositorio |

## Consecuencias

**Más fácil:** el owner puede trabajar con información de nivel 2 en Claude y en
ChatGPT/Codex desde el merge. Se desbloquean RO-04a, IA-02, C9-01 y C13-00 en lo que
dependía de IA-01.

**Más difícil:** no queda registro de qué modelo procesó cada información. Si un caso lo
exige, se anota en la evidencia de ese caso.

## Criterio de falsación

Se revisa si en una de las cuentas registradas se vuelve a activar el entrenamiento,
cambia el plan o el proveedor cambia sus condiciones de tratamiento de datos; si aparece
información de nivel 2 en Gemini o en otra cuenta no registrada; o si otra persona empieza
a usar estas cuentas.
