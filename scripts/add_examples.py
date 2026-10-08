#!/usr/bin/env python3
"""Attach deterministic, offline Tatoeba example sentences to the ECDICT shards.

The importer reads the English sentence export
(https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2)
once into the git-ignored data-src/ cache and reuses that download afterwards;
--force re-fetches it. For every shard word the selector accepts only sentences
that contain the word as a whole token (case-insensitive), are 4-12 words long,
use ASCII letters with basic punctuation only and hold at most MAX_COMMAS
commas. The shortest accepted sentence wins, ties break on the ascending
Tatoeba sentence id, one sentence is never attached to two words inside the
same shard, and a word without an acceptable match keeps its empty example —
nothing is invented. The English sentence is stored verbatim in `example`;
`exampleCn` is never filled here because the export ships no translation.
Provenance lives in public/data/words/examples-attribution.json. Selection and
writing are deterministic, so re-running against the same archive is
idempotent. Every shard is validated before writing and replaced atomically.
"""
import argparse
import bz2
import json
import os
import re
import tempfile
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

SOURCE_URL = 'https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2'
SOURCE_NAME = 'Tatoeba'
LICENSE = 'CC-BY 2.0 FR'
LICENSE_URL = 'https://creativecommons.org/licenses/by/2.0/fr/'
DEFAULT_ARCHIVE = Path('data-src/eng_sentences.tsv.bz2')
DEFAULT_OUTPUT = Path('public/data/words')
MANIFEST_NAME = 'manifest.json'
ATTRIBUTION_NAME = 'examples-attribution.json'
MANIFEST_VERSION = 3
LEVELS = 5
LANGUAGE = 'eng'
MIN_WORDS = 4
MAX_WORDS = 12
RELAXED_MAX_WORDS = 16
COVERAGE_TARGET = 55.0
MAX_COMMAS = 2
CANDIDATE_LIMIT = 64
CANDIDATE_TRIM = 128
MIN_ARCHIVE_BYTES = 1_000_000
# ASCII letters, spaces and basic punctuation only: no digits, quotes beyond
# the ASCII pair, colons, semicolons, parentheses or non-ASCII dashes.
SENTENCE_PATTERN = re.compile(r"[A-Za-z ,.'\"?!-]+")
TOKEN_EDGE_CHARS = ".,?!\"';:-"


def token_key(value):
    """Lower-case a word or sentence token with surrounding punctuation removed."""
    return (value or '').strip(TOKEN_EDGE_CHARS).lower()


def sentence_is_acceptable(sentence, minimum=MIN_WORDS, maximum=MAX_WORDS):
    words = sentence.split()
    if not minimum <= len(words) <= maximum:
        return False
    if sentence.count(',') > MAX_COMMAS:
        return False
    return SENTENCE_PATTERN.fullmatch(sentence) is not None


def read_sentences(archive):
    """Yield (sentence_id, text) for every English sentence in the export."""
    with bz2.open(archive, 'rt', encoding='utf-8') as handle:
        for line in handle:
            fields = line.rstrip('\r\n').split('\t')
            if len(fields) != 3 or fields[1] != LANGUAGE or not fields[0].isdigit():
                continue
            yield int(fields[0]), fields[2]


def collect_candidates(records, sentences, minimum=MIN_WORDS, maximum=MAX_WORDS):
    """Map word id -> bounded, sorted [(word count, sentence id, sentence)]."""
    wanted = {}
    for record in records:
        wanted.setdefault(token_key(record['word']), []).append(record['id'])
    buckets = {}
    for sentence_id, raw in sentences:
        sentence = (raw or '').strip()
        if not sentence or '  ' in sentence or not sentence_is_acceptable(sentence, minimum, maximum):
            continue
        tokens = sentence.split()
        for key in {token_key(token) for token in tokens}:
            for word_id in wanted.get(key, ()):
                bucket = buckets.setdefault(word_id, [])
                bucket.append((len(tokens), sentence_id, sentence))
                if len(bucket) > CANDIDATE_TRIM:
                    bucket.sort(key=lambda item: (item[0], item[1]))
                    del bucket[CANDIDATE_LIMIT:]
    return buckets


