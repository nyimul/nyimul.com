/**
 * nyimul.com/hridee/enter  (the only page a visitor can see without signing in)
 *
 * The invitation password, then a name lookup. After that the visitor has a signed session
 * for their party and every other /hridee page shows their version of the site: their name,
 * and only the events they are invited to. proxy.ts sends everyone without a session here.
 *
 * Deliberately shows nothing about the events, venues or guest list.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { couple } from "../../_lib/content";
import { getCurrentParty } from "../../_lib/party";
import { getSession } from "../../_lib/session";
import { safeNextPath } from "../../_lib/sessionToken";
import EnterForm from "./EnterForm";

export const metadata: Metadata = { title: "Welcome" };

export default async function EnterPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : null);

  // Already signed in (and the party still exists): straight through.
  if (await getCurrentParty()) redirect(nextPath);

  const session = await getSession();

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-center font-display text-5xl">
        {couple.names[0]} &amp; {couple.names[1]}
      </h1>
      <p className="mt-3 text-center text-lg text-muted">We&apos;re so glad you&apos;re here.</p>
      <EnterForm
        startAt={session?.stage === "password" ? "name" : "password"}
        next={nextPath}
        contactEmail={couple.contactEmail}
      />
    </main>
  );
}
