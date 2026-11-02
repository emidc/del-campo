// v8 · Pedido de Emiliano del 29/10: todo es un riesgo de la lista principal. Sin sub-riesgos ni escenarios;
// las dos causas de energía y el sismo son riesgos propios; el riesgo sin evaluar va al final de la lista.
const { iniciar, ok, informe } = require('./lib');
const AXE = async P => { await P.addScriptTag({ url: '/axe.js' }); return P.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => v.id + ':' + v.nodes.length)); };
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    const sinScroll = () => P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    await T.perfil('man');

    // Datos: sin padres, sub-riesgos ni escenarios
    const d = await T.estado();
    ok('V8-0.datos' + sfx, 'La semilla no tiene riesgos padre, sub-riesgos ni escenarios', !d.riesgos.some(r => r.tipo !== 'simple' || r.padre) && (d.escenarios || []).length === 0);
    ok('V8-0.nuevos' + sfx, 'Corte de red, grupo electrógeno y sismo son riesgos simples evaluados de Cerro Liso', ['RSK-CL-08', 'RSK-CL-13', 'RSK-CL-14'].every(id => { const r = d.riesgos.find(x => x.id === id); return r && r.org === 'ORG-01HCL7Q2' && r.tipo === 'simple' && r.evals.some(e => e.estado === 'aceptada'); }));

    // 1 · La pantalla de riesgos ya no tiene los bloques sueltos
    await T.ir('#/empresa/e1/riesgos/matriz');
    const t = await T.texto('main');
    ok('V8-1.sin-bloques' + sfx, 'No aparecen «Sub-riesgos y escenarios» ni el bloque «No evaluables»', await P.locator('[data-subriesgos], [data-noevaluables]').count() === 0 && !/Sub-riesgo|Escenario|No evaluables?/i.test(t));
    ok('V8-1.sin-padre' + sfx, 'Ya no existe «Interrupción de energía en vendimia»', !/Interrupción de energía/.test(t));
    ok('V8-1.sin-pendiente' + sfx, 'El aviso «Pendiente de decisión del owner (AD-13 · D-07a)» no está en la pantalla', !/Pendiente de decisión del owner|AD-13/.test(t));

    // 2 · Los tres riesgos nuevos están en la lista, con banda y posición, y en la matriz
    const filas = await P.$$eval('[data-lista="calculado"] tr[data-riesgo]', trs => trs.map(t => ({ id: t.dataset.riesgo, pos: (t.querySelector('[data-pos]') || {}).dataset ? t.querySelector('[data-pos]').dataset.pos : null, sin: t.hasAttribute('data-sin-evaluar'), txt: t.innerText })));
    const f = id => filas.find(x => x.id === id);
    ok('V8-2.en-lista' + sfx, 'Corte de red (08), grupo electrógeno (13) y sismo (14) están en la lista principal con posición', ['RSK-CL-08', 'RSK-CL-13', 'RSK-CL-14'].every(id => f(id) && f(id).pos && !f(id).sin), JSON.stringify(filas.map(x => x.id + '@' + x.pos)));
    ok('V8-2.titulos' + sfx, 'Con nombres propios', /Corte de la red eléctrica/.test(f('RSK-CL-08').txt) && /Falla del grupo electrógeno/.test(f('RSK-CL-13').txt) && /Sismo/.test(f('RSK-CL-14').txt));
    const marc = await P.$$eval('[data-marcador]', ms => ms.map(m => m.dataset.marcador));
    ok('V8-2.matriz' + sfx, 'Los tres aparecen en la matriz', ['RSK-CL-08', 'RSK-CL-13', 'RSK-CL-14'].every(id => marc.includes(id)), marc.join(','));
    ok('V8-2.sismo-extrema' + sfx, 'El sismo lleva el símbolo de Consecuencia extrema', await P.locator('tr[data-riesgo="RSK-CL-14"] .ban-extrema').count() === 1);
    ok('V8-2.cuenta' + sfx, 'La lista tiene 11 riesgos: 10 evaluados y 1 sin evaluar', filas.length === 11 && filas.filter(x => x.sin).length === 1, String(filas.length));

    // 3 · Sin evaluar: una fila más, al final
    const ult = filas[filas.length - 1];
    ok('V8-3.al-final' + sfx, 'El riesgo sin evaluar (09) es la última fila, bajo el grupo «Sin evaluar»', ult.id === 'RSK-CL-09' && ult.sin && await P.evaluate(() => { const g = [...document.querySelectorAll('[data-lista] [data-grupo]')]; return g[g.length - 1].dataset.grupo === 'noeval' && /Sin evaluar/.test(g[g.length - 1].innerText); }));
    ok('V8-3.que-falta' + sfx, 'La fila dice qué falta para evaluarlo y no tiene posición', /Falta el permiso de vuelco/.test(ult.txt) && /—/.test(ult.txt) && /Sin evaluar/.test(ult.txt), ult.txt.replace(/\n/g, ' '));
    await P.locator('tr[data-riesgo="RSK-CL-09"] a.fila-tit').click(); await P.waitForTimeout(80);
    ok('V8-3.abre' + sfx, 'Se abre en la lista como cualquier otro riesgo', await P.locator('tr[data-riesgo="RSK-CL-09"] a.fila-tit[aria-expanded="true"]').count() === 1 && await P.locator('#det-RSK-CL-09 [data-detalle-riesgo="RSK-CL-09"]').count() === 1);
    ok('V8-3.foco' + sfx, 'Tras abrirlo, el foco sigue en el riesgo', await P.evaluate(() => document.activeElement && document.activeElement.id === 'ft-RSK-CL-09'));
    await P.keyboard.press('Enter'); await P.waitForTimeout(80);
    ok('V8-3.cierra-enter' + sfx, 'Con Enter se vuelve a cerrar y el foco no se pierde', await P.locator('#det-RSK-CL-09').count() === 0 && await P.evaluate(() => document.activeElement.id === 'ft-RSK-CL-09'));
    await P.keyboard.press('Enter'); await P.waitForTimeout(80);
    await T.foto('V8-sin-evaluar', true);
    const v1 = await AXE(P); ok('V8-A11Y.lista' + sfx, 'axe WCAG A/AA sin violaciones con el riesgo sin evaluar abierto', !v1.length, v1.join(' '));
    ok('V8-SCROLL.lista' + sfx, 'Sin scroll horizontal', await sinScroll());

    // 3b · Con filtro de celda, el sin evaluar no aparece (no está en la matriz)
    await T.ir('#/empresa/e1/riesgos/matriz?c=3-5');
    ok('V8-3.filtro' + sfx, 'Con un filtro de celda no se muestra el grupo «Sin evaluar»', await P.locator('[data-lista] tr[data-sin-evaluar]').count() === 0);

    // 3c · Con orden profesional también va al final (Quebrada Azul no tiene sin evaluar: se prueba que no aparece el grupo)
    await T.ir('#/empresa/e3/riesgos/matriz');
    ok('V8-3.prof' + sfx, 'En una empresa sin riesgos sin evaluar no aparece el grupo', await P.locator('[data-lista] [data-grupo="noeval"]').count() === 0);

    // 4 · Decisión del owner registrada fuera de la pantalla
    await T.ir('#/demo/acerca');
    const dec = await T.texto('[data-decisiones]');
    ok('V8-4.decisiones' + sfx, 'AD-13 y la nueva AD-17 (sin sub-riesgos ni escenarios) están en «Decisiones pendientes del owner»', /AD-13/.test(dec) && /AD-17/.test(dec) && /sub-riesgos ni escenarios/.test(dec));

    // 5 · Cartera y plano
    await T.ir('#/riesgos');
    ok('V8-5.cartera' + sfx, 'La cartera llama «Sin evaluar» a la columna', /Sin evaluar/i.test(await T.texto('[data-cartera] thead')) && !/No evaluables/i.test(await T.texto('[data-cartera] thead')));
    await T.ir('#/empresa/e1/riesgos/layout');
    const pines = await P.$$eval('[data-pin]', ps => ps.map(p => p.dataset.pin)).catch(() => []);
    ok('V8-5.plano' + sfx, 'El plano tiene pines para el grupo electrógeno y el sismo', pines.includes('RSK-CL-13') && pines.includes('RSK-CL-14'), pines.join(','));

    // Portal y aislamiento
    await T.perfil('pcl'); await T.ir('#/portal/e1/riesgos/matriz');
    const tp = await T.texto('main');
    ok('V8-portal' + sfx, 'La empresa ve los mismos riesgos y el «Sin evaluar» al final, sin sub-riesgos', /Sismo/.test(tp) && /Falla del grupo electrógeno/.test(tp) && await P.locator('[data-lista] tr[data-sin-evaluar]').count() === 1 && !/Sub-riesgo|Escenario/.test(tp));
    const v2 = await AXE(P); ok('V8-A11Y.portal' + sfx, 'axe WCAG A/AA sin violaciones en el portal', !v2.length, v2.join(' '));
    await T.perfil('pqa'); await T.ir('#/portal/e1/riesgos/matriz?r=RSK-CL-14');
    ok('V8-aislamiento' + sfx, 'Hernán (Quebrada Azul) no ve el sismo de Cerro Liso', !/Sismo/.test(await T.texto('main')) && await P.locator('[data-riesgo="RSK-CL-14"]').count() === 0);
    await T.perfil('r1'); await T.ir('#/empresa/e2/riesgos/matriz');
    ok('V8-r1' + sfx, 'El revisor (R1) sigue bloqueado antes de su orden previo', await P.locator('[data-lista] tr[data-riesgo], [data-marcador]').count() === 0);

    ok('V8.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('riesgos-v8');
})();
