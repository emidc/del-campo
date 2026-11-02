// v9 · Pedido de Emiliano del 29/10: las pestañas Contactos, Pólizas, Gestiones, Tareas y Notas de las fichas muestran
// cuántos activos tienen («Contactos (2)»), y las notas se archivan cuando dejan de ser relevantes (lista aparte, no cuentan).
const { iniciar, ok, informe } = require('./lib');
const AXE = async P => { await P.addScriptTag({ url: '/axe.js' }); return P.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map(v => v.id + ':' + v.nodes.length)); };
// Recuento independiente de la app, a partir del estado.
function esperado(d, tipo, id) {
  const hoy = '2026-11-02', abierta = c => !['guardada', 'descartada'].includes(c.estado);
  const e = {
    polizas: d.polizas.filter(p => p.tomador === id && p.inicio <= hoy && p.fin >= hoy).length,
    tareas: d.tareas.filter(t => t.obj && t.obj.tipo === tipo && t.obj.id === id && t.estado !== 'hecha').length,
    notas: (d.notas || []).filter(n => n.obj.tipo === tipo && n.obj.id === id && !n.archivada).length,
  };
  if (tipo === 'empresa') { e.contactos = d.membresias.filter(m => m.empresa === id && !m.hasta).length; e.gestiones = d.cotizaciones.filter(c => c.empresa === id && abierta(c)).length; }
  else e.gestiones = d.siniestros.filter(s => s.persona === id && s.etapa !== 'cierre').length + d.cotizaciones.filter(c => c.persona === id && abierta(c)).length;
  return e;
}
const NOMBRES = { contactos: 'Contactos', polizas: 'Pólizas', gestiones: 'Gestiones', tareas: 'Tareas', notas: 'Notas' };
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    const sinScroll = () => P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    const pestanas = () => P.$$eval('.pestanas a', xs => xs.map(x => ({ visible: [...x.childNodes].filter(n => !(n.classList && n.classList.contains('sr'))).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim(), sr: (x.querySelector('.sr') || {}).textContent || '' })));
    await T.perfil('man');

    // 1 · Los contadores coinciden con el recuento de activos en empresas y personas
    for (const [tipo, id] of [['empresa', 'e1'], ['empresa', 'e2'], ['empresa', 'e3'], ['persona', 'p01'], ['persona', 'p02']]) {
      await T.ir(`#/${tipo}/${id}/resumen`); const d = await T.estado(), esp = esperado(d, tipo, id), ps = await pestanas();
      const mal = Object.entries(esp).filter(([k, n]) => !ps.some(p => p.visible === `${NOMBRES[k]} (${n})`)).map(([k, n]) => `${NOMBRES[k]} (${n})`);
      ok(`V9-1.${id}${sfx}`, `${tipo} ${id}: cada pestaña muestra sus activos`, !mal.length, `faltan ${mal.join(', ')} en ${ps.map(p => p.visible).join(' | ')}`);
      ok(`V9-1.sin-otros.${id}${sfx}`, `${tipo} ${id}: Resumen, Riesgos e Historial no llevan contador`, ps.filter(p => /^(Resumen|Riesgos|Historial|Vehículos|Comunicación)/.test(p.visible)).every(p => !/\(\d+\)/.test(p.visible)));
      ok(`V9-1.sr.${id}${sfx}`, `${tipo} ${id}: el lector de pantalla oye qué cuenta el número`, ps.filter(p => /\(\d+\)/.test(p.visible)).every(p => /^, \d+ (activos?|vigentes?|en curso|pendientes?|activas?)$/.test(p.sr)), ps.map(p => p.sr).join('|'));
    }
    // Una tarea hecha deja de contar.
    { await T.ir('#/empresa/e1/tareas'); let d = await T.estado(); const t = d.tareas.find(t => t.obj && t.obj.tipo === 'empresa' && t.obj.id === 'e1' && t.estado !== 'hecha');
      if (t) { const antes = esperado(d, 'empresa', 'e1').tareas; await P.evaluate(id => { const x = S.d.tareas.find(t => t.id === id); x.estado = 'hecha'; render(); }, t.id); await P.waitForTimeout(40);
        ok('V9-1.tarea-hecha' + sfx, 'Al terminar una tarea, el contador de Tareas baja', (await pestanas()).some(p => p.visible === `Tareas (${antes - 1})`)); }
      await P.evaluate(() => window.__brokeros.reiniciar()); await T.perfil('man'); }

    // 2 · Archivar y restaurar notas
    await T.ir('#/empresa/e1/notas');
    { const d = await T.estado(); const act = esperado(d, 'empresa', 'e1').notas, arch = d.notas.filter(n => n.obj.id === 'e1' && n.archivada).length;
      ok('V9-2.semilla' + sfx, 'Bodega Cerro Liso trae una nota archivada que no cuenta', arch === 1 && (await pestanas()).some(p => p.visible === `Notas (${act})`));
      ok('V9-2.lista-aparte' + sfx, 'Las archivadas van en una lista aparte, plegada', (await P.locator('[data-notas-archivadas]').count()) === 1 && !(await P.locator('[data-notas-archivadas]').evaluate(x => x.open)) && /Notas archivadas \(1\)/.test(await T.texto('[data-notas-archivadas] summary')));
      const id = await P.locator('.notas-lista:not(.notas-archivadas *) .nota-i').nth(1).getAttribute('data-nota');
      await P.locator(`[data-nota="${id}"]`).getByRole('button', { name: 'Archivar' }).click(); await P.waitForTimeout(60);
      const d2 = await T.estado(), n = d2.notas.find(x => x.id === id);
      ok('V9-2.archiva' + sfx, 'Archivar guarda quién y cuándo', n.archivada && n.archivada.por === 'man' && !n.fijada);
      ok('V9-2.contador' + sfx, 'El contador de Notas baja en uno', (await pestanas()).some(p => p.visible === `Notas (${act - 1})`));
      ok('V9-2.mueve' + sfx, 'La nota pasa a la lista de archivadas', (await P.locator(`[data-notas-archivadas] [data-nota="${id}"]`).count()) === 1 && /Notas archivadas \(2\)/.test(await T.texto('[data-notas-archivadas] summary')));
      const ev = d2.eventos[d2.eventos.length - 1]; const txt = n.texto.slice(0, 20);
      ok('V9-2.evento' + sfx, 'El registro dice que se archivó sin copiar el texto ni vincularla a la organización', /Archivó una nota/.test(ev.accion) && !ev.org && !JSON.stringify(ev).includes(txt), JSON.stringify(ev));
      await P.locator('[data-notas-archivadas] summary').click();
      const v = await AXE(P); ok('V9-A11Y.archivadas' + sfx, 'axe WCAG 2.2 A/AA sin violaciones con las archivadas abiertas', !v.length, v.join(' '));
      ok('V9-SCROLL.archivadas' + sfx, 'Sin desplazamiento horizontal', await sinScroll());
      await T.foto('V9-notas-archivadas');
      await P.locator(`[data-notas-archivadas] [data-nota="${id}"]`).getByRole('button', { name: 'Restaurar' }).click(); await P.waitForTimeout(60);
      ok('V9-2.restaura' + sfx, 'Restaurar la devuelve a las activas y al contador', !(await T.estado()).notas.find(x => x.id === id).archivada && (await pestanas()).some(p => p.visible === `Notas (${act})`) && (await P.locator(`[data-notas-archivadas] [data-nota="${id}"]`).count()) === 0);
      await P.reload(); await P.waitForSelector('#root > *'); await T.ir('#/empresa/e1/notas');
      ok('V9-2.persiste' + sfx, 'Lo archivado persiste tras recargar', /Notas archivadas \(1\)/.test(await T.texto('[data-notas-archivadas] summary'))); }
    // Una nota nueva cuenta en la pestaña.
    { const antes = esperado(await T.estado(), 'persona', 'p01').notas; await T.ir('#/persona/p01/notas'); await T.boton('Nueva nota'); await T.llenar('[data-notas] textarea', 'Prueba v9'); await P.locator('[data-notas] button[type=submit]').click(); await P.waitForTimeout(60);
      ok('V9-2.nueva' + sfx, 'Una nota nueva suma al contador', (await pestanas()).some(p => p.visible === `Notas (${antes + 1})`)); }
    // Aislamiento: solo el equipo archiva.
    { const nid = (await T.estado()).notas.find(n => n.obj.id === 'e1' && !n.archivada).id;
      await T.perfil('pcl'); ok('V9-2.portal' + sfx, 'El portal no puede archivar notas', !(await T.act('archivarNota', { id: nid })).ok);
      await T.perfil('r1'); ok('V9-2.r1' + sfx, 'El revisor (R1) no puede archivar notas', !(await T.act('archivarNota', { id: nid })).ok);
      await T.ir('#/empresa/e1/notas'); ok('V9-2.r1-ruta' + sfx, 'R1 no ve las archivadas por URL', !/esperar antes de cotizar|Notas archivadas/.test(await T.texto('#root')));
      await T.perfil('pcl'); await T.ir('#/portal/e1/resumen'); ok('V9-2.portal-ve' + sfx, 'El portal no ve notas archivadas', !/esperar antes de cotizar|Notas archivadas/.test(await T.texto('#root'))); }

    // 3 · Accesibilidad y diseño de las pestañas con contador
    await T.perfil('man');
    for (const r of ['#/empresa/e1/contactos', '#/empresa/e2/gestiones', '#/persona/p01/polizas', '#/empresa/e1/notas']) {
      await T.ir(r); const v = await AXE(P);
      ok(`V9-A11Y${r.replace(/\W+/g, '_')}${sfx}`, `axe WCAG 2.2 A/AA sin violaciones en ${r}`, !v.length, v.join(' '));
      ok(`V9-SCROLL${r.replace(/\W+/g, '_')}${sfx}`, `Sin desplazamiento horizontal en ${r}`, await sinScroll());
    }
    await T.ir('#/empresa/e1/contactos'); await T.foto('V9-pestanas-empresa');
    ok('V9.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('fichas-v9');
})();
