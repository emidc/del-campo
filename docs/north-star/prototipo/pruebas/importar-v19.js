// v19 · Pedido de Emiliano del 31/10: se deben poder importar los CSV de riesgos en Broker OS (Manuel, Emiliano y Evangelina).
const { iniciar, ok, informe } = require('./lib');
const AXE = async P => { await P.addScriptTag({ url: '/axe.js' }); return P.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => v.id + ':' + v.nodes.length)); };
const bandaInd = (P, I, V) => { const c = Math.max(...['eco', 'per', 'con', 'leg'].map(k => P * (typeof I[k] === 'object' ? I[k].min : I[k]) * V[k])); return c >= 75 ? 'critica' : c >= 50 ? 'alta' : c >= 20 ? 'media' : 'baja'; };
const CAB = 'id,riesgo,descripcion,zona,probabilidad,impacto_economico,impacto_personas,impacto_continuidad,impacto_legal,vulnerabilidad_economico,vulnerabilidad_personas,vulnerabilidad_continuidad,vulnerabilidad_legal,que_falta_saber,seguridad_personas,consecuencia_extrema,columna_extra';
// Archivo con coma, BOM, CRLF y campos entre comillas (con coma, punto y coma y comillas dentro).
const ARCHIVO = '﻿' + [CAB,
  ',"Derrame de vino, mosto; y ""borra""","Rotura de manguera en el trasiego, pagado con tarjeta 4111 1111 1111 1111",Elaboración y tanques,3,4,1,3,2,3,1,3,2,Estado de las mangueras,no,no,x',
  ',Golpe de calor en cosecha,Cosecheros al sol en enero,ZON-CL-3,3,1,≥3,1,2,1,4,1,2,Cantidad de cosecheros por cuadrilla,sí,no,',
  'RSK-CL-06,Contaminación de un lote de vino,"Contaminación microbiológica o química que obliga a retirar producto. CBU 0170 0999 2000 0012 3456 78",,,,,,,,,,,,no,no,',
].join('\r\n') + '\r\n';
const ERRORES = ['id;riesgo;zona;probabilidad;impacto_economico;impacto_personas;impacto_continuidad;impacto_legal;vulnerabilidad_economico;vulnerabilidad_personas;vulnerabilidad_continuidad;vulnerabilidad_legal;seguridad_personas',
  'RSK-CL-90;Uno;;;;;;;;;;;no', 'RSK-CL-90;Repetido;;;;;;;;;;;no', 'RSK-QA-01;De otra empresa;;;;;;;;;;;no', 'RSK-QA-99;Prefijo ajeno;;;;;;;;;;;no',
  ';Zona inexistente;Bodega subterránea;;;;;;;;;;no', ';Bandera mal;;;;;;;;;;;quizás', ';Factores a medias;;3;2;;;;;;;;no', ';Probabilidad siete;;7;2;2;2;2;2;2;2;2;no', ';;;;;;;;;;;;no'].join('\n');
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    const sinScroll = () => P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    const toast = () => P.locator('.toast').innerText().catch(() => '');
    const revisar = async () => { await P.locator('[data-carga-csv] button[type=submit]').click(); await P.waitForTimeout(150); };
    const pegar = async txt => { await P.locator('#csv-texto').fill(txt); await P.waitForTimeout(30); };
    let d;

    // 1 · Manuel ve la carga (antes era solo lectura)
    await T.perfil('man'); await T.ir('#/importacion/expedientes');
    ok('V19-1.boton' + sfx, 'En Importación, Manuel tiene «Importar CSV de riesgos»', /Importar CSV de riesgos/.test(await T.texto('main')) && !/Tu perfil ve en lectura/.test(await T.texto('main')));
    await T.ir('#/importacion/lotes');
    ok('V19-1.form' + sfx, 'La pestaña Lotes tiene el formulario, con el rótulo de importación simulada', await P.locator('[data-carga-csv] .cap.sim').count() === 1 && await P.locator('#csv-archivo[type=file]').count() === 1);
    const emps = await P.$$eval('#csv-emp option', os => os.map(o => o.value));
    ok('V19-1.empresas' + sfx, 'Se elige la empresa; la histórica de la validación (Piedemonte) no está', emps.includes('e1') && emps.includes('e3') && !emps.includes('e2'), emps.join());
    const dl = await P.getAttribute('[data-carga-csv] a[download]', 'href');
    ok('V19-1.plantilla' + sfx, 'Se puede descargar la plantilla con el encabezado', /^data:text\/csv/.test(dl) && /impacto_economico/.test(decodeURIComponent(dl)));
    // Dentro del visor de artifacts: la plantilla se baja con la capacidad «downloads»; si no está, el enlace no aparece.
    for (const conCap of [true, false]) {
      const Q = await P.context().newPage();
      await Q.addInitScript(c => { window.__guardado = []; window.claude = { use: async n => (c && n === 'downloads') ? { save: async r => { window.__guardado.push(r); return { status: 'saved' }; } } : null }; }, conCap);
      await Q.goto(P.url()); await Q.waitForTimeout(250);
      const n = await Q.locator('[data-plantilla]').count();
      if (conCap) {
        await Q.locator('[data-plantilla]').click(); await Q.waitForTimeout(100);
        const g = await Q.evaluate(() => window.__guardado.map(r => ({ f: r.filename, d: r.data })));
        ok('V19-1.visor' + sfx, 'En el visor, «Descargar plantilla» pide guardar plantilla-riesgos.csv con el encabezado', n === 1 && g.length === 1 && g[0].f === 'plantilla-riesgos.csv' && /impacto_economico/.test(g[0].d), JSON.stringify(g).slice(0, 120));
      } else ok('V19-1.visorSin' + sfx, 'En el visor sin descargas, el enlace que no funcionaría no se muestra', n === 0 && await Q.locator('[data-carga-csv]').count() === 1);
      await Q.close();
    }
    const v1 = await AXE(P); ok('V19-A11Y.form' + sfx, 'axe WCAG A/AA sin violaciones en la carga', !v1.length, v1.join(' '));
    ok('V19-SCROLL.form' + sfx, 'Sin scroll horizontal en la carga', await sinScroll());

    // 2 · Archivo real: coma, BOM, CRLF y comillas
    await P.locator('#csv-archivo').setInputFiles({ name: 'riesgos-cerro-liso.csv', mimeType: 'text/csv', buffer: Buffer.from(ARCHIVO, 'utf-8') }); await P.waitForTimeout(150);
    ok('V19-2.leido' + sfx, 'Al elegir el archivo, se lee en el navegador y se muestra su nombre y cantidad de filas', /riesgos-cerro-liso\.csv · 3 filas/.test(await T.texto('[data-csv-cargado]').catch(() => '')) && /Derrame de vino/.test(await P.locator('#csv-texto').inputValue()));
    const n0 = (await T.estado()).riesgos.length;
    await revisar();
    d = await T.estado(); let l = d.lotes.slice(-1)[0];
    ok('V19-2.lote' + sfx, 'Se arma el lote LOTE-CL-3 en vista previa y se abre; todavía no se escribió nada', l.id === 'LOTE-CL-3' && l.estado === 'preparado' && l.origen === 'csv' && /lote\/LOTE-CL-3/.test(await T.hash()) && d.riesgos.length === n0, JSON.stringify(l.filas.map(f => f.id + ':' + f.tipo)));
    const nuevo1 = l.filas.find(f => f.tipo === 'nuevo' && /Derrame/.test(f.titulo));
    ok('V19-2.comillas' + sfx, 'Los campos entre comillas conservan coma, punto y coma y comillas', nuevo1 && nuevo1.titulo === 'Derrame de vino, mosto; y "borra"');
    ok('V19-2.ids' + sfx, 'Los riesgos nuevos toman los códigos libres (RSK-CL-15 y 16), sin pisar los del lote 2', l.filas.filter(f => f.tipo === 'nuevo').map(f => f.id).join() === 'RSK-CL-15,RSK-CL-16');
    const calor = l.filas.find(f => f.id === 'RSK-CL-16');
    ok('V19-2.zona-impacto' + sfx, 'Zona por código, impacto «≥3» y «sí» se leen bien', calor.datos.zona === 'ZON-CL-3' && JSON.stringify(calor.datos.ev.I.per) === '{"min":3}' && calor.datos.safety === true && nuevo1.datos.zona === 'ZON-CL-2');
    ok('V19-2.bancarios' + sfx, 'Tarjetas y CBU no quedan en el lote', !/4111|0170 0999/.test(JSON.stringify(l)), '');
    ok('V19-2.cambio' + sfx, 'El 06 aparece como cambio de descripción (sin el CBU)', l.filas.some(f => f.id === 'RSK-CL-06' && f.tipo === 'cambio' && f.campo === 'desc' && !/0170/.test(f.despues)));
    ok('V19-2.ignoradas' + sfx, 'Avisa qué columnas no se usan', /columna_extra/.test(await T.texto('[data-col-ignoradas]').catch(() => '')));
    const v2 = await AXE(P); ok('V19-A11Y.lote' + sfx, 'axe WCAG A/AA sin violaciones en la vista previa', !v2.length, v2.join(' '));
    ok('V19-SCROLL.lote' + sfx, 'Sin scroll horizontal en la vista previa', await sinScroll());

    // 3 · Importar: riesgos nuevos, cambio y evaluaciones pendientes
    await P.getByRole('button', { name: 'Importar el lote' }).click(); await P.waitForTimeout(150);
    d = await T.estado(); l = d.lotes.find(x => x.id === 'LOTE-CL-3');
    const r15 = d.riesgos.find(r => r.id === 'RSK-CL-15'), r16 = d.riesgos.find(r => r.id === 'RSK-CL-16'), r06 = d.riesgos.find(r => r.id === 'RSK-CL-06');
    ok('V19-3.importado' + sfx, 'Se importa: dos riesgos nuevos de Cerro Liso y la descripción del 06 cambia', l.estado === 'importado' && r15 && r16 && r15.org === 'ORG-01HCL7Q2' && r06.desc.startsWith('Contaminación microbiológica o química que obliga a retirar producto.') && r06.ediciones.some(e => /LOTE-CL-3/.test(e.cambios.join())));
    ok('V19-3.pendientes' + sfx, 'Sus evaluaciones quedan pendientes, escritas por Manuel', [r15, r16].every(r => r.evals.length === 1 && r.evals[0].estado === 'pendiente' && r.evals[0].autor === 'man'));
    ok('V19-3.evento' + sfx, 'El registro dice qué se importó', /Importó el lote LOTE-CL-3/.test(d.eventos.slice(-1)[0].accion) && /2 riesgos nuevos y 1 cambios/.test(d.eventos.slice(-1)[0].efecto));
    ok('V19-3.no-acepta' + sfx, 'Manuel, que importó, no puede aceptarlas', await P.locator('[data-evals-pendientes] button').count() === 0 && !(await T.act('loteAceptarEvaluaciones', { lote: 'LOTE-CL-3' })).ok);
    await T.ir('#/empresa/e1/riesgos/matriz');
    ok('V19-3.lista' + sfx, 'En la lista, los nuevos están en «Sin evaluar» con la evaluación pendiente', await P.locator('tr[data-riesgo="RSK-CL-15"][data-sin-evaluar] [data-eval-pendiente]').count() === 1);
    await T.perfil('eva'); await T.ir('#/importacion/lote/LOTE-CL-3');
    const v3 = await AXE(P); ok('V19-A11Y.aceptar' + sfx, 'axe WCAG A/AA sin violaciones con las evaluaciones pendientes', !v3.length, v3.join(' '));
    await P.locator('[data-evals-pendientes] button').click(); await P.waitForTimeout(120);
    d = await T.estado();
    ok('V19-3.aceptadas' + sfx, 'Evangelina acepta las dos de una vez', ['RSK-CL-15', 'RSK-CL-16'].every(id => { const e = d.riesgos.find(r => r.id === id).evals[0]; return e.estado === 'aceptada' && e.revisor === 'eva'; }));
    await T.ir('#/empresa/e1/riesgos/matriz');
    const b15 = bandaInd(3, { eco: 4, per: 1, con: 3, leg: 2 }, { eco: 3, per: 1, con: 3, leg: 2 });
    ok('V19-3.banda' + sfx, `El 15 entra a la lista con la banda recalculada (${b15})`, await P.locator(`tr[data-riesgo="RSK-CL-15"]:not([data-sin-evaluar])`).count() === 1 && await P.locator(`[data-grupo="${b15}"]`).count() === 1 && /Derrame de vino/.test(await T.texto(`tr[data-riesgo="RSK-CL-15"]`)));

    // 4 · Errores: nada se escribe
    await T.perfil('emi'); await T.ir('#/importacion/lotes?e=e1');
    await pegar(ERRORES); await revisar();
    d = await T.estado(); l = d.lotes.slice(-1)[0];
    const reglas = l.filas.filter(f => f.tipo === 'error').map(f => f.regla.split(':')[0]);
    ok('V19-4.reglas' + sfx, 'Cada error tiene su regla: ID repetido, de otra empresa, prefijo, zona, bandera, factores a medias, probabilidad y nombre', ['RV-ID-03', 'RV-ID-01', 'RV-ID-02', 'RV-ZON-01', 'RV-BOO-01', 'RV-FAC-01', 'RV-FAC-03', 'RV-TXT-01'].every(x => reglas.includes(x)), reglas.join());
    ok('V19-4.bloquea' + sfx, 'Con errores el botón de importar queda deshabilitado y la acción se rechaza', await P.locator('button[data-act="loteImportar"][aria-disabled="true"]').count() === 1 && !(await T.act('loteImportar', { lote: l.id })).ok);
    ok('V19-4.nada' + sfx, 'No se escribió ningún riesgo', (await T.estado()).riesgos.length === d.riesgos.length);
    await P.getByRole('button', { name: 'Descartar el lote' }).click(); await P.waitForTimeout(100);
    d = await T.estado();
    ok('V19-4.descartar' + sfx, 'El lote se puede descartar y queda marcado así', d.lotes.find(x => x.id === l.id).estado === 'descartado' && /Descartado por Emiliano/.test(await T.texto('[data-descartado]')) && !(await T.act('loteImportar', { lote: l.id })).ok);

    // 4b · B1 v19: un ID con datos bancarios no se muestra ni se guarda
    await T.ir('#/importacion/lotes?e=e1');
    await pegar('id;riesgo\nRSK-CL-4111 1111 1111 1111;Riesgo con tarjeta\n4111111111111111;Otro\n0170099220000067797370;CBU en el ID');
    await revisar();
    d = await T.estado(); l = d.lotes.slice(-1)[0];
    const almacen = await P.evaluate(() => Object.values(localStorage).join(' '));
    ok('V19-4.idBancario' + sfx, 'Un ID con número de tarjeta o CBU no se ve en la vista previa ni queda guardado', l.filas.length === 3 && l.filas.every(f => /^Fila \d$/.test(f.id) && /^RV-ID-05/.test(f.regla)) && !/4111|0170099220/.test(await T.texto('main')) && !/4111|0170099220/.test(almacen), l.filas.map(f => f.id).join());
    await P.getByRole('button', { name: 'Descartar el lote' }).click(); await P.waitForTimeout(100);

    // 4c · N1 v19: una vista previa vieja no pisa un cambio hecho después
    const csvDesc = txt => 'id;riesgo;descripcion\nRSK-CL-02;;"' + txt + '"';
    await T.ir('#/importacion/lotes?e=e1'); await pegar(csvDesc('Versión A del lote viejo')); await revisar();
    const viejo = (await T.estado()).lotes.slice(-1)[0].id;
    await T.ir('#/importacion/lotes?e=e1'); await pegar(csvDesc('Versión B del lote nuevo')); await revisar();
    const nuevoL = (await T.estado()).lotes.slice(-1)[0].id;
    const rB = await T.act('loteImportar', { lote: nuevoL }), rA = await T.act('loteImportar', { lote: viejo });
    d = await T.estado();
    ok('V19-4.viejo' + sfx, 'Si el riesgo cambió después de la vista previa, el lote viejo se rechaza y no pisa el cambio', rB.ok && !rA.ok && d.riesgos.find(r => r.id === 'RSK-CL-02').desc === 'Versión B del lote nuevo' && d.lotes.find(x => x.id === viejo).estado === 'preparado');
    await T.act('loteDescartar', { lote: viejo });

    // 5 · Rechazos del archivo entero, sin perder lo escrito
    await T.ir('#/importacion/lotes');
    await pegar('nombre_mal;zona\nAlgo;Viñedo'); await revisar();
    ok('V19-5.encabezado' + sfx, 'Sin la columna «riesgo» se rechaza y el texto pegado queda', /Falta la columna «riesgo»/.test(await toast()) && /nombre_mal/.test(await P.locator('#csv-texto').inputValue()));
    await pegar('id;riesgo\nRSK-CL-01;Incendio en sala de barricas');
    await revisar();
    ok('V19-5.igual' + sfx, 'Si todo es igual a lo que hay, avisa que no hay nada para importar', /no hay nada para importar/.test(await toast()));
    await P.locator('#csv-archivo').setInputFiles({ name: 'grande.csv', mimeType: 'text/csv', buffer: Buffer.alloc(210 * 1024, 'a') }); await P.waitForTimeout(120);
    ok('V19-5.peso' + sfx, 'Un archivo de más de 200 KB se rechaza al elegirlo', /pesa más de 200 KB/.test(await T.texto('[data-carga-csv]')));

    // 6 · Ejemplo y reevaluación de un riesgo existente
    await P.getByRole('button', { name: 'Cargar ejemplo de Cerro Liso' }).click(); await P.waitForTimeout(60);
    ok('V19-6.ejemplo' + sfx, 'El ejemplo completa el cuadro y elige Cerro Liso', /RSK-CL-04/.test(await P.locator('#csv-texto').inputValue()) && await P.locator('#csv-emp').inputValue() === 'e1');
    await revisar(); d = await T.estado(); l = d.lotes.slice(-1)[0];
    ok('V19-6.factores' + sfx, 'Cambiar factores del 04 entra como reevaluación', l.filas.some(f => f.id === 'RSK-CL-04' && f.entidad === 'factores'));
    for (const f of l.filas.filter(x => x.tipo === 'error')) await T.act('loteQuitarFila', { lote: l.id, fila: f.id });
    const r = await T.act('loteImportar', { lote: l.id }); d = await T.estado();
    const r04 = d.riesgos.find(x => x.id === 'RSK-CL-04');
    ok('V19-6.reeval' + sfx, 'Al importar, el 04 tiene una reevaluación pendiente y su banda vigente no cambia', r.ok && r04.evals.slice(-1)[0].estado === 'pendiente' && r04.evals.slice(-1)[0].P === 3 && r04.evals.filter(e => e.estado === 'aceptada').slice(-1)[0].P === 4);
    await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-04');
    ok('V19-6.detalle' + sfx, 'El detalle del 04 muestra «Reevaluación pendiente»', /Reevaluación pendiente/.test(await T.texto('[data-detalle-riesgo="RSK-CL-04"]')));

    // 7 · Permisos y aislamiento
    for (const p of ['luc', 'vic', 'pcl', 'pqa', 'r1']) { await T.perfil(p); const x = await T.act('loteDesdeCSV', { empresa: 'e1', texto: 'riesgo\nPrueba de permiso', nombre: 'x.csv' }); ok('V19-7.rechazo-' + p + sfx, `${p} no puede cargar un CSV`, !x.ok); }
    await T.perfil('pcl'); await T.ir('#/importacion/lotes');
    ok('V19-7.portal' + sfx, 'El portal no ve Importación', await P.locator('[data-carga-csv], [data-lotes]').count() === 0);
    await T.perfil('eva');
    ok('V19-7.validacion' + sfx, 'Tampoco se importa en la empresa histórica de la validación', !(await T.act('loteDesdeCSV', { empresa: 'e2', texto: 'riesgo\nPrueba', nombre: 'x.csv' })).ok);
    await T.ir('#/empresa/e1/riesgos/matriz');
    ok('V19-7.link' + sfx, 'La lista de riesgos tiene «Importar CSV», que lleva a Importación con la empresa elegida', await P.getAttribute('[data-importar-csv]', 'href') === '#/importacion/lotes?e=e1');
    await T.ir('#/importacion/lotes?e=e3');
    ok('V19-7.preelige' + sfx, 'Con ?e=e3 queda elegida Quebrada Azul', await P.locator('#csv-emp').inputValue() === 'e3');
    await T.perfil('luc'); await T.ir('#/empresa/e1/riesgos/matriz');
    ok('V19-7.luc' + sfx, 'Lucía (lectura) no ve «Importar CSV»', await P.locator('[data-importar-csv]').count() === 0);
    await T.perfil('emi'); await T.ir('#/empresa/e2/riesgos/matriz');
    ok('V19-7.e2' + sfx, 'En Piedemonte no aparece «Importar CSV»', await P.locator('[data-importar-csv]').count() === 0);

    if (!movil) { await T.perfil('man'); await T.ir('#/importacion/lotes'); await P.getByRole('button', { name: 'Cargar ejemplo de Cerro Liso' }).click(); await revisar(); await T.foto('V19-vista-previa', true); }
    else { await T.perfil('man'); await T.ir('#/importacion/lotes'); await T.foto('V19-carga', true); }
    ok('V19.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('importar-v19');
})();
