import { describe, it, expect } from "vitest";
import { computeSyncDiff } from "./index";
import { COLOR_FALLBACK, COLOR_HOLIDAY, COLOR_TIME_OFF } from "./colors";
import { BambooEntry, ExistingCalendarEvent } from "./types";

const timeOff = (id: string, overrides: Partial<BambooEntry> = {}): BambooEntry => ({
  id,
  type: "time-off",
  name: "PTO",
  startDate: "2025-07-01",
  endDate: "2025-07-03",
  ...overrides,
});

const holiday = (id: string, overrides: Partial<BambooEntry> = {}): BambooEntry => ({
  id,
  type: "holiday",
  name: "Christmas",
  startDate: "2025-12-25",
  endDate: "2025-12-25",
  ...overrides,
});

const existingEvent = (
  bambooId: string,
  googleEventId: string,
  overrides: Partial<ExistingCalendarEvent> = {}
): ExistingCalendarEvent => ({
  bambooId,
  googleEventId,
  type: "time-off",
  name: "PTO",
  startDate: "2025-07-01",
  endDate: "2025-07-03",
  ...overrides,
});

describe("computeSyncDiff", () => {
  it("creates an event for a net-new BambooHR entry", () => {
    const diff = computeSyncDiff([timeOff("1")], []);
    expect(diff.create).toHaveLength(1);
    expect(diff.create[0].entry.id).toBe("1");
    expect(diff.update).toHaveLength(0);
    expect(diff.delete).toHaveLength(0);
  });

  it("emits no operations when entry and event are identical", () => {
    const diff = computeSyncDiff(
      [timeOff("1")],
      [existingEvent("1", "g-1")]
    );
    expect(diff.create).toHaveLength(0);
    expect(diff.update).toHaveLength(0);
    expect(diff.delete).toHaveLength(0);
  });

  it("updates when start date changes", () => {
    const diff = computeSyncDiff(
      [timeOff("1", { startDate: "2025-07-02" })],
      [existingEvent("1", "g-1")]
    );
    expect(diff.update).toHaveLength(1);
    expect(diff.update[0].googleEventId).toBe("g-1");
  });

  it("updates when end date changes", () => {
    const diff = computeSyncDiff(
      [timeOff("1", { endDate: "2025-07-05" })],
      [existingEvent("1", "g-1")]
    );
    expect(diff.update).toHaveLength(1);
  });

  it("updates when name changes", () => {
    const diff = computeSyncDiff(
      [timeOff("1", { name: "Sick Leave" })],
      [existingEvent("1", "g-1")]
    );
    expect(diff.update).toHaveLength(1);
    expect(diff.update[0].entry.name).toBe("Sick Leave");
  });

  it("deletes when a BambooHR entry no longer exists", () => {
    const diff = computeSyncDiff([], [existingEvent("1", "g-1")]);
    expect(diff.delete).toHaveLength(1);
    expect(diff.delete[0].googleEventId).toBe("g-1");
  });

  it("deletes all events when BambooHR state is empty", () => {
    const diff = computeSyncDiff([], [
      existingEvent("1", "g-1"),
      existingEvent("2", "g-2"),
    ]);
    expect(diff.delete).toHaveLength(2);
    expect(diff.create).toHaveLength(0);
    expect(diff.update).toHaveLength(0);
  });

  it("handles create, update, and delete in a single diff", () => {
    const diff = computeSyncDiff(
      [timeOff("1", { name: "Updated" }), timeOff("3")],
      [existingEvent("1", "g-1"), existingEvent("2", "g-2")]
    );
    expect(diff.update).toHaveLength(1);
    expect(diff.delete).toHaveLength(1);
    expect(diff.create).toHaveLength(1);
  });

  it("assigns time-off colour to Time-off Entry events", () => {
    const diff = computeSyncDiff([timeOff("1")], []);
    expect(diff.create[0].colorId).toBe(COLOR_TIME_OFF);
  });

  it("assigns holiday colour to Holiday events", () => {
    const diff = computeSyncDiff([holiday("1")], []);
    expect(diff.create[0].colorId).toBe(COLOR_HOLIDAY);
  });

  it("falls back to shared colour when preferred colour is unavailable", () => {
    const unavailable = new Set([COLOR_TIME_OFF]);
    const diff = computeSyncDiff([timeOff("1")], [], unavailable);
    expect(diff.create[0].colorId).toBe(COLOR_FALLBACK);
  });

  it("falls back for holiday colour when unavailable", () => {
    const unavailable = new Set([COLOR_HOLIDAY]);
    const diff = computeSyncDiff([holiday("1")], [], unavailable);
    expect(diff.create[0].colorId).toBe(COLOR_FALLBACK);
  });
});
