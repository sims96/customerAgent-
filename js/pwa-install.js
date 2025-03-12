// pwa-install.js - Enhanced PWA installation handler with iOS and Android support

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
    
    // Initialize PWA install functionality
    initialize() {
      window.logToConsole('Initializing PWA installation module');
      
      // Detect device types
      this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      this.isAndroid = /Android/.test(navigator.userAgent);
      window.logToConsole(`Device detection - iOS: ${this.isIOS}, Android: ${this.isAndroid}`);
      
      // Set up event listeners for install prompt (non-iOS)
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
        
        // Show install button automatically for iOS and Android
        if (this.isIOS || this.isAndroid) {
          setTimeout(() => {
            this.showInstallButton();
            window.logToConsole(`Showing install button for ${this.isIOS ? 'iOS' : 'Android'} device`);
          }, 2000);
        }
      }
      
      window.logToConsole('PWA installation module initialized');
    },
    
    // Handle install prompt event
    handleInstallPrompt(event) {
      // Prevent the default browser install prompt
      event.preventDefault();
      
      // Store the event for later use
      this.deferredPrompt = event;
      this.isInstallable = true;
      
      window.logToConsole('Install prompt event captured. App is installable!');
      
      // Show the install button for non-iOS devices
      if (!this.isIOS) {
        this.showInstallButton();
      }
    },
    
    // Handle app installed event
    handleAppInstalled(event) {
      window.logToConsole('App was successfully installed!');
      
      // Hide the install button
      this.hideInstallButton();
      this.isInstallable = false;
      this.deferredPrompt = null;
      
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
      
      // Different text for iOS vs Android/Desktop
      if (this.isIOS) {
        installBtn.innerHTML = `
          <i class="fas fa-download mr-2"></i>
          <span>Add to Home Screen</span>
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
          
          .android-instructions {
            margin: 15px 0;
            display: flex;
            flex-direction: column;
            gap: 15px;
          }
          
          .android-step {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.9rem;
            text-align: left;
          }
          
          .android-icon {
            font-size: 1.5rem;
            width: 30px;
            text-align: center;
          }
          
          .android-install-close {
            margin-top: 15px;
            padding: 8px 16px;
            border-radius: 20px;
            background: linear-gradient(135deg, #FF69B4, #9370DB);
            border: none;
            color: white;
            font-weight: bold;
            cursor: pointer;
          }
        `;
        document.head.appendChild(styleElement);
      }
      
      // Create appropriate install modal based on device type
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
          <p class="text-sm text-gray-300">If the automatic installation doesn't start, follow these steps:</p>
          
          <div class="android-instructions">
            <div class="android-step">
              <div class="android-icon"><i class="fas fa-ellipsis-vertical"></i></div>
              <div>Tap the <strong>menu button</strong> (three dots) in your browser</div>
            </div>
            
            <div class="android-step">
              <div class="android-icon"><i class="fas fa-download"></i></div>
              <div>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong></div>
            </div>
            
            <div class="android-step">
              <div class="android-icon"><i class="fas fa-check-circle"></i></div>
              <div>Tap <strong>Install</strong> in the confirmation dialog</div>
            </div>
          </div>
          
          <button id="android-install-close" class="android-install-close">Got it</button>
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
        // For Android, try automatic installation first
        if (this.deferredPrompt) {
          this.installApp();
        } else {
          // Show manual instructions if automatic installation not available
          const modal = document.getElementById('android-install-modal');
          if (modal) {
            modal.classList.add('visible');
          }
          
          // Try to trigger the browser's install prompt
          this.triggerBrowserInstallPrompt();
        }
      } else {
        // Regular PWA installation for desktop
        this.installApp();
      }
    },
    
    // Attempt to trigger the browser's install prompt (for Android)
    triggerBrowserInstallPrompt() {
      window.logToConsole('Attempting to trigger browser install prompt for Android');
      
      // Some browsers might support this method
      if (navigator.getInstalledRelatedApps) {
        navigator.getInstalledRelatedApps()
          .then(relatedApps => {
            window.logToConsole('Related apps check completed');
          })
          .catch(error => {
            window.logToConsole('Error checking related apps: ' + error.message);
          });
      }
      
      // Manually trigger PWA criteria check to potentially show the browser's install prompt
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration()
          .then(registration => {
            if (registration) {
              window.logToConsole('Service worker is registered, might trigger install prompt');
            }
          });
      }
    },
    
    // Install the app
    async installApp() {
      if (!this.deferredPrompt) {
        window.logToConsole('Cannot install: No install prompt available', true);
        
        // For Android, show the manual instructions if automatic install fails
        if (this.isAndroid) {
          const modal = document.getElementById('android-install-modal');
          if (modal) {
            modal.classList.add('visible');
          }
        }
        return;
      }
      
      window.logToConsole('User initiated app installation');
      
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
        
        // For Android, show the manual instructions if automatic install fails
        if (this.isAndroid) {
          const modal = document.getElementById('android-install-modal');
          if (modal) {
            modal.classList.add('visible');
          }
        }
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