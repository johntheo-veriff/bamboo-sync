import { fetchWhosOut } from "@/modules/bamboo-hr-client";
import {
  createEvent,
  deleteEvent,
  listBambooSyncEvents,
  updateEvent,
} from "@/modules/google-calendar-client";
import { computeSyncDiff } from "@/modules/sync-engine";
import { Connection, ConnectionStore, SyncStatus } from "@/modules/connection-store/types";

export async function runSync(
  connection: Connection,
  store: ConnectionStore
): Promise<{ status: SyncStatus; error: string | null }> {
  const bambooConfig = {
    subdomain: connection.bambooSubdomain,
    apiKey: connection.bambooApiKey,
  };

  const googleConfig = {
    accessToken: connection.googleAccessToken,
    refreshToken: connection.googleRefreshToken,
    onTokenRefresh: async (tokens: { accessToken: string; refreshToken: string }) => {
      await store.save({
        ...connection,
        googleAccessToken: tokens.accessToken,
        googleRefreshToken: tokens.refreshToken,
      });
    },
  };

  try {
    const [bambooEntries, existingEvents] = await Promise.all([
      fetchWhosOut(bambooConfig),
      listBambooSyncEvents(googleConfig),
    ]);

    const diff = computeSyncDiff(bambooEntries, existingEvents);

    await Promise.all([
      ...diff.create.map((op) =>
        createEvent(googleConfig, {
          bambooId: op.entry.id,
          type: op.entry.type,
          name: op.entry.name,
          startDate: op.entry.startDate,
          endDate: op.entry.endDate,
          colorId: op.colorId,
        })
      ),
      ...diff.update.map((op) =>
        updateEvent(googleConfig, op.googleEventId, {
          bambooId: op.entry.id,
          type: op.entry.type,
          name: op.entry.name,
          startDate: op.entry.startDate,
          endDate: op.entry.endDate,
          colorId: op.colorId,
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
