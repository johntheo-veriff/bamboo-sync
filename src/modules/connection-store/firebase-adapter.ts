import { Firestore, Timestamp } from "firebase-admin/firestore";
import { Connection, ConnectionStore, SyncStatus } from "./types";

const COLLECTION = "connections";

function toConnection(id: string, data: FirebaseFirestore.DocumentData): Connection {
  return {
    googleAccountId: id,
    userEmail: data.userEmail ?? "",
    bambooSubdomain: data.bambooSubdomain,
    bambooApiKey: data.bambooApiKey,
    googleAccessToken: data.googleAccessToken,
    googleRefreshToken: data.googleRefreshToken,
    lastSyncStatus: data.lastSyncStatus as SyncStatus,
    lastSyncError: data.lastSyncError ?? null,
    nextSyncAt: (data.nextSyncAt as Timestamp).toDate(),
    createdAt: (data.createdAt as Timestamp).toDate(),
  };
}

export function createFirebaseConnectionStore(db: Firestore): ConnectionStore {
  return {
    async get(googleAccountId) {
      const doc = await db.collection(COLLECTION).doc(googleAccountId).get();
      if (!doc.exists) return null;
      return toConnection(doc.id, doc.data()!);
    },

    async save(connection) {
      await db.collection(COLLECTION).doc(connection.googleAccountId).set({
        userEmail: connection.userEmail,
        bambooSubdomain: connection.bambooSubdomain,
        bambooApiKey: connection.bambooApiKey,
        googleAccessToken: connection.googleAccessToken,
        googleRefreshToken: connection.googleRefreshToken,
        lastSyncStatus: connection.lastSyncStatus,
        lastSyncError: connection.lastSyncError,
        nextSyncAt: Timestamp.fromDate(connection.nextSyncAt),
        createdAt: Timestamp.fromDate(connection.createdAt),
      });
    },

    async delete(googleAccountId) {
      await db.collection(COLLECTION).doc(googleAccountId).delete();
    },

    async listAll() {
      const snapshot = await db.collection(COLLECTION).get();
      return snapshot.docs.map((doc) => toConnection(doc.id, doc.data()));
    },

    async updateSyncResult(googleAccountId, result) {
      await db.collection(COLLECTION).doc(googleAccountId).update({
        lastSyncStatus: result.status,
        lastSyncError: result.error,
        nextSyncAt: Timestamp.fromDate(result.nextSyncAt),
      });
    },

    async updateTokens(googleAccountId, tokens) {
      await db.collection(COLLECTION).doc(googleAccountId).update({
        googleAccessToken: tokens.accessToken,
        googleRefreshToken: tokens.refreshToken,
      });
    },
  };
}
