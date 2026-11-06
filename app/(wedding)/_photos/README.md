# Photos for the wedding site

The web-sized copies of the engagement and relationship photos, plus the monogram, all registered in `index.ts`.
Nothing in this folder is an original: the originals stay in the "Wedding Website Pics" folder outside the repo.

## Why here and not in `public/`

Importing an image file (`import hero from "./hero-a.jpg"`) instead of referencing `/hero.jpg` from `public/` gives you, for free:

- intrinsic width/height, so the layout never jumps while photos load (no CLS)
- an automatic blur-up placeholder (`placeholder="blur"`)
- a content-hashed URL that browsers and Vercel cache forever
- on-demand resizing to the exact size the device needs, in AVIF/WebP, via `next/image`

`public/` is still fine for things that are never resized (a PDF, the OG image).

## How the files are made

`scripts/export-wedding-photos.py` (repo root) reads the originals and writes the files here:

- **2400px** on the long edge for full-bleed photos (hero, chapter openers, bands), **1600px** for story, food and gallery photos, JPEG quality 82, progressive. A phone screen is ~1200px wide and `next/image` only ever scales *down*, so camera originals (12-38 MB) would be wasted bytes.
- **All metadata removed.** Phone photos carry GPS coordinates and the camera files carry serial numbers; nothing of that survives. The colour profile is kept so skin tones don't shift. The script checks every output file and prints `OK` or what is wrong.
- Named by purpose and order, not by camera filename: `hero-a.jpg`, `events.jpg`, `gallery-01.jpg` ...
- The HEIC phone photos are converted; orientation is baked in.

To run it you need Python 3 with `pillow` and `pillow-heif` (a throwaway venv is fine):

```
python -m venv .photos-venv
.photos-venv/Scripts/pip install pillow pillow-heif
.photos-venv/Scripts/python -I scripts/export-wedding-photos.py --src "C:/path/to/Wedding Website Pics" --out "app/(wedding)/_photos"
```

To add or swap a photo: add or change one line in `PLAN` in the script, re-run it (`--only name` exports just that one), then point the entry in `index.ts` at the new file.

## `index.ts`, the manifest

Every photo is imported once there and exported by purpose: `heroPhoto`, `enterPhoto`, `chapterPhotos`, `storyPhotos`, `foodPhotos`, `closingPhoto`, `galleryPhotos`, `monogram`. Each entry carries:

- `alt`: a short plain description for screen readers and phones with images off
- `caption` (gallery only): the month the photo was taken
- `position` / `positionDesktop`: the CSS `object-position`, i.e. which part of the photo to keep when it is cropped to the screen
- `desktop`: an optional landscape file for wide screens (phones get the portrait one)

## Using them

Full-bleed photos go through `hridee/_components/Photo.tsx`, which handles the phone/desktop pair, the focal point and eager loading for the hero. Everything else is a plain `<Image>`:

```tsx
import Image from "next/image";
import { storyPhotos } from "../../_photos";

<Image
  src={storyPhotos[0].src}
  alt={storyPhotos[0].alt}
  placeholder="blur"
  sizes="(min-width: 768px) 50vw, 100vw"  // how wide it is on screen, so the browser picks the right size
  className="h-auto w-full rounded-3xl"
/>
```

- `sizes` matters: without it the browser assumes 100vw and downloads a huge file for a half-width photo.
- Only the hero and the entrance photo load eagerly (`loading="eager"` + `fetchPriority="high"`; Next 16 deprecated `priority`). Everything else lazy-loads.

## Limits to know about

- Vercel's image optimization has a monthly cap on how many *source* images it will transform, which depends on your plan. Three dozen photos is nothing; a 500-photo gallery is not.
- Git gets slow with hundreds of MB of binaries. This folder is ~14 MB. If it grows past ~100 MB, move the big gallery to Supabase Storage (same project as the RSVP data) and add its host to `images.remotePatterns` in `next.config.ts`, or use Git LFS.
