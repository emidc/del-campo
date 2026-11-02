// v9 · Pedido de Emiliano del 29/10: en la lista de riesgos las etiquetas son símbolos (se explican al abrir el riesgo),
// y al abrir un riesgo el menú de la izquierda no debe dejar de verse.
const { iniciar, ok, informe } = require('./lib');
const AXE = async P => { await P.addScriptTag({ url: '/axe.js' }); return P.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => v.id + ':' + v.nodes.length)); };
// Texto visible de un elemento, sin el texto para lectores de pantalla.
const VISIBLE = sel => { const n = document.querySelector(sel); if (!n) return ''; const c = n.cloneNode(true); c.querySelectorAll('.sr').forEach(x => x.remove()); return c.textContent.replace(/\s+/g, ' '); };
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    const sinScroll = () => P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    await T.perfil('man');
    await T.ir('#/empresa/e1/riesgos/matriz');

    // 1 · Sin etiquetas de texto en la lista
    const vis = await P.evaluate(VISIBLE, '[data-lista="calculado"] tbody');
    ok('V9-1.sin-texto' + sfx, 'La lista no muestra las palabras «empate», «provisional», «hasta …» ni «nuevo»', !/empate|provisional|hasta (Media|Alta|Crítica)|nuevos?\b/i.test(vis), vis.slice(0, 400));
    const emp = await P.$$eval('[data-lista] [data-empate]', es => es.map(e => ({ t: e.querySelector('[aria-hidden]').textContent, ti: e.title, sr: (e.querySelector('.sr') || {}).textContent, fila: e.closest('tr').dataset.riesgo })));
    ok('V9-1.empate' + sfx, 'El empate es el símbolo «=», con título y texto para lectores de pantalla (04 y 13)', emp.length === 2 && emp.every(e => e.t === '=' && /Empate/.test(e.ti) && /empate/.test(e.sr)) && emp.map(e => e.fila).sort().join() === 'RSK-CL-04,RSK-CL-13', JSON.stringify(emp));
    const prov = await P.$$eval('tr[data-riesgo="RSK-CL-05"] [data-provisional]', es => es.map(e => ({ t: e.querySelector('[aria-hidden]').textContent, ti: e.title, sr: (e.querySelector('.sr') || {}).textContent })));
    ok('V9-1.provisional' + sfx, 'Provisional es el símbolo «≈» junto a la banda, una sola vez, y dice hasta dónde puede subir', prov.length === 1 && prov[0].t === '≈' && /hasta Media/.test(prov[0].ti) && /provisional, puede subir hasta Media/.test(prov[0].sr), JSON.stringify(prov));
    ok('V9-1.pos-sin-prov' + sfx, 'La columna Posición ya no repite «provisional»', await P.locator('[data-lista] td[data-pos] [data-provisional], [data-lista] td[data-pos] .prov').count() === 0);
    const nv = await P.evaluate(() => { const n = document.querySelector('tr[data-riesgo="RSK-CL-01"] .nuevo-n'); return n ? { svg: !!n.querySelector('svg'), punto: !!n.querySelector('.punto'), ti: n.title, sr: (n.querySelector('.sr') || {}).textContent } : null; });
    ok('V9-1.nuevos' + sfx, 'Los comentarios nuevos son el globo resaltado con punto y número, con título', nv && nv.svg && nv.punto && /1 comentario nuevo/.test(nv.ti) && /nuevo/.test(nv.sr), JSON.stringify(nv));

    // 2 · Se explican al abrir el riesgo
    await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-05');
    const ep = await P.locator('[data-detalle-riesgo="RSK-CL-05"] [data-simbolo="prov"]').innerText().catch(() => '');
    ok('V9-2.explica-prov' + sfx, 'Al abrir el 05 se explica «≈ Provisional» y hasta dónde puede subir', /≈/.test(ep) && /Provisional\./.test(ep) && /puede subir hasta Media/.test(ep), ep);
    await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-04');
    const ee = await P.locator('[data-detalle-riesgo="RSK-CL-04"] [data-simbolo="empate"]').innerText().catch(() => '');
    ok('V9-2.explica-empate' + sfx, 'Al abrir el 04 se explica «= Empate» con la posición compartida', /=/.test(ee) && /Empate\./.test(ee) && /posición 4/.test(ee), ee);
    await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-07');
    ok('V9-2.solo-si-aplica' + sfx, 'Un riesgo sin símbolos no muestra explicaciones', await P.locator('[data-detalle-riesgo="RSK-CL-07"] [data-banderas-detalle]').count() === 0);
    const v1 = await AXE(P); ok('V9-A11Y.lista' + sfx, 'axe WCAG A/AA sin violaciones en la lista con un riesgo abierto', !v1.length, v1.join(' '));
    ok('V9-SCROLL' + sfx, 'Sin scroll horizontal', await sinScroll());

    // 3 · El menú de la izquierda sigue a la vista al abrir un riesgo con la página desplazada
    if (!movil) {
      for (const [w, h] of [[1366, 768], [1600, 900], [1000, 760]]) {
        await P.setViewportSize({ width: w, height: h });
        await T.ir('#/empresa/e1/riesgos/matriz'); await P.waitForTimeout(60);
        const sobre0 = await P.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sobre-h').trim());
        await P.locator('tr[data-riesgo="RSK-CL-07"] a.fila-tit').scrollIntoViewIfNeeded();
        await P.locator('tr[data-riesgo="RSK-CL-07"] a.fila-tit').click(); await P.waitForTimeout(120);
        await P.evaluate(() => window.scrollBy(0, 300)); await P.waitForTimeout(60);
        const sb = await P.evaluate(() => { const s = document.querySelector('.sidebar'), b = s.getBoundingClientRect(); const links = [...s.querySelectorAll('a')]; const vis = links.filter(a => { const r = a.getBoundingClientRect(); return r.height > 0 && r.top >= b.top - 1 && r.bottom <= b.bottom + 1 && r.bottom <= innerHeight; }).length; return { sy: Math.round(scrollY), alto: Math.round(b.height), top: Math.round(b.top), vh: innerHeight, links: links.length, vis, sobre: getComputedStyle(document.documentElement).getPropertyValue('--sobre-h').trim() }; });
        ok(`V9-3.menu-${w}`, `Con un riesgo abierto y la página desplazada, el menú sigue a la vista (${w}×${h})`, sb.sy > 200 && sb.alto >= sb.vh * 0.6 && sb.top < 120 && sb.vis >= Math.min(sb.links, 8), JSON.stringify(sb));
        ok(`V9-3.medida-${w}`, `La altura reservada arriba no cambia al desplazar (${w}×${h})`, sb.sobre === sobre0, `${sobre0} → ${sb.sobre}`);
      }
      await P.setViewportSize({ width: 1366, height: 900 });
    } else {
      await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-07'); await P.evaluate(() => window.scrollBy(0, 600));
      const menu = await P.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /menú/i.test(x.getAttribute('aria-label') || x.textContent)); if (!b) return null; const r = b.getBoundingClientRect(); return { top: Math.round(r.top), vis: r.bottom > 0 && r.top < innerHeight }; });
      ok('V9-3.menu-movil', 'En el celular el botón del menú sigue a la vista con un riesgo abierto y la página desplazada', menu && menu.vis, JSON.stringify(menu));
    }

    // Portal y aislamiento
    await T.perfil('pcl'); await T.ir('#/portal/e1/riesgos/matriz');
    const vp = await P.evaluate(VISIBLE, '[data-lista] tbody');
    ok('V9-portal' + sfx, 'En el portal la lista también usa símbolos', !/empate|provisional|nuevos?\b/i.test(vp) && await P.locator('[data-lista] [data-empate]').count() === 2);
    const v2 = await AXE(P); ok('V9-A11Y.portal' + sfx, 'axe WCAG A/AA sin violaciones en el portal', !v2.length, v2.join(' '));
    await T.perfil('r1'); await T.ir('#/empresa/e2/riesgos/matriz');
    ok('V9-r1' + sfx, 'El revisor (R1) sigue bloqueado antes de su orden previo', await P.locator('[data-lista] tr[data-riesgo], [data-marcador]').count() === 0);

    ok('V9.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('riesgos-v9');
})();
