import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('scope', Path(__file__).parents[1] / 'analyze-zoho-migration.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def policy(key, number, company='company-a', previous='', following='', start='2026-01-01'):
    return {m.PK: key, 'Número de póliza': number, 'Compañía.id': company,
            'Renovada de póliza n°': previous, 'Renovada a póliza n°': following,
            'Vigencia Inicio': start}


class ScopeTests(unittest.TestCase):
    def test_renewal_company_disambiguation_and_reciprocal_deduplication(self):
        result = m.renewal_analysis([
            policy('a', '100', following='200'),
            policy('b', '200', previous='100', start='2026-06-01'),
            policy('c', '200', company='company-b'),
        ])
        self.assertEqual(result['unique_directed_edges'], 1)
        self.assertEqual(result['edges_confirmed_in_both_fields'], 1)
        self.assertEqual(result['valid_structural_chains'], 1)
        self.assertEqual(result['references']['Renovada a póliza n°']['raw_exact_candidate_counts_nonblank']['>1'], 1)

    def test_cycles_branches_missing_and_ambiguous_references_remain_visible(self):
        result = m.renewal_analysis([
            policy('a', '100', previous='300', following='200'),
            policy('b', '200', following='300'),
            policy('c', '300', following='100'),
            policy('d', '400', previous='100', following='absent'),
            policy('e', '500', following='duplicate'),
            policy('f', 'duplicate'), policy('g', 'duplicate'),
        ])
        self.assertEqual(result['components_with_cycles'], 1)
        self.assertEqual(result['multiple_successors_nodes'], 1)
        refs = result['references']['Renovada a póliza n°']
        self.assertEqual(refs['missing'], 1)
        self.assertEqual(refs['ambiguous'], 1)
        self.assertEqual(result['valid_structural_chains'], 0)

    def test_fiscal_formats_group_sizes_and_no_values_emitted(self):
        rows = [{'tax': '20-00000002-8'}, {'tax': '20000000028'},
                {'tax': ''}, {'tax': '2e10'}, {'tax': '20000000027'}]
        result = m.fiscal(rows, 'tax')
        self.assertEqual(result['present'], 4)
        self.assertEqual(result['nonblank_not_normalizable'], 1)
        self.assertEqual(result['checksum_valid'], 2)
        self.assertEqual(result['checksum_invalid'], 1)
        self.assertEqual(result['repetitions_normalized']['group_size_histogram'], {'2': 1})
        self.assertNotIn('20000000028', str(result))

    def test_missing_ambiguous_joins_and_holder_partition(self):
        rows = [{'c': '', 'a': ''}, {'c': 'x', 'a': ''}, {'c': '', 'a': 'z'}, {'c': 'y', 'a': 'z'}]
        result = m.join_summary(rows, 'c', {'x': [{}, {}]})
        self.assertEqual([result[x] for x in ['blank', 'orphan', 'ambiguous', 'resolved_unique']], [2, 1, 1, 0])
        self.assertEqual(m.holders(rows, 'c', 'a'), {'total': 4, 'solo_contacto': 1, 'solo_cuenta': 1, 'ambos': 1, 'ninguno': 1})

    def test_dates_and_private_category_labels(self):
        self.assertIsNone(m.parse_date('2026-02-30'))
        self.assertEqual(m.parse_date('2026-12-31 23:59:59').year, 2026)
        self.assertEqual(m.parse_date('2027-01-01 00:00:00').year, 2027)
        result = m.distribution([{'s': 'synthetic private name'}, {'s': 'VIGENTE'}], 's')
        self.assertNotIn('synthetic private name', str(result))
        self.assertEqual(sum(result.values()), 2)


if __name__ == '__main__':
    unittest.main()
