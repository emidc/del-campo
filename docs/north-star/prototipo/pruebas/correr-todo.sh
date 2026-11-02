#!/usr/bin/env bash
# Corre las pruebas de §14.6 contra INDEX (por defecto dist/index.html o prototipo/index.html) y deja resultados en EVID
# (por defecto evidencia/). Sale con el número de scripts que fallaron (0 = todo en verde).
# Requisitos: Node 18+, Playwright con Chromium (en este entorno: NODE_PATH=/opt/node22/lib/node_modules) y axe-core (npm i).
# SCRIPTS="bancarios aislamiento" corre solo esos.
set -u
cd "$(dirname "$0")/.."
export NODE_PATH="${NODE_PATH:-/opt/node22/lib/node_modules}"
EVID_DIR="${EVID:-evidencia}"
rm -rf "$EVID_DIR/resultados"
TODOS="humo cierre-v25 r1-manuel r2-evangelina r3-victoria r4-r5-r6 r7-r8-am32 r-imp riesgos-am34-35-36 riesgos-v4 riesgos-v7 riesgos-v8 riesgos-v9 riesgos-v10 riesgos-v11 riesgos-v12 riesgos-v13 inicio-v5 inicio-v24 fichas-v9 drive-v13 altas-v16 delegar-v15 gestiones-v17 prospectos-v18 importar-v19 manuel-v22 fotos-v20 configuracion-v19 equipo-v22 kpis permisos aislamiento bancarios transversales complementarios botones visual-a11y"
fallas=0
for s in ${SCRIPTS:-$TODOS}; do
  node "pruebas/$s.js" 2>&1 | grep -E "FALLA|aserciones en verde|Error"
  [ "${PIPESTATUS[0]}" -eq 0 ] || { fallas=$((fallas+1)); echo "  ↳ $s FALLÓ"; }
done
node pruebas/tabla.js || fallas=$((fallas+1))
echo "Scripts con fallas: $fallas"
exit $fallas
