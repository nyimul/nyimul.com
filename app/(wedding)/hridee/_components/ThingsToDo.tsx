/**
 * ThingsToDo ("Our Favorite Food/Things To Do in Atlanta"): your favorite places, mainly for the out-of-towners.
 * Data: `recommendations` in content.ts, grouped (Activities, Food, Cafes). Each group lists its places
 * nearest the hotel first, and every row is one big link that opens the place in Google Maps
 * (a search for its name and address, so there are no map links to collect; it opens the Maps
 * app on phones). There is no embedded map on purpose: it is heavy on old phones, scroll-jacks,
 * and needs an API key. `recommendationsMapUrl`, a shared Google Maps list, gives guests a real
 * map with every pin in the app they already use, as one button.
 * Each list shows its first INITIAL_ROWS places and a "Show all" button (ShowAll.tsx); the rest,
 * and the group's photo, fade in when it is tapped. That keeps the home page short.
 * Empty groups are skipped; the whole section is hidden until there is content.
 * Photos: the aquarium pair sits beside the Activities list (`besidePhotos`), to its right on wide
 * screens, where that list used to have a blank cell next to it, and as a two-up strip under it on
 * phones; it is always visible. The Botiwalla photo and Hridee at Raani sit under the Food and
 * Cafes lists (`groupPhotos`) and show with "Show all".
 */
import Image from "next/image";
import { recommendations, recommendationsIntro, recommendationsMapUrl } from "../../_lib/content";
import type { Recommendation } from "../../_lib/types";
import { smallButton } from "../../_lib/ui";
import { activityPhotos, cafePhotos, chapterPhotos, foodPhotos, type Photo } from "../../_photos";
import Section from "./Section";
import ShowAll from "./ShowAll";

/** Rows shown before the "Show all" button. */
const INITIAL_ROWS = 5;

/** Photos under a group, shown with "Show all", by the group's title in content.ts. Rename a group there, rename it here too. */
const groupPhotos: Record<string, Photo[]> = { Food: foodPhotos, Cafes: cafePhotos };

/** Photos beside a group's list, always visible: right of it on wide screens, under it on phones. A pair of portraits looks best. */
const besidePhotos: Record<string, Photo[]> = { Activities: activityPhotos };

/** Where the row goes: the place's own link if it has one, else a Google Maps search for it. */
function mapsUrl(place: Recommendation) {
  if (place.url) return place.url;
  // Chains with no address ("Several locations") search near the hotel, so the nearest one shows.
  const query = place.address ? `${place.name}, ${place.address}` : `${place.name} near Peachtree Corners, GA`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function PinIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none">
      <path d="M10 18s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="10" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PlaceRow({ place }: { place: Recommendation }) {
  return (
    <a
      href={mapsUrl(place)}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start justify-between gap-4 py-4 text-ink no-underline"
    >
      <span className="min-w-0">
        <span className="block text-xl font-semibold leading-snug group-hover:underline">{place.name}</span>
        <span className="mt-0.5 block text-muted">{[place.what, place.area].filter(Boolean).join(" · ")}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-lg leading-snug">{place.minutes} min</span>
        <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-accent">
          <PinIcon />
          Map
        </span>
      </span>
    </a>
  );
}

/** The photos under a list, one above the other, full width of the list. */
function PhotosUnder({ photos }: { photos: Photo[] }) {
  return (
    <div className="grid gap-4">
      {photos.map((photo) => (
        <Image
          key={photo.alt}
          src={photo.src}
          alt={photo.alt}
          placeholder="blur"
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="h-auto w-full rounded-3xl"
        />
      ))}
    </div>
  );
}

/**
 * The photos beside a list: side by side. On wide screens they are cropped a little taller than
 * they are (3:5 instead of 3:4) so the pair stands about as tall as five rows; the crop takes a
 * sliver off each side, where there is only water. On phones they keep their shape and cost about
 * half a screen, where two full-width photos would cost two.
 */
function PhotosBeside({ photos }: { photos: Photo[] }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 lg:mt-0 lg:gap-4">
      {photos.map((photo) => (
        <Image
          key={photo.alt}
          src={photo.src}
          alt={photo.alt}
          placeholder="blur"
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="aspect-[3/4] h-auto w-full rounded-2xl object-cover lg:aspect-[3/5] lg:rounded-3xl"
        />
      ))}
    </div>
  );
}

export default function ThingsToDo() {
  const groups = recommendations.filter((group) => group.places.length > 0);
  if (groups.length === 0) return null;
  // The lists that share a row on wide screens; a list with photos beside it takes a whole row.
  const paired = groups.filter((group) => !besidePhotos[group.title]?.length);

  return (
    <Section id="things-to-do" title="Our Favorite Food/Things To Do in Atlanta" photo={chapterPhotos.things} wide tall>
      {recommendationsIntro && <p className="text-lg">{recommendationsIntro}</p>}
      {recommendationsMapUrl && (
        <div className="mt-5 max-w-xs">
          <a href={recommendationsMapUrl} target="_blank" rel="noopener noreferrer" className={smallButton}>
            See them all on a map
          </a>
        </div>
      )}

      <div className="mt-8 grid gap-12 lg:grid-cols-2 lg:gap-x-16">
        {groups.map((group) => {
          const beside = besidePhotos[group.title] ?? [];
          const under = groupPhotos[group.title] ?? [];
          // Nearest first. sort() is stable, so places with the same minutes keep their order in content.ts.
          const rows = [...group.places]
            .sort((a, b) => a.minutes - b.minutes)
            .map((place) => <PlaceRow key={place.name} place={place} />);
          const list = (
            <div>
              <h3 className="text-3xl md:text-4xl">{group.title}</h3>
              <ShowAll
                rows={rows}
                initial={INITIAL_ROWS}
                label="Show all"
                className="mt-4 divide-y divide-accent-soft border-y border-accent-soft"
                after={under.length > 0 ? <PhotosUnder photos={under} /> : undefined}
              />
            </div>
          );

          if (beside.length > 0) {
            return (
              // A whole row: the list on the left, its photos on the right, centered on each other.
              // The inner grid has the same columns and gap as the outer one, so the list lines up
              // with the lists below it.
              <div key={group.title} className="lg:col-span-2 lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-16">
                {list}
                <PhotosBeside photos={beside} />
              </div>
            );
          }

          // Wide screens show two lists per row. With an odd number of them, the first gets a row
          // to itself so the rest pair up, rather than a short list leaving a gap beside a long one.
          const pairIndex = paired.indexOf(group);
          return (
            <div key={group.title} className={pairIndex === 1 && paired.length % 2 === 1 ? "lg:col-start-1" : undefined}>
              {list}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
