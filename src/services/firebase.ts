import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppDatabaseState } from '../types';

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Cloud Firestore (with specific databaseId if configured)
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

// Recursively sanitize all data for Cloud Firestore by stripping undefined values.
// Firestore rejects documents or arrays containing `undefined`.
export function sanitizeForFirestore(val: any): any {
  if (val === undefined) return null;
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) {
    return val.map(item => sanitizeForFirestore(item));
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(val)) {
    if (value !== undefined) {
      cleanObj[key] = sanitizeForFirestore(value);
    }
  }
  return cleanObj;
}

// Google Sign-In
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Create or update user profile doc
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(
      userDocRef,
      sanitizeForFirestore({
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastActiveAt: new Date().toISOString()
      }),
      { merge: true }
    );

    return user;
  } catch (error: any) {
    // If the user closed or cancelled the popup, handle gracefully without error logging
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      console.info('Google Sign-In popup closed by user.');
      return null;
    }
    if (error?.code === 'auth/popup-blocked') {
      console.warn('Google Sign-In popup was blocked by browser.');
      throw error;
    }
    console.error('Google Sign-In Error:', error?.message || error);
    throw error;
  }
}

// Sign Out
export async function logOut(): Promise<void> {
  await signOut(auth);
}

// Update user display name in Cloud Firestore
export async function updateUserDisplayNameInCloud(userId: string, displayName: string): Promise<void> {
  if (!userId) return;
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      sanitizeForFirestore({
        displayName,
        lastActiveAt: new Date().toISOString()
      }),
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to update displayName in cloud:', err);
  }
}

// Client Device ID to distinguish between local updates and remote updates from phone/laptop
export function getClientDeviceId(): string {
  try {
    let id = localStorage.getItem('gate_device_id');
    if (!id) {
      id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
      localStorage.setItem('gate_device_id', id);
    }
    return id;
  } catch {
    return 'dev_client';
  }
}

// Sections list for sync
export const SYNC_SECTIONS = [
  'lecture_tracker',
  'pyq_tracker',
  'revision_tracker',
  'weekly_quiz',
  'test_tracker',
  'planning',
  'daily_progress',
  'study_sessions',
  'topic_master',
  'custom_sheets',
  'settings'
] as const;

export type SyncSectionName = typeof SYNC_SECTIONS[number];

// Sync a single section to Firestore
export async function syncSectionToCloud(
  userId: string,
  sectionName: SyncSectionName,
  data: any
): Promise<void> {
  if (!userId) return;
  try {
    const docRef = doc(db, 'users', userId, 'sections', sectionName);
    const sanitized = sanitizeForFirestore(data);
    await setDoc(
      docRef,
      {
        sectionKey: sectionName,
        data: sanitized,
        updatedAt: new Date().toISOString(),
        updatedBy: getClientDeviceId()
      },
      { merge: true }
    );
  } catch (err) {
    console.error(`Failed to sync ${sectionName} to cloud:`, err);
    throw err;
  }
}

// Upload full database state to Cloud
export async function uploadFullStateToCloud(
  userId: string,
  state: AppDatabaseState
): Promise<void> {
  if (!userId) return;
  try {
    const batch = writeBatch(db);
    const deviceId = getClientDeviceId();
    const nowIso = new Date().toISOString();

    const sectionData: Record<SyncSectionName, any> = {
      lecture_tracker: state.lectureTracker,
      pyq_tracker: state.pyqTracker,
      revision_tracker: state.revisionTracker,
      weekly_quiz: state.weeklyQuiz,
      test_tracker: state.testTracker,
      planning: state.planning,
      daily_progress: state.dailyProgress,
      study_sessions: state.studySessions,
      topic_master: state.topicMaster,
      custom_sheets: state.customSheets,
      settings: state.settings
    };

    SYNC_SECTIONS.forEach(sec => {
      const ref = doc(db, 'users', userId, 'sections', sec);
      const rawData = sectionData[sec] !== undefined ? sectionData[sec] : [];
      const sanitized = sanitizeForFirestore(rawData);
      batch.set(ref, {
        sectionKey: sec,
        data: sanitized,
        updatedAt: nowIso,
        updatedBy: deviceId
      });
    });

    // Also update user profile lastSyncedAt
    const userRef = doc(db, 'users', userId);
    batch.set(
      userRef,
      sanitizeForFirestore({
        lastSyncedAt: nowIso,
        lastActiveAt: nowIso,
        updatedBy: deviceId
      }),
      { merge: true }
    );

    await batch.commit();
  } catch (err) {
    console.error('Failed to upload full state to cloud:', err);
    throw err;
  }
}

