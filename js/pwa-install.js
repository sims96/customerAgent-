// improved-pwa-install.js - Enhanced PWA installation handler with better Android support

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
      
      // Check if already installed in standalone mode
      if (window.matchMedia('(display-mode: standalone)').matches || 
          window.navigator.standalone === true) {
        this.isInstallable = false;
        window.logToConsole('App is already installed and running in standalone mode');
        return;
      }
      
      this.isInstallable = true;
      window.logToConsole('App is running in browser mode and may be installable');
      
      // Set up event listeners for install prompt (non-iOS)
      this.setupInstallPromptListener();
      
      // Check if already installed
      window.addEventListener('appinstalled', this.handleAppInstalled.bind(this));
      
      // Create install button
      this.createInstallButton();
      
      // Create the Android mini-banner for Android devices
      if (this.isAndroid) {
        this.createAndroidMiniBanner();
      }
      
      // Show install button automatically for iOS and Android after a slight delay
      if (this.isIOS || this.isAndroid) {
        setTimeout(() => {
          this.showInstallButton();
          window.logToConsole(`Showing install button for ${this.isIOS ? 'iOS' : 'Android'} device`);
        }, 3000);
      }
      
      // Always setup the relax checks - these will help catch the prompt in more cases
      this.setupRelaxedPromptChecks();
      
      window.logToConsole('PWA installation module initialized');
    },
    
    // Set up the beforeinstallprompt listener in a more robust way
    setupInstallPromptListener() {
      // Primary listener for beforeinstallprompt
      window.addEventListener('beforeinstallprompt', (event) => {
        // Prevent Chrome 76+ from automatically showing the prompt
        event.preventDefault();
        
        // Store the event for later use
        this.deferredPrompt = event;
        this.isInstallable = true;
        
        window.logToConsole('🎉 Install prompt event captured! App is installable!');
        
        // Activate the mini banner for Android
        if (this.isAndroid) {
          this.showAndroidMiniBanner();
        }
        
        // Show the install button
        this.showInstallButton();
      });
      
      // Secondary listener that doesn't call preventDefault
      // This helps with some Android browsers that need a different approach
      window.addEventListener('beforeinstallprompt', this.secondaryPromptHandler.bind(this), 
                             { once: true, passive: true });
    },
    
    // Secondary handler that doesn't prevent default
    secondaryPromptHandler(event) {
      // Just capture the event without preventing default
      // This allows the browser's native prompt to show while still giving us a reference
      if (!this.deferredPrompt) {
        this.deferredPrompt = event;
        window.logToConsole('Captured install prompt event with passive listener');
        
        // Don't show our UI if browser is already showing its prompt
        this.installState.installPromptShown = true;
      }
    },
    
    // Setup relaxed checks for installation availability
    setupRelaxedPromptChecks() {
      // Check for manifest as a hint that installation might be possible
      const hasManifest = !!document.querySelector('link[rel="manifest"]');
      
      // For Android specifically, add extra event listeners
      if (this.isAndroid && hasManifest) {
        // Trigger checks on user interactions that might prompt installation
        ['click', 'scroll', 'mousemove', 'touchstart', 'keydown'].forEach(eventType => {
          document.addEventListener(eventType, this.relaxedInstallCheck.bind(this), 
                                  { once: true, passive: true });
        });
        
        // Also check after a delay
        setTimeout(() => this.relaxedInstallCheck(), 4000);
        setTimeout(() => this.relaxedInstallCheck(), 10000);
      }
    },
    
    // Relaxed check for install availability
    relaxedInstallCheck() {
      // Skip if we already have a prompt or too many attempts
      if (this.deferredPrompt || this.installState.attemptCount > 5) return;
      
      // Check for manifest presence
      const hasManifest = !!document.querySelector('link[rel="manifest"]');
      const hasRequiredIcons = true; // Assume true as we've included icons in the manifest

      if (hasManifest && hasRequiredIcons && this.isInstallable && !this.installState.installPromptShown) {
        window.logToConsole('Relaxed check: App appears installable, showing button');
        this.showInstallButton();
        
        // For Android, try showing the custom install modal more aggressively
        if (this.isAndroid && !this.installState.modalShown) {
          setTimeout(() => {
            if (!this.deferredPrompt && !this.installState.modalShown) {
              this.showManualInstructions();
            }
          }, 5000);
        }
      }
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
      
      // Show a notification
      if (window.notificationSystem && typeof window.notificationSystem.notify === 'function') {
        window.notificationSystem.notify({
          type: 'system',
          title: 'App Installed',
          body: 'Complexe LeSims Dashboard is now installed on your device!'
        });
      }
      
      // Refresh the page to ensure PWA mode is activated
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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
            z-index: 9999 !important;
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
            display: flex !important;
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
        
        // Try to install with prompt or use direct install as fallback
        if (this.deferredPrompt) {
          this.installApp();
        } else {
          this.triggerInstallationApproaches();
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
        this.triggerInstallationApproaches();
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
      }
    },
    
    // Hide Android mini banner
    hideAndroidMiniBanner() {
      const banner = document.getElementById('android-mini-banner');
      if (banner) {
        banner.classList.remove('visible');
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
      } else if (this.isAndroid) {
        window.logToConsole('Android install button clicked');
        
        // Show feedback on the button
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
          installBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Installing...';
          installBtn.disabled = true;
          
          // Reset after a delay
          setTimeout(() => {
            installBtn.innerHTML = '<i class="fas fa-download mr-2"></i><span>Install App</span>';
            installBtn.disabled = false;
          }, 3000);
        }
        
        // Try to install with the best approach available
        if (this.deferredPrompt) {
          window.logToConsole('Using stored beforeinstallprompt event');
          this.installApp();
        } else {
          window.logToConsole('No stored beforeinstallprompt event, trying advanced methods');
          
          // Show the install modal with Chrome-style UI
          this.showManualInstructions();
          
          // Also try triggering installation
          this.triggerInstallationApproaches();
        }
      } else {
        // Regular PWA installation for desktop
        this.installApp();
      }
    },
    
    // Show manual installation instructions
    showManualInstructions() {
      // Only track as shown if not already shown
      if (!this.installState.modalShown) {
        this.installState.modalShown = true;
        window.logToConsole('Showing manual installation instructions modal');
      }
      
      const modal = document.getElementById('android-install-modal');
      if (modal) {
        modal.classList.add('visible');
      }
    },
    
    // New comprehensive method to try all installation approaches
    triggerInstallationApproaches() {
      // Track the attempt
      this.installState.attemptCount++;
      this.installState.lastAttemptTime = Date.now();
      
      window.logToConsole(`Install attempt #${this.installState.attemptCount}`);
      
      // If we have a deferred prompt, use it
      if (this.deferredPrompt) {
        window.logToConsole('Using captured beforeinstallprompt event');
        this.installApp();
        return;
      }
      
      // Try triggering user activation events to prompt installation
      ['touchstart', 'click'].forEach(eventName => {
        document.dispatchEvent(new MouseEvent(eventName, {
          view: window,
          bubbles: true,
          cancelable: true
        }));
      });
      
      // Try the manifest-based approach
      if (document.querySelector('link[rel="manifest"]')) {
        // Force the browser to re-evaluate the manifest
        const manifestUrl = document.querySelector('link[rel="manifest"]').href;
        const refreshUrl = manifestUrl.includes('?') ? 
                          `${manifestUrl}&refresh=${Date.now()}` : 
                          `${manifestUrl}?refresh=${Date.now()}`;
                          
        const linkElem = document.createElement('link');
        linkElem.rel = 'manifest';
        linkElem.href = refreshUrl;
        document.head.appendChild(linkElem);
        
        window.logToConsole('Added fresh manifest link to try triggering install');
      }
      
      // Try using the navigation API as a fallback (newer browsers)
      if (typeof navigator.installation !== 'undefined') {
        window.logToConsole('Using navigator.installation API');
        navigator.installation.getInfo().then(installedApp => {
          if (!installedApp) {
            navigator.installation.install().then(() => {
              window.logToConsole('App installed successfully using installation API');
              this.handleAppInstalled();
            }).catch(err => {
              window.logToConsole('Installation API error: ' + err.message);
              this.showManualInstructions();
            });
          } else {
            window.logToConsole('App is already installed according to navigator.installation');
          }
        }).catch(err => {
          window.logToConsole('Installation API getInfo error: ' + err.message);
        });
      }
      
      // Check the installation state periodically
      setTimeout(() => this.checkIfInstalled(), 1000);
      setTimeout(() => this.checkIfInstalled(), 3000);
      
      // Show manual instructions if nothing else worked
      setTimeout(() => {
        if (!window.matchMedia('(display-mode: standalone)').matches && 
            !window.navigator.standalone) {
          this.showManualInstructions();
        }
      }, 1500);
    },
    
    // Check if the app was installed
    checkIfInstalled() {
      if (window.matchMedia('(display-mode: standalone)').matches || 
          window.navigator.standalone) {
        window.logToConsole('App appears to be installed now!');
        this.handleAppInstalled();
        return true;
      }
      return false;
    },
    
    // Install the app using the prompt
    async installApp() {
      if (!this.deferredPrompt) {
        window.logToConsole('Cannot install: No install prompt available', true);
        
        // For Android, try alternative methods
        if (this.isAndroid) {
          this.triggerInstallationApproaches();
        } 
        return;
      }
      
      window.logToConsole('Triggering installation prompt');
      
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
          
          // Hide the button after a successful installation
          this.handleAppInstalled();
        } else {
          window.logToConsole('User dismissed the install prompt');
          
          // Keep the button visible in case they want to install later
          setTimeout(() => {
            if (this.isInstallable) {
              this.showInstallButton();
            }
          }, 2000);
        }
      } catch (error) {
        window.logToConsole(`Error during installation: ${error.message}`, true);
        
        // For Android, try alternative methods if the prompt failed
        if (this.isAndroid) {
          this.triggerInstallationApproaches();
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