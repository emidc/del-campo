// v22 · Respuesta de Emiliano del 31/10: «si manual puede proponer y autorizar evaluaciones y revisiones de riesgos».
// Manuel escribe reevaluaciones y evaluaciones iniciales, abre revisiones y acepta; nadie acepta lo que propuso.
const { iniciar, ok, informe } = require('./lib');
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil }); const P = T.page;
    let d;
    // 1 · Proponer una reevaluación desde la ficha
    await T.perfil('man'); await T.ir('#/empresa/e1/riesgos/matriz?r=RSK-CL-07');
    ok('V22-1.boton' + sfx, 'Manuel ve «Escribir reevaluación» en la ficha del riesgo', await P.getByRole('button', { name: 'Escribir reevaluación' }).count() >= 1);
    const otroP = async id => { const ev = (await T.estado()).riesgos.find(r => r.id === id).evals.filter(x => x.estado === 'aceptada').slice(-1)[0]; return ev && ev.P === 2 ? 3 : 2; };
    const r1 = await T.act('escribirReeval', { riesgo: 'RSK-CL-07', P: await otroP('RSK-CL-07'), motivo: 'Se cambió el tablero eléctrico', evidencia: 'Foto del tablero (ficticia)' });
    d = await T.estado(); let e = d.riesgos.find(r => r.id === 'RSK-CL-07').evals.find(x => x.estado === 'pendiente');
    ok('V22-1.propone' + sfx, 'Manuel propone la reevaluación y queda pendiente a su nombre', r1.ok && e && e.autor === 'man');
    // 2 · No acepta lo propio; Evangelina sí
    const r2 = await T.act('aceptarReeval', { riesgo: 'RSK-CL-07' });
    ok('V22-2.noPropia' + sfx, 'Manuel no puede aceptar su propia reevaluación', !r2.ok && /no la acepta/.test(r2.error || r2.msg || JSON.stringify(r2)));
    await T.perfil('eva'); const r3 = await T.act('aceptarReeval', { riesgo: 'RSK-CL-07' });
    d = await T.estado(); e = d.riesgos.find(r => r.id === 'RSK-CL-07').evals.find(x => x.id === e.id);
    ok('V22-2.otra' + sfx, 'Evangelina la acepta', r3.ok && e.estado === 'aceptada' && e.revisor === 'eva');
    // 3 · Autoriza lo que propone otra persona
    await T.act('escribirReeval', { riesgo: 'RSK-CL-03', P: await otroP('RSK-CL-03'), motivo: 'Baranda nueva', evidencia: 'Foto (ficticia)' });
    await T.perfil('man'); const r4 = await T.act('aceptarReeval', { riesgo: 'RSK-CL-03' });
    d = await T.estado();
    ok('V22-3.autoriza' + sfx, 'Manuel acepta la reevaluación que escribió Evangelina', r4.ok && d.riesgos.find(r => r.id === 'RSK-CL-03').evals.some(x => x.autor === 'eva' && x.estado === 'aceptada' && x.revisor === 'man'));
    // 4 · Evaluación inicial de un riesgo nuevo
    await T.ir('#/empresa/e1/riesgos/lista'); await T.boton('Agregar riesgo'); await P.waitForTimeout(60);
    ok('V22-4.inicial' + sfx, 'Al agregar un riesgo, Manuel puede cargar la evaluación inicial', await P.locator('#rf-p').count() === 1);
    await P.keyboard.press('Escape');
    // 5 · Los demás siguen sin poder
    for (const p of ['vic', 'luc', 'r1']) { await T.perfil(p); const r = await T.act('escribirReeval', { riesgo: 'RSK-CL-07', P: 3, motivo: 'm', evidencia: 'e' }); ok(`V22-5.${p}` + sfx, `${p} no escribe reevaluaciones`, !r.ok && /Escriben una reevaluación/.test(r.error), r.error); }
    ok('V22-JS' + sfx, 'Sin errores de JavaScript', !T.errores.length, T.errores.join(' '));
    await T.cerrar();
  }
  informe('manuel-v22');
})();
