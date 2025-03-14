// enhanced-notification-system.js - Improved notification system with smooth scrolling and navigation
(function() {
    'use strict';
    
    // Enhanced NotificationSystem class
    class EnhancedNotificationSystem {
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
        this.currentFilter = 'all'; // Current active filter
        this.isAnimating = false; // Prevent multiple animations
        this.isPanelVisible = false; // Track panel visibility state
        
        // Load settings from localStorage
        this.loadSettings();
      }
      
      // Initialize notification system
      async initialize() {
        console.log('Initializing enhanced notification system...');
        
        // Check for notification permission
        if ('Notification' in window) {
          this.notificationPermission = Notification.permission;
        }
        
        // Initialize sounds
        this.initializeSounds();
        
        // Create or update UI elements
        this.createNotificationElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Register service worker if not already registered
        if (this.hasServiceWorker) {
          await this.setupServiceWorker();
        }
        
        // Set up notification check interval
        this.setupNotificationCheckInterval();
        
        // Enable smooth scrolling
        this.enableSmoothScrolling();
        
        console.log('Enhanced notification system initialized');
        
        // Create initial welcome notification
        setTimeout(() => {
          this.notify({
            type: 'system',
            title: 'Enhanced Notification System Ready',
            body: 'Your enhanced notification system is now active with improved navigation.'
          });
        }, 2000);
      }
      
      // Create or update notification UI elements
      createNotificationElements() {
        // Only create elements if they don't exist
        if (document.getElementById('enhanced-notification-panel')) {
          return;
        }
        
        // Add CSS for enhanced notification system
        const styleElement = document.createElement('style');
        styleElement.id = 'enhanced-notification-styles';
        styleElement.textContent = `
          /* Enhanced Notification System Styles */
          .enhanced-notification-panel {
            position: fixed;
            top: 80px;
            right: 16px;
            width: 350px;
            max-width: 90vw;
            max-height: calc(100vh - 100px);
            display: flex;
            flex-direction: column;
            background-color: rgba(25, 29, 43, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            transform: translateX(400px);
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
            overflow: hidden;
          }
          
          .enhanced-notification-panel.visible {
            transform: translateX(0);
            opacity: 1;
          }
          
          .notification-header {
            padding: 12px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            background-color: rgba(25, 29, 43, 0.95);
            z-index: 2;
          }
          
          .notification-filters {
            display: flex;
            padding: 8px 12px;
            overflow-x: auto;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            gap: 8px;
            -ms-overflow-style: none; /* IE and Edge */
            scrollbar-width: none; /* Firefox */
          }
          
          .notification-filters::-webkit-scrollbar {
            display: none; /* Chrome, Safari, Opera */
          }
          
          .notification-filter {
            padding: 4px 12px;
            border-radius: 16px;
            background-color: rgba(55, 65, 81, 0.4);
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.75rem;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s ease;
            border: 1px solid transparent;
          }
          
          .notification-filter.active {
            background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
            color: white;
          }
          
          .notification-filter:hover:not(.active) {
            background-color: rgba(55, 65, 81, 0.6);
            border-color: rgba(255, 255, 255, 0.2);
          }
          
          .notification-content {
            flex-grow: 1;
            overflow-y: auto;
            padding: 0;
            scroll-behavior: smooth;
            overscroll-behavior: contain;
          }
          
          .notification-item {
            padding: 12px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            cursor: pointer;
            transition: background-color 0.2s ease;
          }
          
          .notification-item:hover {
            background-color: rgba(255, 255, 255, 0.05);
          }
          
          .notification-item.unread::before {
            content: '';
            display: block;
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 60%;
            background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
            border-radius: 0 2px 2px 0;
          }
          
          .notification-item.unread {
            position: relative;
            background-color: rgba(147, 112, 219, 0.1);
          }
          
          .notification-actions {
            display: flex;
            padding: 8px 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            gap: 8px;
            background-color: rgba(25, 29, 43, 0.95);
          }
          
          .notification-action-btn {
            padding: 6px 12px;
            border-radius: 6px;
            background-color: rgba(55, 65, 81, 0.4);
            color: white;
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
            display: flex;
            align-items: center;
            gap: 4px;
          }
          
          .notification-action-btn:hover {
            background-color: rgba(55, 65, 81, 0.6);
          }
          
          .notification-action-btn.primary {
            background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
          }
          
          .notification-action-btn.primary:hover {
            opacity: 0.9;
          }
          
          /* Empty state */
          .notification-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 32px 16px;
            color: rgba(255, 255, 255, 0.5);
            text-align: center;
          }
          
          .notification-empty i {
            font-size: 2rem;
            margin-bottom: 12px;
            opacity: 0.3;
          }
          
          /* Search box */
          .notification-search {
            padding: 8px 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            position: relative;
          }
          
          .notification-search input {
            width: 100%;
            background-color: rgba(55, 65, 81, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            padding: 6px 12px 6px 32px;
            color: white;
            font-size: 0.8rem;
          }
          
          .notification-search input:focus {
            outline: none;
            border-color: rgba(147, 112, 219, 0.5);
          }
          
          .notification-search i {
            position: absolute;
            left: 22px;
            top: 50%;
            transform: translateY(-50%);
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.8rem;
          }
          
          /* Animations */
          @keyframes fadeInRight {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          .notification-item {
            animation: fadeInRight 0.3s ease forwards;
          }
          
          /* Keyboard shortcut hint */
          .keyboard-hint {
            position: absolute;
            bottom: 8px;
            right: 8px;
            font-size: 0.65rem;
            color: rgba(255, 255, 255, 0.3);
            background-color: rgba(0, 0, 0, 0.2);
            padding: 2px 6px;
            border-radius: 4px;
            pointer-events: none;
          }
          
          /* Mark all button animation */
          @keyframes pulse {
            0% {
              box-shadow: 0 0 0 0 rgba(147, 112, 219, 0.7);
            }
            70% {
              box-shadow: 0 0 0 6px rgba(147, 112, 219, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(147, 112, 219, 0);
            }
          }
          
          .btn-animated {
            animation: pulse 2s infinite;
          }
          
          /* Improved scrollbar for notification content */
          .notification-content::-webkit-scrollbar {
            width: 6px;
          }
          
          .notification-content::-webkit-scrollbar-track {
            background: rgba(15, 17, 23, 0.5);
          }
          
          .notification-content::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
            border-radius: 3px;
          }
          
          /* Make sure notification panel doesn't go off-screen on mobile */
          @media (max-width: 480px) {
            .enhanced-notification-panel {
              right: 8px;
              left: 8px;
              width: auto;
              max-width: none;
            }
          }
        `;
        document.head.appendChild(styleElement);
        
        // Create enhanced notification panel
        const panelHtml = `
          <div id="enhanced-notification-panel" class="enhanced-notification-panel">
            <div class="notification-header">
              <h3 class="brand-gradient-text text-lg font-semibold">Notifications</h3>
              <div class="flex space-x-2">
                <button id="enhanced-notifications-sound-toggle" class="btn-secondary h-8 w-8 rounded-md flex items-center justify-center text-sm" title="Toggle sound">
                  <i class="fas fa-volume-up"></i>
                </button>
                <button id="enhanced-mark-all-read" class="btn-secondary h-8 w-8 rounded-md flex items-center justify-center text-sm" title="Mark all as read">
                  <i class="fas fa-check-double"></i>
                </button>
                <button id="enhanced-notifications-clear" class="btn-secondary h-8 w-8 rounded-md flex items-center justify-center text-sm" title="Clear all">
                  <i class="fas fa-trash"></i>
                </button>
                <button id="enhanced-notifications-close" class="btn-secondary h-8 w-8 rounded-md flex items-center justify-center text-sm">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
            
            <div class="notification-search">
              <i class="fas fa-search"></i>
              <input type="text" id="notification-search-input" placeholder="Search notifications..." />
            </div>
            
            <div class="notification-filters">
              <div class="notification-filter active" data-filter="all">All</div>
              <div class="notification-filter" data-filter="help_needed">Help Needed</div>
              <div class="notification-filter" data-filter="order_confirmed">Orders</div>
              <div class="notification-filter" data-filter="system">System</div>
              <div class="notification-filter" data-filter="unread">Unread</div>
            </div>
            
            <div id="enhanced-notifications-list" class="notification-content">
              <div class="notification-empty">
                <i class="fas fa-bell"></i>
                <p>No notifications</p>
              </div>
            </div>
            
            <div class="notification-actions">
              <button id="enhanced-open-settings" class="notification-action-btn flex-grow">
                <i class="fas fa-cog"></i> Settings
              </button>
              <button id="enhanced-mark-all-btn" class="notification-action-btn primary flex-grow">
                <i class="fas fa-check-double"></i> Mark All as Read
              </button>
            </div>
            <div class="keyboard-hint">ESC to close</div>
          </div>
        `;
        
        // Append to body
        document.body.insertAdjacentHTML('beforeend', panelHtml);
        
        // Initialize event listeners for new elements
        this.setupEnhancedEventListeners();
      }
      
      // Setup event listeners for enhanced notification elements
      setupEnhancedEventListeners() {
        // Sound toggle
        document.getElementById('enhanced-notifications-sound-toggle')?.addEventListener('click', () => {
          this.toggleSound();
        });
        
        // Close button
        document.getElementById('enhanced-notifications-close')?.addEventListener('click', () => {
          this.hidePanel();
        });
        
        // Mark all as read button
        const markAllBtn = document.getElementById('enhanced-mark-all-btn');
        if (markAllBtn) {
          markAllBtn.addEventListener('click', () => {
            this.markAllAsRead();
          });
        }
        
        const markAllReadIcon = document.getElementById('enhanced-mark-all-read');
        if (markAllReadIcon) {
          markAllReadIcon.addEventListener('click', () => {
            this.markAllAsRead();
          });
        }
        
        // Clear all button
        document.getElementById('enhanced-notifications-clear')?.addEventListener('click', () => {
          this.clearAllNotifications();
        });
        
        // Filter tabs
        const filters = document.querySelectorAll('.notification-filter');
        filters.forEach(filter => {
          filter.addEventListener('click', (e) => {
            // Set active class
            filters.forEach(f => f.classList.remove('active'));
            e.target.classList.add('active');
            
            // Apply filter
            this.currentFilter = e.target.dataset.filter;
            this.applyFilters();
          });
        });
        
        // Search input
        const searchInput = document.getElementById('notification-search-input');
        if (searchInput) {
          searchInput.addEventListener('input', (e) => {
            this.filterBySearch(e.target.value);
          });
        }
        
        // Settings button
        document.getElementById('enhanced-open-settings')?.addEventListener('click', () => {
          // You can implement settings panel here
          this.notify({
            type: 'system',
            title: 'Settings',
            body: 'Notification settings panel coming soon!'
          });
        });
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && this.isPanelVisible) {
            this.hidePanel();
          }
        });
        
        // Close when clicking outside
        document.addEventListener('click', (e) => {
          const panel = document.getElementById('enhanced-notification-panel');
          const bell = document.getElementById('notification-bell');
          
          if (panel && this.isPanelVisible && 
              !panel.contains(e.target) && 
              bell && !bell.contains(e.target)) {
            this.hidePanel();
          }
        });
      }
      
      // Toggle notification panel visibility with smooth animation
      togglePanel() {
        if (this.isAnimating) return;
        
        const panel = document.getElementById('enhanced-notification-panel');
        if (!panel) return;
        
        this.isAnimating = true;
        
        if (this.isPanelVisible) {
          this.hidePanel();
        } else {
          this.showPanel();
        }
      }
      
      // Show notification panel with animation
      showPanel() {
        const panel = document.getElementById('enhanced-notification-panel');
        if (!panel) return;
        
        panel.classList.add('visible');
        this.isPanelVisible = true;
        
        // Focus search input
        setTimeout(() => {
          const searchInput = document.getElementById('notification-search-input');
          if (searchInput) {
            searchInput.focus();
          }
          this.isAnimating = false;
        }, 300);
        
        // Mark notifications as read when panel is opened
        this.markAllAsRead();
        
        // Publish event that panel was opened
        window.dispatchEvent(new CustomEvent('dashboard:notificationPanelOpened'));
      }
      
      // Hide notification panel with animation
      hidePanel() {
        const panel = document.getElementById('enhanced-notification-panel');
        if (!panel) return;
        
        panel.classList.remove('visible');
        this.isPanelVisible = false;
        
        setTimeout(() => {
          this.isAnimating = false;
        }, 300);
        
        // Publish event that panel was closed
        window.dispatchEvent(new CustomEvent('dashboard:notificationPanelClosed'));
      }
      
      // Mark all notifications as read
      markAllAsRead() {
        this.notificationsList.forEach(notification => {
          notification.read = true;
        });
        
        this.unreadCount = 0;
        
        // Update UI
        this.updateNotificationBadge(0);
        this.updateNotificationsList();
        
        // Publish event
        window.dispatchEvent(new CustomEvent('dashboard:notificationsRead'));
      }
      
      // Clear all notifications
      clearAllNotifications() {
        this.notificationsList = [];
        this.unreadCount = 0;
        
        // Update UI
        this.updateNotificationBadge(0);
        this.updateEmptyState();
        
        // Publish event
        window.dispatchEvent(new CustomEvent('dashboard:notificationsCleared'));
      }
      
      // Update empty state display
      updateEmptyState() {
        const list = document.getElementById('enhanced-notifications-list');
        if (!list) return;
        
        if (this.notificationsList.length === 0) {
          list.innerHTML = `
            <div class="notification-empty">
              <i class="fas fa-bell"></i>
              <p>No notifications</p>
            </div>
          `;
        } else {
          // Check if there are any visible notifications after filtering
          const visibleCount = list.querySelectorAll('.notification-item:not(.hidden)').length;
          
          if (visibleCount === 0) {
            list.innerHTML = `
              <div class="notification-empty">
                <i class="fas fa-filter"></i>
                <p>No matching notifications</p>
              </div>
            `;
          }
        }
      }
      
      // Filter notifications based on current filter
      applyFilters() {
        const searchText = document.getElementById('notification-search-input')?.value || '';
        
        // First update the list
        this.updateNotificationsList();
        
        // If there's search text, also apply search filter
        if (searchText) {
          this.filterBySearch(searchText);
        }
      }
      
      // Filter notifications by search text
      filterBySearch(searchText) {
        if (!searchText) {
          // Clear search filter but maintain category filter
          this.applyFilters();
          return;
        }
        
        const list = document.getElementById('enhanced-notifications-list');
        if (!list) return;
        
        const items = list.querySelectorAll('.notification-item');
        let visibleCount = 0;
        
        items.forEach(item => {
          const title = item.querySelector('h4')?.textContent || '';
          const body = item.querySelector('p')?.textContent || '';
          const userId = item.querySelector('.user-id')?.textContent || '';
          
          const matches = title.toLowerCase().includes(searchText.toLowerCase()) || 
                         body.toLowerCase().includes(searchText.toLowerCase()) ||
                         userId.toLowerCase().includes(searchText.toLowerCase());
          
          if (matches) {
            item.classList.remove('hidden');
            visibleCount++;
          } else {
            item.classList.add('hidden');
          }
        });
        
        // Show empty state if no results
        if (visibleCount === 0) {
          list.innerHTML = `
            <div class="notification-empty">
              <i class="fas fa-search"></i>
              <p>No notifications matching "${searchText}"</p>
            </div>
          `;
        }
      }
      
      // Update notification badge count
      updateNotificationBadge(count) {
        const badge = document.getElementById('notification-badge');
        const bell = document.getElementById('notification-bell');
        
        if (count > 0) {
          if (badge) {
            const countSpan = badge.querySelector('span');
            if (countSpan) {
              countSpan.textContent = count;
            }
            badge.classList.remove('hidden');
          }
          
          if (bell) {
            bell.classList.add('has-unread');
          }
        } else {
          if (badge) {
            badge.classList.add('hidden');
          }
          
          if (bell) {
            bell.classList.remove('has-unread');
          }
        }
      }
      
      // Toggle notification sound
      toggleSound() {
        this.soundsEnabled = !this.soundsEnabled;
        
        // Update button icon
        const soundToggle = document.getElementById('enhanced-notifications-sound-toggle');
        if (soundToggle) {
          soundToggle.innerHTML = this.soundsEnabled ? 
            '<i class="fas fa-volume-up"></i>' : 
            '<i class="fas fa-volume-mute"></i>';
        }
        
        // Also update the original sound toggle if it exists
        const originalSoundToggle = document.getElementById('notifications-sound-toggle');
        if (originalSoundToggle) {
          originalSoundToggle.innerHTML = this.soundsEnabled ? 
            '<i class="fas fa-volume-up"></i>' : 
            '<i class="fas fa-volume-mute"></i>';
        }
        
        // Save setting to localStorage
        localStorage.setItem('notificationSoundsEnabled', this.soundsEnabled);
        
        // Publish event
        window.dispatchEvent(new CustomEvent('dashboard:notificationSoundChanged', {
          detail: { enabled: this.soundsEnabled }
        }));
      }
      
      // Update the notifications list in the UI
      updateNotificationsList() {
        const list = document.getElementById('enhanced-notifications-list');
        if (!list) return;
        
        if (this.notificationsList.length === 0) {
          this.updateEmptyState();
          return;
        }
        
        // Filter notifications based on current filter
        let filteredNotifications = [...this.notificationsList];
        
        if (this.currentFilter === 'unread') {
          filteredNotifications = filteredNotifications.filter(notification => !notification.read);
        } else if (this.currentFilter !== 'all') {
          filteredNotifications = filteredNotifications.filter(notification => notification.type === this.currentFilter);
        }
        
        if (filteredNotifications.length === 0) {
          list.innerHTML = `
            <div class="notification-empty">
              <i class="fas fa-filter"></i>
              <p>No ${this.currentFilter === 'unread' ? 'unread' : this.currentFilter} notifications</p>
            </div>
          `;
          return;
        }
        
        list.innerHTML = '';
        
        // Add each notification to the list
        filteredNotifications.forEach((notification, index) => {
          const item = document.createElement('div');
          item.className = `notification-item ${notification.read ? '' : 'unread'}`;
          item.setAttribute('data-id', notification.id);
          item.style.animationDelay = `${index * 0.05}s`;
          
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
                ${notification.userId ? `<span class="text-xs bg-gray-700 text-gray-300 rounded px-2 py-0.5 mt-1 inline-block user-id">User: ${notification.userId}</span>` : ''}
              </div>
            </div>
          `;
          
          // Add click handler
          item.addEventListener('click', () => {
            this.handleNotificationClick(notification);
          });
          
          list.appendChild(item);
        });
      }
      
      // Handle notification click
      handleNotificationClick(notification) {
        // Mark as read
        this.markNotificationAsRead(notification.id);
        
        // If it has a user ID, show the conversation
        if (notification.userId && window.ui && typeof window.ui.showConversationDetail === 'function') {
          window.ui.showConversationDetail(notification.userId);
          
          // Hide notification panel
          this.hidePanel();
          
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
      
      // Mark a notification as read
      markNotificationAsRead(id) {
        const notification = this.notificationsList.find(n => n.id === id);
        if (notification && !notification.read) {
          notification.read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          
          // Update UI
          this.updateNotificationBadge(this.unreadCount);
          
          // Update item in list if it exists
          const item = document.querySelector(`.notification-item[data-id="${id}"]`);
          if (item) {
            item.classList.remove('unread');
          }
        }
      }
      
      // Add a new notification
      notify(data, playSound = true) {
        // Generate a unique ID if not provided
        if (!data.id) {
          data.id = Date.now() + '-' + Math.random().toString(36).substring(2, 10);
        }
        
        // Make sure timestamp exists
        if (!data.timestamp) {
          data.timestamp = Date.now();
        }
        
        // Play notification sound if enabled
        if (this.soundsEnabled && playSound) {
          this.playNotificationSound(data.type);
        }
        
        // Add to notification list (most recent first)
        this.notificationsList.unshift({
          ...data,
          read: false
        });
        
        // Update unread counter
        this.unreadCount++;
        
        // Update UI
        this.updateNotificationBadge(this.unreadCount);
        
        // Update list if panel is visible
        if (this.isPanelVisible) {
          this.updateNotificationsList();
        }
        
        // Show browser notification if permission granted
        if (this.notificationPermission === 'granted' && !this.isPanelVisible) {
          this.showBrowserNotification(data);
        }
        
        return data.id;
      }
      
      // Play notification sound based on type
      playNotificationSound(type) {
        if (!this.soundsEnabled) return;
        
        const sound = this.notificationSounds[type] || this.notificationSounds.default;
        if (sound) {
          try {
            sound.currentTime = 0;
            sound.play();
          } catch (err) {
            console.log('Error playing notification sound:', err);
          }
        }
      }
      
      // Show browser notification
      showBrowserNotification(data) {
        try {
          // Use service worker if available
          if (this.serviceWorkerRegistration) {
            this.serviceWorkerRegistration.showNotification(
              data.title || 'Notification', 
              {
                body: data.body || '',
                icon: './logo.jpg',
                badge: './icons/icon-72x72.png',
                tag: data.id,
                renotify: true,
                data: data,
                requireInteraction: data.type === 'help_needed',
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
          
          // Fallback to basic notification
          const notification = new Notification(data.title || 'Notification', {
            body: data.body || '',
            icon: './logo.jpg'
          });
          
          notification.onclick = () => {
            window.focus();
            this.handleNotificationClick(data);
          };
        } catch (error) {
          console.error('Failed to show browser notification:', error);
        }
      }
      
      // Enable smooth scrolling for notification content
      enableSmoothScrolling() {
        // Add the CSS property to ensure smooth scrolling
        const notificationContent = document.getElementById('enhanced-notifications-list');
        if (notificationContent) {
          notificationContent.style.scrollBehavior = 'smooth';
        }
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
      
      // Initialize sounds
      initializeSounds() {
        // Similar to the original implementation...
      }
      
      // Setup basic event listeners
      setupEventListeners() {
        // Notification bell click - connect to original notification bell
        const originalBell = document.getElementById('notification-bell');
        if (originalBell) {
          originalBell.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.togglePanel();
          });
        }
        
        // Listen for dashboard events
        window.addEventListener('dashboard:connected', this.handleDashboardConnected.bind(this));
        window.addEventListener('dashboard:notificationCreated', this.handleNotificationCreated.bind(this));
        
        // Listen for service worker messages if available
        if (this.hasServiceWorker) {
          navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
        }
      }
      
      // Handler for dashboard connected event
      handleDashboardConnected(event) {
        console.log('Dashboard connected event received by enhanced notification system');
        
        // Rest of implementation similar to original...
      }
      
      // Handler for notification created event
      handleNotificationCreated(event) {
        // Rest of implementation similar to original...
      }
      
      // Handler for service worker messages
      handleServiceWorkerMessage(event) {
        // Rest of implementation similar to original...
      }
      
      // Service worker setup (similar to original)
      async setupServiceWorker() {
        // Rest of implementation similar to original...
      }
      
      // Setup notification check interval (similar to original)
      setupNotificationCheckInterval() {
        // Rest of implementation similar to original...
      }
    }
    
    // Install the enhanced notification system
    document.addEventListener('DOMContentLoaded', () => {
      // Create and initialize only if dashboard and original notification system exist
      if (window.dashboardState && (window.notificationSystem || document.getElementById('notification-bell'))) {
        // Create enhanced notification system
        window.enhancedNotificationSystem = new EnhancedNotificationSystem();
        
        // Initialize enhanced notification system
        window.enhancedNotificationSystem.initialize();
        
        // Override the original notification system's methods
        if (window.notificationSystem) {
          // Save reference to original methods
          const originalNotify = window.notificationSystem.notify;
          
          // Override the notify method to use both systems
          window.notificationSystem.notify = function(data, playSound = true) {
            // Call original method
            const id = originalNotify.call(window.notificationSystem, data, playSound);
            
            // Also call enhanced version
            if (window.enhancedNotificationSystem) {
              window.enhancedNotificationSystem.notify(data, false); // Don't play sound twice
            }
            
            return id;
          };
        }
        
        window.logToConsole('Enhanced notification system module installed and initialized');
      } else {
        window.logToConsole('Enhanced notification system installation deferred - waiting for dashboard initialization');
        
        // Check periodically if dashboard is ready
        const checkInterval = setInterval(() => {
          if (window.dashboardState && (window.notificationSystem || document.getElementById('notification-bell'))) {
            clearInterval(checkInterval);
            
            // Create and initialize enhanced notification system
            window.enhancedNotificationSystem = new EnhancedNotificationSystem();
            window.enhancedNotificationSystem.initialize();
            
            window.logToConsole('Enhanced notification system installed after dashboard initialization');
          }
        }, 1000);
      }
    });
  })();