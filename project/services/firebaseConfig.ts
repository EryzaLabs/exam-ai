import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyA0SW_TBTWnudhQAvo4ilH72ikyxypIC0o",
  authDomain: "exam-ai-a92e0.firebaseapp.com",
  projectId: "exam-ai-a92e0",
  storageBucket: "exam-ai-a92e0.firebasestorage.app",
  messagingSenderId: "553691834402",
  appId: "1:553691834402:web:e8d9c49de91d087920027b",
  measurementId: "G-E8M12HYRNN"
};

// Initialize Firebase (Modular)
const app = initializeApp(firebaseConfig);

// Initialize Firebase (Compat) for expo-firebase-recaptcha on Web
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize Auth with platform-specific persistence
let auth: Auth;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  // Try to use AsyncStorage, but wrap in try-catch in case getReactNativePersistence is undefined on web bundler
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (e) {
    auth = getAuth(app);
  }
}

// Initialize Firestore with modern persistent cache (eliminates deprecation warning)
let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch {
  db = initializeFirestore(app, {});
}

export { auth, db };
