// pwa-install.js - PWA installation handler

(function() {
    'use strict';
  
    // PWA Installation Module
    window.pwaInstall = {
      // Properties
      deferredPrompt: null,
      isInstallable: false,
      installButtonVisible: false,
      
      // Initialize PWA install functionality
      initialize() {
        window.logToConsole('Initializing PWA installation module');
        
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
          window.logToConsole('App is running in browser mode and may be installable');
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
        
        window.logToConsole('App is installable! Install prompt event captured.');
        
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
        installBtn.innerHTML = `
          <i class="fas fa-download mr-2"></i>
          <span>Install App</span>
        `;
        
        // Add click event
        installBtn.addEventListener('click', this.installApp.bind(this));
        
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
          `;
          document.head.appendChild(styleElement);
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
      
      // Install the app
      async installApp() {
        if (!this.deferredPrompt) {
          window.logToConsole('Cannot install: No install prompt available', true);
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