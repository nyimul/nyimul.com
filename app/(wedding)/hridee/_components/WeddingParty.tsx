/**
 * WeddingParty: photo + name + role + one-line bio for each person (guide "hidden gem":
 * so guests recognise them on the day). Data: `weddingParty` in _lib/content.ts.
 * Layout: grid of cards, 2 columns on phones, 3-4 on desktop. Round photo crops read well.
 */
import { weddingParty } from "../../_lib/content";

export default function WeddingParty() {
  if (weddingParty.length === 0) return null; // hide the section until there is content

  return (
    <section id="party" className="mx-auto max-w-5xl px-4 py-24">
      <h2 className="font-display text-4xl">Wedding Party</h2>
      {/* TODO: grid of cards */}
    </section>
  );
}
