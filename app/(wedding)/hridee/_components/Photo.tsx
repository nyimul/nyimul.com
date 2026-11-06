/**
 * Photo: a full-bleed photo that fills its (position: relative) parent.
 *
 * Phones and wide screens can get different files (portrait vs landscape, see _photos/index.ts).
 * With one file it is a plain next/image with a blur-up placeholder. With two, it is a <picture>
 * built from getImageProps (the documented way to art-direct with next/image); that path has no
 * blur placeholder, so the parent carries a solid background colour instead.
 * `eager` is for the first image on screen only (hero, entrance): it loads at high priority.
 */
import Image, { getImageProps } from "next/image";
import type { CSSProperties } from "react";
import type { ArtDirectedPhoto } from "../../_photos";

type Props = {
  photo: ArtDirectedPhoto;
  /** How wide the photo is on screen, e.g. "100vw" or "(min-width: 1024px) 50vw, 100vw". */
  sizes: string;
  eager?: boolean;
  className?: string;
};

export default function Photo({ photo, sizes, eager = false, className = "" }: Props) {
  // Focal point per breakpoint, read by .art-directed in wedding.css.
  const style = {
    "--pos-mobile": photo.position ?? "50% 50%",
    "--pos-desktop": photo.positionDesktop ?? photo.position ?? "50% 50%",
  } as CSSProperties;
  const priority = eager ? { loading: "eager" as const, fetchPriority: "high" as const } : {};

  if (!photo.desktop) {
    return (
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes={sizes}
        placeholder="blur"
        {...priority}
        className={`art-directed object-cover ${className}`}
        style={style}
      />
    );
  }

  const common = { alt: photo.alt, sizes, fill: true as const, ...priority };
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({ ...common, src: photo.desktop });
  const { props: mobile } = getImageProps({ ...common, src: photo.src });

  return (
    <picture>
      <source media="(min-width: 1024px)" srcSet={desktopSrcSet} sizes={sizes} />
      <img
        {...mobile}
        alt={photo.alt}
        className={`art-directed object-cover ${className}`}
        style={{ ...mobile.style, ...style }}
      />
    </picture>
  );
}
