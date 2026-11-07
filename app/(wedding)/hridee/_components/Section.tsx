/**
 * Section: one chapter of the home page. It opens with a full-width photo that carries the
 * chapter title, then the content sits on solid paper, so text is always readable whatever the
 * photo behind the title looks like. Both halves fade in as they scroll into view.
 * The `id` is the nav anchor (#events, #travel, #faq ...).
 */
import type { ReactNode } from "react";
import type { ArtDirectedPhoto } from "../../_photos";
import Photo from "./Photo";
import Reveal from "./Reveal";

type Props = {
  id: string;
  title: string;
  photo: ArtDirectedPhoto;
  children: ReactNode;
  /** A wider content column for grids; the default is a reading column. */
  wide?: boolean;
  /** Content several screens tall: fade it in as soon as any of it is on screen. Waiting for the usual 12% leaves blank paper under the photo. */
  tall?: boolean;
};

export function Chapter({ title, photo }: { title: string; photo: ArtDirectedPhoto }) {
  return (
    <div className="relative h-[62svh] max-h-[760px] min-h-[420px] overflow-hidden bg-ink lg:h-[60vh]">
      <Photo photo={photo} sizes="100vw" />
      <div aria-hidden="true" className="shade-chapter absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto max-w-6xl px-6 pb-7 md:px-12 md:pb-10">
          <h2 className="shadow-text text-[42px] text-white md:text-6xl">{title}</h2>
        </div>
      </div>
    </div>
  );
}

export default function Section({ id, title, photo, children, wide = false, tall = false }: Props) {
  return (
    <section id={id}>
      <Reveal>
        <Chapter title={title} photo={photo} />
      </Reveal>
      <Reveal threshold={tall ? 0 : undefined}>
        <div className={`mx-auto px-4 py-10 md:py-16 ${wide ? "max-w-6xl" : "max-w-2xl"}`}>{children}</div>
      </Reveal>
    </section>
  );
}
