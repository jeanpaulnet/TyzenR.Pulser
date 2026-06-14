
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export async function getFirebaseDb(): Promise<Firestore | null> {
  if (db) return db;

  let configData: any = null;

  // 1. Try reading via Node.js fs first if we are running in Node
  const globalRef = globalThis as any;
  if (typeof globalRef.process !== 'undefined' && globalRef.process.versions && globalRef.process.versions.node) {
    try {
      // Dynamic loads using string concatenation so that Vite builder does not attempt
      // compilation of server-side Node modules for the client bundle.
      const fsModule: any = await import('f' + 's');
      const pathModule: any = await import('p' + 'at' + 'h');
      const cwd = globalRef.process.cwd();
      const configPath = pathModule.join(cwd, 'firebase-applet-config.json');
      if (fsModule.existsSync(configPath)) {
        const raw = fsModule.readFileSync(configPath, 'utf8');
        configData = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Node.js fs read of firebase-applet-config.json failed:', err);
    }
  }

  // 2. Fall back to dynamic import (useful for Vite frontend)
  if (!configData || !configData.projectId) {
    try {
      // @ts-ignore
      const imported = await import(/* @vite-ignore */ '../firebase-applet-config.json');
      configData = imported.default || imported;
    } catch (err) {
      console.warn('Dynamic import of firebase-applet-config.json failed:', err);
    }
  }

  // 3. Initialize Firebase if config was successfully found
  if (configData && configData.projectId) {
    try {
      if (getApps().length === 0) {
        app = initializeApp(configData);
      } else {
        app = getApps()[0];
      }
      
      // Use firestoreDatabaseId if specified, falling back to default
      if (configData.firestoreDatabaseId) {
        db = getFirestore(app, configData.firestoreDatabaseId);
      } else {
        db = getFirestore(app);
      }
      return db;
    } catch (err) {
      console.error('Firebase initialization failed with config:', err);
      return null;
    }
  }

  return null;
}
