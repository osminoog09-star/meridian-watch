"""Строит icon.ico из тех же фигур, что android/res/drawable/icon.xml."""
from pathlib import Path
from PIL import Image, ImageDraw

S = 1024
k = S / 108
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * .18), fill='#111C23')
scale = lambda pts: [(x * k, y * k) for x, y in pts]
d.polygon(scale([(54, 15), (86, 28), (86, 56), (80, 72), (68, 85), (54, 95), (40, 85), (28, 72), (22, 56), (22, 28)]), fill='#59D5CF')
d.polygon(scale([(34, 39), (43, 39), (54, 57), (65, 39), (74, 39), (74, 73), (65, 73), (65, 54), (54, 70), (43, 54), (43, 73), (34, 73)]), fill='#111C23')
img = img.resize((256, 256), Image.LANCZOS)
img.save(Path(__file__).with_name('icon.ico'), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print('icon.ico готов')
