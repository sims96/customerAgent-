// ui.js - UI management module for dashboard
(function() {
    'use strict';
    
    // UI Module namespace
    window.ui = {
      // References to DOM elements used by the UI module
      elements: {},
      
      // Initialize UI components
      initialize() {
        window.logToConsole('Initializing UI module');
        
        // Cache DOM elements for better performance
        this.cacheElements();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize UI state
        this.updateConnectionStatus(false);
      },
      
      // Cache references to frequently accessed DOM elements
      cacheElements() {
        this.elements = {
          apiUrl: document.getElementById('api-url'),
          apiKey: document.getElementById('api-key'),
          connectBtn: document.getElementById('connect-btn'),
          testConnectionBtn: document.getElementById('test-connection-btn'),
          createTestDataBtn: document.getElementById('create-test-data-btn'),
          testNotificationBtn: document.getElementById('test-notification-btn'),
          connectionStatus: document.getElementById('connection-status'),
          connectionStatusDesktop: document.getElementById('connection-status-desktop'),
          statusIndicator: document.getElementById('status-indicator'),
          conversationList: document.getElementById('conversation-list'),
          totalConversations: document.getElementById('total-conversations'),
          humanHandled: document.getElementById('human-handled'),
          aiHandled: document.getElementById('ai-handled'),
          conversationDetail: document.getElementById('conversation-detail'),
          userId: document.getElementById('user-id'),
          conversationMessages: document.getElementById('conversation-messages'),
          takeOverBtn: document.getElementById('take-over-btn'),
          handBackBtn: document.getElementById('hand-back-btn'),
          refreshConversationBtn: document.getElementById('refresh-conversation-btn'),
          resetConversationBtn: document.getElementById('reset-conversation-btn'),
          sendMessageForm: document.getElementById('send-message-form'),
          messageInput: document.getElementById('message'),
          clearConsoleBtn: document.getElementById('clear-console-btn'),
          toggleConsoleBtn: document.getElementById('toggle-console-btn'),
          debugContainer: document.getElementById('debug-container'),
          debugHeader: document.getElementById('debug-header'),
          refreshListBtn: document.getElementById('refresh-list-btn'),
          notificationBell: document.getElementById('notification-bell'),
          notificationBadge: document.getElementById('notification-badge'),
          notificationPanel: document.getElementById('notification-panel'),
          notificationsList: document.getElementById('notifications-list'),
          notificationsSoundToggle: document.getElementById('notifications-sound-toggle'),
          notificationsClear: document.getElementById('notifications-clear'),
          notificationsClose: document.getElementById('notifications-close')
        };
      },
      
      // Set up UI event listeners
      setupEventListeners() {
        // Connect/disconnect button
        if (this.elements.connectBtn) {
          this.elements.connectBtn.addEventListener('click', this.handleConnectClick.bind(this));
        }
        
        // Test connection button
        if (this.elements.testConnectionBtn) {
          this.elements.testConnectionBtn.addEventListener('click', this.handleTestConnectionClick.bind(this));
        }
        
        // Create test data button
        if (this.elements.createTestDataBtn) {
          this.elements.createTestDataBtn.addEventListener('click', this.handleCreateTestDataClick.bind(this));
        }
        
        // Test notification button
        if (this.elements.testNotificationBtn) {
          this.elements.testNotificationBtn.addEventListener('click', this.handleTestNotificationClick.bind(this));
        }
        
        // Refresh list button
        if (this.elements.refreshListBtn) {
          this.elements.refreshListBtn.addEventListener('click', this.handleRefreshListClick.bind(this));
        }
        
        // Take over button
        if (this.elements.takeOverBtn) {
          this.elements.takeOverBtn.addEventListener('click', this.handleTakeOverClick.bind(this));
        }
        
        // Hand back button
        if (this.elements.handBackBtn) {
          this.elements.handBackBtn.addEventListener('click', this.handleHandBackClick.bind(this));
        }
        
        // Refresh conversation button
        if (this.elements.refreshConversationBtn) {
          this.elements.refreshConversationBtn.addEventListener('click', this.handleRefreshConversationClick.bind(this));
        }
        
        // Reset conversation button
        if (this.elements.resetConversationBtn) {
          this.elements.resetConversationBtn.addEventListener('click', this.handleResetConversationClick.bind(this));
        }
        
        // Send message form
        if (this.elements.sendMessageForm) {
          this.elements.sendMessageForm.addEventListener('submit', this.handleSendMessageSubmit.bind(this));
        }
        
        // Clear console button
        if (this.elements.clearConsoleBtn) {
          this.elements.clearConsoleBtn.addEventListener('click', this.handleClearConsoleClick.bind(this));
        }
        
        // Toggle console visibility
        if (this.elements.toggleConsoleBtn) {
          this.elements.toggleConsoleBtn.addEventListener('click', this.handleToggleConsoleClick.bind(this));
        }
        
        // Debug header click
        if (this.elements.debugHeader) {
          this.elements.debugHeader.addEventListener('click', this.handleDebugHeaderClick.bind(this));
        }
        
        // Auto resize textarea as user types
        if (this.elements.messageInput) {
          this.elements.messageInput.addEventListener('input', this.handleMessageInputChange.bind(this));
        }
        
        // Notification bell click
        if (this.elements.notificationBell) {
          this.elements.notificationBell.addEventListener('click', this.handleNotificationBellClick.bind(this));
        }
        
        // Notification close button
        if (this.elements.notificationsClose) {
          this.elements.notificationsClose.addEventListener('click', this.handleNotificationsCloseClick.bind(this));
        }
        
        // Notification clear button
        if (this.elements.notificationsClear) {
          this.elements.notificationsClear.addEventListener('click', this.handleNotificationsClearClick.bind(this));
        }
        
        // Notification sound toggle
        if (this.elements.notificationsSoundToggle) {
          this.elements.notificationsSoundToggle.addEventListener('click', this.handleNotificationsSoundToggleClick.bind(this));
        }
      },
      
      // Handler for connect/disconnect button click
      async handleConnectClick() {
        window.logToConsole(`Connect button clicked. Current state: ${window.dashboardState.connected ? 'connected' : 'disconnected'}`);
        
        if (window.dashboardState.connected) {
          // Disconnect
          this.disconnect();
        } else {
          // Connect
          await this.connect();
        }
      },
      
      // Disconnect from the API
      disconnect() {
        if (window.dashboardState.refreshInterval) {
          clearInterval(window.dashboardState.refreshInterval);
          window.dashboardState.refreshInterval = null;
        }
        
        window.dashboardState.connected = false;
        this.updateConnectionStatus(false);
        this.clearConversationList();
        this.hideConversationDetail();
      },
      
      // Connect to the API
      async connect() {
        window.dashboardState.apiUrl = this.elements.apiUrl.value.trim();
        window.dashboardState.apiKey = this.elements.apiKey.value.trim();
        
        if (!window.dashboardState.apiUrl || !window.dashboardState.apiKey) {
          this.updateConnectionStatus(false, 'API URL and Key are required');
          return;
        }
        
        // Test connection
        this.updateConnectionStatus(false, 'Connecting...');
        this.elements.connectBtn.innerHTML = '<div class="loader mr-2"></div> Connecting...';
        this.elements.connectBtn.disabled = true;
        
        try {
          const connected = await window.api.testConnection();
          
          this.elements.connectBtn.disabled = false;
          
          if (connected) {
            window.dashboardState.connected = true;
            this.updateConnectionStatus(true);
            
            // Save credentials to localStorage
            localStorage.setItem('dashboardApiUrl', window.dashboardState.apiUrl);
            localStorage.setItem('dashboardApiKey', window.dashboardState.apiKey);
            
            // Refresh data immediately
            await this.refreshConversationList();
            
            // Set up auto-refresh every 10 seconds
            window.dashboardState.refreshInterval = setInterval(() => {
              this.refreshConversationList();
            }, 10000);
            
            // Publish connect event for other modules
            window.dispatchEvent(new CustomEvent('dashboard:connected', {
              detail: {
                apiUrl: window.dashboardState.apiUrl,
                apiKey: window.dashboardState.apiKey
              }
            }));
          } else {
            this.updateConnectionStatus(false, 'Connection failed');
          }
        } catch (error) {
          this.elements.connectBtn.disabled = false;
          this.updateConnectionStatus(false, `Connection error: ${error.message}`);
        }
      },
      
      // Update the connection status in the UI
      updateConnectionStatus(connected, message = '') {
        window.logToConsole(`Updating connection status: connected=${connected}, message=${message || 'N/A'}`);
        
        if (this.elements.connectionStatus) {
          this.elements.connectionStatus.textContent = message || (connected ? 'Connected' : 'Not connected');
        }
        
        if (this.elements.connectionStatusDesktop) {
          this.elements.connectionStatusDesktop.textContent = message || (connected ? 'Connected' : 'Not connected');
        }
        
        if (connected) {
          if (this.elements.statusIndicator) {
            this.elements.statusIndicator.innerHTML = '<span class="h-2 w-2 mr-2 rounded-full bg-green-500 status-pulse"></span> Connected';
            this.elements.statusIndicator.classList.remove('bg-red-900');
            this.elements.statusIndicator.classList.add('bg-green-900');
          }
          
          if (this.elements.connectBtn) {
            this.elements.connectBtn.innerHTML = '<i class="fas fa-plug-circle-xmark mr-2"></i> Disconnect';
          }
        } else {
          if (this.elements.statusIndicator) {
            this.elements.statusIndicator.innerHTML = '<span class="h-2 w-2 mr-2 rounded-full bg-red-500 status-pulse"></span> Disconnected';
            this.elements.statusIndicator.classList.remove('bg-green-900');
            this.elements.statusIndicator.classList.add('bg-red-900');
          }
          
          if (this.elements.connectBtn) {
            this.elements.connectBtn.innerHTML = '<i class="fas fa-plug mr-2"></i> Connect';
          }
        }
        
        // Dispatch status update event for other modules to react
        window.dispatchEvent(new CustomEvent('dashboard:connectionChanged', {
          detail: {
            connected,
            message
          }
        }));
      },
      
      // Handler for test connection button click
      async handleTestConnectionClick() {
        const tempApiUrl = this.elements.apiUrl.value.trim();
        const tempApiKey = this.elements.apiKey.value.trim();
        
        if (!tempApiUrl || !tempApiKey) {
          window.logToConsole('API URL and Key are required for testing', true);
          return;
        }
        
        const originalState = {
          apiUrl: window.dashboardState.apiUrl,
          apiKey: window.dashboardState.apiKey
        };
        
        // Temporarily set the api credentials for testing
        window.dashboardState.apiUrl = tempApiUrl;
        window.dashboardState.apiKey = tempApiKey;
        
        window.logToConsole(`Testing connection to ${tempApiUrl}...`);
        this.elements.testConnectionBtn.innerHTML = '<div class="loader mr-1"></div> Testing';
        this.elements.testConnectionBtn.disabled = true;
        
        try {
          await window.api.testConnection();
          this.elements.testConnectionBtn.innerHTML = '<i class="fas fa-vial mr-1"></i> Test';
          this.elements.testConnectionBtn.disabled = false;
          window.logToConsole('Connection test completed');
        } catch (error) {
          this.elements.testConnectionBtn.innerHTML = '<i class="fas fa-vial mr-1"></i> Test';
          this.elements.testConnectionBtn.disabled = false;
        }
        
        // Restore original state if not connected
        if (!window.dashboardState.connected) {
          window.dashboardState.apiUrl = originalState.apiUrl;
          window.dashboardState.apiKey = originalState.apiKey;
        }
      },
      
      // Handler for create test data button click
      async handleCreateTestDataClick() {
        if (!window.dashboardState.connected) {
          window.logToConsole('Must be connected to create test data', true);
          return;
        }
        
        this.elements.createTestDataBtn.innerHTML = '<div class="loader mr-1"></div> Creating';
        this.elements.createTestDataBtn.disabled = true;
        
        try {
          const result = await window.api.createTestData();
          window.logToConsole(`Test data created successfully: ${JSON.stringify(result)}`);
          await this.refreshConversationList();
          this.elements.createTestDataBtn.innerHTML = '<i class="fas fa-flask mr-1"></i> Test Data';
          this.elements.createTestDataBtn.disabled = false;
        } catch (error) {
          window.logToConsole(`Failed to create test data: ${error.message}`, true);
          this.elements.createTestDataBtn.innerHTML = '<i class="fas fa-flask mr-1"></i> Test Data';
          this.elements.createTestDataBtn.disabled = false;
        }
      },
      
      // Handler for test notification button click
      async handleTestNotificationClick() {
        if (!window.dashboardState.connected) {
          window.logToConsole('Must be connected to create test notification', true);
          return;
        }
        
        this.elements.testNotificationBtn.innerHTML = '<div class="loader mr-1"></div> Creating';
        this.elements.testNotificationBtn.disabled = true;
        
        try {
          const result = await window.api.createTestNotification('help_needed');
          window.logToConsole(`Test notification created: ${JSON.stringify(result)}`);
          
          // Dispatch an event to notify the notification system
          window.dispatchEvent(new CustomEvent('dashboard:notificationCreated', {
            detail: result
          }));
          
          this.elements.testNotificationBtn.innerHTML = '<i class="fas fa-bell mr-1"></i> Test Notification';
          this.elements.testNotificationBtn.disabled = false;
        } catch (error) {
          window.logToConsole(`Failed to create test notification: ${error.message}`, true);
          this.elements.testNotificationBtn.innerHTML = '<i class="fas fa-bell mr-1"></i> Test Notification';
          this.elements.testNotificationBtn.disabled = false;
        }
      },
      
      // Handler for refresh list button click
      async handleRefreshListClick() {
        if (!window.dashboardState.connected) return;
        await this.refreshConversationList();
      },
      
      // Refresh the conversation list
      async refreshConversationList() {
        try {
          window.logToConsole('Refreshing conversation list...');
          if (!window.dashboardState.connected) {
            window.logToConsole('Not refreshing conversations because not connected', true);
            return;
          }
          
          // Show loading indicator
          if (this.elements.refreshListBtn) {
            this.elements.refreshListBtn.innerHTML = '<div class="loader"></div>';
          }
          
          const data = await window.api.getConversations();
          window.logToConsole(`Received ${data.conversations ? data.conversations.length : 0} conversations`);
          window.dashboardState.conversations = data.conversations || [];
          
          // Update stats with animation
          this.animateCounter(
            this.elements.totalConversations, 
            parseInt(this.elements.totalConversations.textContent), 
            window.dashboardState.conversations.length
          );
          
          this.animateCounter(
            this.elements.humanHandled, 
            parseInt(this.elements.humanHandled.textContent), 
            window.dashboardState.conversations.filter(c => c.status === 'human-handled').length
          );
          
          this.animateCounter(
            this.elements.aiHandled, 
            parseInt(this.elements.aiHandled.textContent), 
            window.dashboardState.conversations.filter(c => c.status === 'ai-handled').length
          );
          
          // Clear and rebuild the list
          if (this.elements.conversationList) {
            this.elements.conversationList.innerHTML = '';
            
            if (window.dashboardState.conversations.length === 0) {
              this.elements.conversationList.innerHTML = `
                <div class="text-gray-500 text-center p-8">
                  <i class="fas fa-comments mb-2 text-2xl opacity-30"></i>
                  <p>No active conversations</p>
                </div>
              `;
              return;
            }
            
            // Add each conversation to the list
            window.dashboardState.conversations.forEach(conversation => {
              const listItem = document.createElement('div');
              listItem.className = 'conversation-item p-4 cursor-pointer';
              
              if (window.dashboardState.selectedUserId === conversation.userId) {
                listItem.classList.add('active');
              }
              
              // Format timestamp
              const timestamp = new Date(conversation.lastTimestamp || Date.now()).toLocaleString();
              
              // Status badge
              let statusBadgeClass, statusText;
              if (conversation.status === 'human-handled') {
                statusBadgeClass = 'human';
                statusText = 'human-handled';
              } else {
                statusBadgeClass = 'ai';
                statusText = 'ai-handled';
              }
              
              listItem.innerHTML = `
                <div class="flex flex-col space-y-2">
                  <div class="flex justify-between items-center">
                    <div class="font-medium text-purple-300">${conversation.userId}</div>
                    <span class="status-badge ${statusBadgeClass}">${statusText}</span>
                  </div>
                  <div class="text-sm text-gray-400 truncate">
                    ${conversation.lastRole === 'user' ? '👤 ' : '🤖 '}
                    ${conversation.lastMessage || '(No messages)'}
                  </div>
                  <div class="flex justify-between items-center text-xs text-gray-500">
                    <span>${conversation.messageCount || 0} messages</span>
                    <span>${this.formatRelativeTime(conversation.lastTimestamp)}</span>
                  </div>
                </div>
              `;
              
              // Add click handler to show conversation detail
              listItem.addEventListener('click', () => {
                this.showConversationDetail(conversation.userId);
                
                // Highlight selected conversation
                document.querySelectorAll('.conversation-item').forEach(item => {
                  item.classList.remove('active');
                });
                listItem.classList.add('active');
              });
              
              this.elements.conversationList.appendChild(listItem);
            });
          }
          
          // If we have a selected conversation, refresh it
          if (window.dashboardState.selectedUserId) {
            this.refreshConversationDetail();
          }
          
          // Restore the refresh button
          if (this.elements.refreshListBtn) {
            this.elements.refreshListBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
          }
          
          // Publish list updated event
          window.dispatchEvent(new CustomEvent('dashboard:conversationsUpdated', {
            detail: {
              conversations: window.dashboardState.conversations
            }
          }));
        } catch (error) {
          window.logToConsole(`Failed to refresh conversations: ${error.message}`, true);
          if (this.elements.refreshListBtn) {
            this.elements.refreshListBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
          }
        }
      },
      
      // Clear the conversation list
      clearConversationList() {
        if (this.elements.conversationList) {
          this.elements.conversationList.innerHTML = `
            <div class="text-gray-500 text-center p-8">
              <i class="fas fa-plug mb-2 text-2xl opacity-30"></i>
              <p>Connect to view conversations...</p>
            </div>
          `;
        }
        
        if (this.elements.totalConversations) {
          this.elements.totalConversations.textContent = '0';
        }
        
        if (this.elements.humanHandled) {
          this.elements.humanHandled.textContent = '0';
        }
        
        if (this.elements.aiHandled) {
          this.elements.aiHandled.textContent = '0';
        }
      },
      
      // Handler for take over button click
      async handleTakeOverClick() {
        if (!window.dashboardState.selectedUserId || !window.dashboardState.connected) return;
        
        window.logToConsole(`Taking over conversation: ${window.dashboardState.selectedUserId}`);
        this.elements.takeOverBtn.disabled = true;
        this.elements.takeOverBtn.innerHTML = '<div class="loader mr-1"></div> Taking over';
        
        try {
          // Make sure the API request is processed properly
          const result = await window.api.updateStatus(window.dashboardState.selectedUserId, 'human-handled');
          window.logToConsole(`Take over result: ${JSON.stringify(result)}`);
          
          // Wait a moment to ensure the status change is processed
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Refresh UI elements
          await this.refreshConversationDetail();
          await this.refreshConversationList();
          
          this.elements.takeOverBtn.disabled = false;
          this.elements.takeOverBtn.innerHTML = '<i class="fas fa-headset mr-1"></i> Take Over';
          
          // Force UI update to show the correct buttons
          if (result.status === 'human-handled' && result.handledBy === window.dashboardState.agentId) {
            this.elements.takeOverBtn.classList.add('hidden');
            this.elements.handBackBtn.classList.remove('hidden');
            this.elements.messageInput.disabled = false;
            this.elements.messageInput.placeholder = 'Type a message...';
            this.elements.sendMessageForm.querySelector('button[type="submit"]').disabled = false;
          }
        } catch (error) {
          window.logToConsole(`Failed to take over conversation: ${error.message}`, true);
          this.elements.takeOverBtn.disabled = false;
          this.elements.takeOverBtn.innerHTML = '<i class="fas fa-headset mr-1"></i> Take Over';
        }
      },
      
      // Handler for hand back button click
      async handleHandBackClick() {
        if (!window.dashboardState.selectedUserId || !window.dashboardState.connected) return;
        
        window.logToConsole(`Handing back conversation to AI: ${window.dashboardState.selectedUserId}`);
        this.elements.handBackBtn.disabled = true;
        this.elements.handBackBtn.innerHTML = '<div class="loader mr-1"></div> Handing back';
        
        try {
          // Make sure the API request is processed properly
          const result = await window.api.updateStatus(window.dashboardState.selectedUserId, 'ai-handled');
          window.logToConsole(`Hand back result: ${JSON.stringify(result)}`);
          
          // Wait a moment to ensure the status change is processed
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Refresh UI elements
          await this.refreshConversationDetail();
          await this.refreshConversationList();
          
          this.elements.handBackBtn.disabled = false;
          this.elements.handBackBtn.innerHTML = '<i class="fas fa-robot mr-1"></i> Hand Back';
          
          // Force UI update to show the correct buttons
          if (result.status === 'ai-handled') {
            this.elements.takeOverBtn.classList.remove('hidden');
            this.elements.handBackBtn.classList.add('hidden');
            this.elements.messageInput.disabled = true;
            this.elements.messageInput.placeholder = 'Take over to send messages';
            this.elements.sendMessageForm.querySelector('button[type="submit"]').disabled = true;
          }
        } catch (error) {
          window.logToConsole(`Failed to hand back conversation: ${error.message}`, true);
          this.elements.handBackBtn.disabled = false;
          this.elements.handBackBtn.innerHTML = '<i class="fas fa-robot mr-1"></i> Hand Back';
        }
      },
      
      // Handler for refresh conversation button click
      async handleRefreshConversationClick() {
        if (!window.dashboardState.selectedUserId) return;
        
        window.logToConsole(`Manually refreshing conversation: ${window.dashboardState.selectedUserId}`);
        this.elements.refreshConversationBtn.disabled = true;
        
        try {
          await this.refreshConversationDetail();
          this.elements.refreshConversationBtn.disabled = false;
        } catch (error) {
          window.logToConsole(`Failed to refresh conversation: ${error.message}`, true);
          this.elements.refreshConversationBtn.disabled = false;
        }
      },
      
      // Handler for reset conversation button click
      async handleResetConversationClick() {
        if (!window.dashboardState.selectedUserId) return;
        
        window.logToConsole(`Resetting conversation controls: ${window.dashboardState.selectedUserId}`);
        this.elements.resetConversationBtn.disabled = true;
        this.elements.resetConversationBtn.innerHTML = '<div class="loader mr-1"></div> Resetting';
        
        try {
          // Force reset the conversation handling status
          await window.api.request(
            `/api/conversation/status?userId=${encodeURIComponent(window.dashboardState.selectedUserId)}`,
            'PUT',
            {
              agentId: window.dashboardState.agentId,
              status: 'human-handled'
            }
          );
          
          // Manually unlock the UI
          this.elements.takeOverBtn.classList.add('hidden');
          this.elements.handBackBtn.classList.remove('hidden');
          this.elements.messageInput.disabled = false;
          this.elements.messageInput.placeholder = 'Type a message...';
          const sendButton = this.elements.sendMessageForm.querySelector('button[type="submit"]');
          if (sendButton) {
            sendButton.disabled = false;
          }
          
          // Update UI
          await this.refreshConversationDetail();
          await this.refreshConversationList();
          
          window.logToConsole('Conversation controls reset successfully');
          this.elements.resetConversationBtn.disabled = false;
          this.elements.resetConversationBtn.innerHTML = '<i class="fas fa-redo-alt mr-1"></i> Reset';
        } catch (error) {
          window.logToConsole(`Failed to reset conversation: ${error.message}`, true);
          this.elements.resetConversationBtn.disabled = false;
          this.elements.resetConversationBtn.innerHTML = '<i class="fas fa-redo-alt mr-1"></i> Reset';
        }
      },
      
      // Handler for send message form submit
      async handleSendMessageSubmit(event) {
        event.preventDefault();
        
        if (!window.dashboardState.selectedUserId || !window.dashboardState.connected) return;
        
        const message = this.elements.messageInput.value.trim();
        if (!message) return;
        
        window.logToConsole(`Sending message to ${window.dashboardState.selectedUserId}: ${message}`);
        const submitButton = this.elements.sendMessageForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<div class="loader"></div>';
        
        // Show the typing indicator
        const typingIndicator = document.querySelector('.typing-dots');
        if (typingIndicator) {
          typingIndicator.classList.remove('hidden');
        }
        
        try {
          // Use the updated sendMessage function that handles WhatsApp sending
          const result = await window.api.sendMessage(window.dashboardState.selectedUserId, message);
          
          this.elements.messageInput.value = '';
          
          // Add a slight delay before refreshing to allow the backend to process
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Hide typing indicator
          if (typingIndicator) {
            typingIndicator.classList.add('hidden');
          }
          
          await this.refreshConversationDetail();
          submitButton.disabled = false;
          submitButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
          
          // Force auto-refresh of conversation list after sending a message
          await this.refreshConversationList();
        } catch (error) {
          window.logToConsole(`Failed to send message: ${error.message}`, true);
          if (typingIndicator) {
            typingIndicator.classList.add('hidden');
          }
          submitButton.disabled = false;
          submitButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
      },
      
      // Handler for message input changes (auto-resize)
      handleMessageInputChange() {
        this.elements.messageInput.style.height = 'auto';
        const newHeight = Math.min(120, this.elements.messageInput.scrollHeight);
        this.elements.messageInput.style.height = newHeight + 'px';
      },
      
      // Handler for clear console button click
      handleClearConsoleClick() {
        const debugConsole = document.getElementById('debug-console');
        if (debugConsole) {
          debugConsole.innerHTML = '// Console cleared\n';
        }
      },
      
      // Handler for toggle console button click
      handleToggleConsoleClick() {
        const isVisible = this.elements.debugContainer.classList.contains('h-48');
        
        if (isVisible) {
          this.elements.debugContainer.classList.remove('h-48');
          this.elements.debugContainer.classList.add('h-0');
          this.elements.toggleConsoleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
        } else {
          this.elements.debugContainer.classList.remove('h-0');
          this.elements.debugContainer.classList.add('h-48');
          this.elements.toggleConsoleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
        }
      },
      
      // Handler for debug header click
      handleDebugHeaderClick(e) {
        // Don't toggle when clicking the clear button
        if (e.target.closest('#clear-console-btn')) return;
        
        this.handleToggleConsoleClick();
      },
      
      // Handler for notification bell click
      handleNotificationBellClick() {
        this.toggleNotificationPanel();
      },
      
      // Handler for notifications close button click
      handleNotificationsCloseClick() {
        this.hideNotificationPanel();
      },
      
      // Handler for notifications clear button click
      handleNotificationsClearClick() {
        this.clearNotifications();
      },
      
      // Handler for notifications sound toggle button click
      handleNotificationsSoundToggleClick() {
        this.toggleNotificationSound();
      },
      
      // Show conversation detail
      async showConversationDetail(userId) {
        try {
          window.logToConsole(`Loading conversation details for user: ${userId}`);
          window.dashboardState.selectedUserId = userId;
          
          if (this.elements.userId) {
            this.elements.userId.textContent = userId;
          }
          
          if (this.elements.conversationDetail) {
            this.elements.conversationDetail.classList.remove('hidden');
          }
          
          await this.refreshConversationDetail();
        } catch (error) {
          window.logToConsole(`Failed to show conversation: ${error.message}`, true);
        }
      },
      
      // Hide conversation detail
      hideConversationDetail() {
        window.dashboardState.selectedUserId = null;
        
        if (this.elements.conversationDetail) {
          this.elements.conversationDetail.classList.add('hidden');
        }
        
        if (this.elements.conversationMessages) {
          this.elements.conversationMessages.innerHTML = '';
        }
      },
      
      // Refresh conversation detail
      async refreshConversationDetail() {
        if (!window.dashboardState.selectedUserId) return;
        
        try {
          window.logToConsole(`Refreshing conversation detail for user: ${window.dashboardState.selectedUserId}`);
          
          // Show loading indicator
          if (this.elements.refreshConversationBtn) {
            this.elements.refreshConversationBtn.innerHTML = '<div class="loader mr-1"></div> Refreshing';
          }
          
          const data = await window.api.getConversation(window.dashboardState.selectedUserId);
          
          // Log metadata to help with debugging
          window.logToConsole(`Conversation metadata: ${JSON.stringify(data.metadata || {})}`);
          
          // Update UI based on conversation status
          const isHumanHandled = data.metadata && data.metadata.status === 'human-handled';
          const isHandledByThisAgent = isHumanHandled && data.metadata.handledBy === window.dashboardState.agentId;
          
          window.logToConsole(`Conversation status: ${isHumanHandled ? 'human-handled' : 'ai-handled'}, Handler: ${data.metadata?.handledBy || 'none'}, This agent: ${window.dashboardState.agentId}`);
          
          // Display current status in the UI
          const statusDisplay = document.getElementById('conversation-status');
          if (statusDisplay) {
            if (isHandledByThisAgent) {
              statusDisplay.textContent = 'You are handling this';
              statusDisplay.className = 'text-xs px-2 py-0.5 rounded-full bg-green-800 text-white';
            } else if (isHumanHandled) {
              statusDisplay.textContent = `Agent: ${data.metadata.handledBy || 'unknown'}`;
              statusDisplay.className = 'text-xs px-2 py-0.5 rounded-full bg-purple-800 text-white';
            } else {
              statusDisplay.textContent = 'AI is handling';
              statusDisplay.className = 'text-xs px-2 py-0.5 rounded-full bg-blue-800 text-white';
            }
          }
          
          // Update buttons and input field state
          if (isHandledByThisAgent) {
            // This agent is handling the conversation
            window.logToConsole(`This agent is handling the conversation`);
            this.elements.takeOverBtn.classList.add('hidden');
            this.elements.handBackBtn.classList.remove('hidden');
            this.elements.messageInput.disabled = false;
            this.elements.messageInput.placeholder = 'Type a message...';
            this.elements.sendMessageForm.querySelector('button[type="submit"]').disabled = false;
          } else if (isHumanHandled) {
            // Another agent is handling it
            window.logToConsole(`Another agent (${data.metadata.handledBy}) is handling the conversation`);
            this.elements.takeOverBtn.classList.add('hidden');
            this.elements.handBackBtn.classList.add('hidden');
            this.elements.messageInput.disabled = true;
            this.elements.messageInput.placeholder = `Being handled by ${data.metadata.handledBy || 'another agent'}`;
            this.elements.sendMessageForm.querySelector('button[type="submit"]').disabled = true;
          } else {
            // AI is handling it
            window.logToConsole(`AI is handling the conversation`);
            this.elements.takeOverBtn.classList.remove('hidden');
            this.elements.handBackBtn.classList.add('hidden');
            this.elements.messageInput.disabled = true;
            this.elements.messageInput.placeholder = 'Take over to send messages';
            this.elements.sendMessageForm.querySelector('button[type="submit"]').disabled = true;
          }
          
          // Clear and rebuild the message list
          if (this.elements.conversationMessages) {
            this.elements.conversationMessages.innerHTML = '';
            
            // Add each message
            if (data.messages && Array.isArray(data.messages)) {
              data.messages.forEach(message => {
                const messageDiv = document.createElement('div');
                const isUser = message.role === 'user';
                
                messageDiv.className = isUser
                  ? 'flex items-end justify-end'
                  : 'flex items-start';
                  
                const messageBubbleClass = isUser
                  ? 'user-message rounded-l-lg rounded-br-lg ml-12'
                  : 'agent-message rounded-r-lg rounded-bl-lg mr-12';
                  
                const timestamp = message.timestamp 
                  ? new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                  : '';
                
                messageDiv.innerHTML = `
                  <div class="${isUser ? 'order-2' : 'order-1'} flex-shrink-0 h-8 w-8 rounded-full ${isUser ? 'bg-purple-800' : 'bg-gray-700'} flex items-center justify-center mr-2">
                    <i class="fas fa-${isUser ? 'user' : 'robot'} text-xs text-white"></i>
                  </div>
                  <div class="flex flex-col space-y-1 text-sm max-w-xs mx-2 ${isUser ? 'order-1 items-end' : 'order-2 items-start'}">
                    <div>
                      <span class="px-4 py-2 inline-block ${messageBubbleClass}">
                        ${message.content}
                      </span>
                    </div>
                    <div class="text-xs text-gray-500 flex ${isUser ? 'justify-end' : 'justify-start'} w-full px-1">
                      ${timestamp}
                      ${message.sentBy ? `<span class="ml-1 opacity-70">· ${message.sentBy}</span>` : ''}
                    </div>
                  </div>
                `;
                
                this.elements.conversationMessages.appendChild(messageDiv);
              });
            } else {
              window.logToConsole('No messages found or invalid message format', true);
              this.elements.conversationMessages.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                  <i class="far fa-comment-dots text-4xl mb-2 opacity-30"></i>
                  <p>No messages found</p>
                </div>
              `;
            }
            
            // Scroll to bottom
            this.elements.conversationMessages.scrollTop = this.elements.conversationMessages.scrollHeight;
          }
          
          // Restore the refresh button
          if (this.elements.refreshConversationBtn) {
            this.elements.refreshConversationBtn.innerHTML = '<i class="fas fa-sync-alt mr-1"></i> Refresh';
          }
          
        } catch (error) {
          window.logToConsole(`Failed to refresh conversation detail: ${error.message}`, true);
          if (this.elements.refreshConversationBtn) {
            this.elements.refreshConversationBtn.innerHTML = '<i class="fas fa-sync-alt mr-1"></i> Refresh';
          }
        }
      },
      
      // Toggle notification panel visibility
      toggleNotificationPanel() {
        if (this.elements.notificationPanel) {
          if (this.elements.notificationPanel.classList.contains('hidden')) {
            this.showNotificationPanel();
          } else {
            this.hideNotificationPanel();
          }
        }
      },
      
      // Show notification panel
      showNotificationPanel() {
        if (this.elements.notificationPanel) {
          this.elements.notificationPanel.classList.remove('hidden');
          
          // Publish event that panel was opened
          window.dispatchEvent(new CustomEvent('dashboard:notificationPanelOpened'));
        }
      },
      
      // Hide notification panel
      hideNotificationPanel() {
        if (this.elements.notificationPanel) {
          this.elements.notificationPanel.classList.add('hidden');
          
          // Publish event that panel was closed
          window.dispatchEvent(new CustomEvent('dashboard:notificationPanelClosed'));
        }
      },
      
      // Clear all notifications
      clearNotifications() {
        // Reset notification UI
        if (this.elements.notificationsList) {
          this.elements.notificationsList.innerHTML = `
            <div class="text-gray-500 text-center p-6">
              <i class="fas fa-bell mb-2 text-2xl opacity-30"></i>
              <p>No notifications</p>
            </div>
          `;
        }
        
        // Update notification bell and badge
        if (this.elements.notificationBell) {
          this.elements.notificationBell.classList.remove('has-unread');
        }
        
        if (this.elements.notificationBadge) {
          this.elements.notificationBadge.classList.add('hidden');
        }
        
        // Publish event that notifications were cleared
        window.dispatchEvent(new CustomEvent('dashboard:notificationsCleared'));
      },
      
      // Toggle notification sound
      toggleNotificationSound() {
        window.dashboardState.notificationSettings.soundEnabled = !window.dashboardState.notificationSettings.soundEnabled;
        
        // Update sound toggle button
        if (this.elements.notificationsSoundToggle) {
          this.elements.notificationsSoundToggle.innerHTML = window.dashboardState.notificationSettings.soundEnabled ? 
            '<i class="fas fa-volume-up"></i>' : 
            '<i class="fas fa-volume-mute"></i>';
        }
        
        // Save setting to localStorage
        try {
          localStorage.setItem('notificationSoundsEnabled', window.dashboardState.notificationSettings.soundEnabled);
        } catch (e) {
          console.log('Could not store in localStorage');
        }
        
        // Publish event that sound setting was changed
        window.dispatchEvent(new CustomEvent('dashboard:notificationSoundChanged', {
          detail: {
            enabled: window.dashboardState.notificationSettings.soundEnabled
          }
        }));
      },
      
      // Update notification count badge
      updateNotificationBadge(count) {
        if (count > 0) {
          if (this.elements.notificationBadge) {
            const countSpan = this.elements.notificationBadge.querySelector('span');
            if (countSpan) {
              countSpan.textContent = count;
            }
            this.elements.notificationBadge.classList.remove('hidden');
          }
          
          if (this.elements.notificationBell) {
            this.elements.notificationBell.classList.add('has-unread');
          }
        } else {
          if (this.elements.notificationBadge) {
            this.elements.notificationBadge.classList.add('hidden');
          }
          
          if (this.elements.notificationBell) {
            this.elements.notificationBell.classList.remove('has-unread');
          }
        }
      },
      
      // Helper: Animate counter from start to end value
      animateCounter(element, start, end) {
        if (!element || start === end) return;
        
        const duration = 1000; // ms
        const startTime = performance.now();
        
        function updateCounter(timestamp) {
          const elapsed = timestamp - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Easing function (ease-out)
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          
          const current = Math.floor(start + (end - start) * easeProgress);
          element.textContent = current;
          
          if (progress < 1) {
            requestAnimationFrame(updateCounter);
          } else {
            element.textContent = end;
          }
        }
        
        requestAnimationFrame(updateCounter);
      },
      
      // Helper: Format relative time
      formatRelativeTime(timestamp) {
        if (!timestamp) return 'N/A';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffSecs < 60) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
      }
    };
    
    // Initialize the UI when the document is ready
    document.addEventListener('DOMContentLoaded', function() {
      window.ui.initialize();
    });
  })();