"""Pixel diff of two screenshot folders: python3 -I diff.py <a> <b> <diffdir>"""
import sys
from pathlib import Path

from PIL import Image, ImageChops

a_dir, b_dir, out_dir = (Path(p) for p in sys.argv[1:4])
out_dir.mkdir(parents=True, exist_ok=True)
for a_path in sorted(a_dir.glob('*.png')):
    b_path = b_dir / a_path.name
    if not b_path.exists():
        print(f'{a_path.name}: missing in {b_dir.name}')
        continue
    a = Image.open(a_path).convert('RGB')
    b = Image.open(b_path).convert('RGB')
    if a.size != b.size:
        print(f'{a_path.name}: size differs {a.size} vs {b.size}')
        continue
    diff = ImageChops.difference(a, b)
    bbox = diff.getbbox()
    if bbox is None:
        print(f'{a_path.name}: identical')
        continue
    changed = sum(1 for px in diff.getdata() if px != (0, 0, 0))
    print(f'{a_path.name}: {changed} px differ, bbox {bbox}')
    mask = diff.point(lambda v: 255 if v else 0).convert('L')
    overlay = Image.composite(Image.new('RGB', a.size, (255, 0, 0)), b, mask)
    overlay.save(out_dir / a_path.name)
