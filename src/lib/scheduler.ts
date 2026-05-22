import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "@/lib/firebase-admin";
import { createFirebaseConnectionStore } from "@/modules/connection-store/firebase-adapter";
import { runSync } from "@/modules/sync-runner";

export const scheduledSync = onSchedule({ schedule: "0 2 * * *", timeZone: "UTC" }, async () => {
  const store = createFirebaseConnectionStore(db);
  const connections = await store.listAll();

  if (connections.length === 0) {
    console.log("[scheduler] No active connections found. Nothing to sync.");
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
});
