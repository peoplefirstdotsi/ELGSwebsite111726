#!/usr/bin/env python3
"""Render slow camera moves across the ELGS photographs, one clip per leg.

Usage: render.py <src_img_dir> <out_dir> [--test] [--only name] [--fmt d|m]

Each leg is a real photograph. The camera move is a sub-pixel crop that travels
and pushes in; the grade is shared so eight photographs read as one shoot.
Frames are piped straight to ffmpeg with the scrub settings from encode.sh
(dense GOP, no audio, faststart).
"""
import sys, os, subprocess, math
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

Image.MAX_IMAGE_PIXELS = None
FPS = 24
FMT = {"d": (1600, 900, 4, 22), "m": (720, 1280, 4, 24)}   # w, h, gop, crf

# cx, cy = centre of the crop (0..1 of source). s = crop size as a fraction of
# the largest crop of this aspect that fits the source. (start) -> (end)
LEGS = [
  dict(name="01-glass",   src="2dbd32_a58e7bafbf9e42e1b787c56f6afcf9ab.jpg", sec=6,
       d=((.50,.50,1.00),(.50,.47,.90)), m=((.37,.50,1.00),(.385,.47,.90)),
       gain=.80, sat=.96, depth=True),
  dict(name="02-lectern", src="957c2ad54f6f4d9fbd623287e1173f07.jpg", sec=6,
       d=((.52,.50,1.00),(.47,.48,.86)), m=((.50,.50,1.00),(.44,.48,.88)),
       gain=.74, sat=.92),
  dict(name="03-word",    src="5dbbc088a7ee4037b8fabe1559ec22d8.jpg", sec=6,
       d=((.50,.50,1.00),(.55,.52,.86)), m=((.62,.50,1.00),(.57,.52,.88)),
       gain=.72, sat=.92),
  dict(name="04-pews",    src="9bd63cbd213e4580b3bc2638aac730f6.jpg", sec=6,
       d=((.52,.52,1.00),(.44,.47,.84)), m=((.64,.52,1.00),(.56,.48,.86)),
       gain=.92, sat=.95),
  dict(name="05-commencement", src="2dbd32_a959f778b7ae4276b9de6d4376872e39.jpg", sec=9,
       d=((.50,.50,1.00),(.50,.43,.80)), m=((.50,.52,1.00),(.50,.44,.84)),
       gain=.72, sat=.86),
  dict(name="06-church",  src="2dbd32_9639a6d0c20447c48ab9ad3ee3d35ed2.jpg", sec=6,
       d=((.42,.50,.84),(.40,.47,.78)), m=((.66,.50,1.00),(.61,.47,.90)),
       gain=.70, sat=.82),
  dict(name="07-record",  src="2dbd32_4c11a7162ffc493a8a63ca9fef906de4.jpg", sec=6,
       d=((.41,.50,.82),(.41,.54,.72)), m=((.50,.50,1.00),(.50,.54,.88)),
       gain=1.00, sat=.90),
  dict(name="08-door",    src="2dbd32_6bdf698605ae461d8ab0ca3147a45fa1.png", sec=6,
       d=((.50,.66,1.00),(.50,.40,.96)), m=((.60,.52,1.00),(.60,.46,.92)),
       gain=.82, sat=.90, crf_d=27),
]

# Outer edge of the gable window frame in the 2664x1048 source, as two polygons.
# Everything outside them is timber: the near plane of the hero.
K = 2664 / 1998.0
GLASS = [
  [(118,800),(118,575),(230,452),(600,272),(1040,32),(1040,800)],
  [(1112,800),(1112,55),(1470,300),(1800,530),(1812,800)],
]

def lerp(a, b, t): return a + (b - a) * t

def box_for(img, W, H, cx, cy, s):
    iw, ih = img.size
    ar = W / H
    mw, mh = (iw, iw / ar) if iw / ih < ar else (ih * ar, ih)
    cw, ch = mw * s, mh * s
    x0 = min(max(cx * iw - cw / 2, 0), iw - cw)
    y0 = min(max(cy * ih - ch / 2, 0), ih - ch)
    return (x0, y0, x0 + cw, y0 + ch)

def vignette(W, H):
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2)) / math.sqrt(2)
    return (1 - 0.20 * np.clip((r - 0.35) / 0.65, 0, 1) ** 1.6)[..., None]

INK = np.array([14, 22, 34], np.float32)        # the page canvas, for shadow tint

def grade(a, gain, sat, vig):
    a = a.astype(np.float32)
    lum = (a * np.array([.2126, .7152, .0722], np.float32)).sum(-1, keepdims=True)
    a = lum + (a - lum) * sat
    a = a * gain
    # soft shoulder so bright walls and sky roll off instead of clipping
    a = 255 * (1 - np.exp(-a / 190.0)) / (1 - math.exp(-255 / 190.0))
    a = a * vig + INK * (1 - vig) * 0.55
    return np.clip(a, 0, 255).astype(np.uint8)

