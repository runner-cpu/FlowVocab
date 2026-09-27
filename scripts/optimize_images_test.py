from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "optimize_images.py"
ASSETS = ROOT / "public" / "assets"
SCENE_STEMS = (
    "flowvocab-scene-vocab",
    "flowvocab-scene-grammar",
    "flowvocab-scene-sentence",
    "flowvocab-scene-listening",
    "flowvocab-scene-writing",
    "flowvocab-scene-reading",
)


def load_optimizer():
    if not SCRIPT.is_file():
        raise AssertionError("the image optimizer must be implemented before these behavior checks can pass")
    spec = importlib.util.spec_from_file_location("flowvocab_optimize_images", SCRIPT)
    if spec is None or spec.loader is None:
        raise AssertionError("unable to load the image optimizer")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class OptimizeImagesTest(unittest.TestCase):
    def test_emits_deterministic_metadata_free_responsive_webp_assets(self):
        optimizer = load_optimizer()
        with tempfile.TemporaryDirectory() as first_dir, tempfile.TemporaryDirectory() as second_dir:
            first = Path(first_dir)
            second = Path(second_dir)
            first_report = optimizer.optimize_assets(ASSETS, first)
            second_report = optimizer.optimize_assets(ASSETS, second)

            expected = {f"{stem}-{width}.webp" for stem in SCENE_STEMS for width in (640, 1024)}
            expected.update({"neon-harbor-quest-768.webp", "neon-harbor-quest-1280.webp"})
            self.assertEqual({path.name for path in first.iterdir()}, expected)
            self.assertEqual(first_report.output_bytes, second_report.output_bytes)
            self.assertLessEqual(first_report.output_bytes, int(first_report.input_bytes * 0.20))

            expected_sizes = {640: (640, 480), 1024: (1024, 768), 768: (768, 512), 1280: (1280, 853)}
            for name in expected:
                self.assertEqual((first / name).read_bytes(), (second / name).read_bytes())
                width = int(name.removesuffix(".webp").rsplit("-", 1)[1])
                with Image.open(first / name) as image:
                    self.assertEqual(image.format, "WEBP")
                    self.assertEqual(image.size, expected_sizes[width])
                    self.assertNotIn("exif", image.info)
                    self.assertNotIn("icc_profile", image.info)
                    self.assertNotIn("xmp", image.info)

    def test_resize_dimensions_preserve_aspect_ratio_without_upscaling(self):
        optimizer = load_optimizer()
        self.assertEqual(optimizer.resize_dimensions((1536, 1024), 1280), (1280, 853))
        self.assertEqual(optimizer.resize_dimensions((320, 240), 640), (320, 240))


if __name__ == "__main__":
    unittest.main()
