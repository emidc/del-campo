// v11 · Pedido de Emiliano del 29/10: leve degradé celeste en la matriz (más oscuro a mayor probabilidad e impacto)
// y, cuando falta un dato, solo el recuadro punteado, sin «≥3».
const { iniciar, ok, informe } = require('./lib');
const AXE = async P => { await P.addScriptTag({ url: '/axe.js' }); return P.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => v.id + ':' + v.nodes.length)); };
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    await T.perfil('man');
    await T.ir('#/empresa/e1/riesgos/matriz');
    // 1 · Degradé
    const m = await P.evaluate(() => {
      const lum = c => { const v = getComputedStyle(c).backgroundColor.match(/[\d.]+/g).map(Number); return { l: (v[0] * 299 + v[1] * 587 + v[2] * 114) / 1000, rgb: v.slice(0, 3) }; };
      const g = {}; document.querySelectorAll('[data-matriz] [data-celda]').forEach(c => { g[c.dataset.celda] = lum(c); });
      let masP = true, masI = true;
      for (let P = 1; P <= 5; P++) for (let I = 1; I <= 5; I++) { if (P < 5 && !(g[`${P + 1}-${I}`].l < g[`${P}-${I}`].l)) masP = false; if (I < 5 && !(g[`${P}-${I + 1}`].l < g[`${P}-${I}`].l)) masI = false; }
      const claro = g['1-1'], oscuro = g['5-5'];
      return { masP, masI, claro: claro.rgb.join(','), oscuro: oscuro.rgb.join(','), salto: Math.round(claro.l - oscuro.l), celeste: Object.values(g).every(x => x.rgb[2] >= x.rgb[0] && x.rgb[1] >= x.rgb[0]), n: Object.keys(g).length };
    });
    ok('V11-1.oscurece-P' + sfx, 'Con el mismo impacto, cada paso de probabilidad oscurece la celda', m.n === 25 && m.masP, JSON.stringify(m));
    ok('V11-1.oscurece-I' + sfx, 'Con la misma probabilidad, cada paso de impacto oscurece la celda', m.masI);
    ok('V11-1.leve' + sfx, 'El degradé es leve y celeste: de casi blanco (P1·I1) a un celeste suave (P5·I5)', m.celeste && m.salto >= 15 && m.salto <= 40, `${m.claro} → ${m.oscuro} (Δ luminancia ${m.salto})`);
    const marc = await P.evaluate(() => [...document.querySelectorAll('[data-marcador]')].every(x => getComputedStyle(x).backgroundColor === 'rgb(255, 255, 255)'));
    ok('V11-1.marcadores' + sfx, 'Los marcadores siguen con fondo blanco sobre el degradé', marc);
    // 2 · Sin «≥»
    const vis = await P.evaluate(() => { const c = document.querySelector('main').cloneNode(true); c.querySelectorAll('.sr').forEach(x => x.remove()); return c.textContent; });
    ok('V11-2.sin-signo' + sfx, 'La pantalla de riesgos no muestra «≥» en la matriz, la leyenda ni la lista', !/≥/.test(vis));
    const ley = await P.evaluate(() => { const l = document.querySelector('[data-leyenda-falta]'); const mk = l && l.querySelector('.marcador'); return l ? { txt: l.textContent.replace(/\s+/g, ' ').trim(), dashed: mk && getComputedStyle(mk).borderStyle } : null; });
    ok('V11-2.leyenda' + sfx, 'La leyenda explica el recuadro punteado: «falta un dato»', ley && ley.dashed === 'dashed' && /falta un dato/.test(ley.txt) && !/≥/.test(ley.txt), JSON.stringify(ley));
    const m05 = await P.evaluate(() => { const x = document.querySelector('[data-marcador="RSK-CL-05"]'); return { dashed: getComputedStyle(x).borderStyle, title: x.title, sr: (x.querySelector('.sr') || {}).textContent || '' }; });
    ok('V11-2.marcador' + sfx, 'El 05 en la matriz: recuadro punteado, sin «≥3», con «falta un dato» en el título y para lectores de pantalla', m05.dashed === 'dashed' && /falta un dato/.test(m05.title) && /falta un dato/.test(m05.sr), JSON.stringify(m05));
    const f05 = await P.evaluate(() => { const n = document.querySelector('tr[data-riesgo="RSK-CL-05"] [data-falta]'); return n ? { t: n.firstChild.textContent, b: getComputedStyle(n).borderStyle } : null; });
    ok('V11-2.lista' + sfx, 'En la lista, el impacto del 05 se ve como «3» en recuadro punteado', f05 && f05.t === '3' && f05.b === 'dashed', JSON.stringify(f05));
    await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-05');
    const t05 = await P.evaluate(() => { const n = document.querySelector('[data-tabla-impacto] tr[data-dim="per"] [data-falta]'); return n ? { t: n.firstChild.textContent, b: getComputedStyle(n).borderStyle } : null; });
    ok('V11-2.tabla' + sfx, 'En la tabla de impacto también: «3» en recuadro punteado, sin «(sin dato)»', t05 && t05.t === '3' && t05.b === 'dashed' && !/sin dato\)/.test(await P.locator('[data-tabla-impacto]').innerText()), JSON.stringify(t05));
    await T.foto('V11-matriz', true);
    const v1 = await AXE(P); ok('V11-A11Y' + sfx, 'axe WCAG A/AA sin violaciones', !v1.length, v1.join(' '));
    ok('V11-SCROLL' + sfx, 'Sin scroll horizontal', await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    // Portal
    await T.perfil('pcl'); await T.ir('#/portal/e1/riesgos/matriz');
    const vp = await P.evaluate(() => { const c = document.querySelector('main').cloneNode(true); c.querySelectorAll('.sr').forEach(x => x.remove()); return c.textContent; });
    ok('V11-portal' + sfx, 'El portal muestra el mismo degradé y tampoco usa «≥»', !/≥/.test(vp) && await P.evaluate(() => getComputedStyle(document.querySelector('[data-celda="5-5"]')).backgroundColor !== getComputedStyle(document.querySelector('[data-celda="1-1"]')).backgroundColor));
    ok('V11.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('riesgos-v11');
})();
