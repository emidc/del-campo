from pathlib import Path
import csv,sys,importlib.util,json,itertools,hashlib
ROOT=Path(__file__).resolve().parents[4]
B=ROOT/'v0/fase-12/piloto-emiliano/etapa-b'
OUT=Path(__file__).resolve().parent
assert hashlib.sha256((B/'fichas-emiliano-cerradas.csv').read_bytes()).hexdigest() in (B/'cierre-b.md').read_text(), 'Snapshot B no coincide con cierre'
assert hashlib.sha256((B.parent/'entrega-a-cerrada-2026-10-13.md').read_bytes()).hexdigest() in (B.parent/'cierre-a.md').read_text(), 'Snapshot A no coincide con cierre'
sys.dont_write_bytecode=True;sys.argv=['regresion.py',str(ROOT)]
spec=importlib.util.spec_from_file_location('regf11',ROOT/'v0/fase-11/regresion.py');reg=importlib.util.module_from_spec(spec);spec.loader.exec_module(reg)
def read(p):
 with p.open(newline='') as f:return list(csv.DictReader(f))
def write(name,rows,fields=None):
 with (OUT/name).open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=fields or list(rows[0]));w.writeheader();w.writerows(rows)
def complete(f):
 f=reg.completar(dict(f));rec='' if f['v_rec_valor']=='no_aplica' else ',rec(secuencial)'
 f['v_aspectos_aplicables']=f'econ:cont{rec};pers:cont;cont:cont{rec};legal:cont'
 return f
human=[complete(f) for f in read(B/'fichas-emiliano-cerradas.csv')]
assert len(human)==6 and len({f['risk_id'] for f in human})==6
chain=read(ROOT/'v0/fase-11/reevaluacion/fichas-reevaluadas.csv')+read(ROOT/'v0/fase-11/reevaluacion/fichas-ronda-2.csv')
nexts={(f['evaluacion_anterior_id'],f['risk_id']):f for f in chain}
historical=[]
for f in read(ROOT/'v0/fase-8/agente/agro-y-alimentos/fichas.csv'):
 if f['caso_empresa']!='S06':continue
 seen=set()
 while (f['evaluacion_id'],f['risk_id']) in nexts:
  assert f['evaluacion_id'] not in seen;seen.add(f['evaluacion_id']);f=nexts[(f['evaluacion_id'],f['risk_id'])]
 historical.append(complete(f))
assert len(historical)==6
write('fichas-emiliano-calculadas.csv',human);write('referencia-historica-calculada.csv',historical)
def positions(fs):
 return reg.posiciones([{'id':f['risk_id'],'f':f,'ev':f['evaluable']=='true','c':int(f['c_raw']) if f['c_raw'] else None} for f in fs],True)
hpos=positions(human);apos=positions(historical)
A=['S06-R03','S06-R01','S06-R04','S06-R05','S06-R06','S06-R02'];fre={x:i+1 for i,x in enumerate(A)}
byh={f['risk_id']:f for f in human};bya={f['risk_id']:f for f in historical}
summary=[]
for rid in sorted(byh):
 h,a=byh[rid],bya[rid]
 summary.append({'risk_id':rid,'orden_previo_A':fre[rid],'posicion_humana_B':hpos[rid],'c_raw_humano':h['c_raw'],'banda_humana':h['banda'],'determinante_humana':h['c_dimension_determinante'],'techo_humano':h['techo_plausible'],'extrema_humana':h['consecuencia_extrema'],'safety_humana':h['safety_critical'],'posicion_historica':apos[rid],'c_raw_historico':a['c_raw'],'banda_historica':a['banda'],'evaluable_humano':h['evaluable'],'evaluable_historico':a['evaluable']})
write('resumen-resultados.csv',summary)
discs=[]
def disc(stage,rid,field,ref,humanv,typ,note):
 discs.append({'id':f'DF12-{len(discs)+1:04d}','corrida':'F12-PILOTO-EMILIANO-01','empresa':'S06','risk_id_o_par':rid,'revisor':'emiliano','etapa':stage,'campo':field,'referencia':ref,'juicio_profesional':humanv,'clasificacion':typ,'explicacion_propuesta':note,'estado':'abierta','respuesta_profesional_ref':'pendiente; etapa-b/registro.md','responsable':'emiliano','fuente_ref':'etapa-b/fichas-emiliano-cerradas.csv; referencia-historica-calculada.csv; entrega-a-cerrada-2026-10-13.md'})
