// ===================================
// storage-firebase.js
// Firebase Firestore Storage Manager
// ===================================

class FirebaseStorageManager {
  constructor() {
    // Validasi Firebase initialization
    if (!window.firebaseDB) {
      console.error("❌ Firebase belum diinisialisasi.");
      throw new Error("Firebase tidak tersedia. Pastikan firebase-config.js sudah dimuat.");
    }

    this.db = window.firebaseDB.db;
    this.usersCol = window.firebaseDB.collection(this.db, "users");
    this.employeesCol = window.firebaseDB.collection(this.db, "employees");
    this.attCol = window.firebaseDB.collection(this.db, "attendance");

    console.log("✅ FirebaseStorageManager initialized");
  }

  // ===================================
  // USERS / Karyawan Terdaftar
  // ===================================
  
  /**
   * Mengambil semua user yang terdaftar
   * @returns {Promise<Array>} Array of users
   */
  async getUsers() {
    try {
      const qs = await window.firebaseDB.getDocs(this.usersCol);
      const users = qs.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          label: data.label,
          descriptors: data.descriptors,
          createdAt: data.createdAt ? this._timestampToDate(data.createdAt) : null
        };
      });
      console.log(`📦 Loaded ${users.length} users from Firebase`);
      return users;
    } catch (error) {
      console.error("❌ Error getting users:", error);
      return [];
    }
  }

  /**
   * Menambahkan user baru
   * @param {Object} data - User data dengan label dan descriptors
   * @returns {Promise<string>} Document ID
   */
  async addUser(data) {
    try {
      if (!data.label || !data.descriptors) {
        throw new Error("Data user tidak lengkap (label dan descriptors diperlukan)");
      }

      const docRef = await window.firebaseDB.addDoc(this.usersCol, {
        label: data.label,
        descriptors: data.descriptors,
        createdAt: window.firebaseDB.serverTimestamp()
      });

      console.log(`✅ User ${data.label} added with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error("❌ Error adding user:", error);
      throw error;
    }
  }

  /**
   * Menghapus user berdasarkan ID
   * @param {string} userId - Document ID
   */
  async deleteUser(userId) {
    try {
      const docRef = window.firebaseDB.doc(this.db, "users", userId);
      await window.firebaseDB.deleteDoc(docRef);
      console.log(`✅ User ${userId} deleted`);
    } catch (error) {
      console.error("❌ Error deleting user:", error);
      throw error;
    }
  }

  // ===================================
  // ATTENDANCE / Absensi
  // ===================================

  /**
   * Menambahkan record absensi
   * @param {Object} record - Attendance record
   * @returns {Promise<string>} Document ID
   */
  async addAttendance(record) {
    try {
      if (!record.name || !record.type) {
        throw new Error("Data absensi tidak lengkap (name dan type diperlukan)");
      }

      const docRef = await window.firebaseDB.addDoc(this.attCol, {
        name: record.name,
        type: record.type,
        location: record.location || null,
        timestamp: window.firebaseDB.serverTimestamp()
      });

      console.log(`✅ Attendance recorded for ${record.name} (${record.type}): ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error("❌ Error adding attendance:", error);
      throw error;
    }
  }

  /**
   * Mengambil semua record absensi
   * @returns {Promise<Array>} Array of attendance records
   */
  async getAttendance() {
    try {
      const qs = await window.firebaseDB.getDocs(this.attCol);
      const attendance = qs.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          type: data.type,
          location: data.location,
          timestamp: data.timestamp ? this._timestampToDate(data.timestamp) : new Date()
        };
      });
      console.log(`📦 Loaded ${attendance.length} attendance records`);
      return attendance;
    } catch (error) {
      console.error("❌ Error getting attendance:", error);
      return [];
    }
  }

  /**
   * Mengambil absensi hari ini
   * @param {string|null} name - Nama karyawan (optional)
   * @returns {Promise<Array>} Array of today's attendance
   */
  async getTodayAttendance(name = null) {
    try {
      // Set waktu untuk hari ini (00:00:00)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Set waktu untuk besok (00:00:00)
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Konversi ke Firestore Timestamp
      const todayTimestamp = window.firebaseDB.Timestamp.fromDate(today);
      const tomorrowTimestamp = window.firebaseDB.Timestamp.fromDate(tomorrow);

      // Query dengan range timestamp
      let q = window.firebaseDB.query(
        this.attCol,
        window.firebaseDB.where("timestamp", ">=", todayTimestamp),
        window.firebaseDB.where("timestamp", "<", tomorrowTimestamp)
      );

      // Jika ada filter nama
      if (name) {
        q = window.firebaseDB.query(
          this.attCol,
          window.firebaseDB.where("name", "==", name),
          window.firebaseDB.where("timestamp", ">=", todayTimestamp),
          window.firebaseDB.where("timestamp", "<", tomorrowTimestamp)
        );
      }

      const snap = await window.firebaseDB.getDocs(q);
      const attendance = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          type: data.type,
          location: data.location,
          timestamp: data.timestamp ? this._timestampToDate(data.timestamp) : new Date()
        };
      });

      console.log(`📦 Today's attendance for ${name || 'all'}: ${attendance.length} records`);
      return attendance;
    } catch (error) {
      console.error("❌ Error getting today's attendance:", error);
      
      // Fallback: Get all attendance and filter locally
      console.log("⚠️ Trying fallback method...");
      return await this._getTodayAttendanceFallback(name);
    }
  }

  /**
   * Fallback method untuk getTodayAttendance jika query gagal
   * @private
   */
  async _getTodayAttendanceFallback(name = null) {
    try {
      const all = await this.getAttendance();
      const today = new Date().toDateString();
      
      let filtered = all.filter(a => {
        const aDate = new Date(a.timestamp);
        return aDate.toDateString() === today;
      });

      if (name) {
        filtered = filtered.filter(a => a.name === name);
      }

      return filtered;
    } catch (error) {
      console.error("❌ Fallback method also failed:", error);
      return [];
    }
  }

  /**
   * Mengambil absensi berdasarkan rentang tanggal
   * @param {Date} startDate - Tanggal mulai
   * @param {Date} endDate - Tanggal akhir
   * @param {string|null} name - Nama karyawan (optional)
   * @returns {Promise<Array>}
   */
  async getAttendanceByDateRange(startDate, endDate, name = null) {
    try {
      const startTimestamp = window.firebaseDB.Timestamp.fromDate(startDate);
      const endTimestamp = window.firebaseDB.Timestamp.fromDate(endDate);

      let q = window.firebaseDB.query(
        this.attCol,
        window.firebaseDB.where("timestamp", ">=", startTimestamp),
        window.firebaseDB.where("timestamp", "<=", endTimestamp)
      );

      if (name) {
        q = window.firebaseDB.query(
          this.attCol,
          window.firebaseDB.where("name", "==", name),
          window.firebaseDB.where("timestamp", ">=", startTimestamp),
          window.firebaseDB.where("timestamp", "<=", endTimestamp)
        );
      }

      const snap = await window.firebaseDB.getDocs(q);
      return snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          type: data.type,
          location: data.location,
          timestamp: this._timestampToDate(data.timestamp)
        };
      });
    } catch (error) {
      console.error("❌ Error getting attendance by date range:", error);
      return [];
    }
  }

  // ===================================
  // EMPLOYEES / Data Karyawan
  // ===================================

  /**
   * Menyimpan data karyawan
   * @param {Object} emp - Employee data
   * @returns {Promise<string>} Document ID
   */
  async saveEmployee(emp) {
    try {
      if (!emp.name) {
        throw new Error("Nama karyawan diperlukan");
      }

      const docRef = await window.firebaseDB.addDoc(this.employeesCol, {
        ...emp,
        createdAt: window.firebaseDB.serverTimestamp()
      });

      console.log(`✅ Employee ${emp.name} saved with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error("❌ Error saving employee:", error);
      throw error;
    }
  }

  /**
   * Mengambil semua data karyawan
   * @returns {Promise<Array>}
   */
  async getEmployees() {
    try {
      const qs = await window.firebaseDB.getDocs(this.employeesCol);
      const employees = qs.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt ? this._timestampToDate(data.createdAt) : null
        };
      });
      console.log(`📦 Loaded ${employees.length} employees`);
      return employees;
    } catch (error) {
      console.error("❌ Error getting employees:", error);
      return [];
    }
  }

  /**
   * Mengambil karyawan berdasarkan ID
   * @param {string} empId - Employee ID
   * @returns {Promise<Object|null>}
   */
  async getEmployeeById(empId) {
    try {
      const docRef = window.firebaseDB.doc(this.db, "employees", empId);
      const docSnap = await window.firebaseDB.getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt ? this._timestampToDate(data.createdAt) : null
        };
      }
      return null;
    } catch (error) {
      console.error("❌ Error getting employee:", error);
      return null;
    }
  }

  /**
   * Update data karyawan
   * @param {string} empId - Employee ID
   * @param {Object} data - Data to update
   */
  async updateEmployee(empId, data) {
    try {
      const docRef = window.firebaseDB.doc(this.db, "employees", empId);
      await window.firebaseDB.updateDoc(docRef, {
        ...data,
        updatedAt: window.firebaseDB.serverTimestamp()
      });
      console.log(`✅ Employee ${empId} updated`);
    } catch (error) {
      console.error("❌ Error updating employee:", error);
      throw error;
    }
  }

  /**
   * Hapus data karyawan
   * @param {string} empId - Employee ID
   */
  async deleteEmployee(empId) {
    try {
      const docRef = window.firebaseDB.doc(this.db, "employees", empId);
      await window.firebaseDB.deleteDoc(docRef);
      console.log(`✅ Employee ${empId} deleted`);
    } catch (error) {
      console.error("❌ Error deleting employee:", error);
      throw error;
    }
  }

  // ===================================
  // UTILITY METHODS
  // ===================================

  /**
   * Konversi Firestore Timestamp ke JavaScript Date
   * @private
   * @param {Object} timestamp - Firestore Timestamp
   * @returns {Date}
   */
  _timestampToDate(timestamp) {
    if (!timestamp) return new Date();
    
    // Jika sudah Date object
    if (timestamp instanceof Date) return timestamp;
    
    // Jika Firestore Timestamp
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // Jika object dengan seconds
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    
    // Fallback
    return new Date(timestamp);
  }

  /**
   * Clear all data (hati-hati!)
   * @param {string} confirm - Ketik "DELETE_ALL" untuk konfirmasi
   */
  async clearAllData(confirm) {
    if (confirm !== "DELETE_ALL") {
      throw new Error("Konfirmasi tidak sesuai. Ketik 'DELETE_ALL' untuk menghapus semua data.");
    }

    try {
      // Delete all users
      const users = await window.firebaseDB.getDocs(this.usersCol);
      for (const doc of users.docs) {
        await window.firebaseDB.deleteDoc(doc.ref);
      }

      // Delete all attendance
      const att = await window.firebaseDB.getDocs(this.attCol);
      for (const doc of att.docs) {
        await window.firebaseDB.deleteDoc(doc.ref);
      }

      // Delete all employees
      const emp = await window.firebaseDB.getDocs(this.employeesCol);
      for (const doc of emp.docs) {
        await window.firebaseDB.deleteDoc(doc.ref);
      }

      console.log("🗑️ All data cleared");
    } catch (error) {
      console.error("❌ Error clearing data:", error);
      throw error;
    }
  }

  /**
   * Get statistics
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    try {
      const [users, attendance, employees] = await Promise.all([
        this.getUsers(),
        this.getAttendance(),
        this.getEmployees()
      ]);

      const today = new Date().toDateString();
      const todayAtt = attendance.filter(a => new Date(a.timestamp).toDateString() === today);

      return {
        totalUsers: users.length,
        totalEmployees: employees.length,
        totalAttendance: attendance.length,
        todayAttendance: todayAtt.length,
        todayCheckIn: todayAtt.filter(a => a.type === 'check-in').length,
        todayCheckOut: todayAtt.filter(a => a.type === 'check-out').length
      };
    } catch (error) {
      console.error("❌ Error getting statistics:", error);
      return null;
    }
  }
}

// Export ke window object agar bisa diakses global
window.FirebaseStorageManager = FirebaseStorageManager;

console.log("✅ storage-firebase.js loaded successfully");
