// v16 · Pedido de Emiliano del 30/10: en Clientes se puede agregar un cliente a mano, sea persona o empresa
// (antes solo existía «Nueva persona»). El alta de empresas busca duplicados por CUIT exacto y razón social parecida.
// También se cargan pólizas a mano y se editan las existentes; cada edición deja una versión con lo que cambió.
// v19 · Emiliano también da altas y carga o edita pólizas (respuesta de Emiliano del 31/10).
const { iniciar, ok, informe } = require('./lib');
// v16.1 (B1 de la auditoría): los mismos formatos de tarjeta y CBU que bancarios.js.
const BANC = ['4539.1488.0343.6467', '4539/1488/0343/6467', '4539  1488  0343  6467', '4539 1488 0343 6467', '4539148803436467', '3714 496353 98431', '5555_5555_5555_4444', '5555-5555-5555-4444', '0170 0999 2000 0012 3456 78'];
const digitos = x => x.replace(/\D/g, '');
const AXE = async P => { await P.addScriptTag({ url: '/axe.js' }); return P.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map(v => v.id + ':' + v.nodes.length)); };
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    const sinScroll = () => P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    const a11y = async (id, desc) => { const v = await AXE(P); ok(`V16-A11Y.${id}${sfx}`, `axe WCAG 2.2 A/AA sin violaciones: ${desc}`, !v.length, v.join(' ')); ok(`V16-SCROLL.${id}${sfx}`, `Sin desplazamiento horizontal: ${desc}`, await sinScroll()); };
    const enviar = async () => { await P.locator('[data-alta-empresa] button[type=submit]').click(); await P.waitForTimeout(80); };

    // 1 · Los dos botones están en las dos pestañas, con el principal según la pestaña
    await T.perfil('man');
    for (const [tab, prim] of [['personas', 'Nueva persona'], ['empresas', 'Nueva empresa']]) {
      await T.ir(`#/clientes/${tab}`);
      const bs = await P.$$eval('.contenido header a.btn, .contenido .acciones a.btn, .contenido a.btn', xs => xs.filter(x => /^Nueva (persona|empresa)$/.test(x.textContent.trim())).map(x => ({ t: x.textContent.trim(), p: x.classList.contains('primario'), h: x.getAttribute('href') })));
      ok(`V16-1.botones.${tab}${sfx}`, `En ${tab} están «Nueva persona» y «Nueva empresa»`, bs.some(b => b.t === 'Nueva persona' && b.h === '#/clientes/nueva') && bs.some(b => b.t === 'Nueva empresa' && b.h === '#/clientes/nueva-empresa'), JSON.stringify(bs));
      ok(`V16-1.principal.${tab}${sfx}`, `En ${tab} el principal es «${prim}»`, bs.filter(b => b.p).map(b => b.t).join() === prim, JSON.stringify(bs));
      ok(`V16-1.scroll.${tab}${sfx}`, `Sin desplazamiento horizontal en ${tab}`, await sinScroll());
    }
    await T.ir('#/clientes/empresas'); await T.enlace('Nueva empresa');
    ok('V16-1.abre' + sfx, '«Nueva empresa» abre el formulario de alta', (await T.hash()) === '#/clientes/nueva-empresa' && (await P.locator('[data-alta-empresa]').count()) === 1 && /Nueva empresa/.test(await T.texto('.contenido h1')));
    await a11y('form', 'formulario de alta de empresa');
    await T.foto('V16-alta-empresa-form');
    // La lista filtrada sin resultados ofrece el alta.
    await T.ir('#/clientes/empresas'); await P.fill('#f-cli', 'zzzz'); await P.waitForTimeout(60);
    ok('V16-1.vacio' + sfx, 'Un filtro sin resultados ofrece «Nueva empresa»', /Sin resultados/.test(await T.texto('.contenido')) && (await P.locator('.vacio a[href="#/clientes/nueva-empresa"], .contenido a[href="#/clientes/nueva-empresa"]').count()) >= 1);
    await P.fill('#f-cli', ''); await P.waitForTimeout(40);

    // 2 · Validaciones
    await T.ir('#/clientes/nueva-empresa'); await P.fill('#ae-nombre', 'Prueba S.A.'); await P.fill('#ae-cuit', '30-123'); await enviar();
    { const d = await T.estado(); ok('V16-2.cuit' + sfx, 'Un CUIT sin 11 dígitos no crea nada', d.empresas.length === 5 && (await T.hash()) === '#/clientes/nueva-empresa'); }

    // 3 · Mismo CUIT: no crea otra, lleva a la existente
    await T.ir('#/clientes/nueva-empresa'); await P.fill('#ae-nombre', 'Bodega del Cerro'); await P.fill('#ae-cuit', '30712345671'); await enviar();
    { const t = await T.texto('[data-duplicado]'); ok('V16-3.aviso' + sfx, 'El mismo CUIT avisa «Posible duplicado» con la empresa existente', /Bodega Cerro Liso S\.A\./.test(t) && /mismo CUIT/.test(t));
      ok('V16-3.sin-crear-igual' + sfx, 'Con el mismo CUIT no se ofrece «Crear igual»', !(await P.locator('[data-duplicado] input[value="crear"]').count()));
      await a11y('dup', 'aviso de duplicado'); await T.foto('V16-alta-empresa-duplicado');
      await enviar(); const d = await T.estado();
      ok('V16-3.va' + sfx, 'Confirmar lleva a la empresa existente sin crear otra', d.empresas.length === 5 && (await T.hash()) === '#/empresa/e1/resumen');
      ok('V16-3.accion' + sfx, 'La acción rechaza crear con un CUIT repetido', !(await T.act('altaEmpresa', { nombre: 'X', cuit: '30-71234567-1', decision: 'crear', motivo: 'probar' })).ok && (await T.estado()).empresas.length === 5); }

    // 4 · Razón social parecida con otro CUIT: crear igual exige motivo
    await T.ir('#/clientes/nueva-empresa'); await P.fill('#ae-nombre', 'Constructora Piedemonte S.R.L.'); await P.fill('#ae-cuit', '30-71999888-1'); await enviar();
    ok('V16-4.aviso' + sfx, 'Una razón social parecida avisa con la empresa existente', /Constructora Piedemonte S\.A\..*razón social parecida/s.test(await T.texto('[data-duplicado]')));
    await enviar(); ok('V16-4.motivo' + sfx, 'Sin motivo no se crea', (await T.estado()).empresas.length === 5);
    await P.fill('#ae-motivo', 'Es otra sociedad del mismo grupo'); await enviar();
    { const d = await T.estado(); const e = d.empresas[d.empresas.length - 1];
      ok('V16-4.crea' + sfx, 'Con motivo se crea, y el motivo queda en la ficha', d.empresas.length === 6 && e.alta.motivo === 'Es otra sociedad del mismo grupo' && /Es otra sociedad del mismo grupo/.test(await T.texto('.contenido'))); }

    // 5 · Alta nueva: ficha completa y usable
    await T.ir('#/clientes/nueva-empresa'); await P.fill('#ae-nombre', 'Olivícola Valle Hondo S.A.'); await P.fill('#ae-cuit', '30714443335'); await P.fill('#ae-sector', 'Agroindustria'); await P.fill('#ae-dom', 'Ruta 7 km 1020, San Martín (ficticio)'); await P.fill('#ae-act', 'Producción de aceite de oliva. Pagan con la tarjeta 4539 1488 0343 6467.'); await enviar();
    const d5 = await T.estado(); const nueva = d5.empresas.find(e => e.nombre === 'Olivícola Valle Hondo S.A.');
    ok('V16-5.crea' + sfx, 'Crea la empresa con CUIT formateado, sector y domicilio', nueva && nueva.cuit === '30-71444333-5' && nueva.sector === 'Agroindustria' && nueva.org === null && nueva.portal === false && nueva.alta.por === 'man');
    ok('V16-5.va' + sfx, 'Al crear, abre la ficha nueva', (await T.hash()) === `#/empresa/${nueva.id}/resumen` && /Olivícola Valle Hondo S\.A\./.test(await T.texto('.contenido h1')));
    ok('V16-5.redacta' + sfx, 'La tarjeta de la actividad no se guarda', !/4539/.test(JSON.stringify(d5.empresas)) && !/4539/.test(await T.texto('.contenido')));
    { const ev = d5.eventos[d5.eventos.length - 1]; ok('V16-5.evento' + sfx, 'El registro dice quién dio el alta', ev.actor === 'man' && /Dio de alta la empresa Olivícola/.test(ev.accion) && ev.objeto === nueva.id, JSON.stringify(ev)); }
    const pest = await P.$$eval('.pestanas a', xs => xs.map(x => [...x.childNodes].filter(n => !(n.classList && n.classList.contains('sr'))).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim()));
    ok('V16-5.contadores' + sfx, 'Las pestañas arrancan en cero', ['Contactos (0)', 'Pólizas (0)', 'Gestiones (0)', 'Tareas (0)', 'Notas (0)'].every(x => pest.includes(x)), pest.join('|'));
    ok('V16-5.drive' + sfx, 'Tiene su carpeta de Drive simulada', (await P.locator(`[data-drive="${nueva.id}"]`).count()) === 1);
    await a11y('ficha', 'ficha de la empresa nueva'); await T.foto('V16-alta-empresa-ficha');
    for (const tab of ['contactos', 'polizas', 'riesgos/matriz', 'gestiones', 'tareas', 'notas', 'historial']) {
      await T.ir(`#/empresa/${nueva.id}/${tab}`); const t = await T.texto('.contenido');
      ok(`V16-5.tab.${tab.replace('/', '-')}${sfx}`, `La pestaña ${tab} de la empresa nueva se abre sin errores`, T.errores.length === 0 && /Olivícola/.test(t), T.errores.join(' | '));
    }
    await T.ir('#/clientes/empresas'); ok('V16-5.lista' + sfx, 'Aparece en la lista de empresas', /Olivícola Valle Hondo S\.A\./.test(await T.texto('.contenido')));
    await P.reload(); await P.waitForSelector('#root > *'); ok('V16-5.persiste' + sfx, 'Persiste tras recargar', (await T.estado()).empresas.some(e => e.id === nueva.id));
    // Se le puede cargar una nota y una tarea como a cualquier empresa.
    await T.ir(`#/empresa/${nueva.id}/notas`); await T.boton('Nueva nota'); await T.llenar('[data-notas] textarea', 'Primera visita en noviembre'); await P.locator('[data-notas] button[type=submit]').click(); await P.waitForTimeout(60);
    ok('V16-5.nota' + sfx, 'Acepta notas', (await T.estado()).notas.some(n => n.obj.id === nueva.id));

    // 6 · Permisos y aislamiento
    // v19: Emiliano también da altas (respuesta de Emiliano del 31/10).
    await T.perfil('emi'); await T.ir('#/clientes/nueva-empresa'); ok('V16-6.emi' + sfx, 'Emiliano también ve el formulario de alta de empresa', (await P.locator('[data-alta-empresa]').count()) === 1);
    ok('V16-6.emi-act' + sfx, 'Emiliano puede dar de alta una empresa', (await T.act('altaEmpresa', { nombre: 'Viñedos Tupungato S.A.', cuit: '30-11111111-1', decision: 'nueva' })).ok && (await T.estado()).empresas.some(e => e.nombre === 'Viñedos Tupungato S.A.' && e.alta.por === 'emi'));
    await T.ir('#/clientes/nueva'); ok('V16-6.emi-persona' + sfx, 'Emiliano también ve el alta de personas', (await P.locator('#ap-nombre').count()) === 1);
    await T.perfil('pcl'); ok('V16-6.portal' + sfx, 'El portal no puede dar altas', !(await T.act('altaEmpresa', { nombre: 'X S.A.', cuit: '30-11111111-1' })).ok);
    await T.ir(`#/empresa/${nueva.id}/resumen`); ok('V16-6.portal-ve' + sfx, 'El portal no ve la empresa nueva', !/Olivícola/.test(await T.texto('#root')));
    await T.perfil('r1'); await T.ir('#/clientes/empresas'); ok('V16-6.r1' + sfx, 'R1 no ve la empresa nueva (no tiene organización asignada) ni los botones de alta', !/Olivícola/.test(await T.texto('#root')) && !(await P.locator('a[href="#/clientes/nueva-empresa"]').count()));
    for (const p of ['eva', 'vic', 'luc', 'jim', 'pil', 'mat']) { await T.perfil(p); await T.ir('#/clientes/nueva-empresa'); ok(`V16-6.${p}${sfx}`, `${p} puede abrir el alta de empresa`, (await P.locator('[data-alta-empresa]').count()) === 1); }

    // 7 · El alta de personas sigue igual
    await T.perfil('man'); await T.ir('#/clientes/nueva'); ok('V16-7.persona' + sfx, 'El alta de personas sigue en su lugar', (await P.locator('#ap-nombre').count()) === 1 && /Nueva persona/.test(await T.texto('.contenido h1')));

    // 8 · Pólizas: carga manual
    const enviarPol = async () => { await P.locator('[data-form-poliza] button[type=submit]').click(); await P.waitForTimeout(80); };
    await T.ir('#/polizas'); ok('V16-8.boton' + sfx, '«Nueva póliza» está en Pólizas', (await P.locator('a[href="#/polizas/nueva"]').count()) === 1);
    await T.ir('#/empresa/e1/polizas'); await T.enlace('Nueva póliza');
    ok('V16-8.desde-ficha' + sfx, 'Desde la ficha, el tomador viene elegido', (await T.hash()) === '#/polizas/nueva?tomador=e1' && (await P.locator('#pf-tom').inputValue()) === 'e1');
    await a11y('pol-form', 'formulario de póliza nueva'); await T.foto('V16-poliza-nueva-form');
    const n0 = (await T.estado()).polizas.length;
    await P.fill('#pf-num', 'alt-au-551203'); await P.fill('#pf-ramo', 'Automotor'); await P.fill('#pf-comp', 'Altomira Seguros'); await P.fill('#pf-ini', '2026-11-01'); await P.fill('#pf-fin', '2027-11-01'); await enviarPol();
    ok('V16-8.repetido' + sfx, 'Un número que ya existe (sin importar mayúsculas) no se crea, y lo escrito queda', (await T.estado()).polizas.length === n0 && (await P.locator('#pf-ramo').inputValue()) === 'Automotor' && /Ya existe la póliza/.test(await T.texto('.toast')));
    await P.fill('#pf-num', 'NEV-INC-77001'); await P.fill('#pf-fin', '2026-10-01'); await enviarPol();
    ok('V16-8.fechas' + sfx, 'Una vigencia que termina antes de empezar no se crea', (await T.estado()).polizas.length === n0);
    await P.fill('#pf-fin', '2027-11-01'); await P.fill('#pf-ramo', 'Incendio'); await P.fill('#pf-comp', 'Nevado Seguros'); await enviarPol();
    const dp = await T.estado(), pn = dp.polizas[dp.polizas.length - 1];
    ok('V16-8.crea' + sfx, 'Crea la póliza con sus datos y la abre', dp.polizas.length === n0 + 1 && pn.numero === 'NEV-INC-77001' && pn.tomador === 'e1' && pn.doc === 'sin_documento' && (await T.hash()) === `#/poliza/${pn.id}`);
    ok('V16-8.version' + sfx, 'Queda la versión «Carga manual» con quién la cargó', pn.versiones.length === 1 && pn.versiones[0].tipo === 'Carga manual' && pn.versiones[0].por === 'man');
    { const ev = dp.eventos[dp.eventos.length - 1]; ok('V16-8.evento' + sfx, 'El registro dice quién la cargó', ev.actor === 'man' && /Cargó a mano la póliza NEV-INC-77001/.test(ev.accion)); }
    await T.ir('#/empresa/e1/polizas'); { const ps = await P.$$eval('.pestanas a', xs => xs.map(x => x.textContent)); ok('V16-8.ficha' + sfx, 'Aparece en la ficha y el contador de pólizas sube', /NEV-INC-77001/.test(await T.texto('.contenido')) && ps.some(x => /Pólizas \(4\)/.test(x)), ps.join('|')); }
    await T.ir('#/polizas'); await P.fill('#f-pol', 'NEV-INC-77001'); await P.waitForTimeout(60); ok('V16-8.busca' + sfx, 'Se encuentra en la búsqueda de pólizas', /Coincidencia exacta/.test(await T.texto('.contenido'))); await P.fill('#f-pol', ''); await P.waitForTimeout(40);
    // Para la empresa nueva también.
    await T.ir(`#/empresa/${nueva.id}/polizas`); await T.enlace('Nueva póliza'); await P.fill('#pf-num', 'ALT-RC-80001'); await P.fill('#pf-ramo', 'Responsabilidad civil'); await P.fill('#pf-comp', 'Altomira Seguros'); await P.fill('#pf-ini', '2026-11-02'); await P.fill('#pf-fin', '2027-11-02'); await enviarPol();
    ok('V16-8.empresa-nueva' + sfx, 'Se carga una póliza a la empresa recién creada', (await T.estado()).polizas.some(p => p.numero === 'ALT-RC-80001' && p.tomador === nueva.id));

    // 9 · Pólizas: edición
    await T.ir('#/poliza/pol01'); await T.enlace('Editar póliza');
    ok('V16-9.abre' + sfx, '«Editar póliza» abre el formulario con los datos actuales', (await T.hash()) === '#/poliza/pol01/editar' && (await P.locator('#pf-num').inputValue()) === 'ALT-AU-551203' && (await P.locator('#pf-tom').inputValue()) === 'p03');
    await a11y('pol-editar', 'edición de póliza');
    await enviarPol(); ok('V16-9.sin-cambios' + sfx, 'Guardar sin cambios no crea una versión', (await T.estado()).polizas.find(p => p.id === 'pol01').versiones.length === 2);
    await P.fill('#pf-fin', '2027-04-15'); await P.selectOption('#pf-doc', 'sin_comprobar'); await P.fill('#pf-mot', 'La compañía corrigió la vigencia'); await enviarPol();
    { const p = (await T.estado()).polizas.find(p => p.id === 'pol01'), v = p.versiones[p.versiones.length - 1];
      ok('V16-9.guarda' + sfx, 'Guarda la vigencia y el estado del documento', p.fin === '2027-04-15' && p.doc === 'sin_comprobar' && (await T.hash()) === '#/poliza/pol01');
      ok('V16-9.version' + sfx, 'Agrega la versión «Edición manual» con antes → después, quién y motivo', v.v === 3 && v.tipo === 'Edición manual' && /Hasta: 15\/03\/2027 → 15\/04\/2027/.test(v.detalle) && /Documento: Comprobado → Sin comprobar/.test(v.detalle) && v.por === 'man' && v.motivo === 'La compañía corrigió la vigencia', JSON.stringify(v));
      ok('V16-9.historial' + sfx, 'La ficha muestra la versión nueva', /Edición manual/.test(await T.texto('.contenido')) && /La compañía corrigió la vigencia/.test(await T.texto('.contenido'))); }
    await T.foto('V16-poliza-editada');
    await T.ir('#/poliza/pol01/editar'); await P.fill('#pf-num', 'NEV-INC-77001'); await enviarPol();
    ok('V16-9.numero-repetido' + sfx, 'No deja cambiar el número a uno que ya existe', (await T.estado()).polizas.find(p => p.id === 'pol01').numero === 'ALT-AU-551203');
    ok('V16-9.borrador' + sfx, 'Tras el rechazo, lo escrito queda en el formulario', (await P.locator('#pf-num').inputValue()) === 'NEV-INC-77001');
    await T.ir('#/poliza/pol01'); await T.ir('#/poliza/pol01/editar'); ok('V16-9.borrador-sale' + sfx, 'Al salir y volver, el formulario muestra los datos guardados', (await P.locator('#pf-num').inputValue()) === 'ALT-AU-551203');
    await P.selectOption('#pf-tom', 'p02'); await enviarPol();
    { const p = (await T.estado()).polizas.find(p => p.id === 'pol01'); ok('V16-9.tomador' + sfx, 'Cambiar el tomador mueve la póliza de ficha', p.tomador === 'p02' && /Tomador: Rosa Funes → Carla Quiroga/.test(p.versiones[p.versiones.length - 1].detalle)); }
    await T.ir('#/persona/p02/polizas'); ok('V16-9.mueve' + sfx, 'La póliza aparece en la ficha del nuevo tomador', /ALT-AU-551203/.test(await T.texto('.contenido')));
    await T.ir('#/poliza/pol01/editar'); await P.fill('#pf-mot', 'Tarjeta 4539 1488 0343 6467'); await P.fill('#pf-ramo', 'Automotor particular'); await enviarPol();
    ok('V16-9.redacta' + sfx, 'El motivo no guarda datos de tarjeta', !/4539/.test(JSON.stringify((await T.estado()).polizas)) && !/4539/.test(JSON.stringify((await T.estado()).eventos)));

    // 10 · Pólizas: permisos
    await T.perfil('emi'); await T.ir('#/poliza/pol02'); ok('V16-10.emi' + sfx, 'Emiliano ve «Editar póliza» y «Nueva póliza»', (await P.locator('a[href="#/poliza/pol02/editar"]').count()) === 1 && (await T.ir('#/polizas'), (await P.locator('a[href="#/polizas/nueva"]').count()) === 1));
    await T.ir('#/poliza/pol02/editar'); ok('V16-10.emi-url' + sfx, 'Emiliano abre la edición de una póliza', (await P.locator('[data-form-poliza]').count()) === 1);
    ok('V16-10.emi-act' + sfx, 'Emiliano puede cargar una póliza', (await T.act('guardarPoliza', { numero: 'ALT-AU-EMI-1', ramo: 'Automotor', compania: 'Altomira Seguros', tomador: 'p01', inicio: '2026-11-01', fin: '2027-11-01' })).ok);
    await T.perfil('r1'); ok('V16-10.r1' + sfx, 'R1 no puede cargar ni editar pólizas', !(await T.act('guardarPoliza', { numero: 'X-1', ramo: 'X', compania: 'X', tomador: 'e2', inicio: '2026-01-01', fin: '2027-01-01' })).ok);
    await T.perfil('pcl'); ok('V16-10.portal' + sfx, 'El portal no puede cargar pólizas', !(await T.act('guardarPoliza', { numero: 'X-2', ramo: 'X', compania: 'X', tomador: 'e1', inicio: '2026-01-01', fin: '2027-01-01' })).ok);
    await T.perfil('pil'); await T.ir('#/poliza/pol02'); ok('V16-10.pil' + sfx, 'Pilar (equipo de atención) puede editar', (await P.locator('a[href="#/poliza/pol02/editar"]').count()) === 1);


    // 11 · Correcciones de la auditoría (v16.1)
    await T.perfil('man');
    { const n0 = (await T.estado()).empresas.length, p0 = (await T.estado()).polizas.length, pe0 = (await T.estado()).personas.length; let fugas = [];
      for (const [k, b] of BANC.entries()) {
        await T.act('altaEmpresa', { nombre: `Prueba ${b} S.A.`, cuit: `30-7${String(k).padStart(7, '0')}-${k}`, decision: 'nueva' });
        await T.act('guardarPoliza', { numero: b, ramo: 'Incendio', compania: 'Nevado Seguros', tomador: 'e1', inicio: '2026-11-01', fin: '2027-11-01' });
        await T.act('guardarPoliza', { numero: `POL ${b}`, ramo: 'Incendio', compania: 'Nevado Seguros', tomador: 'e1', inicio: '2026-11-01', fin: '2027-11-01' });
        await T.act('guardarPoliza', { id: 'pol02', numero: b, ramo: 'Incendio', compania: 'Nevado Seguros', tomador: (await T.estado()).polizas.find(p => p.id === 'pol02').tomador, inicio: '2026-11-01', fin: '2027-11-01' });
        await T.act('altaPersona', { nombre: `Ana ${b}`, dni: `4${String(k).padStart(7, '0')}`, decision: 'nueva' });
        // Las conversaciones de la semilla traen tarjetas a propósito (las redacta la vista); acá se miran solo los datos que tocan estas altas, también en localStorage.
        const js = await P.evaluate(() => { const v = Object.values(localStorage).map(x => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(x => x && x.d && x.d.empresas).map(x => x.d); if (!v.length) return "SIN-ESTADO-GUARDADO"; return JSON.stringify([S.d.empresas, S.d.polizas, S.d.personas, S.d.eventos, ...v.map(x => [x.empresas, x.polizas, x.personas, x.eventos])]); });
        if (js === 'SIN-ESTADO-GUARDADO' || js.includes(b) || js.includes(digitos(b))) fugas.push(js === 'SIN-ESTADO-GUARDADO' ? 'sin estado en localStorage' : b);
      }
      const d = await T.estado();
      ok('V16-11.B1' + sfx, 'Ningún formato de tarjeta o CBU queda en empresas, pólizas (y sus versiones), personas ni eventos, en memoria ni en localStorage', !fugas.length, fugas.join(' | '));
      ok('V16-11.B1-rechaza' + sfx, 'Esas altas y ediciones se rechazan en vez de guardarse redactadas', d.empresas.length === n0 && d.polizas.length === p0 && d.personas.length === pe0, `${d.empresas.length - n0} ${d.polizas.length - p0} ${d.personas.length - pe0}`);
      await T.ir('#/clientes/empresas'); const t1 = await T.texto('.contenido'); await T.ir('#/polizas'); const t2 = await T.texto('.contenido');
      ok('V16-11.B1-listas' + sfx, 'Las listas de empresas y pólizas no muestran ninguno', !BANC.some(b => t1.includes(b) || t2.includes(b))); }
    // Los números de póliza y CUIT normales siguen pasando.
    ok('V16-11.no-bancario' + sfx, 'Un número de póliza con muchos dígitos que no es tarjeta se acepta', (await T.act('guardarPoliza', { numero: 'NEV-AU-0001234567', ramo: 'Automotor', compania: 'Nevado Seguros', tomador: 'p01', inicio: '2026-11-01', fin: '2027-11-01' })).ok);
    // N1: la acción directa exige motivo con una razón social parecida.
    ok('V16-11.N1' + sfx, 'La acción exige motivo con una razón social parecida', !(await T.act('altaEmpresa', { nombre: 'Bodega Cerro Liso S.R.L.', cuit: '30-79999999-1', decision: 'nueva' })).ok && (await T.act('altaEmpresa', { nombre: 'Bodega Cerro Liso S.R.L.', cuit: '30-79999999-1', decision: 'crear', motivo: 'Sociedad hermana' })).ok);
    // N2: variantes de razón social que antes no se detectaban.
    for (const [nom, cual] of [['Cerro Liso S.A.', 'Bodega Cerro Liso S.A.'], ['Bodegas Cerro Liso', 'Bodega Cerro Liso S.A.'], ['Piedemonte S.A.', 'Constructora Piedemonte S.A.']]) {
      await T.ir('#/clientes/empresas'); await T.ir('#/clientes/nueva-empresa'); await P.fill('#ae-nombre', nom); await P.fill('#ae-cuit', '30-78888888-' + nom.length % 10); await enviar();
      const t = (await P.locator('[data-duplicado]').count()) ? await T.texto('[data-duplicado]') : '';
      ok(`V16-11.N2.${nom.replace(/\W+/g, '_')}${sfx}`, `«${nom}» avisa que se parece a ${cual}`, t.includes(cual), t);
    }
    // N7: con el aviso, los datos quedan de solo lectura y se guarda lo que se ve.
    ok('V16-11.N7' + sfx, 'Con el aviso de duplicado, los campos son de solo lectura y no hay campos ocultos', (await P.locator('#ae-nombre').getAttribute('readonly')) !== null && !(await P.locator('[data-alta-empresa] input[type=hidden]').count()));
    // N4 y N5.
    ok('V16-11.N4' + sfx, 'Una fecha inexistente se rechaza', !(await T.act('guardarPoliza', { numero: 'X-N4', ramo: 'Incendio', compania: 'Nevado', tomador: 'e1', inicio: '2026-11-01', fin: '2026-13-45' })).ok);
    { const ter = (await T.estado()).personas.find(p => p.tipo === 'tercero');
      ok('V16-11.N5' + sfx, 'Un tercero no puede ser tomador', !ter || !(await T.act('guardarPoliza', { numero: 'X-N5', ramo: 'Incendio', compania: 'Nevado', tomador: ter.id, inicio: '2026-11-01', fin: '2027-11-01' })).ok, ter && ter.id); }
    // N6: Emiliano no ve los botones de alta.
    await T.perfil('emi'); await T.ir('#/clientes/empresas'); ok('V16-11.N6' + sfx, 'Emiliano ve «Nueva empresa» y «Nueva persona» (v19)', (await P.locator('.contenido a[href="#/clientes/nueva-empresa"]').count()) >= 1 && (await P.locator('.contenido a[href="#/clientes/nueva"]').count()) >= 1);
    await T.perfil('man');

    ok('V16.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('altas-v16');
})();
