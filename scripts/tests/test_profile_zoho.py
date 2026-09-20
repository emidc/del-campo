import importlib.util
import io
import tempfile
import unittest
import zipfile
from pathlib import Path

spec = importlib.util.spec_from_file_location('profile_zoho', Path(__file__).parents[1] / 'profile-zoho.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class DiscoveryTests(unittest.TestCase):
    def test_multiline_and_no_cell_values_in_report(self):
        result = m.profile(b'ID,Owner,Created Time,Related To\r\n123,"synthetic\nname",2020,x\r\n', delimiter=',')
        self.assertEqual(result['rows'], 1)
        self.assertEqual(result['columns'][0]['candidate_roles'], ['id'])
        self.assertNotIn('synthetic', str(result))

    def test_bad_width_and_blank_records(self):
        result = m.profile(b'a;b\n1;2\n\n3\n', delimiter=';')
        self.assertEqual(result['rows'], 2)
        self.assertEqual(result['malformed_width_records'], 1)
        self.assertEqual(result['blank_records'], 1)

    def test_encoding_ambiguity_and_bom(self):
        with self.assertRaises(ValueError):
            m.decode(b'\xff')
        self.assertEqual(m.decode('a,b\n'.encode('utf-16'))[1], 'utf-16')

    def test_zip_traversal_and_collision(self):
        for names in [['../escape.csv'], ['a.csv', 'A.csv'], ['/absolute.csv']]:
            buffer = io.BytesIO()
            with zipfile.ZipFile(buffer, 'w') as archive:
                for name in names:
                    archive.writestr(name, 'a,b\n')
            buffer.seek(0)
            with zipfile.ZipFile(buffer) as archive, self.assertRaises(ValueError):
                m.members(archive)

    def test_no_overwrite_and_repeatable_copy(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'copy.csv'
            m.write_new(path, b'original')
            m.write_new(path, b'original')
            with self.assertRaises(ValueError):
                m.write_new(path, b'changed')
            self.assertEqual(path.read_bytes(), b'original')


if __name__ == '__main__':
    unittest.main()
