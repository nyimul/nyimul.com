/**
 * Gifts: one plain note for everyone (cash gifts only), and, only if you add any, registry links
 * as buttons underneath. Data: `giftNote` and `registry` in content.ts.
 * Sits right after Questions, with the other practical information. Never put a home address here.
 */
import { giftNote, registry } from "../../_lib/content";
import { secondaryButton } from "../../_lib/ui";
import Reveal from "./Reveal";

export default function Gifts() {
  return (
    <section id="gifts" className="mx-auto max-w-2xl px-4 py-12 text-center md:py-20">
      <Reveal>
        <h2 className="text-4xl md:text-5xl">Gifts</h2>
        <p className="mx-auto mt-6 max-w-md text-lg">{giftNote}</p>
        {registry.length > 0 && (
          <div className="mx-auto mt-8 max-w-md space-y-5">
            {registry.map((item) => (
              <div key={item.url}>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className={secondaryButton}>
                  {item.name}
                </a>
                {item.note && <p className="mt-2 text-muted">{item.note}</p>}
              </div>
            ))}
          </div>
        )}
      </Reveal>
    </section>
  );
}
