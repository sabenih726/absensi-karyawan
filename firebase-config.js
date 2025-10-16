// ============================================
// 🔥 firebase-config.js
// Versi untuk HTML/JS langsung di browser (no build step)
// ============================================

// Import SDK langsung dari CDN Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  deleteDoc,
  onSnapshot,
  doc,
  serverTimestamp
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
// ✅ Inisialisasi Firebase & Auth anonim
// ============================================
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Autentikasi anonim agar perangkat bisa langsung write ke database
signInAnonymously(auth)
  .then(() => console.log("✅ Terhubung ke Firebase & sign-in anonim"))
  .catch((err) => console.error("❌ Gagal sign-in anonim:", err));

// ============================================
// 🌍 Ekspor global supaya dapat dipakai di halaman lain
// (employee.html & admin.html)
// ============================================
window.firebaseDB = {
  app,
  db,
  auth,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  deleteDoc,
  onSnapshot,
  doc,
  serverTimestamp
};
