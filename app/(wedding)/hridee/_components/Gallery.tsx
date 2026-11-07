/**
 * Gallery: every photo that is not used elsewhere on the page, in the order it happened, no
 * captions. Data: `galleryPhotos` in _photos/index.ts.
 * One big column on phones (easy to see, nothing to pinch), two or three columns on wider
 * screens. Lazy-loaded, correct `sizes`, no lightbox needed.
 */
import Image from "next/image";
import { galleryPhotos } from "../../_photos";
import Reveal from "./Reveal";

export default function Gallery() {
  if (galleryPhotos.length === 0) return null;

  return (
    <section id="gallery" className="mx-auto max-w-6xl px-4 py-12 md:py-20">
      <Reveal>
        <h2 className="text-4xl md:text-5xl">Gallery</h2>
      </Reveal>
      <ul className="mt-8 md:columns-2 md:gap-6 lg:columns-3">
        {galleryPhotos.map((photo) => (
          <li key={photo.src.src} className="mb-8 break-inside-avoid md:mb-6">
            <Reveal>
              <Image
                src={photo.src}
                alt={photo.alt}
                placeholder="blur"
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                className="h-auto w-full rounded-3xl"
              />
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
