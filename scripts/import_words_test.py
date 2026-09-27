import csv
import json
import tempfile
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from import_words import regenerate

class ImportWordsTest(unittest.TestCase):
    def test_generates_normalized_ecdict_shards_with_inferred_pos_and_aliases(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'ecdict.csv'
            with source.open('w', encoding='utf-8', newline='') as handle:
                writer = csv.DictWriter(handle, fieldnames=['word', 'phonetic', 'definition', 'translation', 'pos', 'tag', 'frq'])
                writer.writeheader()
                writer.writerows([
                    {'word': 'Alpha', 'phonetic': 'a', 'translation': 'n. alpha', 'pos': '', 'tag': 'cet4 cet4', 'frq': '2'},
                    {'word': ' alpha ', 'phonetic': '', 'translation': 'n. duplicate', 'pos': '', 'tag': 'cet6', 'frq': '1'},
                    {'word': 'Absorb', 'phonetic': 'b', 'translation': 'vt. absorb', 'pos': '', 'tag': 'cet6', 'frq': '3'},
                    {'word': 'Able', 'phonetic': 'c', 'translation': 'a. able', 'pos': '', 'tag': 'cet4', 'frq': '4'},
                ])
            legacy = root / 'legacy.json'
            legacy.write_text(json.dumps([{'id': 'old-alpha', 'word': 'alpha'}]), encoding='utf-8')
            output = root / 'words'
            total, coverage = regenerate(source, legacy, output, minimum=0)
            manifest = json.loads((output / 'manifest.json').read_text(encoding='utf-8'))
            generated = [word for level in range(5) for word in json.loads((output / f'level-{level}.json').read_text(encoding='utf-8'))]
            self.assertEqual(total, 3)
            self.assertGreaterEqual(coverage, 99)
            self.assertEqual(sum(manifest['counts']), total)
            self.assertEqual(len(generated), len({word['word'] for word in generated}))
            self.assertTrue(all(word['id'].startswith('ecdict-') for word in generated))
            self.assertEqual(next(word for word in generated if word['word'] == 'alpha')['legacyIds'], ['old-alpha'])
            self.assertEqual({word['word']: word['pos'] for word in generated}, {'able': 'adj', 'absorb': 'verb', 'alpha': 'noun'})

    def test_preserves_mapping_aliases_across_regeneration(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'ecdict.csv'
            with source.open('w', encoding='utf-8', newline='') as handle:
                writer = csv.DictWriter(handle, fieldnames=['word', 'phonetic', 'definition', 'translation', 'pos', 'tag', 'frq'])
                writer.writeheader()
                writer.writerow({'word': 'Alpha', 'phonetic': '', 'translation': 'n. alpha', 'pos': '', 'tag': 'cet4', 'frq': '1'})
            legacy = root / 'legacy-ids.json'
            legacy.write_text(json.dumps({'alpha': ['cet4-old-alpha']}), encoding='utf-8')
            output = root / 'words'

            regenerate(source, legacy, output, minimum=0)
            regenerate(source, output / 'legacy-ids.json', output, minimum=0)

            generated = [word for level in range(5) for word in json.loads((output / f'level-{level}.json').read_text(encoding='utf-8'))]
            self.assertEqual(generated[0]['legacyIds'], ['cet4-old-alpha'])

if __name__ == '__main__':
    unittest.main()
