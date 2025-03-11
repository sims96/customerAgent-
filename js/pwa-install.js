// pwa-install.js - Enhanced PWA installation handler with improved Android support

(function() {
  'use strict';

  // PWA Installation Module
  window.pwaInstall = {
    // Properties
    deferredPrompt: null,
    isInstallable: false,
    installButtonVisible: false,
    isIOS: false,
    isAndroid: false,
    installationAttempted: false,
    
    // Initialize PWA install functionality
    initialize() {
      window.logToConsole('Initializing PWA installation module');
      
      // Improved device detection
      this.detectDeviceType();
      window.logToConsole(`Device detection - iOS: ${this.isIOS}, Android: ${this.isAndroid}`);
      
      // Set up event listeners for install prompt
      window.addEventListener('beforeinstallprompt', this.handleInstallPrompt.bind(this));
      
      // Check if already installed
      window.addEventListener('appinstalled', this.handleAppInstalled.bind(this));
      
      // Create install button if it doesn't exist
      this.createInstallButton();
      
      // Detect if app is running in standalone mode (already installed)
      if (window.matchMedia('(display-mode: standalone)').matches || 
          window.navigator.standalone === true) {
        this.isInstallable = false;
        window.logToConsole('App is already installed and running in standalone mode');
      } else {
        this.isInstallable = true;
        window.logToConsole('App is running in browser mode and may be installable');
        
        // For iOS, show the install button immediately
        if (this.isIOS) {
          setTimeout(() => {
            this.showInstallButton();
          }, 2000);
        }
        
        // For Android, check installability and show button based on PWA criteria
        if (this.isAndroid) {
          this.checkAndroidInstallability();
        }
      }
      
      // Set up periodic checks for installability on Android
      if (this.isAndroid) {
        setInterval(() => {
          this.checkAndroidInstallability();
        }, 10000); // Check every 10 seconds
      }
      
      window.logToConsole('PWA installation module initialized');
    },
    
    // Enhanced device type detection
    detectDeviceType() {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      
      // iOS detection
      this.isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
      
      // Android detection
      this.isAndroid = /android/i.test(userAgent);
    },
    
    // Check Android installability based on PWA criteria
    checkAndroidInstallability() {
      if (!this.isAndroid || this.installationAttempted || this.deferredPrompt) return;
      
      // Check if service worker is registered and active
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
          const hasServiceWorker = !!registration && !!registration.active;
          
          // Check if manifest is present
          const hasManifest = !!document.querySelector('link[rel="manifest"]');
          
          // Check if on HTTPS (or localhost for testing)
          const isSecure = window.location.protocol === 'https:' || 
                          window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1';
          
          // If PWA criteria are met, show the install button
          if (hasServiceWorker && hasManifest && isSecure) {
            window.logToConsole('Android PWA criteria met, showing install button');
            this.showInstallButton();
            
            // Create Android-specific installation instructions
            this.showAndroidInstallationTip();
          } else {
            window.logToConsole(`Android PWA criteria not met: serviceWorker=${hasServiceWorker}, manifest=${hasManifest}, secure=${isSecure}`);
          }
        }).catch(error => {
          window.logToConsole(`Error checking service worker: ${error.message}`, true);
        });
      }
    },
    
    // Show Android installation tip
    showAndroidInstallationTip() {
      // Only show this once per session
      if (sessionStorage.getItem('androidInstallTipShown')) return;
      
      // Create a toast notification for Android users
      const toast = document.createElement('div');
      toast.className = 'android-install-tip';
      toast.innerHTML = `
        <div class="tip-content">
          <i class="fas fa-info-circle"></i>
          <span>Add this app to your home screen for easier access</span>
          <button id="android-tip-close" class="tip-close">×</button>
        </div>
      `;
      
      document.body.appendChild(toast);
      
      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        .android-install-tip {
          position: fixed;
          bottom: 70px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(25, 29, 43, 0.95);
          border-radius: 12px;
          padding: 10px 16px;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          animation: slide-up 0.3s ease forwards;
          max-width: 90%;
        }
        
        .tip-content {
          display: flex;
          align-items: center;
          color: white;
          font-size: 0.9rem;
        }
        
        .tip-content i {
          margin-right: 8px;
          color: #9370DB;
        }
        
        .tip-close {
          margin-left: 12px;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.2rem;
          padding: 0 4px;
          cursor: pointer;
        }
        
        @keyframes slide-up {
          from { transform: translate(-50%, 100px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `;
      
      document.head.appendChild(style);
      
      // Add close button functionality
      document.getElementById('android-tip-close').addEventListener('click', () => {
        toast.remove();
        style.remove();
        sessionStorage.setItem('androidInstallTipShown', 'true');
      });
      
      // Auto remove after 8 seconds
      setTimeout(() => {
        if (document.body.contains(toast)) {
          toast.remove();
          style.remove();
          sessionStorage.setItem('androidInstallTipShown', 'true');
        }
      }, 8000);
    },
    
    // Handle install prompt event
    handleInstallPrompt(event) {
      // Prevent the default browser install prompt
      event.preventDefault();
      
      // Store the event for later use
      this.deferredPrompt = event;
      this.isInstallable = true;
      
      window.logToConsole('App is installable! Install prompt event captured.');
      
      // Show the install button
      this.showInstallButton();
      
      // Show appropriate instruction based on device type
      if (this.isAndroid) {
        this.showAndroidInstallationTip();
      }
    },
    
    // Handle app installed event
    handleAppInstalled(event) {
      window.logToConsole('App was successfully installed!');
      
      // Hide the install button
      this.hideInstallButton();
      this.isInstallable = false;
      this.deferredPrompt = null;
      this.installationAttempted = true;
      
      // Show a notification
      if (window.notificationSystem && typeof window.notificationSystem.notify === 'function') {
        window.notificationSystem.notify({
          type: 'system',
          title: 'App Installed',
          body: 'Complexe LeSims Dashboard is now installed on your device!'
        });
      }
    },
    
    // Create the install button
    createInstallButton() {
      // Check if button already exists
      if (document.getElementById('pwa-install-btn')) {
        return;
      }
      
      // Create the button HTML
      const installBtn = document.createElement('button');
      installBtn.id = 'pwa-install-btn';
      installBtn.className = 'pwa-install-btn brand-gradient shadow-lg fixed bottom-4 right-4 rounded-full p-3 z-40 flex items-center justify-center hover:scale-105 transition-transform hidden';
      
      // Different text based on device type
      if (this.isIOS) {
        installBtn.innerHTML = `
          <i class="fas fa-download mr-2"></i>
          <span>Add to Home Screen</span>
        `;
      } else if (this.isAndroid) {
        installBtn.innerHTML = `
          <i class="fas fa-download mr-2"></i>
          <span>Install App</span>
        `;
      } else {
        installBtn.innerHTML = `
          <i class="fas fa-download mr-2"></i>
          <span>Install App</span>
        `;
      }
      
      // Add click event
      installBtn.addEventListener('click', this.handleInstallClick.bind(this));
      
      // Append to body
      document.body.appendChild(installBtn);
      
      // Add styles if not already present
      if (!document.getElementById('pwa-install-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'pwa-install-styles';
        styleElement.textContent = `
          .pwa-install-btn {
            color: white;
            font-weight: bold;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
            animation: pulse-attention 2s infinite;
          }
          
          @keyframes pulse-attention {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          
          @media (max-width: 640px) {
            .pwa-install-btn {
              bottom: 70px;
              right: 16px;
            }
          }
          
          /* Animation for entry */
          @keyframes slideUp {
            from { transform: translateY(100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          
          .pwa-install-btn.visible {
            display: flex;
            animation: slideUp 0.5s ease forwards;
          }
          
          /* iOS install modal */
          .ios-install-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.8);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            padding: 20px;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
          }
          
          .ios-install-modal.visible {
            opacity: 1;
            visibility: visible;
          }
          
          .ios-install-content {
            background-color: #191d2b;
            border-radius: 12px;
            padding: 20px;
            max-width: 340px;
            width: 100%;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            text-align: center;
          }
          
          .ios-instructions {
            margin: 15px 0;
            display: flex;
            flex-direction: column;
            gap: 15px;
          }
          
          .ios-step {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.9rem;
            text-align: left;
          }
          
          .ios-icon {
            font-size: 1.5rem;
            width: 30px;
            text-align: center;
          }
          
          .ios-install-close {
            margin-top: 15px;
            padding: 8px 16px;
            border-radius: 20px;
            background: linear-gradient(135deg, #FF69B4, #9370DB);
            border: none;
            color: white;
            font-weight: bold;
            cursor: pointer;
          }
          
          /* Android install modal */
          .android-install-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.8);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            padding: 20px;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
          }
          
          .android-install-modal.visible {
            opacity: 1;
            visibility: visible;
          }
          
          .android-install-content {
            background-color: #191d2b;
            border-radius: 12px;
            padding: 20px;
            max-width: 340px;
            width: 100%;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            text-align: center;
          }
        `;
        document.head.appendChild(styleElement);
      }
      
      // Create device-specific install modals
      if (this.isIOS) {
        this.createIOSInstallModal();
      } else if (this.isAndroid) {
        this.createAndroidInstallModal();
      }
    },
    
    // Create iOS installation instructions modal
    createIOSInstallModal() {
      if (document.getElementById('ios-install-modal')) {
        return;
      }
      
      const modal = document.createElement('div');
      modal.id = 'ios-install-modal';
      modal.className = 'ios-install-modal';
      
      modal.innerHTML = `
        <div class="ios-install-content">
          <h3 class="text-xl font-bold mb-3">Install LeSims Dashboard</h3>
          <p class="text-sm text-gray-300">Follow these steps to add this app to your home screen:</p>
          
          <div class="ios-instructions">
            <div class="ios-step">
              <div class="ios-icon"><i class="fas fa-share-from-square"></i></div>
              <div>Tap the <strong>Share</strong> button at the bottom of your screen</div>
            </div>
            
            <div class="ios-step">
              <div class="ios-icon"><i class="fas fa-plus-square"></i></div>
              <div>Scroll down and tap <strong>Add to Home Screen</strong></div>
            </div>
            
            <div class="ios-step">
              <div class="ios-icon"><i class="fas fa-check-circle"></i></div>
              <div>Tap <strong>Add</strong> in the top right corner</div>
            </div>
          </div>
          
          <button id="ios-install-close" class="ios-install-close">Got it</button>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Add event listener to close button
      document.getElementById('ios-install-close').addEventListener('click', () => {
        modal.classList.remove('visible');
      });
    },
    
    // Create Android installation instructions modal
    createAndroidInstallModal() {
      if (document.getElementById('android-install-modal')) {
        return;
      }
      
      const modal = document.createElement('div');
      modal.id = 'android-install-modal';
      modal.className = 'android-install-modal';
      
      modal.innerHTML = `
        <div class="android-install-content">
          <h3 class="text-xl font-bold mb-3">Install LeSims Dashboard</h3>
          <p class="text-sm text-gray-300">Follow these steps to install this app:</p>
          
          <div class="ios-instructions">
            <div class="ios-step">
              <div class="ios-icon"><i class="fas fa-ellipsis-v"></i></div>
              <div>Tap the menu button (three dots) in your browser</div>
            </div>
            
            <div class="ios-step">
              <div class="ios-icon"><i class="fas fa-download"></i></div>
              <div>Select <strong>Install app</strong> or <strong>Add to Home screen</strong></div>
            </div>
            
            <div class="ios-step">
              <div class="ios-icon"><i class="fas fa-check-circle"></i></div>
              <div>Tap <strong>Install</strong> when prompted</div>
            </div>
          </div>
          
          <button id="android-install-close" class="ios-install-close">Got it</button>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Add event listener to close button
      document.getElementById('android-install-close').addEventListener('click', () => {
        modal.classList.remove('visible');
      });
    },
    
    // Show the install button
    showInstallButton() {
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn && !this.installButtonVisible) {
        installBtn.classList.remove('hidden');
        setTimeout(() => {
          installBtn.classList.add('visible');
        }, 100);
        this.installButtonVisible = true;
        window.logToConsole('Install button is now visible');
      }
    },
    
    // Hide the install button
    hideInstallButton() {
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) {
        installBtn.classList.remove('visible');
        setTimeout(() => {
          installBtn.classList.add('hidden');
        }, 500);
        this.installButtonVisible = false;
        window.logToConsole('Install button is now hidden');
      }
    },
    
    // Handle install button click
    handleInstallClick() {
      if (this.isIOS) {
        // Show iOS installation instructions
        const modal = document.getElementById('ios-install-modal');
        if (modal) {
          modal.classList.add('visible');
        }
      } else if (this.isAndroid) {
        if (this.deferredPrompt) {
          // Use the stored prompt if available
          this.installApp();
        } else {
          // Show manual instructions for Android
          const modal = document.getElementById('android-install-modal');
          if (modal) {
            modal.classList.add('visible');
          }
        }
      } else {
        // Regular PWA installation for other platforms
        this.installApp();
      }
    },
    
    // Install the app
    async installApp() {
      if (!this.deferredPrompt) {
        window.logToConsole('Cannot install: No install prompt available', true);
        
        // If no prompt is available on Android, show the manual instructions
        if (this.isAndroid) {
          const modal = document.getElementById('android-install-modal');
          if (modal) {
            modal.classList.add('visible');
          }
        }
        return;
      }
      
      window.logToConsole('User initiated app installation');
      this.installationAttempted = true;
      
      // Show the install prompt
      this.deferredPrompt.prompt();
      
      try {
        // Wait for the user to respond to the prompt
        const choiceResult = await this.deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          window.logToConsole('User accepted the install prompt');
        } else {
          window.logToConsole('User dismissed the install prompt');
          
          // Keep the button visible in case they want to install later
          setTimeout(() => {
            if (this.isInstallable) {
              this.showInstallButton();
            }
          }, 5000);
        }
      } catch (error) {
        window.logToConsole(`Error during installation: ${error.message}`, true);
      } finally {
        // Clear the prompt reference
        this.deferredPrompt = null;
      }
    }
  };
  
  // Initialize the PWA install module when the document is ready
  document.addEventListener('DOMContentLoaded', function() {
    if ('serviceWorker' in navigator) {
      window.pwaInstall.initialize();
    } else {
      window.logToConsole('Service workers not supported - PWA functionality not available', true);
    }
  });
})();

(function forceAndroidInstallButton() {
  // Check if we're on Android
  const isAndroid = /android/i.test(navigator.userAgent);
  
  if (!isAndroid) return;
  
  // Show install button after a delay regardless of service worker status
  setTimeout(() => {
    console.log('Forcing Android install button visibility');
    
    // Create or get the install button
    let installBtn = document.getElementById('pwa-install-btn');
    
    if (!installBtn) {
      installBtn = document.createElement('button');
      installBtn.id = 'pwa-install-btn';
      installBtn.className = 'pwa-install-btn brand-gradient shadow-lg fixed bottom-4 right-4 rounded-full p-3 z-40 flex items-center justify-center hover:scale-105 transition-transform';
      
      installBtn.innerHTML = `
        <i class="fas fa-download mr-2"></i>
        <span>Install App</span>
      `;
      
      document.body.appendChild(installBtn);
    }
    
    // Force visibility
    installBtn.classList.remove('hidden');
    installBtn.style.display = 'flex';
    
    // Add click handler
    installBtn.addEventListener('click', () => {
      // Create Android installation instructions modal
      let modal = document.getElementById('android-install-modal');
      
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'android-install-modal';
        modal.className = 'fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4';
        
        modal.innerHTML = `
          <div class="bg-gray-900 rounded-xl p-5 max-w-md w-full">
            <h3 class="text-xl font-bold mb-4 text-white">Install LeSims Dashboard</h3>
            <p class="text-gray-300 mb-4">To install this app on your Android device:</p>
            
            <ol class="space-y-4 text-gray-300 mb-6">
              <li class="flex items-start">
                <span class="bg-purple-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">1</span>
                <div>Tap the menu button (three dots) in the top right of your browser</div>
              </li>
              <li class="flex items-start">
                <span class="bg-purple-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">2</span>
                <div>Select "Install app" or "Add to Home screen" from the menu</div>
              </li>
              <li class="flex items-start">
                <span class="bg-purple-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">3</span>
                <div>Follow the installation prompts to add the app to your home screen</div>
              </li>
            </ol>
            
            <button id="android-modal-close" class="w-full py-2 px-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-bold">Got it</button>
          </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add close button handler
        document.getElementById('android-modal-close').addEventListener('click', () => {
          modal.style.display = 'none';
        });
      }
      
      // Show the modal
      modal.style.display = 'flex';
    });
    
    // Create a tip notification
    let tip = document.createElement('div');
    tip.className = 'fixed bottom-24 left-4 right-4 bg-gray-900 bg-opacity-95 text-white p-3 rounded-lg z-40 shadow-lg';
    tip.innerHTML = `
      <div class="flex items-center">
        <i class="fas fa-info-circle text-purple-400 mr-2 text-xl"></i>
        <div class="flex-1">
          <p class="font-medium">Install this app to your home screen for quick access</p>
          <p class="text-sm text-gray-300">Click the install button or use Chrome menu → Install app</p>
        </div>
        <button id="close-tip" class="ml-2 text-gray-400 hover:text-white">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    document.body.appendChild(tip);
    
    document.getElementById('close-tip').addEventListener('click', () => {
      tip.remove();
    });
    
    // Auto hide tip after 10 seconds
    setTimeout(() => {
      if (document.body.contains(tip)) {
        tip.remove();
      }
    }, 10000);
    
  }, 5000); // 5 second delay to ensure page is fully loaded
})();