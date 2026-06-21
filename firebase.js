import { initializeApp } from "firebase/app";
import {
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAF0-4Kgox0yO4esCVxXT2X3N9t9NlBThM",
  authDomain: "family-budget-cfdb5.firebaseapp.com",
  projectId: "family-budget-cfdb5",
  storageBucket: "family-budget-cfdb5.firebasestorage.app",
  messagingSenderId: "234535978724",
  appId: "1:234535978724:web:8e0f448476385b96c7cef1",
  measurementId: "G-SCFP3GF9MR",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const FAMILY_BUDGET_ID = "vika-family-budget-2026";

export function getBudgetDocRef() {
  return doc(db, "budgets", FAMILY_BUDGET_ID);
}

export async function saveBudgetToCloud({ transactions, limits, revision, monthSummaries = [] }) {
  await setDoc(
    getBudgetDocRef(),
    {
      transactions,
      limits,
      monthSummaries,
      revision,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function listenBudgetFromCloud(callback, onError) {
  return onSnapshot(
    getBudgetDocRef(),
    { includeMetadataChanges: true },
    (snapshot) => {
      callback({
        exists: snapshot.exists(),
        data: snapshot.exists() ? snapshot.data() : null,
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      });
    },
    onError
  );
}

export function getCloudRevision(data) {
  return typeof data?.revision === "number" ? data.revision : 0;
}
