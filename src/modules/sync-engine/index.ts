import { colorFor } from "./colors";
import {
  BambooEntry,
  ExistingCalendarEvent,
  SyncDiff,
} from "./types";

export function computeSyncDiff(
  bambooEntries: BambooEntry[],
  existingEvents: ExistingCalendarEvent[],
  unavailableColors: Set<string> = new Set()
): SyncDiff {
  const diff: SyncDiff = { create: [], update: [], delete: [] };

  const eventsByBambooId = new Map(existingEvents.map((e) => [e.bambooId, e]));
  const bambooIds = new Set(bambooEntries.map((e) => e.id));

  for (const entry of bambooEntries) {
    const existing = eventsByBambooId.get(entry.id);
    const colorId = colorFor(entry.type, unavailableColors);

    if (!existing) {
      diff.create.push({ action: "create", entry, colorId });
    } else if (
      existing.name !== entry.name ||
      existing.startDate !== entry.startDate ||
      existing.endDate !== entry.endDate
    ) {
      diff.update.push({ action: "update", googleEventId: existing.googleEventId, entry, colorId });
    }
  }

  for (const event of existingEvents) {
    if (!bambooIds.has(event.bambooId)) {
      diff.delete.push({ action: "delete", googleEventId: event.googleEventId });
    }
  }

  return diff;
}
