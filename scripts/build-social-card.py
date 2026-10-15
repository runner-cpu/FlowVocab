"""
社交分享卡生成：把 og:image 从「场景插画原图」换成 1200x630 的专用卡片。

为什么必须单独做：社交平台按 1200x630（1.91:1）裁切预览图，
直接用 1280x853（3:2）的场景插画会被上下切掉标题区，分享出去只看到半张图。

素材：public/assets/neon-harbor-quest-1280.webp（首页主插画）+ 系统中文黑体。
用法：python scripts/build-social-card.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"
SOURCE = ASSETS / "neon-harbor-quest-1280.webp"
TARGET = ASSETS / "social-card.png"

WIDTH, HEIGHT = 1200, 630
TITLE = "微光港：英语星图"
SUBTITLE = "免安装 · 免注册 · 断网可玩"
POINTS = "六个训练站 · 错因讲解 · 间隔复习 · 数据只存本机"
BRAND = "FlowVocab"

INK = (239, 247, 255)
ACCENT = (84, 215, 176)
MUTED = (182, 201, 220)

FONT_CANDIDATES = (
    r"C:\Windows\Fonts\msyhbd.ttc",
    r"C:\Windows\Fonts\msyh.ttc",
    "/System/Library/Fonts/PingFang.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
)


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for candidate in FONT_CANDIDATES:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def cover(image: Image.Image, width: int, height: int) -> Image.Image:
    """等比缩放到铺满目标尺寸（不拉伸变形）。"""
    scale = max(width / image.width, height / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    return resized.crop((left, top, left + width, top + height))


def main() -> None:
    if not SOURCE.is_file():
        raise SystemExit(f"missing source illustration: {SOURCE}")

    canvas = cover(Image.open(SOURCE).convert("RGB"), WIDTH, HEIGHT)
    canvas = canvas.filter(ImageFilter.GaussianBlur(1.2))

    # 左侧压暗，保证中文标题在任意插画区域上都能达到正文对比度。
    scrim = Image.new("L", (WIDTH, HEIGHT), 0)
    draw_scrim = ImageDraw.Draw(scrim)
    for x in range(WIDTH):
        alpha = max(0, min(215, round(232 - (x / WIDTH) * 250)))
        draw_scrim.line([(x, 0), (x, HEIGHT)], fill=alpha)
    canvas = Image.composite(Image.new("RGB", (WIDTH, HEIGHT), (4, 20, 38)), canvas, scrim)

    draw = ImageDraw.Draw(canvas)
    title_font = load_font(72)
    sub_font = load_font(34)
    point_font = load_font(26)
    brand_font = load_font(24)

    left = 72
    draw.rectangle([left, 86, left + 74, 92], fill=ACCENT)
    draw.text((left, 118), TITLE, font=title_font, fill=INK)
    draw.text((left, 222), SUBTITLE, font=sub_font, fill=ACCENT)
    draw.text((left, 288), POINTS, font=point_font, fill=MUTED)
    draw.text((left, HEIGHT - 82), BRAND, font=brand_font, fill=MUTED)

    canvas.save(TARGET, format="PNG", optimize=True)
    print(f"wrote {TARGET.relative_to(ROOT)} ({TARGET.stat().st_size} bytes, {WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    main()
