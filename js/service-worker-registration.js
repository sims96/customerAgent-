// service-worker-registration.js - Fixed path and scope issues
(function() {
  'use strict';
  
  // ServiceWorker Registration Module
  window.swRegistration = {
    // Properties
    registration: null,
    registrationAttempts: 0,
    maxRegistrationAttempts: 5,
    registrationRetryDelay: 5000,
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
    
    // Initialize service worker registration
    initialize: function() {
      if ('serviceWorker' in navigator) {
        window.logToConsole('Initializing ServiceWorker registration');
        
        // Register immediately without waiting for full page load
        this.registerServiceWorker();
        
        // Setup event listeners
        this.setupEventListeners();
      } else {
        window.logToConsole('ServiceWorkers not supported in this browser', true);
      }
    },
    
    // Register the ServiceWorker with correct path
    registerServiceWorker: function() {
      this.registrationAttempts++;
      
      if (this.registrationAttempts === 1 || this.registrationAttempts > 1) {
        window.logToConsole(`Registering ServiceWorker (attempt ${this.registrationAttempts}/${this.maxRegistrationAttempts})`);
      }
      
      // IMPORTANT CHANGE: Use the correct path to service-worker.js
      // Detect if we're running from /src/ or root
      const scriptPath = window.location.pathname.includes('/src/') 
          ? './service-worker.js'   // If we're in /src/, use relative path
          : './src/service-worker.js'; // If we're in root, include /src/
      
      // Use appropriate scope based on script location
      const scope = window.location.pathname.includes('/src/') 
          ? './'  // Scope to current directory
          : '/src/'; // Scope to /src/ directory
      
      window.logToConsole(`Using service worker at path: ${scriptPath} with scope: ${scope}`);
      
      navigator.serviceWorker.register(scriptPath, { scope: scope })
        .then(registration => {
          this.registration = registration;
          window.logToConsole('ServiceWorker registered successfully with scope: ' + registration.scope);
          
          // Reset retry counter
          this.registrationAttempts = 0;
          
          // Dispatch event for other scripts
          window.dispatchEvent(new CustomEvent('serviceWorkerRegistered', {
            detail: { registration }
          }));
          
          return registration;
        }).catch(error => {
          window.logToConsole(`ServiceWorker registration failed: ${error.message}`, true);
          
          // Try again if we haven't reached max attempts
          if (this.registrationAttempts < this.maxRegistrationAttempts) {
            const delay = this.registrationRetryDelay * Math.pow(1.5, this.registrationAttempts - 1);
            window.logToConsole(`Will retry registration in ${Math.round(delay/1000)} seconds`);
            
            setTimeout(() => {
              this.registerServiceWorker();
            }, delay);
          } else {
            window.logToConsole('Maximum ServiceWorker registration attempts reached', true);
            
            // Notify application to use fallbacks
            window.dispatchEvent(new CustomEvent('serviceWorkerFailed', {
              detail: { error }
            }));
          }
        });
    },
    
    // Setup event listeners
    setupEventListeners: function() {
      // Listen for controlling ServiceWorker changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.logToConsole('ServiceWorker controller changed - new version is active');
      });
      
      // Listen for messages from ServiceWorker
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'SERVICE_WORKER_PONG') {
          window.logToConsole('Received pong from ServiceWorker');
        }
      });
      
      // Ping service worker when page becomes visible
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CHECK_NOTIFICATIONS'
          });
        }
      });
    },
    
    // Send credentials to service worker
    updateCredentials: function(apiUrl, apiKey) {
      if (!navigator.serviceWorker.controller) return;
      
      window.logToConsole('Sending credentials to ServiceWorker');
      navigator.serviceWorker.controller.postMessage({
        type: 'STORE_CREDENTIALS',
        apiUrl: apiUrl,
        apiKey: apiKey,
        timestamp: Date.now()
      });
    }
  };
  
  // Initialize as soon as possible
  window.swRegistration.initialize();
  
  // Expose key methods to window for other scripts
  window.updateServiceWorkerCredentials = function(apiUrl, apiKey) {
    window.swRegistration.updateCredentials(apiUrl, apiKey);
  };
})();