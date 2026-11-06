"use client";

/**
 * The RSVP stepper, one screen at a time:
 *   one screen per event the party is invited to  ->  extras (dietary, song, message)  ->  confirm  ->  thank you
 *
 * On an event screen, each person named on the invitation gets Coming / Can't make it. The
 * invites without a name ("open spots") are one counter: "How many others are coming?", with
 * optional name boxes. The two never affect each other: a named person's seat is theirs, so
 * "Can't make it" doesn't free it up for someone else, and the counter's limit never moves.
 * The one exception is a row marked "Others need a named guest": there the counter stays locked
 * at 0 for an event until someone named says Coming.
 * An event can be for only some of the party (the sheet named them under it), so each screen
 * shows only the guests in event.guestIds.
 *
 * It only ever receives the signed-in party's guests and events (see page.tsx). Seats always
 * equal the people shown, so there's nothing to run out of here; submitRsvp re-checks anyway.
 */
import Link from "next/link";
import { useState, useTransition } from "react";
import { formatDate, formatTime, joinList, whoFor } from "../../_lib/format";
import type { EventId, Guest } from "../../_lib/types";
import { submitRsvp } from "./actions";

export type RsvpEvent = {
  id: EventId;
  name: string;
  date: string;
  startTime: string;
  venueName: string;
  maxGuests: number;
  /** The guests who may come to this event (everyone, unless the sheet named some). */
  guestIds: string[];
};

type Props = {
  guests: Guest[];
  events: RsvpEvent[];
  othersNeedNamed: boolean;
  initialAnswers: Record<string, boolean>; // `${guestId}:${eventId}` -> attending
  initialDietary: Record<string, string>;
  initialSongRequest: string;
  initialMessage: string;
  submittedAt: string | null;
  deadline: string;
  contactEmail: string;
};

const key = (guestId: string, eventId: EventId) => `${guestId}:${eventId}`;
const namedFor = (guests: Guest[], e: RsvpEvent) => guests.filter((g) => !g.isSlot && e.guestIds.includes(g.id));
const spotsFor = (guests: Guest[], e: RsvpEvent) => guests.filter((g) => g.isSlot && e.guestIds.includes(g.id));
const people = (n: number) => (n === 1 ? "1 person" : `${n} people`);

const primaryButton = "w-full rounded-full bg-accent px-8 py-4 text-lg text-paper disabled:opacity-60";
const secondaryButton = "w-full rounded-full border border-accent px-8 py-4 text-lg text-accent";
const roundButton = "h-14 w-14 rounded-full border border-accent text-3xl leading-none text-accent disabled:opacity-30";
const inputClass =
  "mt-1 block w-full rounded-xl border border-accent-soft bg-white px-4 py-3 text-lg text-ink outline-none focus:border-accent";

