from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image
from PIL.PngImagePlugin import PngInfo


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "optimize_images.py"
SCENE_STEMS = (
    "flowvocab-scene-vocab",
    "flowvocab-scene-grammar",
    "flowvocab-scene-sentence",
    "flowvocab-scene-listening",
    "flowvocab-scene-writing",
    "flowvocab-scene-reading",
)


def write_fixture_assets(directory: Path) -> None:
    """Create deterministic source PNGs so tests do not depend on shipped inputs."""
    stems = (*SCENE_STEMS, "neon-harbor-quest")
    sizes = {stem: (1536, 1152) for stem in SCENE_STEMS}
    sizes["neon-harbor-quest"] = (1600, 1066)
    directory.mkdir(parents=True, exist_ok=True)
    for seed, stem in enumerate(stems, start=1):
        width, height = sizes[stem]
        image = Image.new("RGB", (width, height), (seed * 31 % 256, seed * 53 % 256, seed * 79 % 256))
        metadata = PngInfo()
        metadata.add_text("fixture", ("flowvocab-deterministic-fixture-" + str(seed)) * 4096)
        image.save(directory / f"{stem}.png", format="PNG", pnginfo=metadata)
        image.close()


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
            first_source, second_source = first / "source", second / "source"
            first_output, second_output = first / "output", second / "output"
            write_fixture_assets(first_source)
            write_fixture_assets(second_source)
            first_report = optimizer.optimize_assets(first_source, first_output)
            second_report = optimizer.optimize_assets(second_source, second_output)

            expected = {f"{stem}-{width}.webp" for stem in SCENE_STEMS for width in (640, 1024)}
            expected.update({"neon-harbor-quest-768.webp", "neon-harbor-quest-1280.webp"})
            self.assertEqual({path.name for path in first_output.iterdir()}, expected)
            self.assertEqual(first_report.output_bytes, second_report.output_bytes)
            self.assertLessEqual(first_report.output_bytes, int(first_report.input_bytes * 0.20))

            expected_sizes = {640: (640, 480), 1024: (1024, 768), 768: (768, 512), 1280: (1280, 853)}
            for name in expected:
                self.assertEqual((first_output / name).read_bytes(), (second_output / name).read_bytes())
                width = int(name.removesuffix(".webp").rsplit("-", 1)[1])
                with Image.open(first_output / name) as image:
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
