// ============================================
// 🔥 firebase-config.js
// Versi untuk HTML/JS langsung di browser (no build step)
// ============================================

// Import SDK langsung dari CDN Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
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
  endBefore
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-analytics.js";

// ============================================
// 🔧 Konfigurasi Web App Anda (dari Firebase Console)
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

// ============================================
// ✅ Inisialisasi Firebase
// ============================================
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
// 🔐 Autentikasi Anonim dengan Retry
// ============================================
let authRetryCount = 0;
const MAX_AUTH_RETRIES = 3;

async function signInAnonymouslyWithRetry() {
  try {
    await signInAnonymously(auth);
    console.log("✅ Terhubung ke Firebase & sign-in anonim berhasil");
    authRetryCount = 0; // Reset counter on success
  } catch (err) {
    console.error("❌ Gagal sign-in anonim:", err);
    
    authRetryCount++;
    if (authRetryCount < MAX_AUTH_RETRIES) {
      console.log(`🔄 Retry ${authRetryCount}/${MAX_AUTH_RETRIES}...`);
      setTimeout(() => signInAnonymouslyWithRetry(), 2000 * authRetryCount);
    } else {
      console.error("❌ Max retry reached. Please check your internet connection.");
      // Trigger custom event for UI to handle
      window.dispatchEvent(new CustomEvent('firebaseAuthFailed', { detail: err }));
    }
  }
}

// Start authentication
signInAnonymouslyWithRetry();

// ============================================
// 👤 Monitor Auth State
// ============================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ User authenticated:", user.uid);
    window.dispatchEvent(new CustomEvent('firebaseAuthSuccess', { detail: user }));
  } else {
    console.log("⚠️ User signed out");
    window.dispatchEvent(new CustomEvent('firebaseAuthSignedOut'));
  }
});

// ============================================
// 🌐 Network Status Monitoring
// ============================================
window.addEventListener('online', () => {
  console.log("🌐 Network online - reconnecting to Firebase...");
  if (!auth.currentUser) {
    signInAnonymouslyWithRetry();
  }
});

window.addEventListener('offline', () => {
  console.log("📡 Network offline - Firebase may not sync");
});

// ============================================
// 🌍 Ekspor global supaya dapat dipakai di halaman lain
// ============================================
window.firebaseDB = {
  // Core
  app,
  db,
  auth,
  analytics,
  
  // Firestore functions
  collection,
  doc,
  
  // Document operations
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  
  // Query operations
  query,
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  
  // Realtime operations
  onSnapshot,
  
  // Utilities
  serverTimestamp,
  Timestamp,
  writeBatch,
  
  // Helper flag
  isReady: false,
  isAuthenticated: false
};

// ============================================
// 🎯 Ready State Management
// ============================================
function setFirebaseReady() {
  window.firebaseDB.isReady = true;
  window.firebaseDB.isAuthenticated = !!auth.currentUser;
  console.log("🎉 Firebase fully ready to use");
  window.dispatchEvent(new CustomEvent('firebaseReady'));
}

// Wait for auth to complete before marking as ready
const unsubscribe = onAuthStateChanged(auth, (user) => {
  if (user) {
    setFirebaseReady();
    unsubscribe(); // Stop listening after first successful auth
  }
});

// Fallback: Mark as ready after timeout even if auth fails
setTimeout(() => {
  if (!window.firebaseDB.isReady) {
    console.warn("⚠️ Firebase ready timeout - continuing anyway");
    window.firebaseDB.isReady = true;
    window.dispatchEvent(new CustomEvent('firebaseReady'));
  }
}, 5000);

// ============================================
// 🛠️ Utility Functions
// ============================================

/**
 * Wait for Firebase to be ready
 * @returns {Promise<void>}
 */
window.waitForFirebase = function() {
  return new Promise((resolve) => {
    if (window.firebaseDB && window.firebaseDB.isReady) {
      resolve();
    } else {
      window.addEventListener('firebaseReady', () => resolve(), { once: true });
    }
  });
};

