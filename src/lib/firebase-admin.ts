import { App, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function initFirebaseAdmin(): App {
  if (getApps().length > 0) return getApp();

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccount) {
    return initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
  }

  // Fallback to application default credentials (Cloud Run, GCE, locally with gcloud ADC)
  return initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
}

export const adminApp = initFirebaseAdmin();
export const db = getFirestore(adminApp);
