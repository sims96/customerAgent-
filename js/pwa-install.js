// pwa-install.js - Simplified PWA installation handler with improved Android support

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
      
      // Set up event listeners for install prompt
      window.addEventListener('beforeinstallprompt', this.handleInstallPrompt.bind(this));
      window.addEventListener('appinstalled', this.handleAppInstalled.bind(this));
      
      // Create install button
      this.createInstallButton();
      
      // Check if already installed
      if (window.matchMedia('(display-mode: standalone)').matches || 
          window.navigator.standalone === true) {
        this.isInstallable = false;
        window.logToConsole('App is already installed and running in standalone mode');
      } else {
        this.isInstallable = true;
        window.logToConsole('App is running in browser mode and may be installable');
        
        // Show install button automatically for mobile devices after a short delay
        if (this.isIOS || this.isAndroid) {
          setTimeout(() => {
            this.showInstallButton();
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
      
      window.logToConsole('Install prompt event captured! App is installable!');
      
      // Show the install button
      this.showInstallButton();
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
          
          /* Generic install modal (used for Android) */
          .install-modal {
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
          
          .install-modal.visible {
            opacity: 1;
            visibility: visible;
          }
          
          .install-content {
            background-color: #191d2b;
            border-radius: 12px;
            padding: 20px;
            max-width: 340px;
            width: 100%;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            text-align: center;
          }
          
          .install-preview {
            background-color: rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            padding: 16px;
            margin: 15px 0;
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
          
          .install-btn {
            background-color: #8ab4f8;
            color: #202124;
            font-weight: bold;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            cursor: pointer;
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
          
          .manual-steps {
            margin: 15px 0;
            display: flex;
            flex-direction: column;
            gap: 15px;
          }
          
          .manual-step {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.9rem;
            text-align: left;
          }
          
          .step-icon {
            font-size: 1.5rem;
            width: 30px;
            text-align: center;
          }
          
          .modal-close {
            margin-top: 15px;
            padding: 8px 16px;
            border-radius: 20px;
            background: linear-gradient(135deg, #FF69B4, #9370DB);
            border: none;
            color: white;
            font-weight: bold;
            cursor: pointer;
          }
          
          /* Success animation */
          .pwa-install-btn.success {
            background: linear-gradient(135deg, #4CAF50, #2E7D32);
          }
        `;
        document.head.appendChild(styleElement);
      }
      
      // Create appropriate install modals
      if (this.isIOS) {
        this.createIOSInstallModal();
      } else {
        this.createGenericInstallModal();
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
    
    // Create generic installation modal (used for Android)
    createGenericInstallModal() {
      if (document.getElementById('install-modal')) {
        return;
      }
      
      const modal = document.createElement('div');
      modal.id = 'install-modal';
      modal.className = 'install-modal';
      
      modal.innerHTML = `
        <div class="install-content">
          <h3 class="text-xl font-bold mb-3">Install LeSims Dashboard</h3>
          <p class="text-sm text-gray-300 mb-4">Install this app on your device:</p>
          
          <div class="install-preview">
            <div class="app-preview">
              <img src="./logo.jpg" alt="LeSims" class="app-icon">
              <div class="app-name">LeSims Dashboard</div>
            </div>
            <button id="modal-install-btn" class="install-btn">
              Install
            </button>
          </div>
          
          <div class="separator">
            <span>OR</span>
          </div>
          
          <div class="manual-steps">
            <p class="text-sm text-gray-300 mb-2">Install from browser menu:</p>
            <div class="manual-step">
              <div class="step-icon"><i class="fas fa-ellipsis-vertical"></i></div>
              <div>Tap the <strong>menu button</strong> in your browser</div>
            </div>
            
            <div class="manual-step">
              <div class="step-icon"><i class="fas fa-download"></i></div>
              <div>Select <strong>Install app</strong> from the menu</div>
            </div>
          </div>
          
          <button id="install-modal-close" class="modal-close">
            Close
          </button>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Add event listeners
      document.getElementById('install-modal-close').addEventListener('click', () => {
        modal.classList.remove('visible');
      });
      
      document.getElementById('modal-install-btn').addEventListener('click', () => {
        this.installApp();
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
      } else {
        window.logToConsole('Install button clicked');
        
        // Show visual feedback
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
          installBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Installing...';
          setTimeout(() => {
            installBtn.innerHTML = '<i class="fas fa-download mr-2"></i><span>Install App</span>';
          }, 3000);
        }
        
        // Attempt to install the app
        if (this.deferredPrompt) {
          this.installApp();
        } else {
          // If we don't have a deferred prompt, show the install modal with instructions
          const modal = document.getElementById('install-modal');
          if (modal) {
            modal.classList.add('visible');
          }
        }
      }
    },
    
    // Install the app
    async installApp() {
      if (!this.deferredPrompt) {
        window.logToConsole('Cannot install: No install prompt available', true);
        
        // Show manual installation instructions if no prompt is available
        const modal = document.getElementById('install-modal');
        if (modal) {
          modal.classList.add('visible');
        }
        return;
      }
      
      window.logToConsole('User initiated app installation with captured prompt');
      
      try {
        // Show the install prompt
        this.deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const choiceResult = await this.deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          window.logToConsole('User accepted the install prompt!');
          
          // Show success feedback
          const installBtn = document.getElementById('pwa-install-btn');
          if (installBtn) {
            installBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Installing...';
            installBtn.classList.add('success');
          }
          
          // Hide any modal that might be open
          const modal = document.getElementById('install-modal');
          if (modal) {
            modal.classList.remove('visible');
          }
          
          // Hide the button after installation
          setTimeout(() => {
            this.hideInstallButton();
          }, 2000);
        } else {
          window.logToConsole('User dismissed the install prompt');
        }
      } catch (error) {
        window.logToConsole(`Error during installation: ${error.message}`, true);
        
        // If there's an error, show the manual install modal
        const modal = document.getElementById('install-modal');
        if (modal) {
          modal.classList.add('visible');
        }
      } finally {
        // Clear the prompt reference
        this.deferredPrompt = null;
      }
    },
    
    // Check if the app is already installed
    checkInstallationStatus() {
      if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        window.logToConsole('App is running in standalone mode!');
        this.handleAppInstalled();
        return true;
      }
      return false;
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