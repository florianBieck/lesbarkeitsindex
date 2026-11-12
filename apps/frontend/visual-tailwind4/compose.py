# THROWAWAY: glues main | prototype variant D | PR 3 side by side into side-by-side/<name>.png
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

GAP, HEAD, BG = 24, 44, (229, 231, 235)
shots, proto, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 22)


def variant_d(name):
    """Crops panel D (4th of 4) out of the prototype's sheet and trims its grey padding."""
    path = proto / f"{name}.png"
    if not path.exists():
        return None
    sheet = Image.open(path).convert("RGB")
    w = (sheet.width - 3 * GAP) // 4
    panel = sheet.crop((3 * (w + GAP), HEAD, 3 * (w + GAP) + w, sheet.height))
    bottom = panel.height
    while bottom > 1 and all(panel.getpixel((x, bottom - 1)) == BG for x in range(0, w, 7)):
        bottom -= 1
    return panel.crop((0, 0, w, bottom))


names = sorted(p.stem.rsplit("-", 1)[0] for p in shots.glob("*-pr3.png"))
for name in names:
    panels = [("main · Tailwind 3.4", Image.open(shots / f"{name}-main.png").convert("RGB"))]
    d = variant_d(name)
    if d is not None:
        panels.append(("Ziel · Prototyp Variante D", d))
    panels.append(("PR 3 · Tailwind 4", Image.open(shots / f"{name}-pr3.png").convert("RGB")))
    width = sum(i.width for _, i in panels) + GAP * (len(panels) - 1)
    height = HEAD + max(i.height for _, i in panels)
    sheet = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(sheet)
    x = 0
    for label, img in panels:
        draw.text((x + 8, 10), label, fill=(17, 24, 39), font=font)
        sheet.paste(img, (x, HEAD))
        x += img.width + GAP
    sheet.save(out / f"{name}.png", optimize=True)
    print(name, sheet.size, "with D" if d is not None else "no D")
