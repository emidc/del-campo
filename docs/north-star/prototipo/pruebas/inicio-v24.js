// v24 · Inicio al día (pedido de Emiliano, 31/10: «Muchas cosas cambiaron desde que hicimos el dashboard»).
// Para atender suma las evaluaciones por aceptar; En curso, gestiones manuales, prospectos propios y propuestas que esperan;
// K-21 prospectos abiertos; accesos rápidos según permisos. Todo sigue a Configuración y conserva el inicio sereno.
const { iniciar, ok, informe } = require('./lib');
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    const sel = s => P.locator(s).count();
    const textos = async s => P.locator(s).allInnerTexts();
    let d;

    // 0 · Lo que el rol ya veía en «En curso» sigue estando (auditoría v24.1, B1: Emiliano perdía sus revisiones)
    for (const p of ['man', 'eva', 'vic', 'luc', 'jim', 'pil', 'mat', 'emi']) {
      const r = await P.evaluate(p => { const d = window.__brokeros.estado(), k = g => `${g.tipo}|${g.ruta}|${g.titulo}`, nuevo = new Set(gestionesEnCurso(d, p).map(k)), viejo = gestionesEnCursoV6(d, p).map(k); return { faltan: viejo.filter(x => !nuevo.has(x)), n: viejo.length }; }, p);
      ok(`V24-0.conserva-${p}` + sfx, `«En curso» de ${p} conserva todo lo que mostraba la vigente`, !r.faltan.length, r.faltan.join(' ; '));
    }
    ok('V24-0.emi-revisiones' + sfx, 'Emiliano sigue viendo las revisiones que nacen de una solicitud', await P.evaluate(() => gestionesEnCurso(window.__brokeros.estado(), 'emi').filter(g => g.tipo === 'revision').length) >= 2);

    // 1 · Prospectos en el inicio de quien los sigue
    await T.perfil('mat'); await T.ir('#/inicio');
    d = await T.estado();
    const mios = d.prospectos.filter(p => ['nuevo', 'contactado'].includes(p.estado) && p.resp === 'mat');
    ok('V24-1.filas' + sfx, 'Matías ve en «En curso» una fila por cada prospecto abierto que sigue', await sel('[data-gestion="prospecto"]') === mios.length && mios.length >= 2, mios.length);
    ok('V24-1.k21' + sfx, 'K-21 de Matías cuenta sus prospectos abiertos', +(await P.locator('[data-kpi="K-21"] .v').innerText()) === mios.length);
    const todos = d.prospectos.filter(p => ['nuevo', 'contactado'].includes(p.estado)).length;
    ok('V24-1.k21-man' + sfx, 'K-21 de Manuel y Emiliano cuenta los de todo el equipo', (await T.kpi('K-21', 'man')).nuevo + (await T.kpi('K-21', 'man')).contactado === todos && (await T.kpi('K-21', 'emi')).nuevo + (await T.kpi('K-21', 'emi')).contactado === todos);
    await P.locator('[data-gestion="prospecto"]').first().click(); await P.waitForTimeout(60);
    ok('V24-1.abre' + sfx, 'La fila abre la ficha del prospecto', /^#\/clientes\/prospecto\/PR-/.test(await T.hash()));
    // Un prospecto que llega por el sitio aparece sin recargar; al convertirlo sale de En curso
    await T.act('simularProspecto', { origen: 'web' }); await T.ir('#/inicio');
    ok('V24-1.llega' + sfx, 'Una llegada simulada suma una fila y un punto en K-21', await sel('[data-gestion="prospecto"]') === mios.length + 1);
    await T.perfil('jim'); await T.ir('#/inicio');
    ok('V24-1.jim' + sfx, 'Jimena (sin prospectos asignados ni K-21 en su perfil) no ve filas ni el indicador', await sel('[data-gestion="prospecto"]') === 0 && await sel('[data-kpi="K-21"]') === 0);

    // 2 · Gestiones cargadas a mano
    await T.perfil('pil');
    const g1 = await T.act('iniciarGestion', { tipo: 'persona', id: 'p02', gtipo: 'cotizacion', titulo: 'Cotizar hogar para la casa nueva', resp: 'pil' });
    const g2 = await T.act('iniciarGestion', { tipo: 'persona', id: 'p01', gtipo: 'cotizacion', titulo: 'Cotizar vida para el crédito', resp: 'vic' });
    await T.ir('#/inicio');
    let gm = await textos('[data-gestion="manual"]');
    ok('V24-2.propia' + sfx, 'Pilar ve en «En curso» la gestión que tiene a cargo, con su tipo y estado', g1.ok && gm.length === 1 && /Cotización · carga manual/.test(gm[0]) && /Cotizar hogar/.test(gm[0]) && /En curso/.test(gm[0]), gm.join(' | '));
    await P.locator('[data-gestion="manual"]').first().click(); await P.waitForTimeout(60);
    ok('V24-2.abre' + sfx, 'La fila abre la pestaña Gestiones de la ficha', await T.hash() === '#/persona/p02/gestiones');
    await T.perfil('vic'); await T.ir('#/inicio'); gm = await textos('[data-gestion="manual"]');
    ok('V24-2.otra' + sfx, 'Victoria ve solo la que le asignaron', g2.ok && gm.length === 1 && /Cotizar vida/.test(gm[0]), gm.join(' | '));
    await T.perfil('man'); await T.ir('#/inicio');
    ok('V24-2.man' + sfx, 'Manuel ve las gestiones manuales de todo el equipo', await sel('[data-gestion="manual"]') === 2);
    d = await T.estado(); const gid = d.gestionesManuales.find(g => g.resp === 'vic').id;
    await T.perfil('vic'); await T.act('cargarAvance', { gestion: gid, texto: 'Pedimos la cotización a la compañía', estado: 'espera' }); await T.ir('#/inicio');
    ok('V24-2.estado' + sfx, 'El estado nuevo se ve en el inicio', /Esperando a terceros/.test((await textos('[data-gestion="manual"]'))[0] || ''));
    await T.act('cargarAvance', { gestion: gid, texto: 'Se emitió la póliza', estado: 'cerrada' }); await T.ir('#/inicio');
    ok('V24-2.cerrada' + sfx, 'Al cerrarse sale de «En curso»', await sel('[data-gestion="manual"]') === 0);

    // 3 · Evaluaciones: quien propone la ve esperando; las demás personas habilitadas la ven para aceptar
    await T.perfil('man');
    const otroP = async id => { const ev = (await T.estado()).riesgos.find(r => r.id === id).evals.filter(x => x.estado === 'aceptada').slice(-1)[0]; return ev && ev.P === 2 ? 3 : 2; };
    const rv = await T.act('escribirReeval', { riesgo: 'RSK-CL-07', P: await otroP('RSK-CL-07'), motivo: 'Se cambió el tablero eléctrico', evidencia: 'Foto (ficticia)' });
    await T.ir('#/inicio');
    ok('V24-3.espera' + sfx, 'Manuel ve su reevaluación en «En curso» como «Espera aceptación» y no la ve para aceptar', rv.ok && /Espera aceptación/.test((await textos('[data-gestion="evaluacion"]')).join(' ')) && await sel('[data-eval-pend]') === 0);
    for (const p of ['eva', 'emi']) {
      await T.perfil(p); await T.ir('#/inicio');
      const t = (await textos('[data-eval-pend]')).join(' ');
      ok(`V24-3.aceptar-${p}` + sfx, `${p} la ve en «Para atender» con quién la propuso`, /Aceptar la reevaluación/.test(t) && /propuesta por Manuel/.test(t), t);
      ok(`V24-3.sin-duplicar-${p}` + sfx, `${p} no ve además el aviso de la misma reevaluación`, (await textos('[data-panel-atender] .a-item')).filter(x => /Reevaluación pendiente de aceptar/.test(x)).length === 0);
    }
    // El punto de no leído sigue al aviso: al abrir el ítem se marca leído pero el pendiente sigue hasta que se acepta
    await T.perfil('eva'); await T.ir('#/inicio');
    ok('V24-3.punto' + sfx, 'El ítem lleva el punto de no leído del aviso', await sel('[data-eval-pend] .punto-nuevo') === 1);
    await P.locator('[data-eval-pend]').first().click(); await P.waitForTimeout(80);
    ok('V24-3.abre' + sfx, 'El ítem abre el riesgo', /riesgos\/matriz\?r=RSK-CL-07/.test(await T.hash()));
    await T.ir('#/inicio');
    ok('V24-3.persiste' + sfx, 'Después de leer el aviso, el pendiente sigue a la vista y sin punto', await sel('[data-eval-pend]') === 1 && await sel('[data-eval-pend] .punto-nuevo') === 0);
    for (const p of ['vic', 'luc', 'mat']) { await T.perfil(p); await T.ir('#/inicio'); ok(`V24-3.sin-${p}` + sfx, `${p} no ve evaluaciones por aceptar`, await sel('[data-eval-pend]') === 0); }
    await T.perfil('eva'); await T.act('aceptarReeval', { riesgo: 'RSK-CL-07' }); await T.ir('#/inicio');
    ok('V24-3.aceptada' + sfx, 'Aceptada, sale de «Para atender»', await sel('[data-eval-pend]') === 0);
    await T.perfil('man'); await T.ir('#/inicio');
    ok('V24-3.fin-autor' + sfx, 'Y sale de «En curso» de quien la propuso', await sel('[data-gestion="evaluacion"]') === 0);

    // 4 · Lote de CSV: una sola fila por lote
    await T.perfil('eva'); await T.ir('#/importacion/lotes?e=e1');
    await P.getByRole('button', { name: 'Cargar ejemplo de Cerro Liso' }).click(); await P.waitForTimeout(60);
    await P.locator('[data-carga-csv] button[type=submit]').click(); await P.waitForTimeout(150);
    d = await T.estado(); let l = d.lotes.slice(-1)[0];
    for (const f of l.filas.filter(x => x.tipo === 'error')) await T.act('loteQuitarFila', { lote: l.id, fila: f.id });
    const imp = await T.act('loteImportar', { lote: l.id }); d = await T.estado(); l = d.lotes.find(x => x.id === l.id);
    const nEv = (l.evalsPendientes || []).length;
    await T.ir('#/inicio');
    ok('V24-4.autor' + sfx, 'Evangelina ve el lote en «En curso» esperando aceptación', imp.ok && nEv >= 1 && (await textos('[data-gestion="evaluacion"]')).some(x => x.includes(l.id) && /Espera aceptación/.test(x)));
    await T.perfil('man'); await T.ir('#/inicio');
    const it = await textos('[data-eval-pend]');
    ok('V24-4.una-fila' + sfx, 'Manuel ve una sola fila para todo el lote, con la cantidad', it.length === 1 && it[0].includes(l.id) && it[0].includes(`Aceptar ${nEv}`) && /importó Evangelina/.test(it[0]), it.join(' | '));
    ok('V24-4.sin-aviso' + sfx, 'Sin el aviso duplicado del lote', (await textos('[data-panel-atender] .a-item')).filter(x => x.includes(l.id)).length === 1);
    await P.locator('[data-eval-pend]').first().click(); await P.waitForTimeout(80);
    ok('V24-4.abre' + sfx, 'Abre el lote', await T.hash() === `#/importacion/lote/${l.id}`);
    await T.act('loteAceptarEvaluaciones', { lote: l.id }); await T.ir('#/inicio');
    ok('V24-4.aceptado' + sfx, 'Aceptado el lote, no queda nada por aceptar', await sel('[data-eval-pend]') === 0);

    // 5 · Accesos rápidos según permisos
    const accesos = async p => { await T.perfil(p); await T.ir('#/inicio'); return P.locator('[data-acceso]').evaluateAll(xs => xs.map(x => x.dataset.acceso)); };
    const esperado = await P.evaluate(() => Object.fromEntries(['man', 'eva', 'vic', 'luc', 'jim', 'pil', 'mat', 'emi'].map(p => [p, [puede(p, 'gestionarProspecto') && 'prospecto', puede(p, 'editarPersona') && 'persona', puede(p, 'editarPersona') && 'empresa', puede(p, 'editarPoliza') && 'poliza', puede(p, 'importar') && 'csv'].filter(Boolean)])));
    for (const p of Object.keys(esperado)) { const a = await accesos(p); ok(`V24-5.${p}` + sfx, `Accesos de ${p} = sus permisos`, JSON.stringify(a) === JSON.stringify(esperado[p]), a.join()); }
    ok('V24-5.emi-csv' + sfx, 'Emiliano tiene «Importar riesgos (CSV)» y «Nuevo prospecto»', esperado.emi.includes('csv') && esperado.emi.includes('prospecto'));
    await T.perfil('emi'); await T.ir('#/inicio'); await P.locator('[data-acceso="prospecto"]').click(); await P.waitForTimeout(60);
    ok('V24-5.ruta' + sfx, 'El acceso lleva a la pantalla de carga', await T.hash() === '#/clientes/nuevo-prospecto' && await sel('form') >= 1);

    // 6 · Configuración manda: sin el permiso de prospectos, Lucía pierde el acceso, K-21 y sus filas
    await T.perfil('emi');
    const c = await T.act('cfgPermiso', { accion: 'gestionarProspecto', miembro: 'luc', valor: false });
    await T.perfil('luc'); await T.ir('#/inicio');
    ok('V24-6.sin-permiso' + sfx, 'Sin «Gestionar prospectos», Lucía no ve el acceso, K-21 ni filas de prospectos', c.ok && await sel('[data-acceso="prospecto"]') === 0 && await sel('[data-kpi="K-21"]') === 0 && await sel('[data-gestion="prospecto"]') === 0, c.error);
    await T.perfil('emi'); await T.act('cfgPermiso', { accion: 'gestionarProspecto', miembro: 'luc', valor: true });
    await T.perfil('luc'); await T.ir('#/inicio');
    ok('V24-6.vuelve' + sfx, 'Con el permiso de vuelta, lo recupera', await sel('[data-acceso="prospecto"]') === 1 && await sel('[data-kpi="K-21"]') === 1);

    // 6b · Correcciones de la auditoría v23
    // B1: los avisos sin detalle (prospectos, gestiones asignadas) no muestran «undefined»
    await T.perfil('man'); await T.act('guardarProspecto', { tipo: 'persona', nombre: 'Prueba Sin Detalle', resp: 'vic', tel: '+54 9 261 555-0300' });
    await T.act('iniciarGestion', { tipo: 'persona', id: 'p03', gtipo: 'cotizacion', titulo: 'Cotizar auto para Rosa', resp: 'mat' });
    await T.act('simularProspecto', { origen: 'redes' });
    for (const p of ['man', 'eva', 'vic', 'luc', 'jim', 'pil', 'mat', 'emi']) {
      await T.perfil(p); await T.ir('#/inicio');
      const t = await P.evaluate(() => { const m = document.querySelector('.inicio-zen'); return m.innerText + ' ' + [...m.querySelectorAll('[title],[aria-label]')].map(e => (e.getAttribute('title') || '') + ' ' + (e.getAttribute('aria-label') || '')).join(' '); });
      ok(`V24-B1.${p}` + sfx, `El inicio de ${p} no muestra undefined, null ni NaN`, !/\bundefined\b|\bnull\b|\bNaN\b/.test(t), (t.match(/.{30}(undefined|null|NaN).{10}/) || [''])[0]);
    }
    // N1 y N3: con muchas evaluaciones por aceptar y muchas gestiones, se pliega
    await T.perfil('man');
    const rs = (await T.estado()).riesgos.filter(r => r.org === 'ORG-01HCL7Q2' && r.tipo !== 'sub' && r.evals.some(e => e.estado === 'aceptada') && !r.evals.some(e => e.estado === 'pendiente')).slice(0, 5).map(r => r.id);
    for (const id of rs) await T.act('escribirReeval', { riesgo: id, P: await otroP(id), motivo: 'Prueba de plegado', evidencia: 'Ficticia' });
    for (let i = 0; i < 8; i++) await T.act('iniciarGestion', { tipo: 'persona', id: 'p01', gtipo: 'cotizacion', titulo: `Cotización de prueba ${i + 1}`, resp: 'man' });
    await T.perfil('eva'); await T.ir('#/inicio');
    const visEv = await P.locator('[data-panel-atender] > ul [data-eval-pend]').count(), plegEv = await P.locator('[data-panel-atender] details [data-eval-pend]').count();
    ok('V24-N1.pliega' + sfx, 'Con 5 evaluaciones por aceptar, 2 quedan a la vista y el resto se pliega', visEv <= 5 && visEv >= 2 && visEv + plegEv === rs.length && plegEv >= 1, `${visEv}+${plegEv}`);
    ok('V24-N1.max' + sfx, '«Para atender» muestra a lo sumo 5 líneas más las decisiones R8 y de actividad', await P.locator('[data-panel-atender] > ul > li').count() <= 7);
    await T.perfil('man'); await T.ir('#/inicio');
    const visG = await P.locator('[data-panel-gestiones] > ul > li').count(), plegG = await P.locator('[data-gestiones-mas] li').count();
    ok('V24-N3.pliega' + sfx, '«En curso» muestra 8 filas y pliega el resto en «N más»', visG === 8 && plegG >= 8 && /\d+ más/.test(await T.texto('[data-gestiones-mas] summary')), `${visG}+${plegG}`);
    // N2 y N6: dos avisos del mismo riesgo se leen con un clic; al aceptarse, se apagan para todos
    const rN = rs[0]; await T.perfil('eva'); await T.act('rechazarReeval', { riesgo: rN, motivo: 'Falta evidencia' });
    await T.perfil('man'); await T.act('escribirReeval', { riesgo: rN, P: await otroP(rN), motivo: 'Segunda vez', evidencia: 'Ficticia' });
    d = await T.estado();
    const unread = (who, id) => d.notificaciones.filter(n => n.para === who && !n.leida && n.obj && n.obj.id === id && /pendiente de aceptar/.test(n.titulo)).length;
    ok('V24-N6.rechazo' + sfx, 'Al rechazarse, el aviso anterior quedó leído para Emiliano; queda solo el de la nueva', unread('emi', rN) === 1, unread('emi', rN));
    await T.perfil('eva'); await T.ir('#/inicio');
    await P.locator(`[data-atender="EVP-${rN}"]`).click(); await P.waitForTimeout(80); d = await T.estado();
    ok('V24-N2.un-clic' + sfx, 'Un clic marca leídos todos los avisos de esa evaluación', unread('eva', rN) === 0);
    await T.act('aceptarReeval', { riesgo: rN }); d = await T.estado();
    ok('V24-N6.acepta' + sfx, 'Al aceptarse, el aviso se apaga también para Emiliano', unread('emi', rN) === 0);
    for (const id of rs.slice(1)) await T.act('aceptarReeval', { riesgo: id });
    // Equipo v23: Manuel y Emiliano ven quién está en pausa; el resto no
    await T.perfil('man');
    let pz, quien_ = null;
    for (const [id, a] of [['vic', 'eva'], ['pil', 'vic'], ['luc', 'man'], ['jim', 'man']]) { pz = await T.act('equipoSalida', { id, tipo: 'pausa', a, motivo: 'Licencia' }); if (pz.ok) { quien_ = id; break; } }
    await T.ir('#/inicio');
    ok('V24-EQ.man' + sfx, 'Manuel ve «1 persona en pausa en el equipo» con enlace a Configuración', pz.ok && /1 persona en pausa/.test(await T.texto('[data-en-pausa]')) && await P.locator('[data-en-pausa] a[href="#/configuracion/equipo"]').count() === 1, pz.error);
    await T.perfil('emi'); await T.ir('#/inicio');
    ok('V24-EQ.emi' + sfx, 'Emiliano también lo ve', await sel('[data-en-pausa]') === 1);
    await T.perfil('eva'); await T.ir('#/inicio');
    ok('V24-EQ.eva' + sfx, 'Evangelina no lo ve', await sel('[data-en-pausa]') === 0);
    await T.perfil('man'); await T.act('equipoReactivar', { id: quien_ }); await T.ir('#/inicio');
    ok('V24-EQ.reactiva' + sfx, 'Reactivada, la línea desaparece', await sel('[data-en-pausa]') === 0);

    // 6c · Auditoría v24 (B1, N1): un miembro nuevo que recibe el siniestro de quien se va lo ve en su inicio, con sus indicadores
    await T.perfil('man');
    const alta = await T.act('equipoAlta', { nombre: 'Omar Prueba', rol: 'Siniestros', copiar: 'pil' });
    const nuevo = (await T.estado()).equipo.find(m => m.nombre === 'Omar Prueba');
    const sinPil = (await T.estado()).siniestros.filter(x => x.resp === 'pil' && x.etapa !== 'cierre').map(x => x.numero);
    for (const g of (await T.estado()).gestionesManuales.filter(g => g.resp === 'pil' && g.estado !== 'cerrada')) await T.act('cargarAvance', { gestion: g.id, texto: 'Cerrada antes de la baja', estado: 'cerrada' });
    const baja = await T.act('equipoSalida', { id: 'pil', tipo: 'baja', a: nuevo && nuevo.id, motivo: 'Dejó la empresa' });
    await T.perfil(nuevo.id); await T.ir('#/inicio');
    const gs = (await P.locator('[data-panel-gestiones]').innerText());
    ok('V24-R2B1.siniestro' + sfx, 'El miembro nuevo ve en «En curso» los siniestros que recibió', alta.ok && baja.ok && sinPil.length >= 1 && sinPil.every(n => gs.includes(n)), `${alta.error || ''} ${baja.error || ''} ${sinPil}`);
    const ks = await P.locator('[data-kpi]').evaluateAll(xs => xs.map(x => x.dataset.kpi));
    ok('V24-R2N1.kpis' + sfx, 'Sus indicadores salen de sus permisos (siniestros y conversaciones)', ks.includes('K-12') && ks.includes('K-04'), ks.join());
    await T.perfil('luc'); await T.ir('#/inicio');
    ok('V24-R2B1.ajeno' + sfx, 'Lucía, que no ve siniestros, sigue sin verlos', await sel('[data-gestion="siniestro"]') === 0);

    // 7 · Inicio sereno: sin rojo ni «alerta» en lo nuevo, sin desborde, R1 y portal sin cambios
    for (const p of ['man', 'mat', 'emi']) {
      await T.perfil(p); await T.ir('#/inicio');
      const rojo = await P.evaluate(() => [...document.querySelectorAll('[data-accesos] *, [data-panel-gestiones] *, [data-panel-atender] *, [data-kpi="K-21"] *')].filter(e => { const c = getComputedStyle(e).color.match(/\d+/g).map(Number); return c[0] > 150 && c[1] < 90 && c[2] < 90; }).length);
      ok(`V24-7.sin-rojo-${p}` + sfx, `Sin rojo en los bloques nuevos (${p})`, rojo === 0, rojo);
      ok(`V24-7.sin-alerta-${p}` + sfx, `Sin la palabra «alerta» (${p})`, !/alerta/i.test(await T.texto('[data-panel-gestiones]')) && !/alerta/i.test(await T.texto('[data-accesos]')));
      const desb = await P.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(`V24-7.sin-desborde-${p}` + sfx, `Sin scroll horizontal (${p})`, desb <= 0, desb);
    }
    await T.perfil('r1'); await T.ir('#/inicio');
    ok('V24-7.r1' + sfx, 'R1 sigue con su inicio de validación, sin accesos ni prospectos', await sel('[data-accesos]') === 0 && /Revisor \(R1\)/.test(await T.texto('main')));
    // axe del inicio en tres perfiles
    await P.addScriptTag({ url: T.url + 'axe.js' });
    for (const p of ['man', 'mat', 'emi']) {
      await T.perfil(p); await T.ir('#/inicio'); await P.waitForTimeout(60);
      const v = await P.evaluate(async () => (await axe.run(document.querySelector('main') || document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map(x => x.id));
      ok(`V24-7.axe-${p}` + sfx, `axe sin violaciones en el inicio de ${p}`, !v.length, v.join());
    }
    if (!movil) await T.foto('inicio-v24-mat');
    ok('V24-JS' + sfx, 'Sin errores de JavaScript', !T.errores.length, T.errores.join(' '));
    await T.cerrar();
  }
  informe('inicio-v24');
})();
