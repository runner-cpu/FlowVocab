#!/usr/bin/env python3
"""Regenerate the checked-in vocabulary from the cached ECDICT snapshot."""
import argparse
import csv
import json
from pathlib import Path

EXPECTED_WORDS = 13159
EXPECTED_PHONETICS = 13111
DEFAULT_SOURCE = Path('data-src/ecdict-source/ecdict.csv')
DEFAULT_INPUT = Path('public/data/words.json')


def load_rows(path: Path):
    with path.open(encoding='utf-8', newline='') as handle:
        return {
            row['word'].strip().lower(): row
            for row in csv.DictReader(handle)
            if row.get('word')
        }


def regenerate(source: Path, input_path: Path):
    with input_path.open(encoding='utf-8') as handle:
        existing = json.load(handle)
    if len(existing) != EXPECTED_WORDS:
        raise ValueError(f'expected {EXPECTED_WORDS} words, found {len(existing)}')

    ecdict = load_rows(source)
    output = []
    phonetics = 0
    for old in existing:
        row = ecdict.get(old['word'].strip().lower())
        if row is None:
            raise ValueError(f"ECDICT is missing {old['word']!r}")
        phonetic = (row.get('phonetic') or '').strip()
        phonetics += bool(phonetic)
        meaning = (row.get('translation') or row.get('definition') or '').strip()
        output.append({
            'id': old['id'],
            'word': old['word'],
            'phonetic': phonetic,
            'meaning': meaning,
            'example': '',
            'exampleCn': '',
            'level': old['level'],
            'pos': (row.get('pos') or '').strip(),
            'source': old.get('source'),
        })

    if phonetics != EXPECTED_PHONETICS:
        raise ValueError(f'expected {EXPECTED_PHONETICS} phonetics, found {phonetics}')
    with input_path.open('w', encoding='utf-8', newline='\n') as handle:
        json.dump(output, handle, ensure_ascii=False, separators=(',', ':'))
        handle.write('\n')
    return len(output), phonetics


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--input', type=Path, default=DEFAULT_INPUT)
    args = parser.parse_args()
    total, phonetics = regenerate(args.source, args.input)
    print(f'Generated {args.input}: {total} words, {phonetics} phonetics, {total - phonetics} missing phonetics')


if __name__ == '__main__':
    main()
