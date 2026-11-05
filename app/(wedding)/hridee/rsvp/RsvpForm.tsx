"use client";

/**
 * The RSVP stepper, one screen at a time:
 *   one screen per event the party is invited to  ->  extras (dietary, song, message)  ->  review  ->  thank you
 *
 * It only ever receives the signed-in party's guests and events (see page.tsx). Seat limits
 * are greyed out here as a courtesy; submitRsvp enforces them on the server.
 */
import Link from "next/link";
import { useState, useTransition } from "react";
import { formatDate, formatTime } from "../../_lib/format";
import type { EventId, Guest } from "../../_lib/types";
import { submitRsvp } from "./actions";

export type RsvpEvent = {
  id: EventId;
  name: string;
  date: string;
  startTime: string;
  venueName: string;
  maxGuests: number;
};

type Props = {
  guests: Guest[];
  events: RsvpEvent[];
  initialAnswers: Record<string, boolean>; // `${guestId}:${eventId}` -> attending
  initialDietary: Record<string, string>;
  initialSongRequest: string;
  initialMessage: string;
  submittedAt: string | null;
  deadline: string;
  contactEmail: string;
};

const key = (guestId: string, eventId: EventId) => `${guestId}:${eventId}`;
const primaryButton = "w-full rounded-full bg-accent px-8 py-4 text-lg text-paper disabled:opacity-60";
const secondaryButton = "w-full rounded-full border border-accent px-8 py-4 text-lg text-accent";
const inputClass =
  "mt-1 block w-full rounded-xl border border-accent-soft bg-white px-4 py-3 text-lg text-ink outline-none focus:border-accent";

export default function RsvpForm(props: Props) {
  const { guests, events, contactEmail } = props;

  const [answers, setAnswers] = useState<Record<string, boolean>>(() => {
    // Unnamed "+1"/child slots start as "not coming" so nobody has to answer for a person who doesn't exist.
    const start = { ...props.initialAnswers };
    for (const g of guests) for (const e of events) if (g.isSlot && start[key(g.id, e.id)] === undefined) start[key(g.id, e.id)] = false;
    return start;
  });
  const [slotNames, setSlotNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(guests.filter((g) => g.isSlot).map((g) => [g.id, g.fullName ?? ""])),
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

  const nameOf = (g: Guest, i: number) =>
    g.isSlot ? slotNames[g.id]?.trim() || (g.isChild ? "Child" : `Guest ${i + 1}`) : (g.fullName ?? "Guest");
  const attendingAny = (g: Guest) => events.some((e) => answers[key(g.id, e.id)]);

  function go(to: number) {
    setError(null);
    setStep(to);
    window.scrollTo({ top: 0 });
  }

  function nextFromEvent(e: RsvpEvent) {
    const missing = guests.filter((g) => answers[key(g.id, e.id)] === undefined);
    if (missing.length > 0) return setError(`Please choose yes or no for ${missing.map((g) => nameOf(g, guests.indexOf(g))).join(", ")}.`);
    const unnamed = guests.filter((g) => g.isSlot && answers[key(g.id, e.id)] && !slotNames[g.id]?.trim());
    if (unnamed.length > 0) return setError("Please type the name of each extra guest who is coming.");
    go(step + 1);
  }

  function send() {
    setError(null);
    startSending(async () => {
      const result = await submitRsvp({
        answers: guests.flatMap((g) => events.map((e) => ({ guestId: g.id, eventId: e.id, attending: !!answers[key(g.id, e.id)] }))),
        slotNames: Object.fromEntries(Object.entries(slotNames).map(([id, n]) => [id, n.trim()])),
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
    const coming = guests.filter((g) => answers[key(g.id, e.id)]).length;
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
          We&apos;ve saved {e.maxGuests} {e.maxGuests === 1 ? "seat" : "seats"} for you.
        </p>

        <div className="mt-6 space-y-6">
          {guests.map((g, i) => {
            const value = answers[key(g.id, e.id)];
            const seatsFull = coming >= e.maxGuests && !value;
            return (
              <fieldset key={g.id} className="rounded-2xl border border-accent-soft p-4">
                <legend className="px-1 text-lg">{nameOf(g, i)}</legend>
                {g.isSlot && (
                  <label className="mb-3 block text-sm text-muted">
                    {g.isChild ? "Child's name" : "Guest's name"}
                    <input
                      type="text"
                      maxLength={100}
                      value={slotNames[g.id] ?? ""}
                      onChange={(ev) => setSlotNames({ ...slotNames, [g.id]: ev.target.value })}
                      className={inputClass}
                    />
                  </label>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    aria-pressed={value === true}
                    disabled={seatsFull}
                    onClick={() => setAnswers({ ...answers, [key(g.id, e.id)]: true })}
                    className={`rounded-xl border px-4 py-3 text-lg disabled:opacity-40 ${value === true ? "border-accent bg-accent text-paper" : "border-accent-soft bg-white"}`}
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
                {seatsFull && <p className="mt-2 text-sm text-muted">All your seats for this event are taken.</p>}
              </fieldset>
            );
          })}
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
                {nameOf(g, guests.indexOf(g))}
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

  // ---------- Review ----------
  return (
    <div className="mt-8">
      <p className="text-sm text-muted">
        Step {step + 1} of {reviewStep + 1}
      </p>
      <h2 className="text-3xl">Does this look right?</h2>
      <ul className="mt-6 space-y-4">
        {events.map((e) => {
          const yes = guests.filter((g) => answers[key(g.id, e.id)]).map((g) => nameOf(g, guests.indexOf(g)));
          return (
            <li key={e.id} className="rounded-2xl border border-accent-soft p-4">
              <p className="font-display text-2xl">{e.name}</p>
              <p className="text-lg">{yes.length > 0 ? `Coming: ${yes.join(", ")}` : "No one from your party"}</p>
            </li>
          );
        })}
      </ul>
      <ErrorText message={error} />
      <div className="mt-4 space-y-3">
        <button type="button" onClick={send} disabled={sending} className={primaryButton}>
          {sending ? "Sending..." : "Send my RSVP"}
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
