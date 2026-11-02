/**
 * Photo manifest. Import each engagement photo ONCE here and export it by purpose, so
 * components never reach into this folder themselves and reordering the scroll sequence
 * is a one-line change. See README.md in this folder for how to prepare the files.
 *
 * Example once photos exist:
 *
 *   import hero from "./hero.jpg";
 *   import backdrop01 from "./backdrop-01.jpg";
 *   import backdrop02 from "./backdrop-02.jpg";
 *
 *   export const heroPhoto = hero;
 *   // In scroll order. PhotoBackdrop crossfades through these as sections pass.
 *   export const backdropPhotos = [backdrop01, backdrop02];
 *   export const galleryPhotos: { src: StaticImageData; alt: string }[] = [
 *     { src: backdrop01, alt: "..." },
 *   ];
 */
import type { StaticImageData } from "next/image";

export const backdropPhotos: StaticImageData[] = [];
export const galleryPhotos: { src: StaticImageData; alt: string }[] = [];
