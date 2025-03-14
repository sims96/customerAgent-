// pwa-diagnostic.js - Diagnostic tool for PWA installation issues

(function() {
    'use strict';
    
    window.pwaInstallDiagnostic = {
      // Initialize diagnostics
      initialize() {
        window.logToConsole('Running PWA installation diagnostics...');
        
        // Check service worker support and registration
        this.checkServiceWorker();
        
        // Check manifest
        this.checkManifest();
        
        // Check display mode
        this.checkDisplayMode();
        
        // Set up event listener to detect beforeinstallprompt
        this.setupEventDetection();
        
        // Check if we're on HTTPS
        this.checkHttps();
        
        // Check installability criteria
        this.checkInstallability();
      },
      
      // Check service worker registration
      async checkServiceWorker() {
        if (!('serviceWorker' in navigator)) {
          window.logToConsole('❌ Service Worker API not supported in this browser', true);
          return;
        }
        
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            window.logToConsole(`✅ Service worker registered: ${registration.scope}`);
            window.logToConsole(`   Status: ${registration.active ? 'active' : 'inactive'}`);
            
            // Check if fetch handler is implemented
            if (registration.active) {
              window.logToConsole('   Fetch handler detection requires manual verification');
            }
          } else {
            window.logToConsole('❌ No service worker registered', true);
          }
        } catch (error) {
          window.logToConsole(`❌ Service worker check failed: ${error.message}`, true);
        }
      },
      
      // Check web app manifest
      async checkManifest() {
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (!manifestLink) {
          window.logToConsole('❌ No web app manifest link found in the document', true);
          return;
        }
        
        window.logToConsole(`✅ Manifest link found: ${manifestLink.href}`);
        
        try {
          const response = await fetch(manifestLink.href);
          if (!response.ok) {
            window.logToConsole(`❌ Failed to fetch manifest: ${response.statusText}`, true);
            return;
          }
          
          const manifest = await response.json();
          window.logToConsole('✅ Manifest successfully parsed');
          
          // Check required fields
          let allFieldsPresent = true;
          
          if (!manifest.name && !manifest.short_name) {
            window.logToConsole('❌ Manifest missing both name and short_name', true);
            allFieldsPresent = false;
          }
          
          if (!manifest.display || !['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display)) {
            window.logToConsole(`❌ Manifest missing proper display mode: ${manifest.display}`, true);
            allFieldsPresent = false;
          }
          
          if (!manifest.start_url) {
            window.logToConsole('❌ Manifest missing start_url', true);
            allFieldsPresent = false;
          }
          
          if (!manifest.icons || !manifest.icons.length) {
            window.logToConsole('❌ Manifest missing icons array', true);
            allFieldsPresent = false;
          } else {
            const has192 = manifest.icons.some(icon => icon.sizes && icon.sizes.includes('192x192'));
            const has512 = manifest.icons.some(icon => icon.sizes && icon.sizes.includes('512x512'));
            
            if (!has192) {
              window.logToConsole('❌ Manifest missing 192x192 icon', true);
              allFieldsPresent = false;
            }
            
            if (!has512) {
              window.logToConsole('❌ Manifest missing 512x512 icon', true);
              allFieldsPresent = false;
            }
          }
          
          if (allFieldsPresent) {
            window.logToConsole('✅ Manifest contains all required fields for installation');
          }
        } catch (error) {
          window.logToConsole(`❌ Error processing manifest: ${error.message}`, true);
        }
      },
      
      // Check if running in standalone mode
      checkDisplayMode() {
        if (window.matchMedia('(display-mode: standalone)').matches) {
          window.logToConsole('⚠️ App is already running in standalone mode (likely installed)');
        } else if (window.navigator.standalone) {
          window.logToConsole('⚠️ App is already running in iOS standalone mode (likely installed)');
        } else {
          window.logToConsole('✅ App is running in browser mode (installable)');
        }
      },
      
      // Set up event detection
      setupEventDetection() {
        window.addEventListener('beforeinstallprompt', (event) => {
          window.logToConsole('✅ beforeinstallprompt event fired - App is installable!');
          
          // Capture event for later use
          window.deferredInstallPrompt = event;
          
          // Add a diagnostic button for direct testing
          this.addDiagnosticButton();
        });
        
        // Check for the appinstalled event
        window.addEventListener('appinstalled', (event) => {
          window.logToConsole('✅ App was successfully installed!');
        });
        
        window.logToConsole('Event detection listeners installed (waiting for beforeinstallprompt)');
      },
      
      // Check if we're on HTTPS
      checkHttps() {
        if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
          window.logToConsole('✅ Site is running on HTTPS (or localhost)');
        } else {
          window.logToConsole('❌ Site is not running on HTTPS - PWAs require HTTPS!', true);
        }
      },
      
      // Check installability using newer APIs if available
      async checkInstallability() {
        if ('getInstalledRelatedApps' in navigator) {
          try {
            const relatedApps = await navigator.getInstalledRelatedApps();
            if (relatedApps.length > 0) {
              window.logToConsole('⚠️ Related PWA is already installed on this device');
            } else {
              window.logToConsole('✅ No related PWA is installed on this device');
            }
          } catch (error) {
            window.logToConsole(`Error checking installed related apps: ${error.message}`);
          }
        }
        
        // Try to detect if an install button for this site exists in the browser UI
        if ('userAgentData' in navigator) {
          const brandVersions = navigator.userAgentData.brands || [];
          const chromeVersion = brandVersions.find(brand => brand.brand === 'Google Chrome')?.version;
          
          if (chromeVersion) {
            window.logToConsole(`Running Chrome version: ${chromeVersion}`);
          }
        }
        
        // Final notice about common issues
        window.logToConsole('Note: Common installation blockers:');
        window.logToConsole('1. User previously dismissed prompt (90-day cooldown in Chrome)');
        window.logToConsole('2. App doesn\'t meet heuristic criteria (e.g., not engaging enough)');
        window.logToConsole('3. Native app exists with same scope as PWA (via Digital Asset Links)');
      },
      
      // Add a diagnostic button for direct testing
      addDiagnosticButton() {
        if (document.getElementById('pwa-diagnostic-btn')) return;
        
        const diagBtn = document.createElement('button');
        diagBtn.id = 'pwa-diagnostic-btn';
        diagBtn.textContent = '🔧 Install (Diagnostic)';
        diagBtn.style.cssText = 'position:fixed; top:10px; right:10px; z-index:9999; background:#4CAF50; color:white; border:none; border-radius:4px; padding:8px 12px; cursor:pointer; font-weight:bold;';
        
        diagBtn.addEventListener('click', () => {
          if (window.deferredInstallPrompt) {
            window.logToConsole('Triggering saved installation prompt...');
            window.deferredInstallPrompt.prompt();
            
            window.deferredInstallPrompt.userChoice.then((result) => {
              window.logToConsole(`User response: ${result.outcome}`);
              window.deferredInstallPrompt = null;
            });
          } else {
            window.logToConsole('No saved installation prompt available', true);
          }
        });
        
        document.body.appendChild(diagBtn);
      }
    };
    
    // Run diagnostics when loaded
    document.addEventListener('DOMContentLoaded', () => {
      window.pwaInstallDiagnostic.initialize();
    });
  })();