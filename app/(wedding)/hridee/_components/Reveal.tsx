"use client";

/**
 * Reveal: wraps any block and fades/slides it in the first time it scrolls into view
 * (opacity + 16px rise, 700ms, once; see .reveal in wedding.css).
 * Use it around section content, not the whole <section>, so the id anchor still works.
 * Never put the hero or a form in one: useInView keeps server-rendered content visible until
 * JavaScript runs, and reduced-motion users get an instant reveal, but the first screen and
 * anything a guest must act on should not depend on a scroll effect at all.
 */
import { useInView } from "../../_hooks/useInView";

export default function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.12, rootMargin: "0px 0px -6% 0px", once: true });

  return (
    <div ref={ref} className={`reveal ${className}`} data-inview={inView}>
      {children}
    </div>
  );
}
