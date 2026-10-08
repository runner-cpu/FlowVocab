"""Offline unit tests for scripts/add_examples.py.

Every test runs against an in-memory sentence list or a temporary directory;
no test touches the network or the real shards.
"""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from add_examples import (
    MAX_COMMAS,
    download_archive,
    load_shards,
    select_examples,
    sentence_is_acceptable,
    validate_records,
    write_shard,
)

# A small deterministic corpus: only the sentences below exist upstream.
SENTENCES = [
    (5, 'A cat appears in many stories often now.'),
    (10, 'The cat sat on the mat.'),
    (13, 'I like my cat very much today.'),
    (14, 'He saw cats everywhere.'),
    (15, 'Cat, dog, bird, fish.'),
    (16, "The cat's toy broke again."),
    (17, 'Where is the cat?'),
    (19, 'The cat; the dog ran away.'),
    (20, 'The caf\u00e9 cat naps all afternoon.'),
    (21, 'The cat is 3 years old.'),
    (25, 'We fed her cat bread.'),
    (30, 'They saw my cat today.'),
    (41, 'The CAT sat down quietly.'),
    (60, 'The dog ran away.'),
    (61, 'The dog runs fast.'),
    (64, 'zzz.'),
]


def record(word, level=0, word_id=None, **overrides):
    value = {'id': word_id or f'ecdict-{word}-{level}', 'word': word, 'phonetic': '', 'meaning': f'n. {word}',
             'example': '', 'exampleCn': '', 'pos': 'noun', 'source': 'ecdict', 'tags': ['cet4'], 'level': level}
    value.update(overrides)
    return value


class SentenceAcceptanceTest(unittest.TestCase):
    def test_length_window_bounds_are_inclusive(self):
        self.assertFalse(sentence_is_acceptable('Cat is here.'))          # 3 words, below the window
        self.assertTrue(sentence_is_acceptable('Where is the cat?'))      # 5 words
        self.assertFalse(sentence_is_acceptable(' '.join(['word'] * 13)))  # 13 words, above 4-12

    def test_relaxed_window_accepts_longer_sentences(self):
        sentence = 'A cat appears in many stories often now.'
        self.assertTrue(sentence_is_acceptable(sentence, maximum=12))
        self.assertFalse(sentence_is_acceptable(' '.join(['cat'] * 17), maximum=16))

    def test_rejects_comma_heavy_and_unusual_punctuation(self):
        self.assertFalse(sentence_is_acceptable('Cat, dog, bird, fish.'))          # 3 commas
        self.assertTrue(sentence_is_acceptable('Well, the cat stayed home today.'))  # 1 comma
        self.assertFalse(sentence_is_acceptable('The cat; the dog ran away.'))
        self.assertFalse(sentence_is_acceptable('The caf\u00e9 cat naps all afternoon.'))
        self.assertFalse(sentence_is_acceptable('The cat \u2014 asleep \u2014 still purrs.'))
        self.assertFalse(sentence_is_acceptable(''))


class SelectionTest(unittest.TestCase):
    def select(self, records, maximum=12, minimum=4):
        return select_examples(records, SENTENCES, minimum=minimum, maximum=maximum)

    def test_whole_token_case_insensitive_matching_and_shortest_pick(self):
        chosen = self.select([record('cat'), record('Quietly'), record('cats'), record('zzz')])
        # 'cat' never matches 'cats' or "cat's"; the shortest 5-word candidate with the lowest id wins.
        self.assertEqual(chosen['ecdict-cat-0'], {'sentenceId': 17, 'sentence': 'Where is the cat?'})
        # Record casing is irrelevant and uppercase sentence tokens still match.
        self.assertEqual(chosen['ecdict-Quietly-0']['sentenceId'], 41)
        # 'cats' is its own token and only sentence 14 carries it.
        self.assertEqual(chosen['ecdict-cats-0']['sentenceId'], 14)
        self.assertNotIn('ecdict-zzz-0', chosen)

    def test_tie_breaks_on_the_ascending_sentence_id(self):
        chosen = self.select([record('cat', word_id='only')])
        self.assertEqual(chosen['only']['sentenceId'], 17)  # ids 17, 25, 30 and 41 all hold 5 words

    def test_punctuation_and_length_filters_exclude_sentences(self):
        chosen = self.select([record('fish'), record('years'), record('zzz')])
        self.assertEqual(chosen, {})  # 'fish' sits in a comma-heavy line, 'years' behind a digit, 'zzz' is a one-word line
        # Apostrophes and hyphens are basic punctuation, so sentence 16 stays usable.
        self.assertTrue(sentence_is_acceptable("The cat's toy broke again."))
        self.assertEqual(self.select([record('toy')])['ecdict-toy-0']['sentenceId'], 16)

    def test_no_sentence_reused_for_two_words_in_the_same_shard(self):
        chosen = self.select([record('mat', word_id='a-mat'), record('on', word_id='b-on')])
        self.assertEqual(chosen['a-mat']['sentenceId'], 10)  # the lower id claims the single shared sentence
        self.assertNotIn('b-on', chosen)                     # the sibling word gets nothing rather than a duplicate

    def test_same_spelling_twice_gets_two_distinct_sentences(self):
        chosen = self.select([record('cat', word_id='a-cat'), record('cat', word_id='b-cat')])
        self.assertEqual(chosen['a-cat']['sentenceId'], 17)
        self.assertEqual(chosen['b-cat']['sentenceId'], 25)  # next shortest unused id
        self.assertNotEqual(chosen['a-cat']['sentence'], chosen['b-cat']['sentence'])

    def test_contested_sentence_may_cross_shard_levels(self):
        chosen = self.select([record('mat', level=0, word_id='a-mat'), record('mat', level=1, word_id='b-mat')])
        self.assertEqual(chosen['a-mat']['sentenceId'], 10)
        self.assertEqual(chosen['b-mat']['sentenceId'], 10)  # reuse is only forbidden inside one shard

    def test_window_can_be_tightened_and_widened(self):
        records = [record('cat', word_id='cat'), record('stories', word_id='stories')]
        narrow = self.select(records, minimum=6, maximum=6)
        self.assertEqual(narrow['cat']['sentenceId'], 10)
        self.assertNotIn('stories', narrow)
        wide = self.select(records, minimum=4, maximum=12)
        self.assertEqual(wide['cat']['sentenceId'], 17)
        self.assertEqual(wide['stories']['sentenceId'], 5)

    def test_selection_is_deterministic_and_order_independent(self):
        records = [record('cat'), record('dog'), record('mat'), record('Quietly')]
        first = self.select(records)
        second = self.select(list(reversed(records)))
        self.assertEqual(first, second)
        self.assertEqual(len({id(value) for value in first.values()}), len(first))


