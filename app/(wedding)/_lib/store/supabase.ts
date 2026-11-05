/**
 * GuestStore backed by the wedding Supabase project (tables in supabase/schema.sql).
 * Uses the secret-key client, so it is server-only and every query is scoped by partyId here.
 * Parties removed from the Google Sheet have archived_at set; guest-facing reads skip them.
 */
import "server-only";
import { supabaseAdmin } from "../supabase.server";
import type { EventId, RsvpPartyData } from "../types";
import { firstName, pickMatches } from "../names";
import type { GuestStore, Snapshot } from "./types";

type GuestRow = {
  id: string;
  full_name: string | null;
  is_slot: boolean;
  is_child: boolean;
  sort_order: number;
};

type ResponseRow = { song_request: string | null; message: string | null; submitted_at: string | null };

function fail(what: string, error: { message: string }): never {
  // Logged on the server only. The action that called us shows the guest a friendly message.
  console.error(`[wedding] ${what}:`, error.message);
  throw new Error(`Database error while trying to ${what}`);
}

/** Supabase returns at most 1000 rows per request, so read big tables a page at a time. */
async function selectAll<T>(table: string, columns: string, orderBy: string[], activeOnly = false): Promise<T[]> {
  const pageSize = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    let query = supabaseAdmin().from(table).select(columns);
    if (activeOnly) query = query.is("archived_at", null);
    for (const col of orderBy) query = query.order(col);
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) fail(`read ${table}`, error);
    all.push(...(data as T[]));
    if (!data || data.length < pageSize) return all;
  }
}

