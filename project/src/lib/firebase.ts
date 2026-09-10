import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore, setLogLevel, memoryLocalCache } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Suppress harmless offline/timeout logs from Cloud Firestore
try {
  setLogLevel('silent');
} catch {}

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

const databaseId = firebaseConfigJson.firestoreDatabaseId || '(default)';

// Initialize Firestore with memoryLocalCache & forced long polling
// This prevents IndexedDB "Database is closing/hidden" or lock-contention exceptions
// in WebView/APK, iframes, and mobile background tab throttling.
let db: Firestore;
try {
  db = initializeFirestore(
    app,
    {
      localCache: memoryLocalCache(),
      experimentalForceLongPolling: true,
    },
    databaseId
  );
} catch {
  db = getFirestore(app, databaseId);
}

const auth: Auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  code?: string;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errCode = (error as any)?.code || 'unknown';
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    code: errCode,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('[Firestore Operation Error]:', JSON.stringify(errInfo));
  return errInfo;
}

export { app, db, auth };

