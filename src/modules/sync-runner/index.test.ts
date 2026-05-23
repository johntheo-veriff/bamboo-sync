import { describe, it, expect, vi, beforeEach } from "vitest";
import { runSync } from "./index";
import { Connection, ConnectionStore } from "@/modules/connection-store/types";

vi.mock("@/modules/bamboo-hr-client", () => ({
  fetchWhosOut: vi.fn(),
}));

vi.mock("@/modules/google-calendar-client", () => ({
  listBambooSyncEvents: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

import { fetchWhosOut } from "@/modules/bamboo-hr-client";
import {
  listBambooSyncEvents,
  createEvent,
  deleteEvent,
} from "@/modules/google-calendar-client";

const mockConnection: Connection = {
  googleAccountId: "user-123",
  userEmail: "",
  bambooSubdomain: "acme",
  bambooApiKey: "key-abc",
  googleAccessToken: "gtoken",
  googleRefreshToken: "grefresh",
  lastSyncStatus: "pending",
  lastSyncError: null,
  nextSyncAt: new Date(),
  createdAt: new Date(),
};

function makeStore(overrides: Partial<ConnectionStore> = {}): ConnectionStore {
  return {
    get: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    listAll: vi.fn(),
    updateSyncResult: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchWhosOut).mockResolvedValue([]);
  vi.mocked(listBambooSyncEvents).mockResolvedValue([]);
  vi.mocked(createEvent).mockResolvedValue({ googleEventId: "g-new" });
});

describe("runSync", () => {
  it("returns ok and updates sync result when everything succeeds", async () => {
    const store = makeStore();
    const result = await runSync(mockConnection, store);

    expect(result.status).toBe("ok");
    expect(result.error).toBeNull();
    expect(store.updateSyncResult).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({ status: "ok", error: null })
    );
  });

  it("creates Calendar Events for time-off entries", async () => {
    vi.mocked(fetchWhosOut).mockResolvedValue([
      { id: "to-1", type: "time-off", name: "PTO", startDate: "2025-07-01", endDate: "2025-07-03" },
    ]);
    const store = makeStore();

    await runSync(mockConnection, store);

    expect(createEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ bambooId: "to-1", type: "time-off" })
    );
  });

  it("creates Calendar Events for holidays", async () => {
    vi.mocked(fetchWhosOut).mockResolvedValue([
      { id: "h-1", type: "holiday", name: "Christmas", startDate: "2025-12-25", endDate: "2025-12-25" },
    ]);
    const store = makeStore();

    await runSync(mockConnection, store);

    expect(createEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ bambooId: "h-1", type: "holiday" })
    );
  });

  it("deletes Calendar Events for entries no longer in BambooHR", async () => {
    vi.mocked(listBambooSyncEvents).mockResolvedValue([
      {
        googleEventId: "g-old",
        bambooId: "to-gone",
        type: "time-off",
        name: "Old PTO",
        startDate: "2025-06-01",
        endDate: "2025-06-02",
      },
    ]);
    const store = makeStore();

    await runSync(mockConnection, store);

    expect(deleteEvent).toHaveBeenCalledWith(expect.anything(), "g-old");
  });

  it("returns error and updates sync result when BambooHR fetch fails", async () => {
    vi.mocked(fetchWhosOut).mockRejectedValue(new Error("BambooHR down"));
    const store = makeStore();

    const result = await runSync(mockConnection, store);

    expect(result.status).toBe("error");
    expect(result.error).toBe("BambooHR down");
    expect(store.updateSyncResult).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({ status: "error", error: "BambooHR down" })
    );
  });

  it("sets nextSyncAt to approximately 24 hours from now", async () => {
    const before = Date.now();
    const store = makeStore();

    await runSync(mockConnection, store);

    const call = vi.mocked(store.updateSyncResult).mock.calls[0][1];
    const diff = call.nextSyncAt.getTime() - before;
    expect(diff).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000);
    expect(diff).toBeLessThanOrEqual(25 * 60 * 60 * 1000);
  });
});
