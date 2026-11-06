/**
 * Registry / wishing well (guide "easily forgotten"): one big button per registry link, with
 * its note underneath. Data: `registry` in content.ts. Never put a home address here.
 * Hidden until there is content.
 */
import { registry } from "../../_lib/content";
import { secondaryButton } from "../../_lib/ui";
import Reveal from "./Reveal";

export default function Registry() {
  if (registry.length === 0) return null;

  return (
    <section id="registry" className="mx-auto max-w-2xl px-4 py-12 text-center md:py-20">
      <Reveal>
        <h2 className="text-4xl md:text-5xl">Registry</h2>
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
      </Reveal>
    </section>
  );
}
