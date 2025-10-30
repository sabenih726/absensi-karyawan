// ============================================
// 🔧 PWA INITIALIZATION SCRIPT
// Reusable for all pages
// ============================================

console.log('🚀 PWA Init loading...');

class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.swRegistration = null;
    this.init();
  }

  async init() {
    this.checkNetworkStatus();
    this.registerServiceWorker();
    this.setupInstallPrompt();
    this.checkPWAStatus();
    this.detectStandaloneMode();
  }

  // ============================================
  // 🔄 SERVICE WORKER
  // ============================================
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('❌ Service Worker not supported');
      return;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });

      console.log('✅ Service Worker registered:', this.swRegistration.scope);

      // Check for updates immediately
      this.swRegistration.update();

      // Listen for updates
      this.swRegistration.addEventListener('updatefound', () => {
        const newWorker = this.swRegistration.installing;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.showUpdateNotification();
          }
        });
      });

      // Auto-check for updates every 30 minutes
      setInterval(() => {
        this.swRegistration.update();
      }, 30 * 60 * 1000);

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('💬 Message from SW:', event.data);
        
        if (event.data.type === 'CACHE_UPDATED') {
          this.showToast('Cache updated', '📦');
        }
      });

    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }

  // ============================================
  // 🔔 UPDATE NOTIFICATION
  // ============================================
  showUpdateNotification() {
    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.className = 'fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-lg shadow-2xl z-[9999] transform transition-all duration-300 animate-slideDown';
    banner.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3 flex-1">
          <span class="text-2xl flex-shrink-0">🔄</span>
          <div class="flex-1 min-w-0">
            <p class="font-bold text-sm">Update Tersedia</p>
            <p class="text-xs opacity-90 mt-1">Versi baru aplikasi sudah siap digunakan</p>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <button 
            id="pwa-update-btn" 
            class="bg-white text-green-600 px-3 py-1.5 rounded text-xs font-semibold hover:bg-green-50 transition whitespace-nowrap">
            Update Sekarang
          </button>
          <button 
            id="pwa-update-later" 
            class="text-white text-xs hover:text-green-100 transition">
            Nanti
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Update now
    document.getElementById('pwa-update-btn').addEventListener('click', () => {
      if (this.swRegistration && this.swRegistration.waiting) {
        this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    });

    // Update later
    document.getElementById('pwa-update-later').addEventListener('click', () => {
      banner.remove();
      // Show reminder after 1 hour
      setTimeout(() => {
        this.showUpdateNotification();
      }, 60 * 60 * 1000);
    });
  }

  // ============================================
  // 📱 INSTALL PROMPT
  // ============================================
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('💾 Install prompt available');
      e.preventDefault();
      this.deferredPrompt = e;

      // Check if dismissed recently
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed) {
        const hoursSince = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60);
        if (hoursSince < 72) return; // Don't show for 72 hours
      }

      // Don't show on login page
      if (window.location.pathname.includes('login')) {
        return;
      }

      setTimeout(() => this.showInstallBanner(), 3000); // Show after 3 seconds
    });

    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed successfully');
      this.showToast('Aplikasi berhasil diinstall! 🎉', '✅');
      localStorage.setItem('pwa-installed', 'true');
      this.deferredPrompt = null;
    });
  }

  showInstallBanner() {
    // Don't show if already installed
    if (this.isStandalone()) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-lg shadow-2xl z-[9999] transform transition-all duration-300 animate-slideUp';
    banner.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3 flex-1">
          <span class="text-3xl flex-shrink-0">📱</span>
          <div class="flex-1 min-w-0">
            <p class="font-bold text-sm">Install Aplikasi</p>
            <p class="text-xs opacity-90 mt-1">Akses lebih cepat & bisa offline</p>
            <div class="flex gap-2 mt-2 text-xs">
              <span class="bg-white bg-opacity-20 px-2 py-0.5 rounded">⚡ Cepat</span>
              <span class="bg-white bg-opacity-20 px-2 py-0.5 rounded">📡 Offline</span>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <button 
            id="pwa-install-btn" 
            class="bg-white text-blue-600 px-3 py-1.5 rounded text-xs font-semibold hover:bg-blue-50 transition whitespace-nowrap">
            Install
          </button>
          <button 
            id="pwa-dismiss-btn" 
            class="text-white text-xs hover:text-blue-100 transition">
            Tidak
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Install button
    document.getElementById('pwa-install-btn').addEventListener('click', async () => {
      if (!this.deferredPrompt) return;

      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      console.log(`Install prompt outcome: ${outcome}`);

      if (outcome === 'accepted') {
        this.showToast('Terima kasih! Aplikasi sedang diinstall...', '⏳');
      }

      this.deferredPrompt = null;
      banner.remove();
    });

    // Dismiss button
    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      banner.remove();
    });

    // Auto dismiss after 20 seconds
    setTimeout(() => {
      if (document.getElementById('pwa-install-banner')) {
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 300);
      }
    }, 20000);
  }

  // ============================================
  // 🌐 NETWORK STATUS
  // ============================================
  checkNetworkStatus() {
    const updateStatus = () => {
      const statusIcon = document.getElementById('network-status-icon');
      const statusText = document.getElementById('network-status-text');

      if (statusIcon && statusText) {
        if (navigator.onLine) {
          statusIcon.textContent = '🟢';
          statusText.textContent = 'Online';
          statusIcon.parentElement?.classList.remove('bg-red-500');
          statusIcon.parentElement?.classList.add('bg-green-500');
        } else {
          statusIcon.textContent = '🔴';
          statusText.textContent = 'Offline';
          statusIcon.parentElement?.classList.remove('bg-green-500');
          statusIcon.parentElement?.classList.add('bg-red-500');
        }
      }
    };

    window.addEventListener('online', () => {
      console.log('🌐 Back online');
      updateStatus();
      this.showToast('Koneksi kembali', '✅');
    });

    window.addEventListener('offline', () => {
      console.log('📡 Gone offline');
      updateStatus();
      this.showToast('Mode offline - Beberapa fitur terbatas', '⚠️');
    });

    updateStatus();
  }

  // ============================================
  // 📊 PWA STATUS CHECKER
  // ============================================
  checkPWAStatus() {
    window.addEventListener('load', () => {
      const statusIcon = document.getElementById('pwa-status-icon');
      const statusText = document.getElementById('pwa-status-text');

      if (!statusIcon || !statusText) return;

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
          if (registration) {
            statusIcon.textContent = '✅';
            statusText.textContent = 'PWA Active - Ready offline';
            
            // Show install status
            if (this.isStandalone()) {
              statusText.textContent = 'Running as installed app';
              statusIcon.textContent = '📱';
            }
          } else {
            statusIcon.textContent = '⏳';
            statusText.textContent = 'PWA Loading...';
          }
        });
      } else {
        statusIcon.textContent = '❌';
        statusText.textContent = 'PWA not supported';
      }
    });
  }

  // ============================================
  // 📱 DETECT STANDALONE MODE
  // ============================================
  detectStandaloneMode() {
    if (this.isStandalone()) {
      console.log('📱 Running in standalone mode');
      document.body.classList.add('pwa-standalone');
      
      // Add visual indicator
      const indicator = document.createElement('div');
      indicator.className = 'fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 z-[9999]';
      document.body.prepend(indicator);
    }
  }

  isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true;
  }

  // ============================================
  // 🎨 TOAST NOTIFICATION
  // ============================================
  showToast(message, icon = 'ℹ️', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-[9998] flex items-center gap-2 transition-opacity duration-300 max-w-sm';
    toast.innerHTML = `
      <span class="text-lg">${icon}</span>
      <span class="text-sm">${message}</span>
    `;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => toast.style.opacity = '1', 10);

    // Remove after duration
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ============================================
  // 🛠️ UTILITY FUNCTIONS
  // ============================================
  
  // Clear all caches (for debugging)
  async clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('🗑️ All caches cleared');
    this.showToast('Cache cleared', '🗑️');
  }

  // Get cache info
  async getCacheInfo() {
    const cacheNames = await caches.keys();
    const info = await Promise.all(
      cacheNames.map(async (name) => {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        return { name, size: keys.length };
      })
    );
    console.table(info);
    return info;
  }

  // Force update SW
  async forceUpdate() {
    if (this.swRegistration) {
      await this.swRegistration.update();
      this.showToast('Checking for updates...', '🔄');
    }
  }
}

// ============================================
// 🎬 AUTO INITIALIZE
// ============================================
let pwaManager;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    pwaManager = new PWAManager();
  });
} else {
  pwaManager = new PWAManager();
}

// Expose to window for debugging
window.pwaManager = pwaManager;

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-100%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(100%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-slideDown {
    animation: slideDown 0.3s ease-out;
  }
  
  .animate-slideUp {
    animation: slideUp 0.3s ease-out;
  }
`;
document.head.appendChild(style);

console.log('✅ PWA Init loaded');
