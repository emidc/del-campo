# Manifiesto de un lote de Zoho (`lote.json`)

**T-0037, incremento I1a.** Desde este incremento, qué es un lote lo declara un archivo
`lote.json` en la raíz de la carpeta del lote, no el código. Importar un export nuevo no
exige editar nada en el repositorio: se prepara la carpeta, se escribe su `lote.json` y
se corre el importador con la ruta del lote. Diseño en `T-0037-refresco.md` §2 (H2 y H5).

## Formato

```json
{
  "formato": "lote-zoho/1",
  "perfil": "profile/profile-AAAAMMDDTHHMMSS…Z.json",
  "modulos": {
    "polizas":   { "csv": "raw/<id>/0001.csv", "exportadoEl": "AAAA-MM-DD" },
    "endosos":   { "csv": "raw/<id>/0001.csv", "exportadoEl": "AAAA-MM-DD" },
    "contactos": { "csv": "raw/<id>/0001.csv", "exportadoEl": "AAAA-MM-DD" },
    "cuentas":   { "csv": "raw/<id>/0001.csv", "exportadoEl": "AAAA-MM-DD" }
  }
}
```

- `perfil` es el perfil de T-0004 del export: el JSON con el SHA-256 de cada ZIP y de
  cada CSV. Es la identidad del lote: dos cargas con el mismo perfil son el mismo lote.
- `csv` es la ruta del CSV del módulo, exactamente como figura en `raw_relative_path` del
  perfil. Un CSV que el perfil no verifica se rechaza.
- `exportadoEl` es la fecha en que **ese módulo** se exportó de Zoho. Los módulos pueden
  tener fechas distintas (T-0013 lo registró en el lote del 16/09). La fecha de corte del
  lote, que I3b mostrará en la cabecera, será la más antigua de las cuatro.
- Las rutas son relativas a la carpeta del lote y no pueden salir de ella.
- Faltan módulos, sobran claves o una fecha no existe: el importador se detiene y dice
  qué campo está mal. No completa nada por su cuenta.

## El lote del 16/09/2026

Es el `lote.json` que reemplaza a las constantes que vivían en
`packages/db/src/import/lote.ts`. Los cuatro CSV son los mismos; las fechas de export
**las completa el owner** (DAT-01). Si un módulo se exportó el 16/09, va `2026-09-16`.

```json
{
  "formato": "lote-zoho/1",
  "perfil": "profile/profile-20260918T212140075873Z.json",
  "modulos": {
    "polizas":   { "csv": "raw/025738fc637310e0d368afd49868375c1cce73c263cadf9821055d59dd47bc80/0001.csv", "exportadoEl": "AAAA-MM-DD" },
    "endosos":   { "csv": "raw/8ca87d205690ef89676c3a21d365d507335fcfe52ccd78206efeba28d971ca2c/0001.csv", "exportadoEl": "AAAA-MM-DD" },
    "contactos": { "csv": "raw/fef574c156c24cd58a242fe77322b69386977b3c59522969397941732dae5501/0001.csv", "exportadoEl": "AAAA-MM-DD" },
    "cuentas":   { "csv": "raw/e2c4246d5b98ca59ecc01dac6375f73212a0c308d00b8c7c8e5920054993011e/0001.csv", "exportadoEl": "AAAA-MM-DD" }
  }
}
```

Se guarda como `data/zoho-export-2026-09-16/lote.json`, en la máquina del owner y fuera
de Git como el resto del lote (D-0053). No contiene datos de clientes.

## Comandos

Todos reciben la carpeta del lote. Corren contra la base local de T-0013 (D-0053).

```bash
L=data/zoho-export-AAAA-MM-DD
node packages/db/src/import/cli.ts verify-manifest $L   # hashes de ZIP y CSV contra el perfil
node packages/db/src/import/cli.ts load-staging    $L   # staging del lote, en una transacción
node packages/db/src/import/cli.ts load-catalog
node packages/db/src/import/cli.ts load-parties    $L
node packages/db/src/import/cli.ts load-policies   $L
node packages/db/src/import/cli.ts report          $L
node packages/db/src/zoho-links/cli.ts load        $L   # también lee el lote.json
```

`load-staging` vuelve a calcular el SHA-256 de los cuatro CSV antes de leerlos. Si el
mismo export ya estaba cargado, reutiliza su lote (`mismo lote, recargado`) y deja las
mismas filas; si el `lote.json` declara otra fecha o otro CSV para un lote ya cargado, se
detiene: un manifiesto corregido es otro manifiesto, y no se reescribe en silencio lo que
el lote decía.

## Qué cambió en staging

- Cada tabla de staging guarda el crudo por `(lote, ID de registro)`. Un lote nuevo
  convive con los anteriores; el último no borra al anterior (migración
  `0012_staging_por_lote.sql`).
- `staging_import_batch_module` registra, por lote y módulo, el CSV, su SHA-256, la fecha
  de export y las filas cargadas.
- `load-parties`, `load-policies` y `report` leen sólo el lote indicado.

## Lo que este incremento no hace

- No compara lotes ni clasifica registros en nuevos, iguales, cambiados o ausentes (I1b).
- No cambia qué se escribe en el dominio: el dominio sigue insertando sin actualizar (H1,
  I2).
- No cambia la cabecera de VS01, que sigue mostrando la fecha de importación (H4, I3b).
- Las excepciones de clasificación (`staging_import_exception`) siguen identificándose por
  módulo, registro y clase, sin lote: un lote nuevo no agrega una fila por una excepción
  ya conocida. `report` cuenta las de los registros del lote indicado.
- El lote cargado antes de este cambio queda en staging con su `batch_id` y sin módulos
  registrados. Volver a cargar el 16/09 con su `lote.json` crea un lote nuevo con el mismo
  crudo; el anterior no se borra (R-23).
