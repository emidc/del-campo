// v10 · Pedido de Emiliano del 29/10: la tabla con la justificación desplegada debe verse más prolija.
// La justificación va dentro de las celdas de impacto y vulnerabilidad: sin filas intercaladas y con columnas alineadas.
const { iniciar, ok, informe } = require('./lib');
const AXE = async P => { await P.addScriptTag({ url: '/axe.js' }); return P.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => v.id + ':' + v.nodes.length)); };
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    await T.perfil('man');
    await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-03');
    const cerrada = await P.evaluate(() => [...document.querySelectorAll('[data-tabla-impacto] > tbody > tr')].map(r => r.dataset.dim).join());
    await P.locator('#jb-RSK-CL-03').click(); await P.waitForTimeout(100);
    const g = await P.evaluate(() => {
      const t = document.querySelector('[data-tabla-impacto]'), filas = [...t.querySelectorAll(':scope > tbody > tr')];
      const caja = el => el.getBoundingClientRect();
      const xs = k => filas.map(r => { const c = r.querySelector(`td[data-jv="${k}"]`); return c ? Math.round(caja(c).left) : null; });
      const w = t.closest('.tabla-wrap');
      return { dims: filas.map(r => r.dataset.dim).join(), sinDim: filas.filter(r => !r.dataset.dim).length, xI: xs('I'), xV: xs('V'),
        dentro: w.scrollWidth <= w.clientWidth + 1, thead: getComputedStyle(t.querySelector('thead')).display,
        etiquetas: [...t.querySelectorAll('.jv-l')].map(l => ({ vis: caja(l).width > 2, txt: l.textContent })),
        numeros: [...t.querySelectorAll('.jv-n')].filter(n => caja(n).width > 0).length,
        valores: filas.map(r => [...r.querySelectorAll('.jv-l')].map(l => l.textContent).join('|')) };
    });
    ok('V10-1.mismas-filas' + sfx, 'Al desplegar, la tabla sigue con las mismas cuatro filas: no se intercalan filas de texto', g.dims === cerrada && g.sinDim === 0, `${cerrada} → ${g.dims}`);
    ok('V10-1.valores' + sfx, 'Cada fila conserva su valor de impacto y de vulnerabilidad', g.valores.join(';') === 'Impacto 2|Vulnerabilidad 2;Impacto 5|Vulnerabilidad 5;Impacto 2|Vulnerabilidad 2;Impacto 4|Vulnerabilidad 3', g.valores.join(';'));
    ok('V10-1.sin-desborde' + sfx, 'La tabla entra entera, sin desplazamiento interno', g.dentro);
    if (!movil) {
      ok('V10-2.alineada', 'Las columnas Impacto y Vulnerabilidad quedan alineadas en las cuatro filas', new Set(g.xI).size === 1 && new Set(g.xV).size === 1 && g.xV[0] > g.xI[0], `${g.xI} / ${g.xV}`);
      ok('V10-2.numero', 'En escritorio el valor se ve como número junto a su criterio, bajo el encabezado de su columna', g.numeros === 8 && g.thead !== 'none' && g.etiquetas.every(e => !e.vis));
    } else {
      ok('V10-2.apilada-movil', 'En el celular cada tipo de daño es un bloque con «Impacto N» y «Vulnerabilidad N» visibles', g.thead === 'none' && g.numeros === 0 && g.etiquetas.length === 8 && g.etiquetas.every(e => e.vis));
    }
    const per = await P.locator('tr[data-justif="per"]').innerText();
    ok('V10-3.contenido' + sfx, 'El criterio y la observación siguen juntos en su celda (Personas)', /Muerte o incapacidad permanente\./.test(per) && /6 m de altura/.test(per) && /Sin controles\./.test(per) && /línea de vida/.test(per), per.replace(/\n/g, ' '));
    ok('V10-3.tono' + sfx, 'Solo la fila que define la banda tiene un tono distinto; las otras tres comparten el mismo fondo', await P.evaluate(() => { const f = document.querySelector('[data-tabla-impacto] tr.det-fila'), os = [...document.querySelectorAll('[data-tabla-impacto] tr[data-dim]:not(.det-fila)')]; const bg = r => [r, ...r.querySelectorAll('td')].map(x => getComputedStyle(x).backgroundColor).find(c => c !== 'rgba(0, 0, 0, 0)') || ''; return f && os.length === 3 && os.every(o => bg(o) !== bg(f)) && new Set(os.map(bg)).size === 1; }));
    if (!movil) {
      for (const w of [1024, 900, 768]) {
        await P.setViewportSize({ width: w, height: 800 }); await P.waitForTimeout(60);
        const tono = await P.evaluate(() => { const bg = r => [r, ...r.querySelectorAll('td')].map(x => getComputedStyle(x).backgroundColor).find(c => c !== 'rgba(0, 0, 0, 0)') || ''; const fs = [...document.querySelectorAll('[data-tabla-impacto] tr[data-dim]')]; return fs.map(r => r.dataset.dim + (r.classList.contains('det-fila') ? '*' : '') + '=' + bg(r)); });
        const base = tono.filter(x => !x.includes('*=')).map(x => x.split('=')[1]);
        ok(`V10-SCROLL.${w}`, `A ${w} px la página no se desplaza en horizontal (la tabla de la lista se desplaza dentro de su marco)`, await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), String(await P.evaluate(() => document.documentElement.scrollWidth)));
        ok(`V10-3.tono-${w}`, `A ${w} px solo la fila que define la banda cambia de tono`, base.length === 3 && new Set(base).size === 1 && !base.includes(tono.find(x => x.includes('*=')).split('=')[1]), tono.join(' | '));
      }
      await P.setViewportSize({ width: 1366, height: 768 }); await P.waitForTimeout(60);
    }
    await T.foto('V10-justificacion', true);
    const v = await AXE(P); ok('V10-A11Y' + sfx, 'axe WCAG A/AA sin violaciones con la justificación abierta', !v.length, v.join(' '));
    ok('V10-SCROLL' + sfx, 'Sin scroll horizontal', await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await P.locator('#jb-RSK-CL-03').click(); await P.waitForTimeout(80);
    ok('V10-4.cierra' + sfx, 'Al ocultarla vuelve la tabla compacta de números', await P.locator('[data-tabla-impacto].t-imp-just, td.jv-c').count() === 0 && await P.evaluate(() => document.activeElement.id === 'jb-RSK-CL-03'));
    // Valor sin dato
    await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-05'); await P.locator('#jb-RSK-CL-05').click(); await P.waitForTimeout(80);
    const p5 = await P.locator('tr[data-justif="per"] td[data-jv="I"]').innerText();
    ok('V10-5.sin-dato' + sfx, 'Un impacto sin dato se ve con recuadro punteado (v11: sin «≥») y explica que falta un dato', !/≥/.test(p5) && /Falta un dato: por lo que se sabe es 3, pero podría ser mayor/.test(p5) && await P.locator('tr[data-justif="per"] td[data-jv="I"] .jv-n-desc').count() === 1, p5.replace(/\n/g, ' '));
    ok('V10.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('riesgos-v10');
})();
