// AM-34 (matriz), AM-35 (orden D10, con y sin reordenamiento; «Ramo»), AM-36 (revisor R1 en todas las superficies), AM-16 (sin ranking de empresas).
// El orden esperado se recalcula aquí, de forma independiente, desde la semilla (metodología §7.1 de F2, D10).
const { iniciar, ok, informe } = require('./lib');
const RANK = { critica: 4, alta: 3, media: 2, baja: 1 };
const bandaDe = c => c >= 75 ? 'critica' : c >= 50 ? 'alta' : c >= 20 ? 'media' : 'baja';
const lo = v => typeof v === 'object' ? v.min : v;
function evalRiesgo(d, r) {
  if (!r.evaluable) return null;
  if (r.tipo === 'padre') { const subs = d.riesgos.filter(x => x.padre === r.id).map(x => evalRiesgo(d, x)).filter(Boolean); return subs.sort((a, b) => b.c - a.c)[0] || null; }
  const e = r.evals.filter(x => x.estado === 'aceptada').slice(-1)[0]; if (!e) return null;
  const dims = ['eco', 'per', 'con', 'leg']; const c = Math.max(...dims.map(k => e.P * lo(e.I[k]) * e.V[k]));
  return { c, banda: bandaDe(c), ieff: Math.max(...dims.map(k => lo(e.I[k]))), iper: lo(e.I.per), P: e.P };
}
function esperadoD10(d, org) {
  const xs = d.riesgos.filter(r => r.org === org && r.tipo !== 'sub').map(r => ({ id: r.id, e: evalRiesgo(d, r) })).filter(x => x.e);
  const k = x => [RANK[x.e.banda], x.e.c, x.e.ieff, x.e.iper];
  xs.sort((a, b) => { const A = k(a), B = k(b); for (let i = 0; i < 4; i++) if (A[i] !== B[i]) return B[i] - A[i]; return a.id.localeCompare(b.id); });
  let pos = 0; xs.forEach((x, i) => { if (!i || k(x).join() !== k(xs[i - 1]).join()) pos = i + 1; x.pos = pos; });
  return xs;
}
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    await T.perfil('man');
    const d = await T.estado();
    for (const [eid, org] of [['e1', 'ORG-01HCL7Q2'], ['e2', 'ORG-01HPD3K8']]) {
      await T.ir(`#/empresa/${eid}/riesgos/matriz`);
      const esp = esperadoD10(d, org);
      const filas = await P.$$eval('[data-lista="calculado"] tr[data-riesgo]:not([data-sin-evaluar])', trs => trs.map(t => ({ id: t.dataset.riesgo, pos: +t.querySelector('[data-pos]').dataset.pos })));
      ok(`AM-35.${eid}${sfx}`, `Orden mostrado = D10 recalculado (${eid})`, JSON.stringify(filas) === JSON.stringify(esp.map(x => ({ id: x.id, pos: x.pos }))), JSON.stringify(filas.map(f => f.id + '@' + f.pos)) + ' vs ' + JSON.stringify(esp.map(f => f.id + '@' + f.pos)));
      const marc = await P.$$eval('[data-marcador]', ms => ms.map(m => m.dataset.marcador).sort());
      ok(`AM-34.${eid}${sfx}`, `Matriz = riesgos del ranking (simples y padres evaluables; sin sub-riesgos ni no evaluables) (${eid})`, JSON.stringify(marc) === JSON.stringify(esp.map(x => x.id).sort()), marc.join(','));
      const celdas = await P.$$eval('[data-matriz] [data-celda]', cs => [...new Set(cs.map(c => getComputedStyle(c).backgroundColor))]);
      ok(`AM-34.fondo.${eid}${sfx}`, 'Fondo de celdas: un solo tono celeste que se oscurece de a poco con P + I (v11, pedido de Emiliano; no usa los colores de las bandas)', await P.evaluate(() => { const L = c => { const m = getComputedStyle(c).backgroundColor.match(/\d+(\.\d+)?/g).map(Number); return (m[0] * 299 + m[1] * 587 + m[2] * 114) / 1000; }; const cs = [...document.querySelectorAll('[data-matriz] [data-celda]')].map(c => { const [P, I] = c.dataset.celda.split('-').map(Number); return { s: P + I, l: L(c), bg: getComputedStyle(c).backgroundColor }; }); const porS = {}; cs.forEach(x => { (porS[x.s] = porS[x.s] || new Set()).add(x.bg); }); const ks = Object.keys(porS).map(Number).sort((a, b) => a - b); const lum = ks.map(k => cs.find(x => x.s === k).l); return cs.length === 25 && ks.every(k => porS[k].size === 1) && lum.every((l, i) => i === 0 || l < lum[i - 1]) && lum[0] - lum[lum.length - 1] < 40 && cs.every(x => { const m = x.bg.match(/\d+/g).map(Number); return m[2] >= m[0]; }); }), celdas.join(' '));
      const grupos = await P.$$eval('[data-grupo]', g => g.map(x => x.dataset.grupo));
      ok(`AM-35.grupos.${eid}${sfx}`, 'Encabezados por banda en orden (v8: «Sin evaluar» al final, si hay)', JSON.stringify(grupos) === JSON.stringify(['critica', 'alta', 'media', 'baja'].filter(b => esp.some(x => x.e.banda === b)).concat(d.riesgos.some(r => r.org === org && r.evaluable === false) ? ['noeval'] : [])), grupos.join(','));
    }
    await T.ir('#/empresa/e1/riesgos/matriz');
    ok('AM-34.unknown' + sfx, 'Impacto desconocido: solo el borde discontinuo (v11: sin «≥»), con aclaración en el título y para lectores de pantalla', (await P.locator('[data-marcador="RSK-CL-05"].dashed').count()) === 1 && !/≥/.test(await P.locator('[data-marcador="RSK-CL-05"]').innerText()) && /falta un dato/.test(await P.locator('[data-marcador="RSK-CL-05"]').getAttribute('title')) && /falta un dato/.test(await P.locator('[data-marcador="RSK-CL-05"] .sr').textContent()));
    ok('AM-34.nota' + sfx, 'Nota fija de la matriz', /toma el peor/.test(await P.locator('[data-nota-matriz]').textContent()));
    ok('AM-12.empate' + sfx, 'Empate visible (v9: símbolo «=» con texto para lectores de pantalla)', (await P.locator('[data-lista] [data-empate]', { hasText: 'empate' }).count()) > 0);
    await T.ir('#/empresa/e1/riesgos/matriz?v=b'); ok('AM-34.B' + sfx, 'Vista alternativa B conmutable', (await P.locator('[data-vista-b]').count()) === 1);
    // Con reordenamiento profesional (Quebrada Azul)
    await T.ir('#/empresa/e3/riesgos/matriz');
    const ro = d.reordenamientos.find(r => r.id === 'RO-QA-1');
    const prof = await P.$$eval('[data-lista="profesional"] tr[data-riesgo]:not([data-sin-evaluar])', trs => trs.map(t => t.dataset.riesgo));
    const reo = await P.locator('[data-reorden]').textContent();
    ok('AM-35.reorden' + sfx, 'Con reordenamiento vigente: orden profesional con autor, fecha, causa y fundamento', JSON.stringify(prof) === JSON.stringify(ro.orden) && /Evangelina/.test(reo) && /20\/10\/2026/.test(reo) && reo.includes(ro.causa) && reo.includes(ro.fundamento.slice(0, 30)));
    const calcAlLado = await P.$$eval('[data-lista="profesional"] [data-pos]', ps => ps.map(p => p.innerText));
    const esp3 = esperadoD10(d, 'ORG-01HQA5M1');
    ok('AM-35.reorden-calc' + sfx, 'El orden calculado se ve al lado', calcAlLado.every((t, i) => t.includes(`calculada ${esp3.find(x => x.id === prof[i]).pos}`)), calcAlLado.join(' | '));
    await T.ir('#/empresa/e3/riesgos/matriz?calc=1');
    const calc = await P.$$eval('[data-lista="calculado"] tr[data-riesgo]:not([data-sin-evaluar])', trs => trs.map(t => t.dataset.riesgo));
    ok('AM-35.reorden-sin' + sfx, 'Vista del orden calculado = D10', JSON.stringify(calc) === JSON.stringify(esp3.map(x => x.id)));
    await T.ir('#/polizas'); ok('AM-35.ramo' + sfx, '«Ramo» en pólizas', (await P.locator('main th', { hasText: 'Ramo' }).count()) > 0 || /Ramo/.test(await T.texto('main')));
    // AM-16: ninguna lista de empresas ordenada por conteo
    await T.ir('#/riesgos');
    const nombres = await P.$$eval('[data-cartera] tr[data-empresa] td:first-child', t => t.map(x => x.innerText.trim()));
    ok('AM-16.cartera' + sfx, 'Cartera en orden alfabético y sin controles de orden', JSON.stringify(nombres) === JSON.stringify([...nombres].sort((a, b) => a.localeCompare(b, 'es'))) && !(await P.locator('[data-cartera] th button, [data-cartera] th a').count()));
    const k10 = await T.kpi('K-10', 'man');
    ok('AM-16.k10' + sfx, 'K-10 en orden alfabético', JSON.stringify(k10.map(x => x.nombre)) === JSON.stringify(k10.map(x => x.nombre).sort((a, b) => a.localeCompare(b, 'es'))));
    // ---------- AM-36: revisor R1 ----------
    await T.perfil('r1');
    const PD = d.riesgos.filter(r => r.org === 'ORG-01HPD3K8').map(r => r.titulo);
    const fuga = async (ruta, sel = '#root') => { await T.ir(ruta); const t = await T.texto(sel); const hay = await P.locator('[data-marcador], [data-pos], .banda.b-critica, .banda.b-alta, .banda.b-media, .banda.b-baja').count(); return { t, hay }; };
    let x = await fuga('#/empresa/e2/riesgos/matriz');
    ok('AM-36.matriz-antes' + sfx, 'Matriz y lista de Piedemonte sin banda, posición ni marcadores', x.hay === 0 && /orden previo/i.test(x.t), x.hay);
    for (const sub of ['plan', 'transferencia', 'solicitudes']) { x = await fuga(`#/empresa/e2/riesgos/${sub}`); ok(`AM-36.${sub}-antes${sfx}`, `${sub} sin resultados`, x.hay === 0); }
    x = await fuga('#/riesgos'); ok('AM-36.cartera-antes' + sfx, 'Cartera: Piedemonte oculta', /Resultados ocultos hasta que registres tu orden previo/.test(x.t) && !(await P.locator('[data-empresa="e2"] td.num').count()));
    x = await fuga('#/inicio'); ok('AM-36.inicio-antes' + sfx, 'Inicio de R1 sin K-10 ni K-11 de Piedemonte', !(await P.locator('[data-kpi="K-10"], [data-kpi="K-11"]').count()) && x.hay === 0);
    await P.keyboard.press('/'); await P.fill('#q-global', 'Caída de altura'); await P.waitForTimeout(40);
    ok('AM-36.busqueda-antes' + sfx, 'Búsqueda: el riesgo aparece sin banda', /oculto hasta tu orden previo/.test(await T.texto('[data-resultados]')) && !/banda/i.test(await T.texto('[data-resultados]')));
    await P.fill('#q-global', 'Piedemonte'); await P.waitForTimeout(40);
    ok('AM-36.busqueda-empresa-antes' + sfx, 'Búsqueda de empresa sin conteos', !/Crítica|Alta/.test(await T.texto('[data-resultados]')));
    await P.keyboard.press('Escape');
    x = await fuga('#/poliza/pol10'); ok('AM-36.poliza-antes' + sfx, 'Ficha de póliza sin bandas de riesgos', x.hay === 0);
    ok('AM-36.notifs-antes' + sfx, 'Sin notificaciones con resultados para R1', (await T.estado()).notificaciones.filter(n => n.para === 'r1').length === 0);
    // evento con org PD en el registro: se fuerza uno escribiendo como Emiliano
    await T.perfil('emi'); const rr = await T.act('escribirReeval', { riesgo: 'RSK-PD-03', P: 2, motivo: 'Prueba de enmascarado', evidencia: 'Prueba' }); ok('AM-36.prep' + sfx, 'Evento de Piedemonte generado para la prueba', rr.ok, rr.error);
    await T.perfil('r1'); await T.ir('#/demo/registro');
    const reg = await T.texto('main');
    ok('AM-36.registro-antes' + sfx, 'Registro de eventos enmascara eventos de Piedemonte', !/Robo de maquinaria/.test(reg) && /oculto hasta que registres/.test(reg));
    // registrar orden previo por la interfaz
    await T.ir('#/orden-previo/ORG-01HPD3K8');
    ok('AM-36.material-ciego' + sfx, 'El material ciego no muestra bandas ni factores', (await P.locator('[data-orden-previo] .banda, [data-orden-previo] [data-pos]').count()) === 0);
    await T.boton('Bajar', '[data-orden-previo] li:nth-child(1)');
    await T.boton('Registrar orden previo');
    const d2 = await T.estado(); const op = d2.validacion.ordenPrevio[0];
    ok('AM-36.registro' + sfx, 'Orden previo con autor y fecha', op && op.autor === 'r1' && !!op.t && op.orden.length === 4);
    const rep = await T.act('ordenPrevio', { org: 'ORG-01HPD3K8', orden: op.orden });
    ok('AM-36.append-only' + sfx, 'No se puede reescribir (append-only)', !rep.ok && /append-only/.test(rep.error));
    x = await fuga('#/empresa/e2/riesgos/matriz'); ok('AM-36.matriz-despues' + sfx, 'Después del registro, ve bandas, posiciones y marcadores', x.hay > 0);
    x = await fuga('#/riesgos'); ok('AM-36.cartera-despues' + sfx, 'Cartera muestra conteos de Piedemonte', (await P.locator('[data-empresa="e2"] td.num').count()) > 0);
    await T.ir('#/demo/registro'); ok('AM-36.registro-despues' + sfx, 'El registro ya muestra el evento', /Robo de maquinaria/.test(await T.texto('main')));
    ok('AM-36.distinto' + sfx, 'R1 es un perfil distinto de Emiliano', d2.validacion.revisor === 'r1');
    ok('AM.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('riesgos-am34-35-36');
})();
