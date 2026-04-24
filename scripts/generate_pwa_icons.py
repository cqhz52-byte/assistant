from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIR = ROOT / 'public'
SOURCE_LOGO = PUBLIC_DIR / 'curaway-logo.jpg'


def make_icon(size: int) -> Image.Image:
    source = Image.open(SOURCE_LOGO).convert('RGB')
    canvas = Image.new('RGB', (size, size), '#f7f8fa')
    draw = ImageDraw.Draw(canvas)

    margin = int(size * 0.06)
    draw.rounded_rectangle(
        (margin, margin, size - margin, size - margin),
        radius=int(size * 0.18),
        fill='#ffffff',
        outline='#e5e7eb',
        width=max(2, size // 128),
    )

    inner_size = int(size * 0.72)
    logo = ImageOps.contain(source, (inner_size, inner_size))
    x = (size - logo.width) // 2
    y = (size - logo.height) // 2
    canvas.paste(logo, (x, y))

    return canvas


def main() -> None:
    outputs = {
        'icon-192.png': 192,
        'icon-512.png': 512,
        'apple-touch-icon.png': 180,
    }

    for filename, size in outputs.items():
        icon = make_icon(size)
        icon.save(PUBLIC_DIR / filename, format='PNG')
        print(f'Generated {filename} ({size}x{size})')


if __name__ == '__main__':
    main()