def assign_examples(records, buckets):
    """Greedily claim the shortest unused sentence per word, in word-id order."""
    selected, used = {}, {}
    for record in sorted(records, key=lambda item: item['id']):
        candidates = buckets.get(record['id'])
        if not candidates:
            continue
        taken = used.setdefault(record['level'], set())
        candidates.sort(key=lambda item: (item[0], item[1]))
        for _, sentence_id, sentence in candidates:
            if sentence_id in taken:
                continue
            taken.add(sentence_id)
            selected[record['id']] = {'sentenceId': sentence_id, 'sentence': sentence}
            break
    return selected


def select_examples(records, sentences, minimum=MIN_WORDS, maximum=MAX_WORDS):
    """Pure selection entry point: records plus (id, text) pairs -> picks."""
    return assign_examples(records, collect_candidates(records, sentences, minimum, maximum))


def text(value):
    return isinstance(value, str) and bool(value.strip())


def string_array(value):
    return isinstance(value, list) and all(text(item) for item in value)


def valid_record(record):
    """Mirror the app's Word shape rules (src/store/wordBank.ts validWord)."""
    if not isinstance(record, dict):
        return False
    if not text(record.get('id')) or not text(record.get('word')) or not text(record.get('meaning')):
        return False
    if not isinstance(record.get('pos'), str):
        return False
    level = record.get('level')
    if not isinstance(level, int) or isinstance(level, bool) or not 0 <= level <= LEVELS - 1:
        return False
    if record.get('source') != 'ecdict':
        return False
    for key in ('phonetic', 'example', 'exampleCn'):
        if key in record and not isinstance(record[key], str):
            return False
    if 'tags' in record and not string_array(record['tags']):
        return False
    legacy = record.get('legacyIds')
    if legacy is not None and (not string_array(legacy) or record['id'] in legacy):
        return False
    return True


def validate_records(records, label='shard'):
    seen = set()
    for record in records:
        if not valid_record(record):
            raise ValueError(f'invalid word record in {label}: {record!r:.200}')
        if record['id'] in seen:
            raise ValueError(f'duplicate word id in {label}: {record["id"]}')
        seen.add(record['id'])
    return records


