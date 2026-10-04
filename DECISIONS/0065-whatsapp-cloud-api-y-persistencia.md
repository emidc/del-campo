# ADR-0065 — WhatsApp entra a Communication OS por Cloud API oficial, con copia del contenido

- **Id en `decisions.yaml`:** D-0065
- **Estado:** ACCEPTED
- **Fecha:** 2026-10-03
- **Supersede:** D-0028

## Contexto

Communication OS tiene que demostrar en Q4 la sincronización continua de mensajes de
texto en conversaciones 1:1 de WhatsApp (D-0063). T-0020 comparó los mecanismos posibles
y probó uno de punta a punta. La evidencia completa está en
`SPIKES/T-0020-integracion-whatsapp.md` y `ops/evidence/T-0020.md`. Los hechos que
restringen la elección son:

1. **Cloud API funciona para el caso.** La prueba de concepto recibió entrantes,
   registró salientes, no duplicó filas ante reintentos (sintético y real) y mantuvo el
   orden. Se hizo con el número de prueba de Meta; el owner aceptó esa desviación el
   2026-10-03.
2. **Cloud API no permite releer mensajes.** No hay endpoint de lectura: lo que no se
   guarda cuando llega el webhook se pierde. Es lo opuesto a Gmail, donde D-0010 puede
   indexar metadata y recuperar el cuerpo después.
3. **Los webhooks de estado no traen el texto del saliente.** Solo quien envía conoce
   el contenido.
4. **El equipo no va a escribir desde la app del teléfono** (respuesta del owner,
   2026-10-03). Eso elimina la única razón para la coexistencia, que además Meta solo
   habilita a Solution Partners o Tech Providers.
5. **La vía no oficial contradice las condiciones de uso de WhatsApp,** con riesgo de
   bloqueo temporal o permanente del número, y su identificador de participante (LID)
   no siempre se resuelve a un teléfono.
6. **El `wamid` contiene el teléfono del participante** codificado en base64, y desde
   abril de 2026 Meta envía además un BSUID (`user_id`). Si un usuario activa nombre de
   usuario, el teléfono puede no venir en el webhook.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, D-0065. Este ADR explica la evidencia.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Sesión de dispositivo vinculado con bibliotecas no oficiales (Baileys, whatsapp-web.js) | Contradice las condiciones de uso; el bloqueo del número puede ser permanente; exige un proceso always-on con sesión persistente; el LID no siempre se resuelve a teléfono. |
| Cloud API con coexistencia (app WhatsApp Business y API en el mismo número) | Su único beneficio es capturar lo escrito desde el teléfono, y el equipo no va a escribir desde ahí. Exige ser Tech Provider o contratar un BSP, abrir la app al menos cada 14 días y aceptar un throughput fijo de 20 mps. |
| Persistir solo metadata, como Gmail (D-0010) | No hay de dónde recuperar el contenido después: Cloud API no permite releer mensajes. |
| Persistir el saliente a partir de los webhooks de estado | Los estados no traen el texto. |
| Guardar el payload crudo para siempre | Duplica datos personales sin un uso que lo justifique; 30 días cubren los 7 de reintentos de Meta con margen para reprocesar. |

## Consecuencias

**Más fácil:**

- Un solo canal de entrada, oficial y documentado, con firma `X-Hub-Signature-256` y
  reintentos de Meta hasta 7 días.
- El receptor es request/response: no hace falta un proceso always-on. Para D-0014,
  Communication OS no aporta el requisito de sesión persistente ni el de IP estable;
  solo pide una URL HTTPS estable.
- Idempotencia simple: `wamid` único.

**Más difícil:**

- **Todo saliente sale de Communication OS.** Si alguien escribe desde la app del
  teléfono, ese número deja de estar en la API.
- **Communication OS guarda datos personales de clientes,** contenido incluido. La
  clasificación es más estricta que en Gmail, y es el candidato más probable para el
  criterio de extracción por clasificación de datos de D-0063.
- El participante tiene dos identificadores (`wa_id` y BSUID) y el modelo tiene que
  soportar que falte el teléfono.
- El número corporativo exige pasos que todavía no se hicieron: verificación del
  negocio, revisión del nombre visible, token de sistema y, para plantillas, método de
  pago (R-14).

**Costo de revertir:** pasar a coexistencia más adelante es posible, pero requiere
volver a dar de alta el número por Embedded Signup a través de un partner. Los datos ya
persistidos siguen sirviendo, porque el modelo no cambia.

## Supuestos que conviene vigilar

La decisión es ACCEPTED: cambiarla exige un ADR nuevo que la reemplace. Se apoya en
supuestos que, si dejan de cumplirse, justifican ese ADR:

- **Costo.** El owner decidió no enviar mensajes fuera de la ventana de servicio, y la
  documentación oficial de Meta consultada el 2026-10-02 dice que los mensajes sin
  plantilla dentro de la ventana son gratis. Hay publicaciones de terceros que anuncian
  su cobro desde el 2026-10-01; si se confirma en la facturación, este supuesto cae.
- **Uso del teléfono.** El equipo no escribe desde la app. Si eso cambia, la alternativa
  es la coexistencia.
- **Número corporativo.** Su alta en Cloud API todavía no se hizo y exige verificación
  del negocio.
- **Aceptación de CO01.** Si muestra pérdidas o duplicados que la Cloud API no permita
  corregir, el mecanismo se revisa.
