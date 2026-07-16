from PIL import Image, ImageDraw
import math

def make_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = size / 2, size / 2
    r = size * 0.46

    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(20, 40, 58, 255))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(90, 200, 190, 255), width=max(1, size // 40))

    inner = r * 0.16
    outer = r * 0.80
    points = []
    for i in range(8):
        ang = math.pi / 4 * i - math.pi / 2
        rad = outer if i % 2 == 0 else inner
        points.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    d.polygon(points, fill=(230, 200, 110, 255))

    dot_r = r * 0.06
    d.ellipse([cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r], fill=(20, 40, 58, 255))

    return img

sizes = [32, 128, 256, 512, 1024]
imgs = {s: make_icon(s) for s in sizes}

imgs[32].save("32x32.png")
imgs[128].save("128x128.png")
imgs[256].save("128x128@2x.png")
imgs[1024].save("icon.png")
imgs[256].save("icon.ico", sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])

print("Icon Wayfare berhasil dibuat.")
