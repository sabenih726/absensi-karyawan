// ============================================
// 💾 storage-firebase.js
// Manajemen data pengguna & absensi di Firestore
// ============================================

class FirebaseStorageManager {
    constructor() {
        if (!window.firebaseDB) {
            console.error("❌ firebaseDB not found! Pastikan firebase-config.js dimuat sebelum file ini.");
            return;
        }

        this.db = window.firebaseDB.db;
        this.initCollections();
    }

    initCollections() {
        this.usersCollection = window.firebaseDB.collection(this.db, "users");
        this.attendanceCollection = window.firebaseDB.collection(this.db, "attendance");
        this.employeesCollection = window.firebaseDB.collection(this.db, "employees");
    }

    // ============================================
    // 👥 USERS (Face Recognition)
    // ============================================
    async getUsers() {
        try {
            const querySnapshot = await window.firebaseDB.getDocs(this.usersCollection);
            const users = [];
            querySnapshot.forEach(doc => {
                users.push({ id: doc.id, ...doc.data() });
            });
            return users;
        } catch (error) {
            console.error("Error getUsers:", error);
            return [];
        }
    }

    async addUser(userData) {
        try {
            const docRef = await window.firebaseDB.addDoc(this.usersCollection, {
                ...userData,
                createdAt: window.firebaseDB.serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error addUser:", error);
            throw error;
        }
    }

    async deleteUser(userId) {
        try {
            await window.firebaseDB.deleteDoc(window.firebaseDB.doc(this.db, "users", userId));
            console.log(`🗑️ Deleted user: ${userId}`);
        } catch (error) {
            console.error("Error deleteUser:", error);
        }
    }

    listenUsers(callback) {
        return window.firebaseDB.onSnapshot(this.usersCollection, (snapshot) => {
            const users = [];
            snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
            callback(users);
        });
    }

    // ============================================
    // ⏰ ABSENSI
    // ============================================
    async addAttendance(record) {
        try {
            const docRef = await window.firebaseDB.addDoc(this.attendanceCollection, {
                ...record,
                timestamp: window.firebaseDB.serverTimestamp()
            });
            console.log("✅ Attendance added:", docRef.id);
            return docRef.id;
        } catch (error) {
            console.error("Error addAttendance:", error);
            throw error;
        }
    }

    async getAttendance(startDate = null, endDate = null) {
        try {
            let q = window.firebaseDB.query(this.attendanceCollection, window.firebaseDB.orderBy("timestamp", "desc"));

            if (startDate && endDate) {
                q = window.firebaseDB.query(
                    this.attendanceCollection,
                    window.firebaseDB.where("timestamp", ">=", startDate),
                    window.firebaseDB.where("timestamp", "<=", endDate),
                    window.firebaseDB.orderBy("timestamp", "desc")
                );
            }

            const querySnapshot = await window.firebaseDB.getDocs(q);
            const result = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                result.push({
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate?.() || new Date()
                });
            });
            return result;
        } catch (error) {
            console.error("Error getAttendance:", error);
            return [];
        }
    }

    listenAttendanceToday(callback) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const q = window.firebaseDB.query(
            this.attendanceCollection,
            window.firebaseDB.where("timestamp", ">=", today),
            window.firebaseDB.orderBy("timestamp", "desc")
        );

        return window.firebaseDB.onSnapshot(q, (snapshot) => {
            const records = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                records.push({ id: doc.id, ...data, timestamp: data.timestamp?.toDate?.() || new Date() });
            });
            callback(records);
        });
    }

    // ============================================
    // 🧑‍💼 EMPLOYEES
    // ============================================
    async getEmployees() {
        try {
            const querySnapshot = await window.firebaseDB.getDocs(this.employeesCollection);
            const employees = [];
            querySnapshot.forEach(doc => employees.push({ id: doc.id, ...doc.data() }));
            return employees;
        } catch (error) {
            console.error("Error getEmployees:", error);
            return [];
        }
    }

    async saveEmployee(employeeData) {
        try {
            const docRef = await window.firebaseDB.addDoc(this.employeesCollection, {
                ...employeeData,
                createdAt: window.firebaseDB.serverTimestamp()
            });
            console.log("✅ Employee saved:", docRef.id);
            return docRef.id;
        } catch (error) {
            console.error("Error saveEmployee:", error);
            throw error;
        }
    }

    async deleteEmployee(employeeId) {
        try {
            await window.firebaseDB.deleteDoc(window.firebaseDB.doc(this.db, "employees", employeeId));
            console.log(`🗑️ Deleted employee: ${employeeId}`);
        } catch (error) {
            console.error("Error deleteEmployee:", error);
        }
    }
}

// Ekspor global agar bisa digunakan di file employee/admin
window.FirebaseStorageManager = FirebaseStorageManager;
