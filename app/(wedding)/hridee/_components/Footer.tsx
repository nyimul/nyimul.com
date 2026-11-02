/**
 * Footer: hashtag (guide checklist), contact email, a "back to top" link.
 * No link back to nyimul.com on purpose: the wedding site stands alone.
 */
import { couple } from "../../_lib/content";

export default function Footer() {
  return (
    <footer className="px-4 py-12 text-center text-sm text-muted">
      <p>{couple.hashtag}</p>
      <p className="mt-2">
        <a href={`mailto:${couple.contactEmail}`}>{couple.contactEmail}</a>
      </p>
      <p className="mt-2">
        <a href="#top">Back to top</a>
      </p>
    </footer>
  );
}
