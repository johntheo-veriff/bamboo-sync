import { describe, it, expect, vi, beforeEach } from "vitest";
import { Connection, ConnectionStore } from "@/modules/connection-store/types";

vi.mock("@/lib/firebase-admin", () => ({
  db: {},
  adminApp: {},
}));

vi.mock("@/modules/connection-store/firebase-adapter", () => ({
  createFirebaseConnectionStore: vi.fn(),
}));

vi.mock("@/modules/sync-runner", () => ({
  runSync: vi.fn(),
}));

vi.mock("firebase-functions/v2/scheduler", () => ({
  onSchedule: vi.fn((_, handler) => handler),
}));

import { createFirebaseConnectionStore } from "@/modules/connection-store/firebase-adapter";
import { runSync } from "@/modules/sync-runner";
import { onSchedule } from "firebase-functions/v2/scheduler";

function makeConnection(id: string): Connection {
  return {
    googleAccountId: id,
    bambooSubdomain: "acme",
    bambooApiKey: "key-abc",
    googleAccessToken: "gtoken",
    googleRefreshToken: "grefresh",
    lastSyncStatus: "ok",
    lastSyncError: null,
    nextSyncAt: new Date(),
    createdAt: new Date(),
  };
}

function makeStore(connections: Connection[]): ConnectionStore {
  return {
    get: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    listAll: vi.fn().mockResolvedValue(connections),
    updateSyncResult: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("scheduledSync", () => {
  it("runs sync for all active connections", async () => {
    const connections = [makeConnection("user-1"), makeConnection("user-2"), makeConnection("user-3")];
    const store = makeStore(connections);
    vi.mocked(createFirebaseConnectionStore).mockReturnValue(store);
    vi.mocked(runSync).mockResolvedValue({ status: "ok", error: null });

    const { scheduledSync } = await import("@/lib/scheduler");
    await scheduledSync();

    expect(runSync).toHaveBeenCalledTimes(3);
    expect(runSync).toHaveBeenCalledWith(connections[0], store);
    expect(runSync).toHaveBeenCalledWith(connections[1], store);
    expect(runSync).toHaveBeenCalledWith(connections[2], store);
  });

  it("continues running remaining connections even if one fails", async () => {
    const connections = [makeConnection("user-1"), makeConnection("user-2"), makeConnection("user-3")];
    const store = makeStore(connections);
    vi.mocked(createFirebaseConnectionStore).mockReturnValue(store);
    vi.mocked(runSync)
      .mockResolvedValueOnce({ status: "ok", error: null })
      .mockRejectedValueOnce(new Error("Something went wrong"))
      .mockResolvedValueOnce({ status: "ok", error: null });

    const { scheduledSync } = await import("@/lib/scheduler");
    await expect(scheduledSync()).resolves.not.toThrow();

    expect(runSync).toHaveBeenCalledTimes(3);
  });

  it("handles an empty connection list gracefully", async () => {
    const store = makeStore([]);
    vi.mocked(createFirebaseConnectionStore).mockReturnValue(store);

    const { scheduledSync } = await import("@/lib/scheduler");
    await expect(scheduledSync()).resolves.not.toThrow();

    expect(runSync).not.toHaveBeenCalled();
  });

  it("exports scheduledSync as a callable async function (wraps an onSchedule handler)", async () => {
    const store = makeStore([]);
    vi.mocked(createFirebaseConnectionStore).mockReturnValue(store);

    const { scheduledSync } = await import("@/lib/scheduler");

    // onSchedule mock returns the handler directly, so scheduledSync is callable
    expect(typeof scheduledSync).toBe("function");
    await expect(scheduledSync()).resolves.not.toThrow();
  });
});
