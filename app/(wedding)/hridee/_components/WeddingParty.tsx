/**
 * WeddingParty: name + role + one-line bio for each person (guide "hidden gem": so guests
 * recognise them on the day). Data: `weddingParty` in _lib/content.ts.
 * Grid of cards, 2 columns on phones, 3 on desktop. Hidden until there is content.
 * Photos: add them to _photos/index.ts and a round <Image> at the top of each card.
 */
import { weddingParty } from "../../_lib/content";
import { cardClass } from "../../_lib/ui";
import Reveal from "./Reveal";

export default function WeddingParty() {
  if (weddingParty.length === 0) return null;

  return (
    <section id="party" className="mx-auto max-w-5xl px-4 py-12 md:py-20">
      <Reveal>
        <h2 className="text-4xl md:text-5xl">Wedding Party</h2>
        <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {weddingParty.map((member) => (
            <li key={member.name} className={cardClass}>
              <h3 className="text-2xl">{member.name}</h3>
              <p className="text-[15px] font-semibold text-muted">{member.role}</p>
              {member.bio && <p className="mt-2 text-base">{member.bio}</p>}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