class ValidationAndWriteTest(unittest.TestCase):
    def test_validate_records_accepts_shard_shape_and_rejects_broken_ones(self):
        good = [record('cat'), record('dog', level=1, word_id='ecdict-dog-1')]
        self.assertEqual(validate_records(good), good)
        broken = [
            record('cat', meaning=''),
            record('cat', source='other', word_id='ecdict-x1'),
            record('cat', pos=None, word_id='ecdict-x2'),
            record('cat', level=5, word_id='ecdict-x3'),
            record('cat', tags=['cet4', ''], word_id='ecdict-x4'),
            record('cat', id='same', legacyIds=['same']),
        ]
        for bad in broken:
            with self.assertRaises(ValueError, msg=repr(bad)):
                validate_records([bad])
        with self.assertRaises(ValueError):
            validate_records([record('cat', word_id='same'), record('dog', word_id='same')])

    def test_write_shard_replaces_atomically_and_leaves_no_temp_file(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            target = root / 'level-0.json'
            records = [record('cat'), record('dog', word_id='ecdict-dog-0')]
            write_shard(target, records)
            self.assertEqual(json.loads(target.read_text(encoding='utf-8')), records)
            write_shard(target, records[:1])  # a second write replaces the first, no append
            self.assertEqual(json.loads(target.read_text(encoding='utf-8')), records[:1])
            self.assertEqual([path.name for path in root.iterdir()], ['level-0.json'])

    def test_failed_validation_keeps_the_previous_file_intact(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            target = root / 'level-0.json'
            write_shard(target, [record('cat')])
            before = target.read_bytes()
            with self.assertRaises(ValueError):
                write_shard(target, [record('dog', meaning='', word_id='ecdict-dog-0')])
            self.assertEqual(target.read_bytes(), before)
            self.assertEqual([path.name for path in root.iterdir()], ['level-0.json'])

    def test_load_shards_checks_manifest_counts_and_levels(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            manifest = {'version': 3, 'total': 2, 'counts': [1, 1, 0, 0, 0], 'urls': [f'level-{level}.json' for level in range(5)]}
            (output / 'manifest.json').write_text(json.dumps(manifest), encoding='utf-8')
            (output / 'level-0.json').write_text(json.dumps([record('cat')]), encoding='utf-8')
            (output / 'level-1.json').write_text(json.dumps([record('dog', level=1, word_id='ecdict-dog-1')]), encoding='utf-8')
            for level in (2, 3, 4):
                (output / f'level-{level}.json').write_text('[]', encoding='utf-8')
            loaded_manifest, shards = load_shards(output)
            self.assertEqual(loaded_manifest['total'], 2)
            self.assertEqual([len(records) for _, _, records in shards], [1, 1, 0, 0, 0])
            manifest['counts'] = [2, 0, 0, 0, 0]
            (output / 'manifest.json').write_text(json.dumps(manifest), encoding='utf-8')
            with self.assertRaises(ValueError):
                load_shards(output)


class DownloadReuseTest(unittest.TestCase):
    def test_cached_archive_is_reused_without_network(self):
        with tempfile.TemporaryDirectory() as temp:
            archive = Path(temp) / 'eng_sentences.tsv.bz2'
            archive.write_bytes(b'BZh9cached')
            self.assertEqual(download_archive(archive), archive)
            self.assertEqual(archive.read_bytes(), b'BZh9cached')


if __name__ == '__main__':
    unittest.main()
