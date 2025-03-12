// Android PWA Installation Helper
// Add this to your pwa-install.js file to improve Android installation

(function() {
    'use strict';
    
    // Only run on Android
    if (!/Android/.test(navigator.userAgent)) return;
    
    console.log('Android PWA Installation Helper initialized');
    
    // Enhance the existing PWA installation on Android
    function enhanceAndroidInstallation() {
      // Check if the PWA installation module exists
      if (!window.pwaInstall) {
        setTimeout(enhanceAndroidInstallation, 500);
        return;
      }
      
      // Enhance the Android installation modal
      window.pwaInstall.createEnhancedAndroidInstallModal = function() {
        if (document.getElementById('android-install-modal')) {
          const modal = document.getElementById('android-install-modal');
          modal.parentNode.removeChild(modal);
        }
        
        const modal = document.createElement('div');
        modal.id = 'android-install-modal';
        modal.className = 'android-install-modal';
        
        modal.innerHTML = `
          <div class="android-install-content">
            <div class="close-button-container">
              <button id="android-install-close" class="modal-close-button">×</button>
            </div>
            
            <h3 class="text-xl font-bold mb-3">Install LeSims Dashboard</h3>
            
            <div class="install-preview mb-5">
              <img src="./logo.jpg" alt="LeSims" class="app-icon-large">
              <div class="app-title">LeSims Dashboard</div>
              <div class="app-subtitle">Complexe LeSims</div>
            </div>
            
            <div class="chrome-install-section">
              <div class="chrome-info">
                <p class="installation-tip">To install this app:</p>
                
                <ol class="install-steps">
                  <li>
                    <span class="step-number">1</span>
                    <span>Tap the Chrome menu <i class="fas fa-ellipsis-vertical"></i></span>
                  </li>
                  <li>
                    <span class="step-number">2</span>
                    <span>Select <strong>"Install app"</strong> from the menu</span>
                  </li>
                  <li>
                    <span class="step-number">3</span>
                    <span>Tap <strong>"Install"</strong> when prompted</span>
                  </li>
                </ol>
              </div>
              
              <div class="chrome-menu-visual">
                <div class="phone-outline">
                  <div class="phone-screen">
                    <div class="chrome-address-bar">
                      <div class="chrome-url">lesims.app</div>
                      <div class="chrome-menu-icon"><i class="fas fa-ellipsis-vertical"></i></div>
                    </div>
                    <div class="chrome-menu">
                      <div class="menu-item active">Install app</div>
                      <div class="menu-item">Share...</div>
                      <div class="menu-item">Find in page</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <button id="android-remind-later" class="secondary-button">Remind me later</button>
          </div>
        `;
        
        // Add extra styles for the new modal
        if (!document.getElementById('android-enhanced-styles')) {
          const style = document.createElement('style');
          style.id = 'android-enhanced-styles';
          style.textContent = `
            .android-install-modal {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-color: rgba(0, 0, 0, 0.85);
              z-index: 9999;
              display: flex;
              align-items: center;
              justify-content: center;
              opacity: 0;
              visibility: hidden;
              transition: opacity 0.3s, visibility 0.3s;
            }
            
            .android-install-modal.visible {
              opacity: 1;
              visibility: visible;
            }
            
            .android-install-content {
              background-color: #1a1d2d;
              border-radius: 16px;
              width: 90%;
              max-width: 360px;
              padding: 20px;
              position: relative;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            }
            
            .close-button-container {
              position: absolute;
              top: 10px;
              right: 10px;
            }
            
            .modal-close-button {
              background: none;
              border: none;
              color: rgba(255, 255, 255, 0.6);
              font-size: 24px;
              cursor: pointer;
              padding: 5px 10px;
            }
            
            .install-preview {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-top: 15px;
            }
            
            .app-icon-large {
              width: 80px;
              height: 80px;
              border-radius: 16px;
              margin-bottom: 12px;
            }
            
            .app-title {
              font-weight: bold;
              font-size: 20px;
              color: white;
            }
            
            .app-subtitle {
              color: rgba(255, 255, 255, 0.7);
              font-size: 14px;
              margin-top: 4px;
            }
            
            .chrome-install-section {
              background-color: rgba(255, 255, 255, 0.08);
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 20px;
              display: flex;
              flex-direction: column;
            }
            
            .installation-tip {
              color: white;
              font-weight: 500;
              margin-bottom: 12px;
            }
            
            .install-steps {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            
            .install-steps li {
              display: flex;
              align-items: center;
              margin-bottom: 12px;
              color: rgba(255, 255, 255, 0.9);
            }
            
            .step-number {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 24px;
              height: 24px;
              background: linear-gradient(135deg, #FF69B4, #9370DB);
              border-radius: 50%;
              font-size: 12px;
              font-weight: bold;
              margin-right: 10px;
              flex-shrink: 0;
            }
            
            .chrome-menu-visual {
              margin-top: 20px;
              display: flex;
              justify-content: center;
            }
            
            .phone-outline {
              width: 160px;
              height: 200px;
              border: 2px solid rgba(255, 255, 255, 0.2);
              border-radius: 20px;
              padding: 8px;
              background-color: rgba(0, 0, 0, 0.3);
            }
            
            .phone-screen {
              background-color: #202124;
              height: 100%;
              border-radius: 14px;
              overflow: hidden;
              display: flex;
              flex-direction: column;
            }
            
            .chrome-address-bar {
              background-color: #292a2d;
              padding: 8px 10px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .chrome-url {
              color: white;
              font-size: 12px;
            }
            
            .chrome-menu-icon {
              color: white;
              font-size: 14px;
            }
            
            .chrome-menu {
              background-color: #292a2d;
              border-radius: 8px;
              margin: 10px;
              overflow: hidden;
            }
            
            .menu-item {
              padding: 10px 12px;
              font-size: 12px;
              color: white;
              border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .menu-item.active {
              background-color: rgba(255, 255, 255, 0.1);
              color: #8ab4f8;
            }
            
            .secondary-button {
              background-color: transparent;
              border: 1px solid rgba(255, 255, 255, 0.2);
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-weight: 500;
              margin-top: 10px;
              width: 100%;
            }
            
            /* Blinking animation for menu item */
            @keyframes highlight-pulse {
              0%, 100% { background-color: rgba(255, 255, 255, 0.1); }
              50% { background-color: rgba(138, 180, 248, 0.3); }
            }
            
            .menu-item.active {
              animation: highlight-pulse 2s infinite;
            }
          `;
          document.head.appendChild(style);
        }
        
        document.body.appendChild(modal);
        
        // Event listeners
        document.getElementById('android-install-close').addEventListener('click', () => {
          modal.classList.remove('visible');
        });
        
        document.getElementById('android-remind-later').addEventListener('click', () => {
          modal.classList.remove('visible');
          // Set a reminder to show again later
          setTimeout(() => {
            window.logToConsole('Showing installation reminder');
            if (document.visibilityState === 'visible') {
              modal.classList.add('visible');
            }
          }, 30 * 60 * 1000); // 30 minutes later
        });
        
        return modal;
      };
      
      // Modify the handleInstallClick method
      const originalHandleInstallClick = window.pwaInstall.handleInstallClick;
      window.pwaInstall.handleInstallClick = function() {
        if (this.isAndroid) {
          window.logToConsole('Android install button clicked');
          
          // Create the enhanced modal if it doesn't exist
          if (!document.getElementById('android-install-modal')) {
            this.createEnhancedAndroidInstallModal();
          }
          
          // Show the modal
          const modal = document.getElementById('android-install-modal');
          if (modal) {
            modal.classList.add('visible');
            
            // Check if we have the beforeinstallprompt event
            if (this.deferredPrompt) {
              window.logToConsole('A deferred install prompt exists, you can use it');
            } else {
              window.logToConsole('No install prompt available, showing manual instructions');
            }
            
            // Optionally check for installability
            this.checkInstallabilityRequirements();
          }
        } else if (originalHandleInstallClick) {
          // Use original method for iOS and desktop
          originalHandleInstallClick.call(this);
        }
      };
      
      // Add a method to check PWA installability requirements
      window.pwaInstall.checkInstallabilityRequirements = function() {
        window.logToConsole('Checking PWA installability requirements...');
        
        const requirements = {
          https: window.location.protocol === 'https:',
          serviceWorker: 'serviceWorker' in navigator,
          manifest: !!document.querySelector('link[rel="manifest"]'),
          manifestValid: false
        };
        
        // Check manifest
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
          fetch(manifestLink.href)
            .then(response => response.json())
            .then(data => {
              requirements.manifestValid = !!(data.name && data.icons && data.start_url);
              
              // Log the results
              window.logToConsole('PWA installability check results:');
              for (const [key, value] of Object.entries(requirements)) {
                window.logToConsole(`- ${key}: ${value ? '✅' : '❌'}`);
              }
              
              // Alert if there are issues
              if (!Object.values(requirements).every(Boolean)) {
                window.logToConsole('WARNING: PWA may not be installable due to missing requirements', true);
              }
            })
            .catch(err => {
              window.logToConsole(`Failed to fetch manifest: ${err.message}`, true);
            });
        }
        
        return requirements;
      };
      
      console.log('Android PWA installation enhancement completed');
    }
    
    // Initialize on page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', enhanceAndroidInstallation);
    } else {
      enhanceAndroidInstallation();
    }
  })();