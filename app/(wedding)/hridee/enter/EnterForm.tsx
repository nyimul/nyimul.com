"use client";

/**
 * The entrance stepper. One question per screen, visible labels, one big button, and the
 * contact email on every step (WEDDING.md > Design > For older guests).
 *
 *   1. Password   the word printed on the invitation
 *   2. Name       their first and last name, or a family member's. Everyone gets the same
 *                 evite, so nothing tells a guest how their name is spelled on our list.
 *   3. Pick       "Is this you?" (always shown, even for one match, so nobody lands in
 *                 someone else's version of the site by accident)
 */
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { helpText, inputClass, primaryButton, textButton } from "../../_lib/ui";
import { checkPassword, lookupParty, selectParty, type LookupState, type PasswordState } from "./actions";

type Props = {
  startAt: "password" | "name";
  next: string;
  contactEmail: string;
};

export default function EnterForm({ startAt, next, contactEmail }: Props) {
  const [pw, passwordAction] = useActionState<PasswordState, FormData>(checkPassword, { ok: false });
  const [lookup, lookupAction] = useActionState<LookupState, FormData>(lookupParty, { status: "idle" });
  // Lets "Search again" go back from the picker without throwing the results away mid-render.
  const [dismissedNonce, setDismissedNonce] = useState<number | null>(null);

  const help = (
    <p className={helpText}>
      Need help? Email <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
    </p>
  );

  // ---------- Step 1 ----------
  if (startAt === "password" && !pw.ok) {
    return (
      <form action={passwordAction} className="mt-8">
        <label htmlFor="password" className="block text-lg font-semibold">
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
      <div className="mt-8 text-center">
        <p className="text-lg">That took a little while, so we need the password again.</p>
        <a href="/hridee/enter" className={`${primaryButton} mt-6`}>
          Start again
        </a>
        {help}
      </div>
    );
  }

  // ---------- Step 3 ----------
  if (lookup.status === "results" && lookup.nonce !== dismissedNonce) {
    return (
      <div className="mt-8">
        <h2 className="text-3xl">{lookup.matches.length === 1 ? "Is this you?" : "Which one is you?"}</h2>
        <form action={selectParty} className="mt-5 space-y-3">
          <input type="hidden" name="next" value={next} />
          <PartyButtons matches={lookup.matches} />
        </form>
        <button type="button" onClick={() => setDismissedNonce(lookup.nonce)} className={`${textButton} mt-5 w-full`}>
          No, search again
        </button>
        {help}
      </div>
    );
  }

  // ---------- Step 2 ----------
  return (
    <form action={lookupAction} className="mt-8">
      <label htmlFor="name" className="block text-lg font-semibold">
        Enter your first and last name
      </label>
      <p id="name-help" className="text-muted">
        Or the name of someone in your family.
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
              ? "We couldn't find that name. Check the spelling, or try someone else in your family. Or email us and we'll sort it out."
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
    <button type="submit" disabled={pending} className={`${primaryButton} mt-5`}>
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
      className="block w-full rounded-3xl border-2 border-accent-soft bg-white px-5 py-4 text-left transition-colors hover:border-accent disabled:opacity-60"
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
