#!/usr/bin/env python3
"""T-0004 aggregate-only analysis. No migration, network, or source writes."""
import argparse
import csv
import importlib.util
import io
import json
import re
import sys
from collections import Counter, defaultdict, deque
from datetime import date, datetime, timezone
from pathlib import Path

spec = importlib.util.spec_from_file_location('profiler', Path(__file__).with_name('profile-zoho.py'))
profiler = importlib.util.module_from_spec(spec)
spec.loader.exec_module(profiler)
PK = 'ID de registro'
# Only predeclared business vocabulary may leave local memory as category labels.
# Unknown labels receive local ordinal codes, never a hash of sensitive low-entropy text.
SAFE_LABELS = set('''VIGENTE|Vencida|Anulada|Renovada|Otro|Cancelada|Activa|Inactiva|Baja|Suspendida|
Completado|En curso|No iniciado|Aplazado|Diferido|Esperando entrada|En espera|Pendiente|
Cerrado (ganado)|Cerrado (perdido)|Calificación|Necesita análisis|Propuesta de valor|
Identificar responsables|Análisis de competencia|Propuesta/Cotización|Negociación/Revisión|
Cotización|Cotizar|Emisión|Emitida|Presupuesto|Negociación|
Automotor|Transporte|Flota|Flota automotor|Integral de comercio|Integral de consorcio|
Todo riesgo operativo|Caución|Combinado familiar|Responsabilidad civil|Robo|Seguro técnico|
Accidentes personales|Vida|Vida colectivo|Vida individual|Salud|Hogar|Incendio|ART|
Motovehículos|Motos|Embarcaciones|Aeronavegación|Agro|Granizo|Sepelio|Retiro|
Aseguradora|Aseguradoras|Estudio jurídico|Estudios jurídicos|Liquidador|Liquidadores|
Perito|Peritos|Otros|Servicios|Seguros'''.replace('\n', '').split('|'))


def labels(values):
    return {v: (v if v in SAFE_LABELS else f'CATEGORIA_RESERVADA_{i:02}') if v else 'VACIO'
            for i, v in enumerate(sorted(set(values)), 1)}


def distribution(rows, field):
    counts = Counter(r.get(field, '') for r in rows)
    names = labels(counts)
    return {names[v]: n for v, n in sorted(counts.items())}


def parse_date(value):
    if not value:
        return None
    for fmt in ('%Y-%m-%d', '%Y-%m-%d %H:%M:%S'):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            pass
    return None


def date_summary(rows, field):
    counts = Counter()
    for r in rows:
        v = r.get(field, '')
        d = parse_date(v)
        counts[str(d.year) if d else ('VACIO' if not v else 'INVALIDO')] += 1
    return dict(sorted(counts.items()))


def index(rows, field=PK):
    result = defaultdict(list)
    for r in rows:
        if r.get(field):
            result[r[field]].append(r)
    return result


def duplicate_summary(values):
    c = Counter(v for v in values if v)
    hist = Counter(n for n in c.values() if n > 1)
    return {'distinct_nonblank': len(c), 'repeated_identifiers': sum(hist.values()),
            'rows_with_repeated_identifier': sum(n * count for n, count in hist.items()),
            'excess_rows': sum((n - 1) * count for n, count in hist.items()),
            'group_size_histogram': {str(n): count for n, count in sorted(hist.items())}}


def join_summary(rows, field, target):
    c = Counter({'blank': 0, 'resolved_unique': 0, 'orphan': 0, 'ambiguous': 0})
    used, orphan_ids = set(), set()
    for r in rows:
        v = r.get(field, '')
        n = len(target.get(v, []))
        kind = 'blank' if not v else 'orphan' if not n else 'resolved_unique' if n == 1 else 'ambiguous'
        c[kind] += 1
        if n == 1:
            used.add(v)
        if kind == 'orphan':
            orphan_ids.add(v)
    return {'total': len(rows), **c, 'distinct_targets_resolved': len(used),
            'distinct_orphan_references': len(orphan_ids),
            'coverage_percent_of_nonblank': round(100 * c['resolved_unique'] / (len(rows) - c['blank']), 2) if len(rows) > c['blank'] else None}


def holders(rows, cf='Contacto.id', af='Cuenta.id'):
    c = Counter({'solo_contacto': 0, 'solo_cuenta': 0, 'ambos': 0, 'ninguno': 0})
    for r in rows:
        a, b = bool(r.get(cf)), bool(r.get(af))
        c['ambos' if a and b else 'solo_contacto' if a else 'solo_cuenta' if b else 'ninguno'] += 1
    return {'total': len(rows), **c}


def fiscal_normalize(value):
    # Strict format normalization in memory, never guesses truncated/scientific values.
    if not value or not re.fullmatch(r'[0-9 .\-]+', value):
        return None
    digits = re.sub(r'[ .\-]', '', value)
    return digits if len(digits) == 11 else None


def fiscal_check(value):
    n = 11 - sum(int(x) * w for x, w in zip(value[:10], (5, 4, 3, 2, 7, 6, 5, 4, 3, 2))) % 11
    return int(value[-1]) == (0 if n == 11 else 9 if n == 10 else n)


def fiscal(rows, field):
    values = [r[field] for r in rows]
    normalized = [fiscal_normalize(v) for v in values]
    valid = [v for v in normalized if v and fiscal_check(v)]
    return {'field': field, 'total': len(rows), 'present': sum(bool(v) for v in values),
            'present_percent': round(100 * sum(bool(v) for v in values) / len(rows), 2) if rows else None,
            'blank': values.count(''), 'format_normalizable': sum(v is not None for v in normalized),
            'nonblank_not_normalizable': sum(bool(a) and b is None for a, b in zip(values, normalized)),
            'checksum_valid': len(valid), 'checksum_invalid': sum(v is not None for v in normalized) - len(valid),
            'all_digits_identical_suspected_placeholder': sum(bool(v) and len(set(v)) == 1 for v in normalized),
            'repetitions_normalized': duplicate_summary(normalized),
            'repetitions_checksum_valid': duplicate_summary(valid)}


def load(base, manifest):
    profiler.ensure_local(base)
    p = json.loads(manifest.read_text())
    data, headers, provenance, originals = {}, {}, [], {}
    for a in p['facts']:
        source = base / 'original-zips' / a['local_archive_name']
        if source.is_symlink() or profiler.digest(source.read_bytes()) != a['sha256']:
            raise ValueError('original_integrity')
        originals[source] = a['sha256']
        for f in a['files']:
            raw = base / f['raw_relative_path']
            if raw.is_symlink() or raw.parent.is_symlink() or profiler.digest(raw.read_bytes()) != f['sha256']:
                raise ValueError('raw_integrity')
            module = f['local_member_name'].split('_2026_')[0]
            if not re.fullmatch(r'[A-Za-z_ñáéíóú]+', module) or module in data:
                raise ValueError('module_mapping')
            fp = f['profile']
            if fp['status'] != 'parsed' or fp['malformed_width_records'] or fp['duplicate_header_count']:
                raise ValueError('unusable_csv')
            reader = csv.DictReader(io.StringIO(raw.read_bytes().decode(fp['encoding'])), delimiter=fp['delimiter'])
            data[module] = [{k: v.strip() for k, v in r.items()} for r in reader]
            headers[module] = reader.fieldnames
            if len(data[module]) != fp['rows']:
                raise ValueError('row_count_mismatch')
            provenance.append({'module': module, 'zip_sha256': a['sha256'], 'csv_sha256': f['sha256'],
                               'raw_relative_path': f['raw_relative_path'], 'rows': len(data[module]),
                               'columns': len(reader.fieldnames)})
    return data, headers, provenance, originals


