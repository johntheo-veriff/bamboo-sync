export type EntryType = "time-off" | "holiday";

export interface BambooEntry {
  id: string;
  type: EntryType;
  name: string;
  startDate: string; // ISO date string, e.g. "2025-06-01"
  endDate: string;
}

export interface ExistingCalendarEvent {
  googleEventId: string;
  bambooId: string;
  type: EntryType;
  name: string;
  startDate: string;
  endDate: string;
}

export interface CreateOperation {
  action: "create";
  entry: BambooEntry;
  colorId: string;
}

export interface UpdateOperation {
  action: "update";
  googleEventId: string;
  entry: BambooEntry;
  colorId: string;
}

export interface DeleteOperation {
  action: "delete";
  googleEventId: string;
}

export interface SyncDiff {
  create: CreateOperation[];
  update: UpdateOperation[];
  delete: DeleteOperation[];
}
