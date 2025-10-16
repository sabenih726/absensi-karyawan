// ============================================
// 🔥 firebase-config.js
// Setup & koneksi ke Firebase Firestore
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  doc,
  query,
  where,
  orderBy,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// ============================================
// 🚀 GANTI DENGAN KONFIGURASI FIREBASE ANDA
// ============================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ============================================
// 🔧 INISIALISASI FIREBASE
// ============================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Anonymous Sign-in agar user langsung bisa konek database
signInAnonymously(auth)
  .then(() => {
    console.log("✅ Firebase connected & signed in anonymously");
  })
  .catch((error) => {
    console.error("❌ Sign-in Error:", error);
  });

// ============================================
// 🌍 Ekspor global agar bisa diakses di file lain
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