/**
 * Check if Firebase is connected
 * @returns {boolean}
 */
window.isFirebaseConnected = function() {
  return window.firebaseDB && 
         window.firebaseDB.isReady && 
         window.firebaseDB.auth && 
         window.firebaseDB.auth.currentUser !== null;
};

/**
 * Retry a Firebase operation
 * @param {Function} operation - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in ms
 * @returns {Promise<any>}
 */
window.retryFirebaseOperation = async function(operation, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`❌ Operation failed (attempt ${i + 1}/${maxRetries}):`, error);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

// ============================================
// 📊 Firebase Error Handler
// ============================================
window.handleFirebaseError = function(error) {
  const errorMessages = {
    'permission-denied': '🔒 Akses ditolak. Periksa aturan keamanan Firebase.',
    'unavailable': '📡 Firebase tidak tersedia. Periksa koneksi internet.',
    'unauthenticated': '🔐 Belum terautentikasi. Silakan login.',
    'not-found': '🔍 Data tidak ditemukan.',
    'already-exists': '⚠️ Data sudah ada.',
    'resource-exhausted': '💾 Kuota Firebase habis.',
    'failed-precondition': '⚠️ Kondisi tidak terpenuhi.',
    'aborted': '🚫 Operasi dibatalkan.',
    'out-of-range': '📏 Nilai di luar jangkauan.',
    'unimplemented': '🚧 Fitur belum tersedia.',
    'internal': '⚙️ Kesalahan internal Firebase.',
    'data-loss': '💔 Data hilang atau rusak.',
    'deadline-exceeded': '⏱️ Waktu tunggu habis.'
  };

  const code = error.code || 'unknown';
  const message = errorMessages[code] || `❌ Error: ${error.message}`;
  
  console.error('Firebase Error:', {
    code,
    message: error.message,
    fullError: error
  });

  return {
    code,
    message,
    originalError: error
  };
};

// ============================================
// 🎨 UI Helper for Loading State
// ============================================
window.showFirebaseStatus = function(message, type = 'info') {
  const event = new CustomEvent('firebaseStatus', {
    detail: { message, type }
  });
  window.dispatchEvent(event);
  
  // Also log to console
  const emoji = {
    'info': 'ℹ️',
    'success': '✅',
    'warning': '⚠️',
    'error': '❌'
  };
  console.log(`${emoji[type] || 'ℹ️'} ${message}`);
};

// ============================================
// 🧪 Testing & Debug Helpers (only in development)
// ============================================
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.firebaseDebug = {
    /**
     * Test Firebase connection
     */
    async testConnection() {
      console.log("🧪 Testing Firebase connection...");
      try {
        const testCol = collection(db, 'connection_test');
        const docRef = await addDoc(testCol, {
          timestamp: serverTimestamp(),
          test: true
        });
        await deleteDoc(doc(db, 'connection_test', docRef.id));
        console.log("✅ Firebase connection test passed");
        return true;
      } catch (error) {
        console.error("❌ Firebase connection test failed:", error);
        return false;
      }
    },

    /**
     * Get Firebase status
     */
    getStatus() {
      return {
        isReady: window.firebaseDB.isReady,
        isAuthenticated: window.firebaseDB.isAuthenticated,
        currentUser: auth.currentUser,
        online: navigator.onLine
      };
    },

    /**
     * Force re-authentication
     */
    async reAuth() {
      await signInAnonymouslyWithRetry();
    }
  };

  console.log("🧪 Debug mode enabled. Use window.firebaseDebug for testing.");
}

// ============================================
// 📢 Initialization Complete
// ============================================
console.log("✅ firebase-config.js loaded successfully");
console.log("📦 Available at: window.firebaseDB");
console.log("🔄 Waiting for authentication...");

// Export for module usage (if needed)
export { app, db, auth, analytics };