def write_atomic(path, content):
    """Write to a temp file in the same directory, then replace the target."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    handle = tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=path.parent, prefix=path.name + '.', suffix='.tmp', delete=False)
    temporary = Path(handle.name)
    try:
        with handle:
            handle.write(content)
        os.replace(temporary, path)
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise


def write_shard(path, records):
    validate_records(records, Path(path).name)
    write_atomic(path, json.dumps(records, ensure_ascii=False, separators=(',', ':')) + '\n')


def download_archive(archive, proxy='', force=False, timeout=120):
    """Reuse the cached export unless missing or --force re-fetches it."""
    archive = Path(archive)
    if archive.exists() and archive.stat().st_size and not force:
        return archive
    archive.parent.mkdir(parents=True, exist_ok=True)
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({'http': proxy, 'https': proxy})) if proxy else urllib.request.build_opener()
    request = urllib.request.Request(SOURCE_URL, headers={'User-Agent': 'flowvocab-add-examples/1.0'})
    temporary = archive.with_name(archive.name + '.part')
    try:
        with opener.open(request, timeout=timeout) as response, temporary.open('wb') as handle:
            while True:
                block = response.read(1 << 20)
                if not block:
                    break
                handle.write(block)
        with temporary.open('rb') as probe:
            magic = probe.read(3)
        if temporary.stat().st_size < MIN_ARCHIVE_BYTES or magic != b'BZh':
            raise ValueError('download is not the expected Tatoeba bzip2 export')
        os.replace(temporary, archive)
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise
    return archive


def load_shards(output):
    output = Path(output)
    manifest = json.loads((output / MANIFEST_NAME).read_text(encoding='utf-8'))
    if manifest.get('version') != MANIFEST_VERSION:
        raise ValueError('unexpected manifest version')
    urls, counts = manifest.get('urls'), manifest.get('counts')
    if not isinstance(urls, list) or not isinstance(counts, list) or len(urls) != LEVELS or len(counts) != LEVELS:
        raise ValueError('invalid word manifest')
    if sum(counts) != manifest.get('total'):
        raise ValueError('manifest counts do not match total')
    shards = []
    for level, url in enumerate(urls):
        path = output / url
        records = json.loads(path.read_text(encoding='utf-8'))
        if not isinstance(records, list) or len(records) != counts[level]:
            raise ValueError(f'{url} does not match the manifest count')
        validate_records(records, url)
        if any(record['level'] != level for record in records):
            raise ValueError(f'{url} holds a record from another level')
        shards.append((level, path, records))
    return manifest, shards


def attribution_payload(selected, archive):
    retrieved = datetime.fromtimestamp(Path(archive).stat().st_mtime, tz=timezone.utc).isoformat(timespec='seconds')
    return {
        'source': SOURCE_NAME,
        'license': LICENSE,
        'url': SOURCE_URL,
        'retrievedAt': retrieved,
        'sentenceIds': {word_id: value['sentenceId'] for word_id, value in sorted(selected.items())},
    }


def attach_examples(archive=DEFAULT_ARCHIVE, output=DEFAULT_OUTPUT, proxy='', force=False,
                    coverage_target=COVERAGE_TARGET, log=print):
    archive = download_archive(archive, proxy=proxy, force=force)
    output = Path(output)
    manifest, shards = load_shards(output)
    records = [record for _, _, shard in shards for record in shard]
    ids = [record['id'] for record in records]
    if len(set(ids)) != len(ids):
        raise ValueError('duplicate word ids across shards')
    before = {path.name: path.stat().st_size for _, path, _ in shards}

    selected = select_examples(records, read_sentences(archive), minimum=MIN_WORDS, maximum=MAX_WORDS)
    first_coverage = round(100 * len(selected) / max(len(records), 1), 2)
    maximum = MAX_WORDS
    if first_coverage < coverage_target:
        maximum = RELAXED_MAX_WORDS
        selected = select_examples(records, read_sentences(archive), minimum=MIN_WORDS, maximum=maximum)
    coverage = round(100 * len(selected) / max(len(records), 1), 2)

    for level, path, shard in shards:
        updated = [{**record, 'example': selected[record['id']]['sentence']} if record['id'] in selected else record for record in shard]
        write_shard(path, updated)

    payload = attribution_payload(selected, archive)
    write_atomic(output / ATTRIBUTION_NAME, json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n')

    after = {path.name: path.stat().st_size for _, path, _ in shards}
    missing = [record for record in records if record['id'] not in selected]
    by_pos, levels = {}, []
    for record in missing:
        by_pos[record['pos']] = by_pos.get(record['pos'], 0) + 1
    for level, _, shard in shards:
        levels.append((level, len(shard), sum(1 for record in shard if record['id'] in selected)))

    log(f'archive {archive} ({archive.stat().st_size} bytes, retrieved {payload["retrievedAt"]})')
    log(f'pass 1 window {MIN_WORDS}-{MAX_WORDS}: {first_coverage}%')
    if maximum != MAX_WORDS:
        log(f'coverage below {coverage_target}%: relaxed window to {MIN_WORDS}-{maximum}')
    log(f'final coverage {coverage}% ({len(selected)}/{len(records)} words with an example, window {MIN_WORDS}-{maximum})')
    log('per level: ' + ', '.join(f'level-{level} {examples}/{words}' for level, words, examples in levels))
    log('shard bytes: ' + ', '.join(f'{name} {before[name]} -> {after[name]}' for name in before))
    log(f'shards unchanged count: {manifest["total"]} words, counts {manifest["counts"]}')
    log(f'words without an example: {len(missing)} (by pos: {dict(sorted(by_pos.items(), key=lambda item: -item[1]))})')
    log('sample words without an example: ' + ', '.join(record['word'] for record in missing[:20]))
    return {'words': len(records), 'examples': len(selected), 'coverage': coverage, 'window': maximum,
            'missing': len(missing), 'missingByPos': by_pos, 'before': before, 'after': after}


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--archive', type=Path, default=DEFAULT_ARCHIVE)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--proxy', default=os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy') or '')
    parser.add_argument('--force', action='store_true', help='re-download the Tatoeba export even when data-src/ already holds it')
    parser.add_argument('--coverage-target', type=float, default=COVERAGE_TARGET)
    args = parser.parse_args()
    attach_examples(archive=args.archive, output=args.output, proxy=args.proxy, force=args.force, coverage_target=args.coverage_target)


if __name__ == '__main__':
    main()
