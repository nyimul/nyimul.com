"use client";

/**
 * Nav: the monogram plus a small fixed bar with three anchor links and the RSVP button.
 *
 * On the home page the monogram starts big and centred in the sky of the hero photo. When the
 * hero scrolls out of view (or the hero's RSVP button is tapped, see HeroRsvpButton.tsx) it
 * glides into the top-left corner and the bar fades in behind it: paper background, links, RSVP.
 * The move is one CSS transform transition (wedding.css > .monogram-dock), cheap on old phones,
 * and instant for anyone with reduced motion.
 * Kept boring on purpose: no hamburger menu, nothing hover-only, tap targets at least 44px tall.
 */
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onDockRequest } from "../../_hooks/monogramDock";
import { monogram } from "../../_photos";

const links = [
  { href: "#events", label: "Events" },
  { href: "#travel", label: "Travel" },
  { href: "#faq", label: "FAQ" },
];

export default function Nav() {
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    // Docked once less than half of the hero is still on screen; undocks when scrolling back up.
    // Measured from the scroll position (one frame per scroll event) rather than an
    // IntersectionObserver: browsers disagree about `isIntersecting` at a 0.5 threshold, and
    // Safari only reported "gone" once the hero had scrolled off completely.
    let forced = false; // the hero's RSVP button asked for the dock: stay docked until we leave
    let frame = 0;
    const hero = document.getElementById("top");

    const update = () => {
      frame = 0;
      if (forced) return;
      if (!hero) {
        setDocked(true); // no hero on this page: the monogram just lives in the corner
        return;
      }
      const rect = hero.getBoundingClientRect();
      const visible = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      setDocked(visible < rect.height * 0.5);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const unsubscribe = onDockRequest(() => {
      forced = true;
      setDocked(true);
    });
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // Belt and braces for phones: an observer on the hero also re-measures as it crosses each
    // quarter of the viewport, in case a browser is stingy with scroll events during a flick.
    const observer =
      hero && typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(schedule, { threshold: [0, 0.25, 0.5, 0.75, 1] })
        : null;
    observer?.observe(hero as Element);
    return () => {
      unsubscribe();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
    };
  }, []);

  return (
    <>
      <Link href="/hridee" aria-label="Back to top" className="monogram-dock block" data-docked={docked}>
        <Image src={monogram} alt="" width={250} height={175} sizes="250px" loading="eager" className="h-auto w-full" />
      </Link>
      <nav
        data-docked={docked}
        className="site-bar fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-end gap-1 px-3 md:px-6"
      >
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="inline-flex min-h-11 items-center px-2.5 text-[15px] font-semibold text-ink no-underline md:px-3 md:text-base"
          >
            {l.label}
          </a>
        ))}
        <Link
          href="/hridee/rsvp"
          className="ml-1 inline-flex min-h-10 items-center rounded-full bg-accent px-4 text-[15px] font-semibold text-white no-underline md:text-base"
        >
          RSVP
        </Link>
      </nav>
    </>
  );
}
