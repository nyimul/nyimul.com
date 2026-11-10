/**
 * Gallery: every photo that is not used elsewhere on the page, no captions. Data: `galleryPhotos`
 * in _photos/index.ts.
 * Phones show one big column in list order (easy to see, nothing to pinch). From tablets up it
 * is three columns filled top to bottom: the first third of the list is the left column, the
 * second third the middle, the rest the right. So the list order decides which column a photo
 * lands in, and moving an entry in the list moves it between columns. (CSS columns used to
 * decide this by height, which left one photo sticking out at the bottom of the middle column.)
 * Lazy-loaded, correct `sizes`, no lightbox needed.
 */
import Image from "next/image";
import { galleryPhotos } from "../../_photos";
import Reveal from "./Reveal";

const COLUMNS = 3;

export default function Gallery() {
  if (galleryPhotos.length === 0) return null;

  const perColumn = Math.ceil(galleryPhotos.length / COLUMNS);
  const columns = Array.from({ length: COLUMNS }, (_, c) => galleryPhotos.slice(c * perColumn, (c + 1) * perColumn)).filter(
    (column) => column.length > 0,
  );

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
