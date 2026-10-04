---
id: T-0024
title: Crear el contexto communication con su esquema y la recepción de webhooks de WhatsApp
kind: FEATURE
status: DONE
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-10-03
blockedBy: []
contextRefs: [SLICES/CO01.md, DECISIONS/0063-aislamiento-por-contexto-q4.md,
              DECISIONS/0065-whatsapp-cloud-api-y-persistencia.md,
              SPIKES/T-0020-integracion-whatsapp.md, SPIKES/T-0020/README.md,
              ENGINEERING_RULES.md]
decisionRefs: [D-0012, D-0013, D-0063, D-0065]
---

## Why

`SLICES/CO01.md` necesita, antes que la UI y el despliegue, que Communication OS reciba
y guarde los mensajes de WhatsApp tal como fija D-0065. El spike T-0020 probó el
mecanismo con código descartable fuera del workspace. Esta tarea crea el primer código
real del contexto `communication` (D-0063): su esquema, sus migraciones y la recepción
de webhooks. Habilita la tarea de la UI y la del despliegue de CO01.

## Outcome

- **`contexts/communication` es un paquete del workspace**, con dominio, persistencia y
  aplicación propios. `pnpm lint` falla si ese paquete importa algo de `packages/*`,
  `apps/*` u otro contexto, o si Broker importa algo de él (R-25, D-0063).
- **El contexto tiene su esquema y sus migraciones**, con reversa, y un runner propio
  que las aplica sobre `delcampo_communication_dev` y `delcampo_communication_test`. El
  esquema guarda lo que fija D-0065:
  - mensajes con `wamid` único, dirección, `phone_number_id`, `wa_id` y BSUID del
    participante (puede faltar cualquiera de los dos, pero no ambos), texto, timestamp
    de WhatsApp y de recepción;
  - el último estado de cada saliente;
  - cada entrega de webhook cruda, con su hora de recepción, el resultado de la firma y
    el de su procesamiento;
  - los mensajes de tipos fuera de alcance, registrados como recibidos.
- **La recepción es un handler independiente del framework:**
  - `GET` responde el desafío de verificación;
  - `POST` valida `X-Hub-Signature-256` en tiempo constante y rechaza con 401 si la
    firma falta o no coincide (no hay modo sin firma fuera de los tests);
  - guarda la entrega cruda antes de responder 200 y procesa después;
  - persiste cada mensaje de texto una sola vez por `wamid`.
- **Los estados no asumen orden ni secuencia completa.** Un estado más antiguo que
  llega tarde no pisa a uno más avanzado (`read` no vuelve a `delivered`), y `failed`
  queda registrado con su error. Un estado de un `wamid` que el contexto no envió (por
  ejemplo, una plantilla mandada desde el panel de Meta) se registra, sin crear un
  mensaje sin cuerpo.
- **Existe la operación de persistencia del saliente** que usará la UI: guarda texto,
  destinatario y el `wamid` devuelto por la API. Esta tarea no llama a la API.
- **Existe la operación de retención:** borra las entregas crudas de más de 30 días sin
  tocar los mensajes. Esta tarea no la programa.
- **Hay tests en las tres capas que rigen (R-26):**
  - unit: parseo, firma y regla de estados;
  - integración contra el Postgres local: idempotencia ante el mismo payload dos veces,
    orden por timestamp, estados fuera de orden y retención;
  - contrato: los payloads reales redactados de `SPIKES/T-0020/fixtures/` (R-27),
    copiados al contexto.

  `pnpm test` los incluye, y la guarda de bases de `scripts/guard-db-tests.mjs` se
  aplica a la base del contexto.
- **`contexts/communication/README.md`** explica cómo crear las bases, aplicar y
  revertir migraciones y correr los tests.

## Non-scope

- UI, credencial compartida (D-0066) y llamadas a la API de Meta para enviar. Son de la
  tarea siguiente de CO01.
- Despliegue, proyecto de Vercel, base hosteada, URL pública y tarea programada de
  retención.
- Credenciales reales de Meta, el número dedicado o cualquier mensaje real. Solo
  fixtures sintéticos o redactados (R-16, R-19).
- Integración con Broker OS: ni referencias a `Party`, ni lectura de su esquema, ni
  reutilizar `packages/db` (D-0063).
- Grupos, adjuntos, audio y reacciones (solo se registran como tipos fuera de alcance).
- Cambios en `packages/*`, `apps/*` o `DOMAIN.md`, salvo lo mínimo de configuración del
  workspace, del lint y del script de tests para incluir `contexts/*`.
- Borrar o modificar `SPIKES/T-0020/`.

## Verification

```bash
pnpm check
createdb delcampo_communication_test
COMMUNICATION_DATABASE_URL=postgres://localhost:5432/delcampo_communication_test pnpm test
```

Comprobaciones humanas, registradas en `ops/evidence/T-0024.md`:

- [ ] Un import de prueba desde `contexts/communication` hacia `packages/db`, y otro
      desde `apps/web` hacia `contexts/communication`, hacen fallar `pnpm lint`; se
      registra la salida y se revierten.
- [ ] Aplicar todas las migraciones del contexto, revertirlas y volver a aplicarlas
      funciona sobre `delcampo_communication_test`.
- [ ] El mismo payload enviado dos veces deja una sola fila de mensaje y dos entregas.
- [ ] Un `POST` sin firma o con firma inválida devuelve 401 y no persiste nada.
- [ ] Un `read` seguido de un `delivered` tardío deja el saliente en `read`.
- [ ] Los fixtures del contexto no contienen teléfonos, nombres, textos ni `wamid`
      reales.
- [ ] Revisión ciega por subagente aislado (R-33), registrada en
      `REVIEWS/T-0024-*.md`.

## Data effects

- **Bases de datos:** solo `delcampo_communication_dev` y `delcampo_communication_test`,
  locales. Se revierte con `dropdb`.
- **Sistemas externos:** ninguno.

## Risks

- **Duplicación del runner de migraciones.** `packages/db` ya tiene uno, pero D-0063
  prohíbe importarlo desde otro contexto y no crea un núcleo compartido en Q4. Se
  acepta un runner mínimo propio; extraerlo es una decisión del cierre de Q4 (R-01).
- **Sobremodelar.** El esquema guarda solo lo que fija D-0065 y lo que usan la UI y la
  aceptación de CO01. Nada de conversaciones como entidad si alcanza con agrupar por
  participante.

## Notes

Se puede empezar en paralelo con T-0021: es FEATURE, no spike (PROJECT.md §5). No
necesita el número dedicado, el token de sistema ni la credencial de la UI.
