// ============================================
// 🔐 admin-auth.js
// Autentikasi khusus untuk Admin Dashboard
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// ============================================
// 🔧 Config Firebase (sama dengan firebase-config.js)
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
// ✅ Initialize Firebase untuk Admin
// ============================================
console.log("🔐 Initializing Admin Authentication...");

let adminApp, adminAuth, adminDB;

try {
  // Cek apakah sudah ada app yang diinit
  try {
    adminApp = initializeApp(firebaseConfig, 'adminApp');
  } catch (error) {
    if (error.code === 'app/duplicate-app') {
      console.log("ℹ️ Firebase app already exists, reusing...");
      const { getApp } = await import("https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js");
      adminApp = getApp('adminApp');
    } else {
      throw error;
    }
  }
  
  adminAuth = getAuth(adminApp);
  adminDB = getFirestore(adminApp);
  
  console.log("✅ Admin Auth initialized successfully");
} catch (error) {
  console.error("❌ Admin Auth initialization failed:", error);
  throw error;
}

// ============================================
// 🔐 Admin Auth Functions
// ============================================

/**
 * Login dengan email dan password
 */
async function loginAdmin(email, password, rememberMe = false) {
  try {
    // Set persistence
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(adminAuth, persistence);
    
    // Sign in
    const userCredential = await signInWithEmailAndPassword(adminAuth, email, password);
    console.log("✅ Admin login successful:", userCredential.user.email);
    
    return {
      success: true,
      user: userCredential.user
    };
  } catch (error) {
    console.error("❌ Login failed:", error);
    
    let errorMessage = "Login gagal. ";
    
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage += "Email tidak valid.";
        break;
      case 'auth/user-disabled':
        errorMessage += "Akun telah dinonaktifkan.";
        break;
      case 'auth/user-not-found':
        errorMessage += "Email tidak terdaftar.";
        break;
      case 'auth/wrong-password':
        errorMessage += "Password salah.";
        break;
      case 'auth/invalid-credential':
        errorMessage += "Email atau password salah.";
        break;
      case 'auth/too-many-requests':
        errorMessage += "Terlalu banyak percobaan. Coba lagi nanti.";
        break;
      case 'auth/network-request-failed':
        errorMessage += "Periksa koneksi internet Anda.";
        break;
      default:
        errorMessage += error.message;
    }
    
    return {
      success: false,
      error: errorMessage,
      code: error.code
    };
  }
}

/**
 * Logout admin
 */
async function logoutAdmin() {
  try {
    await signOut(adminAuth);
    console.log("✅ Admin logout successful");
    return { success: true };
  } catch (error) {
    console.error("❌ Logout failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Reset password
 */
async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(adminAuth, email);
    console.log("✅ Password reset email sent to:", email);
    return {
      success: true,
      message: "Email reset password telah dikirim!"
    };
  } catch (error) {
    console.error("❌ Reset password failed:", error);
    
    let errorMessage = "Gagal mengirim email reset. ";
    
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage += "Email tidak valid.";
        break;
      case 'auth/user-not-found':
        errorMessage += "Email tidak terdaftar.";
        break;
      default:
        errorMessage += error.message;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Get current admin user
 */
function getCurrentAdmin() {
  return adminAuth.currentUser;
}

/**
 * Check if admin is logged in
 */
function isAdminLoggedIn() {
  return adminAuth.currentUser !== null;
}

/**
 * Wait for auth state to be determined
 */
function waitForAdminAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(adminAuth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

// ============================================
// 🌍 Export Global untuk diakses di halaman lain
// ============================================
window.adminAuth = {
  auth: adminAuth,
  db: adminDB,
  
  // Functions
  login: loginAdmin,
  logout: logoutAdmin,
  resetPassword: resetPassword,
  getCurrentUser: getCurrentAdmin,
  isLoggedIn: isAdminLoggedIn,
  waitForAuth: waitForAdminAuth,
  
  // Auth state listener
  onAuthStateChanged: (callback) => onAuthStateChanged(adminAuth, callback)
};

// ============================================
// 📢 Ready
// ============================================
console.log("✅ admin-auth.js loaded");
console.log("📦 Available at: window.adminAuth");

export { 
  adminAuth, 
  adminDB, 
  loginAdmin, 
  logoutAdmin, 
  resetPassword, 
  getCurrentAdmin, 
  isAdminLoggedIn,
  waitForAdminAuth
};