def hero_planes(img):
    """Split the gable into a far plane (glass, extended under the timber) and
    a near plane (timber with real alpha)."""
    iw, ih = img.size
    mask = Image.new("L", (iw, ih), 0)
    d = ImageDraw.Draw(mask)
    for poly in GLASS:
        d.polygon([(x * K, y * K) for x, y in poly], fill=255)
    soft = mask.filter(ImageFilter.GaussianBlur(2.2))
    # push-pull fill: extend glass colour outward under the timber
    g = np.asarray(img.convert("RGB"), np.float32)
    m = np.asarray(mask, np.float32)[..., None] / 255
    far = g * m
    acc, wacc = far.copy(), m.copy()
    for rad in (12, 30, 70):
        b = np.asarray(Image.fromarray(np.clip(far, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad)), np.float32)
        bm = np.asarray(Image.fromarray((m[..., 0] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad)), np.float32)[..., None] / 255
        fill = b / np.maximum(bm, 1e-3)
        take = (wacc < 0.5) & (bm > 0.02)
        acc = np.where(take, fill, acc)
        wacc = np.where(take, 1.0, wacc)
    acc = np.where(wacc < 0.5, g * 0.25, acc)
    far_img = Image.fromarray(np.clip(acc * m + acc * 0.38 * (1 - m), 0, 255).astype(np.uint8))
    near = img.convert("RGBA")
    near.putalpha(Image.eval(soft, lambda v: 255 - v))
    return far_img, near

def frames(leg, fmt, n=None):
    W, H, _, _ = FMT[fmt]
    img = Image.open(os.path.join(SRC, leg["src"])).convert("RGB")
    (a, b) = leg[fmt]
    # work at no more than ~1.5x the pixels the tightest crop needs
    bx = box_for(img, W, H, *b)
    k = (bx[3] - bx[1]) / H
    if k > 1.5:
        f = 1.5 / k
        img = img.resize((round(img.width * f), round(img.height * f)), Image.LANCZOS)
    planes = hero_planes(img) if leg.get("depth") else None
    if planes and img.width != 2664:
        raise SystemExit("hero mask assumes the 2664px source")
    vig = vignette(W, H)
    N = n or leg["sec"] * FPS
    for i in range(N):
        t = i / (N - 1)
        cx, cy, s = (lerp(a[j], b[j], t) for j in range(3))
        if planes:
            far, near = planes
            fr = far.resize((W, H), Image.BICUBIC, box=box_for(img, W, H, cx, cy, s))
            # near plane: the timber pushes in faster than the glass behind it
            s2 = s * lerp(1.0, 0.93, t)
            nr = near.resize((W, H), Image.BICUBIC, box=box_for(img, W, H, cx, lerp(cy, cy + .012, t), s2))
            fr = fr.convert("RGBA"); fr.alpha_composite(nr); fr = fr.convert("RGB")
        else:
            fr = img.resize((W, H), Image.BICUBIC, box=box_for(img, W, H, cx, cy, s))
        yield grade(np.asarray(fr), leg["gain"], leg["sat"], vig)

def encode(leg, fmt, out):
    W, H, gop, crf = FMT[fmt]
    crf = leg.get("crf_" + fmt, crf)     # foliage costs far more than bokeh
    p = subprocess.Popen(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-an", "-vf", "format=yuv420p", "-c:v", "libx264", "-profile:v", "high", "-preset", "slow",
        "-crf", str(crf), "-g", str(gop), "-keyint_min", str(gop), "-sc_threshold", "0",
        "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    for fr in frames(leg, fmt):
        p.stdin.write(fr.tobytes())
    p.stdin.close(); p.wait()
    print(out, f"{os.path.getsize(out)/1e6:.1f}MB", flush=True)

if __name__ == "__main__":
    SRC, OUT = sys.argv[1], sys.argv[2]
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    fmts = [sys.argv[sys.argv.index("--fmt") + 1]] if "--fmt" in sys.argv else ["d", "m"]
    os.makedirs(OUT, exist_ok=True)
    for leg in LEGS:
        if only and only not in leg["name"]: continue
        for fmt in fmts:
            if "--test" in sys.argv:
                fs = list(frames(leg, fmt, n=2))
                for tag, fr in zip(("a", "b"), fs):
                    Image.fromarray(fr).save(os.path.join(OUT, f"{leg['name']}-{fmt}-{tag}.jpg"), quality=88)
                print("test", leg["name"], fmt, flush=True)
            else:
                encode(leg, fmt, os.path.join(OUT, f"{leg['name']}{'-m' if fmt=='m' else ''}.mp4"))
