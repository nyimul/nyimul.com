/**
 * nyimul.com/hridee  (the wedding home page)
 *
 * One long scrolling page built from sections. This is the simplest possible model for
 * older guests: scroll, or tap a nav link that jumps to a section. The RSVP form gets its
 * own page (/hridee/rsvp) so it is focused and free of distractions.
 *
 * Section order below is deliberate: the things every guest needs (when, where, RSVP)
 * come first; the "hidden gems" from the sayi.do guide come later. Each chapter opens with a
 * full-width photo carrying its title (see _components/Section.tsx); the photos are the design.
 * Every section is its own file in ./_components so you can build and style them one at a time.
 *
 * PERSONALISED: this renders on the server for the signed-in party (see /hridee/enter).
 * Sections that mention events get only that party's events, already filtered, so nothing
 * about an event they aren't invited to ever reaches their browser.
 */
import { eventsFor, eventsForSome, requireParty } from "../_lib/party";
import Nav from "./_components/Nav";
import Hero from "./_components/Hero";
import Events from "./_components/Events";
import OurStory from "./_components/OurStory";
import WeddingParty from "./_components/WeddingParty";
import Travel from "./_components/Travel";
import ThingsToDo from "./_components/ThingsToDo";
import Gifts from "./_components/Gifts";
import Faq from "./_components/Faq";
import Gallery from "./_components/Gallery";
import RsvpCta from "./_components/RsvpCta";
import ClosingPhoto from "./_components/ClosingPhoto";
import Footer from "./_components/Footer";

export default async function WeddingHome() {
  const party = await requireParty();
  const myEvents = eventsFor(party.invitedEventIds);
  const onlyFor = await eventsForSome(party.partyId);

  return (
    <>
      <Nav />
      <main className="relative">
        <Hero guestName={party.displayName} firstEvent={myEvents[0]} />
        <Events events={myEvents} onlyFor={onlyFor} family={party.family} />
        <RsvpCta />
        <OurStory />
        <Travel invitedEventIds={party.invitedEventIds} />
        <Faq invitedEventIds={party.invitedEventIds} />
        <Gifts />
        <WeddingParty />
        <ThingsToDo />
        <Gallery />
        <ClosingPhoto />
      </main>
      <Footer guestName={party.displayName} />
    </>
  );
}
