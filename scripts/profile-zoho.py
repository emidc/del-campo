#!/usr/bin/env python3
"""Local-only Zoho discovery. Never prints source names, headers or cell values."""
import argparse
import codecs
import csv
import hashlib
import io
import json
import re
import stat
import subprocess
import sys
import unicodedata
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

MAX_FILE = 256 * 1024 * 1024
MAX_TOTAL = 1024 * 1024 * 1024


def digest(data):
    return hashlib.sha256(data).hexdigest()


def members(archive):
    entries = archive.infolist()
    total = 0
    seen = set()
    for entry in entries:
        name = PurePosixPath(entry.filename)
        mode = entry.external_attr >> 16
        if (name.is_absolute() or '..' in name.parts or '\\' in entry.filename
                or ':' in entry.filename or stat.S_ISLNK(mode)
                or entry.filename.casefold() in seen or entry.flag_bits & 1):
            raise ValueError('unsafe_archive_metadata')
        seen.add(entry.filename.casefold())
        total += entry.file_size
        if entry.file_size > MAX_FILE or total > MAX_TOTAL:
            raise ValueError('archive_size_limit')
        if not entry.is_dir() and name.suffix.lower() != '.csv':
            raise ValueError('non_csv_member')
    return [e for e in entries if not e.is_dir()]


def decode(data, override=None):
    if override:
        return data.decode(override), override, 'explicit_override'
    for bom, encoding in [(codecs.BOM_UTF8, 'utf-8-sig'),
                          (codecs.BOM_UTF32_LE, 'utf-32'),
                          (codecs.BOM_UTF32_BE, 'utf-32'),
                          (codecs.BOM_UTF16_LE, 'utf-16'),
                          (codecs.BOM_UTF16_BE, 'utf-16')]:
        if data.startswith(bom):
            return data.decode(encoding), encoding, 'BOM'
    try:
        text = data.decode('utf-8')
        if '\x00' in text:
            raise ValueError('encoding_ambiguous_use_override')
        return text, 'utf-8', 'strict_decode_ASCII_also_compatible'
    except UnicodeDecodeError:
        raise ValueError('encoding_ambiguous_use_override') from None


def roles(header):
    text = unicodedata.normalize('NFKD', header).encode('ascii', 'ignore').decode().lower()
    patterns = {
        'id': r'(^|[^a-z])(id|identificador)([^a-z]|$)',
        'owner': r'owner|propietario|responsable|asignado',
        'date': r'date|fecha|time|hora|vigencia|vencimiento|created|modified',
        'parent_related': r'parent|related|relacion|padre|cuenta|contacto|account|contact',
    }
    return [key for key, pattern in patterns.items() if re.search(pattern, text)]


def profile(data, encoding=None, delimiter=None):
    text, encoding, basis = decode(data, encoding)
    if not text:
        return {'status': 'empty_file', 'rows': 0, 'columns': []}
    delimiter_basis = 'explicit_override' if delimiter is not None else 'csv.Sniffer_inference'
    if delimiter is None:
        try:
            delimiter = csv.Sniffer().sniff(text[:131072], delimiters=',;\t|').delimiter
        except csv.Error:
            raise ValueError('delimiter_ambiguous_use_override') from None
    csv.field_size_limit(MAX_FILE)
    reader = csv.reader(io.StringIO(text, newline=''), delimiter=delimiter, strict=True)
    headers = next(reader, [])
    nulls = [0] * len(headers)
    rows = blank = malformed = 0
    for row in reader:
        if not row:
            blank += 1
            continue
        rows += 1
        if len(row) != len(headers):
            malformed += 1
            continue
        for i, cell in enumerate(row):
            nulls[i] += int(not cell.strip())
    return {'status': 'parsed', 'encoding': encoding, 'encoding_basis': basis,
            'delimiter': delimiter, 'delimiter_basis': delimiter_basis,
            'rows': rows, 'blank_records': blank, 'malformed_width_records': malformed,
            'duplicate_header_count': len(headers) - len(set(headers)),
            'columns': [{'position': i + 1, 'header': h, 'candidate_roles': roles(h),
                         'blank_in_well_formed_records': nulls[i]} for i, h in enumerate(headers)]}


def ensure_local(base):
    root = Path(subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], text=True).strip())
    if base.is_symlink() or base.resolve().parent != root / 'data' or not base.name.startswith('zoho-export-'):
        raise ValueError('base_must_be_local_export_directory')
    for folder in ('original-zips', 'raw', 'profile'):
        path = base / folder
        if path.is_symlink():
            raise ValueError('symlink_directory')
        if subprocess.run(['git', 'check-ignore', '-q', '--', str(path / 'probe.csv')]).returncode:
            raise ValueError('export_not_ignored')
    if subprocess.check_output(['git', 'ls-files', '-z', '--', str(base)]):
        raise ValueError('tracked_export_files')


