"""
Marketplace watermark: logo + site URL in bottom-right corner.
Usage:
  python scripts/watermark_marketplace.py "C:\\dima tovarka"
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

# Defaults
SITE_TEXT = "pro-optics.com.ua"
TAGLINE = "більше товарів на сайті"
LOGO_CANDIDATES = [
    Path(r"C:\Users\User\optics-shop-skeleton\public\logos\pro-optics.webp"),
    Path(r"C:\Users\User\optics-shop-skeleton\public\logos\pro-optics-mark.svg"),
]
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG", ".WEBP"}


def find_logo() -> Path | None:
    for p in LOGO_CANDIDATES:
        if p.exists() and p.suffix.lower() != ".svg":
            return p
    return None


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibri.ttf",
        r"C:\Windows\Fonts\verdana.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_badge(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    box_w: int,
    box_h: int,
    pad: int,
    gap: int,
    border: int,
    radius: int,
    site_h: int,
    font_site: ImageFont.ImageFont,
    font_tag: ImageFont.ImageFont,
) -> None:
    """Transparent plate + full red border + two text lines."""
    plate = (0, 0, 0, 140)
    red = (225, 29, 42, 230)
    shadow = (0, 0, 0, 160)
    white = (255, 255, 255, 250)
    muted = (220, 224, 230, 235)

    # Outer red border around the whole square
    draw.rounded_rectangle(
        [
            x0 - border,
            y0 - border,
            x0 + box_w + border,
            y0 + box_h + border,
        ],
        radius=radius + border // 2,
        outline=red,
        width=border,
    )
    draw.rounded_rectangle(
        [x0, y0, x0 + box_w, y0 + box_h],
        radius=radius,
        fill=plate,
    )

    cx = x0 + pad
    ty = y0 + pad
    draw.text((cx + 1, ty + 1), SITE_TEXT, font=font_site, fill=shadow)
    draw.text((cx, ty), SITE_TEXT, font=font_site, fill=white)
    draw.text(
        (cx + 1, ty + site_h + gap // 2 + 1),
        TAGLINE,
        font=font_tag,
        fill=shadow,
    )
    draw.text(
        (cx, ty + site_h + gap // 2),
        TAGLINE,
        font=font_tag,
        fill=muted,
    )


def watermark_one(
    src: Path,
    dst: Path,
    logo_path: Path | None = None,  # unused — text-only badge
) -> None:
    im = Image.open(src)
    im = ImageOps.exif_transpose(im)
    im = im.convert("RGBA")
    W, H = im.size
    short = min(W, H)

    pad = max(12, int(short * 0.028))
    gap = max(5, int(short * 0.014))
    border = max(2, int(short * 0.006))

    font_site = load_font(max(15, int(short * 0.040)))
    font_tag = load_font(max(12, int(short * 0.030)))

    dummy = ImageDraw.Draw(im)
    site_bbox = dummy.textbbox((0, 0), SITE_TEXT, font=font_site)
    tag_bbox = dummy.textbbox((0, 0), TAGLINE, font=font_tag)
    site_w = site_bbox[2] - site_bbox[0]
    site_h = site_bbox[3] - site_bbox[1]
    tag_w = tag_bbox[2] - tag_bbox[0]
    tag_h = tag_bbox[3] - tag_bbox[1]

    text_block_w = max(site_w, tag_w)
    text_block_h = site_h + gap // 2 + tag_h
    box_w = text_block_w + pad * 2
    box_h = text_block_h + pad * 2

    margin = pad + border
    radius = max(8, int(short * 0.018))

    # Inset from edges toward center a bit (still corner-ish, not dead center).
    # ~8–10% of the short side from each edge beyond the badge size.
    inset = max(margin, int(short * 0.09))
    # Two corners: bottom-right + opposite top-left
    positions = [
        (W - box_w - inset, H - box_h - inset),  # bottom-right
        (inset, inset),  # top-left
    ]

    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    for x0, y0 in positions:
        x0 = max(margin // 2, min(x0, W - box_w - margin // 2))
        y0 = max(margin // 2, min(y0, H - box_h - margin // 2))
        draw_badge(
            draw,
            x0,
            y0,
            box_w,
            box_h,
            pad,
            gap,
            border,
            radius,
            site_h,
            font_site,
            font_tag,
        )

    out = Image.alpha_composite(im, overlay).convert("RGB")
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, "JPEG", quality=92, optimize=True)


def main() -> int:
    src_dir = Path(sys.argv[1] if len(sys.argv) > 1 else r"C:\dima tovarka")
    if not src_dir.is_dir():
        print(f"Folder not found: {src_dir}")
        return 1

    out_dir = src_dir / "watermarked_marketplace"
    print(f"Source: {src_dir}")
    print(f"Output: {out_dir}")
    print("Style: transparent plate + red border + site text (no logo)")

    files = sorted(
        p
        for p in src_dir.iterdir()
        if p.is_file() and p.suffix in EXTS and "watermarked" not in p.name
    )
    if not files:
        print("No images found.")
        return 1

    ok = 0
    for p in files:
        dest = out_dir / f"{p.stem}_pro-optics.jpg"
        try:
            watermark_one(p, dest)
            print(f"  OK  {p.name} -> {dest.name}")
            ok += 1
        except Exception as e:
            print(f"  FAIL {p.name}: {e}")

    print(f"\nDone: {ok}/{len(files)}")
    print(f"Open folder: {out_dir}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
