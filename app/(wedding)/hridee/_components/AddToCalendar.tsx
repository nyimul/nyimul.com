"use client";

/**
 * AddToCalendar: the "Add to calendar" button on an event card. Tapping it reveals two choices
 * under the buttons: a Google Calendar link (opens the web or app with the event filled in, for
 * Android phones and anyone with a Google account) and the .ics file (Apple Calendar on iPhone
 * and Mac, Outlook, and most other calendars). One tap more than a bare .ics link, but the file
 * alone left Google users with a download they did not know what to do with.
 * Rendered inside the card's two-column button grid: the button is one cell, the choices span
 * the full width underneath. The links are built on the server (Events.tsx) and passed in.
 */
import { useState } from "react";
import { smallButton } from "../../_lib/ui";

type Props = { icsUrl: string; googleUrl: string };

export default function AddToCalendar({ icsUrl, googleUrl }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={smallButton}>
        Add to calendar
      </button>
      {open && (
        <div className="fade-in col-span-2 grid grid-cols-2 gap-3 rounded-2xl bg-accent-soft/50 p-3">
          <a href={googleUrl} target="_blank" rel="noopener noreferrer" className={smallButton}>
            Google Calendar
          </a>
          <a href={icsUrl} className={smallButton}>
            Apple or Outlook
          </a>
        </div>
      )}
    </>
  );
}
