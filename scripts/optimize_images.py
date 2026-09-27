"""Deterministically create responsive WebP variants from the seven shipped PNGs."""
from __future__ import annotations

from pathlib import Path
from PIL import Image

SCENES = (
    "flowvocab-scene-vocab", "flowvocab-scene-grammar",
    "flowvocab-scene-sentence", "flowvocab-scene-listening",
    "flowvocab-scene-writing", "flowvocab-scene-reading",
)
QUALITY = 72
METHOD = 6

class OptimizeReport:
    def __init__(self, input_bytes: int, output_bytes: int) -> None:
        self.input_bytes = input_bytes
        self.output_bytes = output_bytes

def resize_dimensions(size: tuple[int, int], target_width: int) -> tuple[int, int]:
    width, height = size
    if width <= target_width:
        return size
    return target_width, max(1, round(height * target_width / width))

def _write(source: Path, destination: Path, target_width: int) -> int:
    with Image.open(source) as original:
        size = resize_dimensions(original.size, target_width)
        image = original.convert("RGB")
        if size != original.size:
            image = image.resize(size, Image.Resampling.LANCZOS)
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, format="WEBP", quality=QUALITY, method=METHOD, exact=True)
        image.close()
    return destination.stat().st_size

def optimize_assets(source_dir: str | Path, output_dir: str | Path) -> OptimizeReport:
    source_dir, output_dir = Path(source_dir), Path(output_dir)
    jobs = [(stem, width) for stem in SCENES for width in (640, 1024)]
    jobs.extend((("neon-harbor-quest", width) for width in (768, 1280)))
    input_names = [f"{stem}.png" for stem in (*SCENES, "neon-harbor-quest")]
    missing = [name for name in input_names if not (source_dir / name).is_file()]
    if missing:
        raise FileNotFoundError(", ".join(missing))
    output_dir.mkdir(parents=True, exist_ok=True)
    for old in output_dir.glob("*.webp"):
        old.unlink()
    output_bytes = 0
    for stem, width in jobs:
        output_bytes += _write(source_dir / f"{stem}.png", output_dir / f"{stem}-{width}.webp", width)
    input_bytes = sum((source_dir / name).stat().st_size for name in input_names)
    if output_bytes > input_bytes * 0.20:
        raise RuntimeError(f"optimized media is {output_bytes / input_bytes:.1%}; expected <= 20%")
    return OptimizeReport(input_bytes, output_bytes)

if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    assets = root / "public" / "assets"
    report = optimize_assets(assets, assets)
    for stem in (*SCENES, "neon-harbor-quest"):
        (assets / f"{stem}.png").unlink()
    print(f"optimized {report.input_bytes} -> {report.output_bytes} bytes")