def renewal_analysis(policies):
    ids = index(policies)
    nums = index(policies, 'Número de póliza')
    edges, evidence = set(), defaultdict(set)
    fields = {}
    unresolved_nodes = set()
    for field, previous in [('Renovada de póliza n°', True), ('Renovada a póliza n°', False)]:
        c = Counter({'blank': 0, 'resolved_id': 0, 'resolved_number_same_company': 0,
                     'resolved_number_global_unique': 0, 'missing': 0, 'ambiguous': 0,
                     'company_conflict': 0})
        candidate_counts = Counter({'0': 0, '1': 0, '>1': 0})
        raw_candidate_counts = Counter({'0': 0, '1': 0, '>1': 0})
        for r in policies:
            v = r[field]
            candidates, method = [], None
            if not v:
                c['blank'] += 1
                continue
            raw_n = len(ids.get(v, [])) or len(nums.get(v, []))
            raw_candidate_counts['0' if not raw_n else '1' if raw_n == 1 else '>1'] += 1
            if len(ids.get(v, [])) == 1:
                candidates, method = ids[v], 'resolved_id'
            else:
                all_matches = nums.get(v, [])
                same = [x for x in all_matches if r['Compañía.id'] and x['Compañía.id'] == r['Compañía.id']]
                if same:
                    candidates, method = same, 'resolved_number_same_company'
                elif len(all_matches) == 1 and (not r['Compañía.id'] or not all_matches[0]['Compañía.id']):
                    candidates, method = all_matches, 'resolved_number_global_unique'
                elif all_matches:
                    c['company_conflict' if len(all_matches) == 1 else 'ambiguous'] += 1
                    candidate_counts['0' if len(all_matches) == 1 else '>1'] += 1
                    unresolved_nodes.add(r[PK])
                    continue
            candidate_counts['0' if not candidates else '1' if len(candidates) == 1 else '>1'] += 1
            if len(candidates) != 1:
                c['ambiguous' if candidates else 'missing'] += 1
                unresolved_nodes.add(r[PK])
                continue
            c[method] += 1
            other = candidates[0][PK]
            edge = (other, r[PK]) if previous else (r[PK], other)
            edges.add(edge)
            evidence[edge].add(field)
        fields[field] = {**c, 'raw_exact_candidate_counts_nonblank': dict(raw_candidate_counts),
                         'company_screened_candidate_counts_nonblank': dict(candidate_counts)}
    outgoing, incoming, adjacent = defaultdict(set), defaultdict(set), defaultdict(set)
    for a, b in edges:
        outgoing[a].add(b)
        incoming[b].add(a)
        adjacent[a].add(b)
        adjacent[b].add(a)
    seen, components = set(), []
    for start in adjacent:
        if start in seen:
            continue
        component, pending = set(), [start]
        while pending:
            node = pending.pop()
            if node in component:
                continue
            component.add(node)
            pending.extend(adjacent[node] - component)
        seen |= component
        components.append(component)
    c = Counter({'components': len(components), 'components_with_cycles': 0, 'valid_structural_chains': 0,
                 'valid_chains_without_unresolved_references': 0, 'nodes_in_valid_structural_chains': 0,
                 'edges_term_start_not_increasing': 0, 'edges_term_start_not_comparable': 0,
                 'edges_same_policy_number': 0, 'valid_chains_with_increasing_starts': 0})
    bad_dates = set()
    for a, b in edges:
        x, y = ids[a][0], ids[b][0]
        d1, d2 = parse_date(x['Vigencia Inicio']), parse_date(y['Vigencia Inicio'])
        if not d1 or not d2:
            c['edges_term_start_not_comparable'] += 1
            bad_dates.add((a, b))
        elif d2 <= d1:
            c['edges_term_start_not_increasing'] += 1
            bad_dates.add((a, b))
        c['edges_same_policy_number'] += x['Número de póliza'] == y['Número de póliza']
    lengths = Counter()
    for comp in components:
        indegree = {n: len(incoming[n]) for n in comp}
        queue = deque(n for n in comp if indegree[n] == 0)
        removed = 0
        while queue:
            node = queue.popleft()
            removed += 1
            for child in outgoing[node]:
                indegree[child] -= 1
                if indegree[child] == 0:
                    queue.append(child)
        cyclic = removed != len(comp)
        c['components_with_cycles'] += cyclic
        if not cyclic and all(len(outgoing[n]) <= 1 and len(incoming[n]) <= 1 for n in comp):
            c['valid_structural_chains'] += 1
            c['nodes_in_valid_structural_chains'] += len(comp)
            c['valid_chains_without_unresolved_references'] += not bool(comp & unresolved_nodes)
            c['valid_chains_with_increasing_starts'] += not any(a in comp for a, b in bad_dates)
            lengths[len(comp)] += 1
    return {'references': fields, 'unique_directed_edges': len(edges),
            'edges_confirmed_in_both_fields': sum(len(v) == 2 for v in evidence.values()),
            'edges_one_sided': sum(len(v) == 1 for v in evidence.values()),
            'multiple_successors_nodes': sum(len(v) > 1 for v in outgoing.values()),
            'multiple_predecessors_nodes': sum(len(v) > 1 for v in incoming.values()),
            'self_edges': sum(a == b for a, b in edges), **c,
            'chain_length_histogram': dict(sorted(lengths.items())),
            'isolated_policies': len(policies) - len(seen)}


