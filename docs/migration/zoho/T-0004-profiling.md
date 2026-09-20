# T-0004 — Profiling técnico de Zoho

Workstream: MIG. **Snapshot histórico/intermedio del 17/09/2026**, supersedido por
`REVIEWS/T-0004-insumos-vs01.md`. El contenido restante se conserva como evidencia
histórica y no describe el estado vigente de T-0004.

## Hechos observados

Observación: 2026-09-17T20:34:59.144996+00:00. Universo: los 16 ZIP disponibles localmente en el lote 2026-09-16; no se afirma que comprendan todo Zoho.

Se procesaron 16 CSV, 52.157 registros de datos (sin headers ni registros vacíos), y 29.765.776 bytes sin comprimir. Todos admiten decodificación UTF-8 estricta; el separador inferido es coma. No se detectaron registros con ancho distinto al header ni headers duplicados. Esto no valida contenido, claves ni relaciones.

Los originales permanecieron intactos según SHA-256 antes/después. La segunda extracción reutilizó copias idénticas sin sobrescribirlas. Los reportes detallados, nombres originales, headers, hashes y correspondencia con las copias están exclusivamente en la carpeta local ignorada.

Reporte local de referencia: `data/zoho-export-2026-09-16/profile/profile-20260917T203459600120Z.json` y su compañero Markdown.

| Referencia anónima | Registros | Columnas |
|---|---:|---:|
| ZIP-01-CSV-01 | 1142 | 46 |
| ZIP-02-CSV-01 | 18 | 40 |
| ZIP-03-CSV-01 | 56 | 83 |
| ZIP-04-CSV-01 | 4228 | 108 |
| ZIP-05-CSV-01 | 8 | 67 |
| ZIP-06-CSV-01 | 16 | 98 |
| ZIP-07-CSV-01 | 1246 | 68 |
| ZIP-08-CSV-01 | 1765 | 70 |
| ZIP-09-CSV-01 | 10339 | 45 |
| ZIP-10-CSV-01 | 1177 | 14 |
| ZIP-11-CSV-01 | 607 | 14 |
| ZIP-12-CSV-01 | 291 | 14 |
| ZIP-13-CSV-01 | 676 | 125 |
| ZIP-14-CSV-01 | 13281 | 88 |
| ZIP-15-CSV-01 | 1061 | 61 |
| ZIP-16-CSV-01 | 16246 | 28 |

El JSON incluye vacíos por columna sobre registros de ancho correcto y candidatos a ID, owner, fechas y parent/related. No incluye valores de celdas.

## Inferencias

- Los headers permiten sugerir roles de columnas; no prueban claves, relaciones referenciales ni significado contractual.
- La estructura es procesable con el parser utilizado. No demuestra completitud del export ni que un registro sea una póliza.
- Las referencias ZIP-NN dependen del orden de nombres del lote; la trazabilidad estable reside en los hashes del manifiesto local.

## Preguntas abiertas

- ¿Qué módulo contiene las pólizas y cuáles son los campos de aseguradora, número, tomador, vigencia y estado?
- ¿Qué significan operacionalmente esos campos, y quién confirma su interpretación?
- ¿Se conservan endosos, cancelaciones y renovaciones o solo el último estado?
- ¿Qué campos son IDs reales y qué relaciones requieren validar cardinalidad e integridad?
- ¿El export incluye el universo requerido? ¿Qué filtros se aplicaron al exportar?
- ¿Cuáles son los alias de aseguradoras pendientes de curación humana?
- ¿Qué muestra de empresas y particulares permitirá medir conformidad y vinculación con Drive?

## Reproducción

Requiere Python 3 y Git. Ejecutar desde la raíz. No requiere red ni nuevas dependencias.

```bash
python3 scripts/profile-zoho.py inventory
python3 scripts/profile-zoho.py extract
python3 scripts/profile-zoho.py profile
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/tests -p 'test_profile_zoho.py'
pnpm check
git check-ignore data/zoho-export-2026-09-16/original-zips/
test -z "$(git ls-files -- data/)"
```

El script rechaza exports versionados o no ignorados, symlinks, rutas inseguras, entradas cifradas, miembros no CSV y tamaños declarados superiores a 256 MiB por miembro o 1 GiB por ZIP. Extrae a `raw/<sha256>/<ordinal>.csv`, verifica CRC y rechaza diferencias en copias existentes. Genera nuevos reportes por ejecución, sin sobrescribir informes previos.

Encoding sin BOM incompatible con UTF-8 o separador no inferible queda pendiente: usar `--encoding` o `--delimiter` solo tras revisión local. El script no imprime excepciones con contenido real. La detección por nombres puede producir falsos positivos y negativos.

## Verificación y límites

Cinco tests sintéticos cubren CSV multilínea, anchos irregulares, encoding ambiguo/BOM, rutas ZIP inseguras/colisiones y rechazo de sobrescritura. `pnpm check` pasó. No se publicaron datos, no se accedió a Zoho/Drive, no se normalizó ni importó.

La revisión humana de estos reportes precede cualquier normalización o importación. Falta la validación semántica, la medición de Drive y la curación de aseguradoras para producir el informe final `REVIEWS/T-0004-insumos-vs01.md`. No se cierran decisiones OPEN.

## Estado de trabajo local

Rama de trabajo: `task/T-0004-zoho-profiling`. El bloqueo de Git quedó resuelto y la
rama incorporó por fast-forward el commit `fa10da9`, que protege los exports y ajusta
T-0004. El script, sus tests y esta síntesis permanecen locales, sin commit.
