// v19 · Pedido de Emiliano del 31/10: «Quiero hacer un panel de configuración de Broker OS.» Sección Configuración para
// Emiliano y Manuel: permisos del equipo, llegadas de prospectos, datos para ser cliente, umbrales de alertas, compañías
// y ramos, integraciones e historial. Los cambios se guardan en la demo y cambian cómo se comporta el prototipo.
const { iniciar, ok, informe } = require('./lib');
const AXE = async P => { await P.addScriptTag({ url: '/axe.js' }); return P.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map(v => v.id + ':' + v.nodes.length)); };
const TARJETA = '4509 9535 6623 3704';
const TABS = ['equipo', 'prospectos', 'clientes', 'alertas', 'catalogos', 'integraciones', 'historial'];
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    const sinScroll = () => P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    const cfg = async () => (await T.estado()).config || null;
    const nav = () => P.locator('.sidebar a[data-nav]').evaluateAll(r => r.map(a => a.dataset.nav));
    const marcar = async (accion, m) => { await P.locator(`#cfg-p-${accion}-${m}`).click(); await P.waitForTimeout(60); };
    const chk = sel => P.locator(sel).isChecked();
    const toastTxt = async () => (await P.locator('.toast').count()) ? P.locator('.toast').innerText() : '';

    // 1 · Quién entra
    for (const p of ['emi', 'man']) { await T.perfil(p); ok(`V19-1.nav-${p}` + sfx, `${p} ve Configuración en el menú, antes de Demo`, (await nav()).join(',').endsWith('configuracion,demo')); }
    for (const p of ['eva', 'vic', 'luc', 'jim', 'pil', 'mat']) {
      await T.perfil(p); await T.ir('#/configuracion/equipo');
      ok(`V19-1.sin-${p}` + sfx, `${p} no la ve en el menú y la ruta dice Sin acceso`, !(await nav()).includes('configuracion') && /Sin acceso/.test(await T.texto('main')) && !(await P.locator('[data-cfg-permisos]').count()));
      const r = await T.act('cfgPermiso', { accion: 'editarPersona', miembro: 'emi', valor: true }); ok(`V19-1.act-${p}` + sfx, `${p} no puede cambiar la configuración por la acción`, !r.ok && /Configuran Broker OS/.test(r.error), r.error);
    }
    await T.perfil('r1'); await T.ir('#/configuracion/equipo');
    ok('V19-1.r1' + sfx, 'El revisor (R1) no la ve ni entra', !(await nav()).includes('configuracion') && /Sin acceso/.test(await T.texto('main')) && !(await P.locator('[data-configuracion]').count()));
    await T.perfil('pcl'); await T.ir('#/configuracion/equipo');
    ok('V19-1.portal' + sfx, 'El portal de la empresa no la muestra', !(await P.locator('[data-configuracion]').count()));

    // 2 · Cada pestaña: rótulos, accesibilidad y sin desplazamiento horizontal
    await T.perfil('emi');
    for (const t of TABS) {
      await T.ir('#/configuracion/' + t);
      const txt = await T.texto('main');
      ok(`V19-2.${t}` + sfx, `La pestaña ${t} se muestra activa con los rótulos Simulado y Futuro`, (await P.locator(`[data-configuracion="${t}"]`).count()) === 1 && /Simulado: se guarda en esta demo/.test(txt) && /Futuro: administración real de usuarios/.test(txt) && /no hay cuentas reales/.test(txt));
      const v = await AXE(P); ok(`V19-A11Y.${t}` + sfx, `axe WCAG 2.2 sin violaciones en ${t}`, !v.length, v.join(' '));
      ok(`V19-SCROLL.${t}` + sfx, `Sin desplazamiento horizontal en ${t}`, await sinScroll());
      await T.foto('V19-' + t);
    }
    await T.ir('#/configuracion/nada'); ok('V19-2.inexistente' + sfx, 'Una pestaña inexistente dice que no existe', /no existe/.test(await T.texto('main')));

    // 3 · Permisos: dar y quitar se aplica en todo el prototipo
    await T.ir('#/configuracion/equipo');
    ok('V19-3.inicial' + sfx, 'Al empezar, Emiliano gestiona prospectos (v22) y da altas (v18.1), y Jimena da altas', (await chk('#cfg-p-gestionarProspecto-emi')) && (await chk('#cfg-p-editarPersona-emi')) && (await chk('#cfg-p-editarPersona-jim')));
    await marcar('gestionarProspecto', 'emi');
    ok('V19-3.dar' + sfx, 'Al desmarcar, Emiliano queda sin el permiso, la fila muestra ● y el aviso lista a quienes lo tienen', !(await chk('#cfg-p-gestionarProspecto-emi')) && Array.isArray((await cfg()).perm.gestionarProspecto) && !(await cfg()).perm.gestionarProspecto.includes('emi') && (await P.locator('[data-cfg-perm="gestionarProspecto"] .cfg-cambio').count()) === 1 && /Ahora lo tienen: /.test(await toastTxt()) && !/Emiliano/.test(await toastTxt()), await toastTxt());
    ok('V19-3.foco' + sfx, 'El foco sigue en la casilla después del cambio', await P.evaluate(() => document.activeElement && document.activeElement.id === 'cfg-p-gestionarProspecto-emi'));
    await T.ir('#/clientes/prospectos');
    ok('V19-3.boton' + sfx, 'Sin el permiso, Emiliano no ve «Nuevo prospecto»', (await P.getByRole('link', { name: 'Nuevo prospecto' }).count()) === 0);
    { const r = await T.act('guardarProspecto', { tipo: 'persona', nombre: 'Prueba Cero', tel: '+54 9 261 555-0401', resp: 'emi' }); ok('V19-3.emi-antes' + sfx, 'Sin el permiso, a Emiliano se le rechaza cargar un prospecto', !r.ok, r.error); }
    await T.ir('#/configuracion/equipo'); await marcar('gestionarProspecto', 'emi');
    ok('V19-3.quitar-emi' + sfx, 'Al volver a marcar vuelve al valor inicial', !((await cfg()).perm.gestionarProspecto) && (await chk('#cfg-p-gestionarProspecto-emi')), JSON.stringify((await cfg()).perm));
    { const r = await T.act('guardarProspecto', { tipo: 'persona', nombre: 'Prueba Uno', tel: '+54 9 261 555-0400', resp: 'emi' }); ok('V19-3.emi-alta' + sfx, 'Con el permiso restituido, Emiliano carga un prospecto', r.ok, r.error); }
    await T.ir('#/configuracion/equipo'); await marcar('editarPersona', 'jim');
    await T.perfil('jim'); { const r = await T.act('altaPersona', { nombre: 'Prueba Dos', dni: '30111223', decision: 'nueva' });
      ok('V19-3.quitar' + sfx, 'A Jimena, sin el permiso, el alta se le rechaza con un motivo que nombra a quiénes pueden', !r.ok && /según la configuración/.test(r.error) && /Emiliano/.test(r.error) && !/Jimena/.test(r.error), r.error); }
    await T.ir('#/clientes/personas'); ok('V19-3.quitar-ui' + sfx, 'Jimena ya no ve «Nueva persona»', (await P.getByRole('link', { name: 'Nueva persona' }).count()) === 0);
    // Ver riesgos: abre el menú para Victoria sin tocar al revisor
    await T.perfil('emi'); await T.ir('#/configuracion/equipo'); await marcar('verRiesgos', 'vic');
    await T.perfil('vic'); ok('V19-3.riesgos-vic' + sfx, 'Victoria ve Riesgos en el menú', (await nav()).includes('riesgos'));
    await T.ir('#/riesgos'); ok('V19-3.riesgos-pantalla' + sfx, 'La pantalla de riesgos abre para Victoria', !/Sin acceso/.test(await T.texto('main')) && !T.errores.length, T.errores.join(' '));
    await T.perfil('r1'); ok('V19-3.r1-intacto' + sfx, 'El revisor sigue viendo Riesgos', (await nav()).includes('riesgos'));
    // Último con el permiso
    await T.perfil('emi'); await T.ir('#/configuracion/equipo'); await marcar('confirmarFactura', 'jim');
    ok('V19-3.ultimo' + sfx, 'No se puede quitar el permiso a la última persona que lo tiene: la casilla sigue marcada', (await chk('#cfg-p-confirmarFactura-jim')) && /Al menos una persona/.test(await toastTxt()) && !((await cfg()).perm.confirmarFactura), await toastTxt());
    { const r = await T.act('cfgPermiso', { accion: 'configurar', miembro: 'vic', valor: true }); ok('V19-3.fijo' + sfx, 'Configurar Broker OS no se puede dar desde la tabla', !r.ok, r.error); }
    { const r = await T.act('cfgPermiso', { accion: 'editarPersona', miembro: 'r1', valor: true }); ok('V19-3.externo' + sfx, 'Al revisor no se le dan permisos del equipo', !r.ok, r.error); }
    // Volver al inicial deja de marcar el cambio
    await marcar('verRiesgos', 'vic');
    ok('V19-3.vuelve' + sfx, 'Desmarcar lo agregado vuelve al valor inicial y borra la marca', !((await cfg()).perm.verRiesgos) && (await P.locator('[data-cfg-perm="verRiesgos"] .cfg-cambio').count()) === 0);

    // 4 · Llegadas de prospectos
    await T.ir('#/configuracion/prospectos');
    ok('V19-4.inicial' + sfx, 'Las tres llegadas automáticas van a Matías', (await P.locator('#cfg-lleg-web').inputValue()) === 'mat' && (await P.locator('#cfg-lleg-redes').inputValue()) === 'mat' && (await P.locator('#cfg-lleg-campana').inputValue()) === 'mat');
    ok('V19-4.elegibles' + sfx, 'Solo se ofrecen personas con «Gestionar prospectos» (v22: Emiliano incluido, el revisor no)', (await P.locator('#cfg-lleg-web option[value="emi"]').count()) === 1 && !(await P.locator('#cfg-lleg-web option[value="r1"]').count()) && (await P.locator('#cfg-lleg-web option[value="vic"]').count()) === 1);
    await P.selectOption('#cfg-lleg-web', 'vic'); await P.waitForTimeout(60);
    ok('V19-4.cambio' + sfx, 'Las llegadas por el sitio pasan a Victoria', (await cfg()).llegadas.web === 'vic' && /Victoria/.test(await toastTxt()));
    await T.perfil('man'); const nAntes = (await T.estado()).notificaciones.length;
    { const r = await T.act('simularProspecto', { origen: 'web' }); const e = await T.estado(), p = e.prospectos[e.prospectos.length - 1], nuevas = e.notificaciones.slice(nAntes);
      ok('V19-4.llega' + sfx, 'Un prospecto del sitio llega asignado a Victoria, con aviso a ella y no a Matías', r.ok && p.resp === 'vic' && nuevas.some(n => n.para === 'vic' && n.obj.id === p.id) && !nuevas.some(n => n.para === 'mat' && n.obj.id === p.id) && /lo sigue Victoria/.test(r.ev.efecto), JSON.stringify(nuevas));
      const r2 = await T.act('simularProspecto', { origen: 'redes' }); const e2 = await T.estado();
      ok('V19-4.otro-origen' + sfx, 'Las de redes siguen yendo a Matías', r2.ok && e2.prospectos[e2.prospectos.length - 1].resp === 'mat'); }
    await T.perfil('emi');
    { const r = await T.act('cfgPermiso', { accion: 'gestionarProspecto', miembro: 'vic', valor: false }); ok('V19-4.guarda' + sfx, 'No se le quita «Gestionar prospectos» a quien recibe llegadas', !r.ok && /Llegadas de prospectos/.test(r.error), r.error); }
    { const r = await T.act('cfgLlegadas', { origen: 'web', resp: 'r1' }); ok('V19-4.no-elegible' + sfx, 'No se asignan llegadas a alguien sin el permiso', !r.ok, r.error); }

    // 5 · Datos para ser cliente
    await T.ir('#/configuracion/clientes');
    ok('V19-5.fijo' + sfx, 'Muestra lo fijo: nombre y DNI, razón social y CUIT', /Nombre y apellido/.test(await T.texto('[data-cfg-clientes]')) && /CUIT \(11 dígitos\)/.test(await T.texto('[data-cfg-clientes]')) && (await P.locator('.cfg-fijo').count()) === 4);
    await P.locator('#cfg-x-contactoPersona').click(); await P.waitForTimeout(60); await P.locator('#cfg-x-domicilioEmpresa').click(); await P.waitForTimeout(60);
    ok('V19-5.marcado' + sfx, 'Las dos opciones quedan marcadas', (await cfg()).extras.contactoPersona && (await cfg()).extras.domicilioEmpresa);
    await T.ir('#/clientes/nueva'); ok('V19-5.aviso-persona' + sfx, 'El alta de persona avisa que pide teléfono o correo', (await P.locator('[data-cfg-extra="persona"]').count()) === 1);
    { const r = await T.act('altaPersona', { nombre: 'Prueba Tres', dni: '30111224', decision: 'nueva' }); ok('V19-5.persona-sin' + sfx, 'Sin teléfono ni correo, el alta se rechaza', !r.ok && /teléfono o un correo/.test(r.error), r.error); }
    { const r = await T.act('altaPersona', { nombre: 'Prueba Tres', dni: '30111224', tel: '+54 9 261 555-0300', decision: 'nueva' }); ok('V19-5.persona-con' + sfx, 'Con teléfono, el alta pasa', r.ok, r.error); }
    { const r = await T.act('altaPersona', { nombre: 'Otra', dni: '30111224', decision: 'vincular' }); ok('V19-5.vincular' + sfx, 'Vincular a una persona existente no pide teléfono', r.ok, r.error); }
    await T.ir('#/clientes/nueva-empresa'); ok('V19-5.aviso-empresa' + sfx, 'El alta de empresa avisa que pide domicilio', (await P.locator('[data-cfg-extra="empresa"]').count()) === 1);
    { const r = await T.act('altaEmpresa', { nombre: 'Empresa Prueba S.A.', cuit: '30712345674', decision: 'nueva' }); ok('V19-5.empresa-sin' + sfx, 'Sin domicilio, el alta de empresa se rechaza', !r.ok && /domicilio/.test(r.error), r.error); }
    // Prospecto empresa sin domicilio (Estudio Contable Peñaloza, segunda llegada por el sitio)
    await T.perfil('man'); await T.act('simularProspecto', { origen: 'web' }); const est = await T.estado(), pe = est.prospectos[est.prospectos.length - 1];
    await T.ir('#/clientes/prospecto/' + pe.id);
    ok('V19-5.prospecto' + sfx, 'El prospecto empresa sin domicilio dice que le falta el domicilio', pe.nombre === 'Estudio Contable Peñaloza' && /falta: domicilio/i.test(await T.texto('[data-pr-conv]')), await T.texto('[data-pr-conv]'));
    { const r = await T.act('convertirProspecto', { id: pe.id }); ok('V19-5.no-convierte' + sfx, 'No se convierte sin domicilio', !r.ok && /domicilio/.test(r.error), r.error); }
    await P.locator('#pr-completar').click(); await P.waitForTimeout(60);
    ok('V19-5.foco' + sfx, '«Completar datos» lleva al campo Domicilio', await P.evaluate(() => document.activeElement && document.activeElement.id === 'pr-e-dom'));
    await T.ir('#/clientes/prospectos'); ok('V19-5.lista' + sfx, 'La lista dice «Falta domicilio»', /Falta domicilio/.test(await T.texto(`[data-prospecto="${pe.id}"]`)));

    // 6 · Umbrales de alertas
    await T.perfil('emi'); await T.ir('#/configuracion/alertas');
    const alertasDe = regla => P.evaluate(r => alertas(window.__brokeros.estado()).filter(a => a.regla === r).length, regla);
    ok('V19-6.inicial' + sfx, 'Con los valores iniciales hay un aviso de renovación (póliza a 10 días) y uno de solicitud (3 días hábiles)', (await alertasDe('e')) === 1 && (await alertasDe('c')) === 1 && (await T.texto('[data-cfg-activas="e"]')) === '1');
    { const r = await T.act('cfgUmbrales', { renovacionDias: '0' }); ok('V19-6.rango' + sfx, 'Un umbral fuera de rango se rechaza', !r.ok && /entre 1 y 90/.test(r.error), r.error); }
    ok('V19-6.rango-ui' + sfx, 'El campo limita el rango (1 a 90)', (await P.locator('#cfg-u-renovacionDias').getAttribute('min')) === '1' && (await P.locator('#cfg-u-renovacionDias').getAttribute('max')) === '90');
    await P.fill('#cfg-u-renovacionDias', '7'); await P.fill('#cfg-u-solicitudDias', '3'); await P.locator('[data-cfg-alertas] button[type="submit"]').click(); await P.waitForTimeout(60);
    ok('V19-6.renovacion' + sfx, 'Con 7 días la póliza a 10 días deja de avisar, y la tabla lo cuenta', (await cfg()).umbrales.renovacionDias === 7 && (await alertasDe('e')) === 0 && (await T.texto('[data-cfg-activas="e"]')) === '0' && (await P.locator('[data-cfg-umbral="renovacionDias"] .cfg-cambio').count()) === 1);
    ok('V19-6.solicitud' + sfx, 'Con 3 días hábiles la solicitud de 3 días sigue avisando', (await alertasDe('c')) === 1);
    await T.perfil('eva'); await T.ir('#/inicio');
    { const t = await T.texto('main'); ok('V19-6.inicio' + sfx, 'El inicio de Evangelina ya no muestra la renovación y rotula la solicitud con 3 días hábiles', !/ALT-TRC-33150 vence en 10 días/.test(t) && (await P.locator('[title*="solicitud sin respuesta en 3 días hábiles"]').count()) > 0, t.slice(0, 300)); }
    await T.perfil('emi'); { const r = await T.act('cfgUmbrales', { renovacionDias: '7' }); ok('V19-6.igual' + sfx, 'Guardar sin cambios avisa que no cambió nada', !r.ok && /No cambiaste/.test(r.error)); }
    await T.perfil('emi'); { const r = await T.act('cfgUmbrales', { ventanaMin: 'dos' }); ok('V19-6.numero' + sfx, 'Un umbral que no es número se rechaza', !r.ok && /número entero/.test(r.error)); }

    // 7 · Compañías y ramos
    await T.ir('#/configuracion/catalogos');
    await P.fill('#cfg-cat-compania', 'Aseguradora Andina Ficticia'); await P.locator('[data-cfg-catalogo="compania"] button[type="submit"]').click(); await P.waitForTimeout(60);
    ok('V19-7.agregar' + sfx, 'Agrega una compañía a la lista', /Aseguradora Andina Ficticia/.test(await T.texto('[data-cfg-catalogo="compania"]')));
    { const r = await T.act('cfgCatalogoAgregar', { tipo: 'compania', nombre: 'aseguradora andina ficticia' }); ok('V19-7.repetida' + sfx, 'No repite un nombre (sin importar mayúsculas)', !r.ok && /ya está/.test(r.error)); }
    { const r = await T.act('cfgCatalogoAgregar', { tipo: 'ramo', nombre: 'Ramo ' + TARJETA }); ok('V19-7.bancarios' + sfx, 'Un nombre con datos de tarjeta se rechaza', !r.ok && /tarjetas/.test(r.error)); }
    const primera = await P.locator('[data-cfg-catalogo="compania"] [data-cfg-item]').first().getAttribute('data-cfg-item');
    await P.locator(`[data-cfg-catalogo="compania"] [data-cfg-item="${primera}"] button`).click(); await P.waitForTimeout(60);
    await T.perfil('vic'); await T.ir('#/polizas/nueva');
    const sug = await P.locator('#pf-comps option').evaluateAll(o => o.map(x => x.value));
    ok('V19-7.sugerencias' + sfx, 'Al cargar una póliza se sugiere la compañía agregada y no la oculta', sug.includes('Aseguradora Andina Ficticia') && !sug.includes(primera), `${primera} · ${sug.join(', ')}`);
    await T.ir('#/polizas'); ok('V19-7.filtro' + sfx, 'El filtro de pólizas sigue ofreciendo la compañía oculta (hay pólizas con ella)', (await P.locator(`#f-comp option`).evaluateAll(o => o.map(x => x.textContent))).includes(primera));

    // 8 · Historial, persistencia y restablecer
    await T.perfil('emi'); await T.ir('#/configuracion/historial');
    const nHist = await P.locator('.cfg-hist li').count(), est2 = await T.estado();
    ok('V19-8.historial' + sfx, 'El historial lista cada cambio de configuración, del más reciente al más antiguo', nHist === est2.eventos.filter(e => e.cfg).length && nHist >= 10 && /Agregó la compañía|Ocultó la compañía/.test(await P.locator('.cfg-hist li').first().innerText()), nHist);
    ok('V19-8.pestana' + sfx, 'La pestaña dice Historial (n)', new RegExp(`Historial \\(${nHist}\\)`).test(await P.locator('.pestanas a[aria-current=page]').innerText()));
    await P.reload(); await P.waitForSelector('#root > *');
    ok('V19-8.recarga' + sfx, 'La configuración sigue después de recargar', (await cfg()).llegadas.web === 'vic' && (await cfg()).umbrales.renovacionDias === 7);
    for (const [sec, tab] of [['permisos', 'equipo'], ['clientes', 'clientes'], ['alertas', 'alertas'], ['catalogos', 'catalogos']]) {
      await T.ir('#/configuracion/' + tab); await P.locator(`[data-cfg-reset="${sec}"]`).click(); await P.waitForTimeout(60);
    }
    await T.ir('#/configuracion/prospectos'); await P.locator('[data-cfg-reset="prospectos"]').click(); await P.waitForTimeout(60);
    { const c = await cfg(); ok('V19-8.restablecer' + sfx, 'Restablecer deja cada sección con los valores iniciales', !Object.keys(c.perm).length && c.llegadas.web === 'mat' && !c.extras.contactoPersona && !c.extras.domicilioEmpresa && c.umbrales.renovacionDias === 15 && !c.catalogo.compania.length && !c.ocultas.compania.length, JSON.stringify(c)); }
    ok('V19-8.sin-reset' + sfx, 'Con los valores iniciales ya no se ofrece restablecer', !(await P.locator('[data-cfg-reset]').count()));
    await P.evaluate(() => window.__brokeros.reiniciar()); await P.waitForTimeout(40);
    ok('V19-8.reiniciar' + sfx, 'Reiniciar la demo borra la configuración', !(await cfg()));
    // 9 · Correcciones de la auditoría v19 (B1 a B6, N1 a N3)
    await T.perfil('emi'); await T.act('cfgPermiso', { accion: 'reasignarTareas', miembro: 'eva', valor: true });
    await T.perfil('eva'); await T.ir('#/tarea/t01');
    ok('V19-B1.eva' + sfx, 'Con «Reasignar tareas», Evangelina ve el formulario de reasignar', (await P.locator('form[data-form="tareaReasignar"]').count()) > 0);
    await T.perfil('emi'); await T.act('cfgPermiso', { accion: 'reasignarTareas', miembro: 'man', valor: false });
    await T.perfil('man'); await T.ir('#/tarea/t01');
    ok('V19-B1.man' + sfx, 'Sin el permiso, Manuel ya no ve el formulario de reasignar', (await P.locator('form[data-form="tareaReasignar"]').count()) === 0);
    await T.perfil('emi'); await T.ir('#/configuracion/equipo'); await marcar('gestionarProspecto', 'vic');
    ok('V19-B2' + sfx, 'Quitar «Gestionar prospectos» a quien no recibe llegadas funciona sin errores y avisa si sigue prospectos abiertos', !((await cfg()).perm.gestionarProspecto || []).includes('vic') && (await cfg()).perm.gestionarProspecto && /prospecto/.test(await toastTxt()) && !T.errores.length, (await toastTxt()) + T.errores.join(' '));
    await T.act('cfgPermiso', { accion: 'confirmarFactura', miembro: 'luc', valor: true }); await T.act('cfgPermiso', { accion: 'gestionarSiniestro', miembro: 'jim', valor: true }); { const r = await T.act('cfgPermiso', { accion: 'importar', miembro: 'vic', valor: true }); ok('V19-F1.sin-ver' + sfx, 'No se le da «Importar» a quien no ve riesgos', !r.ok && /Ver los riesgos/.test(r.error), r.error); }
    await T.act('cfgPermiso', { accion: 'verRiesgos', miembro: 'vic', valor: true }); await T.act('cfgPermiso', { accion: 'importar', miembro: 'vic', valor: true });
    { const r = await T.act('cfgPermiso', { accion: 'verRiesgos', miembro: 'vic', valor: false }); ok('V19-F1.quitar-ver' + sfx, 'No se le quita «Ver riesgos» a quien puede importar', !r.ok && /quitale primero «Importar»/.test(r.error), r.error); }
    await T.perfil('luc'); await T.ir('#/gestiones/facturacion'); ok('V19-B3.facturas' + sfx, 'Lucía con «Confirmar facturas» ve Facturación', !/Sin acceso/.test(await T.texto('main')));
    await T.perfil('jim'); await T.ir('#/gestiones/siniestros'); ok('V19-B3.siniestros' + sfx, 'Jimena con «Gestionar siniestros» ve Siniestros', !/Sin acceso/.test(await T.texto('main')));
    await T.perfil('vic'); ok('V19-B3.importar' + sfx, 'Victoria con «Importar» ve Importación en el menú', (await nav()).includes('importacion'));
    await T.perfil('emi'); await T.act('cfgPermiso', { accion: 'editarPersona', miembro: 'mat', valor: false });
    await T.perfil('mat'); await T.ir('#/clientes/prospecto/PR-005');
    ok('V19-B3.convertir' + sfx, 'Matías sin «Dar de alta» no ve «Convertir en cliente» y la ficha dice por qué', (await P.locator('#pr-convertir').count()) === 0 && (await P.locator('[data-pr-sin-alta]').count()) === 1);
    await T.perfil('emi'); { const r = await T.act('cfgPermiso', { accion: 'verRiesgos', miembro: 'man', valor: false });
      ok('V19-R1.fijo' + sfx, '«Ver riesgos» de Manuel y Evangelina queda fijo (reciben las alertas de Risk OS)', !r.ok && /queda fijo/.test(r.error), r.error); }
    await T.ir('#/configuracion/equipo');
    ok('V19-R1.ui' + sfx, 'Las casillas de Manuel, Evangelina y Emiliano están deshabilitadas, marcadas y dicen «Fijo»', (await P.locator('#cfg-p-verRiesgos-man').isDisabled()) && (await P.locator('#cfg-p-verRiesgos-eva').isDisabled()) && (await chk('#cfg-p-verRiesgos-man')) && (await P.locator('#cfg-p-verRiesgos-emi').isDisabled()) && (await P.locator('[data-cfg-perm="verRiesgos"] .cfg-fijo-celda').count()) === 3 && !(await P.locator('#cfg-p-verRiesgos-luc').isDisabled()));
    await T.perfil('luc'); await T.ir('#/gestiones/siniestros');
    ok('V19-R3' + sfx, 'El texto de quién ve Siniestros suma a Jimena', /^Siniestros: la ven .*Jimena.*Gestionar siniestros: lo hacen .*Jimena/.test(await P.evaluate(() => QUIEN.verSiniestros)), await P.evaluate(() => QUIEN.verSiniestros));
    await T.perfil('emi');
    await T.act('cfgUmbrales', { sinIdentMin: '30' });
    ok('V19-B4' + sfx, 'La alerta (f) dice el umbral configurado', await P.evaluate(() => alertas(window.__brokeros.estado()).some(a => a.regla === 'f' && /más de 30 min hábiles/.test(a.titulo))));
    await T.act('cfgLlegadas', { origen: 'redes', resp: 'eva' }); await T.ir('#/configuracion/prospectos');
    ok('V19-B5' + sfx, 'La pestaña de llegadas no afirma que hoy van a Matías', !/Hoy van a Matías/.test(await T.texto('[data-cfg-llegadas]')) && /Por omisión van a Matías/.test(await T.texto('[data-cfg-llegadas]')));
    await T.ir('#/configuracion/clientes');
    ok('V19-B6' + sfx, 'Ningún texto del panel mide menos de 12 px', await P.evaluate(() => [...document.querySelectorAll('[data-configuracion] *')].filter(n => n.childNodes.length && [...n.childNodes].some(c => c.nodeType === 3 && c.textContent.trim()) && parseFloat(getComputedStyle(n).fontSize) < 12 && !n.closest('.sr')).length === 0));
    for (const [n, x] of [['cfgPermiso', { accion: 'toString', miembro: 'eva', valor: true }], ['cfgExtra', { clave: 'constructor', valor: true }], ['cfgLlegadas', { origen: '__proto__', resp: 'eva' }], ['cfgRestablecer', { seccion: 'constructor' }], ['cfgCatalogoAgregar', { tipo: 'toString', nombre: 'X' }]]) {
      const r = await T.act(n, x); ok(`V19-N1.${n}` + sfx, `${n} rechaza nombres heredados como ${Object.values(x)[0]}`, !r.ok, r.error);
    }
    await T.ir('#/configuracion/catalogos'); await P.locator('#cfg-oc-ramo-0').click(); await P.waitForTimeout(60);
    ok('V19-N2.ocultar' + sfx, 'El foco queda en el botón después de Ocultar', await P.evaluate(() => document.activeElement && document.activeElement.id === 'cfg-oc-ramo-0'));
    await P.fill('#cfg-cat-ramo', 'Vida'); await P.locator('[data-cfg-catalogo="ramo"] button[type="submit"]').click(); await P.waitForTimeout(60);
    ok('V19-N2.rechazo' + sfx, 'Un rechazo al agregar conserva lo escrito y el foco', (await P.locator('#cfg-cat-ramo').inputValue()) === 'Vida' && await P.evaluate(() => document.activeElement && document.activeElement.id === 'cfg-cat-ramo'));
    await T.ir('#/configuracion/historial'); await P.waitForTimeout(60);
    ok('V19-N3' + sfx, 'La pestaña activa queda a la vista', await P.evaluate(() => { const a = document.getElementById('cfg-tab-actual'), n = a.parentElement, r = a.getBoundingClientRect(), q = n.getBoundingClientRect(); return r.left >= q.left - 1 && r.right <= q.right + 1; }));
    ok('V19-ERR' + sfx, 'Sin errores de JavaScript', !T.errores.length, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('configuracion-v19');
})();
