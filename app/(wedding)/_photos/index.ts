/**
 * Photo manifest. Every photo the site uses is imported ONCE here and exported by purpose, so
 * components never reach into this folder themselves and swapping a photo is a one-line change.
 *
 * The files are made by scripts/export-wedding-photos.py from the originals (web size, no EXIF).
 * See README.md in this folder. To change a photo: edit PLAN in the script, re-run it, then
 * point the entry below at the new file.
 *
 * Alt text is for screen readers and for phones with images off; keep it short and plain.
 * Captions are the month the photo was taken (from the original file's date).
 */
import type { StaticImageData } from "next/image";

import heroA from "./hero-a.jpg";
import heroWide from "./hero-wide.jpg";
import enter from "./enter.jpg";
import enterPortrait from "./enter-portrait.jpg";
import events from "./events.jpg";
import rsvp from "./rsvp.jpg";
import story from "./story.jpg";
import story01 from "./story-01.jpg";
import story02 from "./story-02.jpg";
import story03 from "./story-03.jpg";
import travel from "./travel.jpg";
import travelWide from "./travel-wide.jpg";
import faq from "./faq.jpg";
import things from "./things.jpg";
import thingsWide from "./things-wide.jpg";
import food01 from "./food-01.jpg";
import food02 from "./food-02.jpg";
import cafe from "./cafe.jpg";
import closing from "./closing.jpg";
import gallery01 from "./gallery-01.jpg";
import gallery02 from "./gallery-02.jpg";
import gallery03 from "./gallery-03.jpg";
import gallery04 from "./gallery-04.jpg";
import gallery05 from "./gallery-05.jpg";
import gallery06 from "./gallery-06.jpg";
import gallery07 from "./gallery-07.jpg";
import gallery08 from "./gallery-08.jpg";
import gallery09 from "./gallery-09.jpg";
import gallery10 from "./gallery-10.jpg";
import gallery11 from "./gallery-11.jpg";
import gallery12 from "./gallery-12.jpg";
import gallery13 from "./gallery-13.jpg";
import gallery14 from "./gallery-14.jpg";
import monogramPng from "./monogram.png";
import monogramWhitePng from "./monogram-white.png";

export type Photo = { src: StaticImageData; alt: string };

/**
 * A full-bleed photo. `src` is the phone (portrait) file; `desktop` is an optional landscape
 * file for wide screens. `position` is the CSS object-position (which part of the photo to keep
 * when it is cropped to the screen), per breakpoint.
 */
export type ArtDirectedPhoto = Photo & {
  desktop?: StaticImageData;
  position?: string;
  positionDesktop?: string;
};

/** The monogram, trimmed. Ink on light backgrounds; the white one is for dark photos if ever needed. */
export const monogram = monogramPng;
export const monogramWhite = monogramWhitePng;

export const heroPhoto: ArtDirectedPhoto = {
  src: heroA,
  desktop: heroWide,
  alt: "Hridee and Nyimul smiling in front of the Atlanta skyline at Piedmont Park",
  position: "50% 16%",
  positionDesktop: "50% 40%",
};

export const enterPhoto: ArtDirectedPhoto = {
  src: enterPortrait,
  desktop: enter,
  alt: "Hridee and Nyimul sitting on a stone wall with the Atlanta skyline behind them",
  position: "50% 35%",
  positionDesktop: "35% 50%",
};

/** One photo opens each chapter of the home page and carries its title. */
export const chapterPhotos = {
  // Portrait files that also serve wide screens: positionDesktop keeps the two of you in the
  // short, wide band a desktop chapter becomes (faces are around the middle of these photos).
  events: {
    src: events,
    alt: "Hridee and Nyimul laughing in front of an ivy-covered stone wall",
    position: "50% 30%",
    positionDesktop: "50% 50%",
  },
  rsvp: {
    src: rsvp,
    alt: "Hridee and Nyimul sitting on a picnic blanket, looking at the Atlanta skyline",
    position: "50% 100%",
    positionDesktop: "50% 68%",
  },
  story: {
    src: story,
    alt: "Hridee and Nyimul reading on a picnic blanket under the trees",
    position: "50% 45%",
    positionDesktop: "50% 74%",
  },
  travel: {
    src: travel,
    desktop: travelWide,
    alt: "Hridee and Nyimul on a park bench with the Atlanta skyline behind them",
    position: "50% 35%",
    positionDesktop: "50% 60%",
  },
  faq: {
    src: faq,
    alt: "Hridee tapping Nyimul on the nose",
    position: "45% 50%",
  },
  things: {
    src: things,
    desktop: thingsWide,
    alt: "Hridee and Nyimul holding hands under a tree at Piedmont Park",
    position: "50% 50%",
    positionDesktop: "50% 50%",
  },
} satisfies Record<string, ArtDirectedPhoto>;

/** Paired with the paragraphs of Our Story, in order (repeats if there are more paragraphs). */
export const storyPhotos: Photo[] = [
  { src: story01, alt: "Hridee and Nyimul by a stone wall" },
  { src: story02, alt: "Hridee and Nyimul holding hands and smiling at each other" },
  { src: story03, alt: "Hridee and Nyimul laughing under a blue sky" },
];

/** Under the Food list in While You're in Atlanta (taken at Botiwalla). */
export const foodPhotos: Photo[] = [
  { src: food01, alt: "Hridee and Nyimul feeding each other at a snack shop" },
  { src: food02, alt: "Hridee and Nyimul toasting with drinks at a snack shop" },
];

/** Under the Cafes list in While You're in Atlanta. The original is small (560px wide), so it is not upscaled. */
export const cafePhotos: Photo[] = [{ src: cafe, alt: "Hridee in front of the mural at Raani Coffee Roasters" }];

/** The last photo on the page, right above the footer. */
export const closingPhoto: ArtDirectedPhoto = {
  src: closing,
  alt: "Hridee and Nyimul waving",
  position: "50% 40%",
};

/** Everything else, in the order it happened. */
export const galleryPhotos: (Photo & { caption: string })[] = [
  { src: gallery01, alt: "Hridee and Nyimul holding sparklers", caption: "October 2024" },
  { src: gallery02, alt: "Hridee and Nyimul sitting on fallen ginkgo leaves", caption: "December 2024" },
  { src: gallery03, alt: "Hridee and Nyimul at the symphony", caption: "March 2025" },
  { src: gallery04, alt: "Hridee and Nyimul in a greenhouse full of flowers", caption: "April 2025" },
  { src: gallery05, alt: "Hridee and Nyimul in a park", caption: "April 2025" },
  { src: gallery06, alt: "Hridee and Nyimul in front of an aquarium tank", caption: "May 2025" },
  { src: gallery07, alt: "Hridee and Nyimul at a mountain overlook", caption: "November 2025" },
  { src: gallery08, alt: "Hridee and Nyimul walking through autumn woods", caption: "November 2025" },
  { src: gallery09, alt: "Hridee and Nyimul by a lake in winter", caption: "January 2026" },
  { src: gallery10, alt: "Hridee and Nyimul with a birthday dessert", caption: "March 2026" },
  { src: gallery11, alt: "Hridee and Nyimul in the gazebo at Piedmont Park", caption: "April 2026" },
  { src: gallery12, alt: "Hridee and Nyimul walking across the meadow at Piedmont Park", caption: "April 2026" },
  { src: gallery13, alt: "Hridee in the gazebo at Piedmont Park", caption: "April 2026" },
  { src: gallery14, alt: "Hridee and Nyimul under a red umbrella", caption: "April 2026" },
];
