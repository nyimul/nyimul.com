/**
 * Gallery: every photo that is not used elsewhere on the page, no captions. Data: `galleryPhotos`
 * in _photos/index.ts.
 * Phones show one big column in list order (easy to see, nothing to pinch). From tablets up it
 * is three columns filled top to bottom: the list is cut into three runs, the first run is the
 * left column, the second the middle, the third the right (when the count does not divide by
 * three, the first run or two are one photo longer). So the list order decides which column a
 * photo lands in, and moving an entry in the list moves it between columns. (CSS columns used
 * to decide this by height, which left one photo sticking out at the bottom of the middle column.)
 * Lazy-loaded, correct `sizes`, no lightbox needed.
 */
import Image from "next/image";
import { galleryPhotos, type Photo } from "../../_photos";
import Reveal from "./Reveal";

const COLUMNS = 3;

export default function Gallery() {
  if (galleryPhotos.length === 0) return null;

  // Cut the list into COLUMNS runs, as even as it goes (13 photos would be 5, 4 and 4).
  const base = Math.floor(galleryPhotos.length / COLUMNS);
  const extra = galleryPhotos.length % COLUMNS;
  const columns: Photo[][] = [];
  for (let c = 0, start = 0; c < COLUMNS; c++) {
    const size = base + (c < extra ? 1 : 0);
    if (size > 0) columns.push(galleryPhotos.slice(start, start + size));
    start += size;
  }

  return (
    <section id="gallery" className="mx-auto max-w-6xl px-4 py-12 md:py-20">
      <Reveal>
        <h2 className="text-4xl md:text-5xl">Gallery</h2>
      </Reveal>
      <div className="mt-8 grid gap-8 md:grid-cols-3 md:gap-6">
        {columns.map((column, c) => (
          <ul key={c} className="space-y-8 md:space-y-6">
            {column.map((photo) => (
              <li key={photo.src.src}>
                <Reveal>
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    placeholder="blur"
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="h-auto w-full rounded-3xl"
                  />
                </Reveal>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
