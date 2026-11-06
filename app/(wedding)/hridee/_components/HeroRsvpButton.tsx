"use client";

/**
 * The hero's RSVP button. A plain link to /hridee/rsvp, except that a normal tap first asks the
 * monogram to glide into the corner (see Nav.tsx), then navigates once that move is done, so the
 * monogram is seen arriving where the RSVP page keeps it. Modifier clicks, middle clicks and
 * reduced-motion users get an ordinary, immediate link.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { requestDock } from "../../_hooks/monogramDock";
import { lightButton } from "../../_lib/ui";

/** A touch longer than the 700ms transform so the landing is seen, but not so long it feels slow. */
const DOCK_MS = 550;

export default function HeroRsvpButton({ href }: { href: string }) {
  const router = useRouter();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    event.preventDefault();
    requestDock();
    window.setTimeout(() => router.push(href), DOCK_MS);
  }

  return (
    <Link href={href} onClick={onClick} className={lightButton}>
      RSVP
    </Link>
  );
}
