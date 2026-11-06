/**
 * One round trip between the family's Google Sheet and the website (called by
 * app/(wedding)/hridee/sync/route.ts, which checks the secret first):
 *   1. read the whole database,
 *   2. work out what the sheet's two guest lists change (plan.ts) and apply it,
 *   3. send back a note per row plus fresh Summary / RSVPs / Messages tabs.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import type { GuestStore } from "../store/types";
import { planSheetSync, type IdChange, type RowNote } from "./plan";
import { buildTables, type Table } from "./report";
import { parseRow, type SyncRequest } from "./rows";

export type SyncResponse =
  | { ok: true; message: string; changes: number; notes: RowNote[]; idChanges: IdChange[]; tables: Table[] }
  | { ok: false; message: string };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export async function runSheetSync(store: GuestStore, request: SyncRequest): Promise<SyncResponse> {
  const before = await store.loadSnapshot();
  const result = planSheetSync(before, request.rows.map(parseRow), {
    allowRemovals: request.allowRemovals === true,
    newId: randomUUID,
  });
  if (result.refused) return { ok: false, message: result.message };

  if (result.changes > 0) await store.applySheetPlan(result.plan);
  const after = result.changes > 0 ? await store.loadSnapshot() : before;

  const parts = [`${plural(result.published, "invitation is", "invitations are")} on the website.`];
  if (result.needAttention > 0) {
    parts.push(`${plural(result.needAttention, "row needs", "rows need")} a look (see Website notes).`);
  }
  if (result.removed.length > 0) parts.push(`Taken off the website: ${result.removed.join(", ")}.`);
  if (result.removedYes.length > 0) parts.push(`Removed people who had said yes: ${result.removedYes.join(", ")}.`);

  return {
    ok: true,
    message: parts.join(" "),
    changes: result.changes,
    notes: result.notes,
    idChanges: result.idChanges,
    tables: buildTables(after, result.families),
  };
}
