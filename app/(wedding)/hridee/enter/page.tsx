/**
 * nyimul.com/hridee/enter  (the only page a visitor can see without signing in)
 *
 * The invitation password, then a name lookup. After that the visitor has a signed session
 * for their party and every other /hridee page shows their version of the site: their name,
 * and only the events they are invited to. proxy.ts sends everyone without a session here.
 *
 * Layout: the engagement photo on top (a portrait crop) with the monogram as a crest, then the
 * form, all visible without scrolling on a phone. On wide screens the photo fills the left half.
 * Deliberately shows nothing about the events, venues or guest list.
 */
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { couple } from "../../_lib/content";
import { getCurrentParty } from "../../_lib/party";
import { getSession } from "../../_lib/session";
import { safeNextPath } from "../../_lib/sessionToken";
import { enterPhoto, monogram } from "../../_photos";
import Photo from "../_components/Photo";
import EnterForm from "./EnterForm";

export const metadata: Metadata = { title: "Welcome" };

export default async function EnterPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : null);

  // Already signed in (and the party still exists): straight through.
  if (await getCurrentParty()) redirect(nextPath);

  const session = await getSession();

  return (
    <main className="min-h-svh lg:grid lg:grid-cols-2">
      <div className="relative h-[42svh] min-h-[300px] overflow-hidden bg-ink short:h-[34svh] short:min-h-[220px] lg:h-auto lg:min-h-svh">
        <Photo photo={enterPhoto} sizes="(min-width: 1024px) 50vw, 100vw" eager />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-b from-transparent to-paper lg:hidden" />
      </div>

      <div className="relative -mt-14 px-6 pb-12 short:-mt-12 lg:mt-0 lg:flex lg:flex-col lg:justify-center lg:px-16 lg:py-16">
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-paper short:h-24 short:w-24 lg:h-32 lg:w-32">
          <Image src={monogram} alt="" width={96} height={67} loading="eager" className="h-auto w-20 short:w-16 lg:w-24" />
        </div>
        <h1 className="mt-3 text-center text-4xl short:mt-1 short:text-3xl md:text-5xl">
          {couple.names[0]} <em className="ampersand">&amp;</em> {couple.names[1]}
        </h1>
        <p className="mt-2 text-center text-lg text-muted short:mt-1 short:text-base">We&apos;re so glad you&apos;re here.</p>
        <div className="mx-auto w-full max-w-md">
          <EnterForm
            startAt={session?.stage === "password" ? "name" : "password"}
            next={nextPath}
            contactEmail={couple.contactEmail}
          />
        </div>
      </div>
    </main>
  );
}
