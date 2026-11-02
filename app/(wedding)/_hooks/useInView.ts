"use client";

/**
 * useInView: tells a component when it has scrolled into the viewport.
 * This is the engine behind <Reveal> (fade/slide sections in) and <PhotoBackdrop>
 * (crossfade the background photo as sections pass). No animation library needed.
 *
 * Approach:
 *   - useRef for the element, useState for `inView`.
 *   - useEffect creates ONE IntersectionObserver with { threshold, rootMargin } and observes the ref.
 *   - On intersect: set inView true. If `once` is true, unobserve so it never flips back.
 *   - Return [ref, inView].
 *   - Respect prefers-reduced-motion: if matchMedia("(prefers-reduced-motion: reduce)").matches,
 *     just return inView = true immediately so content is never hidden.
 *
 * Usage:
 *   const [ref, inView] = useInView<HTMLElement>({ threshold: 0.2, once: true });
 *   <section ref={ref} data-inview={inView}>...</section>
 */
import { useRef } from "react";

type Options = {
  /** 0..1, how much of the element must be visible. 0.15-0.25 feels right for sections. */
  threshold?: number;
  /** e.g. "0px 0px -10% 0px" to trigger slightly before the bottom edge. */
  rootMargin?: string;
  /** Stay "in view" after the first time (use for reveals; false for the photo backdrop). */
  once?: boolean;
};

export function useInView<T extends Element>(_options: Options = {}) {
  const ref = useRef<T | null>(null);
  const inView = true; // TODO: replace with real IntersectionObserver state

  return [ref, inView] as const;
}
