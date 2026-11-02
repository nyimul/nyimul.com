/**
 * Registry / wishing well (guide "easily forgotten"): a warm sentence, then one button per
 * registry link. Data: `registry` in content.ts. Never put a home address here.
 */
import { registry } from "../../_lib/content";

export default function Registry() {
  if (registry.length === 0) return null;

  return (
    <section id="registry" className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h2 className="font-display text-4xl">Registry</h2>
      {/* TODO: intro sentence + buttons */}
    </section>
  );
}
