// ============================================
// 🔥 firebase-config.js - NO ANONYMOUS AUTH
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  deleteDoc,
  onSnapshot,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  limit,
  startAfter,
  endBefore,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-analytics.js";

// ============================================
// 🔧 Konfigurasi
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyDwSmywmu7s2YqS4Rk8uUdZFQi5k38F0p8",
  authDomain: "absensi-karyawan-27b89.firebaseapp.com",
  projectId: "absensi-karyawan-27b89",
  storageBucket: "absensi-karyawan-27b89.firebasestorage.app",
  messagingSenderId: "514222311201",
  appId: "1:514222311201:web:a3bbb0d96e946b716de060",
  measurementId: "G-5X22ZF584D"
};

console.log("🔄 Initializing Firebase...");

let app, analytics, auth, db;

try {
  app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("✅ Firebase initialized successfully");
} catch (error) {
  console.error("❌ Firebase initialization failed:", error);
  throw error;
}

// ============================================
// 💾 Enable Offline Persistence
// ============================================
let persistenceEnabled = false;

async function enableOfflinePersistence() {
  try {
    await enableIndexedDbPersistence(db);
    persistenceEnabled = true;
    console.log("✅ Offline persistence enabled");
  } catch (err) {
    if (err.code === 'failed-precondition') {
      console.warn("⚠️ Multiple tabs open. Persistence only works in one tab.");
    } else if (err.code === 'unimplemented') {
      console.warn("⚠️ Browser doesn't support persistence");
    } else {
      console.error("❌ Persistence error:", err);
    }
  }
}

enableOfflinePersistence();

// ============================================
// 🌐 Network Status
// ============================================
window.addEventListener('online', () => {
  console.log("🌐 Network online");
  window.dispatchEvent(new CustomEvent('networkStatusChanged', {
    detail: { online: true }
  }));
});

window.addEventListener('offline', () => {
  console.log("📡 Network offline");
  window.dispatchEvent(new CustomEvent('networkStatusChanged', {
    detail: { online: false }
  }));
});

// ============================================
// 🌍 Global Export
// ============================================
window.firebaseDB = {
  app,
  db,
  auth,
  analytics,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  isReady: false,
  persistenceEnabled: false,
  isOnline: navigator.onLine
};

// ============================================
// ✅ Mark as Ready (No Auth Required)
// ============================================
function setFirebaseReady() {
  window.firebaseDB.isReady = true;
  window.firebaseDB.persistenceEnabled = persistenceEnabled;
  console.log("🎉 Firebase fully ready");
  window.dispatchEvent(new CustomEvent('firebaseReady', {
    detail: { persistenceEnabled }
  }));
}

// Mark as ready immediately (no auth needed)
setTimeout(() => {
  setFirebaseReady();
}, 1000);

// ============================================
// 🛠️ Utility Functions
// ============================================
window.waitForFirebase = function() {
  return new Promise((resolve) => {
    if (window.firebaseDB && window.firebaseDB.isReady) {
      resolve();
    } else {
      window.addEventListener('firebaseReady', () => resolve(), { once: true });
    }
  });
};

window.isFirebaseConnected = function() {
  return window.firebaseDB && window.firebaseDB.isReady;
};

window.handleFirebaseError = function(error) {
  const errorMessages = {
    'permission-denied': '🔒 Akses ditolak',
    'unavailable': '📡 Firebase tidak tersedia',
    'not-found': '🔍 Data tidak ditemukan'
  };

  const code = error.code || 'unknown';
  const message = errorMessages[code] || error.message;
  
  console.error('Firebase Error:', { code, message, error });
  
  return { code, message, originalError: error };
};

console.log("✅ firebase-config.js loaded");
console.log("📦 Available at: window.firebaseDB");

export { app, db, auth, analytics };
