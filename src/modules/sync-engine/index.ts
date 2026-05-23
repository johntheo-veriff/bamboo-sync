import {
  BambooEntry,
  ExistingCalendarEvent,
  SyncDiff,
} from "./types";

export function computeSyncDiff(
  bambooEntries: BambooEntry[],
  existingEvents: ExistingCalendarEvent[]
): SyncDiff {
  const diff: SyncDiff = { create: [], update: [], delete: [] };

  const eventsByBambooId = new Map(existingEvents.map((e) => [e.bambooId, e]));
  const bambooIds = new Set(bambooEntries.map((e) => e.id));

  for (const entry of bambooEntries) {
    const existing = eventsByBambooId.get(entry.id);

    if (!existing) {
      diff.create.push({ action: "create", entry });
    } else if (
      existing.name !== entry.name ||
      existing.startDate !== entry.startDate ||
      existing.endDate !== entry.endDate
    ) {
      diff.update.push({ action: "update", googleEventId: existing.googleEventId, entry });
    }
  }

  for (const event of existingEvents) {
    if (!bambooIds.has(event.bambooId)) {
      diff.delete.push({ action: "delete", googleEventId: event.googleEventId });
    }
  }

  return diff;
}
