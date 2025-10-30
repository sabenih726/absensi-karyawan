// ============================================
// 🔥 firebase-config.js - PWA Optimized
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
  endBefore,
  enableIndexedDbPersistence,      // 🆕 PWA: Offline persistence
  enableMultiTabIndexedDbPersistence // 🆕 PWA: Multi-tab support
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
// 💾 Enable Offline Persistence (PWA Feature)
// ============================================
let persistenceEnabled = false;

async function enableOfflinePersistence() {
  try {
    // Try multi-tab persistence first (recommended)
    await enableMultiTabIndexedDbPersistence(db);
    persistenceEnabled = true;
    console.log("✅ Multi-tab offline persistence enabled");
  } catch (err) {
    if (err.code === 'failed-precondition') {
      console.warn("⚠️ Multi-tab persistence failed (multiple tabs open). Trying single-tab...");
      try {
        await enableIndexedDbPersistence(db);
        persistenceEnabled = true;
        console.log("✅ Single-tab offline persistence enabled");
      } catch (persistErr) {
        console.error("❌ Failed to enable persistence:", persistErr);
      }
    } else if (err.code === 'unimplemented') {
      console.warn("⚠️ Offline persistence not available in this browser");
    } else {
      console.error("❌ Persistence error:", err);
    }
  }
}

// Enable persistence immediately
enableOfflinePersistence();

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
// 🌐 Network Status Monitoring (Enhanced for PWA)
// ============================================
let wasOffline = false;

function handleOnline() {
  console.log("🌐 Network online - reconnecting to Firebase...");
  
  if (wasOffline) {
    // Show user notification
    window.dispatchEvent(new CustomEvent('networkStatusChanged', {
      detail: { online: true, message: 'Koneksi kembali. Sinkronisasi data...' }
    }));
    
    // Re-authenticate if needed
    if (!auth.currentUser) {
      signInAnonymouslyWithRetry();
    }
  }
  
  wasOffline = false;
}

function handleOffline() {
  console.log("📡 Network offline - Firebase using cached data");
  wasOffline = true;
  
  // Show user notification
  window.dispatchEvent(new CustomEvent('networkStatusChanged', {
    detail: { 
      online: false, 
      message: persistenceEnabled 
        ? 'Mode offline. Data lokal tersedia.' 
        : 'Mode offline. Beberapa fitur tidak tersedia.'
    }
  }));
}

window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);

// Initial check
if (!navigator.onLine) {
  handleOffline();
}

// ============================================
// 🔄 Service Worker Integration
// ============================================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'FIREBASE_SYNC_REQUEST') {
      console.log("📤 Service Worker requesting Firebase sync");
      
      // Trigger background sync if needed
      window.dispatchEvent(new CustomEvent('backgroundSyncRequested'));
    }
  });

  // Notify SW when Firebase is ready
  navigator.serviceWorker.ready.then((registration) => {
    if (registration.active) {
      registration.active.postMessage({
        type: 'FIREBASE_READY',
        persistenceEnabled
      });
    }
  });
}

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
  
  // Helper flags
  isReady: false,
  isAuthenticated: false,
  persistenceEnabled: false,
  isOnline: navigator.onLine
};

