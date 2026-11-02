/**
 * Gallery (guide "hidden gem"): engagement photos, milestones, a "then and now".
 * Data: `galleryPhotos` in _photos/index.ts.
 * Keep it light: a responsive grid of <Image> with a correct `sizes` prop and lazy loading
 * (the default). A tap-to-enlarge lightbox is a nice later addition, not a must.
 */
import { galleryPhotos } from "../../_photos";

export default function Gallery() {
  if (galleryPhotos.length === 0) return null;

  return (
    <section id="gallery" className="mx-auto max-w-6xl px-4 py-24">
      <h2 className="font-display text-4xl">Gallery</h2>
      {/* TODO: grid of <Image src={p.src} alt={p.alt} sizes="(max-width: 768px) 50vw, 33vw" /> */}
    </section>
  );
}
