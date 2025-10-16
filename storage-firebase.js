// === storage-firebase.js ===
// Ganti semua operasi localStorage dengan Firestore

class FirebaseStorageManager {
  constructor() {
    if (!window.firebaseDB) {
      console.error("Firebase belum diinisialisasi.");
      return;
    }
    this.db = window.firebaseDB.db;
    this.usersCol = window.firebaseDB.collection(this.db, "users");
    this.employeesCol = window.firebaseDB.collection(this.db, "employees");
    this.attCol = window.firebaseDB.collection(this.db, "attendance");
  }

  // --- USERS / Karyawan Terdaftar ---
  async getUsers() {
    const qs = await window.firebaseDB.getDocs(this.usersCol);
    return qs.docs.map(d => ({ id:d.id, ...d.data() }));
  }
  async addUser(data) {
    await window.firebaseDB.addDoc(this.usersCol, {
      ...data,
      createdAt: window.firebaseDB.serverTimestamp()
    });
  }

  // --- ABSENSI ---
  async addAttendance(record) {
    await window.firebaseDB.addDoc(this.attCol, {
      ...record,
      timestamp: window.firebaseDB.serverTimestamp()
    });
  }

  async getTodayAttendance(name = null) {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
    let q = window.firebaseDB.query(
      this.attCol,
      window.firebaseDB.where("timestamp", ">=", today),
      window.firebaseDB.where("timestamp", "<", tomorrow)
    );
    if (name) q = window.firebaseDB.query(q, window.firebaseDB.where("name","==",name));
    const snap = await window.firebaseDB.getDocs(q);
    return snap.docs.map(d=>({id:d.id,...d.data()}));
  }

  // --- EMPLOYEES ---
  async saveEmployee(emp) {
    await window.firebaseDB.addDoc(this.employeesCol, {
      ...emp,
      createdAt: window.firebaseDB.serverTimestamp()
    });
  }
}
window.FirebaseStorageManager = FirebaseStorageManager;
