"""
Export the wedding photos for the site: web size, JPEG ~82, EXIF/XMP/GPS removed, colour profile kept.

Run from the repo root (needs Python 3 with pillow and pillow-heif; a throwaway venv is fine):

  python -m venv .photos-venv && .photos-venv/Scripts/pip install pillow pillow-heif
  .photos-venv/Scripts/python -I scripts/export-wedding-photos.py --src "C:/path/to/Wedding Website Pics" --out "app/(wedding)/_photos"

Originals are never modified and never belong in git. Output names are by purpose (see PLAN), as
app/(wedding)/_photos/README.md asks. Add a photo: one line in PLAN, re-run, then register it in _photos/index.ts.
Every output is checked: no EXIF, XMP or GPS left; colour profile kept so skin tones don't shift.
"""
import argparse, os
from PIL import Image, ImageOps
import pillow_heif

pillow_heif.register_heif_opener()

FULL, STORY = 2400, 1600  # long edge: full-bleed photos vs story/gallery photos

# output name (without .jpg) -> (source file, long edge, optional crop as (left, top, right, bottom) fractions)
PLAN = {
    # home page, in scroll order
    "hero-a": ("5S8A3617.jpg", FULL, None),
    "hero-wide": ("5S8A3656.jpg", FULL, None),            # desktop hero
    "events": ("5S8A3354.jpg", FULL, None),
    "rsvp": ("vertical piedmont park.jpg", FULL, None),
    "story": ("me& my lady.jpg", FULL, None),
    "story-01": ("5S8A3350.jpg", STORY, None),
    "story-02": ("smile.jpg", STORY, None),
    "story-03": ("5S8A3945.jpg", STORY, None),
    "travel": ("transition 2.jpg", FULL, None),
    "travel-wide": ("transition 1.jpg", FULL, None),
    "faq": ("5S8A3907.jpg", FULL, None),
    "things": ("things to do or intro.jpg", FULL, None),
    "things-wide": ("things to do in atlaNTA.jpg", FULL, None),
    "food-01": ("where to eat.jpg", STORY, None),
    # "food-02": ("for poster at reception.jpg", STORY, None),  # second Botiwalla photo, removed from the site 10 Nov 2026; uncomment to bring it back
    "cafe": ("hridee in front of raani.jpg", STORY, None),  # Hridee at Raani; the original is small (560x995) and is not upscaled
    "activities-01": ("Photos-1-001/IMG_9399.heic", STORY, None),  # Feb 2023 aquarium; the pair beside the Activities list
    "activities-02": ("Photos-1-001/IMG_9406.heic", STORY, None),  # Feb 2023 aquarium, back to back
    "closing": ("5S8A3929.jpg", FULL, None),
    # entrance
    "enter": ("Enter page pic perhaps.jpg", FULL, None),
    "enter-portrait": ("Enter page pic perhaps.jpg", STORY, (0.18, 0.0, 0.68, 1.0)),  # 3:4 crop around the couple
    # gallery, in the order it happened
    # "gallery-01": ("IMG_8684.HEIC", STORY, None),       # Oct 2024 sparklers, removed from the site 10 Nov 2026
    "gallery-02": ("IMG_9613.HEIC", STORY, None),         # Dec 2024 ginkgo
    "gallery-03": ("us at the symphony.jpg", STORY, None),  # Mar 2025
    "gallery-04": ("IMG_3200.HEIC", STORY, None),         # Apr 2025 botanical garden
    "gallery-05": ("IMG_0089.JPG", STORY, None),          # Apr 2025 park
    "gallery-06": ("IMG_4186.HEIC", STORY, None),         # May 2025 aquarium
    "gallery-07": ("IMG_4178.HEIC", STORY, None),         # Nov 2025 overlook
    # "gallery-08": ("IMG_1213.HEIC", STORY, None),       # Nov 2025 autumn walk, removed from the site 10 Nov 2026
    "gallery-09": ("IMG_6799.HEIC", STORY, None),         # Jan 2026 winter lake
    "gallery-10": ("IMG_3481.heic", STORY, None),         # Mar 2026 birthday
    # "gallery-11": ("5S8A3798.jpg", STORY, None),        # Apr 2026 gazebo bridge, removed from the site 11 Nov 2026
    # "gallery-12": ("backup.jpg", STORY, None),          # Apr 2026 meadow, removed 11 Nov 2026
    # "gallery-13": ("phone background.jpg", STORY, None),  # Apr 2026 Hridee in the gazebo, removed 11 Nov 2026
    "gallery-14": ("IMG_3077.jpeg", STORY, None),         # Apr 2026 red umbrella
    # added 11 Nov 2026 from the Photos-1-001 folder
    # gallery-15 and -16 (the Feb 2023 aquarium pair) moved beside the Activities list as activities-01/02 on 11 Nov 2026
    "gallery-17": ("Photos-1-001/DSC_8690.JPG", STORY, None),    # Sep 2024 hug by the lake
    "gallery-18": ("Photos-1-001/DSC_8829_2.jpg", STORY, None),  # Dec 2024 mirror
    "gallery-19": ("Photos-1-001/DSC_8843.jpg", STORY, None),    # Dec 2024 mirrored wall
    "gallery-20": ("Photos-1-001/IMG_1049.HEIC", STORY, None),   # Mar 2026 night out
}
MONOGRAM = "Hridee Nyimul Monogram TRANSPARENT.png"


