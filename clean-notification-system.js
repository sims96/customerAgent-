// clean-notification-system.js - A clean, self-contained notification system

(function() {
    console.log('Initializing clean notification system...');
    
    // Disable previous notification systems to prevent conflicts
    function disablePreviousSystems() {
      // Prevent the original systems from initializing
      if (window.DashboardNotificationManager) {
        window.DashboardNotificationManager = null;
      }
      
      // If there's an existing notification manager, remove its UI
      if (window.notificationManager) {
        try {
          // Remove panel if it exists
          const oldPanel = document.querySelector('.notification-panel');
          if (oldPanel && oldPanel.parentNode) {
            oldPanel.parentNode.removeChild(oldPanel);
          }
          
          // Remove bell if it exists
          const oldBell = document.querySelector('.notification-bell');
          if (oldBell && oldBell.parentNode) {
            oldBell.parentNode.removeChild(oldBell);
          }
        } catch(e) {
          console.log('Error cleaning up old notification UI:', e);
        }
        
        // Reset the reference
        window.notificationManager = null;
      }
      
      console.log('Previous notification systems disabled');
    }
    
    // Simple notification manager class
    class SimpleNotificationManager {
      constructor() {
        this.notificationPermission = 'default';
        this.soundsEnabled = true;
        this.unreadCount = 0;
        this.notificationsList = [];
        this.panelElement = null;
        this.countBadge = null;
        this._memoryCredentials = null;
        
        // Create silent fallback for notification sounds
        this.notificationSounds = {};
      }
      
      async initialize() {
        console.log('Initializing simple notification manager...');
        
        // Check for notification permission
        if ('Notification' in window) {
          this.notificationPermission = Notification.permission;
        }
        
        // Create notification bell and panel
        this.createNotificationUI();
        
        // Load settings from localStorage
        this.loadSettings();
        
        // Initialize sounds after UI is created
        this.initializeSounds();
        
        console.log('Simple notification manager initialized');
        
        // Add manual test notification after a short delay
        setTimeout(() => {
          this.notify({
            type: 'system',
            title: 'Notification System Ready',
            body: 'Your notification system is now active and ready to use.'
          });
        }, 2000);
        
        return this;
      }
      
      initializeSounds() {
        // Create silent sounds that won't cause errors
        const createSilentSound = () => {
          const audio = new Audio();
          audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADQADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD////AAAAAExhdmM1OC41NAAAAAAAAAAAAAAAACQAAAAAAAAAAEOjj3IAAAAAAAAAAAAAAAAAAAAA//tYxAADeIIEslmGKAKrrQlrMQBAEBRwX2Cg//NMxs9IkQrzz39wGA4+HwQx3/kJ3/+UBgMLgQLngf8EQRA8E4IHg+fB//////ygMEFGAYfDgQJngfBEEwIHg+D/5c31cWoIgAAIQBEVyDE0IrEMSgDYAQAlISmJoRjEVQBsAIASk//NExJcPqY6YAY94AP+vy7Lsuq7Lsuq6ZmZmZ//ffXbhhTPS6pqWktLS6pqdLS+vy+4YIv/6/++/L5fL5fL5fL//L74wR/98u9/l3//68vl8vl////8vl9fL//2SODEi//NYxJMVWwaIAc8wAKTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
          return audio;
        };
        
        this.notificationSounds = {
          'new_customer': createSilentSound(),
          'order_confirmed': createSilentSound(),
          'help_needed': createSilentSound(),
          'system': createSilentSound(),
          'default': createSilentSound()
        };
        
        console.log('Notification sounds initialized (silent fallbacks)');
      }
      
      createNotificationUI() {
        // Create notification bell
        const bell = document.createElement('div');
        bell.className = 'notification-bell btn-secondary h-9 w-9 rounded-full flex items-center justify-center cursor-pointer';
        bell.style.position = 'relative';
        bell.innerHTML = '<i class="fas fa-bell"></i>';
        
        // Add badge to bell
        const badge = document.createElement('div');
        badge.className = 'notification-badge hidden';
        badge.style.position = 'absolute';
        badge.style.top = '0px';
        badge.style.right = '0px';
        badge.style.backgroundColor = '#f56565';
        badge.style.color = 'white';
        badge.style.borderRadius = '9999px';
        badge.style.fontSize = '0.75rem';
        badge.style.height = '16px';
        badge.style.width = '16px';
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = 'center';
        badge.innerHTML = '<span>0</span>';
        bell.appendChild(badge);
        
        // Find insertion point - first try status indicator
        const statusIndicator = document.getElementById('status-indicator');
        if (statusIndicator && statusIndicator.parentNode) {
          statusIndicator.parentNode.insertBefore(bell, statusIndicator);
          console.log('Notification bell added before status indicator');
        } else {
          // Try to find navbar space
          const navbarSpace = document.querySelector('nav .flex.items-center.space-x-4');
          if (navbarSpace) {
            navbarSpace.appendChild(bell);
            console.log('Notification bell added to navbar space');
          } else {
            // Last resort - add to any flex container in nav
            const navFlex = document.querySelector('nav .flex');
            if (navFlex) {
              navFlex.appendChild(bell);
              console.log('Notification bell added to nav flex container');
            } else {
              console.error('Could not find a place to add notification bell');
            }
          }
        }
        
        // Create notification panel
        const panel = document.createElement('div');
        panel.className = 'notification-panel card fixed right-4 top-20 w-80 z-50 shadow-2xl hidden';
        panel.style.maxHeight = '80vh';
        panel.style.overflowY = 'auto';
        panel.style.backgroundColor = 'rgba(25, 29, 43, 0.95)';
        panel.style.backdropFilter = 'blur(10px)';
        panel.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        panel.style.borderRadius = '12px';
        panel.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
        panel.style.zIndex = '10000';
        
        panel.innerHTML = `
          <div class="notification-header p-3 border-b border-gray-800 flex justify-between items-center">
            <h3 class="brand-gradient-text text-lg font-semibold">Notifications</h3>
            <div class="flex space-x-2">
              <button id="notifications-sound-toggle" class="btn-secondary h-8 w-8 rounded-md flex items-center justify-center text-sm">
                <i class="fas fa-volume-up"></i>
              </button>
              <button id="notifications-clear" class="btn-secondary h-8 w-8 rounded-md flex items-center justify-center text-sm">
                <i class="fas fa-trash"></i>
              </button>
              <button id="notifications-close" class="btn-secondary h-8 w-8 rounded-md flex items-center justify-center text-sm">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          <div id="notifications-list" class="max-h-96 overflow-y-auto">
            <div class="text-gray-500 text-center p-6">
              <i class="fas fa-bell mb-2 text-2xl opacity-30"></i>
              <p>No notifications</p>
            </div>
          </div>
        `;
        
        document.body.appendChild(panel);
        
        // Add bell click handler
        bell.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggleNotificationPanel();
        });
        
        // Add panel button handlers
        const closeBtn = document.getElementById('notifications-close');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            this.hideNotificationPanel();
          });
        }
        
        const clearBtn = document.getElementById('notifications-clear');
        if (clearBtn) {
          clearBtn.addEventListener('click', () => {
            this.clearNotifications();
          });
        }
        
        const soundToggleBtn = document.getElementById('notifications-sound-toggle');
        if (soundToggleBtn) {
          soundToggleBtn.addEventListener('click', () => {
            this.toggleSounds();
          });
        }
        
        // Store references
        this.panelElement = panel;
        this.countBadge = badge;
        
        // Add pulse animation style
        const style = document.createElement('style');
        style.textContent = `
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(147, 112, 219, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(147, 112, 219, 0); }
            100% { box-shadow: 0 0 0 0 rgba(147, 112, 219, 0); }
          }
          
          .notification-bell.has-unread::after {
            content: '';
            position: absolute;
            top: 0px;
            right: 0px;
            width: 8px;
            height: 8px;
            background-color: #f56565;
            border-radius: 50%;
            animation: pulse 2s infinite;
          }
          
          .notification-item {
            transition: background-color 0.2s ease;
          }
          
          .notification-item:hover {
            background-color: rgba(255, 255, 255, 0.05);
          }
        `;
        document.head.appendChild(style);
        
        console.log('Notification UI created');
      }
      
      loadSettings() {
        const soundsEnabled = localStorage.getItem('notificationSoundsEnabled');
        if (soundsEnabled !== null) {
          this.soundsEnabled = soundsEnabled === 'true';
        }
        
        // Update sound toggle button
        this.updateSoundToggleButton();
      }
      
      saveSettings() {
        localStorage.setItem('notificationSoundsEnabled', this.soundsEnabled);
      }
      
      updateSoundToggleButton() {
        const button = document.getElementById('notifications-sound-toggle');
        if (button) {
          button.innerHTML = this.soundsEnabled ? 
            '<i class="fas fa-volume-up"></i>' : 
            '<i class="fas fa-volume-mute"></i>';
        }
      }
      
      toggleSounds() {
        this.soundsEnabled = !this.soundsEnabled;
        this.saveSettings();
        this.updateSoundToggleButton();
      }
      
      async storeApiCredentials(apiUrl, apiKey) {
        console.log('Storing API credentials in notification manager');
        
        // Store in memory
        this._memoryCredentials = { apiUrl, apiKey };
        
        // Store in localStorage as backup
        try {
          localStorage.setItem('notification_api_url', apiUrl);
          localStorage.setItem('notification_api_key', apiKey);
        } catch (e) {
          console.log('Could not store in localStorage');
        }
        
        return true;
      }
      
      async getApiCredentials() {
        // First check memory storage
        if (this._memoryCredentials && 
            this._memoryCredentials.apiUrl && 
            this._memoryCredentials.apiKey) {
          return this._memoryCredentials;
        }
        
        // Then try localStorage
        try {
          const apiUrl = localStorage.getItem('notification_api_url');
          const apiKey = localStorage.getItem('notification_api_key');
          if (apiUrl && apiKey) {
            this._memoryCredentials = { apiUrl, apiKey };
            return this._memoryCredentials;
          }
        } catch (e) {
          console.log('Could not get credentials from localStorage');
        }
        
        // Finally try dashboard state
        if (window.dashboardState && 
            window.dashboardState.connected && 
            window.dashboardState.apiUrl && 
            window.dashboardState.apiKey) {
          
          const creds = {
            apiUrl: window.dashboardState.apiUrl,
            apiKey: window.dashboardState.apiKey
          };
          
          // Store for future use
          this._memoryCredentials = creds;
          
          return creds;
        }
        
        return null;
      }
      
      updateNotificationBadge() {
        if (this.unreadCount > 0) {
          if (this.countBadge) {
            const countSpan = this.countBadge.querySelector('span');
            if (countSpan) {
              countSpan.textContent = this.unreadCount;
            }
            this.countBadge.classList.remove('hidden');
            this.countBadge.style.display = 'flex';
          }
          
          // Add visual cue to bell
          const bell = document.querySelector('.notification-bell');
          if (bell) {
            bell.classList.add('has-unread');
          }
        } else {
          if (this.countBadge) {
            this.countBadge.classList.add('hidden');
            this.countBadge.style.display = 'none';
          }
          
          // Remove visual cue from bell
          const bell = document.querySelector('.notification-bell');
          if (bell) {
            bell.classList.remove('has-unread');
          }
        }
      }
      
      updateNotificationList() {
        const listElement = document.getElementById('notifications-list');
        if (!listElement) return;
        
        if (this.notificationsList.length === 0) {
          listElement.innerHTML = `
            <div class="text-gray-500 text-center p-6">
              <i class="fas fa-bell mb-2 text-2xl opacity-30"></i>
              <p>No notifications</p>
            </div>
          `;
          return;
        }
        
        listElement.innerHTML = '';
        
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
          
          listElement.appendChild(item);
        });
      }
      
      async markNotificationAsRead(id) {
        const index = this.notificationsList.findIndex(n => n.id === id);
        if (index !== -1) {
          this.notificationsList[index].read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          this.updateNotificationBadge();
          this.updateNotificationList();
        }
      }
      
      async clearNotifications() {
        this.notificationsList = [];
        this.unreadCount = 0;
        this.updateNotificationBadge();
        this.updateNotificationList();
      }
      
      toggleNotificationPanel() {
        if (this.panelElement.classList.contains('hidden')) {
          this.showNotificationPanel();
        } else {
          this.hideNotificationPanel();
        }
      }
      
      showNotificationPanel() {
        this.panelElement.classList.remove('hidden');
        // Refresh notifications when panel opens
        this.refreshNotifications();
      }
      
      hideNotificationPanel() {
        this.panelElement.classList.add('hidden');
      }
      
      async handleNotificationClick(notification) {
        console.log('Notification clicked:', notification);
        
        // Mark as read
        if (!notification.read) {
          await this.markNotificationAsRead(notification.id);
        }
        
        // Handle different notification types if defined in window.dashboardState
        if (window.dashboardState && notification.userId) {
          // Set the selected user ID
          window.dashboardState.selectedUserId = notification.userId;
          
          // Use the UI functions if available
          if (window.ui && window.ui.showConversationDetail) {
            await window.ui.showConversationDetail(notification.userId);
            
            // Handle based on notification type
            if (notification.type === 'help_needed' && window.elements && window.elements.takeOverBtn) {
              // Suggest taking over for help requests
              window.elements.takeOverBtn.classList.add('glow');
              setTimeout(() => {
                window.elements.takeOverBtn.classList.remove('glow');
              }, 3000);
            }
          }
        }
        
        // Hide notification panel
        this.hideNotificationPanel();
      }
      
      async refreshNotifications() {
        try {
          // Get new notifications from API
          await this.fetchNotificationsFromApi();
          
          // Update UI
          this.updateNotificationBadge();
          this.updateNotificationList();
        } catch (error) {
          console.error('Error refreshing notifications:', error);
        }
      }
      
      async fetchNotificationsFromApi() {
        try {
          const credentials = await this.getApiCredentials();
          if (!credentials || !credentials.apiUrl || !credentials.apiKey) {
            console.log('No API credentials available for fetching notifications');
            return [];
          }
          
          // Log API information for debugging
          console.log('Fetching notifications with credentials:', {
            apiUrl: credentials.apiUrl,
            hasApiKey: !!credentials.apiKey
          });
          
          const response = await fetch(`${credentials.apiUrl}/api/notifications/pending`, {
            headers: {
              'Authorization': `Bearer ${credentials.apiKey}`
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API returned status ${response.status}: ${errorText}`);
          }
          
          const data = await response.json();
          console.log('Fetched notifications from API:', data);
          
          if (data.notifications && Array.isArray(data.notifications)) {
            // Store each notification
            const storePromises = data.notifications.map(notification => 
              this.notify(notification, false) // Don't play sound for fetched notifications
            );
            
            await Promise.all(storePromises);
            
            // Mark as received on server
            if (data.notifications.length > 0) {
              const notificationIds = data.notifications.map(n => n.id);
              await fetch(`${credentials.apiUrl}/api/notifications/mark-received`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${credentials.apiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids: notificationIds })
              });
            }
            
            return data.notifications;
          }
          
          return [];
        } catch (error) {
          console.error('Error fetching notifications from API:', error);
          return [];
        }
      }
      
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
      
      showBrowserNotification(data) {
        try {
          // Create a browser notification
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
      
      async notify(data, playSound = true) {
        console.log('Creating notification:', data);
        
        // Play notification sound if enabled and playSound flag is true
        if (this.soundsEnabled && playSound) {
          const sound = this.notificationSounds[data.type] || this.notificationSounds.default;
          if (sound) {
            // Try to play the sound, but don't crash if it fails
            sound.play().catch(err => console.log('Error playing notification sound:', err));
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
        
        // Add to notification list at the beginning (most recent first)
        this.notificationsList.unshift({
          ...data,
          read: false
        });
        
        // Update unread counter
        this.unreadCount++;
        
        // Update UI
        this.updateNotificationBadge();
        this.updateNotificationList();
        
        // Show browser notification if permission granted
        if (this.notificationPermission === 'granted') {
          this.showBrowserNotification(data);
        }
        
        return data.id;
      }
    }
    
    // Function to hook into dashboard events
    function hookIntoDashboardEvents(notificationManager) {
      console.log('Setting up dashboard event hooks...');
      
      // Add a MutationObserver to watch for dashboard state changes
      const observeStateChanges = () => {
        // Wait a bit for dashboard to initialize
        setTimeout(() => {
          if (window.dashboardState) {
            console.log('Found dashboard state, monitoring for changes');
            
            // Monitor the connect button
            const connectBtn = document.getElementById('connect-btn');
            if (connectBtn) {
              const originalClickHandler = connectBtn.onclick;
              
              connectBtn.onclick = function(event) {
                // Call original handler first
                if (typeof originalClickHandler === 'function') {
                  originalClickHandler.call(this, event);
                }
                
                // Then sync after a short delay
                setTimeout(() => {
                  if (window.dashboardState && window.dashboardState.connected) {
                    console.log('Dashboard connected, syncing credentials');
                    
                    notificationManager.storeApiCredentials(
                      window.dashboardState.apiUrl,
                      window.dashboardState.apiKey
                    ).then(() => {
                      console.log('Credentials stored, refreshing notifications');
                      return notificationManager.refreshNotifications();
                    }).catch(err => {
                      console.error('Error syncing credentials:', err);
                    });
                  }
                }, 2000);
              };
            }
            
            // Hook into the refresh list function if it exists
            if (window.ui && window.ui.refreshConversationList) {
              const originalRefresh = window.ui.refreshConversationList;
              
              window.ui.refreshConversationList = async function() {
                // Call original refresh function
                await originalRefresh.call(this);
                
                // Then check for notifications
                setTimeout(() => {
                  notificationManager.refreshNotifications().catch(err => {
                    console.log('Error refreshing notifications:', err);
                  });
                }, 1000);
              };
            }
          }
        }, 1000);
      };
      
      // Start observing
      observeStateChanges();
      
      // Also monitor for credential changes periodically
      setInterval(() => {
        if (window.dashboardState && window.dashboardState.connected) {
          notificationManager.getApiCredentials().then(creds => {
            if (!creds) {
              console.log('No credentials found, trying to sync from dashboard state');
              notificationManager.storeApiCredentials(
                window.dashboardState.apiUrl,
                window.dashboardState.apiKey
              );
            }
          });
        }
      }, 10000);
    }
    
    // Main initialization function
    async function initialize() {
      // First, disable any previous notification systems
      disablePreviousSystems();
      
      // Create our clean notification manager
      const notificationManager = new SimpleNotificationManager();
      await notificationManager.initialize();
      
      // Store globally so it can be accessed by the dashboard and console
      window.notificationManager = notificationManager;
      
      // Hook into dashboard events
      hookIntoDashboardEvents(notificationManager);
      
      // Create global test functions
      window.testNotification = function(userId = 'test_user') {
        return notificationManager.notify({
          type: 'help_needed',
          title: 'Test Notification',
          body: 'This is a test notification created at ' + new Date().toLocaleTimeString(),
          userId: userId
        });
      };
      
      window.checkNotificationCredentials = async function() {
        const creds = await notificationManager.getApiCredentials();
        console.log('Current notification credentials:', creds ? {
          apiUrl: creds.apiUrl,
          hasApiKey: !!creds.apiKey
        } : 'No credentials found');
        return creds;
      };
      
      window.forceCredentialSync = function() {
        if (window.dashboardState && window.dashboardState.connected) {
          return notificationManager.storeApiCredentials(
            window.dashboardState.apiUrl,
            window.dashboardState.apiKey
          ).then(() => {
            console.log('Credentials synced from dashboard state');
            return true;
          });
        } else {
          console.log('Dashboard not connected, cannot sync credentials');
          return Promise.resolve(false);
        }
      };
      
      // Add keyboard shortcut for testing
      document.addEventListener('keydown', function(event) {
        // Alt+N to create a test notification
        if (event.altKey && event.key === 'n') {
          window.testNotification();
        }
      });
      
      console.log('Clean notification system fully initialized');
    }
    
    // Start when the page is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
    } else {
      // Page already loaded
      initialize();
    }
  })();