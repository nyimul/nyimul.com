/**
 * OurStory: how you met, the proposal, the bits in between (guide "must-have": your story).
 * Short paragraphs from `story` in _lib/content.ts, each paired with one of `storyPhotos`
 * (photo left/right alternating on desktop, stacked on phones).
 */
import Image from "next/image";
import { story } from "../../_lib/content";
import { chapterPhotos, storyPhotos } from "../../_photos";
import Section from "./Section";

export default function OurStory() {
  return (
    <Section id="story" title="Our Story" photo={chapterPhotos.story} wide>
      {story.length === 0 && <p className="mx-auto max-w-2xl text-muted">TODO: write our story in content.ts</p>}
      <div className="space-y-12 md:space-y-20">
        {story.map((part, i) => {
          const photo = storyPhotos[i % storyPhotos.length];
          return (
            <article key={part.heading} className="md:grid md:grid-cols-2 md:items-center md:gap-12">
              <div className={i % 2 === 1 ? "md:order-2" : ""}>
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  placeholder="blur"
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="h-auto w-full rounded-3xl"
                />
              </div>
              <div className="mt-6 md:mt-0">
                <h3 className="text-3xl md:text-4xl">{part.heading}</h3>
                <p className="mt-3">{part.body}</p>
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
