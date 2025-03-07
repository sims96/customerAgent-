// mobile-chat.js - Mobile WhatsApp-like chat interface controller

(function() {
    'use strict';
    
    // Check if we are in a mobile environment
    const isMobile = () => window.innerWidth < 768;
    
    // Mobile Chat Controller
    window.mobileChat = {
      // Properties
      initialized: false,
      activeUserId: null,
      
      // Initialize mobile chat interface
      initialize() {
        window.logToConsole('Initializing mobile chat interface');
        
        // Don't re-initialize
        if (this.initialized) return;
        
        // Create and insert mobile view container
        this.createMobileInterface();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Check URL for deep linking
        this.checkDeepLinking();
        
        // Mark as initialized
        this.initialized = true;
        
        window.logToConsole('Mobile chat interface initialized');
      },
      
      // Create mobile interface elements
      createMobileInterface() {
        // Create mobile chat view container if it doesn't exist
        if (!document.getElementById('mobile-chat-view')) {
          const mobileViewHtml = `
            <div id="mobile-chat-view" class="mobile-view">
              <div class="mobile-header brand-gradient">
                <button id="mobile-back-btn" class="mobile-back-btn">
                  <i class="fas fa-arrow-left mr-2"></i> Back
                </button>
                <div class="flex items-center">
                  <div class="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center mr-3">
                    <i class="fas fa-user text-sm"></i>
                  </div>
                  <div>
                    <h3 id="mobile-user-id" class="font-medium text-white"></h3>
                    <span id="mobile-conversation-status" class="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300"></span>
                  </div>
                </div>
                <div class="flex space-x-2">
                  <button id="mobile-take-over-btn" class="btn-primary h-8 w-8 rounded-full flex items-center justify-center text-sm hidden">
                    <i class="fas fa-headset"></i>
                  </button>
                  <button id="mobile-hand-back-btn" class="btn-secondary h-8 w-8 rounded-full flex items-center justify-center text-sm hidden">
                    <i class="fas fa-robot"></i>
                  </button>
                  <button id="mobile-refresh-btn" class="btn-secondary h-8 w-8 rounded-full flex items-center justify-center text-sm">
                    <i class="fas fa-sync-alt"></i>
                  </button>
                </div>
              </div>
              
              <div class="mobile-chat-content bg-gray-900" id="mobile-conversation-messages">
                <!-- Messages will appear here -->
              </div>
              
              <div class="mobile-input-area">
                <form id="mobile-send-message-form" class="flex space-x-2">
                  <div class="flex-grow relative">
                    <textarea id="mobile-message" name="message" rows="1" 
                              class="w-full bg-gray-800 text-white border border-gray-700 rounded-full shadow-sm py-2 px-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                              placeholder="Type a message..." disabled></textarea>
                    <span class="mobile-typing-dots absolute right-3 bottom-2 text-gray-400 text-xs italic hidden"></span>
                  </div>
                  <button type="submit" 
                          class="btn-primary h-10 w-10 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                          disabled>
                    <i class="fas fa-paper-plane"></i>
                  </button>
                </form>
              </div>
            </div>
          `;
          
          // Add mobile styles to head
          const mobileStyles = `
            <style id="mobile-chat-styles">
              /* Mobile chat styles */
              .mobile-view {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: #0f1117;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                transition: transform 0.3s ease-in-out;
                transform: translateX(100%);
              }
              
              .mobile-view.active {
                transform: translateX(0);
              }
              
              .mobile-header {
                padding: 0.75rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
              }
              
              .mobile-back-btn {
                background: none;
                border: none;
                color: white;
                font-size: 1rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                padding: 0.5rem;
              }
              
              .mobile-chat-content {
                flex-grow: 1;
                overflow-y: auto;
                padding: 1rem;
                display: flex;
                flex-direction: column;
              }
              
              .mobile-input-area {
                padding: 0.75rem;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                background-color: rgba(25, 29, 43, 0.8);
              }
              
              /* Fix a few mobile-specific UI issues */
              @media (max-width: 767px) {
                .conversation-item {
                  cursor: pointer;
                }
                
                #conversation-detail {
                  display: none !important;
                }
              }
            </style>
          `;
          
          // Append styles to head
          document.head.insertAdjacentHTML('beforeend', mobileStyles);
          
          // Append mobile view to body
          document.body.insertAdjacentHTML('beforeend', mobileViewHtml);
          
          window.logToConsole('Mobile chat interface DOM elements created');
        }
      },
      
      // Set up event listeners
      setupEventListeners() {
        // Back button
        document.getElementById('mobile-back-btn')?.addEventListener('click', () => {
          this.closeChat();
        });
        
        // Refresh button
        document.getElementById('mobile-refresh-btn')?.addEventListener('click', () => {
          this.refreshChat();
        });
        
        // Take over button
        document.getElementById('mobile-take-over-btn')?.addEventListener('click', () => {
          this.handleTakeOver();
        });
        
        // Hand back button
        document.getElementById('mobile-hand-back-btn')?.addEventListener('click', () => {
          this.handleHandBack();
        });
        
        // Send message form
        document.getElementById('mobile-send-message-form')?.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleSendMessage();
        });
        
        // Message input auto-resize
        document.getElementById('mobile-message')?.addEventListener('input', (e) => {
          const input = e.target;
          input.style.height = 'auto';
          input.style.height = Math.min(120, input.scrollHeight) + 'px';
        });
        
        // Listen for conversation item clicks in the listing
        document.addEventListener('click', (e) => {
          // Find if click was on a conversation item or its child
          const conversationItem = e.target.closest('.conversation-item');
          
          if (conversationItem && isMobile()) {
            e.preventDefault();
            e.stopPropagation();
            
            // Get the user ID from the conversation item
            const userIdElement = conversationItem.querySelector('.font-medium');
            if (userIdElement) {
              const userId = userIdElement.textContent.trim();
              this.openChat(userId);
            }
          }
        });
        
        // Handle navigation (browser back button)
        window.addEventListener('popstate', (e) => {
          if (isMobile() && document.getElementById('mobile-chat-view')?.classList.contains('active')) {
            e.preventDefault();
            this.closeChat();
          }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
          // If switching from mobile to desktop, close mobile chat
          if (!isMobile() && document.getElementById('mobile-chat-view')?.classList.contains('active')) {
            this.closeChat();
          }
        });
        
        window.logToConsole('Mobile chat event listeners set up');
      },
      
      // Check for deep linking in URL
      checkDeepLinking() {
        const urlParams = new URLSearchParams(window.location.search);
        const chatParam = urlParams.get('chat');
        
        if (chatParam && isMobile()) {
          window.logToConsole(`Found chat deep link parameter: ${chatParam}`);
          // Wait a bit to ensure dashboard is fully initialized
          setTimeout(() => {
            if (window.dashboardState.connected) {
              this.openChat(chatParam);
            } else {
              // Save for later when connected
              this.pendingChatOpen = chatParam;
              
              // Set up listener for connection
              window.addEventListener('dashboard:connected', () => {
                if (this.pendingChatOpen) {
                  this.openChat(this.pendingChatOpen);
                  this.pendingChatOpen = null;
                }
              }, { once: true });
            }
          }, 1000);
        }
      },
      
      // Open a chat in mobile view
      openChat(userId) {
        if (!userId) return;
        
        window.logToConsole(`Opening mobile chat for user: ${userId}`);
        this.activeUserId = userId;
        window.dashboardState.selectedUserId = userId;
        
        // Update UI
        document.getElementById('mobile-user-id').textContent = userId;
        document.getElementById('mobile-chat-view').classList.add('active');
        
        // Update URL for deep linking (without reloading)
        const url = new URL(window.location);
        url.searchParams.set('chat', userId);
        window.history.pushState({
          chat: userId
        }, '', url.toString());
        
        // Load the conversation
        this.refreshChat();
      },
      
      // Close the mobile chat
      closeChat() {
        window.logToConsole(`Closing mobile chat view`);
        
        // Hide the mobile view
        document.getElementById('mobile-chat-view').classList.remove('active');
        
        // Update URL to remove chat parameter
        const url = new URL(window.location);
        url.searchParams.delete('chat');
        window.history.pushState({}, '', url.toString());
        
        // Clear active user
        this.activeUserId = null;
      },
      
      // Refresh the current chat
      async refreshChat() {
        if (!this.activeUserId || !window.dashboardState.connected) return;
        
        try {
          window.logToConsole(`Refreshing mobile chat for ${this.activeUserId}`);
          
          // Show loading indicator
          const refreshBtn = document.getElementById('mobile-refresh-btn');
          refreshBtn.innerHTML = '<div class="loader"></div>';
          
          // Get conversation data
          const data = await window.api.getConversation(this.activeUserId);
          
          // Update status and controls based on conversation metadata
          this.updateConversationStatus(data.metadata);
          
          // Display messages
          this.displayMessages(data.messages);
          
          // Restore refresh button
          refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        } catch (error) {
          window.logToConsole(`Failed to refresh mobile chat: ${error.message}`, true);
          document.getElementById('mobile-refresh-btn').innerHTML = '<i class="fas fa-sync-alt"></i>';
        }
      },
      
      // Update conversation status UI
      updateConversationStatus(metadata) {
        // Get elements
        const statusElement = document.getElementById('mobile-conversation-status');
        const takeOverBtn = document.getElementById('mobile-take-over-btn');
        const handBackBtn = document.getElementById('mobile-hand-back-btn');
        const messageInput = document.getElementById('mobile-message');
        const sendButton = document.getElementById('mobile-send-message-form').querySelector('button[type="submit"]');
        
        // Determine status
        const isHumanHandled = metadata && metadata.status === 'human-handled';
        const isHandledByThisAgent = isHumanHandled && metadata.handledBy === window.dashboardState.agentId;
        
        // Update status badge
        if (statusElement) {
          if (isHandledByThisAgent) {
            statusElement.textContent = 'You are handling this';
            statusElement.className = 'text-xs px-2 py-0.5 rounded-full bg-green-800 text-white';
          } else if (isHumanHandled) {
            statusElement.textContent = `Agent: ${metadata.handledBy || 'unknown'}`;
            statusElement.className = 'text-xs px-2 py-0.5 rounded-full bg-purple-800 text-white';
          } else {
            statusElement.textContent = 'AI is handling';
            statusElement.className = 'text-xs px-2 py-0.5 rounded-full bg-blue-800 text-white';
          }
        }
        
        // Update action buttons
        if (isHandledByThisAgent) {
          // This agent is handling the conversation
          takeOverBtn.classList.add('hidden');
          handBackBtn.classList.remove('hidden');
          messageInput.disabled = false;
          messageInput.placeholder = 'Type a message...';
          sendButton.disabled = false;
        } else if (isHumanHandled) {
          // Another agent is handling it
          takeOverBtn.classList.add('hidden');
          handBackBtn.classList.add('hidden');
          messageInput.disabled = true;
          messageInput.placeholder = `Being handled by ${metadata.handledBy || 'another agent'}`;
          sendButton.disabled = true;
        } else {
          // AI is handling it
          takeOverBtn.classList.remove('hidden');
          handBackBtn.classList.add('hidden');
          messageInput.disabled = true;
          messageInput.placeholder = 'Take over to send messages';
          sendButton.disabled = true;
        }
      },
      
      // Display messages in the chat
      displayMessages(messages) {
        const container = document.getElementById('mobile-conversation-messages');
        
        // Clear existing messages
        container.innerHTML = '';
        
        // Check if there are messages
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
          container.innerHTML = `
            <div class="text-center text-gray-500 py-8">
              <i class="far fa-comment-dots text-4xl mb-2 opacity-30"></i>
              <p>No messages found</p>
            </div>
          `;
          return;
        }
        
        // Add each message
        messages.forEach(message => {
          const messageDiv = document.createElement('div');
          const isUser = message.role === 'user';
          
          messageDiv.className = isUser
            ? 'flex items-end justify-end my-2'
            : 'flex items-start my-2';
            
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
          
          container.appendChild(messageDiv);
        });
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
      },
      
      // Handle take over button click
      async handleTakeOver() {
        if (!this.activeUserId || !window.dashboardState.connected) return;
        
        try {
          window.logToConsole(`Taking over conversation from mobile: ${this.activeUserId}`);
          const takeOverBtn = document.getElementById('mobile-take-over-btn');
          takeOverBtn.disabled = true;
          takeOverBtn.innerHTML = '<div class="loader"></div>';
          
          // Make the API request
          const result = await window.api.updateStatus(this.activeUserId, 'human-handled');
          
          // Wait a bit to ensure the status change is processed
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Refresh UI
          await this.refreshChat();
          
          // Also refresh the main conversation list
          if (window.ui && typeof window.ui.refreshConversationList === 'function') {
            window.ui.refreshConversationList();
          }
          
          takeOverBtn.disabled = false;
          takeOverBtn.innerHTML = '<i class="fas fa-headset"></i>';
        } catch (error) {
          window.logToConsole(`Failed to take over conversation from mobile: ${error.message}`, true);
          document.getElementById('mobile-take-over-btn').disabled = false;
          document.getElementById('mobile-take-over-btn').innerHTML = '<i class="fas fa-headset"></i>';
        }
      },
      
      // Handle hand back button click
      async handleHandBack() {
        if (!this.activeUserId || !window.dashboardState.connected) return;
        
        try {
          window.logToConsole(`Handing back conversation from mobile: ${this.activeUserId}`);
          const handBackBtn = document.getElementById('mobile-hand-back-btn');
          handBackBtn.disabled = true;
          handBackBtn.innerHTML = '<div class="loader"></div>';
          
          // Make the API request
          const result = await window.api.updateStatus(this.activeUserId, 'ai-handled');
          
          // Wait a bit to ensure the status change is processed
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Refresh UI
          await this.refreshChat();
          
          // Also refresh the main conversation list
          if (window.ui && typeof window.ui.refreshConversationList === 'function') {
            window.ui.refreshConversationList();
          }
          
          handBackBtn.disabled = false;
          handBackBtn.innerHTML = '<i class="fas fa-robot"></i>';
        } catch (error) {
          window.logToConsole(`Failed to hand back conversation from mobile: ${error.message}`, true);
          document.getElementById('mobile-hand-back-btn').disabled = false;
          document.getElementById('mobile-hand-back-btn').innerHTML = '<i class="fas fa-robot"></i>';
        }
      },
      
      // Handle send message button click
      async handleSendMessage() {
        if (!this.activeUserId || !window.dashboardState.connected) return;
        
        const messageInput = document.getElementById('mobile-message');
        const message = messageInput.value.trim();
        
        if (!message) return;
        
        try {
          window.logToConsole(`Sending message from mobile to ${this.activeUserId}: ${message}`);
          const sendButton = document.getElementById('mobile-send-message-form').querySelector('button[type="submit"]');
          const typingIndicator = document.querySelector('.mobile-typing-dots');
          
          // Update UI to show sending state
          sendButton.disabled = true;
          sendButton.innerHTML = '<div class="loader"></div>';
          if (typingIndicator) typingIndicator.classList.remove('hidden');
          
          // Send the message
          await window.api.sendMessage(this.activeUserId, message);
          
          // Clear the input
          messageInput.value = '';
          messageInput.style.height = 'auto';
          
          // Wait a moment before refreshing
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Hide typing indicator
          if (typingIndicator) typingIndicator.classList.add('hidden');
          
          // Refresh the chat
          await this.refreshChat();
          
          // Also refresh the main conversation list
          if (window.ui && typeof window.ui.refreshConversationList === 'function') {
            window.ui.refreshConversationList();
          }
          
          // Restore send button
          sendButton.disabled = false;
          sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        } catch (error) {
          window.logToConsole(`Failed to send message from mobile: ${error.message}`, true);
          document.getElementById('mobile-send-message-form').querySelector('button[type="submit"]').disabled = false;
          document.getElementById('mobile-send-message-form').querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-paper-plane"></i>';
          document.querySelector('.mobile-typing-dots')?.classList.add('hidden');
        }
      }
    };
    
    // Initialize when the document is ready
    document.addEventListener('DOMContentLoaded', function() {
      window.mobileChat.initialize();
    });
  })();