"""
应用图标生成：从 FlowVocabMark 的设计稿（96 视口）确定性渲染 PNG。

为什么需要 PNG：Safari 的 apple-touch-icon 不支持 SVG，Android/桌面 Chrome 的
可安装性检查也更偏好 192/512 的位图图标；只提供 SVG 会让「添加到主屏」退化成网页截图。

几何与 public/icons/flowvocab-icon.svg 保持一致：
  圆角矩形底 #082949、叶片路径 #36e0ae（三段三次贝塞尔）、右上圆点 #f4d37a。
用法：python scripts/build-app-icons.py
"""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "icons"

BACKGROUND = (8, 41, 73)
LEAF = (54, 224, 174)
SUN = (244, 211, 122)
VIEW = 96.0

# 与 SVG 的 d="M23 63c12-21 24-32 50-30-9 5-16 12-20 21-5 11-14 17-30 9Z" 同源。
LEAF_SEGMENTS = (
    ((23.0, 63.0), (35.0, 42.0), (47.0, 31.0), (73.0, 33.0)),
    ((73.0, 33.0), (64.0, 38.0), (57.0, 45.0), (53.0, 54.0)),
    ((53.0, 54.0), (48.0, 65.0), (39.0, 71.0), (23.0, 63.0)),
)
SUN_CENTER = (65.0, 31.0)
SUN_RADIUS = 7.0
CORNER_RADIUS = 20.0


def cubic(p0, p1, p2, p3, steps=64):
    points = []
    for index in range(steps + 1):
        t = index / steps
        u = 1 - t
        x = u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]
        points.append((x, y))
    return points


def leaf_polygon(scale, offset):
    points = []
    for p0, p1, p2, p3 in LEAF_SEGMENTS:
        points.extend(cubic(p0, p1, p2, p3))
    return [(offset + x * scale, offset + y * scale) for x, y in points]


def in_rounded_rect(x, y, size, radius):
    if radius <= 0:
        return 0 <= x < size and 0 <= y < size
    cx = min(max(x, radius), size - radius)
    cy = min(max(y, radius), size - radius)
    dx, dy = x - cx, y - cy
    return dx * dx + dy * dy <= radius * radius or (radius <= x < size - radius) or (radius <= y < size - radius)


def coverage(points, x, y, samples=3):
    """4x 超采样点内测试，得到抗锯齿覆盖率。"""
    hits = 0
    total = samples * samples
    inside = False
    count = len(points)
    for sx in range(samples):
        for sy in range(samples):
            px = x + (sx + 0.5) / samples
            py = y + (sy + 0.5) / samples
            inside = False
            j = count - 1
            for i in range(count):
                xi, yi = points[i]
                xj, yj = points[j]
                if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi:
                    inside = not inside
                j = i
            if inside:
                hits += 1
    return hits / total


def render(size: int, rounded: bool = True, inset_ratio: float = 0.0) -> bytes:
    """rounded=False 输出满幅方形（iOS 自己裁圆角，透明会被合成成黑底，所以必须不透明）。"""
    inset = size * inset_ratio
    scale = (size - inset * 2) / VIEW
    radius = CORNER_RADIUS * scale if rounded else 0.0
    polygon = leaf_polygon(scale, inset)
    sun_cx = inset + SUN_CENTER[0] * scale
    sun_cy = inset + SUN_CENTER[1] * scale
    sun_r = SUN_RADIUS * scale

    rows = []
    for y in range(size):
        row = bytearray()
        row.append(0)  # filter type 0
        for x in range(size):
            px, py = x + 0.5, y + 0.5
            if rounded and not in_rounded_rect(px, py, size, radius):
                row.extend((0, 0, 0, 0))
                continue
            colour = BACKGROUND
            leaf_alpha = coverage(polygon, x, y)
            if leaf_alpha > 0:
                colour = tuple(round(colour[i] * (1 - leaf_alpha) + LEAF[i] * leaf_alpha) for i in range(3))
            dx, dy = px - sun_cx, py - sun_cy
            if dx * dx + dy * dy <= sun_r * sun_r:
                colour = SUN
            row.extend((colour[0], colour[1], colour[2], 255))
        rows.append(bytes(row))

    raw = b"".join(rows)
    return png(size, raw)


def png(size: int, raw: bytes) -> bytes:
    def chunk(tag: bytes, payload: bytes) -> bytes:
        return struct.pack(">I", len(payload)) + tag + payload + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return b"".join(
        (
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", header),
            chunk(b"IDAT", zlib.compress(raw, 9)),
            chunk(b"IEND", b""),
        )
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    targets = (
        ("icon-192.png", 192, True, 0.0),
        ("icon-512.png", 512, True, 0.0),
        # 遮罩式：内容缩到中间 80%，四周留给系统裁切形状。
        ("icon-maskable-512.png", 512, False, 0.10),
        # iOS 主屏图标：不透明满幅方形，由系统裁圆角。
        ("apple-touch-icon.png", 180, False, 0.06),
    )
    for name, size, rounded, inset in targets:
        path = OUT / name
        path.write_bytes(render(size, rounded=rounded, inset_ratio=inset))
        print(f"wrote {path.relative_to(ROOT)} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
