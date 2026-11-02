// v5 · Pedido de Emiliano del 28/10 sobre el inicio: sin panel «Hoy», tareas al frente, gestiones en curso, gráficos
// históricos de salud del negocio, indicadores de riesgos v4 y pestaña «Notas» en personas y empresas (con aislamiento).
// v6 · Inicio sereno: sin rojo ni rótulos de «alerta», una línea de contexto por ítem (V6-*).
const { iniciar, ok, informe } = require('./lib');
const AXE = async P => { await P.addScriptTag({ url: '/axe.js' }); return P.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map(v => v.id + ':' + v.nodes.length)); };
const EQUIPO = ['man', 'eva', 'vic', 'luc', 'jim', 'pil', 'mat', 'emi'];
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    const sinScroll = () => P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    const h2s = () => P.$$eval('.contenido h2', xs => xs.map(x => x.textContent.trim()));

    // 1 · Sin «Hoy», con tareas primero, en todos los perfiles del equipo
    for (const p of EQUIPO) {
      await T.perfil(p); await T.ir('#/inicio');
      const hs = await h2s(), pest = await P.$$eval('.pestanas a', xs => xs.map(x => x.textContent.trim()));
      ok(`V5-1.sin-hoy.${p}${sfx}`, `${p}: el inicio no tiene el panel ni la pestaña «Hoy»`, !hs.some(x => /^Hoy\b/.test(x)) && !pest.includes('Hoy') && pest[0] === 'Resumen', hs.join('|'));
      ok(`V5-1.tareas-primero.${p}${sfx}`, `${p}: «Mis tareas» es el primer bloque`, /^Mis tareas/.test(hs[0]), hs[0]);
      const d = await T.estado(), hoy = '2026-11-02';
      const mias = d.tareas.filter(t => t.resp === p && t.estado !== 'hecha');
      const filas = await P.locator('[data-panel-tareas] [data-tarea]').count();
      ok(`V5-1.lista.${p}${sfx}`, `${p}: muestra sus tareas abiertas (hasta 6)`, filas === Math.min(6, mias.length), `${filas} de ${mias.length}`);
      const cont = await P.$$eval('[data-tcont]', xs => Object.fromEntries(xs.map(x => [x.dataset.tcont, +x.querySelector('.v').textContent])));
      const esp = { trabada: mias.filter(t => t.estado === 'trabada').length, vencida: mias.filter(t => t.vence < hoy).length, hoy: mias.filter(t => t.vence === hoy).length };
      ok(`V5-1.contadores.${p}${sfx}`, `${p}: contadores de trabadas, vencidas y que vencen hoy = recuento`, cont.trabada === esp.trabada && cont.vencida === esp.vencida && cont.hoy === esp.hoy, JSON.stringify([cont, esp]));
      ok(`V5-1.scroll.${p}${sfx}`, `${p}: sin desplazamiento horizontal`, await sinScroll());
    }
    // La primera tarea es la más urgente (trabada o vencida antes que el resto).
    await T.perfil('luc'); await T.ir('#/inicio');
    { const d = await T.estado(); const ts = d.tareas.filter(t => t.resp === 'luc' && t.estado !== 'hecha'); const urg = ts.find(t => t.estado === 'trabada') || ts.filter(t => t.vence < '2026-11-02').sort((a, b) => a.vence.localeCompare(b.vence))[0];
      const prim = await P.locator('[data-panel-tareas] [data-tarea]').first().getAttribute('data-tarea');
      ok('V5-1.orden' + sfx, 'La tarea más urgente va primero', !urg || prim === urg.id, `${prim} vs ${urg && urg.id}`); }
    // Los contadores filtran la lista de tareas.
    await T.perfil('man'); await T.ir('#/inicio'); await P.locator('[data-tcont="semana"]').click(); await P.waitForTimeout(50);
    { const d = await T.estado(); const n = d.tareas.filter(t => t.resp === 'man' && t.estado !== 'hecha' && t.vence > '2026-11-02' && t.vence <= '2026-11-09').length;
      ok('V5-1.filtro-semana' + sfx, '«Esta semana» abre la lista filtrada', (await T.hash()).includes('f=semana') && (await T.texto('.contenido')).includes(`Mis tareas (${n})`)); }
    // Lo urgente y los mensajes siguen a mano, en «Para atender» (v6: sin rótulo de alerta, primero lo urgente).
    await T.ir('#/inicio');
    { const al = await P.evaluate(() => alertas(S.d).filter(a => a.para.includes('man')).map(a => a.id));
      const ids = await P.$$eval('[data-panel-atender] [data-atender]', xs => xs.map(x => x.dataset.atender));
      ok('V5-1.alertas' + sfx, 'Todo lo urgente de Manuel está en «Para atender», primero', al.length > 0 && al.every((id, i) => ids[i] === id), `${al.join()} | ${ids.join()}`);
      const esp = await P.evaluate(() => itemsAtender(S.d, 'man').length);
      ok('V5-1.mensajes' + sfx, '«Para atender» incluye alertas y mensajes, sin perder ninguno', ids.length === esp && ids.length > al.length, `${ids.length} vs ${esp}`); }

    // 2 · Gestiones en curso
    await T.perfil('man'); await T.ir('#/inicio');
    { const d = await T.estado(); const tipos = await P.$$eval('[data-gestion]', xs => xs.map(x => x.dataset.gestion));
      const ren = d.polizas.filter(p => p.fin.slice(0, 7) === '2026-11').length;
      ok('V5-2.man' + sfx, 'Manuel ve siniestros, renovaciones, facturación, solicitudes, plan y transferencias', ['siniestro', 'renovacion', 'facturacion', 'solicitud', 'plan', 'transferencia'].every(t => tipos.includes(t)), tipos.join(','));
      ok('V5-2.sol' + sfx, 'Una gestión por solicitud abierta', tipos.filter(t => t === 'solicitud').length === d.solicitudes.filter(s => s.estado !== 'cerrada').length);
      ok('V5-2.ren' + sfx, 'Renovaciones del mes que no están completas', tipos.filter(t => t === 'renovacion').length <= ren);
      const txt = await T.texto('[data-panel-gestiones]');
      ok('V5-2.sin-ids' + sfx, 'Los títulos no muestran identificadores internos', !/RSK-|REV-|SOL-|informacion_nueva/.test(txt), txt.match(/RSK-\S+|REV-\S+|informacion_nueva/));
      await P.locator('[data-gestion="siniestro"]').first().click(); await P.waitForTimeout(50);
      ok('V5-2.abre' + sfx, 'Pulsar una gestión abre su objeto', (await T.hash()) === '#/siniestro/sin1'); }
    await T.perfil('pil'); await T.ir('#/inicio');
    { const tipos = await P.$$eval('[data-gestion]', xs => [...new Set(xs.map(x => x.dataset.gestion))]); ok('V5-2.pil' + sfx, 'Pilar ve solo siniestros', tipos.join() === 'siniestro', tipos.join()); }
    await T.perfil('jim'); await T.ir('#/inicio');
    { const tipos = await P.$$eval('[data-gestion]', xs => [...new Set(xs.map(x => x.dataset.gestion))]); ok('V5-2.jim' + sfx, 'Jimena ve facturación (y no riesgos)', tipos.includes('facturacion') && !tipos.includes('plan') && !tipos.includes('transferencia'), tipos.join()); }
    await T.perfil('luc'); await T.ir('#/inicio');
    ok('V5-2.luc-vacio' + sfx, 'Lucía sin cotizaciones: el panel explica cómo iniciarla', /Iniciar una cotización/.test(await T.texto('[data-panel-gestiones]')) && (await P.locator('[data-gestion="cotizacion"]').count()) === 0);
    await T.act('r4Ejecutar'); await T.ir('#/inicio');
    ok('V5-2.luc-cot' + sfx, 'Al iniciar la caución aparece en sus gestiones', (await P.locator('[data-gestion="cotizacion"]').count()) === 1);
    await P.evaluate(() => window.__brokeros.reiniciar());

    // V6 · Sereno: sin rojo, sin la palabra «alerta», una línea de contexto por ítem, en los 8 perfiles.
    for (const p of EQUIPO) {
      await T.perfil(p); await T.ir('#/inicio');
      const rojos = await P.evaluate(() => {
        const roj = c => { const m = String(c).match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?/); if (!m || (m[4] !== undefined && +m[4] === 0)) return false; const [r, g, b] = [+m[1], +m[2], +m[3]]; return r >= 150 && r - g >= 60 && r - b >= 60; };
        const els = [...document.querySelectorAll('.inicio-zen, .inicio-zen *'), ...document.querySelectorAll('.topbar .badge-n')];
        return els.filter(e => { if (!e.getClientRects().length) return false; const cs = getComputedStyle(e); return ['color', 'backgroundColor', 'borderTopColor', 'borderLeftColor', 'fill', 'stroke'].some(k => (k.startsWith('border') ? parseFloat(cs[k.replace('Color', 'Width')]) > 0 : true) && roj(cs[k])); }).map(e => e.tagName + '.' + e.className).slice(0, 5);
      });
      ok(`V6.sin-rojo.${p}${sfx}`, `${p}: nada rojo en el inicio (ni en el contador de notificaciones)`, !rojos.length, rojos.join(' '));
      // Texto visible y también lo que aparece al pasar el mouse o lee un lector de pantalla (title y aria-label).
      const txt = (await P.locator('.inicio-zen').innerText()) + '\n' + (await P.$$eval('.inicio-zen [title], .inicio-zen [aria-label]', xs => xs.map(x => (x.getAttribute('title') || '') + ' ' + (x.getAttribute('aria-label') || '')).join('\n')));
      ok(`V6.sin-alerta.${p}${sfx}`, `${p}: el inicio no muestra rótulos de «alerta» (ni en title ni en aria-label)`, !/alerta/i.test(txt), (txt.match(/.{0,30}alerta.{0,30}/i) || [''])[0]);
      const largos = await P.$$eval('[data-atender] .t2', xs => xs.map(x => x.textContent.length).filter(n => n > 65));
      ok(`V6.corto.${p}${sfx}`, `${p}: cada ítem de «Para atender» tiene una sola línea corta de contexto`, !largos.length, largos.join());
    }

    // 3 · Salud del negocio: gráficos con tabla accesible, rotulados como simulados
    const SER = { man: 4, eva: 4, vic: 2, luc: 2, jim: 2, pil: 2, mat: 2, emi: 2 };
    for (const [p, n] of Object.entries(SER)) { await T.perfil(p); await T.ir('#/inicio'); ok(`V5-3.n.${p}${sfx}`, `${p}: ${n} gráficos de salud del negocio`, (await P.locator('[data-salud] figure').count()) === n); }
    await T.perfil('man'); await T.ir('#/inicio');
    { const t = await T.texto('[data-salud]'); ok('V5-3.rotulo' + sfx, 'Rotulado Simulado y aclara que las series son ficticias', /Series ficticias/.test(t) && /Futuro/.test(t));
      const filas = await P.$$eval('[data-salud] figure', fs => fs.map(f => f.querySelectorAll('tbody tr').length));
      ok('V5-3.tabla' + sfx, 'Cada gráfico tiene su tabla de 12 meses', filas.every(n => n === 12), filas.join());
      const lab = await P.$$eval('[data-salud] svg[role=img]', ss => ss.every(s => /de .+ en noviembre 2025 a .+ (en octubre 2026|hoy)/.test(s.getAttribute('aria-label'))));
      ok('V5-3.aria' + sfx, 'Cada gráfico tiene una descripción textual', lab);
      ok('V5-3.comisiones-jim-man' + sfx, 'Comisiones solo para quien ve facturación', (await P.locator('[data-serie="comisiones"]').count()) === 1);
      await T.perfil('mat'); await T.ir('#/inicio'); ok('V5-3.comisiones-mat' + sfx, 'Matías no ve comisiones', (await P.locator('[data-serie="comisiones"]').count()) === 0);
      await T.perfil('man'); await T.ir('#/inicio');
      // La serie de vulnerabilidad alta termina en el valor del indicador K-20 de la semilla.
      const k20 = +(await P.locator('[data-kpi="K-20"] .v').innerText()), v = +(await P.locator('[data-serie="vulnerabilidad"] .g-val').innerText()).split(' ')[0];
      ok('V5-3.coherente' + sfx, 'El último mes de «Riesgos con vulnerabilidad alta» coincide con K-20', k20 === v, `${v} vs ${k20}`);
      if (!movil) { const hit = P.locator('[data-serie="cartera"] .g-hit').nth(11); await hit.hover(); await P.waitForTimeout(40);
        ok('V5-3.tooltip' + sfx, 'Pasar el puntero muestra mes y valor', /oct 26 · 1\.274 pólizas/.test(await P.locator('[data-serie="cartera"] .g-tip').innerText()) && await P.locator('[data-serie="cartera"] .g-tip').isVisible()); }
      await P.locator('[data-serie="cartera"] summary').click(); ok('V5-3.ver-datos' + sfx, '«Datos» abre la tabla y la definición', await P.locator('[data-serie="cartera"] table').isVisible());
      // B1 de la auditoría: después de aceptar una reevaluación que baja la vulnerabilidad, el gráfico sigue a K-20.
      const r0 = await P.evaluate(() => { const d = window.__brokeros.estado(), x = k20Lista(d, 'eva')[0], e = evalVigente(x); return { id: x.id, P: e.P, I: e.I, V: Object.fromEntries(Object.keys(e.V).map(k => [k, 1])) }; });
      await T.perfil('eva'); const re = await T.act('escribirReeval', { riesgo: r0.id, P: r0.P, I: r0.I, V: r0.V, motivo: 'Se instaló protección', evidencia: 'foto' });
      await T.perfil('man'); const ac = await T.act('aceptarReeval', { riesgo: r0.id }); await T.ir('#/inicio');
      const k20b = +(await P.locator('[data-kpi="K-20"] .v').innerText()), vb = +(await P.locator('[data-serie="vulnerabilidad"] .g-val').innerText()).split(' ')[0];
      ok('V5-3.sigue-k20' + sfx, 'Tras aceptar una reevaluación, K-20 baja y el gráfico de vulnerabilidad baja con él', re.ok && ac.ok && k20b === k20 - 1 && vb === k20b, `${re.error || ''} ${ac.error || ''} K-20 ${k20} → ${k20b}, gráfico ${vb}`);
      ok('V5-3.hoy' + sfx, 'El último punto de vulnerabilidad se rotula «hoy»', /· hoy/.test(await P.locator('[data-serie="vulnerabilidad"] .g-lec').innerText()));
      ok('V5-3.lectura' + sfx, 'Retención se lee en puntos y los conteos chicos de cuánto a cuánto', /\+5 pts/.test(await P.locator('[data-serie="retencion"] .g-lec').innerText()) && /subió 5 puntos/.test(await P.locator('[data-serie="retencion"] svg').getAttribute('aria-label')) && /15 → 1?\d\b/.test(await P.locator('[data-serie="vulnerabilidad"] .g-lec').innerText()) && /bajó de 15 a 1?\d\b/.test(await P.locator('[data-serie="vulnerabilidad"] svg').getAttribute('aria-label')));
      ok('V5-3.sin-enlace-anidado' + sfx, 'Las filas de tareas no tienen enlaces dentro de la fila enlace (B2)', (await P.locator('[data-tarea] a').count()) === 0);
      await P.evaluate(() => window.__brokeros.reiniciar()); await T.perfil('man'); await T.ir('#/inicio'); }

    // 4 · Indicadores de riesgos v4
    await T.perfil('man'); await T.ir('#/inicio');
    { const ks = await P.$$eval('[data-kpi]', xs => xs.map(x => x.dataset.kpi));
      ok('V5-4.nuevos' + sfx, 'Manuel ve K-17 a K-20', ['K-17', 'K-18', 'K-19', 'K-20'].every(k => ks.includes(k)), ks.join());
      const t = await T.texto('.contenido'); ok('V5-4.vulnerabilidad' + sfx, 'El inicio habla de vulnerabilidad, no de preparación', /vulnerabilidad/i.test(t) && !/preparaci/i.test(t)); }
    for (const [k, f, sel] of [['K-17', 'comentarios', 'K-17'], ['K-18', 'plan', 'K-18'], ['K-19', 'transferencias', 'K-19'], ['K-20', 'vulnerabilidad', 'K-20']]) {
      await T.ir('#/inicio'); await P.locator(`[data-kpi="${k}"]`).click(); await P.locator('[data-modal="kpi"] a.btn').click(); await P.waitForTimeout(60);
      const n = await P.locator(`[data-lista-k="${sel}"] .item`).count(), v = await T.kpi(k, 'man'), tot = typeof v === 'object' ? Object.values(v).reduce((a, b) => a + b, 0) : v;
      ok(`V5-4.lista.${k}${sfx}`, `${k} lleva a una lista coherente con el número`, (await T.hash()) === `#/riesgos?f=${f}` && (k === 'K-17' ? n >= 1 : n === tot), `${n} vs ${tot}`);
    }
    // K-17 baja al abrir el hilo.
    { const antes = await T.kpi('K-17', 'man'); await T.ir('#/riesgos?f=comentarios'); await P.locator('[data-lista-k="K-17"] .item').first().click(); await P.waitForTimeout(80);
      const desp = await T.kpi('K-17', 'man'); ok('V5-4.k17-leer' + sfx, 'Abrir un hilo con novedades baja K-17', desp < antes, `${antes} → ${desp}`); }
    await T.perfil('pcl'); await T.ir('#/riesgos?f=comentarios'); ok('V5-4.portal' + sfx, 'El portal no accede a las listas de riesgos del equipo', !/Comentarios nuevos de empresas/.test(await T.texto('#root')));
    await T.perfil('jim'); await T.ir('#/riesgos?f=plan'); ok('V5-4.sin-permiso' + sfx, 'Jimena (sin riesgos) no ve la lista del plan', !(await P.locator('[data-lista-k]').count()));
    await P.evaluate(() => window.__brokeros.reiniciar());

    // 5 · Notas en personas y empresas
    await T.perfil('man');
    for (const r of ['#/persona/p01/notas', '#/empresa/e1/notas']) {
      await T.ir(r); const pest = await P.$$eval('.pestanas a', xs => xs.map(x => x.textContent.trim()));
      ok(`V5-5.tab${r.replace(/\W+/g, '_')}${sfx}`, `Pestaña «Notas» en ${r}`, pest.some(x => /^Notas\b/.test(x)) && (await P.locator('[data-notas]').count()) === 1);
      ok(`V5-5.sin-caja${r.replace(/\W+/g, '_')}${sfx}`, 'La caja aparece recién al pulsar «Nueva nota»', (await P.locator('[data-notas] textarea').count()) === 0);
    }
    await T.ir('#/empresa/e1/notas');
    ok('V5-5.fijada-arriba' + sfx, 'La nota fijada va primero', (await P.locator('.nota-i').first().getAttribute('class')).includes('fijada'));
    await T.boton('Nueva nota'); ok('V5-5.foco' + sfx, 'Al abrir, el foco va a la caja', await P.evaluate(() => document.activeElement.tagName === 'TEXTAREA'));
    await P.keyboard.press('Escape'); await P.waitForTimeout(40); ok('V5-5.escape' + sfx, 'Escape cierra la caja', (await P.locator('[data-notas] textarea').count()) === 0);
    await T.boton('Nueva nota'); await T.llenar('[data-notas] textarea', 'Pagan con la tarjeta 4539 1488 0343 6467, avisar a Jimena.'); await P.selectOption('[data-notas] select', 'cobranza'); await P.locator('[data-notas] button[type=submit]').click(); await P.waitForTimeout(60);
    { const d = await T.estado(); const n = d.notas[d.notas.length - 1]; const txt = await T.texto('[data-notas]');
      ok('V5-5.guarda' + sfx, 'La nota se guarda con autor, fecha y tema', n.autor === 'man' && n.tag === 'cobranza' && n.obj.id === 'e1' && /Cobranza/.test(txt));
      ok('V5-5.redacta' + sfx, 'La tarjeta no se guarda ni se muestra', !/4539/.test(JSON.stringify(d.notas)) && !/4539/.test(txt) && /dato bancario omitido/.test(txt));
      const ev = d.eventos[d.eventos.length - 1]; ok('V5-5.evento' + sfx, 'El registro no copia el texto ni la vincula a la organización', !ev.org && !/tarjeta|Jimena/.test(JSON.stringify(ev)), JSON.stringify(ev));
      ok('V5-5.caja-cerrada' + sfx, 'Al guardar se cierra la caja', (await P.locator('[data-notas] textarea').count()) === 0); }
    await P.locator('.nota-i').nth(1).getByRole('button', { name: 'Fijar arriba' }).click(); await P.waitForTimeout(40);
    ok('V5-5.fijar' + sfx, '«Fijar arriba» la sube', (await P.locator('.nota-i.fijada').count()) === 2);
    await P.reload(); await P.waitForSelector('#root > *'); await T.ir('#/empresa/e1/notas');
    ok('V5-5.persiste' + sfx, 'Las notas persisten tras recargar', /Pagan con la/.test(await T.texto('[data-notas]')));
    // Aislamiento: el portal, R1 y los rechazos.
    await T.perfil('pcl'); const rutasPortal = ['#/portal/e1/resumen', '#/portal/e1/riesgos', '#/portal/e1/solicitudes', '#/empresa/e1/notas', '#/persona/p05/notas'];
    let fuga = []; for (const r of rutasPortal) { await T.ir(r); const t = await T.texto('#root'); if (/Pagan con la|Renuevan contrato|Notas internas/.test(t)) fuga.push(r); }
    ok('V5-5.portal' + sfx, 'Laura (portal) no ve notas en ninguna ruta ni en el registro', !fuga.length, fuga.join());
    ok('V5-5.portal-act' + sfx, 'El portal no puede agregar notas', !(await T.act('agregarNota', { tipo: 'empresa', id: 'e1', texto: 'x' })).ok);
    await T.perfil('r1'); await T.ir('#/empresa/e2/resumen');
    ok('V5-5.r1-tab' + sfx, 'El revisor (R1) no tiene la pestaña Notas', !(await P.$$eval('.pestanas a', xs => xs.map(x => x.textContent.trim()))).some(x => /^Notas\b/.test(x)));
    await T.ir('#/empresa/e2/notas'); ok('V5-5.r1-ruta' + sfx, 'R1 por URL no ve notas', !/Licitación del acueducto|licitación/.test(await T.texto('#root')));
    await T.perfil('vic'); await T.ir('#/persona/p01/notas'); ok('V5-5.vic' + sfx, 'Cualquier integrante del equipo lee las notas', /Prefiere WhatsApp/.test(await T.texto('[data-notas]')));

    // 6 · Accesibilidad de los estados nuevos
    for (const [p, r, pre] of [['man', '#/inicio', null], ['eva', '#/inicio', null], ['pil', '#/inicio', null], ['man', '#/inicio', 'd'], ['man', '#/empresa/e1/notas', 'n'], ['man', '#/persona/p01/notas', null], ['man', '#/riesgos?f=comentarios', null], ['man', '#/riesgos?f=vulnerabilidad', null]]) {
      await T.perfil(p); await T.ir(r);
      if (pre === 'd') await P.locator('[data-serie="cartera"] summary').click();
      if (pre === 'n') await T.boton('Nueva nota');
      const v = await AXE(P); ok(`V5-A11Y.${p}${r.replace(/\W+/g, '_')}${pre || ''}${sfx}`, `axe WCAG 2.2 A/AA sin violaciones en ${r}${pre ? ' (abierto)' : ''}`, !v.length, v.join(' '));
      ok(`V5-SCROLL.${p}${r.replace(/\W+/g, '_')}${pre || ''}${sfx}`, `Sin desplazamiento horizontal en ${r}`, await sinScroll());
    }
    await T.perfil('man'); await T.ir('#/inicio'); await T.foto('V5-inicio-man'); await T.perfil('eva'); await T.ir('#/inicio'); await T.foto('V5-inicio-eva'); await T.perfil('man'); await T.ir('#/empresa/e1/notas'); await T.foto('V5-notas-empresa');
    ok('V5.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('inicio-v5');
})();