export default function RsvpForm(props: Props) {
  const { guests, events, contactEmail } = props;
  const slots = guests.filter((g) => g.isSlot);

  const [answers, setAnswers] = useState<Record<string, boolean>>(props.initialAnswers);
  // Open spots coming, per event. Spots fill in order, so the first one is the same person at every event.
  const [extras, setExtras] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      events.map((e) => [e.id, spotsFor(guests, e).filter((g) => props.initialAnswers[key(g.id, e.id)]).length]),
    ),
  );
  const [slotNames, setSlotNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(slots.map((g) => [g.id, g.fullName ?? ""])),
  );
  const [dietary, setDietary] = useState<Record<string, string>>(props.initialDietary);
  const [songRequest, setSongRequest] = useState(props.initialSongRequest);
  const [message, setMessage] = useState(props.initialMessage);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sending, startSending] = useTransition();

  const extrasStep = events.length;
  const reviewStep = events.length + 1;

  const nameOf = (g: Guest) => (g.isSlot ? slotNames[g.id]?.trim() || `Extra guest ${slots.indexOf(g) + 1}` : (g.fullName ?? "Guest"));

  /** "Others need a named guest", and no one named has said Coming to this event yet. */
  const othersLocked = (e: RsvpEvent) => {
    const named = namedFor(guests, e);
    return props.othersNeedNamed && named.length > 0 && !named.some((g) => answers[key(g.id, e.id)]);
  };
  const extrasComing = (e: RsvpEvent) => (othersLocked(e) ? 0 : Math.min(extras[e.id] ?? 0, spotsFor(guests, e).length));
  const comingTo = (e: RsvpEvent) => [
    ...namedFor(guests, e).filter((g) => answers[key(g.id, e.id)]),
    ...spotsFor(guests, e).slice(0, extrasComing(e)),
  ];
  const attendingAny = (g: Guest) => events.some((e) => comingTo(e).includes(g));

  function go(to: number) {
    setError(null);
    setStep(to);
    window.scrollTo({ top: 0 });
  }

  function nextFromEvent(e: RsvpEvent) {
    const missing = namedFor(guests, e).filter((g) => answers[key(g.id, e.id)] === undefined);
    if (missing.length > 0) return setError(`Please choose Coming or Can't make it for ${joinList(missing.map(nameOf))}.`);
    go(step + 1);
  }

  function send() {
    setError(null);
    startSending(async () => {
      const coming = new Map(events.map((e) => [e.id, new Set(comingTo(e).map((g) => g.id))]));
      const result = await submitRsvp({
        answers: guests.flatMap((g) => events.map((e) => ({ guestId: g.id, eventId: e.id, attending: coming.get(e.id)!.has(g.id) }))),
        slotNames: Object.fromEntries(slots.map((g) => [g.id, (slotNames[g.id] ?? "").trim()])),
        dietary: Object.fromEntries(guests.filter(attendingAny).map((g) => [g.id, (dietary[g.id] ?? "").trim()])),
        songRequest: songRequest.trim(),
        message: message.trim(),
      });
      if (result.ok) {
        setDone(true);
        window.scrollTo({ top: 0 });
      } else {
        setError(result.error);
      }
    });
  }

  const help = (
    <p className="mt-8 text-center text-sm text-muted">
      Questions? Email <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
    </p>
  );

  if (done) {
    const comingToSomething = guests.some(attendingAny);
    return (
      <div className="mt-10 text-center">
        <h2 className="text-3xl">{comingToSomething ? "Thank you! We can't wait to see you." : "Thank you for letting us know."}</h2>
        <p className="mt-4 text-lg text-muted">
          Your RSVP is saved. You can change it any time before {formatDate(props.deadline)} by coming back to this page.
        </p>
        <Link href="/hridee" className={`${primaryButton} mt-8 inline-block no-underline`}>
          Back to the wedding page
        </Link>
        {help}
      </div>
    );
  }

  // ---------- One screen per event ----------
  if (step < extrasStep) {
    const e = events[step];
    const named = namedFor(guests, e);
    const spots = spotsFor(guests, e);
    const locked = othersLocked(e);
    const count = extrasComing(e);
    const onlySome = named.length + spots.length < guests.length;
    return (
      <div className="mt-8">
        {step === 0 && props.submittedAt && (
          <p className="mb-6 rounded-xl bg-accent-soft px-4 py-3">
            You already replied on {formatDate(props.submittedAt.slice(0, 10), { weekday: false })}. Change anything you like and send it again.
          </p>
        )}
        <p className="text-sm text-muted">
          Step {step + 1} of {reviewStep + 1}
        </p>
        <h2 className="text-3xl">{e.name}</h2>
        <p className="text-muted">
          {formatDate(e.date)} at {formatTime(e.startTime)}, {e.venueName}
        </p>
        <p className="mt-2">
          We&apos;ve saved {e.maxGuests} {e.maxGuests === 1 ? "seat" : "seats"} for{" "}
          {onlySome ? whoFor(named.map(nameOf), spots.length) : "you"}.
        </p>

        <div className="mt-6 space-y-6">
          {named.map((g) => {
            const value = answers[key(g.id, e.id)];
            return (
              <fieldset key={g.id} className="rounded-2xl border border-accent-soft p-4">
                <legend className="px-1 text-lg">{nameOf(g)}</legend>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    aria-pressed={value === true}
                    onClick={() => setAnswers({ ...answers, [key(g.id, e.id)]: true })}
                    className={`rounded-xl border px-4 py-3 text-lg ${value === true ? "border-accent bg-accent text-paper" : "border-accent-soft bg-white"}`}
                  >
                    Coming
                  </button>
                  <button
                    type="button"
                    aria-pressed={value === false}
                    onClick={() => setAnswers({ ...answers, [key(g.id, e.id)]: false })}
                    className={`rounded-xl border px-4 py-3 text-lg ${value === false ? "border-accent bg-accent text-paper" : "border-accent-soft bg-white"}`}
                  >
                    Can&apos;t make it
                  </button>
                </div>
              </fieldset>
            );
          })}

          {spots.length > 0 && (
            <fieldset className="rounded-2xl border border-accent-soft p-4">
              <legend className="px-1 text-lg">{named.length > 0 ? "How many others are coming?" : "How many people are coming?"}</legend>
              <p className="text-sm text-muted">
                {locked ? "You can add others once someone above is coming." : `Up to ${spots.length}`}
              </p>
              <div className="mt-3 flex items-center justify-center gap-6">
                <button
                  type="button"
                  aria-label="One fewer"
                  disabled={count === 0}
                  onClick={() => setExtras({ ...extras, [e.id]: count - 1 })}
                  className={roundButton}
                >
                  &minus;
                </button>
                <output aria-live="polite" className="w-12 text-center text-3xl">
                  {count}
                </output>
                <button
                  type="button"
                  aria-label="One more"
                  disabled={locked || count >= spots.length}
                  onClick={() => setExtras({ ...extras, [e.id]: count + 1 })}
                  className={roundButton}
                >
                  +
                </button>
              </div>
              {count > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted">Their names, if you&apos;d like to tell us (optional)</p>
                  {spots.slice(0, count).map((g) => (
                    <input
                      key={g.id}
                      type="text"
                      maxLength={100}
                      aria-label={`Name of extra guest ${slots.indexOf(g) + 1} (optional)`}
                      placeholder={`Extra guest ${slots.indexOf(g) + 1}`}
                      value={slotNames[g.id] ?? ""}
                      onChange={(ev) => setSlotNames({ ...slotNames, [g.id]: ev.target.value })}
                      className={`${inputClass} mt-2`}
                    />
                  ))}
                </div>
              )}
            </fieldset>
          )}
        </div>

        <ErrorText message={error} />
        <div className="mt-4 space-y-3">
          <button type="button" onClick={() => nextFromEvent(e)} className={primaryButton}>
            Next
          </button>
          {step > 0 && (
            <button type="button" onClick={() => go(step - 1)} className={secondaryButton}>
              Back
            </button>
          )}
        </div>
        {help}
      </div>
    );
  }

  // ---------- Extras ----------
  if (step === extrasStep) {
    const coming = guests.filter(attendingAny);
    return (
      <div className="mt-8">
        <p className="text-sm text-muted">
          Step {step + 1} of {reviewStep + 1}
        </p>
        <h2 className="text-3xl">A few more things</h2>
        {coming.length > 0 && (
          <div className="mt-6 space-y-4">
            <p className="text-lg">Any allergies or dietary needs?</p>
            {coming.map((g) => (
              <label key={g.id} className="block">
                {nameOf(g)}
                <input
                  type="text"
                  maxLength={300}
                  placeholder="e.g. nut allergy, vegetarian"
                  value={dietary[g.id] ?? ""}
                  onChange={(ev) => setDietary({ ...dietary, [g.id]: ev.target.value })}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
        )}
        <label className="mt-6 block text-lg">
          A song that will get you dancing (optional)
          <input type="text" maxLength={200} value={songRequest} onChange={(ev) => setSongRequest(ev.target.value)} className={inputClass} />
        </label>
        <label className="mt-6 block text-lg">
          A message for us (optional)
          <textarea rows={4} maxLength={1000} value={message} onChange={(ev) => setMessage(ev.target.value)} className={inputClass} />
        </label>
        <div className="mt-8 space-y-3">
          <button type="button" onClick={() => go(reviewStep)} className={primaryButton}>
            Next
          </button>
          <button type="button" onClick={() => go(step - 1)} className={secondaryButton}>
            Back
          </button>
        </div>
        {help}
      </div>
    );
  }

  // ---------- Confirm ----------
  return (
    <div className="mt-8">
      <p className="text-sm text-muted">
        Step {step + 1} of {reviewStep + 1}
      </p>
      <h2 className="text-3xl">Please confirm</h2>
      <ul className="mt-6 space-y-4">
        {events.map((e) => {
          const coming = comingTo(e);
          const names = coming.flatMap((g) => (g.isSlot ? (slotNames[g.id]?.trim() ? [slotNames[g.id].trim()] : []) : [nameOf(g)]));
          const unnamed = coming.length - names.length;
          return (
            <li key={e.id} className="rounded-2xl border border-accent-soft p-4">
              <p className="font-display text-2xl">{e.name}</p>
              <p className="text-lg">
                {coming.length === 0 ? "No one from your party is coming." : `You are RSVP'ing ${people(coming.length)}.`}
              </p>
              {names.length > 0 && (
                <p className="text-muted">{joinList(unnamed > 0 ? [...names, `${unnamed} more`] : names)}</p>
              )}
            </li>
          );
        })}
      </ul>
      <ErrorText message={error} />
      <div className="mt-4 space-y-3">
        <button type="button" onClick={send} disabled={sending} className={primaryButton}>
          {sending ? "Sending..." : "Confirm and send"}
        </button>
        <button type="button" onClick={() => go(extrasStep)} disabled={sending} className={secondaryButton}>
          Back
        </button>
      </div>
      {help}
    </div>
  );
}

function ErrorText({ message }: { message: string | null }) {
  return (
    <p role="alert" className="mt-4 min-h-6 text-[#9b2c2c]">
      {message}
    </p>
  );
}
