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
    installState: {
      attemptCount: 0,
      lastAttemptTime: 0,
      modalShown: false,
      bannerShown: false,
      installPromptShown: false
    },
    
    // Initialize PWA install functionality
    initialize() {
      window.logToConsole('Initializing PWA installation module');
      
      // Detect device types
      this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      this.isAndroid = /Android/.test(navigator.userAgent);
      window.logToConsole(`Device detection - iOS: ${this.isIOS}, Android: ${this.isAndroid}`);
      
      // CRITICAL: Listen for the beforeinstallprompt event
      // This is the key event for PWA installation on Android
      window.addEventListener('beforeinstallprompt', this.handleInstallPrompt.bind(this));
      
      // Check if already installed
      window.addEventListener('appinstalled', this.handleAppInstalled.bind(this));
      
      // Create install button if it doesn't exist
      this.createInstallButton();
      
      // Create the Android mini-banner for Android devices
      if (this.isAndroid) {
        this.createAndroidMiniBanner();
      }
      
      // Detect if app is running in standalone mode (already installed)
      if (window.matchMedia('(display-mode: standalone)').matches || 
          window.navigator.standalone === true) {
        this.isInstallable = false;
        window.logToConsole('App is already installed and running in standalone mode');
      } else {
        this.isInstallable = true;
        window.logToConsole('App is running in browser mode and may be installable');
        
        // Show install button with delay to allow beforeinstallprompt to fire
        setTimeout(() => {
          this.showInstallButton();
          window.logToConsole(`Showing install button for ${this.isIOS ? 'iOS' : 'Android'} device`);
        }, 3000); // Increased delay to give more time for Chrome to decide
      }
      
      window.logToConsole('PWA installation module initialized');
    },
    
    // Handle install prompt event - THIS IS CRITICAL FOR ANDROID
    handleInstallPrompt(event) {
      // Prevent the default browser install prompt
      event.preventDefault();
      
      // Store the event for later use
      this.deferredPrompt = event;
      this.isInstallable = true;
      
      window.logToConsole('🎉 Install prompt event captured! App is installable!');
      
      // Activate the mini banner for Android
      if (this.isAndroid) {
        // Show mini banner with slight delay
        setTimeout(() => {
          this.showAndroidMiniBanner();
        }, 1000);
      }
      
      // Show the install button
      this.showInstallButton();
    },
    
    // Handle app installed event
    handleAppInstalled(event) {
      window.logToConsole('App was successfully installed!');
      
      // Hide the install button
      this.hideInstallButton();
      
      // Hide any Android-specific UI
      if (this.isAndroid) {
        this.hideAndroidMiniBanner();
        
        const modal = document.getElementById('android-install-modal');
        if (modal) {
          modal.classList.remove('visible');
        }
      }
      
      this.isInstallable = false;
      this.deferredPrompt = null;
      this.installState.installPromptShown = false;
      
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
          
          /* Android mini banner */
          .android-mini-banner {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background-color: #191d2b;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 9998;
            padding: 8px 16px;
            transform: translateY(100%);
            transition: transform 0.3s ease;
          }
          
          .android-mini-banner.visible {
            transform: translateY(0);
          }
          
          .mini-banner-content {
            display: flex;
            align-items: center;
          }
          
          .mini-banner-icon {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            margin-right: 12px;
          }
          
          .mini-banner-text {
            flex: 1;
          }
          
          .mini-banner-title {
            font-weight: bold;
            color: white;
            font-size: 14px;
          }
          
          .mini-banner-subtitle {
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
          }
          
          .mini-banner-btn {
            background: linear-gradient(135deg, #FF69B4, #9370DB);
            color: white;
            font-weight: bold;
            border: none;
            border-radius: 16px;
            padding: 6px 14px;
            margin-left: 8px;
          }
          
          .mini-banner-close {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.5);
            font-size: 14px;
            padding: 4px 8px;
            margin-left: 4px;
          }
          
          /* Enhanced Android installation UI */
          .install-preview {
            background-color: rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          
          .app-preview {
            display: flex;
            align-items: center;
          }
          
          .app-icon {
            width: 48px;
            height: 48px;
            border-radius: 8px;
            margin-right: 12px;
          }
          
          .app-name {
            font-weight: bold;
            color: white;
          }
          
          .chrome-install-btn {
            background-color: #8ab4f8;
            color: #202124;
            font-weight: bold;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
          }
          
          .separator {
            display: flex;
            align-items: center;
            text-align: center;
            margin: 20px 0;
            color: rgba(255, 255, 255, 0.5);
          }
          
          .separator::before,
          .separator::after {
            content: '';
            flex: 1;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          .separator span {
            padding: 0 10px;
            font-size: 12px;
          }
          
          /* Success animation */
          .pwa-install-btn.success {
            background: linear-gradient(135deg, #4CAF50, #2E7D32);
          }
        `;
        document.head.appendChild(styleElement);
      }
      
      // Create appropriate install modal based on device type
      if (this.isIOS) {
        this.createIOSInstallModal();
      } else if (this.isAndroid) {
        this.createEnhancedAndroidInstallModal();
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

    // Create enhanced Android installation instructions modal
    createEnhancedAndroidInstallModal() {
      if (document.getElementById('android-install-modal')) {
        return;
      }
      
      const modal = document.createElement('div');
      modal.id = 'android-install-modal';
      modal.className = 'android-install-modal';
      
      modal.innerHTML = `
        <div class="android-install-content">
          <h3 class="text-xl font-bold mb-3">Install LeSims Dashboard</h3>
          <p class="text-sm text-gray-300 mb-4">Install this app on your device:</p>
          
          <div class="install-preview mb-4">
            <div class="app-preview">
              <img src="./logo.jpg" alt="LeSims" class="app-icon">
              <div class="app-name">LeSims Dashboard</div>
            </div>
            <button id="android-chrome-install" class="chrome-install-btn">
              Install
            </button>
          </div>
          
          <div class="separator">
            <span>OR</span>
          </div>
          
          <div class="android-instructions mt-4">
            <p class="text-sm text-gray-300 mb-2">Install from Chrome menu:</p>
            <div class="android-step">
              <div class="android-icon"><i class="fas fa-ellipsis-vertical"></i></div>
              <div>Tap the <strong>menu button</strong> (three dots) in Chrome</div>
            </div>
            
            <div class="android-step">
              <div class="android-icon"><i class="fas fa-download"></i></div>
              <div>Select <strong>Install app</strong> from the menu</div>
            </div>
          </div>
          
          <button id="android-install-close" class="android-install-close mt-4">
            Close
          </button>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Add event listeners
      document.getElementById('android-install-close').addEventListener('click', () => {
        modal.classList.remove('visible');
        this.installState.modalShown = false;
      });
      
      document.getElementById('android-chrome-install').addEventListener('click', () => {
        // Try to trigger the installation via Chrome's UI
        window.logToConsole('User clicked Chrome-style install button');
        
        // Show installing state
        const installBtn = document.getElementById('android-chrome-install');
        if (installBtn) {
          installBtn.innerHTML = 'Installing...';
          installBtn.disabled = true;
        }
        
        // Try to get Chrome to show its install prompt
        if (this.deferredPrompt) {
          this.installApp();
        } else {
          this.tryDirectInstall();
        }
        
        // Reset button after a delay
        setTimeout(() => {
          if (installBtn) {
            installBtn.innerHTML = 'Install';
            installBtn.disabled = false;
          }
        }, 3000);
      });
    },
    
    // Create Android mini banner for installation
    createAndroidMiniBanner() {
      if (document.getElementById('android-mini-banner')) {
        return;
      }
      
      const banner = document.createElement('div');
      banner.id = 'android-mini-banner';
      banner.className = 'android-mini-banner';
      
      banner.innerHTML = `
        <div class="mini-banner-content">
          <img src="./logo.jpg" alt="LeSims" class="mini-banner-icon">
          <div class="mini-banner-text">
            <div class="mini-banner-title">LeSims Dashboard</div>
            <div class="mini-banner-subtitle">Add this app to your home screen</div>
          </div>
          <button id="mini-banner-install" class="mini-banner-btn">Install</button>
          <button id="mini-banner-close" class="mini-banner-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
      
      document.body.appendChild(banner);
      
      // Add event listeners
      document.getElementById('mini-banner-install').addEventListener('click', () => {
        if (this.deferredPrompt) {
          // If we have a prompt, use it directly
          this.installApp();
        } else {
          // Otherwise try direct install methods
          this.tryDirectInstall();
        }
        this.hideAndroidMiniBanner();
      });
      
      document.getElementById('mini-banner-close').addEventListener('click', () => {
        this.hideAndroidMiniBanner();
      });
    },
    
    // Show Android mini banner
    showAndroidMiniBanner() {
      if (this.installState.bannerShown) return;
      
      const banner = document.getElementById('android-mini-banner');
      if (banner) {
        banner.classList.add('visible');
        this.installState.bannerShown = true;
        window.logToConsole('Android mini-banner shown');
      }
    },
    
    // Hide Android mini banner
    hideAndroidMiniBanner() {
      const banner = document.getElementById('android-mini-banner');
      if (banner) {
        banner.classList.remove('visible');
        setTimeout(() => {
          banner.classList.add('hidden');
        }, 300);
      }
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
      } else {
        window.logToConsole('Install button clicked');
        
        // Critical: Check if we have a stored prompt
        if (this.deferredPrompt) {
          window.logToConsole('Using stored beforeinstallprompt event');
          // Show visual feedback on the button
          const installBtn = document.getElementById('pwa-install-btn');
          if (installBtn) {
            installBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Installing...';
          }
          
          // Use the captured prompt
          this.installApp();
        } else {
          window.logToConsole('No stored beforeinstallprompt event, trying alternative methods');
          
          // For Android, show the install modal with manual instructions
          if (this.isAndroid) {
            this.showManualInstructions();
          } else {
            // For desktop, try other installation methods
            this.tryDirectInstall();
          }
        }
      }
    },
    
    // Show manual installation instructions
    showManualInstructions() {
      // Only show instructions if not already shown
      if (this.installState.modalShown) {
        window.logToConsole('Instructions modal already shown, not showing again');
        return;
      }
      
      this.installState.modalShown = true;
      
      const modal = document.getElementById('android-install-modal');
      if (modal) {
        modal.classList.add('visible');
        window.logToConsole('Showing Android installation modal');
      }
    },
    
    // Try direct installation using all available methods
    tryDirectInstall() {
      // Track the attempt
      this.installState.attemptCount++;
      this.installState.lastAttemptTime = Date.now();
      
      window.logToConsole(`Direct install attempt #${this.installState.attemptCount}`);
      
      // If we've tried multiple times, show manual instructions
      if (this.installState.attemptCount > 2) {
        window.logToConsole('Multiple install attempts made, showing manual instructions');
        this.showManualInstructions();
        return;
      }
      
      // Use navigator.getInstalledRelatedApps() if available (newer browsers)
      if (navigator.getInstalledRelatedApps) {
        window.logToConsole('Checking installed related apps');
        navigator.getInstalledRelatedApps().then(relatedApps => {
          if (relatedApps.length > 0) {
            window.logToConsole('App is already installed as related app');
            // App is already installed
            this.handleAppInstalled();
          } else {
            window.logToConsole('No related apps installed, showing manual instructions');
            // Show manual instructions since app isn't installed
            this.showManualInstructions();
          }
        }).catch(err => {
          window.logToConsole('Error checking related apps: ' + err.message);
          this.showManualInstructions();
        });
        return;
      }
      
      // If all else fails, show manual instructions
      window.logToConsole('No automatic installation methods available, showing manual instructions');
      this.showManualInstructions();
    },
    
    // Install the app using the deferredPrompt
    async installApp() {
      if (!this.deferredPrompt) {
        window.logToConsole('Cannot install: No install prompt available', true);
        
        // For Android, try alternative methods before showing manual instructions
        if (this.isAndroid) {
          this.tryDirectInstall();
        } 
        return;
      }
      
      // Prevent multiple prompts
      if (this.installState.installPromptShown) {
        window.logToConsole('Install prompt already shown, not showing again');
        return;
      }
      
      this.installState.installPromptShown = true;
      window.logToConsole('Triggering app installation with captured prompt');
      
      try {
        // Show the install prompt
        this.deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const choiceResult = await this.deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          window.logToConsole('User accepted the install prompt! 🎉');
          
          // Trigger success animation/message
          const installBtn = document.getElementById('pwa-install-btn');
          if (installBtn) {
            installBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Installing...';
            installBtn.classList.add('success');
          }
          
          // Hide the modal if visible
          if (this.isAndroid) {
            const modal = document.getElementById('android-install-modal');
            if (modal) {
              modal.classList.remove('visible');
            }
          }
          
        } else {
          window.logToConsole('User dismissed the install prompt');
          
          // Reset installation state
          this.installState.installPromptShown = false;
          
          // Update button text
          const installBtn = document.getElementById('pwa-install-btn');
          if (installBtn) {
            installBtn.innerHTML = '<i class="fas fa-download mr-2"></i><span>Install App</span>';
          }
          
          // Show manual instructions as fallback
          if (this.isAndroid) {
            this.showManualInstructions();
          }
        }
      } catch (error) {
        window.logToConsole(`Error during installation: ${error.message}`, true);
        
        // Reset installation state
        this.installState.installPromptShown = false;
        
        // For Android, try alternative methods
        if (this.isAndroid) {
          this.tryDirectInstall();
        }
      } finally {
        // Clear the prompt reference
        this.deferredPrompt = null;
      }
    },
    
    // Explicitly try to trigger the beforeinstallprompt event
    triggerInstallPrompt() {
      window.logToConsole('Attempting to trigger beforeinstallprompt event');
      
      // Dispatch several user events that might trigger the beforeinstallprompt
      document.dispatchEvent(new MouseEvent('mousedown'));
      document.dispatchEvent(new MouseEvent('mouseup'));
      document.dispatchEvent(new MouseEvent('click'));
      document.dispatchEvent(new TouchEvent('touchstart'));
      document.dispatchEvent(new TouchEvent('touchend'));
      
      // Also try to interact with the manifest
      const link = document.querySelector('link[rel="manifest"]');
      if (link) {
        const manifestUrl = link.href;
        fetch(manifestUrl + '?refresh=' + Date.now()).then(() => {
          window.logToConsole('Manifest refreshed, may trigger installation prompt');
        }).catch(err => {
          window.logToConsole('Error refreshing manifest: ' + err.message);
        });
      }
    }
  };
  
  // Initialize the PWA install module when the document is ready
  document.addEventListener('DOMContentLoaded', function() {
    if ('serviceWorker' in navigator) {
      window.pwaInstall.initialize();
      
      // Additional attempts to trigger the beforeinstallprompt event
      setTimeout(() => {
        if (!window.pwaInstall.deferredPrompt) {
          window.logToConsole('No beforeinstallprompt event after initialization, trying to trigger');
          window.pwaInstall.triggerInstallPrompt();
        }
      }, 5000);
      
      // Check again after user interaction
      document.addEventListener('click', () => {
        if (!window.pwaInstall.deferredPrompt && !window.pwaInstall.installState.installPromptShown) {
          window.pwaInstall.triggerInstallPrompt();
        }
      }, { once: true });
    } else {
      window.logToConsole('Service workers not supported - PWA functionality not available', true);
    }
  });
})();