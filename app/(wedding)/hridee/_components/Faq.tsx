/**
 * FAQ (guide: "useful for large or complex weddings", and three events across two venues counts).
 * Data: `faq` in content.ts. Questions tagged with `eventIds` only appear for parties invited
 * to one of those events, so a Reception-only guest never reads about the Nikkah here.
 * Native <details>/<summary>: keyboard and screen-reader accessible, works without JS, and old
 * phones handle it. Each summary is a big tappable row with a chevron that turns when open.
 * Web addresses (lashkaraa.com, https://...) and emails inside an answer become tappable links,
 * and a line break in an answer stays a line break. This runs on the server.
 */
import { Fragment } from "react";
import { faq } from "../../_lib/content";
import { visibleTo } from "../../_lib/party";
import type { EventId } from "../../_lib/types";
import { chapterPhotos } from "../../_photos";
import Section from "./Section";

/** One capture group, so split() alternates plain text and matches. Skips the domain inside an email. */
const LINK = /(https?:\/\/[^\s]+|[\w.+-]+@[\w-]+\.[\w.-]+|(?<![\w@.-])[\w-]+\.(?:com|org|net|co)\b[^\s]*)/g;

function linkify(text: string) {
  return text.split(LINK).map((part, i) => {
    if (i % 2 === 0) return part;
    const link = part.replace(/[.,;:!?)]+$/, ""); // "lashkaraa.com." keeps its full stop outside the link
    const tail = part.slice(link.length);
    const isEmail = link.includes("@");
    const href = isEmail ? `mailto:${link}` : link.startsWith("http") ? link : `https://${link}`;
    return (
      <Fragment key={i}>
        <a href={href} target={isEmail ? undefined : "_blank"} rel={isEmail ? undefined : "noopener noreferrer"} className="text-accent underline underline-offset-4">
          {link}
        </a>
        {tail}
      </Fragment>
    );
  });
}

export default function Faq({ invitedEventIds }: { invitedEventIds: EventId[] }) {
  return (
    <Section id="faq" title="Questions" photo={chapterPhotos.faq}>
      <div className="divide-y divide-accent-soft border-y border-accent-soft">
        {visibleTo(faq, invitedEventIds).map((item) => (
          <details key={item.question}>
            <summary className="faq-summary flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-semibold">
              <span>{item.question}</span>
              <svg aria-hidden="true" className="faq-chevron h-5 w-5 shrink-0 text-accent" viewBox="0 0 20 20" fill="none">
                <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <p className="whitespace-pre-line pb-5 text-muted">{item.answer ? linkify(item.answer) : "TODO"}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
