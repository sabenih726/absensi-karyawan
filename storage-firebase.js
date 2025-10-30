// ============================================
// 💾 storage-firebase.js
// Firebase Storage Manager for Attendance System
// ============================================

console.log('📦 Loading storage-firebase.js...');

class FirebaseStorageManager {
  constructor() {
    this.db = null;
    this.isReady = false;
    this.initPromise = this.init();
  }

  async init() {
    console.log('🔄 Initializing FirebaseStorageManager...');
    
    // Wait for Firebase to be ready
    await this.waitForFirebase();
    
    this.db = window.firebaseDB.db;
    this.isReady = true;
    
    console.log('✅ FirebaseStorageManager ready');
    window.dispatchEvent(new CustomEvent('storageManagerReady'));
  }

  async waitForFirebase() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 30;
      
      const checkFirebase = () => {
        if (window.firebaseDB && window.firebaseDB.isReady) {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('Firebase not ready after timeout'));
        } else {
          attempts++;
          setTimeout(checkFirebase, 500);
        }
      };
      
      checkFirebase();
    });
  }

  async waitForConnection() {
    if (this.isReady) return;
    
    return new Promise((resolve) => {
      if (this.isReady) {
        resolve();
      } else {
        window.addEventListener('storageManagerReady', () => resolve(), { once: true });
      }
    });
  }

  // ============================================
  // 👥 USERS (Face Data)
  // ============================================
  
  async getUsers() {
    try {
      const usersRef = window.firebaseDB.collection(this.db, 'users');
      const snapshot = await window.firebaseDB.getDocs(usersRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  async addUser(userData) {
    try {
      const usersRef = window.firebaseDB.collection(this.db, 'users');
      const docRef = await window.firebaseDB.addDoc(usersRef, {
        ...userData,
        createdAt: window.firebaseDB.serverTimestamp()
      });
      
      console.log('✅ User added:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding user:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteUser(userId) {
    try {
      const userRef = window.firebaseDB.doc(this.db, 'users', userId);
      await window.firebaseDB.deleteDoc(userRef);
      
      console.log('✅ User deleted:', userId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // 👨‍💼 EMPLOYEES
  // ============================================
  
  async getEmployees() {
    try {
      const employeesRef = window.firebaseDB.collection(this.db, 'employees');
      const snapshot = await window.firebaseDB.getDocs(employeesRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting employees:', error);
      return [];
    }
  }

  async saveEmployee(employeeData) {
    try {
      const employeesRef = window.firebaseDB.collection(this.db, 'employees');
      const docRef = await window.firebaseDB.addDoc(employeesRef, {
        ...employeeData,
        createdAt: window.firebaseDB.serverTimestamp()
      });
      
      console.log('✅ Employee saved:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error saving employee:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // ⏰ ATTENDANCE
  // ============================================
  
  async getAttendance() {
    try {
      const attendanceRef = window.firebaseDB.collection(this.db, 'attendance');
      const q = window.firebaseDB.query(
        attendanceRef,
        window.firebaseDB.orderBy('timestamp', 'desc')
      );
      const snapshot = await window.firebaseDB.getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
      }));
    } catch (error) {
      console.error('Error getting attendance:', error);
      return [];
    }
  }

  async getTodayAttendance(userName) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const attendanceRef = window.firebaseDB.collection(this.db, 'attendance');
      const q = window.firebaseDB.query(
        attendanceRef,
        window.firebaseDB.where('name', '==', userName),
        window.firebaseDB.where('timestamp', '>=', window.firebaseDB.Timestamp.fromDate(today))
      );
      
      const snapshot = await window.firebaseDB.getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
      }));
    } catch (error) {
      console.error('Error getting today attendance:', error);
      return [];
    }
  }

  async addAttendance(attendanceData) {
    try {
      const attendanceRef = window.firebaseDB.collection(this.db, 'attendance');
      const docRef = await window.firebaseDB.addDoc(attendanceRef, {
        ...attendanceData,
        timestamp: window.firebaseDB.serverTimestamp()
      });
      
      console.log('✅ Attendance added:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding attendance:', error);
      return { success: false, error: error.message };
    }
  }
}

// ============================================
// 🌍 Global Export
// ============================================
window.FirebaseStorageManager = FirebaseStorageManager;
console.log('✅ storage-firebase.js loaded');
console.log('📦 FirebaseStorageManager available globally');