def export_photo(src_path, out_path, long_edge, crop):
    im = Image.open(src_path)
    icc = im.info.get("icc_profile")
    if im.format == "JPEG":
        im.draft("RGB", (im.width // 2, im.height // 2)) if max(im.size) > 2 * long_edge else None
    im = ImageOps.exif_transpose(im).convert("RGB")  # bake orientation in, then drop all metadata
    if crop:
        w, h = im.size
        l, t, r, b = crop
        im = im.crop((int(l * w), int(t * h), int(r * w), int(b * h)))
    im.thumbnail((long_edge, long_edge), Image.LANCZOS)
    clean = im.copy()
    clean.info = {}  # nothing from the original rides along (EXIF, XMP, comments)
    kwargs = dict(quality=82, optimize=True, progressive=True)
    if icc:
        kwargs["icc_profile"] = icc
    clean.save(out_path, "JPEG", **kwargs)
    return clean.size


def export_monogram(src_path, out_dir):
    m = Image.open(src_path).convert("RGBA")
    m = m.crop(m.getchannel("A").getbbox())
    m.save(os.path.join(out_dir, "monogram.png"), optimize=True)
    *_, a = m.split()
    white = Image.merge("RGBA", (Image.new("L", m.size, 255),) * 3 + (a,))
    white.save(os.path.join(out_dir, "monogram-white.png"), optimize=True)
    return m.size


def verify(path):
    data = open(path, "rb").read()
    problems = []
    if b"Exif\x00\x00" in data:
        problems.append("EXIF present")
    if b"ns.adobe.com/xap" in data:
        problems.append("XMP present")
    if b"GPS" in data[:65536]:
        problems.append("GPS marker present")
    has_icc = b"ICC_PROFILE" in data
    exif = Image.open(path).getexif()
    if len(exif):
        problems.append(f"getexif has {len(exif)} tags")
    return problems, has_icc


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    only = {s.strip() for s in args.only.split(",") if s.strip()}

    total = 0
    for name, (src, long_edge, crop) in PLAN.items():
        if only and name not in only:
            continue
        out = os.path.join(args.out, f"{name}.jpg")
        size = export_photo(os.path.join(args.src, src), out, long_edge, crop)
        problems, has_icc = verify(out)
        kb = os.path.getsize(out) // 1024
        total += kb
        status = "OK " if not problems else "!! " + ", ".join(problems)
        print(f"{name:16} {size[0]}x{size[1]:5} {kb:5} KB  icc={'yes' if has_icc else 'no '}  {status}  <- {src}")
    if not only or "monogram" in only:
        print("monogram", export_monogram(os.path.join(args.src, MONOGRAM), args.out))
    print(f"total {total / 1024:.1f} MB")


if __name__ == "__main__":
    main()