def analyze(data, headers, cutoff):
    idx = {m: index(rows) for m, rows in data.items()}
    p = data['Polizas']
    if any(len(v) != 1 for m in idx if not m.startswith('Notas_') for v in idx[m].values()):
        raise ValueError('duplicate_source_pk_requires_review')
    pk = {m: {'rows': len(rows), 'blank': sum(not r[PK] for r in rows),
              **duplicate_summary(r[PK] for r in rows)} for m, rows in data.items()}
    if any(v['blank'] for v in pk.values()):
        raise ValueError('blank_source_pk_requires_review')
    end_2026 = {r[PK] for r in p if (d := parse_date(r['Vigencia Fin'])) and d.year == 2026}
    literal_current = {r[PK] for r in p if r['Estado'] == 'VIGENTE'}
    date_current = {r[PK] for r in p if (a := parse_date(r['Vigencia Inicio'])) and
                    (b := parse_date(r['Vigencia Fin'])) and a.date() <= cutoff <= b.date()}
    scenarios = {'fin_2026_confirmado': end_2026,
                 'estado_vigente_o_fin_2026_provisional': end_2026 | literal_current,
                 'vigente_o_fin_2026_antes_corte_alternativa': literal_current | {r[PK] for r in p if (d := parse_date(r['Vigencia Fin'])) and d.year == 2026 and d.date() < cutoff},
                 'intervalo_contiene_corte_o_fin_2026_sensibilidad': end_2026 | date_current}
    state_names = labels(r['Estado'] for r in p)
    cross = defaultdict(Counter)
    temporal = Counter()
    for r in p:
        d = parse_date(r['Vigencia Fin'])
        bucket = 'fin_no_clasificable' if not d else 'anterior_2026' if d.year < 2026 else (
            'fin_2026_antes_corte' if d.date() < cutoff else 'fin_2026_desde_corte') if d.year == 2026 else 'posterior_2026'
        cross[state_names[r['Estado']]][bucket] += 1
        temporal[bucket] += 1
    fiscal_metrics = {m: fiscal(data[m], f) for m, f in [('Contactos', 'CUIL'), ('Cuentas', 'CUIT')]}
    fiscal_sets = {m: {v for r in data[m] if (v := fiscal_normalize(r[f]))}
                   for m, f in [('Contactos', 'CUIL'), ('Cuentas', 'CUIT')]}
    shared = fiscal_sets['Contactos'] & fiscal_sets['Cuentas']
    semantic = {'criteria': 'Señales estructurales; prefijos y checksum no prueban naturaleza jurídica ni autorizan reclasificación.',
                'shared_normalized_fiscal_identifiers_across_modules': len(shared)}
    for m, f, prefixes in [('Contactos', 'CUIL', ('30', '33', '34')), ('Cuentas', 'CUIT', ('20', '23', '24', '27'))]:
        rows = data[m]
        semantic[m] = {'fiscal_prefix_conflict_candidate': sum(bool(v := fiscal_normalize(r[f])) and v.startswith(prefixes) for r in rows),
                       'prefix_conflict_and_checksum_valid': sum(bool(v := fiscal_normalize(r[f])) and v.startswith(prefixes) and fiscal_check(v) for r in rows),
                       'rows_with_fiscal_id_shared_across_modules': sum(fiscal_normalize(r[f]) in shared for r in rows)}
    semantic['Contactos'].update({'missing_first_name': sum(not r['Nombre'] for r in data['Contactos']),
                                  'missing_last_name': sum(not r['Apellidos'] for r in data['Contactos']),
                                  'both_name_fields_missing': sum(not r['Nombre'] and not r['Apellidos'] for r in data['Contactos']),
                                  'birth_date_present': sum(bool(r['Fecha de nacimiento']) for r in data['Contactos'])})
    # Only explicit legal-form tokens, never person-name guessing or fuzzy matching.
    legal = re.compile(r'\b(?:S\.?\s*R\.?\s*L\.?|S\.?\s*A\.?\s*S\.?|S\.?\s*A\.?|SOCIEDAD ANONIMA|SOCIEDAD ANÓNIMA|COOPERATIVA)\b', re.I)
    semantic['Contactos']['legal_form_token_in_name_candidate'] = sum(bool(legal.search(r['Nombre'] + ' ' + r['Apellidos'])) for r in data['Contactos'])
    semantic['Cuentas']['legal_form_token_in_name'] = sum(bool(legal.search(r['Nombre de Cuenta'])) for r in data['Cuentas'])
    tasks = data['Tareas']
    t2026 = [r for r in tasks if (d := parse_date(r['Hora de creación'])) and d.year == 2026]
    task_metrics = {'creation_field': 'Hora de creación', 'creation_years': date_summary(tasks, 'Hora de creación'),
                    'alternative_dates': {f: date_summary(tasks, f) for f in ['Hora de modificación', 'Hora de cierre', 'Fecha de vencimiento', 'Cambiar hora de registro']},
                    'creation_after_modification': sum(parse_date(r['Hora de creación']) > parse_date(r['Hora de modificación']) for r in tasks if parse_date(r['Hora de creación']) and parse_date(r['Hora de modificación'])),
                    'closure_before_creation': sum(parse_date(r['Hora de cierre']) < parse_date(r['Hora de creación']) for r in tasks if parse_date(r['Hora de cierre']) and parse_date(r['Hora de creación'])),
                    'creation_differs_from_change_record_time': sum(r['Hora de creación'] != r['Cambiar hora de registro'] for r in tasks),
                    'total_2026': len(t2026), 'status_2026': distribution(t2026, 'Estado'),
                    'completed_literal_2026': sum(r['Estado'] == 'Completado' for r in t2026),
                    'other_statuses_2026': sum(r['Estado'] != 'Completado' for r in t2026),
                    'open_by_known_status_2026': sum(r['Estado'] in ('No iniciado', 'En curso') for r in t2026),
                    'other_status_pending_open_closed_mapping_2026': sum(r['Estado'] not in ('No iniciado', 'En curso', 'Completado') for r in t2026),
                    'completed_without_close_time_2026': sum(r['Estado'] == 'Completado' and not r['Hora de cierre'] for r in t2026),
                    'other_status_with_close_time_2026': sum(r['Estado'] != 'Completado' and bool(r['Hora de cierre']) for r in t2026),
                    'contact_relation': join_summary(t2026, 'Nombre de contacto.id', idx['Contactos'])}
    global_ids = defaultdict(list)
    for m in idx:
        for key in idx[m]:
            global_ids[key].append(m)
    related = Counter({'VACIO': 0, 'NO_RESUELTO': 0, 'AMBIGUO_ENTRE_MODULOS': 0})
    for r in t2026:
        v = r['Relacionado con.id']
        targets = global_ids.get(v, [])
        related['VACIO' if not v else 'NO_RESUELTO' if not targets else targets[0] if len(targets) == 1 else 'AMBIGUO_ENTRE_MODULOS'] += 1
    task_metrics['related_to_2026'] = dict(related)
    product_refs, supplier_refs = {}, {}
    supplier_used, product_used = set(), set()
    insurer_candidates = set()
    for m, fields in headers.items():
        for field in fields:
            target = None
            if field in ('Riesgo.id', 'Riesgos.id', 'Nombre de Producto.id'):
                target = 'Productos'
            if field in ('Compañía.id', 'Compañías.id', 'Compañias.id', 'Compañia de seguros.id', 'Nombre de Proveedor.id', 'v.id'):
                target = 'Proveedores'
            if target:
                dest = product_refs if target == 'Productos' else supplier_refs
                dest[m + '.' + field] = join_summary(data[m], field, idx[target])
                used = {r[field] for r in data[m] if r[field] in idx[target]}
                (product_used if target == 'Productos' else supplier_used).update(used)
                if target == 'Proveedores' and field != 'Nombre de Proveedor.id':
                    insurer_candidates.update(used)
    product_labels = labels(r['Nombre de Producto'] for r in data['Productos'])
    product_catalog = []
    for name, count in Counter(r['Nombre de Producto'] for r in data['Productos']).items():
        keys = {r[PK] for r in data['Productos'] if r['Nombre de Producto'] == name}
        coverage = {}
        for m, fields in headers.items():
            for f in fields:
                if m + '.' + f in product_refs:
                    coverage[m + '.' + f] = sum(r[f] in keys for r in data[m])
        product_catalog.append({'product_label': product_labels[name], 'source_records': count, 'references': coverage})
    products = {'total': len(data['Productos']), 'pk': pk['Productos'],
                'names_blank': sum(not r['Nombre de Producto'] for r in data['Productos']),
                'duplicate_names_exact': duplicate_summary(r['Nombre de Producto'] for r in data['Productos']),
                'duplicate_names_casefold': duplicate_summary(r['Nombre de Producto'].casefold() for r in data['Productos']),
                'categories': distribution(data['Productos'], 'Categoría de Producto'),
                'catalog': sorted(product_catalog, key=lambda x: x['product_label']),
                'references': product_refs, 'unreferenced_source_records': len(idx['Productos'].keys() - product_used)}
    suppliers = {'total': len(data['Proveedores']), 'pk': pk['Proveedores'],
                 'categories': distribution(data['Proveedores'], 'Categoría'),
                 'insurer_candidates_from_company_fk': len(insurer_candidates),
                 'without_company_fk_evidence': len(idx['Proveedores'].keys() - insurer_candidates),
                 'unreferenced_source_records': len(idx['Proveedores'].keys() - supplier_used),
                 'references': supplier_refs}
    notes, note_sets = {}, {}
    for parent in ['Contactos', 'Cuentas', 'Oportunidades']:
        rows = data['Notas_' + parent]
        notes[parent] = {'parent_join': join_summary(rows, 'ID principal.id', idx[parent]),
                         'note_ids': duplicate_summary(r[PK] for r in rows),
                         'parents_with_notes': len({r['ID principal.id'] for r in rows if r['ID principal.id'] in idx[parent]}),
                         'total_parents': len(data[parent])}
        note_sets[parent] = {r[PK] for r in rows}
    notes['cross_partition_duplicate_ids'] = {a + '/' + b: len(note_sets[a] & note_sets[b])
                                             for a in note_sets for b in note_sets if a < b}
    note_membership = Counter(k for values in note_sets.values() for k in values)
    notes['unique_ids_in_multiple_partitions'] = sum(n > 1 for n in note_membership.values())
    notes['rows_in_cross_partition_duplicates'] = sum(n for n in note_membership.values() if n > 1)
    opp = data['Oportunidades']
    opportunities = {'total': len(opp), 'stages': distribution(opp, 'Fase'),
                     'party_presence': holders(opp, 'Nombre de Contacto.id', 'Nombre de Cuenta.id'),
                     'contact_join': join_summary(opp, 'Nombre de Contacto.id', idx['Contactos']),
                     'account_join': join_summary(opp, 'Nombre de Cuenta.id', idx['Cuentas']),
                     'notes': notes['Oportunidades']}
    nums = index(p, 'Número de póliza')
    claim_resolutions, claim_methods = [], Counter()
    for r in data['Siniestros']:
        v = r['Número de Poliza']
        target, method = None, 'blank'
        if v:
            if v in idx['Polizas']:
                target, method = v, 'exact_id_in_number_field'
            else:
                matches = nums.get(v, [])
                same = [x for x in matches if r['Compañía.id'] and x['Compañía.id'] == r['Compañía.id']]
                if len(same) == 1:
                    target, method = same[0][PK], 'exact_number_same_company'
                elif len(same) > 1:
                    method = 'ambiguous_number_same_company'
                elif len(matches) == 1 and (not r['Compañía.id'] or not matches[0]['Compañía.id']):
                    target, method = matches[0][PK], 'exact_number_global_unique_missing_company'
                else:
                    method = 'company_conflict' if len(matches) == 1 else 'ambiguous_number' if matches else 'unresolved_number'
        claim_resolutions.append(target)
        claim_methods[method] += 1
    claims = {'total': len(data['Siniestros']), 'dedicated_policy_id_field_present': False,
              'resolution_methods': dict(claim_methods),
              'resolvable_by_id': claim_methods['exact_id_in_number_field'],
              'resolvable_only_by_number': sum(claim_methods[k] for k in ['exact_number_same_company', 'exact_number_global_unique_missing_company']),
              'without_resolvable_link': sum(x is None for x in claim_resolutions)}
    endorsements = {'total': len(data['Endosos']), 'policy_join': join_summary(data['Endosos'], 'Pertenece a póliza N°.id', idx['Polizas'])}
    scope_metrics = {}
    for scenario, selected in scenarios.items():
        policies = [r for r in p if r[PK] in selected]
        endos = [r for r in data['Endosos'] if r['Pertenece a póliza N°.id'] in selected]
        date_issues = Counter({'missing_or_invalid_endorsement_dates': 0, 'reversed_endorsement_dates': 0,
                               'missing_invalid_or_reversed_policy_dates': 0, 'comparable_intervals': 0,
                               'outside_policy_interval': 0, 'start_before_policy': 0, 'end_after_policy': 0})
        for r in endos:
            parent = idx['Polizas'][r['Pertenece a póliza N°.id']][0]
            a, b = parse_date(r['Inicio vigencia']), parse_date(r['Fin vigencia'])
            x, y = parse_date(parent['Vigencia Inicio']), parse_date(parent['Vigencia Fin'])
            date_issues['missing_or_invalid_endorsement_dates'] += not (a and b)
            date_issues['reversed_endorsement_dates'] += bool(a and b and a > b)
            date_issues['missing_invalid_or_reversed_policy_dates'] += not (x and y and x <= y)
            if a and b and x and y and a <= b and x <= y:
                date_issues['comparable_intervals'] += 1
                date_issues['outside_policy_interval'] += a < x or b > y
                date_issues['start_before_policy'] += a < x
                date_issues['end_after_policy'] += b > y
        # Proposed dependency closure: direct party references of all selected core records,
        # plus Contact->Account, Account->parent/contact to a fixed point. Not approved business scope.
        selected_parties = {'Contactos': set(), 'Cuentas': set()}
        initial_refs = [('Polizas', policies, ['Contacto.id'], ['Cuenta.id']),
                        ('Oportunidades', opp, ['Nombre de Contacto.id'], ['Nombre de Cuenta.id']),
                        ('Siniestros', data['Siniestros'], ['Contacto.id'], ['Cuenta.id']),
                        ('Endosos', endos, ['Asegurado.id'], []),
                        ('Tareas', t2026, ['Nombre de contacto.id'], [])]
        party_joins = {}
        for m, rows, cfields, afields in initial_refs:
            for target, fields in [('Contactos', cfields), ('Cuentas', afields)]:
                for field in fields:
                    party_joins[m + '.' + field + '->' + target] = join_summary(rows, field, idx[target])
                    selected_parties[target].update(r[field] for r in rows if r.get(field) in idx[target])
        for r in t2026:
            v = r['Relacionado con.id']
            if len(global_ids.get(v, [])) == 1 and global_ids[v][0] in selected_parties:
                selected_parties[global_ids[v][0]].add(v)
        direct_counts = {m: len(keys) for m, keys in selected_parties.items()}
        while True:
            before = sum(map(len, selected_parties.values()))
            for source, field, target in [('Contactos', 'Nombre de Cuenta.id', 'Cuentas'),
                                           ('Cuentas', 'Cuenta principal.id', 'Cuentas'),
                                           ('Cuentas', 'Encargado seguros en empresa.id', 'Contactos')]:
                values = [idx[source][key][0][field] for key in selected_parties[source]]
                selected_parties[target].update(v for v in values if v in idx[target])
            if before == sum(map(len, selected_parties.values())):
                break
        party_metrics = {}
        for m, keys in selected_parties.items():
            rows = [idx[m][key][0] for key in keys]
            drive = holders(rows, 'Drive Folder ID', 'Drive URL')
            party_metrics[m] = {'direct_dependency_count': direct_counts[m], 'closure_count': len(keys),
                                'drive': {'total': len(rows), 'folder_id_present': drive['solo_contacto'] + drive['ambos'],
                                          'url_present': drive['solo_cuenta'] + drive['ambos'],
                                          'only_folder_id': drive['solo_contacto'], 'only_url': drive['solo_cuenta'],
                                          'both': drive['ambos'], 'neither': drive['ninguno']},
                                'notes_selected': sum(r['ID principal.id'] in keys for r in data['Notas_' + m]),
                                'fiscal': fiscal(rows, 'CUIL' if m == 'Contactos' else 'CUIT')}
        closure_joins = {}
        for source, field, target in [('Contactos', 'Nombre de Cuenta.id', 'Cuentas'),
                                       ('Cuentas', 'Cuenta principal.id', 'Cuentas'),
                                       ('Cuentas', 'Encargado seguros en empresa.id', 'Contactos')]:
            closure_joins[source + '.' + field] = join_summary(
                [idx[source][key][0] for key in selected_parties[source]], field, idx[target])
        scope_metrics[scenario] = {'policy_count': len(policies), 'holder_presence': holders(policies),
                                   'holder_contact_join': join_summary(policies, 'Contacto.id', idx['Contactos']),
                                   'holder_account_join': join_summary(policies, 'Cuenta.id', idx['Cuentas']),
                                   'endorsements': {'selected': len(endos), 'resolved_policy_references': len(endos), **date_issues},
                                   'claims': {'linked_to_selected_policy': sum(v in selected for v in claim_resolutions if v),
                                              'linked_to_policy_outside_scope': sum(v not in selected for v in claim_resolutions if v),
                                              'unresolved': sum(v is None for v in claim_resolutions),
                                              'requires_historical_or_unresolved_source_reference': sum(not v or v not in selected for v in claim_resolutions)},
                                   'task_policy_links_outside_scope': sum(r['Relacionado con.id'] in idx['Polizas'] and r['Relacionado con.id'] not in selected for r in t2026),
                                   'party_closure_relation_joins': closure_joins,
                                   'party_dependency_joins': party_joins, 'proposed_party_closure': party_metrics}
    return {'inventory': {m: len(rows) for m, rows in data.items()}, 'source_pk': pk,
            'fiscal_identity': fiscal_metrics, 'party_semantic_signals': semantic,
            'policies': {'total': len(p), 'holder_presence': holders(p),
                         'contact_join': join_summary(p, 'Contacto.id', idx['Contactos']),
                         'account_join': join_summary(p, 'Cuenta.id', idx['Cuentas']),
                         'status_distribution': distribution(p, 'Estado'),
                         'status_by_end_date_range': dict(cross), 'end_date_ranges': dict(temporal),
                         'end_date_years': date_summary(p, 'Vigencia Fin'),
                         'start_date_years': date_summary(p, 'Vigencia Inicio'),
                         'date_quality': {field: {'blank': sum(not r[field] for r in p),
                                                 'nonblank_unparseable': sum(bool(r[field]) and parse_date(r[field]) is None for r in p)}
                                          for field in ('Vigencia Inicio', 'Vigencia Fin')},
                         'literal_vigente': len(literal_current), 'date_interval_contains_cutoff': len(date_current),
                         'vigente_end_before_cutoff': sum(r['Estado'] == 'VIGENTE' and bool(d and d.date() < cutoff) for r in p for d in [parse_date(r['Vigencia Fin'])]),
                         'not_vigente_end_on_or_after_cutoff': sum(r['Estado'] != 'VIGENTE' and bool(d and d.date() >= cutoff) for r in p for d in [parse_date(r['Vigencia Fin'])]),
                         'end_in_2026_by_status': distribution([r for r in p if r[PK] in end_2026], 'Estado'),
                         'literal_vigente_not_in_date_interval': len(literal_current - date_current),
                         'date_interval_not_literal_vigente': len(date_current - literal_current),
                         'reversed_terms': sum(bool(a and b and a > b) for r in p for a, b in [(parse_date(r['Vigencia Inicio']), parse_date(r['Vigencia Fin']))]),
                         'business_current_classification': {'rule': 'Estado exactamente VIGENTE; confirmado provisionalmente por usuario', 'count': len(literal_current)},
                         'renewals': renewal_analysis(p)},
            'endorsements': endorsements, 'claims': claims, 'opportunities': opportunities,
            'tasks': task_metrics, 'products': products, 'suppliers': suppliers,
            'notes': notes, 'scenarios': scope_metrics}


