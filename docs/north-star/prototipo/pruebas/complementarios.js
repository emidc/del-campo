// Criterios sin script propio en los recorridos: AM-02 (inicio por perfil), AM-05 (pólizas), AM-06 (búsqueda con filtros),
// AM-09 (comunicación ligada a la persona), AM-13 (riesgo ↔ zona), AM-28 (brecha y rótulo de prototipo).
const { iniciar, ok, informe } = require('./lib');
(async () => {
  for (const movil of [false, true]) {
    const T = await iniciar({ movil }); const P = T.page; const s = movil ? '-movil' : '';
    // AM-02: el «Hoy» de cada perfil del equipo tiene bloques e ítems distintos.
    const firmas = {};
    for (const p of ['man', 'eva', 'vic', 'luc', 'jim', 'pil', 'mat', 'emi']) {
      await T.perfil(p); await T.ir('#/inicio');
      firmas[p] = await P.evaluate(() => { const c = document.querySelector('.contenido'); return { bloques: [...c.querySelectorAll('h2')].map(x => x.textContent.trim()).join('|'), items: [...c.querySelectorAll('.item .t1, .item strong')].map(x => x.textContent.trim()).join('|') }; });
    }
    const vals = Object.values(firmas).map(f => f.bloques + '#' + f.items);
    ok('AM-02.distinto' + s, 'Ocho perfiles del equipo: ningún par de inicios tiene los mismos bloques e ítems', new Set(vals).size === 8, JSON.stringify(Object.fromEntries(Object.entries(firmas).map(([k, v]) => [k, v.bloques]))).slice(0, 600));
    await T.perfil('r1'); await T.ir('#/inicio'); const r1 = await T.texto('.contenido');
    ok('AM-02.r1' + s, 'El inicio del revisor (R1) es propio: empresas asignadas y orden previo', /orden previo/i.test(r1), r1.slice(0, 200));

    // AM-05: póliza por número exacto y parcial, documento de demo, tres estados del documento.
    await T.perfil('eva'); await T.ir('#/polizas');
    const d0 = await T.estado(); const pol = d0.polizas[0];
    await T.llenar('#f-pol', pol.numero.toLowerCase()); await P.waitForTimeout(80);
    let t = await T.texto('.contenido');
    ok('AM-05.exacto' + s, `Número exacto ${pol.numero}: coincidencia exacta`, /Coincidencia exacta/.test(t) && t.includes(pol.numero));
    const parcial = pol.numero.replace(/\D/g, '').slice(-4);
    await T.llenar('#f-pol', parcial); await P.waitForTimeout(80); t = await T.texto('.contenido');
    const esperadas = d0.polizas.filter(p => p.numero.toLowerCase().includes(parcial)).map(p => p.numero);
    ok('AM-05.parcial' + s, `Número parcial «${parcial}» encuentra la póliza`, t.includes(pol.numero) && esperadas.every(n => t.includes(n)) && !/Coincidencia exacta/.test(t), esperadas.join(', '));
    await T.llenar('#f-pol', 'ZZZ-0000'); await P.waitForTimeout(80); t = await T.texto('.contenido');
    ok('AM-05.vacio' + s, 'Sin resultados explica qué hacer', /Sin resultados/.test(t) && /Revisá el número/.test(t));
    await T.llenar('#f-pol', ''); await P.waitForTimeout(80); t = await T.texto('.contenido');
    ok('AM-05.estados' + s, 'Los tres estados del documento se ven con símbolo y texto', /Comprobado/.test(t) && /Sin comprobar/.test(t) && /Sin documento/.test(t));
    const conDoc = d0.polizas.find(p => p.doc === 'comprobado');
    await T.ir('#/poliza/' + conDoc.id); await T.boton('Abrir documento'); t = await T.texto('[role=dialog]');
    ok('AM-05.doc' + s, 'Documento de demo abre con la leyenda de ficticio', /ficticio|demo/i.test(t) && t.includes(conDoc.numero), t.slice(0, 160));
    await P.keyboard.press('Escape'); await P.evaluate(() => { UI.modal = null; render(); });
    const sinDoc = d0.polizas.find(p => p.doc === 'sin_documento');
    await T.ir('#/poliza/' + sinDoc.id); t = await T.texto('.contenido');
    ok('AM-05.sin-doc' + s, 'Póliza sin documento ofrece pedirlo a la compañía', /Pedir a la compañía/.test(t));
    const sinC = d0.polizas.find(p => p.doc === 'sin_comprobar');
    await T.ir('#/poliza/' + sinC.id); t = await T.texto('.contenido');
    ok('AM-05.sin-comprobar' + s, 'Documento sin comprobar lo avisa', /nadie comprobó/.test(t));

    // AM-06: búsqueda global con filtros de tipo y estado.
    await T.perfil('man'); await T.ir('#/inicio');
    await P.evaluate(() => { UI_HANDLERS.buscar(); render(); }); await P.waitForTimeout(40);
    await T.llenar('#q-global', 'funes'); await P.waitForTimeout(80);
    const grupos = () => P.evaluate(() => [...document.querySelectorAll('[data-resultados] h3')].map(x => x.textContent));
    const g1 = await grupos();
    await P.selectOption('#q-tipo', 'persona'); await P.waitForTimeout(80); const g2 = await grupos();
    ok('AM-06.tipo' + s, 'Filtro por tipo deja solo personas', g1.length > 1 && g2.length === 1 && g2[0] === 'Persona', `${g1.join(',')} → ${g2.join(',')}`);
    await P.selectOption('#q-tipo', 'poliza'); await P.fill('#q-global', 'alt'); await P.waitForTimeout(60);
    const nTodas = await P.locator('[data-resultados] .item').count();
    await P.selectOption('#q-estado', 'vence_mes'); await P.waitForTimeout(80);
    const nMes = await P.locator('[data-resultados] .item').count();
    const esperadoMes = await P.evaluate(() => resultadosBusqueda('alt', 'poliza', 'vence_mes').length);
    ok('AM-06.estado' + s, 'Filtro de estado «vence este mes» reduce las pólizas', nMes < nTodas && nMes === esperadoMes && nMes > 0, `${nTodas} → ${nMes}`);
    await P.evaluate(() => { UI.buscar = null; render(); });
    await T.ir('#/clientes/personas'); t = await T.texto('.contenido');
    ok('AM-06.clientes' + s, 'Clientes lista personas con acceso a la ficha', (await P.locator('.contenido a[href^="#/persona/"]').count()) >= 10);
    await T.ir('#/persona/p01/resumen'); t = await T.texto('.contenido');
    const tabsP = await P.evaluate(() => [...document.querySelectorAll('[role=tablist] a, nav.pestanas a, .pestanas a')].map(a => a.textContent.trim()).join('|'));
    ok('AM-06.ficha' + s, 'Ficha completa: resumen, pólizas, vehículos, comunicación, gestiones, tareas, historial', ['Resumen', 'Pólizas', 'Vehículos', 'Comunicación', 'Gestiones', 'Tareas', 'Historial'].every(x => tabsP.includes(x)), tabsP);

    // AM-09: WhatsApp y correo ligados a la persona; sin identificar aparte.
    const d1 = await T.estado();
    const pw = d1.conversaciones.find(c => c.canal === 'whatsapp' && d1.conversaciones.some(o => o.persona === c.persona && o.canal === 'correo'));
    const pid = pw ? pw.persona : d1.conversaciones[0].persona;
    await T.ir(`#/persona/${pid}/comunicacion`); t = await T.texto('.contenido');
    const convs = d1.conversaciones.filter(c => c.persona === pid);
    ok('AM-09.persona' + s, 'La ficha de la persona muestra sus conversaciones de WhatsApp y correo', convs.every(c => t.includes(c.mensajes[c.mensajes.length - 1].texto.slice(0, 30))) && (!pw || (/WhatsApp/.test(t) && /Correo/i.test(t))), `${pid}: ${convs.map(c => c.canal).join(',')}`);
    await T.ir('#/comunicacion/sinidentificar'); const nSI = await P.locator('[data-sinidentificar]').count();
    ok('AM-09.sinidentificar' + s, 'Los mensajes sin identificar viven en su propia bandeja', nSI === d1.sinIdentificar.length && nSI > 0, nSI);

    // AM-13: plan, transferencia y layout con zonas vinculadas; riesgo ↔ zona en los dos sentidos.
    const rz = d1.riesgos.find(r => r.org === d1.empresas[0].org && r.zona && r.tipo !== 'sub') || d1.riesgos.find(r => r.zona && r.tipo !== 'sub');
    const e = d1.empresas.find(x => x.org === rz.org);
    await T.ir(`#/empresa/${e.id}/riesgos/matriz?r=${rz.id}`);
    await P.locator('[data-ver-zona]').first().click(); await P.waitForTimeout(60);
    const zsel = await P.evaluate(() => (document.querySelector('[data-zona][aria-current="true"]') || {}).dataset);
    const rmarc = await P.evaluate(() => (document.querySelector('[data-zona-detalle] a[aria-current="true"]') || {}).textContent || '');
    ok('AM-13.riesgo-zona' + s, 'Elegir un riesgo resalta su zona en el layout y el riesgo dentro de ella', zsel && zsel.zona === rz.zona && rmarc.includes(rz.titulo), `${zsel && zsel.zona} / ${rmarc}`);
    const otraZ = d1.zonas.find(z => z.org === rz.org && z.id !== rz.zona && d1.riesgos.some(r => r.zona === z.id && r.tipo !== 'sub'));
    await P.locator(`[data-zona="${otraZ.id}"] .zona-t`).click(); await P.waitForTimeout(60); /* v4: la zona se elige por su rótulo en el plano (el centro puede tener pines) */ t = await T.texto('[data-zona-detalle]');
    const rsOtra = d1.riesgos.filter(r => r.zona === otraZ.id && r.tipo !== 'sub');
    ok('AM-13.zona-riesgo' + s, 'Elegir una zona muestra sus riesgos y acciones', rsOtra.every(r => t.includes(r.titulo)) && /Acciones/.test(t), otraZ.nombre);
    await T.ir(`#/empresa/${e.id}/riesgos/plan`); t = await T.texto('.contenido');
    ok('AM-13.plan' + s, 'El plan nombra la zona de cada acción', d1.acciones.filter(a => a.org === rz.org && a.zona).every(a => t.includes((d1.zonas.find(z => z.id === a.zona) || {}).nombre || '¿?')));

    // AV-14: reasignar exige motivo.
    await T.perfil('man'); const sinMotivo = await T.act('tareaReasignar', { id: 't02', a: 'man', comentario: '  ', destrabar: '1' });
    ok('AV-14.motivo' + s, 'Reasignar sin comentario se rechaza y la tarea no cambia', sinMotivo && sinMotivo.ok === false && (await T.estado()).tareas.find(t => t.id === 't02').resp !== 'man', JSON.stringify(sinMotivo).slice(0, 120));
    await T.ir('#/inicio/equipo'); ok('AV-14.required' + s, 'El campo de comentario de la vista de equipo es obligatorio', (await P.locator('form[data-form="tareaReasignar"] [name="comentario"][required]').count()) > 0);
    // AM-28: rótulo de prototipo en toda pantalla y nota de brecha por área.
    const AREAS = [['man', '#/inicio'], ['man', '#/comunicacion/whatsapp'], ['man', '#/persona/p01/comunicacion'], ['man', '#/empresa/e1/riesgos/matriz'], ['jim', '#/gestiones/facturacion'], ['pil', '#/siniestro/sin1'], ['eva', '#/automatizaciones'], ['emi', '#/importacion/expedientes'], ['pcl', '#/portal/e1/resumen']];
    const faltan = [];
    for (const [p, r] of AREAS) { await T.perfil(p); await T.ir(r); const x = await P.evaluate(() => ({ franja: /PROTOTIPO/.test(document.body.innerText) && /no es software de producción/.test(document.body.innerText), brecha: !!document.querySelector('details.brecha') })); if (!x.franja || !x.brecha) faltan.push(`${p} ${r} ${JSON.stringify(x)}`); }
    ok('AM-28.areas' + s, `Rótulo de prototipo y «Brecha a producción» en ${AREAS.length} áreas`, !faltan.length, faltan.join(' ; '));
    await T.perfil('man'); await T.ir('#/demo/acerca'); t = await T.texto('.contenido');
    ok('AM-28.tabla' + s, 'Tabla de brecha hacia producción en «Acerca del prototipo»', (await P.locator('[data-brecha] tbody tr').count()) >= 6);
    ok('CO.err' + s, 'Sin errores de JavaScript', !T.errores.length, T.errores.slice(0, 3).join(' | '));
    await T.cerrar();
  }
  informe('complementarios');
})();
