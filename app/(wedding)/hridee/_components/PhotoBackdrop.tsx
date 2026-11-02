"use client";

/**
 * PhotoBackdrop: the "photos slowly transition as you scroll" effect.
 *
 * Idea: a fixed, full-viewport layer behind the content holding every backdrop photo stacked
 * on top of each other. Only one is visible at a time; as you scroll from one section to the
 * next, the next photo fades in over ~1s. Sections render on top with a translucent paper
 * panel so text stays readable over any photo.
 *
 * Approach (no library):
 *   - Each content section gets data-photo="0|1|2" and a useInView ref (once: false, threshold ~0.5).
 *   - Whichever section is in view sets `activeIndex` (share it via React context or a tiny store).
 *   - Render backdropPhotos.map((p, i) => <Image ... className={i === activeIndex ? "opacity-100" : "opacity-0"} />)
 *     with `transition-opacity duration-1000`. Opacity transitions are GPU-cheap and smooth on phones.
 *   - Only the active and next photo need to be loaded eagerly; the rest lazy-load.
 *   - Respect prefers-reduced-motion: the CSS in wedding.css already removes the transition.
 *   - Mobile: use portrait crops and `sizes="100vw"`; keep the layer `pointer-events-none`.
 *
 * Alternative without JS: CSS scroll-driven animations (animation-timeline: view()). Smooth, but
 * browser support on older phones is patchy, so the IntersectionObserver route is the safe default.
 */
import { backdropPhotos } from "../../_photos";

export default function PhotoBackdrop() {
  if (backdropPhotos.length === 0) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      {/* TODO: stacked <Image fill> elements with opacity transitions */}
    </div>
  );
}
