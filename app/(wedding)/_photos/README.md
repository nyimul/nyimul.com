# Engagement photos for the wedding site

Put the photos the *design* uses here (hero, scroll backdrops, story, gallery) and register them in `index.ts`.

## Why here and not in `public/`

Importing an image file (`import hero from "./hero.jpg"`) instead of referencing `/hero.jpg` from `public/` gives you, for free:

- intrinsic width/height, so the layout never jumps while photos load (no CLS)
- an automatic blur-up placeholder (`placeholder="blur"`)
- a content-hashed URL that browsers and Vercel cache forever
- on-demand resizing to the exact size the device needs, in AVIF/WebP, via `next/image`

`public/` is still fine for things that are never resized (favicons, a PDF, the OG image).

## Prepare photos before committing them

High-res for the web is **not** the camera original. A phone screen is ~1200px wide and a 4K desktop is 3840px; `next/image` scales *down*, never up, so the file you commit only needs to be as large as the biggest place it is shown.

1. Export at **2400px on the long edge** for full-bleed photos (hero, backdrops), **1600px** for gallery/story photos, JPEG quality ~80. Expect 300-800 KB each.
2. **Strip metadata.** Engagement photos carry GPS coordinates and camera serials in EXIF. Export "without location info / metadata" in Lightroom/Photos, or run `exiftool -all= -tagsfromfile @ -icc_profile *.jpg` (the second part keeps colour profiles so skin tones don't shift).
3. Keep the untouched originals in your cloud drive, not in git. Only committed files are deployed.
4. Name by purpose and order, not by camera filename: `hero.jpg`, `backdrop-01.jpg` … `story-proposal.jpg`, `gallery-01.jpg`.
5. Mobile is portrait, desktop is landscape. For the hero and backdrops, have the photographer's files in both crops or use `object-position` to choose the focal point per breakpoint.

## Using them

```tsx
import Image from "next/image";
import { heroPhoto } from "../_photos"; // from index.ts

<Image
  src={heroPhoto}
  alt="Hridee and Nyimul at ..."   // real alt text; screen readers and old phones with images off
  fill                              // or width/height
  priority                          // ONLY on the hero (the first thing on screen); everything else lazy-loads
  placeholder="blur"
  sizes="100vw"                     // tells the browser how wide the image will be so it downloads the right size
  className="object-cover"
/>
```

- `sizes` matters: without it the browser assumes 100vw and downloads a huge file for a 400px gallery tile. Use e.g. `sizes="(max-width: 768px) 100vw, 33vw"` for a 3-column grid.
- One `priority` image per page. Too many defeats lazy loading.

## Limits to know about

- Vercel's image optimization has a monthly cap on how many *source* images it will transform, which depends on your plan. Check it in the Vercel dashboard once you know roughly how many photos the site uses. A few dozen photos is nothing; a 500-photo gallery is not.
- Git gets slow with hundreds of MB of binaries. If the folder grows past ~100 MB, move the big gallery to Supabase Storage (same project as the RSVP data) and add its host to `images.remotePatterns` in `next.config.ts`, or use Git LFS.