def table(lines, headers, rows):
    lines.extend(['', '| ' + ' | '.join(headers) + ' |', '| ' + ' | '.join(['---'] * len(headers)) + ' |'])
    for row in rows:
        lines.append('| ' + ' | '.join(str(x).replace('|', '/') for x in row) + ' |')
    lines.append('')


def flatten(value, prefix=''):
    if isinstance(value, dict):
        for k, v in value.items():
            yield from flatten(v, prefix + (' / ' if prefix else '') + str(k))
    elif isinstance(value, list):
        for i, v in enumerate(value, 1):
            yield from flatten(v, prefix + f' / {i}')
    else:
        yield [prefix, 'pendiente' if value is None else value]


def markdown(report):
    f = report['facts']
    lines = ['# T-0004 — Migration scope analysis', '', 'Workstream: MIG. Análisis local; no se ejecutó migración.', '',
             '## Hechos medidos', '',
             f"Observación UTC: {report['observed_at']}. Corte de escenario: {report['cutoff_date']} (confirmado provisionalmente por usuario).",
             'Universo: 18 ZIP locales; Productos y Proveedores corresponden al export del 18/09 y los restantes módulos al 16/09. No se acredita snapshot transaccional común ni completitud de Zoho.',
             'Conteos sobre filas de datos; porcentajes, cuando existan, usan el total del grupo. Vacío = texto vacío después de strip; no se reinterpretan placeholders.',
             'Originales y copias raw verificados por SHA-256. Manifiesto, hashes y comandos de reproducción en JSON compañero.',
             'Etiquetas de catálogo fuera del vocabulario permitido se muestran como CATEGORIA_RESERVADA_NN (ordinal por campo, no ID de registro). No se exportan nombres de proveedores, personas, CUIT/CUIL, números de póliza, fechas individuales ni texto libre.',
             'Las tablas de escenarios son resultados condicionales de reglas explícitas; no afirman que el scope esté aprobado.', '',
             '### Inventario y claves fuente']
    table(lines, ['Módulo', 'Registros'], f['inventory'].items())
    lines += ['### Alcance medido de los escenarios']
    table(lines, ['Regla', 'Pólizas', 'Endosos', 'Siniestros con póliza en scope', 'Siniestros con póliza histórica'],
          [[s, v['policy_count'], v['endorsements']['selected'], v['claims']['linked_to_selected_policy'],
            v['claims']['linked_to_policy_outside_scope']] for s, v in f['scenarios'].items()])
    lines += [f"Universos independientes del scope de pólizas: {f['opportunities']['total']} Oportunidades, {f['notes']['Oportunidades']['parent_join']['total']} notas de Oportunidades, {f['tasks']['total_2026']} Tareas creadas en 2026 y {f['claims']['total']} Siniestros.", '']
    lines += ['ID de registro se valida como clave no vacía y única dentro de cada módulo en este lote. Esto no prueba estabilidad futura.', '',
              '### Identidad fiscal', '',
              'Se admiten 11 dígitos con espacios, puntos o guiones como separadores; no se corrigen ceros, notación científica ni dígitos. Checksum módulo 11 con pesos 5,4,3,2,7,6,5,4,3,2; residuo 11→0 y 10→9. Es un control técnico, no validación registral. La repetición incluye por separado todos los normalizables y los que pasan checksum. El histograma expresa tamaño del grupo → cantidad de grupos, sin exponer identificadores.']
    table(lines, ['Métrica', 'Cantidad / detalle'], flatten(f['fiscal_identity']))
    lines += ['### Semántica Contacto/Cuenta: señales observadas', '',
              'Prefijos 30/33/34 en Contactos y 20/23/24/27 en Cuentas son candidatos a revisión, no una determinación de persona jurídica. Se informa también checksum. Tokens explícitos de razón social: SA, SRL, SAS, Sociedad Anónima, Cooperativa. No se infiere persona humana por apariencia del nombre ni empresa por ausencia de fecha de nacimiento. Ausencia de token no prueba clasificación correcta.']
    table(lines, ['Señal', 'Cantidad / detalle'], flatten(f['party_semantic_signals']))
    lines += ['### Pólizas: tomador y scope', '', 'Presencia de Contacto/Cuenta se mide antes del join. Si ambos existen se propone Cuenta como tomador según instrucción confirmada; una Cuenta huérfana requiere revisión, no fallback silencioso a Contacto.']
    table(lines, ['Universo', 'Total', 'Solo Contacto', 'Solo Cuenta', 'Ambos', 'Ninguno'],
          [[name, h['total'], h['solo_contacto'], h['solo_cuenta'], h['ambos'], h['ninguno']]
           for name, h in [('Todas', f['policies']['holder_presence'])] + [(s, v['holder_presence']) for s, v in f['scenarios'].items()]])
    lines += ['Distribución de Estado y cruce con Vigencia Fin: VIGENTE es el indicador operativo confirmado provisionalmente; las contradicciones se conservan. “Fin 2026 antes del corte” no implica estado Vencida; “fin 2026 desde el corte” está incluido por la regla inicial de cualquier fecha de 2026. La alternativa de vencimiento anterior al corte se calcula separada para resolver la diferencia de redacción posterior.']
    table(lines, ['Estado', 'Cantidad'], f['policies']['status_distribution'].items())
    buckets = ['anterior_2026', 'fin_2026_antes_corte', 'fin_2026_desde_corte', 'posterior_2026', 'fin_no_clasificable']
    table(lines, ['Estado', *buckets], [[s, *(c.get(b, 0) for b in buckets)] for s, c in f['policies']['status_by_end_date_range'].items()])
    table(lines, ['Métrica de pólizas', 'Cantidad / detalle'], flatten({k: v for k, v in f['policies'].items() if k not in ['holder_presence', 'status_distribution', 'status_by_end_date_range', 'renewals']}))
    lines += ['### Renovaciones', '',
              'Dirección anterior → siguiente; unión de ambos campos, con aristas deduplicadas. Resolución exacta por ID o número + misma compañía; número global único solo si falta compañía en un extremo. Cambios de compañía quedan pendientes. No se eliminan signos ni se hace fuzzy matching. Cadenas estructuralmente válidas: componentes de ≥2 nodos, sin ciclos ni bifurcaciones. Se separan referencias pendientes y cronología de inicios; no equivalen a cadena contractual confirmada.']
    table(lines, ['Métrica', 'Cantidad'], flatten(f['policies']['renewals']))
    for title, key in [('Endosos', 'endorsements'), ('Siniestros', 'claims'), ('Oportunidades', 'opportunities'), ('Tareas 2026', 'tasks')]:
        lines += ['### ' + title]
        if key == 'claims':
            lines += ['No existe campo dedicado de FK a póliza. Se prueba igualdad contra ID y luego contra número exacto, priorizando compañía igual. Número global único con compañía ausente es candidato; compañía contradictoria o número ambiguo no se resuelve. Todos los siniestros se conservan en scope, incluido vínculo histórico pendiente.']
        if key == 'tasks':
            lines += ['Campo elegido: Hora de creación, por encabezado explícito, formato y contraste con modificación/cierre. El filtro es [2026-01-01, 2027-01-01) sobre la fecha local exportada; no se sustituye por vencimiento, cierre ni Cambiar hora de registro. No hay timezone en el CSV ni metadata API para certificar Created_Time. Completado se separa literalmente; demás estados se conservan y requieren validación para llamarlos abiertos. Relacionado con.id se busca en todos los módulos exportados: solo coincidencia única permite asignar módulo candidato.']
        table(lines, ['Métrica', 'Cantidad / detalle'], flatten(f[key]))
    for title, key in [('Productos: catálogo agregado y relaciones', 'products'), ('Proveedores: categorías y relaciones', 'suppliers'), ('Notas: padres y duplicados', 'notes')]:
        lines += ['### ' + title]
        if key == 'suppliers':
            lines += ['Candidato a aseguradora = proveedor referenciado por un campo de compañía. No se clasifica por nombre, descripción ni fuzzy matching. Categoría vacía impide distinguir estudios jurídicos, liquidadores, peritos y otros con evidencia estructurada. No se curan aliases.']
        if key == 'notes':
            lines += ['Join exacto Notas_<partición>.ID principal.id → <partición>.ID de registro. IDs duplicados entre particiones se cuentan sin fusionar notas. Todas las notas de Oportunidades están en scope; huérfanas se preservan como excepciones.']
        table(lines, ['Métrica', 'Cantidad / detalle'], flatten({k: v for k, v in f[key].items() if k not in ('catalog', 'references')}))
        if key == 'products':
            reference_names = list(f[key]['references'])
            table(lines, ['Producto / categoría reservada', 'Registros', *reference_names],
                  [[r['product_label'], r['source_records'], *(r['references'].get(n, 0) for n in reference_names)] for r in f[key]['catalog']])
        if key in ('products', 'suppliers'):
            table(lines, ['Referencia', 'Total filas', 'Vacías', 'Resueltas', 'Huérfanas', 'Ambiguas', 'Destinos únicos', 'Cobertura no vacías %'],
                  [[name, v['total'], v['blank'], v['resolved_unique'], v['orphan'], v['ambiguous'], v['distinct_targets_resolved'], v['coverage_percent_of_nonblank']]
                   for name, v in f[key]['references'].items()])
    lines += ['### Dependencias, endosos, siniestros, notas y Drive por escenario', '',
              'Los huérfanos de Endosos se miden globalmente porque no puede saberse a qué scope pertenecen. Para endosos con padre en scope, fuera de vigencia = inicio anterior al de póliza o fin posterior, solo si ambos intervalos son parseables y no invertidos. Las excepciones de fechas pueden solaparse.',
              'Contactos/Cuentas: conjunto propuesto de dependencias directas de pólizas seleccionadas, todas las oportunidades, todos los siniestros, endosos seleccionados y tareas 2026. Se conservan ambas referencias. Se amplía hasta punto fijo por Contacto→Cuenta, Cuenta→Cuenta principal y Cuenta→Encargado; Asegurado.id→Contacto es candidato medido. No se incluyen automáticamente tomadores de pólizas históricas fuera de scope ni entidades solo referenciadas por una nota. Esta regla requiere confirmación; por eso Drive se informa sobre conjuntos propuestos, no como migración efectiva.',
              'Drive mide únicamente presencia de Folder ID/URL, sin consultar Google Drive ni validar formato, existencia o permisos. Los conjuntos de dependencias no se filtran por calidad fiscal: las excepciones permanecen visibles.']
    for scenario, metrics in f['scenarios'].items():
        lines += ['#### ' + scenario]
        table(lines, ['Métrica', 'Cantidad / detalle'], flatten({k: v for k, v in metrics.items() if k != 'holder_presence'}))
    for heading, key in [('Inferencias', 'inferences'), ('Excepciones', 'exceptions'),
                         ('Decisiones de negocio ya confirmadas', 'confirmed_business_decisions'),
                         ('Preguntas todavía abiertas', 'open_questions'),
                         ('Recomendaciones para cerrar T-0004', 'recommendations')]:
        lines += ['## ' + heading, '']
        lines += ['- ' + x for x in report[key]]
        lines.append('')
    lines += ['### Reproducción', '', '```bash', *report['reproduction'], '```', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', default='data/zoho-export-2026-09-16')
    parser.add_argument('--profile', required=True, help='Existing profile JSON basename')
    parser.add_argument('--cutoff', default='2026-09-16')
    args = parser.parse_args()
    base = Path(args.base).absolute()
    if Path(args.profile).name != args.profile:
        raise ValueError('profile_basename_required')
    cutoff = date.fromisoformat(args.cutoff)
    data, headers, provenance, originals = load(base, base / 'profile' / args.profile)
    facts = analyze(data, headers, cutoff)
    for path, sha in originals.items():
        if profiler.digest(path.read_bytes()) != sha:
            raise ValueError('original_changed')
    main_scope = facts['scenarios']['estado_vigente_o_fin_2026_provisional']
    report = {'task': 'T-0004', 'workstream': 'MIG', 'observed_at': datetime.now(timezone.utc).isoformat(),
              'cutoff_date': args.cutoff, 'cutoff_confirmed_provisionally': True, 'profile_manifest': args.profile,
              'script_sha256': profiler.digest(Path(__file__).read_bytes()),
              'original_hashes_unchanged': True, 'sources': provenance, 'facts': facts,
              'verification': {'synthetic_test_command': "PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/tests -p 'test_*zoho*.py'",
                               'reconciliation': 'Module totals, holder partitions, joins, date buckets, renewal candidate distributions, scenarios and claim partitions must reconcile; independently checked on delivered report.'},
              'inferences': [
                  'VIGENTE es el indicador operativo confirmado provisionalmente por el usuario; fechas contradictorias no se corrigen ni excluyen.',
                  'Regla inicial: Vigencia Fin parseable en cualquier fecha de 2026, sin excluir estados anulados/renovados. Escenario principal: ese conjunto UNION Estado exactamente VIGENTE. Se mide también la interpretación posterior de vencidas antes del corte, sin sustituir silenciosamente la regla anual.',
                  'Sensibilidad temporal: intervalo [Vigencia Inicio, Vigencia Fin] contiene el corte UNION fin en 2026. Inclusión del día final es una convención analítica provisional.',
                  'Hora de creación es la evidencia local más directa de alta de Tareas; confirmar correspondencia API y zona horaria antes de implementar el importador.',
                  'Prefijos fiscales, tokens de razón social y coincidencias exactas son señales de revisión humana; no prueban identidad, tipo jurídico ni autorizan merges.',
                  'Los joins empíricos validan cobertura del lote. No prueban el tipo de lookup configurado en Zoho ni la completitud del export.'],
              'exceptions': [
                  f"Identidad fiscal: Contactos sin CUIL {facts['fiscal_identity']['Contactos']['blank']}; Cuentas sin CUIT {facts['fiscal_identity']['Cuentas']['blank']}. Formatos, checksum y grupos repetidos se detallan arriba.",
                  f"Pólizas sin tomador en ambos campos: {facts['policies']['holder_presence']['ninguno']}; intervalos invertidos: {facts['policies']['reversed_terms']}.",
                  f"VIGENTE literal fuera de intervalo al corte: {facts['policies']['literal_vigente_not_in_date_interval']}; intervalo vigente con otro Estado: {facts['policies']['date_interval_not_literal_vigente']}.",
                  f"Endosos sin FK: {facts['endorsements']['policy_join']['blank']}; FK huérfana: {facts['endorsements']['policy_join']['orphan']}. No se descartan ni se asignan artificialmente a un scope.",
                  f"Siniestros sin vínculo resoluble: {facts['claims']['without_resolvable_link']}; en escenario principal, vinculados a póliza fuera de scope: {main_scope['claims']['linked_to_policy_outside_scope']}.",
                  f"Proveedores con Categoría vacía: {facts['suppliers']['categories'].get('VACIO', 0)}; clasificación de tipos no disponible.",
                  'Las tablas cuantifican además FK huérfanas/ambiguas, fechas no comparables, ramas/ciclos de renovación, duplicados de notas y tareas con relaciones no resueltas; las métricas pueden solaparse y no se suman como personas únicas.',
                  'Desalineación documental: DOMAIN.md §10–11 presenta CUIT/CUIL opcional y §27 permite renovación con mismo número; la instrucción de negocio de esta sesión exige identificador fiscal y describe nuevos números. Se aplica esa instrucción al análisis; la discrepancia queda pendiente de actualización autorizada, sin editar el dominio.',
                  'El scope amplio solicitado para migración no redefine silenciosamente VS01 (D-0019). D-0021 mantiene catálogo curado; D-0026 y D-0029 continúan OPEN.'],
              'confirmed_business_decisions': [
                  'Fuente: instrucciones explícitas del usuario en esta sesión (18/09/2026), no decisiones incorporadas a decisions.yaml.',
                  'Contactos: exclusivamente personas humanas, CUIT/CUIL obligatorio en Broker OS; igualdad fiscal genera candidatos y todo merge exige revisión humana.',
                  'Cuentas: exclusivamente empresas/personas jurídicas, CUIT obligatorio; registros incompatibles son excepciones visibles.',
                  'Cada renovación crea nueva póliza/fila, número y vigencia; la anterior permanece histórica. Un tomador principal; Cuenta prevalece sobre Contacto si están ambos, conservando Contacto relacionado.',
                  'Pólizas a migrar: vigentes o con Vigencia Fin en cualquier fecha de 2026. Endosos: los relacionados con esas pólizas; modifican la póliza, no crean otra.',
                  'Confirmación posterior provisional: Estado exactamente VIGENTE es indicador operativo; corte 2026-09-16; medir contradicciones con fechas sin corregir ni excluir. Se solicita conservar las vencidas durante 2026, cuya diferencia respecto de cualquier fecha anual se presenta como sensibilidad.',
                  'Emision es workflow intermedio utilizable para reconciliación, no entidad core actualmente a migrar.',
                  'Todas las Oportunidades y todas sus notas; notas de Contactos/Cuentas solo para entidades migradas.',
                  'Todas las Tareas creadas en 2026, abiertas y completadas; filtro sobre fecha real de creación.',
                  'Todos los Siniestros; conservar referencia histórica cuando su póliza no migre.',
                  'Productos representa tipo/ramo. Proveedores mezcla aseguradoras, estudios jurídicos, liquidadores, peritos y otros. No resolver aliases por fuzzy matching.',
                  'Solo análisis local agregado: sin migración, sin modificaciones de ZIP, T-0004 o dominio; sin T-0015 ni validación externa de Drive.'],
              'open_questions': [
                  'Con VIGENTE y corte 16/09/2026 confirmados provisionalmente, ¿qué tratamiento dar a contradicciones y al día final? ¿Se mantiene cualquier fin en 2026 o vencidas significa únicamente fin anterior al corte? Los dos universos están cuantificados.',
                  '¿Se confirma la regla de cierre de dependencias de Contactos/Cuentas? Hasta entonces no hay universo definitivo para Drive y notas de esas entidades.',
                  '¿Hora de creación corresponde a Created_Time y a qué zona horaria? ¿Hubo importaciones previas que cambiaran esa semántica?',
                  '¿Se confirma como abierta cada etiqueta de Tareas distinta de Completado? Las categorías reservadas requieren lectura local autorizada.',
                  '¿Los exports incluyen archivados, borrados y todos los filtros? Productos/Proveedores son dos días posteriores: ¿explican relaciones huérfanas?',
                  '¿Cuál es el tipo de lookup de Asegurado.id y de Relacionado con.id? ¿Cómo retener relaciones de tareas hacia módulos fuera del scope?',
                  '¿Cómo resolver renovaciones ambiguas, cambios de compañía y discrepancias de número/fecha sin unir períodos distintos?',
                  '¿Cómo completar categorías de Proveedores y curar catálogo de aseguradoras/aliases con responsable humano? ¿Cómo revisar las etiquetas reservadas sin exportar PII?',
                  '¿Qué muestra y convención de Drive deben validarse en una fase posterior autorizada? La presencia local no acredita acceso ni conformidad.'],
              'recommendations': [
                  'Revisar excepciones Estado/fechas y confirmar alcance de fin 2026 posterior al corte usando los escenarios; desbloquea un scope definitivo sobre la regla operativa ya confirmada provisionalmente.',
                  'Revisar agregados de excepciones fiscales, semánticas y referenciales; definir tratamiento explícito sin descartes ni merge automático. Desbloquea preparación de insumos de migración.',
                  'Confirmar campos de lookup/creación con metadata de Zoho y reglas de cierre de dependencias. Desbloquea conteo definitivo de notas, tareas y entidades relacionadas.',
                  'Curar aseguradoras y aliases conforme D-0021, además de tipos de Proveedores. La ausencia de huérfanos no sustituye esa curación.',
                  'En una fase posterior autorizada, medir muestra estratificada de Drive y umbrales de vinculación automática/asistida; este reporte no permite cerrar ese criterio de T-0004.',
                  'Con las preguntas resueltas, consolidar REVIEWS/T-0004-insumos-vs01.md y recién evaluar cierre humano. No crear T-0015 ni cambiar dominio o tarea en esta fase.'],
              'reproduction': ['python3 scripts/profile-zoho.py inventory', 'python3 scripts/profile-zoho.py extract',
                               'python3 scripts/profile-zoho.py profile',
                               f'python3 scripts/analyze-zoho-migration.py --profile {args.profile} --cutoff {args.cutoff}',
                               "PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/tests -p 'test_*zoho*.py'",
                               'pnpm check', 'git check-ignore data/zoho-export-2026-09-16/original-zips/',
                               'test -z "$(git ls-files -- data/)"']}
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    dest = base / 'profile' / ('migration-scope-analysis-' + stamp)
    profiler.write_new(dest.with_suffix('.json'), (json.dumps(report, ensure_ascii=False, indent=2) + '\n').encode())
    profiler.write_new(dest.with_suffix('.md'), markdown(report).encode())
    print(json.dumps({'report': str(dest.relative_to(base)), 'original_hashes_unchanged': True,
                      'modules': len(data), 'rows': sum(map(len, data.values()))}))


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(json.dumps({'status': 'failed', 'error_type': type(exc).__name__,
                          'detail': 'No source values emitted.'}), file=sys.stderr)
        sys.exit(1)
