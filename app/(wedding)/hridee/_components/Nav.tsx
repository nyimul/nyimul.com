/**
 * Nav: a small sticky bar with at most 4-5 links that jump to sections (#events, #travel ...)
 * plus one obvious RSVP button. Keep it boring on purpose: no hamburger menus, no hover-only
 * menus (they don't exist on phones), tap targets at least 44px tall.
 *
 * Ideas: on mobile, render the same links as a fixed bottom bar (thumbs reach it); let the bar
 * turn opaque after the hero scrolls away (useInView on the hero, inverted).
 */
import Link from "next/link";

const links = [
  { href: "#events", label: "Events" },
  { href: "#travel", label: "Travel" },
  { href: "#faq", label: "FAQ" },
];

export default function Nav() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-4 py-3">
      <Link href="/hridee" className="font-display text-xl">
        {/* TODO: monogram or initials */}
        H &amp; N
      </Link>
      <div className="flex items-center gap-4">
        {links.map((l) => (
          <a key={l.href} href={l.href}>
            {l.label}
          </a>
        ))}
        <Link href="/hridee/rsvp" className="rounded-full bg-accent px-4 py-2 text-paper">
          RSVP
        </Link>
      </div>
    </nav>
  );
}
