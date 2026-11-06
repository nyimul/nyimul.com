/**
 * SiteHeader: the top bar for pages other than the home page (the RSVP form): the monogram in
 * the corner, already "docked" (see Nav.tsx for the home page version), and a Back link.
 */
import Image from "next/image";
import Link from "next/link";
import { couple } from "../../_lib/content";
import { monogram } from "../../_photos";

export default function SiteHeader({ backHref }: { backHref?: string }) {
  return (
    <header
      data-docked="true"
      className="site-bar fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between px-4 md:px-6"
    >
      <Link href="/hridee" className="inline-flex min-h-11 items-center">
        <Image
          src={monogram}
          alt={`${couple.names[0]} & ${couple.names[1]}`}
          width={48}
          height={34}
          className="h-auto w-12"
        />
      </Link>
      {backHref && (
        <Link href={backHref} className="inline-flex min-h-11 items-center px-2 text-base font-semibold no-underline">
          &larr; Back
        </Link>
      )}
    </header>
  );
}
