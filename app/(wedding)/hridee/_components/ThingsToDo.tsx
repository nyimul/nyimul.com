/**
 * ThingsToDo ("While You're in Atlanta"): your favorite places for guests with a free afternoon,
 * mainly the out-of-towners. Data: `recommendations` in content.ts, grouped (Restaurants, Cafes,
 * Things to do...). Each place is a name (linked when there is a url), one line on why, and an
 * optional address. Empty groups are skipped; the whole section is hidden until there is content.
 * The two snack-shop photos close the section.
 */
import Image from "next/image";
import { recommendations } from "../../_lib/content";
import { chapterPhotos, foodPhotos } from "../../_photos";
import Section from "./Section";

export default function ThingsToDo() {
  const groups = recommendations.filter((group) => group.places.length > 0);
  if (groups.length === 0) return null;

  return (
    <Section id="things-to-do" title="While You're in Atlanta" photo={chapterPhotos.things}>
      <div className="space-y-12">
        {groups.map((group) => (
          <div key={group.title}>
            <h3 className="text-3xl md:text-4xl">{group.title}</h3>
            <ul className="mt-5 divide-y divide-accent-soft border-y border-accent-soft">
              {group.places.map((place) => (
                <li key={place.name} className="py-5">
                  <p className="text-xl font-semibold leading-snug">
                    {place.url ? (
                      <a href={place.url} target="_blank" rel="noopener noreferrer">
                        {place.name}
                      </a>
                    ) : (
                      place.name
                    )}
                  </p>
                  {place.blurb && <p className="mt-1">{place.blurb}</p>}
                  {place.address && <p className="mt-1 text-muted">{place.address}</p>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {foodPhotos.map((photo) => (
          <Image
            key={photo.alt}
            src={photo.src}
            alt={photo.alt}
            placeholder="blur"
            sizes="(min-width: 768px) 50vw, 100vw"
            className="h-auto w-full rounded-3xl"
          />
        ))}
      </div>
    </Section>
  );
}
