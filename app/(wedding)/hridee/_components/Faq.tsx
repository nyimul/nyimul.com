/**
 * FAQ (guide: "useful for large or complex weddings", and three events across two venues counts).
 * Data: `faq` in content.ts. Questions tagged with `eventIds` only appear for parties invited
 * to one of those events, so a Reception-only guest never reads about the Nikkah here.
 * Use native <details>/<summary>: keyboard and screen-reader accessible, works without JS,
 * and old phones handle it. Style the <summary> as a big tappable row.
 */
import { faq } from "../../_lib/content";
import { visibleTo } from "../../_lib/party";
import type { EventId } from "../../_lib/types";

export default function Faq({ invitedEventIds }: { invitedEventIds: EventId[] }) {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-24">
      <h2 className="font-display text-4xl">Questions</h2>
      <div className="mt-8 divide-y divide-accent-soft">
        {visibleTo(faq, invitedEventIds).map((item) => (
          <details key={item.question} className="py-4">
            <summary className="cursor-pointer text-lg">{item.question}</summary>
            <p className="mt-2 text-muted">{item.answer || "TODO"}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
