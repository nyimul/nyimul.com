/**
 * ClosingPhoto: the last photo on the page, the two of you waving, right above the footer. No text.
 */
import { closingPhoto } from "../../_photos";
import Photo from "./Photo";
import Reveal from "./Reveal";

export default function ClosingPhoto() {
  return (
    <Reveal>
      <div className="relative h-[70svh] max-h-[720px] min-h-[380px] overflow-hidden bg-ink">
        <Photo photo={closingPhoto} sizes="100vw" />
      </div>
    </Reveal>
  );
}
