/** Display helpers. Data in content.ts stays machine-friendly (ISO dates, 24h times). */

/** "18:30" -> "6:30 PM", "09:00" -> "9:00 AM". */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * "2027-04-09" -> "Friday, April 9, 2027". Written out in full on purpose (WEDDING.md: never "04/09").
 * Noon UTC + timeZone UTC keeps the day from shifting for guests in other time zones.
 */
export function formatDate(isoDate: string, options: { weekday?: boolean } = { weekday: true }): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: options.weekday ? "long" : undefined,
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

/** Today's date in Atlanta as "YYYY-MM-DD", for comparing against ISO dates like the RSVP deadline. */
export function todayInAtlanta(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

/** RSVPs stay open through the whole deadline day, Atlanta time. */
export function isRsvpClosed(deadline: string): boolean {
  return todayInAtlanta() > deadline;
}
