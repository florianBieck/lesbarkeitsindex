# PROTOTYPE (#56), throwaway: glues shots/<name>-{A,B,C,D}.png side by side into side-by-side/<name>.png
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

LABELS = {"A": "A · heute (Klassen tot)", "B": "B · alles live", "C": "C · live + AA-Korrektur", "D": "D · Vorschlag"}
GAP, HEAD = 24, 44

root = Path(sys.argv[1])
shots, out = root / "shots", root / "side-by-side"
out.mkdir(exist_ok=True)
font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 22)

names = sorted({p.stem.rsplit("-", 1)[0] for p in shots.glob("*-A.png")})
for name in names:
    imgs = [(k, Image.open(shots / f"{name}-{k}.png").convert("RGB")) for k in LABELS]
    width = sum(i.width for _, i in imgs) + GAP * (len(imgs) - 1)
    height = HEAD + max(i.height for _, i in imgs)
    sheet = Image.new("RGB", (width, height), (229, 231, 235))
    draw = ImageDraw.Draw(sheet)
    x = 0
    for key, img in imgs:
        draw.text((x + 8, 10), LABELS[key], fill=(17, 24, 39), font=font)
        sheet.paste(img, (x, HEAD))
        x += img.width + GAP
    sheet.save(out / f"{name}.png", optimize=True)
    print(out / f"{name}.png", sheet.size)
