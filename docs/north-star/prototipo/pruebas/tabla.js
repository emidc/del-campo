// Junta los resultados JSON en una tabla Markdown con el resultado observado de cada aserción.
const fs = require('fs'), path = require('path');
const dir = path.join(process.env.EVID || path.join(__dirname, '..', 'evidencia'), 'resultados');
const archivos = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
let total = 0, verdes = 0, md = '';
for (const f of archivos) {
  const rs = JSON.parse(fs.readFileSync(path.join(dir, f)));
  const v = rs.filter(r => r.ok).length; total += rs.length; verdes += v;
  md += `\n### ${f.replace('.json', '')} · ${v}/${rs.length} en verde\n\n| ID | Qué se verifica | Resultado | Observado |\n|---|---|---|---|\n`;
  for (const r of rs) md += `| ${r.id} | ${r.desc.replace(/\|/g, '\\|')} | ${r.ok ? 'Pasa' : '**Falla**'} | ${(r.obs || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 200)} |\n`;
}
fs.writeFileSync(path.join(dir, '..', 'resultados-detalle.md'), `# Resultados observados\n\nTotal: ${verdes}/${total} aserciones en verde.\n${md}`);
console.log(`Total: ${verdes}/${total} aserciones en verde`);
// También cuenta como falla un script del runner que no dejó resultados.
const esperados = (process.env.SCRIPTS || 'humo r1-manuel r2-evangelina r3-victoria r4-r5-r6 r7-r8-am32 r-imp riesgos-am34-35-36 riesgos-v4 riesgos-v7 riesgos-v8 riesgos-v9 riesgos-v10 riesgos-v11 riesgos-v12 riesgos-v13 inicio-v5 inicio-v24 fichas-v9 drive-v13 altas-v16 delegar-v15 gestiones-v17 prospectos-v18 importar-v19 manuel-v22 fotos-v20 configuracion-v19 equipo-v22 kpis permisos aislamiento bancarios transversales complementarios botones visual-a11y').split(/\s+/).filter(Boolean);
const faltan = esperados.filter(s => !archivos.includes(s + '.json'));
if (faltan.length) console.log('Sin resultados: ' + faltan.join(', '));
process.exitCode = verdes === total && !faltan.length ? 0 : 1;
