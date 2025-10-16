// ===================================
// storage-firebase.js - FIRESTORE FIX v2
// Save descriptors as base64 string to avoid nested array issues
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
    // HELPER: Encode/Decode Descriptors
    // ===================================
    
    /**
     * Encode descriptor array to base64 string
     * This avoids Firestore nested array limitation
     */
    _encodeDescriptor(descriptor) {
        try {
            // Ensure it's a regular array
            const arr = Array.isArray(descriptor) ? descriptor : Array.from(descriptor);
            
            // Convert to JSON string then base64
            const jsonStr = JSON.stringify(arr);
            return btoa(jsonStr);
        } catch (error) {
            console.error('Error encoding descriptor:', error);
            throw error;
        }
    }

    /**
     * Decode base64 string back to descriptor array
     */
    _decodeDescriptor(encoded) {
        try {
            // Decode base64 to JSON string
            const jsonStr = atob(encoded);
            // Parse to array
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error('Error decoding descriptor:', error);
            throw error;
        }
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
                
                // Decode descriptors from base64 strings
                let descriptors = [];
                if (data.descriptors_encoded && Array.isArray(data.descriptors_encoded)) {
                    descriptors = data.descriptors_encoded.map(encoded => 
                        this._decodeDescriptor(encoded)
                    );
                }
                // Fallback for old format (if any)
                else if (data.descriptors) {
                    descriptors = data.descriptors;
                }
                
                return {
                    id: d.id,
                    label: data.label,
                    descriptors: descriptors,
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

            // Validate and encode descriptors
            const encodedDescriptors = data.descriptors.map(desc => {
                // Ensure it's an array
                const arr = Array.isArray(desc) ? desc : Array.from(desc);
                
                // Validate length (face-api descriptors should be 128 length)
                if (arr.length !== 128) {
                    console.warn(`Descriptor length is ${arr.length}, expected 128`);
                }
                
                // Encode to base64 string
                return this._encodeDescriptor(arr);
            });

            console.log(`📝 Saving user with ${encodedDescriptors.length} encoded descriptor(s)`);

            const docRef = await window.firebaseDB.addDoc(this.usersCol, {
                label: data.label,
                descriptors_encoded: encodedDescriptors, // Array of strings (Firestore OK!)
                descriptorCount: encodedDescriptors.length,
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

    /**
     * Menambahkan record absensi
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
     */
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

            console.log(`📦 Today's attendance for ${name || 'all'}: ${filtered.length} records`);
            return filtered;
        } catch (error) {
            console.error("❌ Error getting today's attendance:", error);
            return [];
        }
    }

    /**
     * Mengambil absensi berdasarkan rentang tanggal
     */
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

    /**
     * Menyimpan data karyawan
     */
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

            console.log(`✅ Employee ${emp.name} saved with ID: ${docRef.id}`);
            return docRef.id;
        } catch (error) {
            console.error("❌ Error saving employee:", error);
            throw error;
        }
    }

    /**
     * Mengambil semua data karyawan
     */
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

    /**
     * Mengambil karyawan berdasarkan ID
     */
    async getEmployeeById(empId) {
        try {
            const docRef = window.firebaseDB.doc(this.db, "employees", empId);
            const docSnap = await window.firebaseDB.getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    name: data.name,
                    employeeId: data.id,
                    email: data.email,
                    department: data.department,
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
     */
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

    /**
     * Get statistics
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

    /**
     * Clear all test data (development only)
     */
    async clearTestData() {
        try {
            const users = await this.getUsers();
            const testUsers = users.filter(u => 
                u.label.includes('TEST') || 
                u.label.includes('_INIT_') || 
                u.label.includes('test')
            );

            for (const user of testUsers) {
                await this.deleteUser(user.id);
                console.log(`🗑️ Deleted test user: ${user.label}`);
            }

            console.log(`✅ Cleared ${testUsers.length} test users`);
            return testUsers.length;
        } catch (error) {
            console.error("❌ Error clearing test data:", error);
            throw error;
        }
    }
}

// Export ke window object
window.FirebaseStorageManager = FirebaseStorageManager;

console.log("✅ storage-firebase.js loaded successfully (Base64 encoding version)");
