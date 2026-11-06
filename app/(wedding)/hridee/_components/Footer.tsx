/**
 * Footer: the monogram, contact email, a "back to top" link, and a way to
 * sign out for families sharing one phone ("Not The Karim Family? Switch").
 * No link back to nyimul.com on purpose: the wedding site stands alone.
 */
import Image from "next/image";
import { couple } from "../../_lib/content";
import { monogram } from "../../_photos";
import { switchParty } from "../enter/actions";

export default function Footer({ guestName }: { guestName: string }) {
  return (
    <footer className="px-4 py-14 text-center text-muted">
      <Image src={monogram} alt="" width={64} height={45} className="mx-auto h-auto w-16 opacity-90" />
      <p className="mt-5">
        <a href={`mailto:${couple.contactEmail}`}>{couple.contactEmail}</a>
      </p>
      <p className="mt-2">
        <a href="#top">Back to top</a>
      </p>
      <form action={switchParty} className="mt-8 text-[15px]">
        Not {guestName}?{" "}
        <button type="submit" className="min-h-11 text-accent underline underline-offset-4">
          Switch
        </button>
      </form>
    </footer>
  );
}
