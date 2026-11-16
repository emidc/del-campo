# Procedencia de fixtures de Communication

## Aportación del owner del 2026-10-13

- `send-accepted.real-redacted.json`: sección Response de una respuesta exitosa
  aportada desde Graph API Explorer, versión v26.0 indicada en el request. La copia
  recibida ya contenía máscaras parciales; se reemplazaron íntegramente input, wa_id
  y wamid. No se almacenaron request, query, debug URL ni datos de cuenta/token.
- `inbound-owner-20261013.redacted.json`: forma del webhook de texto aportado.
- `status-owner-20261013.redacted.json`: forma del webhook read aportado.

Los webhooks y el request de envío muestran distintos phone_number_id de origen.
El owner confirmó que ambos webhooks provienen del número de prueba de Meta; no se
atribuyen al número dedicado ni al ensayo de CO01. El webhook dedicado se documenta por separado abajo. Tampoco se vincula el
estado con el envío: son ejemplos separados, con IDs sintéticos diferentes.

Redacción manual antes de escribir archivos: reemplazo completo de identificadores,
nombre, texto, timestamps y datos opacos de internal_1p_only_data. Se conservan claves,
arrays y valores estructurales de tipo, estado, país, categoría y facturación. No se
copió un identificador real parcialmente oculto ni la carga original al repositorio.
Los IDs sintéticos repetidos mantienen relaciones dentro de los webhooks.

Revisión humana de las cuatro copias finales confirmada por el owner el 2026-10-13
al seleccionar la primera opción de la consulta de revisión. Son fixtures para pruebas
locales; no autorizan llamadas a Meta ni prueban el deployment o la aceptación integral.

## Fixtures anteriores

`real-inbound.redacted.json` y `real-status.redacted.json` provienen del spike T-0020,
como documenta whatsapp.contract.test.ts. Los send-error-*.documented.json siguen
siendo formas documentadas, no errores reales capturados. El fixture documentado de
éxito se conserva como antecedente; el test de éxito ahora consume la respuesta real
redactada aportada por el owner.


## Webhook del número dedicado aportado posteriormente

`inbound-dedicated.redacted.json` conserva la forma del ejemplo que el owner aportó
en respuesta a la solicitud de la entrega 13. El owner indicó que había cambiado
manualmente sus datos. No se conserva ni se atribuye autenticidad a esos valores.
Se reemplazaron completamente todos los identificadores, nombre, texto y timestamp
antes de escribir la copia en el repositorio.

En el ejemplo recibido, contacts.wa_id y messages.from no coinciden, ni coinciden
contacts.user_id y messages.from_user_id. Se conserva esa desigualdad en los valores
sintéticos, sin inventar una correspondencia que la copia aportada no demuestra.
Por eso el test espera texto y remitente persistidos, pero profileName null. No se
atribuye esa desigualdad al webhook original: puede resultar de la edición manual.
Esta captura acredita la estructura aportada, no una reproducción byte a byte de
la entrega original ni la asociación de perfil de esa entrega.

Revisión humana de la copia final saneada confirmada por el owner el 2026-10-13.