/** Long id lists go in the URL of a request, so send them in batches. */
function chunks<T>(items: T[], size = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export const supabaseStore: GuestStore = {
  async findParties(query, limit) {
    // A wedding has a few hundred invitations, so match in code: that allows typos and
    // spelling variants, which a SQL LIKE can't do.
    type Row = { id: string; display_name: string; search_name: string; guests: Pick<GuestRow, "full_name" | "sort_order">[] };
    const parties = await selectAll<Row>(
      "parties",
      "id, display_name, search_name, guests(full_name, sort_order)",
      ["display_name", "id"],
      true,
    );
    return pickMatches(parties, (p) => p.search_name.split(" | "), query)
      .slice(0, limit)
      .map((p) => ({
        partyId: p.id,
        displayName: p.display_name,
        firstNames: [...p.guests]
          .sort((a, b) => a.sort_order - b.sort_order)
          .flatMap((g) => (g.full_name ? [firstName(g.full_name)] : [])),
      }));
  },

  async getPartySummary(partyId) {
    const { data, error } = await supabaseAdmin()
      .from("parties")
      .select("id, display_name, party_events(event_id)")
      .eq("id", partyId)
      .is("archived_at", null)
      .maybeSingle();
    if (error) fail("load a party", error);
    if (!data) return null;

    const row = data as { id: string; display_name: string; party_events: { event_id: EventId }[] };
    return {
      partyId: row.id,
      displayName: row.display_name,
      invitedEventIds: row.party_events.map((pe) => pe.event_id),
    };
  },

  async getRsvpPartyData(partyId) {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("parties")
      .select(
        "id, display_name, guests(id, full_name, is_slot, is_child, sort_order), party_events(event_id, max_guests, guest_ids), party_responses(song_request, message, submitted_at)",
      )
      .eq("id", partyId)
      .is("archived_at", null)
      .maybeSingle();
    if (error) fail("load a party for RSVP", error);
    if (!data) return null;

    const row = data as {
      id: string;
      display_name: string;
      guests: GuestRow[];
      party_events: { event_id: EventId; max_guests: number; guest_ids: string[] | null }[];
      party_responses: ResponseRow | ResponseRow[] | null;
    };
    const guests = [...row.guests].sort((a, b) => a.sort_order - b.sort_order);

    let rsvps: RsvpPartyData["rsvps"] = [];
    if (guests.length > 0) {
      const res = await db
        .from("rsvps")
        .select("guest_id, event_id, attending, dietary_notes")
        .in(
          "guest_id",
          guests.map((g) => g.id),
        );
      if (res.error) fail("load RSVPs", res.error);
      rsvps = (res.data as { guest_id: string; event_id: EventId; attending: boolean; dietary_notes: string | null }[]).map(
        (r) => ({ guestId: r.guest_id, eventId: r.event_id, attending: r.attending, dietaryNotes: r.dietary_notes }),
      );
    }

    const response = Array.isArray(row.party_responses) ? (row.party_responses[0] ?? null) : row.party_responses;
    return {
      partyId: row.id,
      displayName: row.display_name,
      invitedEventIds: row.party_events.map((pe) => pe.event_id),
      guests: guests.map((g) => ({ id: g.id, fullName: g.full_name, isSlot: g.is_slot, isChild: g.is_child })),
      invitations: row.party_events.map((pe) => ({ eventId: pe.event_id, maxGuests: pe.max_guests, guestIds: pe.guest_ids })),
      rsvps,
      response: response
        ? { songRequest: response.song_request, message: response.message, submittedAt: response.submitted_at }
        : null,
    };
  },

  async saveRsvp(partyId, submission) {
    const db = supabaseAdmin();
    const now = new Date().toISOString();

    for (const [guestId, name] of Object.entries(submission.slotNames)) {
      const { error } = await db
        .from("guests")
        .update({ full_name: name })
        .eq("id", guestId)
        .eq("party_id", partyId)
        .eq("is_slot", true);
      if (error) fail("save a guest name", error);
    }

    if (submission.rsvps.length > 0) {
      const { error } = await db.from("rsvps").upsert(
        submission.rsvps.map((r) => ({
          guest_id: r.guestId,
          event_id: r.eventId,
          attending: r.attending,
          dietary_notes: r.dietaryNotes,
          updated_at: now,
        })),
        { onConflict: "guest_id,event_id" },
      );
      if (error) fail("save RSVPs", error);
    }

    const { error } = await db.from("party_responses").upsert(
      { party_id: partyId, song_request: submission.songRequest, message: submission.message, submitted_at: now },
      { onConflict: "party_id" },
    );
    if (error) fail("save the party response", error);
  },

  async recordAttempt(ip, kind) {
    const { error } = await supabaseAdmin().from("lookup_attempts").insert({ ip, kind });
    if (error) fail("record an attempt", error);
  },

  async countRecentAttempts(ip, kind, sinceMs) {
    const { count, error } = await supabaseAdmin()
      .from("lookup_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("kind", kind)
      .gte("created_at", new Date(sinceMs).toISOString());
    if (error) fail("count attempts", error);
    return count ?? 0;
  },

  async loadSnapshot(): Promise<Snapshot> {
    const [parties, guests, invitations, rsvps, responses] = await Promise.all([
      selectAll<{ id: string; display_name: string; archived_at: string | null }>(
        "parties",
        "id, display_name, archived_at",
        ["id"],
      ),
      selectAll<GuestRow & { party_id: string }>("guests", "id, party_id, full_name, is_slot, is_child, sort_order", ["id"]),
      selectAll<{ party_id: string; event_id: EventId; max_guests: number; guest_ids: string[] | null }>(
        "party_events",
        "party_id, event_id, max_guests, guest_ids",
        ["party_id", "event_id"],
      ),
      selectAll<{ guest_id: string; event_id: EventId; attending: boolean; dietary_notes: string | null; updated_at: string | null }>(
        "rsvps",
        "guest_id, event_id, attending, dietary_notes, updated_at",
        ["guest_id", "event_id"],
      ),
      selectAll<{ party_id: string } & ResponseRow>("party_responses", "party_id, song_request, message, submitted_at", ["party_id"]),
    ]);
    return {
      parties: parties.map((p) => ({ id: p.id, displayName: p.display_name, archived: p.archived_at !== null })),
      guests: guests.map((g) => ({
        id: g.id,
        partyId: g.party_id,
        fullName: g.full_name,
        isSlot: g.is_slot,
        isChild: g.is_child,
        sortOrder: g.sort_order,
      })),
      invitations: invitations.map((i) => ({
        partyId: i.party_id,
        eventId: i.event_id,
        maxGuests: i.max_guests,
        guestIds: i.guest_ids,
      })),
      rsvps: rsvps.map((r) => ({
        guestId: r.guest_id,
        eventId: r.event_id,
        attending: r.attending,
        dietaryNotes: r.dietary_notes,
        updatedAt: r.updated_at,
      })),
      responses: responses.map((r) => ({
        partyId: r.party_id,
        songRequest: r.song_request,
        message: r.message,
        submittedAt: r.submitted_at,
      })),
    };
  },

  // Not one transaction: if a step fails, the next sync works out the rest from scratch.
  // Each upsert below sends rows with identical keys, so PostgREST never fills a missing
  // column with null (that would wipe a name a guest typed into a +1 slot).
  async applySheetPlan(plan) {
    const db = supabaseAdmin();

    if (plan.upsertParties.length > 0) {
      const { error } = await db
        .from("parties")
        .upsert(plan.upsertParties.map((p) => ({ id: p.id, display_name: p.displayName, archived_at: null })));
      if (error) fail("save invitations", error);
    }

    for (const { eventId, guestIds } of plan.deleteRsvps) {
      for (const ids of chunks(guestIds)) {
        const { error } = await db.from("rsvps").delete().eq("event_id", eventId).in("guest_id", ids);
        if (error) fail("remove RSVPs for an event", error);
      }
    }

    for (const { partyId, eventId } of plan.deleteInvitations) {
      const { error } = await db.from("party_events").delete().eq("party_id", partyId).eq("event_id", eventId);
      if (error) fail("remove an event from an invitation", error);
    }

    for (const ids of chunks(plan.deleteGuestIds)) {
      const { error } = await db.from("guests").delete().in("id", ids);
      if (error) fail("remove guests", error);
    }

    if (plan.upsertNamedGuests.length > 0) {
      const { error } = await db.from("guests").upsert(
        plan.upsertNamedGuests.map((g) => ({
          id: g.id,
          party_id: g.partyId,
          full_name: g.fullName,
          is_slot: false,
          is_child: g.isChild,
          sort_order: g.sortOrder,
        })),
      );
      if (error) fail("save guests", error);
    }

    if (plan.upsertSlots.length > 0) {
      const { error } = await db.from("guests").upsert(
        plan.upsertSlots.map((g) => ({
          id: g.id,
          party_id: g.partyId,
          is_slot: true,
          is_child: g.isChild,
          sort_order: g.sortOrder,
        })),
      );
      if (error) fail("save open spots", error);
    }

    if (plan.upsertInvitations.length > 0) {
      const { error } = await db.from("party_events").upsert(
        plan.upsertInvitations.map((i) => ({
          party_id: i.partyId,
          event_id: i.eventId,
          max_guests: i.maxGuests,
          guest_ids: i.guestIds,
        })),
        { onConflict: "party_id,event_id" },
      );
      if (error) fail("save seats", error);
    }

    const now = new Date().toISOString();
    for (const ids of chunks(plan.archivePartyIds)) {
      const { error } = await db.from("parties").update({ archived_at: now }).in("id", ids);
      if (error) fail("take invitations off the website", error);
    }
  },
};
