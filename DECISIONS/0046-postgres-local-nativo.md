# ADR-0046 — Postgres local nativo, CI en contenedor

- **Id en `decisions.yaml`:** D-0046
- **Fecha:** 2026-09-20
- **Supersede:** —

## Contexto

Los tests de integración de R-26 corren contra un Postgres real, no contra un doble. Eso
obliga a que haya un Postgres disponible en dos lugares con propósitos distintos: la
máquina de desarrollo, donde se paga latencia cien veces por día, y CI, donde se paga
reproducibilidad una vez por PR.

Postgres es un proceso, no un stack: no necesita orquestación para correr en una máquina
de desarrollo. `D-0013` además mantiene Auth, Storage, Realtime y Queues de Supabase como
decisiones separadas, de modo que el stack local de Supabase traería local productos que
el programa todavía no adoptó.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo D-0046.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Docker Compose local | Paridad con CI a cambio de latencia en cada ciclo y de una dependencia de runtime de contenedores que hoy no hace falta para nada más. Queda disponible si la deriva aparece. |
| Stack local de Supabase | Trae local los productos que `D-0013` dejó explícitamente como decisiones separadas, y los normaliza por la puerta de atrás. |
| Postgres nativo también en CI | El runner tendría que instalar y arrancar Postgres en cada corrida; el servicio de contenedor ya resuelve eso y arranca desde cero por definición. |
| Una base compartida de desarrollo | Los tests destructivos de T-0012 dejan de ser aislados y el reseteo pasa a ser un evento coordinado. |

## Consecuencias

**Más fácil.** El ciclo local es un proceso que ya está corriendo. `pnpm db:create` y
`pnpm db:reset` son dos comandos sin capas intermedias. CI arranca de cero sin depender
del estado de ninguna máquina.

**Más difícil.** Hay dos formas de tener Postgres y pueden derivar. La mitigación no es
esperar que no pase: es fijar la versión mayor en `.postgres-version`, validarla en
`pnpm db:version` antes de tocar la base, y aceptar por R-17 que el veredicto lo da CI.
La instalación en una máquina limpia es un procedimiento manual documentado en
`docs/desarrollo/postgres-local.md`, no un `docker compose up`.

El servicio de Postgres en CI lo declara T-0012, que es la primera tarea con tests de
integración. Tocar `.github/workflows/` requiere aprobación humana por R-13: el agente
propone ese diff, no lo aplica.

**Costo de revertir:** agregar un `compose.yaml` y cambiar el `DATABASE_URL` del `.env`.
Bajo, y no crece con el tiempo. Es la razón por la que esta decisión puede ser
`PROVISIONAL` sin costo.

## Criterio de falsación

Un fallo de CI por deriva de versión o de configuración que la máquina local no
reproduzca —y que un contenedor local habría atrapado—, o que el setup manual termine
costando, sumado entre las máquinas del equipo, más que instalar y mantener Docker.
