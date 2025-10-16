// ===================================
// storage-firebase.js - FINAL FIX
// Store descriptor as a single flat object (no arrays at all)
// ===================================

class FirebaseStorageManager {
    constructor() {
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
    // HELPER: Convert Descriptors
    // ===================================
    
    /**
     * Convert array to flat object with numeric keys
     * Example: [0.1, 0.2, 0.3] => {0: 0.1, 1: 0.2, 2: 0.3}
     */
    _arrayToObject(arr) {
        const obj = {};
        for (let i = 0; i < arr.length; i++) {
            obj[`d${i}`] = Number(arr[i]); // Use d0, d1, d2... as keys
        }
        return obj;
    }

    /**
     * Convert flat object back to array
     * Example: {0: 0.1, 1: 0.2, 2: 0.3} => [0.1, 0.2, 0.3]
     */
    _objectToArray(obj) {
        const arr = [];
        for (let i = 0; i < 128; i++) { // Face descriptors are always 128 length
            arr.push(obj[`d${i}`] || 0);
        }
        return arr;
    }

    // ===================================
    // USERS / Karyawan Terdaftar
    // ===================================
    
    /**
     * Mengambil semua user yang terdaftar
     */
    async getUsers() {
        try {
            const qs = await window.firebaseDB.getDocs(this.usersCol);
            const users = qs.docs.map(d => {
                const data = d.data();
                
                // Convert descriptor object back to array
                const descriptor = data.descriptor ? this._objectToArray(data.descriptor) : [];
                
                return {
                    id: d.id,
                    label: data.label,
                    descriptors: [descriptor], // Wrap in array for compatibility
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
     */
    async addUser(data) {
        try {
            if (!data.label || !data.descriptors) {
                throw new Error("Data user tidak lengkap (label dan descriptors diperlukan)");
            }

            // Get first descriptor (we only need one per user)
            const descriptor = data.descriptors[0];
            
            // Ensure it's an array
            const arr = Array.isArray(descriptor) ? descriptor : Array.from(descriptor);
            
            // Validate length
            if (arr.length !== 128) {
                throw new Error(`Invalid descriptor length: ${arr.length} (expected 128)`);
            }

            // Convert to flat object (NO ARRAYS!)
            const descriptorObj = this._arrayToObject(arr);

            console.log(`📝 Saving user ${data.label} with descriptor object`);

            // Save to Firestore - NO NESTED ARRAYS!
            const docRef = await window.firebaseDB.addDoc(this.usersCol, {
                label: data.label,
                descriptor: descriptorObj, // Single object with d0, d1, d2...d127 keys
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

    async addAttendance(record) {
        try {
            if (!record.name || !record.type) {
                throw new Error("Data absensi tidak lengkap");
            }

            const docRef = await window.firebaseDB.addDoc(this.attCol, {
                name: record.name,
                type: record.type,
                location: record.location || null,
                timestamp: window.firebaseDB.serverTimestamp()
            });

            console.log(`✅ Attendance recorded: ${docRef.id}`);
            return docRef.id;
        } catch (error) {
            console.error("❌ Error adding attendance:", error);
            throw error;
        }
    }

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

    async getTodayAttendance(name = null) {
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
            console.error("❌ Error getting today's attendance:", error);
            return [];
        }
    }

    async getAttendanceByDateRange(startDate, endDate, name = null) {
        try {
            const all = await this.getAttendance();
            
            let filtered = all.filter(a => {
                const aDate = new Date(a.timestamp);
                return aDate >= startDate && aDate <= endDate;
            });

            if (name) {
                filtered = filtered.filter(a => a.name === name);
            }

            return filtered;
        } catch (error) {
            console.error("❌ Error getting attendance by date range:", error);
            return [];
        }
    }

    // ===================================
    // EMPLOYEES / Data Karyawan
    // ===================================

    async saveEmployee(emp) {
        try {
            if (!emp.name) {
                throw new Error("Nama karyawan diperlukan");
            }

            const docRef = await window.firebaseDB.addDoc(this.employeesCol, {
                name: emp.name,
                id: emp.id || '',
                email: emp.email || '',
                department: emp.department || '',
                createdAt: window.firebaseDB.serverTimestamp()
            });

            console.log(`✅ Employee ${emp.name} saved: ${docRef.id}`);
            return docRef.id;
        } catch (error) {
            console.error("❌ Error saving employee:", error);
            throw error;
        }
    }

    async getEmployees() {
        try {
            const qs = await window.firebaseDB.getDocs(this.employeesCol);
            const employees = qs.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    name: data.name,
                    employeeId: data.id,
                    email: data.email,
                    department: data.department,
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

    _timestampToDate(timestamp) {
        if (!timestamp) return new Date();
        if (timestamp instanceof Date) return timestamp;
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
            return timestamp.toDate();
        }
        if (timestamp.seconds) {
            return new Date(timestamp.seconds * 1000);
        }
        return new Date(timestamp);
    }

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

window.FirebaseStorageManager = FirebaseStorageManager;
console.log("✅ storage-firebase.js loaded (flat object version - NO ARRAYS!)");
