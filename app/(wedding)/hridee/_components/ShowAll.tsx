"use client";

/**
 * ShowAll: a list that starts with its first few rows and a "Show all" button. Tapping it fades
 * in the remaining rows (a quick cascade) and then whatever comes after the list, such as the
 * group's photo. One way on purpose: a guest who opened a list wants to read it; no "show less".
 * The rows are rendered by the server component (ThingsToDo.tsx) and passed in, so nothing from
 * content.ts is imported here. A list with no extra rows shows its photo straight away.
 */
import { useState, type ReactNode } from "react";
import { smallButton } from "../../_lib/ui";

type Props = {
  /** One element per row, already rendered. */
  rows: ReactNode[];
  /** How many rows to show before the button. */
  initial: number;
  /** The button text. */
  label: string;
  /** Shown under the list once everything is visible (the group's photo). */
  after?: ReactNode;
  className?: string;
};

export default function ShowAll({ rows, initial, label, after, className }: Props) {
  const [open, setOpen] = useState(false);
  const hasMore = rows.length > initial;
  const shown = open ? rows : rows.slice(0, initial);

  return (
    <>
      <ul className={className}>
        {shown.map((row, i) => (
          <li
            key={i}
            className={open && i >= initial ? "fade-in" : undefined}
            style={open && i >= initial ? { animationDelay: `${(i - initial) * 40}ms` } : undefined}
          >
            {row}
          </li>
        ))}
      </ul>
      {hasMore && !open && (
        <div className="mx-auto mt-6 max-w-xs">
          <button type="button" onClick={() => setOpen(true)} className={smallButton}>
            {label}
          </button>
        </div>
      )}
      {after && (open || !hasMore) && (
        <div className={open ? "fade-in mt-6" : "mt-6"} style={open ? { animationDelay: `${(rows.length - initial) * 40}ms` } : undefined}>
          {after}
        </div>
      )}
    </>
  );
}
