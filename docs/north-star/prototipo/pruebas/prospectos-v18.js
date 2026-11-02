// v18 · Pedido de Emiliano del 30/10: pestaña Prospectos en Clientes, con origen (sitio web, redes, campañas o carga
// manual) y conversión en cliente cuando reúne lo que pide el alta. Llegadas por sitio, redes y campañas simuladas.
const { iniciar, ok, informe } = require('./lib');
const AXE = async P => { await P.addScriptTag({ url: '/axe.js' }); return P.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map(v => v.id + ':' + v.nodes.length)); };
const TARJETA = '4509 9535 6623 3704', CBU = '0170099220000012345678';
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    const sinScroll = () => P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    const pr = async id => (await T.estado()).prospectos.find(p => p.id === id);
    const enviar = async sel => { await P.locator(`${sel} button[type="submit"]`).first().click(); await P.waitForTimeout(80); };
    const tabTxt = async () => (await P.locator('.pestanas a[aria-current=page]').innerText()).replace(/\s+/g, ' ');

    // 1 · Lista: pestaña con contador, origen, estado y completitud
    await T.perfil('mat'); await T.ir('#/clientes/prospectos');
    { const t = await T.texto('main');
      ok('V18-1.tab' + sfx, 'La pestaña dice Prospectos (5) y está junto a Personas y Empresas', /Prospectos \(5\)/.test(await tabTxt()) && /Personas/.test(t) && /Empresas/.test(t), await tabTxt());
      const filas = await P.locator('[data-prospecto]').evaluateAll(r => r.map(x => x.dataset.prospecto));
      ok('V18-1.abiertos' + sfx, 'Por defecto muestra los 5 abiertos, del más reciente al más antiguo', filas.join(',') === 'PR-005,PR-001,PR-004,PR-003,PR-002', filas.join(','));
      const origenes = await P.locator('[data-prospecto] [data-origen]').evaluateAll(r => [...new Set(r.map(x => x.dataset.origen))].sort());
      ok('V18-1.origenes' + sfx, 'Se ven los orígenes sitio web, redes y campaña', origenes.join(',') === 'campana,redes,web', origenes.join(','));
      ok('V18-1.completo' + sfx, 'Marca qué falta para ser cliente (DNI en Sofía, CUIT en la metalúrgica)', /Falta DNI/.test(await T.texto('[data-prospecto="PR-001"]')) && /Falta CUIT/.test(await T.texto('[data-prospecto="PR-004"]')) && /Datos completos/.test(await T.texto('[data-prospecto="PR-005"]')));
      ok('V18-1.rotulos' + sfx, 'Rotula Simulado y Futuro', /Simulado: llegadas por sitio web, redes y campañas/.test(t) && /Futuro: conexión con el sitio/.test(t));
      const v = await AXE(P); ok('V18-A11Y.lista' + sfx, 'axe WCAG 2.2 sin violaciones en la lista', !v.length, v.join(' '));
      ok('V18-SCROLL.lista' + sfx, 'Sin desplazamiento horizontal en la lista', await sinScroll());
      await T.foto('V18-lista'); }
    await P.selectOption('#pr-f-estado', 'descartado'); await P.waitForTimeout(40);
    ok('V18-1.filtroEstado' + sfx, 'El filtro Descartados muestra a Julieta Arce', (await P.locator('[data-prospecto]').count()) === 1 && /Julieta Arce/.test(await T.texto('[data-prospecto]')));
    await P.selectOption('#pr-f-estado', 'abiertos'); await P.selectOption('#pr-f-origen', 'campana'); await P.waitForTimeout(40);
    ok('V18-1.filtroOrigen' + sfx, 'El filtro de origen deja solo las campañas (2)', (await P.locator('[data-prospecto]').count()) === 2);
    await P.selectOption('#pr-f-origen', ''); await P.waitForTimeout(40);

    // 2 · Llegadas simuladas por sitio, redes y campaña
    for (const [o, nom] of [['web', 'Ramiro Castro'], ['redes', 'Café La Alameda'], ['campana', 'Vivero Los Olmos S.A.S.']]) {
      await P.locator(`[data-simular="${o}"]`).click(); await P.waitForTimeout(60);
      const e = await T.estado(), p = e.prospectos[e.prospectos.length - 1];
      ok(`V18-2.${o}` + sfx, `Llega un prospecto por ${o}, nuevo y asignado a Matías`, p.nombre === nom && p.origen === o && p.estado === 'nuevo' && p.resp === 'mat' && p.simulado, JSON.stringify(p).slice(0, 200));
    }
    ok('V18-2.contador' + sfx, 'El contador pasa a Prospectos (8)', /Prospectos \(8\)/.test(await tabTxt()), await tabTxt());
    { const e = await T.estado(); ok('V18-2.evento' + sfx, 'Cada llegada deja un evento con origen simulado', e.eventos.filter(x => /Simuló la llegada de un prospecto/.test(x.accion) && /\(simulado\)/.test(x.origen)).length === 3); }
    await T.perfil('man'); await T.ir('#/clientes/prospectos'); await P.locator('[data-simular="web"]').click(); await P.waitForTimeout(60);
    { const e = await T.estado(); ok('V18-2.aviso' + sfx, 'Si simula otra persona, Matías recibe el aviso con ruta al prospecto', e.notificaciones.some(n => n.para === 'mat' && n.obj && n.obj.tipo === 'prospecto') && await P.evaluate(() => rutaObj(S.d, { tipo: 'prospecto', id: 'PR-010' })) === '#/clientes/prospecto/PR-010'); }

    // 3 · Carga manual: validaciones, borrador, datos bancarios
    await T.perfil('vic'); await T.ir('#/clientes/nuevo-prospecto');
    ok('V18-3.form' + sfx, 'El alta manual ofrece persona y empresa', /Persona/.test(await T.texto('main')) && /Empresa/.test(await T.texto('main')) && (await P.locator('#pr-n-doc').count()) === 1);
    { const v = await AXE(P); ok('V18-A11Y.nuevo' + sfx, 'axe sin violaciones en el alta manual', !v.length, v.join(' ')); ok('V18-SCROLL.nuevo' + sfx, 'Sin desplazamiento horizontal en el alta manual', await sinScroll()); }
    const n0 = (await T.estado()).prospectos.length;
    await T.llenar('#pr-n-nombre', 'Pedro Sáez'); await T.llenar('#pr-n-interes', 'Seguro de auto'); await enviar('[data-pr-form="nuevo"]');
    ok('V18-3.contacto' + sfx, 'Sin teléfono ni correo no se carga y conserva lo escrito', (await T.estado()).prospectos.length === n0 && (await P.inputValue('#pr-n-nombre')) === 'Pedro Sáez');
    await T.llenar('#pr-n-tel', '+54 9 261 555-0300'); await T.llenar('#pr-n-doc', '123'); await enviar('[data-pr-form="nuevo"]');
    ok('V18-3.dni' + sfx, 'Un DNI de 3 dígitos se rechaza', (await T.estado()).prospectos.length === n0);
    await T.llenar('#pr-n-doc', ''); await T.llenar('#pr-n-nombre', `Pedro ${TARJETA}`); await enviar('[data-pr-form="nuevo"]');
    ok('V18-3.nombreBancario' + sfx, 'Un nombre con una tarjeta se rechaza (como en el alta)', (await T.estado()).prospectos.length === n0);
    await T.llenar('#pr-n-nombre', 'Pedro Sáez'); await T.llenar('#pr-n-msg', `Paga con tarjeta ${TARJETA} o CBU ${CBU}`); await T.llenar('#pr-n-origen', 'Llamó a la oficina');
    await P.selectOption('#pr-n-resp', 'mat'); await enviar('[data-pr-form="nuevo"]');
    { const e = await T.estado(), p = e.prospectos[n0];
      ok('V18-3.alta' + sfx, 'Se carga como Carga manual, nuevo, sin DNI y asignado a Matías', p && p.origen === 'manual' && p.estado === 'nuevo' && !p.doc && p.resp === 'mat' && p.cargadoPor === 'vic', JSON.stringify(p));
      const todo = JSON.stringify(e) + await P.evaluate(() => localStorage.getItem(window.__brokeros.clave));
      ok('V18-3.bancarios' + sfx, 'La tarjeta y el CBU no quedan en el estado ni en localStorage', !todo.includes('4509 9535 6623 3704') && !todo.includes(CBU));
      ok('V18-3.ruta' + sfx, 'Lleva a la ficha del prospecto', (await T.hash()) === `#/clientes/prospecto/${p.id}`);
      ok('V18-3.aviso' + sfx, 'Matías recibe el aviso', e.notificaciones.some(n => n.para === 'mat' && /Pedro Sáez/.test(n.titulo))); }
    await T.ir('#/clientes/nuevo-prospecto?tipo=empresa');
    ok('V18-3.empresa' + sfx, 'El alta de empresa pide razón social, CUIT, contacto y sector', (await P.locator('#pr-n-contacto').count()) === 1 && /CUIT/.test(await T.texto('[data-pr-form]')));

    // 4 · Persona completa sin duplicados: Lucas Ferreyra pasa a cliente
    await T.ir('#/clientes/prospecto/PR-005');
    { const v = await AXE(P); ok('V18-A11Y.ficha' + sfx, 'axe sin violaciones en la ficha del prospecto', !v.length, v.join(' ')); ok('V18-SCROLL.ficha' + sfx, 'Sin desplazamiento horizontal en la ficha', await sinScroll()); await T.foto('V18-ficha-PR-005'); }
    const np = (await T.estado()).personas.length;
    await P.locator('#pr-convertir').click(); await P.waitForTimeout(100);
    { const e = await T.estado(), p = e.prospectos.find(x => x.id === 'PR-005'), c = e.personas.find(x => x.id === p.cliente && p.cliente.id);
      const per = e.personas.find(x => p.cliente && x.id === p.cliente.id);
      ok('V18-4.convertido' + sfx, 'Lucas pasa a cliente con DNI, teléfono y correo', e.personas.length === np + 1 && p.estado === 'convertido' && per && per.dni === '38.120.554' && per.tel === '+54 9 261 555-0205' && per.mail === 'lucas.ferreyra@ejemplo.com' && per.tipo === 'cliente', JSON.stringify(per));
      ok('V18-4.origen' + sfx, 'La persona guarda de qué prospecto viene', per && per.origenProspecto && per.origenProspecto.id === 'PR-005' && per.origenProspecto.origen === 'campana');
      ok('V18-4.nota' + sfx, 'Queda una nota comercial con el origen y el mensaje', e.notas.some(n => n.obj.id === per.id && n.tag === 'comercial' && /PR-005/.test(n.texto) && /Meta Ads/.test(n.texto) && /Honda Wave/.test(n.texto)));
      ok('V18-4.ficha' + sfx, 'Lleva a la ficha de la persona', (await T.hash()) === `#/persona/${per.id}/resumen`);
      { const t = await T.texto('main'); ok('V18-4.origenFicha' + sfx, 'v18.1: el resumen del cliente muestra su origen (campaña, Meta Ads, PR-005)', /Origen/.test(t) && /Campaña publicitaria/.test(t) && /Meta Ads/.test(t) && /PR-005/.test(t) && (await P.locator('[data-origen-cliente="campana"]').count()) === 1, t.slice(0, 300));
        const v = await AXE(P); ok('V18-A11Y.origenFicha' + sfx, 'axe sin violaciones en el resumen con origen', !v.length, v.join(' ')); ok('V18-SCROLL.origenFicha' + sfx, 'Sin desplazamiento horizontal en el resumen con origen', await sinScroll()); await T.foto('V18-1-origen-persona'); }
      ok('V18-4.evento' + sfx, 'El registro dice que convirtió el prospecto', e.eventos.some(x => x.accion === 'Convirtió el prospecto Lucas Ferreyra en cliente' && x.objeto === per.id));
      await T.ir(`#/persona/${per.id}/notas`); ok('V18-4.notas' + sfx, 'La nota se ve en la pestaña Notas', /Llegó como prospecto PR-005/.test(await T.texto('main')));
      await T.ir('#/clientes/prospecto/PR-005'); ok('V18-4.yaCliente' + sfx, 'El prospecto muestra que ya es cliente, con enlace', /Es cliente:/.test(await T.texto('[data-pr-conv]')) && (await P.locator('#pr-convertir').count()) === 0);
      ok('V18-4.otraVez' + sfx, 'Convertirlo de nuevo se rechaza', !(await T.act('convertirProspecto', { id: 'PR-005' })).ok); }

    // 5 · Mismo DNI que un cliente: Tomás Bravo se vincula y no se duplica
    await T.ir('#/clientes/prospecto/PR-003');
    ok('V18-5.aviso' + sfx, 'Antes de convertir avisa que ya hay un cliente con ese DNI', /Ya hay un cliente con ese DNI: Tomás Bravo/.test(await T.texto('[data-pr-conv]')));
    { const n1 = (await T.estado()).personas.length;
      ok('V18-5.directo' + sfx, 'La acción sin decidir se rechaza (no crea un duplicado)', !(await T.act('convertirProspecto', { id: 'PR-003', decision: 'nueva' })).ok && (await T.estado()).personas.length === n1);
      await T.ir('#/clientes/prospecto/PR-003'); await P.locator('#pr-convertir').click(); await P.waitForTimeout(80);
      ok('V18-5.dup' + sfx, 'Muestra el posible duplicado con vincular marcado', /Posible duplicado/.test(await T.texto('[data-pr-conv]')) && await P.isChecked('input[name=decision][value=vincular]'));
      { const v = await AXE(P); ok('V18-A11Y.dup' + sfx, 'axe sin violaciones con el aviso de duplicado', !v.length, v.join(' ')); }
      await P.locator('#pr-convertir').click(); await P.waitForTimeout(100);
      const e = await T.estado(), p = e.prospectos.find(x => x.id === 'PR-003');
      ok('V18-5.vinculado' + sfx, 'Se vincula a p16 sin crear otra persona', e.personas.length === n1 && p.estado === 'convertido' && p.cliente.id === 'p16' && p.cliente.vinculado && (await T.hash()) === '#/persona/p16/resumen');
      { await T.ir('#/persona/p16/resumen'); const t = await T.texto('main'); ok('V18-5.origenVinculado' + sfx, 'v18.1: en p16 se ve «También llegó como prospecto» por redes sociales', /También llegó como prospecto/.test(t) && /Redes sociales/.test(t) && /PR-003/.test(t)); }
      ok('V18-5.nota' + sfx, 'p16 recibe la nota con el mensaje de Instagram', e.notas.some(n => n.obj.id === 'p16' && /Instagram/.test(n.texto))); }

    // 6 · Falta DNI: Sofía no se convierte hasta completar
    await T.ir('#/clientes/prospecto/PR-001');
    ok('V18-6.falta' + sfx, 'Dice que falta el DNI y no ofrece convertir', /falta: DNI/.test(await T.texto('[data-pr-conv]')) && (await P.locator('#pr-convertir').count()) === 0);
    ok('V18-6.accion' + sfx, 'La acción también lo rechaza', !(await T.act('convertirProspecto', { id: 'PR-001' })).ok);
    await T.ir('#/clientes/prospecto/PR-001'); await P.locator('#pr-completar').click(); await P.waitForTimeout(60);
    ok('V18-6.foco' + sfx, 'Completar datos abre la edición con el foco en el DNI', await P.evaluate(() => document.activeElement && document.activeElement.id === 'pr-e-doc'));
    await T.llenar('#pr-e-doc', '40 111 222'); await enviar('[data-pr-form="editar"]');
    { const p = await pr('PR-001'); ok('V18-6.guardado' + sfx, 'El DNI se guarda con puntos y queda en el seguimiento', p.doc === '40.111.222' && p.seguimiento.some(s => /DNI|documento/.test(s.texto))); }
    ok('V18-6.listo' + sfx, 'Ahora ofrece convertir', (await P.locator('#pr-convertir').count()) === 1);
    ok('V18-6.sinCambios' + sfx, 'Guardar sin cambios se rechaza', !(await T.act('guardarProspecto', { id: 'PR-001', nombre: 'Sofía Herrera', doc: '40111222', tel: '+54 9 261 555-0201', mail: 'sofia.herrera@ejemplo.com', interes: 'Seguro de auto (Toyota Corolla 2022)' })).ok);

    // 7 · Empresa con razón social parecida: crear igual exige motivo
    await T.perfil('luc'); await T.ir('#/clientes/prospecto/PR-004'); await P.locator('#pr-completar').click(); await P.waitForTimeout(60);
    await T.llenar('#pr-e-doc', '30-71999000-1'); await enviar('[data-pr-form="editar"]');
    await P.locator('#pr-convertir').click(); await P.waitForTimeout(80);
    ok('V18-7.parecida' + sfx, 'Avisa razón social parecida a Metalúrgica Andes Sur', /Metalúrgica Andes Sur/.test(await T.texto('[data-pr-conv]')) && /razón social parecida/.test(await T.texto('[data-pr-conv]')));
    const ne = (await T.estado()).empresas.length;
    await P.locator('#pr-convertir').click(); await P.waitForTimeout(80);
    ok('V18-7.motivo' + sfx, 'Sin motivo no se crea', (await T.estado()).empresas.length === ne && (await pr('PR-004')).estado === 'nuevo');
    await P.locator('#pr-convertir').click(); await P.waitForTimeout(80); await T.llenar('#pr-motivo', 'Es otra empresa, distinto dueño'); await P.locator('#pr-convertir').click(); await P.waitForTimeout(100);
    { const e = await T.estado(), emp = e.empresas[e.empresas.length - 1];
      ok('V18-7.creada' + sfx, 'Se crea la empresa con CUIT formateado y motivo', e.empresas.length === ne + 1 && emp.cuit === '30-71999000-1' && emp.alta && /distinto dueño/.test(emp.alta.motivo) && emp.org === null);
      await T.ir(`#/empresa/${emp.id}/resumen`); ok('V18-7.origenEmpresa' + sfx, 'v18.1: la empresa muestra su origen (sitio web, PR-004)', (await P.locator('[data-origen-cliente="web"]').count()) === 1 && /PR-004/.test(await T.texto('main')));
      ok('V18-7.nota' + sfx, 'La nota de la empresa incluye el contacto y el correo', e.notas.some(n => n.obj.id === emp.id && /Valeria \(compras\)/.test(n.texto) && /compras@andesdelsur/.test(n.texto))); }

    // 8 · Empresa con mismo CUIT: solo ir a la existente
    await T.act('guardarProspecto', { id: 'PR-002', nombre: 'Frigorífico Valle de Uco S.R.L.', doc: '30712345671', contacto: 'Gustavo Peralta (gerente administrativo)', tel: '+54 9 261 555-0202', mail: 'gperalta@frigovalle.ejemplo', interes: 'ART y seguro integral de comercio', sector: 'Industria', domicilio: 'Ruta 40 km 3120, Tunuyán (ficticio)' });
    await T.ir('#/clientes/prospecto/PR-002'); await P.locator('#pr-convertir').click(); await P.waitForTimeout(80);
    ok('V18-8.soloVincular' + sfx, 'Con el CUIT de Cerro Liso solo ofrece ir a la existente', (await P.locator('input[name=decision][value=crear]').count()) === 0 && await P.isChecked('input[name=decision][value=vincular]'));
    { const ne2 = (await T.estado()).empresas.length;
      ok('V18-8.crearRechazo' + sfx, 'Forzar «crear igual» por la acción se rechaza', !(await T.act('convertirProspecto', { id: 'PR-002', decision: 'crear', motivo: 'x' })).ok && (await T.estado()).empresas.length === ne2); }

    // 8b · Observaciones del árbitro: empresa sin contacto conserva teléfono y correo; nombre parecido exige motivo también por acción
    await T.perfil('man');
    await T.act('guardarProspecto', { tipo: 'empresa', nombre: 'Aserradero Río Blanco', doc: '30-71222333-9', tel: '+54 9 261 555-0400', mail: 'ventas@rioblanco.ejemplo', resp: 'man' });
    { const e0 = await T.estado(), p = e0.prospectos[e0.prospectos.length - 1]; const r = await T.act('convertirProspecto', { id: p.id });
      const e = await T.estado(), c = e.prospectos.find(x => x.id === p.id).cliente;
      ok('V18-8b.notaSinContacto' + sfx, 'Empresa sin persona de contacto: el teléfono y el correo quedan en la nota', r.ok && e.notas.some(n => n.obj.id === c.id && /555-0400/.test(n.texto) && /ventas@rioblanco/.test(n.texto))); }
    await T.act('guardarProspecto', { tipo: 'persona', nombre: 'Martín Sosa', doc: '39888777', mail: 'otro.martin@ejemplo.com', resp: 'man' });
    { const e0 = await T.estado(), p = e0.prospectos[e0.prospectos.length - 1], n0 = e0.personas.length;
      ok('V18-8b.parecidoAccion' + sfx, 'Por acción, un nombre igual a un cliente no se convierte sin motivo', !(await T.act('convertirProspecto', { id: p.id, decision: 'nueva' })).ok && !(await T.act('convertirProspecto', { id: p.id, decision: 'vincular' })).ok && (await T.estado()).personas.length === n0);
      ok('V18-8b.parecidoMotivo' + sfx, 'Con «crear igual» y motivo se convierte', (await T.act('convertirProspecto', { id: p.id, decision: 'crear', motivo: 'Otro Martín, otro DNI' })).ok && (await T.estado()).personas.length === n0 + 1); }

    // 9 · Seguimiento: contacto, reasignar, descartar y reabrir
    await T.perfil('mat'); const ult = (await T.estado()).prospectos.find(p => p.nombre === 'Ramiro Castro');
    await T.ir(`#/clientes/prospecto/${ult.id}`);
    await T.llenar('#pr-contacto', `Lo llamé; dictó la tarjeta ${TARJETA}`); await enviar('[data-pr-seguimiento] form[data-form="contactoProspecto"]');
    { const p = await pr(ult.id); ok('V18-9.contacto' + sfx, 'Registrar un contacto pasa a Contactado y omite la tarjeta', p.estado === 'contactado' && !JSON.stringify(p).includes('4509 9535'), JSON.stringify(p.seguimiento)); }
    await P.selectOption('#pr-resp', 'vic'); await enviar('[data-pr-seguimiento] form[data-form="asignarProspecto"]');
    { const e = await T.estado(); ok('V18-9.reasignar' + sfx, 'Reasignar a Victoria la avisa', e.prospectos.find(p => p.id === ult.id).resp === 'vic' && e.notificaciones.some(n => n.para === 'vic' && /Ramiro Castro/.test(n.titulo))); }
    ok('V18-9.descarteMotivo' + sfx, 'Descartar sin motivo se rechaza', !(await T.act('descartarProspecto', { id: ult.id, motivo: ' ' })).ok);
    await T.act('descartarProspecto', { id: ult.id, motivo: 'No le interesa por ahora' });
    ok('V18-9.descartado' + sfx, 'Descartado sale de abiertos y no se convierte', (await pr(ult.id)).estado === 'descartado' && !(await T.act('convertirProspecto', { id: ult.id })).ok);
    await T.act('reabrirProspecto', { id: ult.id });
    ok('V18-9.reabrir' + sfx, 'Al reabrir vuelve a Contactado', (await pr(ult.id)).estado === 'contactado');

    // 10 · Permisos y aislamiento
    await T.perfil('emi'); await T.ir('#/clientes/prospecto/PR-001');
    { const t = await T.texto('main'); ok('V18-10.emi' + sfx, 'v22: Emiliano ve convertir, editar y registrar contacto', (await P.locator('#pr-convertir').count()) > 0 && (await P.locator('#pr-contacto').count()) > 0 && !/Emiliano ve en lectura/.test(t), t.slice(0, 400)); }
    await T.ir('#/clientes/prospectos'); ok('V18-10.emiNuevo' + sfx, 'Emiliano ve «Nuevo prospecto» y la simulación', (await P.locator('#pr-nuevo, [data-simular]').count()) > 0);
    { const r = await T.act('simularProspecto', { origen: 'web' }); ok('V18-10.emiSimula' + sfx, 'Emiliano simula una llegada', r.ok, r.error); }
    { const g = await T.act('guardarProspecto', { tipo: 'persona', nombre: 'Octavio Prueba Emiliano', tel: '+54 9 261 555-0410', doc: '40999111', resp: 'emi' }); const e = await T.estado(), p = e.prospectos[e.prospectos.length - 1];
      const c = await T.act('convertirProspecto', { id: p.id }); const e2 = await T.estado(), p2 = e2.prospectos.find(x => x.id === p.id);
      ok('V18-10.emiAccion' + sfx, 'Emiliano carga un prospecto con DNI y lo convierte en cliente', g.ok && c.ok && p2.estado === 'convertido' && p2.cliente && e2.personas.some(x => x.id === p2.cliente.id && x.nombre === 'Octavio Prueba Emiliano'), [g.error, c.error, JSON.stringify(p2 && p2.cliente)].join(' | ')); }
    await T.perfil('r1'); await T.ir('#/clientes/personas');
    ok('V18-10.r1tab' + sfx, 'El revisor no ve la pestaña Prospectos', !/Prospectos/.test(await T.texto('.pestanas')));
    await T.ir('#/clientes/prospectos'); ok('V18-10.r1ruta' + sfx, 'Si fuerza la ruta, ve Sin acceso', /Sin acceso/.test(await T.texto('main')) && !/Sofía Herrera/.test(await T.texto('main')));
    ok('V18-10.r1accion' + sfx, 'El revisor no carga prospectos', !(await T.act('guardarProspecto', { tipo: 'persona', nombre: 'X', tel: '1' })).ok);
    { const e = await T.estado(), c = e.prospectos.find(x => x.id === 'PR-003').cliente; await T.ir('#/persona/p16/resumen'); ok('V18-10.r1origen' + sfx, 'v18.1: el revisor no ve el origen de prospecto en una ficha', (await P.locator('[data-origen-cliente]').count()) === 0 && c.id === 'p16'); }
    await T.perfil('pcl'); await T.ir('#/clientes/prospectos'); ok('V18-10.portal' + sfx, 'El portal no ve prospectos', !/Sofía Herrera/.test(await T.texto('#root')));

    // 11 · Demo guardada antes de esta versión: la semilla de prospectos se agrega sola
    await T.perfil('man'); await P.evaluate(() => { const o = JSON.parse(localStorage.getItem(window.__brokeros.clave)); delete o.d.prospectos; localStorage.setItem(window.__brokeros.clave, JSON.stringify(o)); });
    await P.reload(); await P.waitForSelector('#root > *'); await T.ir('#/clientes/prospectos');
    ok('V18-11.migracion' + sfx, 'Sin prospectos guardados se ve la semilla, sin errores', (await P.locator('[data-prospecto]').count()) === 5 && T.errores.length === 0, T.errores.join(' | '));
    ok('V18-ERR' + sfx, 'Sin errores de página en todo el recorrido', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('prospectos-v18');
})();
