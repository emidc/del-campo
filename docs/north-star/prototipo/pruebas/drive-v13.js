// v13 · Pedido de Emiliano del 30/10: el resumen de personas y empresas tiene un enlace a la carpeta del cliente en Google Drive.
// Es simulado: abre una carpeta de demostración dentro del prototipo y no sale a Drive.
// v13.1 · La empresa ve su propia carpeta desde el portal (respuesta de Emiliano del 30/10); nunca la de otra.
const { iniciar, ok, informe } = require('./lib');
const AXE = async P => { await P.addScriptTag({ url: '/axe.js' }); return P.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map(v => v.id + ':' + v.nodes.length)); };
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    const sinScroll = () => P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    const salidas = []; P.on('request', r => { if (/drive\.google/.test(r.url())) salidas.push(r.url()); });

    // 1 · El enlace está en el resumen de empresas y personas, para todo el equipo
    for (const p of ['man', 'eva', 'vic', 'luc', 'jim', 'pil', 'mat', 'emi']) {
      await T.perfil(p);
      for (const [tipo, id] of [['empresa', 'e1'], ['persona', 'p01']]) {
        await T.ir(`#/${tipo}/${id}/resumen`); const d = await T.estado(); const o = (tipo === 'empresa' ? d.empresas : d.personas).find(x => x.id === id);
        if (!(await P.locator('.contenido h1').count()) || /Sin acceso|no puede ver/.test(await T.texto('.contenido'))) continue;
        const fila = await P.locator(`[data-drive="${id}"]`).count();
        const dt = fila ? await P.locator(`[data-drive="${id}"]`).evaluate(b => b.closest('dd').previousElementSibling.innerText) : '';
        ok(`V13-1.${p}.${id}${sfx}`, `${p}: el resumen de ${o.nombre} tiene la carpeta de Drive marcada como Simulado`, fila === 1 && /Carpeta en Google Drive/.test(dt) && /Simulado/.test(dt), dt);
      }
    }
    await T.perfil('man');
    for (const id of ['e2', 'e3', 'p02', 'p05']) { await T.ir(`#/${id[0] === 'e' ? 'empresa' : 'persona'}/${id}/resumen`); ok(`V13-1.man.${id}${sfx}`, `Manuel ve la carpeta de ${id}`, (await P.locator(`[data-drive="${id}"]`).count()) === 1); }

    // 2 · Abre una carpeta de demostración con la ubicación y la dirección ficticia
    await T.ir('#/empresa/e1/resumen'); const evAntes = (await T.estado()).eventos.length; await P.locator('[data-drive="e1"]').click(); await P.waitForTimeout(80);
    { const t = await T.texto('[data-modal="drive"]');
      ok('V13-2.abre' + sfx, 'Pulsar el enlace abre la carpeta de demostración', /Carpeta de demostración/i.test(t) && /Bodega Cerro Liso/.test(t));
      ok('V13-2.ruta' + sfx, 'Muestra la ubicación y una dirección ficticia', /Clientes \/ Empresas \/ Bodega Cerro Liso S\.A\./.test(t) && /drive\.google\.com\/drive\/folders\/demo-e1/.test(t));
      ok('V13-2.simulado' + sfx, 'Aclara que es simulado y ficticio', /Simulado/.test(t) && /ficticia/.test(t) && /ficticio/i.test(t));
      const d = await T.estado(); const n = d.polizas.filter(p => p.tomador === 'e1' && p.doc !== 'sin_documento').length;
      ok('V13-2.polizas' + sfx, 'La subcarpeta Pólizas cuenta los documentos del cliente', new RegExp(`Pólizas\\s+${n} archivo`).test(t), t.match(/Pólizas\s+\S+ \S+/));
      const v = await AXE(P); ok('V13-A11Y.modal' + sfx, 'axe WCAG 2.2 A/AA sin violaciones con la carpeta abierta', !v.length, v.join(' '));
      ok('V13-SCROLL.modal' + sfx, 'Sin desplazamiento horizontal con la carpeta abierta', await sinScroll());
      await T.foto('V13-drive-carpeta');
      await P.keyboard.press('Escape'); await P.waitForTimeout(60);
      ok('V13-2.cierra' + sfx, 'Escape cierra la carpeta', (await P.locator('[data-modal="drive"]').count()) === 0); }
    await T.ir('#/persona/p01/resumen'); await P.locator('[data-drive="p01"]').click(); await P.waitForTimeout(80);
    ok('V13-2.persona' + sfx, 'La carpeta de una persona va en Clientes / Personas', /Clientes \/ Personas \/ Martín Sosa/.test(await T.texto('[data-modal="drive"]')));
    await P.keyboard.press('Escape'); await P.waitForTimeout(40);
    ok('V13-2.no-sale' + sfx, 'Nunca navega ni pide nada a Drive', !salidas.length && !(await P.locator('a[href*="drive.google"]').count()), salidas.join());
    ok('V13-2.sin-evento' + sfx, 'Abrir la carpeta no registra eventos ni cambia el estado', (await T.estado()).eventos.length === evAntes);

    // 3 · Portal (v13.1, pedido de Emiliano del 30/10): cada empresa ve solo su propia carpeta; R1 no la ve
    for (const [pp, mia, otra] of [['pcl', 'e1', 'e3'], ['pqa', 'e3', 'e1']]) {
      await T.perfil(pp); await T.ir(`#/portal/${mia}/resumen`);
      const ids = await P.$$eval('[data-drive]', xs => xs.map(x => x.dataset.drive));
      ok(`V13-3.${pp}.ve${sfx}`, `${pp}: el resumen del portal muestra su carpeta, marcada Simulado`, ids.join() === mia && /Simulado/.test(await T.texto('[data-drive-portal]')), ids.join());
      await P.locator(`[data-drive="${mia}"]`).click(); await P.waitForTimeout(80);
      const t = await T.texto('[data-modal="drive"]'); const d = await T.estado(); const nom = d.empresas.find(e => e.id === mia).nombre;
      ok(`V13-3.${pp}.abre${sfx}`, `${pp}: abre la carpeta de su empresa`, t.includes(nom) && /Simulado/.test(t) && new RegExp(`demo-${mia}\\b`).test(t), t.slice(0, 120));
      if (pp === 'pcl') { const v = await AXE(P); ok('V13-A11Y.portal-modal' + sfx, 'axe WCAG 2.2 A/AA sin violaciones con la carpeta abierta en el portal', !v.length, v.join(' ')); await T.foto('V13-drive-portal-carpeta'); }
      await P.keyboard.press('Escape'); await P.waitForTimeout(40);
      if (pp === 'pcl') { const v = await AXE(P); ok('V13-A11Y.portal' + sfx, 'axe WCAG 2.2 A/AA sin violaciones en el resumen del portal', !v.length, v.join(' ')); ok('V13-SCROLL.portal' + sfx, 'Sin desplazamiento horizontal en el portal', await sinScroll()); await T.foto('V13-drive-portal'); }
      // Otra empresa: ni por URL ni forzando el modal.
      await T.ir(`#/portal/${otra}/resumen`); ok(`V13-3.${pp}.otra-url${sfx}`, `${pp}: no ve la carpeta de otra empresa por URL`, !(await P.locator('[data-drive]').count()));
      await T.ir(`#/portal/${mia}/resumen`); await P.evaluate(o => { UI.modal = { tipo: 'drive', obj: { tipo: 'empresa', id: o } }; render(); }, otra); await P.waitForTimeout(40);
      const t2 = await T.texto('[data-modal="drive"]'); const nomOtra = d.empresas.find(e => e.id === otra).nombre;
      ok(`V13-3.${pp}.otra-modal${sfx}`, `${pp}: forzar la carpeta de otra empresa muestra «Sin acceso»`, /Sin acceso/.test(t2) && !t2.includes(nomOtra) && !t2.includes('demo-' + otra), t2);
      await P.evaluate(() => { UI.modal = { tipo: 'drive', obj: { tipo: 'persona', id: 'p01' } }; render(); }); await P.waitForTimeout(40);
      ok(`V13-3.${pp}.persona-modal${sfx}`, `${pp}: tampoco ve la carpeta de una persona`, /Sin acceso/.test(await T.texto('[data-modal="drive"]')));
      await P.keyboard.press('Escape'); await P.waitForTimeout(40);
    }
    await T.perfil('r1'); await T.ir('#/empresa/e2/resumen'); ok('V13-3.r1' + sfx, 'El revisor (R1) no ve la carpeta de Drive', !(await P.locator('[data-drive]').count()));
    await P.evaluate(() => { UI.modal = { tipo: 'drive', obj: { tipo: 'empresa', id: 'e2' } }; render(); }); await P.waitForTimeout(40);
    ok('V13-3.r1-modal' + sfx, 'R1 forzando el modal ve «Sin acceso»', /Sin acceso/.test(await T.texto('[data-modal="drive"]')));
    await P.keyboard.press('Escape'); await P.waitForTimeout(40);
    ok('V13-3.no-sale' + sfx, 'El portal tampoco pide nada a Drive', !salidas.length, salidas.join());

    // 4 · Accesibilidad y diseño
    await T.perfil('man');
    for (const r of ['#/empresa/e1/resumen', '#/persona/p01/resumen', '#/persona/p05/resumen']) {
      await T.ir(r); const v = await AXE(P);
      ok(`V13-A11Y${r.replace(/\W+/g, '_')}${sfx}`, `axe WCAG 2.2 A/AA sin violaciones en ${r}`, !v.length, v.join(' '));
      ok(`V13-SCROLL${r.replace(/\W+/g, '_')}${sfx}`, `Sin desplazamiento horizontal en ${r}`, await sinScroll());
      const alto = await P.locator('[data-drive]').evaluate(b => b.getBoundingClientRect().height); ok(`V13-OBJ${r.replace(/\W+/g, '_')}${sfx}`, 'El enlace mide al menos 24 px de alto', alto >= 24, alto);
    }
    await T.ir('#/empresa/e1/resumen'); await T.foto('V13-drive-resumen-empresa');
    ok('V13.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('drive-v13');
})();
