import { db } from "@/lib/firebase-admin";
import { createFirebaseConnectionStore } from "@/modules/connection-store/firebase-adapter";
import { createFirebaseGoogleIdentityStore } from "@/modules/google-identity-store/firebase-adapter";
import type { ConnectionStore } from "@/modules/connection-store/types";
import type { GoogleIdentityStore } from "@/modules/google-identity-store/types";

export function getStores(): { connectionStore: ConnectionStore; identityStore: GoogleIdentityStore } {
  return {
    connectionStore: createFirebaseConnectionStore(db),
    identityStore: createFirebaseGoogleIdentityStore(db),
  };
}
