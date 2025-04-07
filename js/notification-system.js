// notification-system.js - Integrated notification system for dashboard
(function() {
  'use strict';
  
  // NotificationSystem class
  class NotificationSystem {
    constructor() {
      // Properties
      this.notificationPermission = 'default';
      this.soundsEnabled = true;
      this.unreadCount = 0;
      this.notificationsList = [];
      this.serviceWorkerRegistration = null;
      this.hasServiceWorker = 'serviceWorker' in navigator;
      this.notificationSounds = {};
      this.checkInterval = null;
      
      // Load settings from localStorage
      this.loadSettings();
    }
    
    // Initialize notification system
    async initialize() {
      console.log('Initializing notification system...');
      
      // Check for notification permission
      if ('Notification' in window) {
        this.notificationPermission = Notification.permission;
      }
      
      // Initialize sounds
      this.initializeSounds();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Register service worker if not already registered
      if (this.hasServiceWorker) {
        await this.setupServiceWorker();
      }
      
      // Set up notification check interval
      this.setupNotificationCheckInterval();
      
      console.log('Notification system initialized');
      
      // Create initial welcome notification
      setTimeout(() => {
        this.notify({
          type: 'system',
          title: 'Notification System Ready',
          body: 'Your notification system is now active and ready to use.'
        });
      }, 2000);
    }
    
    // Load settings from localStorage
    loadSettings() {
      try {
        const soundsEnabled = localStorage.getItem('notificationSoundsEnabled');
        if (soundsEnabled !== null) {
          this.soundsEnabled = soundsEnabled === 'true';
        }
      } catch (e) {
        console.error('Error loading notification settings:', e);
      }
    }
    
    // Save settings to localStorage
    saveSettings() {
      try {
        localStorage.setItem('notificationSoundsEnabled', this.soundsEnabled);
      } catch (e) {
        console.error('Error saving notification settings:', e);
      }
    }
    
    // Setup event listeners
    setupEventListeners() {
      // Handle dashboard connection events
      window.addEventListener('dashboard:connected', this.handleDashboardConnected.bind(this));
      window.addEventListener('dashboard:notificationCreated', this.handleNotificationCreated.bind(this));
      window.addEventListener('dashboard:notificationPanelOpened', this.handleNotificationPanelOpened.bind(this));
      window.addEventListener('dashboard:notificationsCleared', this.handleNotificationsCleared.bind(this));
      window.addEventListener('dashboard:notificationSoundChanged', this.handleNotificationSoundChanged.bind(this));
      
      // Listen for service worker messages
      if (this.hasServiceWorker) {
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
      }
    }
    
    // Initialize notification sounds
    initializeSounds() {
      // Create silent fallback for notification sounds
      const createSilentSound = () => {
        const audio = new Audio();
        audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADQADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD////AAAAAExhdmM1OC41NAAAAAAAAAAAAAAAACQAAAAAAAAAAEOjj3IAAAAAAAAAAAAAAAAAAAAA//tYxAADeIIEslmGKAKrrQlrMQBAEBRwX2Cg//NMxs9IkQrzz39wGA4+HwQx3/kJ3/+UBgMLgQLngf8EQRA8E4IHg+fB//////ygMEFGAYfDgQJngfBEEwIHg+D/5c31cWoIgAAIQBEVyDE0IrEMSgDYAQAlISmJoRjEVQBsAIASk//NExJcPqY6YAY94AP+vy7Lsuq7Lsuq6ZmZmZ//ffXbhhTPS6pqWktLS6pqdLS+vy+4YIv/6/++/L5fL5fL5fL//L74wR/98u9/l3//68vl8vl////8vl9fL//2SODEi//NYxJMVWwaIAc8wAKTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
        return audio;
      };
      
      // Try to load actual notification sounds
      try {
        this.notificationSounds = {
          'new_customer': new Audio('./notification-sounds/new-customer.mp3'),
          'returning_customer': new Audio('./notification-sounds/new-customer.mp3'), // Reuse sound for returning customers
          'order_confirmed': new Audio('./notification-sounds/order-confirmed.mp3'),
          'help_needed': new Audio('./notification-sounds/help-needed.mp3'),
          'system': createSilentSound(),
          'default': createSilentSound()
        };
        
        // Pre-load sounds for mobile devices
        Object.values(this.notificationSounds).forEach(sound => {
          if (sound && sound.load) {
            sound.load();
          }
        });
        
        console.log('Notification sounds initialized');
      } catch (e) {
        // Fallback to silent sounds if there's an error
        this.notificationSounds = {
          'new_customer': createSilentSound(),
          'returning_customer': createSilentSound(),
          'order_confirmed': createSilentSound(),
          'help_needed': createSilentSound(),
          'system': createSilentSound(),
          'default': createSilentSound()
        };
        console.log('Notification sounds initialized with silent fallbacks');
      }
    }
    
    // Setup service worker for notifications
    async setupServiceWorker() {
      try {
        // Find service worker registration
        this.serviceWorkerRegistration = await navigator.serviceWorker.ready;
        console.log('Service worker ready:', this.serviceWorkerRegistration.scope);
        
        // Request notification permission if not already granted
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission();
          this.notificationPermission = permission;
          console.log('Notification permission:', permission);
        }
        
        // Set up periodic notification checks
        this.setupServiceWorkerSync(this.serviceWorkerRegistration);
        
        return this.serviceWorkerRegistration;
      } catch (error) {
        console.error('Error setting up service worker for notifications:', error);
        return null;
      }
    }
    
    // Set up service worker sync
    setupServiceWorkerSync(registration) {
      // Check for periodic sync capability
      if ('periodicSync' in registration) {
        registration.periodicSync.register('check-notifications', {
          minInterval: 15 * 60 * 1000 // 15 minutes minimum
        }).then(() => {
          console.log('Periodic sync registered successfully');
        }).catch(error => {
          console.log('Periodic sync registration failed:', error);
          this.setupBasicSync(registration);
        });
      } else {
        this.setupBasicSync(registration);
      }
      
      // Sync credentials immediately if available
      this.syncCredentialsToServiceWorker();
    }
    
    // Set up basic sync for service worker
    setupBasicSync(registration) {
      // Set up basic background sync (when online)
      if ('sync' in registration) {
        registration.sync.register('check-notifications')
          .then(() => {
            console.log('Basic sync registered successfully');
          })
          .catch(error => {
            console.log('Basic sync registration failed:', error);
          });
      }
    }
    
    // Set up interval for checking notifications
    setupNotificationCheckInterval() {
      // Clear existing interval if any
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
      }
      
      // Set up new interval
      this.checkInterval = setInterval(() => {
        this.checkForNotifications();
      }, 60000); // Check every minute
    }
    
    // Check for new notifications
    async checkForNotifications() {
      // Skip if not connected
      if (!window.dashboardState || !window.dashboardState.connected) {
        return;
      }
      
      try {
        const result = await window.api.getPendingNotifications();
        
        if (result && result.notifications && Array.isArray(result.notifications) && result.notifications.length > 0) {
          console.log(`Found ${result.notifications.length} pending notifications`);
          
          // Process each notification
          const notificationIds = [];
          
          for (const notification of result.notifications) {
            // Add to local list and display
            await this.notify(notification, true);
            
            // Add to list for marking as received
            notificationIds.push(notification.id);
          }
          
          // Mark notifications as received on server
          if (notificationIds.length > 0) {
            await window.api.markNotificationsReceived(notificationIds);
          }
        }
      } catch (error) {
        console.error('Error checking for notifications:', error);
      }
    }
    
    // Sync credentials to service worker
    syncCredentialsToServiceWorker() {
      if (!navigator.serviceWorker.controller) {
        console.log('No active service worker to sync credentials with');
        return;
      }
      
      // Get credentials from dashboard state
      if (window.dashboardState && 
          window.dashboardState.connected && 
          window.dashboardState.apiUrl && 
          window.dashboardState.apiKey) {
        
        const credentials = {
          apiUrl: window.dashboardState.apiUrl,
          apiKey: window.dashboardState.apiKey
        };
        
        console.log('Syncing credentials to service worker');
        
        // Send to service worker
        navigator.serviceWorker.controller.postMessage({
          type: 'STORE_CREDENTIALS',
          apiUrl: credentials.apiUrl,
          apiKey: credentials.apiKey,
          timestamp: Date.now()
        });
        
        // Immediately trigger a notification check
        setTimeout(() => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'CHECK_NOTIFICATIONS'
            });
          }
        }, 2000);
      }
    }
    
    // Handle dashboard connected event
    handleDashboardConnected(event) {
      console.log('Dashboard connected event received');
      
      // Sync credentials to service worker
      if (event.detail && event.detail.apiUrl && event.detail.apiKey) {
        // Store credentials for notification system
        window.dashboardState.apiUrl = event.detail.apiUrl;
        window.dashboardState.apiKey = event.detail.apiKey;
        
        // Sync to service worker
        this.syncCredentialsToServiceWorker();
        
        // Check for notifications immediately
        this.checkForNotifications();
      }
    }
    
    // Handle notification created event
    handleNotificationCreated(event) {
      console.log('Notification created event received');
      
      // Check for notifications
      this.checkForNotifications();
      
      // Also notify service worker
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CHECK_NOTIFICATIONS'
        });
      }
    }
    
    // Handle notification panel opened event
    handleNotificationPanelOpened() {
      console.log('Notification panel opened');
      
      // Mark all notifications as read
      this.markAllNotificationsAsRead();
    }
    
    // Handle notifications cleared event
    handleNotificationsCleared() {
      console.log('Notifications cleared event received');
      
      // Clear notifications list
      this.notificationsList = [];
      this.unreadCount = 0;
      
      // Update UI
      if (window.ui) {
        window.ui.updateNotificationBadge(0);
      }
    }
    
    // Handle notification sound changed event
    handleNotificationSoundChanged(event) {
      console.log('Notification sound changed event received');
      
      if (event.detail && typeof event.detail.enabled === 'boolean') {
        this.soundsEnabled = event.detail.enabled;
        this.saveSettings();
      }
    }
    
    // Handle messages from service worker
    handleServiceWorkerMessage(event) {
      console.log('Received message from service worker:', event.data.type);
      
      if (event.data.type === 'NOTIFICATION_CLICK') {
        // Handle notification click from service worker
        this.handleNotificationClick(event.data.notification);
      } else if (event.data.type === 'REQUEST_CREDENTIALS') {
        // Service worker is requesting credentials
        this.sendCredentialsToServiceWorker();
      } else if (event.data.type === 'NOTIFICATIONS_CHECKED') {
        // Service worker has checked for notifications
        console.log(`Service worker checked for notifications, found ${event.data.count}`);
        
        // Refresh our notifications to stay in sync
        this.checkForNotifications();
      }
    }
    
    // Send credentials to service worker
    sendCredentialsToServiceWorker() {
      if (!navigator.serviceWorker.controller) {
        console.log('No service worker to send credentials to');
        return;
      }
      
      if (window.dashboardState && 
          window.dashboardState.apiUrl && 
          window.dashboardState.apiKey) {
        
        console.log('Sending requested credentials to service worker');
        
        navigator.serviceWorker.controller.postMessage({
          type: 'REQUEST_CREDENTIALS_RESPONSE',
          apiUrl: window.dashboardState.apiUrl,
          apiKey: window.dashboardState.apiKey
        });
      } else {
        console.log('No credentials available to send to service worker');
      }
    }
    
    // Create a notification
    async notify(data, playSound = true) {
      console.log('Creating notification:', data);
      
      // Play notification sound if enabled and playSound flag is true
      if (this.soundsEnabled && playSound) {
        const sound = this.notificationSounds[data.type] || this.notificationSounds.default;
        if (sound) {
          try {
            await sound.play();
          } catch (err) {
            console.log('Error playing notification sound:', err);
          }
        }
      }
      
      // Generate a unique ID if not provided
      if (!data.id) {
        data.id = Date.now() + '-' + Math.random().toString(36).substring(2, 10);
      }
      
      // Make sure timestamp exists
      if (!data.timestamp) {
        data.timestamp = Date.now();
      }
      
      // Add to notification list (most recent first)
      this.notificationsList.unshift({
        ...data,
        read: false
      });
      
      // Update unread counter
      this.unreadCount++;
      
      // Update UI
      if (window.ui) {
        window.ui.updateNotificationBadge(this.unreadCount);
        this.updateNotificationsList();
      }
      
      // Show browser notification if permission granted
      if (this.notificationPermission === 'granted') {
        this.showBrowserNotification(data);
      }
      
      return data.id;
    }
    
    // Update the notifications list in the UI
    updateNotificationsList() {
      const notificationsList = document.getElementById('notifications-list');
      if (!notificationsList) return;
      
      if (this.notificationsList.length === 0) {
        notificationsList.innerHTML = `
          <div class="text-gray-500 text-center p-6">
            <i class="fas fa-bell mb-2 text-2xl opacity-30"></i>
            <p>No notifications</p>
          </div>
        `;
        return;
      }
      
      notificationsList.innerHTML = '';
      
      this.notificationsList.forEach(notification => {
        const item = document.createElement('div');
        item.className = `notification-item p-3 border-b border-gray-800 cursor-pointer ${notification.read ? 'opacity-60' : ''}`;
        item.setAttribute('data-id', notification.id);
        
        // Format timestamp
        const timestamp = new Date(notification.timestamp || Date.now()).toLocaleString();
        
        // Choose icon based on notification type
        let icon = 'bell';
        let bgClass = 'bg-blue-800';
        
        switch(notification.type) {
          case 'new_customer':
            icon = 'user-plus';
            bgClass = 'bg-green-800';
            break;
          case 'returning_customer':
            icon = 'user-check';
            bgClass = 'bg-teal-800';
            break;
          case 'order_confirmed':
            icon = 'shopping-cart';
            bgClass = 'bg-purple-800';
            break;
          case 'help_needed':
            icon = 'question-circle';
            bgClass = 'bg-red-800';
            break;
          case 'system':
            icon = 'info-circle';
            bgClass = 'bg-blue-800';
            break;
        }
        
        item.innerHTML = `
          <div class="flex items-start">
            <div class="h-10 w-10 rounded-full ${bgClass} flex items-center justify-center mr-3 flex-shrink-0">
              <i class="fas fa-${icon}"></i>
            </div>
            <div class="flex-grow">
              <div class="flex justify-between">
                <h4 class="font-semibold text-sm">${notification.title || 'Notification'}</h4>
                <span class="text-xs text-gray-500">${timestamp}</span>
              </div>
              <p class="text-sm text-gray-300 mt-1">${notification.body || ''}</p>
              ${notification.userId ? `<span class="text-xs bg-gray-700 text-gray-300 rounded px-2 py-0.5 mt-1 inline-block">User: ${notification.userId}</span>` : ''}
            </div>
          </div>
        `;
        
        // Add click handler
        item.addEventListener('click', () => {
          this.handleNotificationClick(notification);
        });
        
        notificationsList.appendChild(item);
      });
    }
    
    // Mark all notifications as read
    markAllNotificationsAsRead() {
      this.notificationsList.forEach(notification => {
        notification.read = true;
      });
      
      this.unreadCount = 0;
      
      // Update UI
      if (window.ui) {
        window.ui.updateNotificationBadge(0);
        this.updateNotificationsList();
      }
    }
    
    // Mark a specific notification as read
    markNotificationAsRead(id) {
      const notification = this.notificationsList.find(n => n.id === id);
      if (notification && !notification.read) {
        notification.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        
        // Update UI
        if (window.ui) {
          window.ui.updateNotificationBadge(this.unreadCount);
          this.updateNotificationsList();
        }
      }
    }
    
    // Show browser notification
    showBrowserNotification(data) {
      try {
        // Use service worker for notifications if available
        if (this.serviceWorkerRegistration) {
          this.serviceWorkerRegistration.showNotification(
            data.title || 'Notification', 
            {
              body: data.body || '',
              icon: './logo.jpg',
              badge: './logo.jpg',
              tag: data.id || 'default',
              renotify: true,
              data: data,
              requireInteraction: data.type === 'help_needed', // Keep help notifications visible until user interacts
              vibrate: [100, 50, 100],
              actions: [
                {
                  action: 'view',
                  title: 'View'
                },
                {
                  action: 'dismiss',
                  title: 'Dismiss'
                }
              ]
            }
          );
          return;
        }
        
        // Fallback to basic notification if service worker isn't available
        const notification = new Notification(data.title || 'Notification', {
          body: data.body || '',
          icon: './logo.jpg'
        });
        
        // Add click handler
        notification.onclick = () => {
          window.focus();
          this.handleNotificationClick(data);
        };
      } catch (error) {
        console.error('Failed to show browser notification:', error);
      }
    }
    
    // Handle notification click
    handleNotificationClick(notification) {
      console.log('Notification clicked:', notification);
      
      // Mark as read
      this.markNotificationAsRead(notification.id);
      
      // If it has a user ID, show the conversation
      if (notification.userId && window.ui && typeof window.ui.showConversationDetail === 'function') {
        window.ui.showConversationDetail(notification.userId);
        
        // Hide notification panel
        if (window.ui.hideNotificationPanel) {
          window.ui.hideNotificationPanel();
        }
        
        // If it's a help request notification, highlight the take over button
        if (notification.type === 'help_needed') {
          setTimeout(() => {
            const takeOverBtn = document.getElementById('take-over-btn');
            if (takeOverBtn) {
              takeOverBtn.classList.add('glow');
              setTimeout(() => {
                takeOverBtn.classList.remove('glow');
              }, 3000);
            }
          }, 1000);
        }
      }
    }
    
    // Request notification permission
    async requestNotificationPermission() {
      if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return false;
      }
      
      if (Notification.permission === 'granted') {
        this.notificationPermission = 'granted';
        return true;
      }
      
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        this.notificationPermission = permission;
        return permission === 'granted';
      }
      
      return false;
    }
  }
  
  // Create and initialize the notification system
  document.addEventListener('DOMContentLoaded', () => {
    // Create notification system
    window.notificationSystem = new NotificationSystem();
    
    // Initialize notification system
    window.notificationSystem.initialize();
    
    // Log initialization
    window.logToConsole('Notification system module initialized');
  });
})();