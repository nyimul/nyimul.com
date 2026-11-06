"use client";

/**
 * useInView: tells a component when it has scrolled into the viewport.
 * This is the engine behind <Reveal> (fade/slide sections in). No animation library needed.
 *
 * Safe for old phones and no-JS: the server renders everything VISIBLE (`inView` starts true).
 * After hydration an IntersectionObserver reports where the element is: still below the fold,
 * it is hidden and reveals when it scrolls in; already on screen, it is left alone. Reduced-motion
 * users are never touched. So if JavaScript is slow or never arrives, nothing is hidden.
 *
 * Usage:
 *   const [ref, inView] = useInView<HTMLElement>({ threshold: 0.2, once: true });
 *   <section ref={ref} data-inview={inView}>...</section>
 */
import { useEffect, useRef, useState } from "react";

type Options = {
  /** 0..1, how much of the element must be visible. 0.1-0.25 feels right for sections. */
  threshold?: number;
  /** e.g. "0px 0px -10% 0px" to trigger slightly before the bottom edge. */
  rootMargin?: string;
  /** Stay "in view" after the first time (use for reveals; false to flip back and forth). */
  once?: boolean;
};

export function useInView<T extends Element>({ threshold = 0.15, rootMargin = "0px", once = true }: Options = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let first = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!first) setInView(true); // already visible at load: never animate it
          if (once) observer.disconnect();
        } else if (first || !once) {
          setInView(false);
        }
        first = false;
      },
      { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, inView] as const;
}
