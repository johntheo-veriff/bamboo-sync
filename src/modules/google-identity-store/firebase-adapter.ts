import { Firestore } from "firebase-admin/firestore";
import { GoogleIdentity, GoogleIdentityStore } from "./types";

const COLLECTION = "google-identities";

export function createFirebaseGoogleIdentityStore(db: Firestore): GoogleIdentityStore {
  return {
    async get(googleAccountId) {
      const doc = await db.collection(COLLECTION).doc(googleAccountId).get();
      if (!doc.exists) return null;
      const data = doc.data()!;
      return {
        googleAccountId: doc.id,
        refreshToken: data.refreshToken,
        email: data.email,
      };
    },

    async save(identity) {
      await db.collection(COLLECTION).doc(identity.googleAccountId).set({
        refreshToken: identity.refreshToken,
        email: identity.email,
      });
    },
  };
}