def write_new(path, data):
    if path.is_symlink():
        raise ValueError('symlink_output')
    if path.exists():
        if path.read_bytes() != data:
            raise ValueError('existing_output_differs')
        return
    with path.open('xb') as stream:
        stream.write(data)


def run(args):
    base = Path(args.base).absolute()
    ensure_local(base)
    paths = sorted((base / 'original-zips').glob('*.zip'))
    if not paths:
        raise ValueError('no_zip_files')
    report = {'mode': args.mode, 'observed_at': datetime.now(timezone.utc).isoformat(),
              'scope': 'all local ZIP CSV entries; no assertion of source completeness',
              'facts': [], 'inferences': ['Column roles are header heuristics, not validated semantics.'],
              'open_questions': ['Which module represents policies?', 'What do status and term dates mean?',
                                 'Is export complete?', 'How are Drive links and insurers validated?']}
    originals = {}
    for index, path in enumerate(paths, 1):
        if path.is_symlink() or path.stat().st_size > MAX_TOTAL:
            raise ValueError('unsafe_input')
        original = path.read_bytes()
        sha = digest(original)
        originals[path] = sha
        archive_id = f'ZIP-{index:02}'
        with zipfile.ZipFile(io.BytesIO(original)) as archive:
            entries = members(archive)
            record = {'archive_id': archive_id, 'local_archive_name': path.name,
                      'sha256': sha, 'bytes': len(original), 'files': []}
            for number, entry in enumerate(entries, 1):
                file_id = f'{archive_id}-CSV-{number:02}'
                target = base / 'raw' / sha / f'{number:04}.csv'
                item = {'file_id': file_id, 'local_member_name': entry.filename,
                        'bytes': entry.file_size, 'raw_relative_path': str(target.relative_to(base))}
                if args.mode != 'inventory':
                    data = archive.read(entry)  # ZIP CRC verified by zipfile.
                    item['sha256'] = digest(data)
                    if args.mode == 'extract':
                        if target.parent.is_symlink():
                            raise ValueError('symlink_output_directory')
                        target.parent.mkdir(parents=True, exist_ok=True)
                        write_new(target, data)
                    else:
                        if target.is_symlink() or target.parent.is_symlink() or not target.is_file():
                            raise ValueError('missing_or_unsafe_raw_copy')
                        if digest(target.read_bytes()) != item['sha256']:
                            raise ValueError('raw_copy_mismatch')
                        try:
                            item['profile'] = profile(data, args.encoding, args.delimiter)
                        except (ValueError, UnicodeError, csv.Error) as error:
                            # Never serialize parser exceptions: they may contain real cell values.
                            item['profile'] = {'status': 'needs_review', 'error_type': type(error).__name__}
                record['files'].append(item)
            report['facts'].append(record)
    for path, sha in originals.items():
        if digest(path.read_bytes()) != sha:
            raise ValueError('original_changed_during_run')
    report['original_hashes_unchanged'] = True
    output = base / 'profile'
    output.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    destination = output / f'{args.mode}-{stamp}'
    write_new(destination.with_suffix('.json'), (json.dumps(report, ensure_ascii=True, indent=2)+'\n').encode())
    lines = ['# Zoho discovery — '+args.mode, '', '## Hechos', '',
             'Universo: todos los CSV de los ZIP locales; no prueba completitud de Zoho.',
             'Hashes de originales verificados antes/después. Detalle local en JSON compañero.', '',
             '| Referencia | Filas | Columnas | Ancho irregular | Estado |',
             '|---|---:|---:|---:|---|']
    for archive in report['facts']:
        for item in archive['files']:
            p = item.get('profile', {})
            lines.append(f"| {item['file_id']} | {p.get('rows', '—')} | {len(p.get('columns', []))} | {p.get('malformed_width_records', '—')} | {p.get('status', args.mode)} |")
    lines += ['', '## Inferencias', '', *report['inferences'], '', '## Preguntas abiertas', '', *report['open_questions']]
    write_new(destination.with_suffix('.md'), ('\n'.join(lines)+'\n').encode())
    errors = sum(f.get('profile', {}).get('status') == 'needs_review' for a in report['facts'] for f in a['files'])
    print(json.dumps({'mode': args.mode, 'archives': len(paths), 'files_needing_review': errors,
                      'report': str(destination.relative_to(base))+'.json', 'original_hashes_unchanged': True}))
    return 2 if errors else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['inventory', 'extract', 'profile'])
    parser.add_argument('--base', default='data/zoho-export-2026-09-16')
    parser.add_argument('--encoding', help='Explicit human-selected encoding if auto-detection is ambiguous')
    parser.add_argument('--delimiter', choices=[',', ';', '\t', '|'])
    args = parser.parse_args()
    try:
        return run(args)
    except Exception as error:
        print(json.dumps({'status': 'failed', 'error_type': type(error).__name__,
                          'detail': 'No source values emitted. Check inputs, ignore protection and output integrity.'}), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
