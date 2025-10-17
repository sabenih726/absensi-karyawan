// ============================================
// storage-firebase.js - CLEAN VERSION
// ============================================

class FirebaseStorageManager {
  constructor() {
    if (!window.firebaseDB) {
      throw new Error('Firebase not initialized');
    }

    this.db = window.firebaseDB.db;
    this.collection = window.firebaseDB.collection;
    this.doc = window.firebaseDB.doc;
    this.addDoc = window.firebaseDB.addDoc;
    this.getDoc = window.firebaseDB.getDoc;
    this.getDocs = window.firebaseDB.getDocs;
    this.setDoc = window.firebaseDB.setDoc;
    this.updateDoc = window.firebaseDB.updateDoc;
    this.deleteDoc = window.firebaseDB.deleteDoc;
    this.query = window.firebaseDB.query;
    this.where = window.firebaseDB.where;
    this.orderBy = window.firebaseDB.orderBy;
    this.serverTimestamp = window.firebaseDB.serverTimestamp;
    this.onSnapshot = window.firebaseDB.onSnapshot;

    console.log('✅ FirebaseStorageManager initialized');
  }

  async addUser(userData) {
    try {
      const { label, descriptors } = userData;

      if (!label || !descriptors || descriptors.length === 0) {
        throw new Error('Label and descriptors required');
      }

      console.log('💾 Adding user:', label);

      const descriptorsArray = descriptors.map((desc, index) => {
        let plainArray;
        
        if (desc instanceof Float32Array) {
          plainArray = Array.from(desc);
          console.log(`✅ Converted Float32Array (${plainArray.length} values)`);
        } else if (Array.isArray(desc)) {
          plainArray = desc;
          console.log(`✅ Already array (${plainArray.length} values)`);
        } else if (typeof desc === 'object' && desc !== null) {
          plainArray = Object.keys(desc)
            .sort((a, b) => parseInt(a.replace('d', '')) - parseInt(b.replace('d', '')))
            .map(key => desc[key]);
          console.log(`✅ Converted object (${plainArray.length} values)`);
        } else {
          throw new Error('Unknown descriptor type');
        }

        if (!Array.isArray(plainArray) || plainArray.length !== 128) {
          throw new Error(`Invalid descriptor: ${plainArray?.length || 0} values`);
        }

        return plainArray;
      });

      const userDoc = {
        label: label,
        descriptors: descriptorsArray,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('💾 Saving:', {
        label: userDoc.label,
        descriptorCount: userDoc.descriptors.length,
        isArray: Array.isArray(userDoc.descriptors[0])
      });

      const docRef = await this.addDoc(
        this.collection(this.db, 'users'),
        userDoc
      );

      console.log('✅ User saved:', docRef.id);
      return { id: docRef.id, ...userDoc };

    } catch (error) {
      console.error('❌ Error adding user:', error);
      throw error;
    }
  }

  async getUsers() {
    try {
      const querySnapshot = await this.getDocs(
        this.collection(this.db, 'users')
      );

      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });

      console.log(`📥 Retrieved ${users.length} users`);
      return users;

    } catch (error) {
      console.error('❌ Error getting users:', error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const docRef = this.doc(this.db, 'users', userId);
      const docSnap = await this.getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('User not found');
      }
    } catch (error) {
      console.error('❌ Error getting user:', error);
      throw error;
    }
  }

  async updateUser(userId, userData) {
    try {
      const docRef = this.doc(this.db, 'users', userId);
      const updateData = { ...userData, updatedAt: new Date().toISOString() };
      await this.updateDoc(docRef, updateData);
      console.log('✅ User updated:', userId);
      return { id: userId, ...updateData };
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(userId) {
    try {
      const docRef = this.doc(this.db, 'users', userId);
      await this.deleteDoc(docRef);
      console.log('✅ User deleted:', userId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  }

  async saveAttendance(attendanceData) {
    try {
      const { name, type, timestamp, confidence, location, device } = attendanceData;

      if (!name || !type || !timestamp) {
        throw new Error('Name, type, timestamp required');
      }

      const record = {
        name: name,
        type: type,
        timestamp: timestamp,
        confidence: confidence || null,
        location: location || null,
        device: device || 'unknown',
        createdAt: new Date().toISOString()
      };

      const docRef = await this.addDoc(
        this.collection(this.db, 'attendance'),
        record
      );

      console.log('✅ Attendance saved:', type, name);
      return { id: docRef.id, ...record };

    } catch (error) {
      console.error('❌ Error saving attendance:', error);
      throw error;
    }
  }

  async getAttendance(options = {}) {
    try {
      const { startDate, endDate, employeeName, type, limit } = options;
      let q = this.collection(this.db, 'attendance');
      const constraints = [];

      if (employeeName) constraints.push(this.where('name', '==', employeeName));
      if (type) constraints.push(this.where('type', '==', type));
      if (startDate) constraints.push(this.where('timestamp', '>=', startDate));
      if (endDate) constraints.push(this.where('timestamp', '<=', endDate));
      
      constraints.push(this.orderBy('timestamp', 'desc'));
      if (limit) constraints.push(this.limit(limit));

      if (constraints.length > 0) {
        q = this.query(q, ...constraints);
      }

      const querySnapshot = await this.getDocs(q);
      const records = [];
      
      querySnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() });
      });

      console.log(`📥 Retrieved ${records.length} attendance records`);
      return records;

    } catch (error) {
      console.error('❌ Error getting attendance:', error);
      
      try {
        console.log('⚠️ Fallback query...');
        const querySnapshot = await this.getDocs(
          this.collection(this.db, 'attendance')
        );
        const records = [];
        querySnapshot.forEach((doc) => {
          records.push({ id: doc.id, ...doc.data() });
        });
        console.log(`📥 Fallback: ${records.length} records`);
        return records;
      } catch (fallbackError) {
        console.error('❌ Fallback failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  async getAttendanceByDate(date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      return await this.getAttendance({
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString()
      });
    } catch (error) {
      console.error('❌ Error getting attendance by date:', error);
      throw error;
    }
  }

  async getTodayAttendance() {
    try {
      return await this.getAttendanceByDate(new Date());
    } catch (error) {
      console.error('❌ Error getting today attendance:', error);
      throw error;
    }
  }

  async deleteAttendance(attendanceId) {
    try {
      const docRef = this.doc(this.db, 'attendance', attendanceId);
      await this.deleteDoc(docRef);
      console.log('✅ Attendance deleted:', attendanceId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting attendance:', error);
      throw error;
    }
  }

  async saveEmployee(employeeData) {
    try {
      const { name, id, email, department, phone, position } = employeeData;

      if (!name) {
        throw new Error('Employee name required');
      }

      const employee = {
        name: name,
        id: id || null,
        email: email || null,
        department: department || null,
        phone: phone || null,
        position: position || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = this.doc(this.db, 'employees', name);
      await this.setDoc(docRef, employee, { merge: true });
      console.log('✅ Employee saved:', name);
      return employee;

    } catch (error) {
      console.error('❌ Error saving employee:', error);
      throw error;
    }
  }

  async getEmployees() {
    try {
      const querySnapshot = await this.getDocs(
        this.collection(this.db, 'employees')
      );
      const employees = [];
      querySnapshot.forEach((doc) => {
        employees.push({ id: doc.id, ...doc.data() });
      });
      console.log(`📥 Retrieved ${employees.length} employees`);
      return employees;
    } catch (error) {
      console.error('❌ Error getting employees:', error);
      throw error;
    }
  }

  async getEmployeeByName(name) {
    try {
      const docRef = this.doc(this.db, 'employees', name);
      const docSnap = await this.getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting employee:', error);
      throw error;
    }
  }

  async updateEmployee(name, employeeData) {
    try {
      const docRef = this.doc(this.db, 'employees', name);
      const updateData = { ...employeeData, updatedAt: new Date().toISOString() };
      await this.updateDoc(docRef, updateData);
      console.log('✅ Employee updated:', name);
      return { id: name, ...updateData };
    } catch (error) {
      console.error('❌ Error updating employee:', error);
      throw error;
    }
  }

  async deleteEmployee(name) {
    try {
      const docRef = this.doc(this.db, 'employees', name);
      await this.deleteDoc(docRef);
      console.log('✅ Employee deleted:', name);
      return true;
    } catch (error) {
      console.error('❌ Error deleting employee:', error);
      throw error;
    }
  }

  async getAttendanceStats(startDate, endDate) {
    try {
      const attendance = await this.getAttendance({ startDate, endDate });
      const users = await this.getUsers();

      const stats = {
        totalEmployees: users.length,
        totalRecords: attendance.length,
        checkIns: attendance.filter(a => a.type === 'check-in').length,
        checkOuts: attendance.filter(a => a.type === 'check-out').length,
        uniqueEmployees: [...new Set(attendance.map(a => a.name))].length
      };

      return stats;
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      throw error;
    }
  }

  onAttendanceChange(callback) {
    try {
      const q = this.query(
        this.collection(this.db, 'attendance'),
        this.orderBy('timestamp', 'desc')
      );

      const unsubscribe = this.onSnapshot(q, (querySnapshot) => {
        const records = [];
        querySnapshot.forEach((doc) => {
          records.push({ id: doc.id, ...doc.data() });
        });
        callback(records);
      });

      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up listener:', error);
      throw error;
    }
  }

  onUsersChange(callback) {
    try {
      const unsubscribe = this.onSnapshot(
        this.collection(this.db, 'users'),
        (querySnapshot) => {
          const users = [];
          querySnapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
          });
          callback(users);
        }
      );
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up listener:', error);
      throw error;
    }
  }

  async clearAllAttendance() {
    try {
      const querySnapshot = await this.getDocs(
        this.collection(this.db, 'attendance')
      );
      const deletePromises = [];
      querySnapshot.forEach((doc) => {
        deletePromises.push(this.deleteDoc(doc.ref));
      });
      await Promise.all(deletePromises);
      console.log(`✅ Deleted ${deletePromises.length} attendance records`);
      return deletePromises.length;
    } catch (error) {
      console.error('❌ Error clearing attendance:', error);
      throw error;
    }
  }

  async clearAllUsers() {
    try {
      const querySnapshot = await this.getDocs(
        this.collection(this.db, 'users')
      );
      const deletePromises = [];
      querySnapshot.forEach((doc) => {
        deletePromises.push(this.deleteDoc(doc.ref));
      });
      await Promise.all(deletePromises);
      console.log(`✅ Deleted ${deletePromises.length} users`);
      return deletePromises.length;
    } catch (error) {
      console.error('❌ Error clearing users:', error);
      throw error;
    }
  }

  async exportAllData() {
    try {
      const users = await this.getUsers();
      const attendance = await this.getAttendance();
      const employees = await this.getEmployees();

      const exportData = {
        users: users,
        attendance: attendance,
        employees: employees,
        exportDate: new Date().toISOString()
      };

      console.log('✅ Data exported');
      return exportData;
    } catch (error) {
      console.error('❌ Error exporting data:', error);
      throw error;
    }
  }
}

if (typeof window !== 'undefined') {
  window.FirebaseStorageManager = FirebaseStorageManager;
  console.log('✅ FirebaseStorageManager loaded');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirebaseStorageManager;
}
