"use client";

/**
 * The entrance stepper. One question per screen, visible labels, one big button, and the
 * contact email on every step (WEDDING.md > Design > For older guests).
 *
 *   1. Password   the word printed on the invitation
 *   2. Name       "your first and last name, as on your invitation"
 *   3. Pick       "Is this you?" (always shown, even for one match, so nobody lands in
 *                 someone else's version of the site by accident)
 */
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { checkPassword, lookupParty, selectParty, type LookupState, type PasswordState } from "./actions";

type Props = {
  startAt: "password" | "name";
  next: string;
  contactEmail: string;
};

const inputClass =
  "mt-2 block w-full rounded-xl border border-accent-soft bg-white px-4 py-3 text-lg text-ink outline-none focus:border-accent";
const primaryButton =
  "mt-6 w-full rounded-full bg-accent px-8 py-4 text-lg text-paper disabled:opacity-60";

export default function EnterForm({ startAt, next, contactEmail }: Props) {
  const [pw, passwordAction] = useActionState<PasswordState, FormData>(checkPassword, { ok: false });
  const [lookup, lookupAction] = useActionState<LookupState, FormData>(lookupParty, { status: "idle" });
  // Lets "Search again" go back from the picker without throwing the results away mid-render.
  const [dismissedNonce, setDismissedNonce] = useState<number | null>(null);

  const help = (
    <p className="mt-8 text-center text-sm text-muted">
      Need help? Email <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
    </p>
  );

  // ---------- Step 1 ----------
  if (startAt === "password" && !pw.ok) {
    return (
      <form action={passwordAction} className="mt-10">
        <label htmlFor="password" className="block text-lg">
          Password
        </label>
        <p id="password-help" className="text-muted">
          It&apos;s printed on your invitation.
        </p>
        <input
          id="password"
          name="password"
          type="text"
          required
          maxLength={100}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby="password-help password-error"
          className={inputClass}
        />
        <ErrorText id="password-error" message={pw.error} />
        <SubmitButton label="Continue" pendingLabel="Checking..." />
        {help}
      </form>
    );
  }

  if (lookup.status === "expired") {
    return (
      <div className="mt-10 text-center">
        <p className="text-lg">That took a little while, so we need the password again.</p>
        <a href="/hridee/enter" className={`${primaryButton} inline-block no-underline`}>
          Start again
        </a>
        {help}
      </div>
    );
  }

  // ---------- Step 3 ----------
  if (lookup.status === "results" && lookup.nonce !== dismissedNonce) {
    return (
      <div className="mt-10">
        <h2 className="text-2xl">{lookup.matches.length === 1 ? "Is this you?" : "Which one is you?"}</h2>
        <form action={selectParty} className="mt-6 space-y-3">
          <input type="hidden" name="next" value={next} />
          <PartyButtons matches={lookup.matches} />
        </form>
        <button
          type="button"
          onClick={() => setDismissedNonce(lookup.nonce)}
          className="mt-6 w-full py-3 text-center text-accent underline"
        >
          No, search again
        </button>
        {help}
      </div>
    );
  }

  // ---------- Step 2 ----------
  return (
    <form action={lookupAction} className="mt-10">
      <label htmlFor="name" className="block text-lg">
        Your first and last name
      </label>
      <p id="name-help" className="text-muted">
        As written on your invitation.
      </p>
      <input
        id="name"
        name="name"
        type="text"
        required
        maxLength={100}
        autoComplete="name"
        defaultValue={"query" in lookup ? lookup.query : ""}
        aria-describedby="name-help name-error"
        className={inputClass}
      />
      <ErrorText
        id="name-error"
        message={
          lookup.status === "error"
            ? lookup.error
            : lookup.status === "none"
              ? "We couldn't find that name. Try the spelling on your invitation, or email us and we'll sort it out."
              : undefined
        }
      />
      <SubmitButton label="Find my invitation" pendingLabel="Searching..." />
      {help}
    </form>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={primaryButton}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function PartyButtons({ matches }: { matches: Extract<LookupState, { status: "results" }>["matches"] }) {
  const { pending } = useFormStatus();
  return matches.map((m) => (
    <button
      key={m.partyId}
      type="submit"
      name="partyId"
      value={m.partyId}
      disabled={pending}
      className="block w-full rounded-2xl border border-accent-soft bg-white px-5 py-4 text-left disabled:opacity-60"
    >
      <span className="block font-display text-2xl">{m.displayName}</span>
      {m.firstNames.length > 0 && <span className="block text-muted">{m.firstNames.join(", ")}</span>}
    </button>
  ));
}

function ErrorText({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} role="alert" className="mt-3 min-h-6 text-[#9b2c2c]">
      {message}
    </p>
  );
}
