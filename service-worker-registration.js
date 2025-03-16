// service-worker-registration.js - Enhanced ServiceWorker registration with offline support
(function() {
    'use strict';
    
    // ServiceWorker Registration Module
    window.swRegistration = {
      // Properties
      registration: null,
      registrationAttempts: 0,
      maxRegistrationAttempts: 5,
      registrationRetryDelay: 5000, // 5 second initial delay, will increase exponentially
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
      registrationPromise: null,
      
      // Initialize service worker registration
      initialize: function() {
        if ('serviceWorker' in navigator) {
          window.logToConsole('Initializing enhanced ServiceWorker registration');
          
          // Register immediately without waiting for full page load
          this.registerServiceWorker();
          
          // Set up event listeners
          this.setupEventListeners();
          
          // Set up periodic health checking
          this.setupHealthChecks();
          
          // iOS-specific handling
          if (this.isIOS) {
            this.setupIOSSpecificHandling();
          }
        } else {
          window.logToConsole('ServiceWorkers not supported in this browser', true);
          this.enableFallbacks();
        }
      },
      
      // Register the ServiceWorker
      registerServiceWorker: function() {
        this.registrationAttempts++;
        
        // Only log first attempt and retries
        if (this.registrationAttempts === 1 || this.registrationAttempts > 1) {
          window.logToConsole(`Registering ServiceWorker (attempt ${this.registrationAttempts}/${this.maxRegistrationAttempts})`);
        }
        
        // Create a promise that can be referenced elsewhere
        this.registrationPromise = navigator.serviceWorker.register('/service-worker.js', {
          // Expanding scope to control the entire origin
          scope: '/'
        }).then(registration => {
          this.registration = registration;
          window.logToConsole('ServiceWorker registered successfully with scope: ' + registration.scope);
          
          // Check if there's an update waiting
          this.checkForWaitingWorker(registration);
          
          // Reset retry counter
          this.registrationAttempts = 0;
          
          // Dispatch event for other scripts to know service worker is available
          window.dispatchEvent(new CustomEvent('serviceWorkerRegistered', {
            detail: { registration }
          }));
          
          // Store registration flag for offline detection
          try {
            localStorage.setItem('serviceWorkerRegistered', 'true');
            localStorage.setItem('serviceWorkerRegisteredAt', Date.now().toString());
          } catch (e) {
            // Ignore localStorage errors
          }
          
          return registration;
        }).catch(error => {
          window.logToConsole(`ServiceWorker registration failed: ${error.message}`, true);
          
          // Try again if we haven't reached max attempts
          if (this.registrationAttempts < this.maxRegistrationAttempts) {
            const delay = this.registrationRetryDelay * Math.pow(2, this.registrationAttempts - 1);
            window.logToConsole(`Will retry registration in ${delay/1000} seconds`);
            
            setTimeout(() => {
              this.registerServiceWorker();
            }, delay);
          } else {
            window.logToConsole('Maximum ServiceWorker registration attempts reached', true);
            
            // Notify application that fallback mechanisms should be used
            window.dispatchEvent(new CustomEvent('serviceWorkerFailed', {
              detail: { error }
            }));
            
            this.enableFallbacks();
          }
          
          throw error;
        });
        
        return this.registrationPromise;
      },
      
      // Set up event listeners
      setupEventListeners: function() {
        // Listen for controlling ServiceWorker changes
        navigator.serviceWorker.addEventListener('controllerchange', event => {
          window.logToConsole('ServiceWorker controller changed - new version is taking control');
          
          // Dispatch event about controller change
          window.dispatchEvent(new CustomEvent('serviceWorkerControllerChanged'));
        });
        
        // Listen for connectivity changes
        window.addEventListener('online', () => {
          window.logToConsole('Browser reports online status');
          
          // Retry registration if previously failed
          if (!this.registration && this.registrationAttempts >= this.maxRegistrationAttempts) {
            window.logToConsole('Back online, retrying ServiceWorker registration');
            this.registrationAttempts = 0;
            this.registerServiceWorker();
          }
          
          // Notify ServiceWorker about connectivity
          this.notifyServiceWorkerOfConnectivity(true);
        });
        
        window.addEventListener('offline', () => {
          window.logToConsole('Browser reports offline status');
          this.notifyServiceWorkerOfConnectivity(false);
        });
        
        // Listen for messages from ServiceWorker
        navigator.serviceWorker.addEventListener('message', event => {
          this.handleServiceWorkerMessage(event);
        });
        
        // Dashboard API credential changes
        window.addEventListener('dashboard:connected', event => {
          if (event.detail && event.detail.apiUrl && event.detail.apiKey) {
            this.updateServiceWorkerCredentials(event.detail.apiUrl, event.detail.apiKey);
          }
        });
        
        // Listen for application foreground events (document visibility changes)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            window.logToConsole('App became visible, checking ServiceWorker status');
            this.pingServiceWorker();
            this.requestNotificationCheck();
          }
        });
      },
      
      // Check if there's a waiting worker
      checkForWaitingWorker: function(registration) {
        if (registration.waiting) {
          window.logToConsole('New ServiceWorker waiting to activate');
          
          // Dispatch event about update availability
          window.dispatchEvent(new CustomEvent('serviceWorkerUpdateReady', {
            detail: { worker: registration.waiting }
          }));
        }
      },
      
      // Set up periodic health checking
      setupHealthChecks: function() {
        // Check health every 10 minutes
        setInterval(() => {
          this.checkServiceWorkerHealth();
        }, 10 * 60 * 1000);
        
        // Initial health check after 30 seconds
        setTimeout(() => {
          this.checkServiceWorkerHealth();
        }, 30 * 1000);
      },
      
      // Check ServiceWorker health
      checkServiceWorkerHealth: function() {
        if (!navigator.serviceWorker.controller) {
          window.logToConsole('No controlling ServiceWorker found during health check', true);
          
          // Check if we thought we had one
          if (this.registration || localStorage.getItem('serviceWorkerRegistered') === 'true') {
            window.logToConsole('ServiceWorker registration exists but not controlling, re-registering', true);
            this.registerServiceWorker();
          }
          return;
        }
        
        // Ping the service worker to make sure it's responsive
        this.pingServiceWorker();
        
        // Check notification support
        this.requestNotificationCheck();
      },
      
      // Ping ServiceWorker to make sure it's responsive
      pingServiceWorker: function() {
        if (!navigator.serviceWorker.controller) return false;
        
        window.logToConsole('Pinging ServiceWorker to verify responsiveness');
        
        // Set up timeout for response
        const pingTimeout = setTimeout(() => {
          window.logToConsole('ServiceWorker ping timed out, assuming unresponsive', true);
          this.handleUnresponsiveServiceWorker();
        }, 5000);
        
        // Store timeout ID to clear it if response comes
        window.serviceWorkerPingTimeoutId = pingTimeout;
        
        // Send ping
        navigator.serviceWorker.controller.postMessage({
          type: 'PING_SERVICE_WORKER',
          timestamp: Date.now()
        });
        
        return true;
      },
      
      // Handle unresponsive ServiceWorker
      handleUnresponsiveServiceWorker: function() {
        window.logToConsole('ServiceWorker unresponsive, enabling fallbacks', true);
        
        // Enable fallback mechanisms
        this.enableFallbacks();
        
        // Try to re-register
        if (navigator.onLine) {
          window.logToConsole('Attempting to re-register ServiceWorker');
          this.registrationAttempts = 0;
          this.registerServiceWorker();
        }
      },
      
      // Request notification check
      requestNotificationCheck: function() {
        if (!navigator.serviceWorker.controller) return false;
        
        window.logToConsole('Requesting notification check from ServiceWorker');
        
        navigator.serviceWorker.controller.postMessage({
          type: 'CHECK_NOTIFICATIONS'
        });
        
        return true;
      },
      
      // Notify ServiceWorker of connectivity change
      notifyServiceWorkerOfConnectivity: function(online) {
        if (!navigator.serviceWorker.controller) return;
        
        navigator.serviceWorker.controller.postMessage({
          type: 'CONNECTIVITY_UPDATE',
          status: online ? 'online' : 'offline',
          timestamp: Date.now()
        });
      },
      
      // Enable fallback mechanisms
      enableFallbacks: function() {
        window.logToConsole('Enabling fallback notification polling');
        
        // Set global flag for fallbacks
        window.serviceWorkerUnavailable = true;
        
        // Dispatch event so other modules can respond
        window.dispatchEvent(new CustomEvent('serviceWorkerUnavailable'));
        
        // Start polling for notifications if dashboard is active
        if (window.dashboardState && window.dashboardState.connected) {
          if (window.dashboard && typeof window.dashboard.setupFallbackPolling === 'function') {
            window.dashboard.setupFallbackPolling();
          }
        }
      },
      
      // Update ServiceWorker with new credentials
      updateServiceWorkerCredentials: function(apiUrl, apiKey) {
        if (!navigator.serviceWorker.controller) {
          window.logToConsole('No controlling ServiceWorker to update credentials', true);
          return false;
        }
        
        window.logToConsole('Sending credentials to ServiceWorker');
        
        navigator.serviceWorker.controller.postMessage({
          type: 'STORE_CREDENTIALS',
          apiUrl: apiUrl,
          apiKey: apiKey,
          timestamp: Date.now()
        });
        
        return true;
      },
      
      // Handle messages from ServiceWorker
      handleServiceWorkerMessage: function(event) {
        if (!event.data || !event.data.type) return;
        
        switch (event.data.type) {
          case 'SERVICE_WORKER_PONG':
            // Clear ping timeout
            if (window.serviceWorkerPingTimeoutId) {
              clearTimeout(window.serviceWorkerPingTimeoutId);
              window.serviceWorkerPingTimeoutId = null;
            }
            
            window.logToConsole('Received pong from ServiceWorker');
            
            // Dispatch event for dashboard
            window.dispatchEvent(new CustomEvent('serviceWorkerActive', {
              detail: { authenticated: event.data.authenticated }
            }));
            break;
            
          case 'REQUEST_CREDENTIALS':
            // ServiceWorker is requesting credentials
            window.logToConsole('ServiceWorker requesting credentials');
            
            if (window.dashboardState && 
                window.dashboardState.apiUrl && 
                window.dashboardState.apiKey) {
              
              navigator.serviceWorker.controller.postMessage({
                type: 'REQUEST_CREDENTIALS_RESPONSE',
                apiUrl: window.dashboardState.apiUrl,
                apiKey: window.dashboardState.apiKey
              });
            } else {
              window.logToConsole('No credentials available to send to ServiceWorker');
            }
            break;
            
          case 'NOTIFICATIONS_CHECKED':
            // ServiceWorker checked for notifications
            window.logToConsole(`ServiceWorker checked notifications, found ${event.data.count || 0}`);
            
            // Notify notification system if available
            if (window.notificationSystem && typeof window.notificationSystem.checkForNotifications === 'function') {
              window.notificationSystem.checkForNotifications();
            }
            
            // Also notify enhanced notification system if available
            if (window.enhancedNotificationSystem && 
                typeof window.enhancedNotificationSystem.checkForNotifications === 'function') {
              window.enhancedNotificationSystem.checkForNotifications();
            }
            break;
            
          case 'CONNECTIVITY_CHANGE':
            // ServiceWorker reports connectivity change
            window.logToConsole(`ServiceWorker reports ${event.data.status} status`);
            
            // Update dashboard if available
            if (window.dashboard && typeof window.dashboard.updateOfflineStatus === 'function') {
              window.dashboard.updateOfflineStatus(event.data.status === 'offline');
            }
            break;
            
          case 'SERVICE_WORKER_READY':
            // ServiceWorker reports ready
            window.logToConsole('ServiceWorker reports ready status');
            
            // Update dashboard status if available
            if (window.dashboard && typeof window.dashboard.updateServiceWorkerStatus === 'function') {
              window.dashboard.updateServiceWorkerStatus('active', event.data.authenticated);
            }
            break;
            
          case 'NOTIFICATION_CLICK':
            // Handle notification click
            window.logToConsole('ServiceWorker forwarded notification click');
            
            // Forward to notification system
            if (window.notificationSystem && 
                typeof window.notificationSystem.handleNotificationClick === 'function') {
              window.notificationSystem.handleNotificationClick(event.data.notification);
            }
            
            // Also try enhanced notification system
            if (window.enhancedNotificationSystem && 
                typeof window.enhancedNotificationSystem.handleNotificationClick === 'function') {
              window.enhancedNotificationSystem.handleNotificationClick(event.data.notification);
            }
            break;
        }
      },
      
      // Setup iOS-specific handling
      setupIOSSpecificHandling: function() {
        window.logToConsole('Setting up iOS-specific ServiceWorker handling');
        
        // Check for Safari's web push support (iOS 16.4+)
        const iOSVersion = this.getIOSVersion();
        const hasModernPushSupport = iOSVersion && iOSVersion[0] >= 16 && iOSVersion[1] >= 4;
        
        if (hasModernPushSupport) {
          window.logToConsole('Modern iOS push notification support detected');
        } else {
          window.logToConsole('iOS device without modern push support, using fallbacks');
          
          // Always enable fallbacks for older iOS
          this.enableFallbacks();
          
          // Setup more frequent checks when app is in foreground
          this.setupiOSForegroundPolling();
        }
        
        // Add visibility change handler for iOS
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            window.logToConsole('iOS app became visible, checking for notifications');
            // Immediate notification check when app becomes visible
            setTimeout(() => this.requestNotificationCheck(), 1000);
          }
        });
      },
      
      // Setup more frequent polling for iOS when in foreground
      setupiOSForegroundPolling: function() {
        // Check every 15 seconds when in foreground on iOS
        const iOSCheckInterval = setInterval(() => {
          // Only check when document is visible and app is connected
          if (document.visibilityState === 'visible' && 
              window.dashboardState && window.dashboardState.connected) {
            this.requestNotificationCheck();
          }
        }, 15000);
        
        // Store interval ID
        window.iOSForegroundPollingInterval = iOSCheckInterval;
      },
      
      // Helper to get iOS version
      getIOSVersion: function() {
        if (!this.isIOS) return null;
        
        const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
        return match ? [
          parseInt(match[1], 10),
          parseInt(match[2], 10),
          parseInt(match[3] || 0, 10)
        ] : null;
      }
    };
    
    // Initialize as soon as possible
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        window.swRegistration.initialize();
      });
    } else {
      window.swRegistration.initialize();
    }
    
    // Expose key methods to window for other scripts
    window.updateServiceWorkerCredentials = function(apiUrl, apiKey) {
      return window.swRegistration.updateServiceWorkerCredentials(apiUrl, apiKey);
    };
    
    window.checkForNotifications = function() {
      return window.swRegistration.requestNotificationCheck();
    };
    
    window.pingServiceWorker = function() {
      return window.swRegistration.pingServiceWorker();
    };
    
    window.skipServiceWorkerWaiting = function() {
      if (window.swRegistration.registration && window.swRegistration.registration.waiting) {
        window.swRegistration.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        return true;
      }
      return false;
    };
  })();