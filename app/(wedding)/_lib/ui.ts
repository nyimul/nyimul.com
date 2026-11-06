/**
 * Shared class strings so every button, input and card on the wedding site looks the same.
 * Sizes follow WEDDING.md > Design > For older guests: 56px buttons and inputs, 48px small
 * buttons, 18px text, generous spacing. Change a look here and it changes everywhere.
 */

/** The one main action on a screen (Continue, RSVP, Next, Confirm and send). */
export const primaryButton =
  "inline-flex min-h-14 w-full items-center justify-center rounded-full bg-accent px-8 py-3 text-center text-lg font-semibold text-white no-underline transition-opacity hover:opacity-90 disabled:opacity-60";

/** Same as primaryButton, for use over a photo. */
export const lightButton =
  "inline-flex min-h-14 w-full items-center justify-center rounded-full bg-white px-8 py-3 text-center text-lg font-semibold text-accent no-underline transition-opacity hover:opacity-90 disabled:opacity-60";

/** Back, and other second choices. */
export const secondaryButton =
  "inline-flex min-h-14 w-full items-center justify-center rounded-full border-2 border-accent bg-transparent px-8 py-3 text-center text-lg font-semibold text-accent no-underline hover:bg-accent-soft/60 disabled:opacity-60";

/** Side-by-side actions inside a card (Get directions, Add to calendar). */
export const smallButton =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full border-2 border-accent px-3 py-2 text-center text-base font-semibold text-accent no-underline hover:bg-accent-soft/60";

/** A plain text link that is still 44px tall to tap. */
export const textButton =
  "inline-flex min-h-11 items-center justify-center px-2 py-2 text-center text-accent underline underline-offset-4";

export const inputClass =
  "mt-2 block w-full min-h-14 rounded-2xl border-2 border-accent-soft bg-white px-4 py-3 text-lg text-ink outline-none placeholder:text-muted/70 focus:border-accent";

export const cardClass =
  "rounded-3xl border border-accent-soft bg-card p-5 shadow-[0_1px_2px_rgba(30,33,48,0.04)] md:p-6";

/** Coming / Can't make it. */
export function choiceButton(selected: boolean) {
  return `inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3 text-lg font-semibold transition-colors ${
    selected ? "border-accent bg-accent text-white" : "border-accent-soft bg-white text-ink"
  }`;
}

/** The - and + of the "how many others" counter. */
export const roundButton =
  "inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent text-3xl leading-none text-accent disabled:opacity-30";

export const helpText = "mt-8 text-center text-[15px] text-muted";