factors=['p','i_econ','i_pers','i_cont','i_legal','v_cont','v_rec'];metrics={}
for k in factors:
 n=exact=near=evalagree=0
 for rid in sorted(byh):
  h,a=byh[rid],bya[rid];hv,av=h[k+'_valor'],a[k+'_valor']
  if hv not in ('unknown','no_aplica') and av not in ('unknown','no_aplica'):
   n+=1;exact+=hv==av;near+=abs(int(hv)-int(av))<=1
  evalagree+=(hv=='unknown')==(av=='unknown')
  for suffix in ('valor','min','max','base'):
   field=k+'_'+suffix
   if h[field]!=a[field]:disc('B vs histórica',rid,field,a[field],h[field],'asignación/procedencia',f'Consultar observación humana de {k} y observación histórica; no implica error automático.')
 metrics[k]={'n_numericos':n,'exacto':exact,'dentro_1':near,'evaluabilidad_factor_coincide':evalagree,'n_total':6}
der=['evaluable','c_raw','banda','i_efectivo','c_dimension_determinante','consecuencia_extrema','consecuencia_extrema_dimensiones','safety_critical','techo_plausible']
for rid in sorted(byh):
 for field in der:
  if byh[rid][field]!=bya[rid][field]:disc('B vs histórica',rid,field,bya[rid][field],byh[rid][field],'derivado de factores','Explicación por diferencias de factores/rangos; las dos capas usan la misma v1.')
 if hpos[rid]!=apos[rid]:disc('B vs histórica',rid,'posicion',str(apos[rid]),str(hpos[rid]),'ranking','Orden dentro de S06 con D10, distinto por factores. Sin referencia a otros casos.')
def sign(a,b):return '>' if a<b else '<' if a>b else '='
num_agree_A=num_agree_hist=0;pairs=[]
for x,y in itertools.combinations(sorted(byh),2):
 free=sign(fre[x],fre[y]);hp=sign(hpos[x],hpos[y]);ap=sign(apos[x],apos[y])
 num_agree_A+=free==hp;num_agree_hist+=hp==ap
 pairs.append({'par':x+'/'+y,'orden_previo_A':free,'orden_calculado_B':hp,'orden_historico':ap,'coincide_A_B':str(free==hp).lower(),'coincide_B_historica':str(hp==ap).lower()})
 if free!=hp:disc('A vs B',x+'/'+y,'orden',free,hp,'prioridad profesional','Inversión entre juicio previo y cálculo con factores elegidos; requiere dictamen humano, no corregir fórmula en Fase 12.')
 if hp!=ap:disc('B vs histórica',x+'/'+y,'orden',ap,hp,'ranking','Discrepancia de orden por factores; interpretación profesional pendiente.')
write('pares-ranking.csv',pairs)
dictamen_path=OUT/'dictamen.json'
if dictamen_path.exists():
    dictamen=json.loads(dictamen_path.read_text())
    for d in discs:
        if d['etapa']=='A vs B' and d['campo']=='orden' and d['risk_id_o_par'] in dictamen['pares_rechazados']:
            d['estado']=dictamen['estado']
            d['respuesta_profesional_ref']=dictamen['respuesta_ref']
            d['explicacion_propuesta']+=' Dictamen: mantiene orden previo; no acepta explicación mecánica como resolución.'
write('discrepancias.csv',discs)
# Per-risk logs preserve all factual/methodological discrepancies recorded during collection.
write('observaciones-de-interpretacion.csv',[{'risk_id':f['risk_id'],'factor':k,'observacion':f[k+'_observacion'],'estado':'abierta para revisión profesional','fuente':'etapa-b/registro.md'} for f in human for k in factors])
info={'factores':metrics,'banda':{'exacto':sum(h['banda']==bya[h['risk_id']]['banda'] for h in human if h['evaluable']=='true' and bya[h['risk_id']]['evaluable']=='true'),'n':sum(h['evaluable']=='true' and bya[h['risk_id']]['evaluable']=='true' for h in human)},'evaluable':{'exacto':sum(h['evaluable']==bya[h['risk_id']]['evaluable'] for h in human),'n':6},'ranking_A_B':{'coinciden':num_agree_A,'n':15},'ranking_B_historica':{'coinciden':num_agree_hist,'n':15},'orden_A':A,'orden_B':sorted(byh,key=lambda x:hpos[x]),'orden_historico':sorted(byh,key=lambda x:apos[x]),'discrepancias_registradas':len(discs),'sha_B':hashlib.sha256((B/'fichas-emiliano-cerradas.csv').read_bytes()).hexdigest()}
(OUT/'metricas.json').write_text(json.dumps(info,ensure_ascii=False,indent=2))
print(json.dumps({'resumen':summary,'metricas':info},ensure_ascii=False,indent=2))