// ============================================
// 🎯 Ready State Management
// ============================================
function setFirebaseReady() {
  window.firebaseDB.isReady = true;
  window.firebaseDB.isAuthenticated = !!auth.currentUser;
  window.firebaseDB.persistenceEnabled = persistenceEnabled;
  console.log("🎉 Firebase fully ready to use");
  console.log("💾 Offline persistence:", persistenceEnabled ? "✅ Enabled" : "❌ Disabled");
  window.dispatchEvent(new CustomEvent('firebaseReady', {
    detail: {
      persistenceEnabled,
      isOnline: navigator.onLine
    }
  }));
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
    window.firebaseDB.persistenceEnabled = persistenceEnabled;
    window.dispatchEvent(new CustomEvent('firebaseReady', {
      detail: {
        persistenceEnabled,
        isOnline: navigator.onLine,
        timeout: true
      }
    }));
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
 * Check if currently online
 * @returns {boolean}
 */
window.isOnline = function() {
  return navigator.onLine && window.isFirebaseConnected();
};

/**
 * Check if offline mode with persistence
 * @returns {boolean}
 */
window.isOfflineReady = function() {
  return window.firebaseDB && window.firebaseDB.persistenceEnabled;
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
      
      // Don't retry if offline and no persistence
      if (!navigator.onLine && !persistenceEnabled) {
        throw new Error('Offline and no persistence enabled');
      }
      
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

/**
 * Safe Firebase write operation (handles offline)
 * @param {Function} writeOp - Write operation function
 * @returns {Promise<{success: boolean, data?: any, error?: any, fromCache?: boolean}>}
 */
window.safeFirebaseWrite = async function(writeOp) {
  try {
    if (!navigator.onLine && !persistenceEnabled) {
      return {
        success: false,
        error: 'Offline and persistence not enabled',
        needsOnline: true
      };
    }
    
    const result = await writeOp();
    return {
      success: true,
      data: result,
      fromCache: !navigator.onLine
    };
  } catch (error) {
    console.error('Firebase write error:', error);
    return {
      success: false,
      error: window.handleFirebaseError(error)
    };
  }
};

/**
 * Safe Firebase read operation (handles offline)
 * @param {Function} readOp - Read operation function
 * @returns {Promise<{success: boolean, data?: any, error?: any, fromCache?: boolean}>}
 */
window.safeFirebaseRead = async function(readOp) {
  try {
    const result = await readOp();
    return {
      success: true,
      data: result,
      fromCache: !navigator.onLine && persistenceEnabled
    };
  } catch (error) {
    console.error('Firebase read error:', error);
    return {
      success: false,
      error: window.handleFirebaseError(error)
    };
  }
};

// ============================================
// 📊 Firebase Error Handler (Enhanced)
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
    'deadline-exceeded': '⏱️ Waktu tunggu habis.',
    'cancelled': '🚫 Operasi dibatalkan.',
    'invalid-argument': '⚠️ Argumen tidak valid.',
    'unknown': '❓ Kesalahan tidak diketahui.'
  };

  const code = error.code || 'unknown';
  const message = errorMessages[code] || `❌ Error: ${error.message}`;
  
  console.error('Firebase Error:', {
    code,
    message: error.message,
    fullError: error
  });

  // Dispatch event for UI handling
  window.dispatchEvent(new CustomEvent('firebaseError', {
    detail: { code, message, error }
  }));

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
// 📡 Sync Status Monitor (for PWA)
// ============================================
let pendingSyncOperations = 0;

window.trackSyncOperation = function(promise) {
  pendingSyncOperations++;
  updateSyncStatus();
  
  return promise.finally(() => {
    pendingSyncOperations--;
    updateSyncStatus();
  });
};

function updateSyncStatus() {
  window.dispatchEvent(new CustomEvent('firebaseSyncStatus', {
    detail: {
      pending: pendingSyncOperations,
      syncing: pendingSyncOperations > 0
    }
  }));
}

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
        persistenceEnabled: window.firebaseDB.persistenceEnabled,
        currentUser: auth.currentUser,
        online: navigator.onLine,
        pendingSync: pendingSyncOperations
      };
    },

    /**
     * Force re-authentication
     */
    async reAuth() {
      await signInAnonymouslyWithRetry();
    },

    /**
     * Clear offline cache
     */
    async clearOfflineCache() {
      console.log("🗑️ Clearing offline cache...");
      // Note: Firebase doesn't provide direct cache clearing
      // You'd need to reload the page after disabling persistence
      console.warn("⚠️ Reload page to clear cache");
    },

    /**
     * Simulate offline mode
     */
    simulateOffline() {
      console.log("📡 Simulating offline mode...");
      handleOffline();
    },

    /**
     * Simulate online mode
     */
    simulateOnline() {
      console.log("🌐 Simulating online mode...");
      handleOnline();
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
console.log("💾 Offline persistence:", persistenceEnabled ? "✅ Enabled" : "⏳ Loading...");

// Export for module usage (if needed)
export { app, db, auth, analytics };
