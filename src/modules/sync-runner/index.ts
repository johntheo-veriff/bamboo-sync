import { fetchCurrentEmployee, fetchWhosOut } from "@/modules/bamboo-hr-client";
import { WhosOutEntry } from "@/modules/bamboo-hr-client/types";
import {
  createEvent,
  deleteEvent,
  getUserCalendarTimezone,
  listBambooSyncEvents,
  updateEvent,
} from "@/modules/google-calendar-client";
import { computeSyncDiff } from "@/modules/sync-engine";
import { BambooEntry } from "@/modules/sync-engine/types";
import { Connection, ConnectionStore, SyncStatus } from "@/modules/connection-store/types";
import { buildGoogleCalendarConfig } from "@/lib/google-config";

export function toBambooEntries(entries: WhosOutEntry[]): BambooEntry[] {
  return entries.map((e) => ({
    id: e.id,
    type: e.type,
    name: e.name,
    startDate: e.startDate,
    endDate: e.endDate,
  }));
}

export async function runSync(
  connection: Connection,
  store: ConnectionStore
): Promise<{ status: SyncStatus; error: string | null }> {
  const bambooConfig = {
    subdomain: connection.bambooSubdomain,
    apiKey: connection.bambooApiKey,
  };

  const googleConfig = buildGoogleCalendarConfig(connection, store);

  try {
    const [allEntries, employee, existingEvents, googleTimezone] = await Promise.all([
      fetchWhosOut(bambooConfig),
      connection.userEmail ? fetchCurrentEmployee(bambooConfig, connection.userEmail) : Promise.resolve(null),
      listBambooSyncEvents(googleConfig),
      getUserCalendarTimezone(googleConfig),
    ]);

    // Timezone priority: BambooHR profile → browser-captured → Google Calendar settings
    const timeZone = employee?.timeZone ?? connection.userTimezone ?? googleTimezone;

    const filtered = employee
      ? allEntries.filter((e) => e.type === "holiday" || e.name === employee.displayName)
      : allEntries;

    const bambooEntries = toBambooEntries(filtered);

    const diff = computeSyncDiff(bambooEntries, existingEvents);

    await Promise.all([
      ...diff.create.map((op) =>
        createEvent(googleConfig, {
          bambooId: op.entry.id,
          type: op.entry.type,
          name: op.entry.name,
          startDate: op.entry.startDate,
          endDate: op.entry.endDate,
          timeZone,
        })
      ),
      ...diff.update.map((op) =>
        updateEvent(googleConfig, op.googleEventId, {
          bambooId: op.entry.id,
          type: op.entry.type,
          name: op.entry.name,
          startDate: op.entry.startDate,
          endDate: op.entry.endDate,
          timeZone,
        })
      ),
      ...diff.delete.map((op) => deleteEvent(googleConfig, op.googleEventId)),
    ]);

    const nextSyncAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await store.updateSyncResult(connection.googleAccountId, {
      status: "ok",
      error: null,
      nextSyncAt,
    });

    return { status: "ok", error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const nextSyncAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await store.updateSyncResult(connection.googleAccountId, {
      status: "error",
      error: message,
      nextSyncAt,
    });
    return { status: "error", error: message };
  }
}
