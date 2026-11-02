/**
 * ThingsToDo: your favourite Atlanta spots for guests with a free afternoon (guide "hidden gem":
 * local recommendations, ideally tied to your relationship). Data: `thingsToDo` in content.ts.
 * A simple list with a one-line blurb and a Maps link each is plenty.
 */
import { thingsToDo } from "../../_lib/content";

export default function ThingsToDo() {
  if (thingsToDo.length === 0) return null;

  return (
    <section id="things-to-do" className="mx-auto max-w-3xl px-4 py-24">
      <h2 className="font-display text-4xl">While You&apos;re in Atlanta</h2>
      {/* TODO: list */}
    </section>
  );
}
