/**
 * OurStory: how you met, the proposal, the bits in between (guide "must-have": your story).
 * Short paragraphs from `story` in _lib/content.ts, each paired with a photo from _photos.
 * Alternate photo left/right on desktop, stack on mobile. Wrap each block in <Reveal> so it
 * fades in as it scrolls into view.
 */
import { story } from "../../_lib/content";

export default function OurStory() {
  return (
    <section id="story" className="mx-auto max-w-3xl px-4 py-24">
      <h2 className="font-display text-4xl">Our Story</h2>
      {story.length === 0 && <p className="mt-4 text-muted">TODO: write our story in content.ts</p>}
      {story.map((part) => (
        <article key={part.heading} className="mt-8">
          <h3 className="font-display text-2xl">{part.heading}</h3>
          <p className="mt-2">{part.body}</p>
        </article>
      ))}
    </section>
  );
}
