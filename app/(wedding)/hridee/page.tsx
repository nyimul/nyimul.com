/**
 * nyimul.com/hridee  (the wedding home page)
 *
 * One long scrolling page built from sections. This is the simplest possible model for
 * older guests: scroll, or tap a nav link that jumps to a section. The RSVP form gets its
 * own page (/hridee/rsvp) so it is focused and free of distractions.
 *
 * Section order below is deliberate: the things every guest needs (when, where, RSVP)
 * come first; the "hidden gems" from the sayi.do guide come later.
 * Every section is its own file in ./_components so you can build and style them one at a time.
 */
import Nav from "./_components/Nav";
import Hero from "./_components/Hero";
import Events from "./_components/Events";
import OurStory from "./_components/OurStory";
import WeddingParty from "./_components/WeddingParty";
import Travel from "./_components/Travel";
import ThingsToDo from "./_components/ThingsToDo";
import Registry from "./_components/Registry";
import Faq from "./_components/Faq";
import Gallery from "./_components/Gallery";
import RsvpCta from "./_components/RsvpCta";
import Footer from "./_components/Footer";
import PhotoBackdrop from "./_components/PhotoBackdrop";

export default function WeddingHome() {
  return (
    <>
      <Nav />
      {/* Sits behind everything and crossfades engagement photos as the page scrolls. */}
      <PhotoBackdrop />
      <main className="relative">
        <Hero />
        <Events />
        <RsvpCta />
        <OurStory />
        <Travel />
        <Faq />
        <WeddingParty />
        <ThingsToDo />
        <Registry />
        <Gallery />
      </main>
      <Footer />
    </>
  );
}
