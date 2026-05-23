import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "@/lib/firebase-admin";
import { getStores } from "@/lib/stores";
import { runSync } from "@/modules/sync-runner";

interface SyncLock {
  lockedAt: Date;
  status: "running" | "completed";
  completedAt?: Date;
}

const LOCK_TTL_MS = 30 * 60 * 1000; // 30 minutes

export const scheduledSync = onSchedule({ schedule: "0 2 * * *", timeZone: "UTC" }, async () => {
  const now = new Date();
  const dateString = now.toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const lockRef = db.collection("syncLocks").doc(dateString);

  // Attempt to acquire lock
  const lockSnap = await lockRef.get();
  if (lockSnap.exists) {
    const data = lockSnap.data() as SyncLock;
    const lockedAt: Date = data.lockedAt instanceof Date ? data.lockedAt : (data.lockedAt as any).toDate();
    const ageMs = now.getTime() - lockedAt.getTime();
    if (ageMs < LOCK_TTL_MS) {
      console.log(`[scheduler] Lock exists for ${dateString} (age: ${Math.round(ageMs / 1000)}s). Exiting early.`);
      return;
    }
    console.log(`[scheduler] Stale lock found for ${dateString} (age: ${Math.round(ageMs / 1000)}s). Overwriting.`);
  }

  const lockedAt = new Date();
  await lockRef.set({ lockedAt, status: "running" } satisfies SyncLock);

  const { connectionStore: store } = getStores();
  const connections = await store.listAll();

  if (connections.length === 0) {
    console.log("[scheduler] No active connections found. Nothing to sync.");
    await lockRef.set({ lockedAt, completedAt: new Date(), status: "completed" } satisfies SyncLock);
    return;
  }

  const results = await Promise.allSettled(
    connections.map((connection) => runSync(connection, store))
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(
    `[scheduler] Sync complete. Succeeded: ${succeeded}, Failed: ${failed}, Total: ${connections.length}`
  );

  await lockRef.set({ lockedAt, completedAt: new Date(), status: "completed" } satisfies SyncLock);
});
