"use client";

/**
 * Reveal: wraps any block and fades/slides it in the first time it scrolls into view.
 * Use it around section content (not the whole section, so the id anchor still works).
 *
 * Approach:
 *   const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.15, once: true });
 *   <div ref={ref} className={`transition-all duration-700 ease-out ${inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
 * Keep the movement small (16px) and the duration under 800ms: "smooth", not "slow".
 * Reduced-motion users get an instant reveal because useInView returns true immediately for them.
 */
import { useInView } from "../../_hooks/useInView";

export default function Reveal({ children }: { children: React.ReactNode }) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.15, once: true });

  return (
    <div ref={ref} data-inview={inView}>
      {children}
    </div>
  );
}
