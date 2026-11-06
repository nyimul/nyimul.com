/**
 * "Add to calendar": builds the .ics file for one event, served by /hridee/calendar/<id>.ics.
 *
 * Times in content.ts are Atlanta wall-clock times. They are converted to UTC here so the entry
 * lands at the right hour for a guest in any time zone (a "floating" time would show 9:30 in
 * California for a 9:30 Atlanta event). If an event has no endTime, the entry lasts DEFAULT_HOURS.
 */
import "server-only";
import { couple } from "./content";
import type { WeddingEvent } from "./types";

/** The events are in Atlanta. Keep in step with todayInAtlanta() in format.ts. */
const TIME_ZONE = "America/New_York";
const DEFAULT_HOURS = 3;

/** "2027-04-09" + "09:30" in Atlanta -> the UTC instant (handles daylight saving for that date). */
function atlantaToUtc(isoDate: string, time: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(guess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wallClock = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return new Date(guess - (wallClock - guess));
}

/** 2027-04-09T13:30:00.000Z -> 20270409T133000Z */
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** RFC 5545 text escaping. */
const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** RFC 5545 lines are at most 75 bytes; longer ones continue on the next line after a space. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest, "utf8") > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut), "utf8") > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

export function buildIcs(event: WeddingEvent): string {
  const start = atlantaToUtc(event.date, event.startTime);
  const end = event.endTime ? atlantaToUtc(event.date, event.endTime) : new Date(start.getTime() + DEFAULT_HOURS * 3_600_000);
  const names = `${couple.names[0]} & ${couple.names[1]}`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${names}//Wedding//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    // Stable per event, so adding it twice updates the entry instead of duplicating it.
    `UID:${event.id}@hridee.nyimul.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText(`${event.name} - ${names}`)}`,
    `LOCATION:${escapeText(`${event.venue.name}, ${event.venue.address}`)}`,
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => line !== null);

  return `${lines.map(fold).join("\r\n")}\r\n`;
}
