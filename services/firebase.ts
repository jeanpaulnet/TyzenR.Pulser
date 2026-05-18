
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export async function getFirebaseDb(): Promise<Firestore | null> {
  if (db) return db;

  try {
    // Dynamically import the config if it exists
    // @ts-ignore - this file is generated after user accepts terms
    const config = await import(/* @vite-ignore */ '../firebase-applet-config.json');
    if (config && config.default) {
      if (getApps().length === 0) {
        app = initializeApp(config.default);
      } else {
        app = getApps()[0];
      }
      db = getFirestore(app);
      return db;
    }
  } catch (err) {
    // Config not found or invalid - expected if user hasn't accepted terms yet
    return null;
  }
  return null;
}
