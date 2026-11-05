/**
 * Footer: contact email, a "back to top" link, and a way to
 * sign out for families sharing one phone ("Not The Karim Family? Switch").
 * No link back to nyimul.com on purpose: the wedding site stands alone.
 */
import { couple } from "../../_lib/content";
import { switchParty } from "../enter/actions";

export default function Footer({ guestName }: { guestName: string }) {
  return (
    <footer className="px-4 py-12 text-center text-sm text-muted">
      <p>
        <a href={`mailto:${couple.contactEmail}`}>{couple.contactEmail}</a>
      </p>
      <p className="mt-2">
        <a href="#top">Back to top</a>
      </p>
      <form action={switchParty} className="mt-6">
        Not {guestName}?{" "}
        <button type="submit" className="text-accent underline">
          Switch
        </button>
      </form>
    </footer>
  );
}