export interface CloudDownloadResult {
  data: Partial<AppDatabaseState>;
  hasData: boolean;
  totalRecordsCount: number;
}

// Download full database state from Cloud
export async function downloadFullStateFromCloud(
  userId: string
): Promise<CloudDownloadResult | null> {
  if (!userId) return null;
  try {
    const partial: Partial<AppDatabaseState> = {};
    let hasAnyData = false;
    let totalRecordsCount = 0;

    const sectionsCol = collection(db, 'users', userId, 'sections');
    const snapshot = await getDocs(sectionsCol);

    snapshot.forEach(docSnap => {
      hasAnyData = true;
      const sec = docSnap.id as SyncSectionName;
      const val = docSnap.data()?.data;
      if (sec === 'lecture_tracker') {
        partial.lectureTracker = val || [];
        totalRecordsCount += (partial.lectureTracker?.length || 0);
      } else if (sec === 'pyq_tracker') {
        partial.pyqTracker = val || [];
        totalRecordsCount += (partial.pyqTracker?.length || 0);
      } else if (sec === 'revision_tracker') {
        partial.revisionTracker = val || [];
        totalRecordsCount += (partial.revisionTracker?.length || 0);
      } else if (sec === 'weekly_quiz') {
        partial.weeklyQuiz = val || [];
        totalRecordsCount += (partial.weeklyQuiz?.length || 0);
      } else if (sec === 'test_tracker') {
        partial.testTracker = val || [];
        totalRecordsCount += (partial.testTracker?.length || 0);
      } else if (sec === 'planning') {
        partial.planning = val || [];
        totalRecordsCount += (partial.planning?.length || 0);
      } else if (sec === 'daily_progress') {
        partial.dailyProgress = val || [];
        totalRecordsCount += (partial.dailyProgress?.length || 0);
      } else if (sec === 'study_sessions') {
        partial.studySessions = val || [];
        totalRecordsCount += (partial.studySessions?.length || 0);
      } else if (sec === 'topic_master') {
        partial.topicMaster = val || [];
        totalRecordsCount += (partial.topicMaster?.length || 0);
      } else if (sec === 'custom_sheets') {
        partial.customSheets = val || [];
        totalRecordsCount += (partial.customSheets?.length || 0);
      } else if (sec === 'settings') {
        partial.settings = val;
        if (val) totalRecordsCount += 1;
      }
    });

    return {
      data: partial,
      hasData: hasAnyData,
      totalRecordsCount
    };
  } catch (err) {
    console.error('Failed to download state from cloud:', err);
    throw err;
  }
}

// Real-time listener for remote changes from another device (laptop or phone)
export function listenToCloudUpdates(
  userId: string,
  onRemoteChange: (section: SyncSectionName, data: any) => void
): () => void {
  if (!userId) return () => {};

  const colRef = collection(db, 'users', userId, 'sections');
  const localDeviceId = getClientDeviceId();

  const unsubscribe = onSnapshot(
    colRef,
    snapshot => {
      snapshot.docChanges().forEach(change => {
        // Only process changes not initiated by this same client device
        const docData = change.doc.data();
        const originDeviceId = docData?.updatedBy;
        if (originDeviceId && originDeviceId === localDeviceId) {
          // Change was performed locally on this device, ignore to avoid feedback loop
          return;
        }

        const sec = docData?.sectionKey as SyncSectionName;
        if (sec && docData?.data !== undefined) {
          onRemoteChange(sec, docData.data);
        }
      });
    },
    error => {
      console.warn('Cloud sync listener error:', error);
    }
  );

  return unsubscribe;
}
