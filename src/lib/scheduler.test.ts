import { describe, it, expect, vi, beforeEach } from "vitest";
import { Connection, ConnectionStore } from "@/modules/connection-store/types";

// --- Firestore mock helpers ---
type MockDocData = Record<string, unknown> | null;

function makeLockDocRef(data: MockDocData) {
  const docRef = {
    get: vi.fn().mockResolvedValue({
      exists: data !== null,
      data: () => data,
    }),
    set: vi.fn().mockResolvedValue(undefined),
  };
  return docRef;
}

// The mock db — collection().doc() returns a configurable lockRef
const mockLockRef = {
  get: vi.fn(),
  set: vi.fn(),
};

vi.mock("@/lib/firebase-admin", () => ({
  db: {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue(mockLockRef),
    }),
  },
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
    userEmail: "",
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

/** Returns a Firestore Timestamp-like object for a Date */
function firestoreTs(date: Date) {
  return { toDate: () => date };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// Existing behaviour tests
// ---------------------------------------------------------------------------

describe("scheduledSync", () => {
  it("runs sync for all active connections", async () => {
    // No lock exists
    mockLockRef.get.mockResolvedValue({ exists: false, data: () => null });
    mockLockRef.set.mockResolvedValue(undefined);

    const connections = [makeConnection("user-1"), makeConnection("user-2"), makeConnection("user-3")];
    const store = makeStore(connections);
    vi.mocked(createFirebaseConnectionStore).mockReturnValue(store);
    vi.mocked(runSync).mockResolvedValue({ status: "ok", error: null });

    const { scheduledSync } = await import("@/lib/scheduler");
    await (scheduledSync as unknown as () => Promise<void>)();

    expect(runSync).toHaveBeenCalledTimes(3);
    expect(runSync).toHaveBeenCalledWith(connections[0], store);
    expect(runSync).toHaveBeenCalledWith(connections[1], store);
    expect(runSync).toHaveBeenCalledWith(connections[2], store);
  });

  it("continues running remaining connections even if one fails", async () => {
    mockLockRef.get.mockResolvedValue({ exists: false, data: () => null });
    mockLockRef.set.mockResolvedValue(undefined);

    const connections = [makeConnection("user-1"), makeConnection("user-2"), makeConnection("user-3")];
    const store = makeStore(connections);
    vi.mocked(createFirebaseConnectionStore).mockReturnValue(store);
    vi.mocked(runSync)
      .mockResolvedValueOnce({ status: "ok", error: null })
      .mockRejectedValueOnce(new Error("Something went wrong"))
      .mockResolvedValueOnce({ status: "ok", error: null });

    const { scheduledSync } = await import("@/lib/scheduler");
    await expect((scheduledSync as unknown as () => Promise<void>)()).resolves.not.toThrow();

    expect(runSync).toHaveBeenCalledTimes(3);
  });

  it("handles an empty connection list gracefully", async () => {
    mockLockRef.get.mockResolvedValue({ exists: false, data: () => null });
    mockLockRef.set.mockResolvedValue(undefined);

    const store = makeStore([]);
    vi.mocked(createFirebaseConnectionStore).mockReturnValue(store);

    const { scheduledSync } = await import("@/lib/scheduler");
    await expect((scheduledSync as unknown as () => Promise<void>)()).resolves.not.toThrow();

    expect(runSync).not.toHaveBeenCalled();
  });

  it("exports scheduledSync as a callable async function (wraps an onSchedule handler)", async () => {
    mockLockRef.get.mockResolvedValue({ exists: false, data: () => null });
    mockLockRef.set.mockResolvedValue(undefined);

    const store = makeStore([]);
    vi.mocked(createFirebaseConnectionStore).mockReturnValue(store);

    const { scheduledSync } = await import("@/lib/scheduler");

    // onSchedule mock returns the handler directly, so scheduledSync is callable
    expect(typeof scheduledSync).toBe("function");
    await expect((scheduledSync as unknown as () => Promise<void>)()).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Idempotency / lock tests
// ---------------------------------------------------------------------------

describe("scheduledSync — idempotency guard", () => {
  it("exits early without syncing when a fresh lock exists (< 30 min old)", async () => {
    const freshLockedAt = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    mockLockRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ lockedAt: firestoreTs(freshLockedAt), status: "running" }),
    });
    mockLockRef.set.mockResolvedValue(undefined);

    const store = makeStore([makeConnection("user-1")]);
    vi.mocked(createFirebaseConnectionStore).mockReturnValue(store);
    vi.mocked(runSync).mockResolvedValue({ status: "ok", error: null });

    const { scheduledSync } = await import("@/lib/scheduler");
    await (scheduledSync as unknown as () => Promise<void>)();

    expect(runSync).not.toHaveBeenCalled();
    // Should NOT overwrite the lock
    expect(mockLockRef.set).not.toHaveBeenCalled();
  });

  it("proceeds and overwrites the lock when a stale lock exists (> 30 min old)", async () => {
    const staleLockedAt = new Date(Date.now() - 45 * 60 * 1000); // 45 minutes ago
    mockLockRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ lockedAt: firestoreTs(staleLockedAt), status: "running" }),
    });
    mockLockRef.set.mockResolvedValue(undefined);

    const store = makeStore([makeConnection("user-1")]);
    vi.mocked(createFirebaseConnectionStore).mockReturnValue(store);
    vi.mocked(runSync).mockResolvedValue({ status: "ok", error: null });

    const { scheduledSync } = await import("@/lib/scheduler");
    await (scheduledSync as unknown as () => Promise<void>)();

    expect(runSync).toHaveBeenCalledTimes(1);
    // Lock should have been written at least once (acquire + complete)
    expect(mockLockRef.set).toHaveBeenCalledTimes(2);
    expect(mockLockRef.set).toHaveBeenNthCalledWith(1, expect.objectContaining({ status: "running" }));
  });

  it("proceeds and creates the lock when no lock exists", async () => {
    mockLockRef.get.mockResolvedValue({ exists: false, data: () => null });
    mockLockRef.set.mockResolvedValue(undefined);

    const store = makeStore([makeConnection("user-1")]);
    vi.mocked(createFirebaseConnectionStore).mockReturnValue(store);
    vi.mocked(runSync).mockResolvedValue({ status: "ok", error: null });

    const { scheduledSync } = await import("@/lib/scheduler");
    await (scheduledSync as unknown as () => Promise<void>)();

    expect(runSync).toHaveBeenCalledTimes(1);
    expect(mockLockRef.set).toHaveBeenCalledTimes(2);
    expect(mockLockRef.set).toHaveBeenNthCalledWith(1, expect.objectContaining({ status: "running" }));
  });

  it("updates lock status to 'completed' after syncing", async () => {
    mockLockRef.get.mockResolvedValue({ exists: false, data: () => null });
    mockLockRef.set.mockResolvedValue(undefined);

    const store = makeStore([makeConnection("user-1")]);
    vi.mocked(createFirebaseConnectionStore).mockReturnValue(store);
    vi.mocked(runSync).mockResolvedValue({ status: "ok", error: null });

    const { scheduledSync } = await import("@/lib/scheduler");
    await (scheduledSync as unknown as () => Promise<void>)();

    // Second call to set should mark completed
    expect(mockLockRef.set).toHaveBeenCalledTimes(2);
    expect(mockLockRef.set).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: "completed", completedAt: expect.any(Date) })
    );
  });
});
