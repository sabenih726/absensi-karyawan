// ============================================
// 💾 storage-firebase.js - FIXED for Firestore
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
  // 🔧 HELPER: Convert Nested Arrays for Firestore
  // ============================================
  
  /**
   * Convert nested arrays to Firestore-compatible format
   * [array1, array2] => {0: array1, 1: array2}
   */
  convertDescriptorsToFirestore(descriptors) {
    if (!Array.isArray(descriptors)) {
      throw new Error('Descriptors must be an array');
    }
    
    const firestoreDescriptors = {};
    descriptors.forEach((desc, index) => {
      // Convert to plain array if it's Float32Array
      firestoreDescriptors[index.toString()] = Array.isArray(desc) 
        ? desc 
        : Array.from(desc);
    });
    
    return {
      data: firestoreDescriptors,
      count: descriptors.length
    };
  }

  /**
   * Convert Firestore format back to nested arrays
   * {0: array1, 1: array2} => [array1, array2]
   */
  convertDescriptorsFromFirestore(firestoreData) {
    if (!firestoreData || !firestoreData.data) {
      console.warn('⚠️ Invalid descriptor data');
      return [];
    }
    
    const descriptors = [];
    const count = firestoreData.count || 0;
    
    for (let i = 0; i < count; i++) {
      const desc = firestoreData.data[i.toString()];
      if (desc) {
        descriptors.push(desc);
      }
    }
    
    return descriptors;
  }

  // ============================================
  // 👥 USERS (Face Data)
  // ============================================
  
  async getUsers() {
      try {
        const usersRef = window.firebaseDB.collection(this.db, 'users');
        const snapshot = await window.firebaseDB.getDocs(usersRef);
        
        if (snapshot.empty) {
          console.warn('⚠️ Users collection is empty');
          return [];
        }
        
        const users = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Convert descriptors from Firestore format
          let descriptors = [];
          if (data.descriptors) {
            descriptors = this.convertDescriptorsFromFirestore(data.descriptors);
          }
          
          // Convert timestamp to Date object
          let createdAt = null;
          if (data.createdAt) {
            try {
              // Firestore Timestamp has toDate() method
              if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
                createdAt = data.createdAt.toDate();
              }
              // Handle timestamp object with seconds
              else if (data.createdAt.seconds) {
                createdAt = new Date(data.createdAt.seconds * 1000);
              }
              // Handle Date object
              else if (data.createdAt instanceof Date) {
                createdAt = data.createdAt;
              }
              // Handle timestamp number
              else if (typeof data.createdAt === 'number') {
                createdAt = new Date(data.createdAt);
              }
            } catch (error) {
              console.warn('Error converting timestamp:', error);
            }
          }
          
          return {
            id: doc.id,
            label: data.label,
            descriptors: descriptors,
            createdAt: createdAt
          };
        });
        
        console.log(`✅ Loaded ${users.length} users from database`);
        return users;
        
      } catch (error) {
        console.error('❌ Error getting users:', error);
        return [];
      }
    }

  async addUser(userData) {
    try {
      // Validate input
      if (!userData.label) {
        throw new Error('User label is required');
      }
      
      if (!userData.descriptors || !Array.isArray(userData.descriptors)) {
        throw new Error('User descriptors must be an array');
      }
      
      if (userData.descriptors.length === 0) {
        throw new Error('At least one descriptor is required');
      }
      
      // Convert descriptors to Firestore-compatible format
      const firestoreDescriptors = this.convertDescriptorsToFirestore(userData.descriptors);
      
      const usersRef = window.firebaseDB.collection(this.db, 'users');
      const docRef = await window.firebaseDB.addDoc(usersRef, {
        label: userData.label,
        descriptors: firestoreDescriptors,
        createdAt: window.firebaseDB.serverTimestamp()
      });
      
      console.log('✅ User added:', docRef.id);
      return { success: true, id: docRef.id };
      
    } catch (error) {
      console.error('❌ Error adding user:', error);
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
      console.error('❌ Error deleting user:', error);
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
      console.error('❌ Error getting employees:', error);
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
      console.error('❌ Error saving employee:', error);
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
        window.firebaseDB.orderBy('timestamp', 'desc'),
        window.firebaseDB.limit(1000) // Limit for performance
      );
      const snapshot = await window.firebaseDB.getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
      }));
    } catch (error) {
      console.error('❌ Error getting attendance:', error);
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
      console.error('❌ Error getting today attendance:', error);
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
      console.error('❌ Error adding attendance:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // 🧪 DEBUG & TESTING
  // ============================================
  
  async testConnection() {
    try {
      console.log('🧪 Testing Firestore connection...');
      
      const testRef = window.firebaseDB.collection(this.db, 'connection_test');
      const docRef = await window.firebaseDB.addDoc(testRef, {
        test: true,
        timestamp: window.firebaseDB.serverTimestamp()
      });
      
      await window.firebaseDB.deleteDoc(
        window.firebaseDB.doc(this.db, 'connection_test', docRef.id)
      );
      
      console.log('✅ Connection test passed');
      return true;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
  }

  async getDatabaseStats() {
    try {
      const users = await this.getUsers();
      const employees = await this.getEmployees();
      const attendance = await this.getAttendance();
      
      return {
        users: users.length,
        employees: employees.length,
        attendance: attendance.length,
        validUsers: users.filter(u => u.descriptors && u.descriptors.length > 0).length
      };
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      return null;
    }
  }
}

// ============================================
// 🌍 Global Export
// ============================================
window.FirebaseStorageManager = FirebaseStorageManager;

// Auto-create instance if Firebase is ready
if (window.firebaseDB && window.firebaseDB.isReady) {
  console.log('✅ Auto-creating storage instance');
  window.storageManager = new FirebaseStorageManager();
}

console.log('✅ storage-firebase.js loaded');
console.log('📦 FirebaseStorageManager available globally');
