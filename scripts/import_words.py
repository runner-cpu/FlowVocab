#!/usr/bin/env python3
"""Build the licensed, sharded ECDICT CET vocabulary."""
import argparse, csv, hashlib, json
from pathlib import Path

DEFAULT_SOURCE = Path('data-src/ecdict-source/ecdict.csv')
DEFAULT_LEGACY = Path('public/data/words/legacy-ids.json')
DEFAULT_OUTPUT = Path('public/data/words')
LEVELS = 5
def normalized(value): return ' '.join((value or '').strip().lower().split())
def inferred_pos(value):
    prefix = normalized(value).split('.', 1)[0]
    if prefix == 'n': return 'noun'
    if prefix in ('v', 'vt', 'vi'): return 'verb'
    if prefix in ('a', 'adj'): return 'adj'
    if prefix in ('ad', 'adv'): return 'adv'
    return 'other'
def tags(row): return sorted(set((row.get('tag') or '').lower().split()))
def rank(row):
    try: frequency = -int(float(row.get('frq') or 0))
    except ValueError: frequency = 0
    return (0 if 'cet4' in tags(row) else 1, frequency, normalized(row.get('word')))
def legacy_ids(path):
    if not path.exists(): return {}
    result = {}
    payload = json.loads(path.read_text(encoding='utf-8'))
    if isinstance(payload, dict):
        for value, ids in payload.items():
            word = normalized(value)
            if isinstance(ids, str): ids = [ids]
            if word and isinstance(ids, list): result[word] = [item for item in ids if isinstance(item, str) and item]
    else:
        for record in payload:
            word = normalized(record.get('word'))
            if word and record.get('id'): result.setdefault(word, []).append(record['id'])
    return result
def regenerate(source, legacy, output, minimum=5800):
    selected = {}
    with source.open(encoding='utf-8', newline='') as handle:
        for row in csv.DictReader(handle):
            word = normalized(row.get('word'))
            if not word or not ({'cet4', 'cet6'} & set(tags(row))): continue
            if word not in selected or rank(row) < rank(selected[word]): selected[word] = row
    aliases = legacy_ids(legacy)
    if not aliases:
        for shard in sorted(output.glob('level-*.json')):
            for record in json.loads(shard.read_text(encoding='utf-8')):
                if record.get('legacyIds'): aliases[record['word']] = record['legacyIds']
    records = []
    for word, row in sorted(selected.items(), key=lambda item: rank(item[1])):
        meaning = (row.get('translation') or row.get('definition') or '').strip()
        if not meaning: continue
        record = {'id': 'ecdict-' + hashlib.sha256(word.encode()).hexdigest()[:16], 'word': word, 'phonetic': (row.get('phonetic') or '').strip(), 'meaning': meaning, 'example': '', 'exampleCn': '', 'pos': inferred_pos((row.get('pos') or '').strip() or meaning), 'source': 'ecdict', 'tags': tags(row)}
        if word in aliases: record['legacyIds'] = sorted(set(aliases[word]))
        records.append(record)
    if len(records) < minimum: raise ValueError(f'expected at least {minimum} ECDICT CET words, found {len(records)}')
    coverage = round(100 * sum(record['pos'] != 'other' for record in records) / max(len(records), 1), 2)
    if coverage < 99: raise ValueError(f'POS coverage must be at least 99%, found {coverage}%')
    output.mkdir(parents=True, exist_ok=True)
    counts, urls = [], []
    for level in range(LEVELS):
        start, end = level * len(records) // LEVELS, (level + 1) * len(records) // LEVELS
        name = f'level-{level}.json'; shard = [{**record, 'level': level} for record in records[start:end]]
        (output / name).write_text(json.dumps(shard, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
        counts.append(len(shard)); urls.append(name)
    (output / 'manifest.json').write_text(json.dumps({'version': 3, 'total': len(records), 'counts': counts, 'urls': urls}, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    (output / 'legacy-ids.json').write_text(json.dumps(aliases, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    return len(records), coverage
def main():
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE); parser.add_argument('--legacy', type=Path, default=DEFAULT_LEGACY); parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args(); total, coverage = regenerate(args.source, args.legacy, args.output); print(f'Generated {args.output}: {total} ECDICT words, POS coverage {coverage}%')
if __name__ == '__main__': main()
