// ============================================
// 🔐 password-auth.js
// Proteksi halaman admin dengan password sederhana
// ============================================

class SimpleAuth {
    constructor() {
        this.ADMIN_PASSWORD = "admin123"; // Ganti dengan password kuat
        this.ADMIN_SESSION_KEY = "adminAuthorized";
    }

    async checkAccess() {
        const alreadyAuth = sessionStorage.getItem(this.ADMIN_SESSION_KEY);
        if (alreadyAuth === "true") {
            console.log("✅ Admin authorized");
            return true;
        }

        const password = prompt("🔐 Masukkan Password Admin:");
        if (password === this.ADMIN_PASSWORD) {
            sessionStorage.setItem(this.ADMIN_SESSION_KEY, "true");
            alert("✅ Akses diterima. Selamat datang, Admin!");
            return true;
        } else {
            alert("❌ Password salah!");
            window.location.href = "employee.html"; // kembalikan ke portal karyawan
            return false;
        }
    }

    logout() {
        sessionStorage.removeItem(this.ADMIN_SESSION_KEY);
        alert("🔒 Anda telah logout.");
        window.location.href = "index.html";
    }
}

// Inisialisasi otomatis setiap admin.html dimuat
document.addEventListener("DOMContentLoaded", async () => {
    const auth = new SimpleAuth();
    await auth.checkAccess();

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => auth.logout());
    }
});
