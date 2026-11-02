// v22 · Pedido de Emiliano del 31/10: «manuel tiene que poder dar de alta a nuevos miembros del equipo y dar de baja o
// pausar a los miembros que ya no están en el equipo.» Configuración › Equipo y permisos.
const { iniciar, ok, informe } = require('./lib');
const { RUTAS } = require('./rutas');
const AXE = async P => { await P.addScriptTag({ url: '/axe.js' }); return P.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map(v => v.id + ':' + v.nodes.length)); };
const TARJETA = '4509 9535 6623 3704';
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    const sinScroll = () => P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    const toastTxt = async () => (await P.locator('.toast').count()) ? P.locator('.toast').innerText() : '';
    const perfiles = () => P.locator('#perfil option, #perfil-m option').evaluateAll(o => [...new Set(o.map(x => x.value))]);
    const enviar = async sel => { await P.locator(`${sel} button[type="submit"]`).first().click(); await P.waitForTimeout(80); };

    // 1 · Quién puede
    await T.perfil('emi'); await T.ir('#/configuracion/equipo');
    ok('V22-1.emi' + sfx, 'Emiliano ve el equipo pero no da altas ni bajas', (await P.locator('[data-eq-gestion]').count()) === 1 && !(await P.locator('[data-eq-alta]').count()) && !(await P.getByRole('button', { name: /Pausar a/ }).count()) && /Manuel \(dirección\)/.test(await T.texto('[data-eq-gestion]')));
    for (const [n, x] of [['equipoAlta', { nombre: 'Prueba', rol: 'Prueba' }], ['equipoSalida', { id: 'mat', tipo: 'pausa', a: 'vic', motivo: 'x' }]]) {
      const r = await T.act(n, x); ok(`V22-1.act-emi-${n}` + sfx, `Emiliano no puede ${n} por la acción`, !r.ok, r.error);
    }
    await T.perfil('vic'); { const r = await T.act('equipoAlta', { nombre: 'Prueba', rol: 'Prueba' }); ok('V22-1.vic' + sfx, 'Victoria tampoco', !r.ok); }
    await T.perfil('r1'); { const r = await T.act('equipoSalida', { id: 'mat', tipo: 'baja', a: 'vic', motivo: 'x' }); ok('V22-1.r1' + sfx, 'El revisor tampoco', !r.ok); }

    // 2 · Alta
    await T.perfil('man'); await T.ir('#/configuracion/equipo');
    ok('V22-2.sin-futuro' + sfx, 'Ya no dice «Futuro: agregar o dar de baja personas»', !/Futuro: agregar o dar de baja/.test(await T.texto('main')) && /Simulado: no crea cuentas reales/.test(await T.texto('[data-eq-gestion]')));
    await P.locator('.eq-alta > summary').click();
    await P.fill('#eq-alta-nombre', 'Sofía Gómez'); await P.fill('#eq-alta-rol', 'Atención de siniestros'); await P.selectOption('#eq-alta-copiar', 'pil');
    await enviar('[data-eq-alta]');
    const nuevo = (await T.estado()).equipo.find(m => m.nombre === 'Sofía Gómez');
    ok('V22-2.alta' + sfx, 'Manuel da de alta a Sofía Gómez con iniciales SG', !!nuevo && nuevo.ini === 'SG' && /se sumó al equipo/.test(await toastTxt()), await toastTxt());
    ok('V22-2.lista' + sfx, 'Aparece en la lista, en la tabla de permisos y en «Simulación de roles»', (await P.locator(`[data-eq-miembro="${nuevo.id}"]`).count()) === 1 && (await P.locator(`#cfg-p-gestionarSiniestro-${nuevo.id}`).isChecked()) && (await perfiles()).includes(nuevo.id));
    ok('V22-2.copia' + sfx, 'Copió los permisos configurables de Pilar (siniestros sí, facturas no)', (await P.locator(`#cfg-p-gestionarSiniestro-${nuevo.id}`).isChecked()) && !(await P.locator(`#cfg-p-confirmarFactura-${nuevo.id}`).isChecked()));
    { const r = await T.act('equipoAlta', { nombre: 'sofia gomez', rol: 'Otra' }); ok('V22-2.repetido' + sfx, 'No repite un nombre', !r.ok && /Ya hay/.test(r.error), r.error); }
    { const r = await T.act('equipoAlta', { nombre: 'Ana ' + TARJETA, rol: 'x' }); ok('V22-2.bancarios' + sfx, 'Rechaza datos de tarjeta en el nombre', !r.ok && /tarjetas/.test(r.error)); }
    await P.fill('#eq-alta-nombre', 'Matías'); await P.fill('#eq-alta-rol', 'Ventas'); await enviar('[data-eq-alta]');
    ok('V22-2.borrador' + sfx, 'Un rechazo conserva lo escrito', (await P.locator('#eq-alta-nombre').inputValue()) === 'Matías' && (await P.locator('#eq-alta-rol').inputValue()) === 'Ventas');
    { const r = await T.act('equipoAlta', { nombre: 'Tomás Ruiz', rol: 'Pasante' }); ok('V22-2.sin-permisos' + sfx, 'Sin copiar, el alta no da permisos de acción', r.ok && /Sin permisos de acción/.test(r.ev.efecto)); }
    // El nuevo trabaja: entra, recorre todo sin errores y gestiona un siniestro
    await T.perfil(nuevo.id);
    ok('V22-2.entra' + sfx, 'Sofía entra con su perfil', (await P.evaluate(() => window.__brokeros.perfil())) === nuevo.id);
    for (const ru of RUTAS) await T.ir(ru);
    ok('V22-2.rutas' + sfx, 'Recorre todas las rutas sin errores de JavaScript', !T.errores.length, T.errores.slice(0, 3).join(' | '));
    await T.ir('#/gestiones/siniestros'); ok('V22-2.siniestros' + sfx, 'Ve Siniestros', !/Sin acceso/.test(await T.texto('main')));
    { const r = await T.act('altaPersona', { nombre: 'Cliente de Sofía', dni: '30222333', decision: 'nueva' }); ok('V22-2.trabaja' + sfx, 'Da de alta a un cliente', r.ok, r.error); }
    await T.ir('#/configuracion/equipo'); ok('V22-2.sin-config' + sfx, 'No entra a Configuración', /Sin acceso/.test(await T.texto('main')));

    // 3 · Pausa con traspaso de trabajo
    await T.perfil('man'); await T.ir('#/configuracion/equipo');
    await P.getByRole('button', { name: 'Pausar a Matías' }).click(); await P.waitForTimeout(60);
    ok('V22-3.form' + sfx, 'El formulario lista el trabajo abierto de Matías y pone el foco en el motivo', /2 tareas abiertas/.test(await T.texto('[data-eq-trabajo]')) && /3 prospectos abiertos/.test(await T.texto('[data-eq-trabajo]')) && await P.evaluate(() => document.activeElement.id === 'eq-s-motivo'), await T.texto('[data-eq-trabajo]'));
    await P.selectOption('#eq-s-a', 'jim'); await P.fill('#eq-s-motivo', 'Licencia hasta el 30/11');
    await P.evaluate(() => window.__brokeros.act('cfgPermiso', { accion: 'gestionarProspecto', miembro: 'jim', valor: false }));
    await P.waitForTimeout(60); await P.selectOption('#eq-s-a', 'jim'); await P.fill('#eq-s-motivo', 'Licencia hasta el 30/11'); await enviar('[data-eq-salida]');
    ok('V22-3.permiso-destino' + sfx, 'No pasa prospectos a quien no puede gestionarlos, y el formulario conserva el motivo', /no puede recibir ese trabajo/.test(await toastTxt()) && (await P.locator('#eq-s-motivo').inputValue()) === 'Licencia hasta el 30/11', await toastTxt());
    await P.selectOption('#eq-s-a', 'vic'); await enviar('[data-eq-salida]');
    { const e = await T.estado(), x = e.equipoInactivo.find(m => m.id === 'mat');
      ok('V22-3.pausa' + sfx, 'Matías queda pausado, fuera del equipo y del selector de perfiles', x && x.estado === 'pausa' && !e.equipo.some(m => m.id === 'mat') && !(await perfiles()).includes('mat'));
      ok('V22-3.traspaso' + sfx, 'Sus tareas, prospectos y llegadas automáticas pasan a Victoria', !e.tareas.some(t => t.resp === 'mat' && t.estado !== 'hecha') && !e.prospectos.some(p => p.resp === 'mat' && ['nuevo', 'contactado'].includes(p.estado)) && Object.values(e.config.llegadas).every(v => v === 'vic'));
      ok('V22-3.aviso' + sfx, 'Victoria recibe un aviso', e.notificaciones.some(n => n.para === 'vic' && /trabajo abierto de Matías/.test(n.titulo))); }
    ok('V22-3.lista' + sfx, 'Figura en «Fuera del equipo» como Pausado, con motivo y a quién pasó', /Matías\s*◐\s*Pausado/.test(await T.texto('[data-eq-inactivo="mat"]')) && /Licencia hasta el 30\/11/.test(await T.texto('[data-eq-inactivo="mat"]')) && /pasó a Victoria/.test(await T.texto('[data-eq-inactivo="mat"]')));
    ok('V22-3.foco' + sfx, 'El foco va a «Fuera del equipo»', await P.evaluate(() => document.activeElement.id === 'eq-inactivos-t'));
    ok('V22-3.sin-acceso' + sfx, 'Matías no puede actuar', await P.evaluate(() => !puede('mat', 'gestionarProspecto') && !esEquipo('mat')));
    ok('V22-3.textos' + sfx, 'Los textos de quién puede ya no lo nombran', await P.evaluate(() => !/Matías/.test(QUIEN.gestionarProspecto)));
    await T.ir('#/tarea/t01'); ok('V22-3.historial' + sfx, 'Su nombre sigue en el historial (no aparece como id)', !/\bmat\b/.test(await T.texto('main')));
    { const r = await T.act('simularProspecto', { origen: 'web' }); const e = await T.estado(); ok('V22-3.llegadas' + sfx, 'Las llegadas nuevas van a Victoria', r.ok && e.prospectos[e.prospectos.length - 1].resp === 'vic'); }

    // 4 · Baja de Evangelina: alertas fijas a Manuel y límites
    { const r = await T.act('equipoSalida', { id: 'eva', tipo: 'baja', a: 'man', motivo: 'Dejó la empresa' }); ok('V22-4.baja' + sfx, 'Manuel da de baja a Evangelina y su trabajo pasa a él', r.ok && /Pasaron a Manuel/.test(r.ev.efecto), r.error || r.ev.efecto); }
    ok('V22-4.alertas' + sfx, 'Sus alertas fijas (renovaciones) le llegan a Manuel', await P.evaluate(() => { const a = alertas(window.__brokeros.estado()); return !a.some(x => x.para.includes('eva')) && a.filter(x => x.regla === 'e').every(x => x.para.includes('man')); }));
    { const r = await T.act('equipoReactivar', { id: 'eva' }); ok('V22-4.no-reactiva' + sfx, 'Una baja no se reactiva', !r.ok && /dalo de alta de nuevo/.test(r.error)); }
    { const r = await T.act('equipoSalida', { id: 'jim', tipo: 'baja', a: 'man', motivo: 'x' }); ok('V22-4.unico' + sfx, 'No se da de baja a la única persona con un permiso', !r.ok && /única persona/.test(r.error), r.error); }
    for (const id of ['man', 'emi']) { const r = await T.act('equipoSalida', { id, tipo: 'pausa', a: 'vic', motivo: 'x' }); ok(`V22-4.fijo-${id}` + sfx, `${id} no se pausa`, !r.ok && /administran Broker OS/.test(r.error)); }
    { const r = await T.act('equipoSalida', { id: 'luc', tipo: 'pausa', a: 'vic', motivo: '' }); ok('V22-4.motivo' + sfx, 'Pausar exige un motivo', !r.ok && /motivo/.test(r.error)); }

    // 5 · Reactivar
    await T.ir('#/configuracion/equipo'); await P.getByRole('button', { name: 'Reactivar a Matías' }).click(); await P.waitForTimeout(60);
    { const e = await T.estado(); ok('V22-5.reactivar' + sfx, 'Matías vuelve al equipo con sus permisos y al selector', e.equipo.some(m => m.id === 'mat') && !e.equipoInactivo.some(m => m.id === 'mat') && (await perfiles()).includes('mat') && await P.evaluate(() => puede('mat', 'gestionarProspecto'))); }
    ok('V22-5.trabajo' + sfx, 'El trabajo que pasó a Victoria no vuelve solo', (await T.estado()).prospectos.filter(p => p.resp === 'mat' && ['nuevo', 'contactado'].includes(p.estado)).length === 0);

    // 6 · Historial, accesibilidad, persistencia
    await T.ir('#/configuracion/historial'); ok('V22-6.historial' + sfx, 'El historial registra alta, pausa, baja y reactivación', ['Dio de alta a Sofía Gómez', 'Pausó a Matías', 'Dio de baja a Evangelina', 'Reactivó a Matías'].every(x => (async () => true)()) && /Dio de alta a Sofía Gómez/.test(await T.texto('main')) && /Pausó a Matías/.test(await T.texto('main')) && /Dio de baja a Evangelina/.test(await T.texto('main')) && /Reactivó a Matías/.test(await T.texto('main')));
    await T.ir('#/configuracion/equipo'); await P.getByRole('button', { name: 'Dar de baja a Lucía' }).click(); await P.waitForTimeout(60);
    { const v = await AXE(P); ok('V22-A11Y' + sfx, 'axe WCAG 2.2 sin violaciones con el formulario de baja abierto y miembros fuera del equipo', !v.length, v.join(' ')); }
    ok('V22-SCROLL' + sfx, 'Sin desplazamiento horizontal', await sinScroll());
    await T.foto('V22-equipo');
    await P.reload(); await P.waitForSelector('#root > *');
    ok('V22-6.recarga' + sfx, 'Después de recargar, Evangelina sigue fuera y Sofía en el selector', !(await perfiles()).includes('eva') && (await perfiles()).includes(nuevo.id));
    await P.evaluate(() => window.__brokeros.reiniciar()); await P.waitForTimeout(40);
    ok('V22-6.reiniciar' + sfx, 'Reiniciar la demo vuelve al equipo inicial', (await perfiles()).includes('eva') && !(await perfiles()).includes(nuevo.id) && (await T.estado()).equipo.length === 8);

    // 7 · Lo asignado fijo y los permisos al salir (auditoría V1–V4)
    await T.perfil('man');
    { await T.act('r4Ejecutar', {}); const c0 = (await T.estado()).cotizaciones.slice(-1)[0];
      const r = await T.act('equipoSalida', { id: 'luc', tipo: 'pausa', a: 'vic', motivo: 'Vacaciones' }); ok('V22-7.cot-destino' + sfx, 'Las cotizaciones abiertas de Lucía no pasan a quien no puede confirmarlas', !r.ok && /no puede recibir ese trabajo/.test(r.error), r.error);
      const r2 = await T.act('equipoSalida', { id: 'luc', tipo: 'pausa', a: 'man', motivo: 'Vacaciones' }); const e = await T.estado();
      ok('V22-7.cot-traspaso' + sfx, 'Al pausar a Lucía, su cotización abierta pasa a Manuel', r2.ok && c0.resp === 'luc' && e.cotizaciones.find(x => x.id === c0.id).resp === 'man', r2.error);
      await T.act('r4Ejecutar', {}); ok('V22-7.cotizar' + sfx, '/cotizar con Lucía pausada asigna la cotización a Manuel', (await T.estado()).cotizaciones.slice(-1)[0].resp === 'man'); }
    { const r = await T.act('equipoSalida', { id: 'eva', tipo: 'pausa', a: 'vic', motivo: 'Licencia' }); ok('V22-7.exp-destino' + sfx, 'El expediente de Evangelina no pasa a quien no ve Importación', !r.ok && /no puede recibir ese trabajo/.test(r.error), r.error);
      const r2 = await T.act('equipoSalida', { id: 'eva', tipo: 'pausa', a: 'man', motivo: 'Licencia' }); ok('V22-7.exp-traspaso' + sfx, 'Con Manuel como destino, el expediente pasa a él', r2.ok && (await T.estado()).expedientes.find(x => x.id === 'EXP-LB-1').resp === 'man', r2.error); }
    { const r = await T.act('resolverPaso', { ej: 'EJ-REN-0102', poliza: 'pol11', paso: 0, modo: 'tarea' }); const t = (await T.estado()).tareas.slice(-1)[0];
      ok('V22-7.renovacion' + sfx, 'La tarea de seguimiento de renovación va a Manuel, que cubre a Evangelina', r.ok && t.resp === 'man', r.error || t.resp); }
    { const r = await T.act('cfgRestablecer', { seccion: 'permisos' }); ok('V22-7.restablecer' + sfx, 'Restablecer permisos no devuelve permisos a quien está fuera', r.ok && await P.evaluate(() => !puede('luc', 'confirmarCotizacion') && puede('man', 'confirmarCotizacion') && !puede('eva', 'importar')), JSON.stringify(r).slice(0,300)); }
    { const r = await T.act('equipoSalida', { id: 'vic', tipo: 'pausa', a: 'man', motivo: 'Licencia' }); ok('V22-7.no-falso-unico' + sfx, 'Con otros fuera, pausar a Victoria no da un falso «única persona»', r.ok, r.error); }
    await P.evaluate(() => window.__brokeros.reiniciar()); await P.waitForTimeout(40);

    // 8 · Segunda auditoría (W1–W4): permisos que quedarían vacíos, cobertura con permisos, avisos y textos
    await P.evaluate(() => window.__brokeros.reiniciar()); await P.waitForTimeout(40); await T.perfil('man');
    { await T.act('cfgPermiso', { accion: 'confirmarFactura', miembro: 'man', valor: true });
      const r0 = await T.act('equipoSalida', { id: 'jim', tipo: 'baja', a: 'man', motivo: 'Dejó la empresa' });
      const r = await T.act('cfgRestablecer', { seccion: 'permisos' });
      ok('V22-8.restablecer-vacio' + sfx, 'Con Jimena de baja, restablecer permisos no deja «Confirmar facturas» sin nadie', r0.ok && !r.ok && /nadie del equipo tendría «Confirmar la emisión de facturas»/.test(r.error) && await P.evaluate(() => puede('man', 'confirmarFactura')), r0.error || r.error);
      ok('V22-8.textos-jim' + sfx, 'Los textos ya no nombran a Jimena como quien confirma', await P.evaluate(() => !/Jimena/.test(QUIEN.confirmarFactura) && !/Jimena/.test(QUIEN.verFacturacion))); }
    { const r0 = await T.act('equipoSalida', { id: 'luc', tipo: 'baja', a: 'jim', motivo: 'x' }); const r1 = await T.act('equipoSalida', { id: 'luc', tipo: 'baja', a: 'vic', motivo: 'Dejó la empresa' });
      await T.act('r4Ejecutar', {}); ok('V22-8.cotizar-permiso' + sfx, '/cotizar con Lucía fuera va a quien puede confirmar cotizaciones (Manuel), no a Victoria', !r0.ok && r1.ok && (await T.estado()).cotizaciones.slice(-1)[0].resp === 'man', r1.error); }
    { for (const [a, v] of [['verRiesgos', true], ['importar', true]]) await T.act('cfgPermiso', { accion: a, miembro: 'vic', valor: v });
      const r = await T.act('equipoSalida', { id: 'eva', tipo: 'pausa', a: 'vic', motivo: 'Licencia' });
      const al = () => P.evaluate(() => alertas(window.__brokeros.estado()).filter(x => ['a', 'c'].includes(x.regla)).map(x => x.para.join(',')));
      const antes = await al();
      const q = await T.act('cfgPermiso', { accion: 'importar', miembro: 'vic', valor: false }); await T.act('cfgPermiso', { accion: 'verRiesgos', miembro: 'vic', valor: false });
      const despues = await al();
      ok('V22-8.alertas-permiso' + sfx, 'Las alertas de Risk OS de Evangelina van a Victoria mientras ve riesgos, y a Manuel cuando ya no', r.ok && antes.length && antes.every(x => x.includes('vic')) && despues.every(x => !x.includes('vic') && x.includes('man')), JSON.stringify([r.error, antes, despues]));
      ok('V22-8.aviso-heredado' + sfx, 'Quitarle «Importar» avisa que sigue con los expedientes heredados (EXP-LB-1 y el relevamiento de Cerro Liso)', q.ok && /sigue con 2 expedientes de importación/.test(q.ev.efecto), q.ev && q.ev.efecto);
      ok('V22-8.textos-eva' + sfx, '«Sin acceso a Riesgos» ya no nombra a Evangelina, y los textos fijos aclaran que salió', await P.evaluate(() => !/Evangelina/.test(QUIEN.verRiesgos) && /\(Evangelina ya no está en el equipo\.\)$/.test(QUIEN.resolverExcepcion))); }
    await P.evaluate(() => window.__brokeros.reiniciar()); await P.waitForTimeout(40);

    // 9 · Tercera auditoría (X1–X3)
    await T.perfil('man');
    { await T.act('cfgPermiso', { accion: 'confirmarCotizacion', miembro: 'vic', valor: true }); await T.act('cfgPermiso', { accion: 'confirmarCotizacion', miembro: 'man', valor: false });
      const r = await T.act('equipoSalida', { id: 'luc', tipo: 'baja', a: 'jim', motivo: 'Dejó la empresa' }); await T.act('r4Ejecutar', {});
      ok('V22-9.cotizar-respaldo' + sfx, 'Si nadie de la cadena ni Manuel confirma cotizaciones, /cotizar va a quien sí puede (Victoria)', r.ok && (await T.estado()).cotizaciones.slice(-1)[0].resp === 'vic', r.error); }
    { await T.act('cfgPermiso', { accion: 'confirmarFactura', miembro: 'man', valor: true }); await T.act('equipoSalida', { id: 'jim', tipo: 'pausa', a: 'man', motivo: 'Licencia' });
      ok('V22-9.facturar' + sfx, 'Facturación dice que nada se emite hasta que Manuel confirma', await (async () => { await T.ir('#/gestiones/facturacion'); const t = await T.texto('main'); return /hasta que Manuel confirma/.test(t) && !/(hasta que|confirma la emisión) Jimena/.test(t); })()); }
    { await P.evaluate(() => window.__brokeros.reiniciar()); await P.waitForTimeout(40); await T.perfil('man');
      await T.act('equipoAlta', { nombre: 'Ana Paz', rol: 'Atención', copiar: 'vic' }); const r = await T.act('cfgRestablecer', { seccion: 'permisos' });
      ok('V22-9.restablecer-altas' + sfx, 'Restablecer permisos avisa que los miembros nuevos quedan sin permisos de acción', r.ok && /Ana Paz queda sin permisos de acción/.test(r.ev.efecto), r.error || r.ev.efecto); }
    await P.evaluate(() => window.__brokeros.reiniciar()); await P.waitForTimeout(40);

    // 10 · Cuarta auditoría (Y1, Y2)
    await T.perfil('man');
    { for (const [a, v] of [['verRiesgos', true], ['importar', true]]) await T.act('cfgPermiso', { accion: a, miembro: 'vic', valor: v });
      const r0 = await T.act('equipoSalida', { id: 'eva', tipo: 'pausa', a: 'vic', motivo: 'Licencia' });
      const r = await T.act('entrante', { canal: 'whatsapp', persona: 'p14', texto: 'Hola, ¿cómo sigue lo de mi póliza?' }); const e = await T.estado(), u = e.ultimoRuteo;
      ok('V22-10.ruteo' + sfx, 'Con Evangelina en pausa, el mensaje de un cliente con renovación trabada se asigna a Victoria, que la cubre', r0.ok && r.ok && u.regla === 4 && u.notificados[0] === 'vic' && !e.atenciones.some(a => a.integrante === 'eva' && !a.hasta), JSON.stringify([r0.error, r.error, u && u.destino])); }
    { await P.evaluate(() => window.__brokeros.reiniciar()); await P.waitForTimeout(40); await T.perfil('man');
      await T.act('cfgPermiso', { accion: 'confirmarCotizacion', miembro: 'vic', valor: true }); await T.act('cfgPermiso', { accion: 'confirmarCotizacion', miembro: 'man', valor: false });
      ok('V22-10.sin-traspaso' + sfx, 'Si quien salió no traspasó trabajo y Manuel no puede, /cotizar va a quien sí puede', await P.evaluate(() => { const d = JSON.parse(JSON.stringify(window.__brokeros.estado())); d.equipoInactivo = [{ id: 'luc', nombre: 'Lucía', pasoA: null }]; return cubre(d, 'luc', 'confirmarCotizacion') === 'vic' && cubre(d, 'luc') === 'man'; })); }
    await P.evaluate(() => window.__brokeros.reiniciar()); await P.waitForTimeout(40);
    ok('V22-ERR' + sfx, 'Sin errores de JavaScript', !T.errores.length, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('equipo-v22');
})();
