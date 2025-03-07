// api.js - API communication module for dashboard
(function() {
    'use strict';
    
    // API Module namespace
    window.api = {
      // Make an API request with auth headers
      async request(endpoint, method = 'GET', body = null) {
        try {
          window.logToConsole(`Making ${method} request to ${window.dashboardState.apiUrl}${endpoint}`);
          const url = `${window.dashboardState.apiUrl}${endpoint}`;
          const options = {
            method,
            headers: {
              'Authorization': `Bearer ${window.dashboardState.apiKey}`,
              'Content-Type': 'application/json'
            }
          };
          
          if (body) {
            options.body = JSON.stringify(body);
          }
          
          const response = await fetch(url, options);
          window.logToConsole(`Response status: ${response.status}`);
          
          if (!response.ok) {
            const errorText = await response.text();
            window.logToConsole(`API error response: ${errorText}`, true);
            throw new Error(`API error: ${response.status} - ${errorText}`);
          }
          
          return await response.json();
        } catch (error) {
          window.logToConsole(`API request failed: ${error.message}`, true);
          throw error;
        }
      },
      
      // Get all conversations
      async getConversations() {
        return this.request('/api/conversations');
      },
      
      // Get a specific conversation
      async getConversation(userId) {
        return this.request(`/api/conversation?userId=${encodeURIComponent(userId)}`);
      },
      
      // Update conversation status (take over or hand back)
      async updateStatus(userId, status) {
        window.logToConsole(`Updating conversation status for ${userId} to ${status} with agent ${window.dashboardState.agentId}`);
        
        try {
          const result = await this.request(
            `/api/conversation/status?userId=${encodeURIComponent(userId)}`,
            'PUT',
            {
              agentId: window.dashboardState.agentId,
              status: status
            }
          );
          
          window.logToConsole(`Status update result: ${JSON.stringify(result)}`);
          return result;
        } catch (error) {
          window.logToConsole(`Status update error: ${error.message}`, true);
          throw error;
        }
      },
      
      // Send a message as an agent
      async sendMessage(userId, message) {
        window.logToConsole(`Sending message to ${userId}: "${message}" from agent ${window.dashboardState.agentId}`);
        
        try {
          // First make sure we're still handling this conversation
          const conversationData = await this.getConversation(userId);
          const metadata = conversationData.metadata || {};
          
          if (metadata.status !== 'human-handled' || metadata.handledBy !== window.dashboardState.agentId) {
            window.logToConsole(`Warning: This agent (${window.dashboardState.agentId}) is not currently handling this conversation. Status: ${metadata.status}, Handler: ${metadata.handledBy}`, true);
            
            // Try to take over the conversation again
            window.logToConsole(`Attempting to take over the conversation again...`);
            await this.updateStatus(userId, 'human-handled');
          }
          
          // Skip WhatsApp sending for test users
          const isTestUser = userId.startsWith('test_');
          
          if (!isTestUser) {
            // STEP 1: Send message directly to WhatsApp
            window.logToConsole(`Sending message to WhatsApp for user: ${userId}`);
            try {
              const whatsappResult = await this.request(
                `/api/whatsapp/send`,
                'POST',
                {
                  userId: userId,
                  message: message
                }
              );
              window.logToConsole(`WhatsApp message sent: ${JSON.stringify(whatsappResult)}`);
            } catch (whatsappError) {
              window.logToConsole(`Failed to send WhatsApp message: ${whatsappError.message}`, true);
              // Continue anyway to store in chat history
            }
          } else {
            window.logToConsole(`Skipping WhatsApp send for test user: ${userId}`);
          }
          
          // STEP 2: Store the message in the conversation history
          const result = await this.request(
            `/api/conversation/message?userId=${encodeURIComponent(userId)}`,
            'POST',
            {
              agentId: window.dashboardState.agentId,
              message: message
            }
          );
          
          window.logToConsole(`Message stored in history: ${JSON.stringify(result)}`);
          return result;
        } catch (error) {
          window.logToConsole(`Send message error: ${error.message}`, true);
          throw error;
        }
      },
      
      // Test connection to API
      async testConnection() {
        try {
          window.logToConsole('Testing connection to API...');
          const result = await this.getConversations();
          window.logToConsole('Connection test successful. API response:');
          window.logToConsole(JSON.stringify(result, null, 2));
          return true;
        } catch (error) {
          window.logToConsole(`Connection test failed: ${error.message}`, true);
          return false;
        }
      },
      
      // Get pending notifications
      async getPendingNotifications() {
        try {
          window.logToConsole('Fetching pending notifications from API');
          return await this.request('/api/notifications/pending');
        } catch (error) {
          window.logToConsole(`Failed to fetch notifications: ${error.message}`, true);
          return { notifications: [], count: 0 };
        }
      },
      
      // Mark notifications as received
      async markNotificationsReceived(ids) {
        if (!ids || !ids.length) return;
        
        try {
          window.logToConsole(`Marking ${ids.length} notifications as received`);
          return await this.request(
            '/api/notifications/mark-received',
            'POST',
            { ids }
          );
        } catch (error) {
          window.logToConsole(`Failed to mark notifications as received: ${error.message}`, true);
        }
      },
      
      // Create a test notification
      async createTestNotification(type = 'help_needed') {
        try {
          window.logToConsole(`Creating a test notification of type: ${type}`);
          return await this.request(
            '/api/notifications/test',
            'POST',
            { type }
          );
        } catch (error) {
          window.logToConsole(`Failed to create test notification: ${error.message}`, true);
          return { success: false, error: error.message };
        }
      }
    };
    
    // Log module initialization
    window.logToConsole('API module initialized');
  })();