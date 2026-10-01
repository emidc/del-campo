---
id: T-0022
title: Ofrecer en VS01 los enlaces de Drive de Zoho como nivel sin comprobar
kind: FEATURE
status: READY
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-10-01
blockedBy: []
contextRefs: [DOMAIN.md, decisions.yaml, SLICES/VS01.md, ENGINEERING_RULES.md,
              TASKS/T-0017-vinculacion-documental-vs01.md, docs/despliegue/vercel-vs01.md]
decisionRefs: [D-0034, D-0040, D-0053, D-0054, D-0057, D-0064]
---

## Why

VS01 está aceptado, pero en producción sólo 20 pólizas ofrecen su documento. Zoho ya
tiene enlaces de Drive para una parte de las pólizas y de los clientes. D-0064 decide
ofrecerlos como un nivel propio, «según Zoho, sin comprobar», para que VS01 sea útil en
el trabajo diario sin falsear la comprobación humana de D-0057.

## Outcome

Los enlaces del lote de Zoho llegan a VS01 como un nivel distinto del comprobado, según
D-0064:

- **Póliza:** «URL drive doc poliza» que apunta a un archivo de Drive se ofrece como
  documento de la póliza. Si apunta a una carpeta, se omite.
- **Cliente:** «Drive URL» de un Contacto o una Cuenta que apunta a una carpeta se ofrece
  como carpeta del cliente para sus pólizas. Si apunta a un archivo, se omite.
- **Precedencia:** un vínculo comprobado por una persona prevalece siempre; un pendiente
  registrado por una persona no se oculta. Comprobar un enlace de Zoho lo promueve a
  comprobado.
- **Foto del lote:** una carga reemplaza por completo los enlaces de Zoho de la carga
  anterior (agrega, cambia y quita) sin tocar los registros humanos, y es idempotente.
- **Pantalla:** «Abrir documento (según Zoho)» y «Abrir carpeta del cliente (según Zoho)»
  se distinguen a simple vista de los comprobados y llevan la aclaración «sin comprobar».
- **Operación:** un generador lee los módulos Pólizas, Contactos y Cuentas del lote en la
  máquina del owner y produce la carga sin imprimir URLs ni datos de clientes; informa
  conteos agregados por resultado (ofrecido, omitido por carpeta, omitido por archivo,
  sin póliza o cliente importado). El nivel se persiste en la base de forma explícita.
- **Producción:** la ficha de despliegue documenta cómo regenerar el nivel de Zoho en la
  base local y llevarlo a producción con el refresco existente (§10).

## Non-scope

- Sin API de Drive, sin comprobar existencia, apertura, tipo PDF ni permisos (D-0057,
  D-0064).
- Sin cambiar ni reinterpretar los 20 vínculos comprobados ni la aceptación de VS01.
- Sin editor de conciliación en la app ni flujo para promover enlaces desde la pantalla.
- Sin integrar Zoho en vivo: la fuente es el lote exportado.
- Sin usar «Drive Folder ID» ni «OldDrive Folder ID»; sólo «Drive URL» y «URL drive doc
  poliza».

## Verification

```bash
pnpm check
```

- [ ] Pruebas sintéticas cubren: archivo de póliza ofrecido, carpeta de póliza omitida,
      carpeta de cliente ofrecida, archivo de cliente omitido, URL vacía o inválida,
      póliza o cliente fuera del scope importado.
- [ ] Un vínculo comprobado por una persona prevalece sobre el de Zoho de la misma
      póliza, y un pendiente humano sigue visible.
- [ ] Recargar la misma foto no cambia nada; cargar una foto distinta agrega, cambia y
      quita sólo enlaces de Zoho.
- [ ] La pantalla nunca rotula un enlace de Zoho como comprobado ni una carpeta como
      documento, en página y en consulta de datos.
- [ ] El generador y la carga sólo imprimen conteos agregados; la evidencia de la corrida
      real, ejecutada por el owner, contiene sólo esos conteos (R-19).
- [ ] La ficha de despliegue documenta la regeneración y el refresco de producción.

## Data effects

Agrega una migración para persistir el nivel del vínculo. Escribe enlaces de Zoho en la
base local de T-0013 a partir del lote preservado; producción los recibe con el refresco
de la ficha §10, que ejecuta el owner. No escribe en Zoho ni en Drive. Los agentes de
desarrollo trabajan sólo con fixtures sintéticas; la corrida sobre el lote real la hace
el owner (R-19; D-0053 no se extiende).

## Notes

Conteos del lote del 16/09 sobre el export completo (D-0064): 590 pólizas con enlace a
archivo y 61 a carpeta; 264 Contactos y 83 Cuentas con carpeta. Los ofrecidos en VS01
serán menos, porque sólo cuentan las pólizas y clientes importados por T-0013.
El refresco de §10 copia `document_link`: si el nivel se guarda en otra tabla, esa tabla
se suma a la copia y al vaciado de producción, en el orden que exijan sus validaciones.
