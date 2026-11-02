// v17 · Pedido de Emiliano del 30/10: en la pestaña Gestiones de la ficha, el equipo inicia una gestión (siniestro o
// cotización) y después carga sus avances a mano. Personas y empresas. Simulado.
const { iniciar, ok, informe } = require('./lib');
const AXE = async P => { await P.addScriptTag({ url: '/axe.js' }); return P.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map(v => v.id + ':' + v.nodes.length)); };
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    const sinScroll = () => P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    const gm = async () => (await T.estado()).gestionesManuales || [];
    const tabN = async () => (await P.locator('.pestanas a[aria-current=page]').innerText()).replace(/\s+/g, ' ');
    const enviar = async m => { await P.locator(`[data-modal="${m}"] button[type="submit"]`).click(); await P.waitForTimeout(80); };

    // 1 · Martín Sosa (p01) sin gestiones: la pestaña ofrece «Iniciar gestión» y conserva el vacío
    await T.perfil('vic'); await T.ir('#/persona/p01/gestiones');
    { const t = await T.texto('[data-gestiones-ficha]');
      ok('V17-1.vacio' + sfx, 'Sin gestiones: se ve el vacío y el botón «Iniciar gestión»', /Sin gestiones/.test(t) && /Iniciar gestión/.test(t), t);
      ok('V17-1.tab0' + sfx, 'La pestaña dice Gestiones (0)', /Gestiones \(0\)/.test(await tabN()), await tabN());
      const v = await AXE(P); ok('V17-A11Y.vacio' + sfx, 'axe WCAG 2.2 sin violaciones en la pestaña vacía', !v.length, v.join(' ')); }

    // 2 · El modal: tipo, asunto, póliza del cliente, compañía, responsable y primer avance
    await T.boton('Iniciar gestión');
    { const t = await T.texto('[data-modal="iniciarGestion"]');
      ok('V17-2.modal' + sfx, 'El modal explica la carga manual y está marcado como simulado', /Iniciar gestión/.test(t) && /Simulado/.test(t) && /Cargar avance/.test(t), t);
      ok('V17-2.foco' + sfx, 'El foco entra al campo «De qué se trata»', await P.evaluate(() => document.activeElement && document.activeElement.id === 'gi-tit'));
      const pols = await P.locator('#gi-pol option').evaluateAll(o => o.map(x => x.value));
      ok('V17-2.polizas' + sfx, 'Ofrece solo las pólizas de Martín (pol03 y pol04) y «sin póliza»', pols.join(',') === ',pol03,pol04', pols.join(','));
      const resp = await P.locator('#gi-resp option').evaluateAll(o => o.map(x => x.value));
      ok('V17-2.resp' + sfx, 'Responsable: el equipo que atiende clientes y Emiliano (v22); preselecciona a Victoria', resp.includes('emi') && !resp.includes('r1') && resp.includes('pil') && (await P.inputValue('#gi-resp')) === 'vic', resp.join(','));
      const v = await AXE(P); ok('V17-A11Y.modal' + sfx, 'axe sin violaciones con el modal de inicio abierto', !v.length, v.join(' '));
      ok('V17-SCROLL.modal' + sfx, 'Sin desplazamiento horizontal con el modal abierto', await sinScroll());
      await T.foto('V17-iniciar-modal', false); }
    // Validaciones: sin asunto no inicia; siniestro sin póliza no inicia si el cliente tiene pólizas
    await enviar('iniciarGestion');
    ok('V17-2.requerido' + sfx, 'Sin asunto no se inicia', (await gm()).length === 0 && (await P.locator('[data-modal="iniciarGestion"]').count()) === 1);
    await T.llenar('#gi-tit', 'Choque en estacionamiento'); await T.llenar('#gi-txt', 'Avisó por WhatsApp. Tarjeta 4509 9535 6623 3704 para el pago.');
    await enviar('iniciarGestion');
    ok('V17-2.sinPoliza' + sfx, 'Un siniestro sin póliza se rechaza y el formulario conserva lo escrito', (await gm()).length === 0 && (await P.inputValue('#gi-tit')) === 'Choque en estacionamiento');
    await P.selectOption('#gi-pol', 'pol03'); await P.selectOption('#gi-resp', 'pil'); await P.fill('#gi-desde', '2026-10-28');
    await enviar('iniciarGestion');
    { const g = (await gm())[0], d = await T.estado();
      ok('V17-2.creada' + sfx, 'Queda un siniestro en curso de Martín, póliza pol03, compañía de la póliza, responsable Pilar', g && g.tipo === 'siniestro' && g.obj.id === 'p01' && g.poliza === 'pol03' && g.compania === 'Altomira Seguros' && g.resp === 'pil' && g.estado === 'en_curso' && g.desde === '2026-10-28' && g.avances.every(a => a.fecha === '2026-10-28'), JSON.stringify(g));
      ok('V17-2.avances' + sfx, 'Tiene el avance de inicio y el primer avance, sin datos de tarjeta', g && g.avances.length === 2 && !/4509/.test(JSON.stringify(g)), g && JSON.stringify(g.avances));
      ok('V17-2.aviso' + sfx, 'Pilar recibe un aviso', d.notificaciones.some(n => n.para === 'pil' && /te asignó el siniestro «Choque en estacionamiento» de Martín Sosa/.test(n.titulo)));
      ok('V17-2.evento' + sfx, 'Queda un evento en el historial de Martín, sin el texto del avance', d.eventos.some(e => e.objeto === 'p01' && /Inició un siniestro de Martín Sosa/.test(e.accion) && !/WhatsApp/.test(JSON.stringify(e))));
      ok('V17-2.cerro' + sfx, 'El modal se cierra', (await P.locator('[data-modal="iniciarGestion"]').count()) === 0);
      ok('V17-2.tab1' + sfx, 'La pestaña pasa a Gestiones (1)', /Gestiones \(1\)/.test(await tabN()), await tabN());
      const t = await T.texto(`[data-gestion-manual="${g.id}"]`);
      ok('V17-2.tarjeta' + sfx, 'La tarjeta muestra tipo, asunto, estado, póliza, responsable, avances y Simulado', /Siniestro/i.test(t) && /Choque en estacionamiento/.test(t) && /En curso/.test(t) && /ALT-AU-560917/.test(t) && /Pilar/.test(t) && /28\/10\/2026 · cargada por Victoria el 02\/11\/2026/.test(t) && /Avances\s*\(2\)/.test(t) && /Simulado/.test(t), t);
      ok('V17-2.focoVuelta' + sfx, 'El foco queda en «Cargar avance» de la gestión nueva', await P.evaluate(id => document.activeElement && document.activeElement.id === 'gm-' + id, g.id));
      ok('V17-2.sinVacio' + sfx, 'Ya no se muestra «Sin gestiones»', !/Sin gestiones/.test(await T.texto('[data-gestiones-ficha]'))); }

    // 3 · Cargar avances a mano: texto, fecha (puede ser anterior), estado
    const gid = (await gm())[0].id;
    await P.locator(`#gm-${gid}`).click(); await P.waitForTimeout(60);
    { const t = await T.texto('[data-modal="avanceGestion"]');
      ok('V17-3.modal' + sfx, 'El modal de avance pide qué pasó, fecha y estado, y avisa a la responsable', /Cargar avance/.test(t) && /Qué pasó/.test(t) && /Fecha del avance/.test(t) && /Estado de la gestión/.test(t) && /Le avisamos a Pilar/.test(t), t);
      ok('V17-3.foco' + sfx, 'El foco entra al texto del avance', await P.evaluate(() => document.activeElement && document.activeElement.id === 'ga-txt'));
      ok('V17-3.max' + sfx, 'La fecha va del inicio de la gestión a hoy (min 28/10, max = hoy)', (await P.getAttribute('#ga-f', 'max')) === (await P.evaluate(() => TODAY)) && (await P.getAttribute('#ga-f', 'min')) === '2026-10-28');
      const v = await AXE(P); ok('V17-A11Y.avance' + sfx, 'axe sin violaciones con el modal de avance abierto', !v.length, v.join(' ')); }
    await enviar('avanceGestion');
    ok('V17-3.requerido' + sfx, 'Sin texto no se carga el avance', (await gm())[0].avances.length === 2);
    await T.llenar('#ga-txt', 'La compañía pidió fotos y presupuesto del taller.'); await P.fill('#ga-f', '2026-10-29'); await P.selectOption('#ga-e', 'espera');
    await enviar('avanceGestion');
    { const g = (await gm())[0], a = g.avances[g.avances.length - 1], d = await T.estado();
      ok('V17-3.cargado' + sfx, 'Se guarda el avance con fecha 29/10, autora Victoria y la gestión queda «Esperando a terceros»', a.fecha === '2026-10-29' && a.por === 'vic' && /fotos y presupuesto/.test(a.texto) && g.estado === 'espera', JSON.stringify(a));
      ok('V17-3.aviso' + sfx, 'Pilar recibe el aviso del avance', d.notificaciones.some(n => n.para === 'pil' && /cargó un avance en «Choque en estacionamiento»/.test(n.titulo)));
      ok('V17-3.evento' + sfx, 'Evento con la fecha y el cambio de estado', d.eventos.some(e => /Cargó un avance en el siniestro/.test(e.accion) && /29\/10\/2026/.test(e.efecto) && /esperando a terceros/.test(e.efecto)));
      const t = await T.texto(`[data-gestion-manual="${g.id}"]`);
      ok('V17-3.lista' + sfx, 'El avance aparece primero en la lista, con fecha, «cargado el» y el estado nuevo', /Avances\s*\(3\)/.test(t) && t.indexOf('fotos y presupuesto') < t.indexOf('Avisó por WhatsApp') && t.indexOf('Avisó por WhatsApp') < t.indexOf('Gestión iniciada') && /29\/10\/2026/.test(t) && /cargado el 02\/11\/2026/.test(t) && /Esperando a terceros/.test(t), t);
      ok('V17-3.focoVuelta' + sfx, 'El foco vuelve a «Cargar avance»', await P.evaluate(id => document.activeElement && document.activeElement.id === 'gm-' + id, g.id));
      ok('V17-SCROLL.tarjeta' + sfx, 'Sin desplazamiento horizontal con la gestión y sus avances', await sinScroll());
      const v = await AXE(P); ok('V17-A11Y.tarjeta' + sfx, 'axe sin violaciones con la gestión a la vista', !v.length, v.join(' '));
      await T.foto('V17-gestion-avances'); }
    { const r = await T.act('cargarAvance', { gestion: gid, texto: 'x', fecha: '2026-11-05', estado: 'en_curso' }); ok('V17-3.futura' + sfx, 'La acción rechaza una fecha futura', !r.ok, r.error); }
    { const r = await T.act('cargarAvance', { gestion: gid, texto: 'x', fecha: '2026-10-27', estado: 'en_curso' }); ok('V17-3.anterior' + sfx, 'La acción rechaza una fecha anterior al inicio', !r.ok && /28\/10\/2026/.test(r.error), r.error); }
    { const r = await T.act('iniciarGestion', { tipo: 'persona', id: 'p01', gtipo: 'cotizacion', titulo: 'x', resp: 'man', desde: '2026-12-01' }); ok('V17-3.inicioFuturo' + sfx, 'No se inicia con fecha futura', !r.ok, r.error); }

    // 4 · Cerrar y reabrir: la cerrada no cuenta en la pestaña y va a «Gestiones cerradas»
    await P.locator(`#gm-${gid}`).click(); await P.waitForTimeout(60);
    await T.llenar('#ga-txt', 'Pagó la compañía. Cerramos.'); await P.selectOption('#ga-e', 'cerrada'); await enviar('avanceGestion');
    { const g = (await gm())[0];
      ok('V17-4.cerrada' + sfx, 'La gestión queda cerrada, con quién y cuándo', g.estado === 'cerrada' && g.cerradaPor === 'vic' && !!g.cerrada);
      ok('V17-4.tab0' + sfx, 'La pestaña vuelve a Gestiones (0)', /Gestiones \(0\)/.test(await tabN()), await tabN());
      ok('V17-4.details' + sfx, 'Aparece en «Gestiones cerradas (1)»', /Gestiones cerradas \(1\)/.test(await T.texto('[data-gm-cerradas]')));
      ok('V17-4.foco' + sfx, 'Al cerrar, el foco queda en «Gestiones cerradas» (no en el cuerpo)', await P.evaluate(() => document.activeElement && document.activeElement.id === 'gm-cerradas')); }
    await P.locator('[data-gm-cerradas] summary').click(); await P.locator(`#gm-${gid}`).click(); await P.waitForTimeout(60);
    { ok('V17-4.reabrirModal' + sfx, 'Una cerrada se reabre con un avance; el estado sugerido es «En curso»', /Reabrir con un avance/.test(await T.texto('[data-modal="avanceGestion"]')) && (await P.inputValue('#ga-e')) === 'en_curso'); }
    await T.llenar('#ga-txt', 'El cliente reclama una diferencia en el pago.'); await enviar('avanceGestion');
    { const g = (await gm())[0], d = await T.estado();
      ok('V17-4.reabierta' + sfx, 'Queda en curso otra vez y cuenta en la pestaña', g.estado === 'en_curso' && !g.cerrada && /Gestiones \(1\)/.test(await tabN()));
      ok('V17-4.evento' + sfx, 'El evento dice que se reabre', d.eventos.some(e => /se reabre/.test(e.efecto || ''))); }

    // 5 · Cotización en una empresa (Bodega Cerro Liso, e1), por Lucía, sin póliza
    await T.perfil('luc'); await T.ir('#/empresa/e1/gestiones');
    ok('V17-5.vacio' + sfx, 'La empresa sin gestiones conserva su vacío y ofrece iniciar', /No hay cotizaciones ni gestiones abiertas/.test(await T.texto('[data-gestiones-ficha]')) && (await P.locator('#btn-iniciar-gestion').count()) === 1);
    await T.boton('Iniciar gestión');
    { const pols = await P.locator('#gi-pol option').evaluateAll(o => o.map(x => x.value)); ok('V17-5.polizas' + sfx, 'Ofrece las pólizas de la empresa', pols.join(',') === ',pol05,pol06,pol07', pols.join(',')); }
    await P.check('#gi-cotizacion'); await T.llenar('#gi-tit', 'Cotizar seguro de caución para licitación'); await T.llenar('#gi-cia', 'Nevado Seguros');
    await enviar('iniciarGestion');
    { const g = (await gm()).find(x => x.obj.id === 'e1'), d = await T.estado();
      ok('V17-5.creada' + sfx, 'Queda una cotización de la empresa, sin póliza, con la compañía escrita y Lucía responsable', g && g.tipo === 'cotizacion' && g.obj.tipo === 'empresa' && !g.poliza && g.compania === 'Nevado Seguros' && g.resp === 'luc', JSON.stringify(g));
      ok('V17-5.sinAviso' + sfx, 'Si la responsable es quien inicia, no se autoaviso', !d.notificaciones.some(n => n.para === 'luc' && /te asignó/.test(n.titulo)));
      ok('V17-5.tab' + sfx, 'La pestaña de la empresa dice Gestiones (1)', /Gestiones \(1\)/.test(await tabN()), await tabN());
      ok('V17-5.historial' + sfx, 'El evento queda en el historial de la empresa', d.eventos.some(e => e.objeto === 'e1' && /Inició una cotización de Bodega Cerro Liso/.test(e.accion)));
      ok('V17-5.sinOrg' + sfx, 'El evento no lleva la organización: no llega al portal de la empresa', d.eventos.filter(e => /Inició una cotización/.test(e.accion)).every(e => !e.org));
      const v = await AXE(P); ok('V17-A11Y.empresa' + sfx, 'axe sin violaciones en la pestaña de la empresa', !v.length, v.join(' '));
      ok('V17-SCROLL.empresa' + sfx, 'Sin desplazamiento horizontal en la empresa', await sinScroll()); }
    await T.ir('#/empresa/e1/historial');
    ok('V17-5.historialUI' + sfx, 'El historial de la empresa muestra el inicio', /Inició una cotización de Bodega Cerro Liso/.test(await T.texto()));

    // 6 · Permisos: v22, Emiliano también gestiona; las acciones se rechazan a quien no puede
    await T.perfil('emi'); await T.ir('#/persona/p01/gestiones');
    { const t = await T.texto('[data-gestiones-ficha]');
      ok('V17-6.emi' + sfx, 'Emiliano ve las gestiones con los botones de iniciar y cargar avance', /Choque en estacionamiento/.test(t) && (await P.locator('#btn-iniciar-gestion').count()) === 1 && (await P.getByRole('button', { name: 'Cargar avance' }).count()) > 0 && !/Emiliano ve en lectura/.test(t), t);
      const r1 = await T.act('iniciarGestion', { tipo: 'persona', id: 'p01', gtipo: 'cotizacion', titulo: 'Cotizar hogar (Emiliano)', resp: 'emi' });
      const r2 = await T.act('cargarAvance', { gestion: gid, texto: 'Emiliano llamó a la compañía', estado: 'en_curso' });
      ok('V17-6.accion' + sfx, 'Emiliano inicia una gestión (puede ser responsable) y carga un avance', r1.ok && r2.ok, [r1.error, r2.error].join(' | ')); }
    await T.perfil('r1');
    { const r = await T.act('iniciarGestion', { tipo: 'empresa', id: 'e1', gtipo: 'cotizacion', titulo: 'x', resp: 'man' }); ok('V17-6.r1' + sfx, 'El revisor externo no inicia gestiones', !r.ok, r.error); }
    await T.perfil('man');
    { const r = await T.act('iniciarGestion', { tipo: 'persona', id: 'p01', gtipo: 'siniestro', titulo: 'x', poliza: 'pol05', resp: 'man' }); ok('V17-6.polAjena' + sfx, 'No se acepta una póliza de otro cliente', !r.ok, r.error); }
    { const r = await T.act('iniciarGestion', { tipo: 'persona', id: 'p01', gtipo: 'cotizacion', titulo: 'x', resp: 'r1' }); ok('V17-6.respR1' + sfx, 'El revisor externo no puede ser responsable', !r.ok, r.error); }
    { const r = await T.act('iniciarGestion', { tipo: 'persona', id: 'p01', gtipo: 'otra', titulo: 'x', resp: 'man' }); ok('V17-6.tipo' + sfx, 'Solo siniestro o cotización', !r.ok, r.error); }
    { const r = await T.act('iniciarGestion', { tipo: 'persona', id: 'p01', gtipo: 'cotizacion', titulo: 'x', resp: 'man', desde: '2026-02-31' }); ok('V17-6.fechaInexistente' + sfx, 'No se acepta una fecha inexistente (31/02)', !r.ok, r.error); }
    { const r = await T.act('cargarAvance', { gestion: gid, texto: 'x', fecha: '2026-10-32', estado: 'en_curso' }); ok('V17-6.avanceInexistente' + sfx, 'No se acepta un avance con fecha inexistente', !r.ok, r.error); }
    { const r = await T.act('iniciarGestion', { tipo: 'persona', id: 'p01', gtipo: 'cotizacion', titulo: 'Cotizar con tarjeta 4509 9535 6623 3704 y CBU 0170099220000067797370', resp: 'pil' });
      const d = await T.estado(), txt = JSON.stringify(d);
      ok('V17-6.bancTitulo' + sfx, 'Un número de tarjeta o CBU en el asunto no queda en la gestión, el aviso a la responsable ni el evento', r.ok && !/4509 ?9535/.test(txt) && !/0170099220000067797370/.test(txt) && d.notificaciones.some(n => n.para === 'pil' && /dato bancario omitido/.test(n.titulo)), r.error || ''); }

    // 7 · Estado guardado anterior (sin gestionesManuales) no rompe la pestaña
    await P.evaluate(() => { delete S.d.gestionesManuales; });
    await T.ir('#/persona/p02/gestiones');
    ok('V17-7.previo' + sfx, 'Carla Quiroga conserva su siniestro SIN-2026-014 junto al botón de iniciar', /SIN-2026-014/.test(await T.texto('[data-gestiones-ficha]')) && (await P.locator('#btn-iniciar-gestion').count()) === 1);
    ok('V17-ERR' + sfx, 'Sin errores de consola', !T.errores.length, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('gestiones-v17');
})();
