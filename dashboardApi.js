// dashboardApi.js - Updated with improved CORS handling, debugging, and notification system

export class DashboardAPI {
  constructor(env) {
    this.kvStore = env.CHAT_HISTORY;
    this.adminApiKey = env.ADMIN_API_KEY;
    this.MAX_CONVERSATIONS = 100; // Maximum conversations to return in listing
    // Add notification-related properties
    this.NOTIFICATION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds
  }

  // Validate admin API key
  validateApiKey(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('API key validation failed: Invalid Authorization header format');
      return false;
    }
    
    const token = authHeader.substring(7);
    const isValid = token === this.adminApiKey;
    
    if (!isValid) {
      console.log('API key validation failed: Token mismatch');
    }
    
    return isValid;
  }

  // Create response with appropriate headers
  createResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // Handle OPTIONS requests (for CORS)
  handleOptions() {
    console.log('Handling OPTIONS request for CORS preflight');
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // Handle unauthorized requests
  handleUnauthorized() {
    console.log('Returning 401 Unauthorized response');
    return this.createResponse({ error: 'Unauthorized access' }, 401);
  }

  // List all active conversations
  async listConversations() {
    try {
      console.log('Listing conversations from KV store');
      
      // Get all keys with the chat_history: prefix
      const keys = await this.kvStore.list({ prefix: 'chat_history:' });
      console.log(`Found ${keys.keys.length} conversation keys`);
      
      const conversations = [];
      
      for (const key of keys.keys) {
        const userId = key.name.split(':')[1];
        if (!userId) {
          console.log(`Skipping invalid key format: ${key.name}`);
          continue;
        }
        
        // Get the conversation data
        console.log(`Fetching conversation data for userId: ${userId}`);
        const conversationData = await this.kvStore.get(key.name, 'json');
        
        if (!conversationData || !Array.isArray(conversationData)) {
          console.log(`Invalid or missing conversation data for userId: ${userId}`);
          continue;
        }
        
        // Extract last message and timestamp
        const lastMessage = conversationData[conversationData.length - 1] || {};
        const lastTimestamp = lastMessage.timestamp || Date.now();
        
        // Get metadata if it exists
        const metadataKey = `chat_metadata:${userId}`;
        let metadata = await this.kvStore.get(metadataKey, 'json') || {};
        
        conversations.push({
          userId,
          lastMessage: lastMessage.content || '',
          lastRole: lastMessage.role || 'unknown',
          messageCount: conversationData.length,
          lastTimestamp,
          status: metadata.status || 'ai-handled',
          handledBy: metadata.handledBy || 'ai-agent'
        });
      }
      
      // Sort by most recent first
      conversations.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
      
      console.log(`Returning ${conversations.length} conversations`);
      
      return this.createResponse({ 
        conversations: conversations.slice(0, this.MAX_CONVERSATIONS),
        totalCount: conversations.length
      });
    } catch (error) {
      console.error('Error listing conversations:', error);
      return this.createResponse({ 
        error: 'Failed to list conversations',
        message: error.message 
      }, 500);
    }
  }

  // Get a specific conversation by user ID
  async getConversation(userId) {
    try {
      console.log(`Getting conversation for userId: ${userId}`);
      
      if (!userId) {
        console.log('Missing userId parameter');
        return this.createResponse({ error: 'User ID is required' }, 400);
      }
      
      const key = `chat_history:${userId}`;
      console.log(`Fetching from KV with key: ${key}`);
      
      const conversationData = await this.kvStore.get(key, 'json');
      
      if (!conversationData) {
        console.log(`Conversation not found for userId: ${userId}`);
        return this.createResponse({ error: 'Conversation not found' }, 404);
      }
      
      // Get metadata if it exists
      const metadataKey = `chat_metadata:${userId}`;
      console.log(`Fetching metadata with key: ${metadataKey}`);
      
      const metadata = await this.kvStore.get(metadataKey, 'json') || {
        status: 'ai-handled',
        handledBy: 'ai-agent',
        createdAt: Date.now()
      };
      
      console.log(`Retrieved conversation with ${conversationData.length} messages`);
      
      return this.createResponse({
        userId,
        messages: conversationData,
        metadata
      });
    } catch (error) {
      console.error('Error getting conversation:', error);
      return this.createResponse({ 
        error: 'Failed to get conversation',
        message: error.message
      }, 500);
    }
  }

  // Update conversation handling status (handoff between AI and human)
  async updateConversationStatus(userId, agentId, status) {
    try {
      console.log(`Updating status for userId: ${userId} to ${status} by agent: ${agentId}`);
      
      if (!userId || !status) {
        console.log('Missing required parameters');
        return this.createResponse({ error: 'User ID and status are required' }, 400);
      }
      
      // Make sure conversation exists
      const key = `chat_history:${userId}`;
      console.log(`Checking if conversation exists with key: ${key}`);
      
      const exists = await this.kvStore.get(key) !== null;
      
      if (!exists) {
        console.log(`Conversation not found for userId: ${userId}`);
        return this.createResponse({ error: 'Conversation not found' }, 404);
      }
      
      // Update or create metadata
      const metadataKey = `chat_metadata:${userId}`;
      console.log(`Fetching existing metadata with key: ${metadataKey}`);
      
      const currentMetadata = await this.kvStore.get(metadataKey, 'json') || {};
      
      const updatedMetadata = {
        ...currentMetadata,
        status,
        handledBy: agentId || (status === 'ai-handled' ? 'ai-agent' : currentMetadata.handledBy),
        lastUpdated: Date.now()
      };
      
      console.log(`Storing updated metadata:`, updatedMetadata);
      await this.kvStore.put(metadataKey, JSON.stringify(updatedMetadata));
      
      return this.createResponse({
        userId,
        status: updatedMetadata.status,
        handledBy: updatedMetadata.handledBy
      });
    } catch (error) {
      console.error('Error updating conversation status:', error);
      return this.createResponse({ 
        error: 'Failed to update conversation status',
        message: error.message
      }, 500);
    }
  }

  // Send a message from a human agent
  async sendAgentMessage(userId, agentId, message) {
    try {
      console.log(`Sending agent message to userId: ${userId} from agent: ${agentId}`);
      
      if (!userId || !agentId || !message) {
        console.log('Missing required parameters');
        return this.createResponse({ error: 'User ID, agent ID, and message are required' }, 400);
      }
      
      const key = `chat_history:${userId}`;
      console.log(`Fetching conversation from KV with key: ${key}`);
      
      let conversationData = await this.kvStore.get(key, 'json') || [];
      
      // Add the message to the conversation
      const newMessage = {
        role: 'assistant',
        content: message,
        timestamp: Date.now(),
        sentBy: agentId
      };
      
      conversationData.push(newMessage);
      
      // Update the conversation in KV
      console.log(`Updating conversation with new message`);
      await this.kvStore.put(key, JSON.stringify(conversationData));
      
      // Update metadata to show agent handling
      const metadataKey = `chat_metadata:${userId}`;
      console.log(`Fetching metadata from KV with key: ${metadataKey}`);
      
      const currentMetadata = await this.kvStore.get(metadataKey, 'json') || {};
      
      const updatedMetadata = {
        ...currentMetadata,
        status: 'human-handled',
        handledBy: agentId,
        lastUpdated: Date.now()
      };
      
      console.log(`Updating metadata:`, updatedMetadata);
      await this.kvStore.put(metadataKey, JSON.stringify(updatedMetadata));
      
      return this.createResponse({
        userId,
        message: newMessage,
        status: 'sent'
      });
    } catch (error) {
      console.error('Error sending agent message:', error);
      return this.createResponse({ 
        error: 'Failed to send message',
        message: error.message
      }, 500);
    }
  }

  // Create test data for debugging
  async createTestData(userId) {
    try {
      console.log(`Creating test data for userId: ${userId}`);
      
      // Create history
      const history = [
        {
          role: 'user',
          content: 'Hello',
          timestamp: Date.now() - 120000
        },
        {
          role: 'assistant',
          content: 'Hello! Welcome to Complexe LeSims. How can I assist you today?',
          timestamp: Date.now() - 100000
        },
        {
          role: 'user',
          content: 'What\'s on the menu?',
          timestamp: Date.now() - 60000
        },
        {
          role: 'assistant',
          content: 'We have a variety of dishes including salads, pastas, burgers, and African specialties. Would you like me to send you our full menu?',
          timestamp: Date.now() - 30000
        }
      ];
      
      // Create metadata
      const metadata = {
        status: 'ai-handled',
        handledBy: 'ai-agent',
        createdAt: Date.now() - 120000,
        lastUpdated: Date.now() - 30000
      };
      
      // Store in KV
      await this.kvStore.put(`chat_history:${userId}`, JSON.stringify(history));
      await this.kvStore.put(`chat_metadata:${userId}`, JSON.stringify(metadata));
      
      console.log(`Test data created successfully for userId: ${userId}`);
      
      return this.createResponse({
        success: true,
        userId,
        messageCount: history.length
      });
    } catch (error) {
      console.error('Error creating test data:', error);
      return this.createResponse({
        error: 'Failed to create test data',
        message: error.message
      }, 500);
    }
  }

  // Get pending notifications
  async getPendingNotifications() {
    try {
      console.log('Retrieving pending notifications');
      
      // Get all keys with the notification: prefix that haven't been delivered
      const keys = await this.kvStore.list({ prefix: 'notification:undelivered:' });
      console.log(`Found ${keys.keys.length} pending notification keys`);
      
      const notifications = [];
      
      for (const key of keys.keys) {
        // Get the notification data
        const notification = await this.kvStore.get(key.name, 'json');
        
        if (!notification) {
          console.log(`Missing notification data for key: ${key.name}`);
          continue;
        }
        
        notifications.push(notification);
      }
      
      console.log(`Returning ${notifications.length} pending notifications`);
      
      return this.createResponse({ 
        notifications,
        count: notifications.length
      });
    } catch (error) {
      console.error('Error retrieving pending notifications:', error);
      return this.createResponse({ 
        error: 'Failed to retrieve notifications',
        message: error.message 
      }, 500);
    }
  }
  
  // Mark notifications as received/delivered
  async markNotificationsReceived(ids) {
    try {
      console.log(`Marking notifications as received:`, ids);
      
      if (!ids || !Array.isArray(ids)) {
        console.log('Invalid notification IDs');
        return this.createResponse({ error: 'Invalid notification IDs' }, 400);
      }
      
      const movePromises = ids.map(async (id) => {
        const undeliveredKey = `notification:undelivered:${id}`;
        const deliveredKey = `notification:delivered:${id}`;
        
        // Get notification data
        const notification = await this.kvStore.get(undeliveredKey, 'json');
        
        if (!notification) {
          console.log(`Notification not found: ${id}`);
          return;
        }
        
        // Store in delivered location
        await this.kvStore.put(deliveredKey, JSON.stringify({
          ...notification,
          deliveredAt: Date.now()
        }), { expirationTtl: this.NOTIFICATION_TTL });
        
        // Delete from undelivered
        await this.kvStore.delete(undeliveredKey);
      });
      
      await Promise.all(movePromises);
      
      return this.createResponse({
        success: true,
        marked: ids.length
      });
    } catch (error) {
      console.error('Error marking notifications as received:', error);
      return this.createResponse({ 
        error: 'Failed to mark notifications as received',
        message: error.message 
      }, 500);
    }
  }
  
  // Create a notification
  async createNotification(type, title, body, userId = null, metadata = {}) {
    try {
      console.log(`Creating notification: ${type} - ${title}`);
      
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 15);
      const notification = {
        id,
        type,
        title,
        body,
        userId,
        timestamp: Date.now(),
        ...metadata
      };
      
      // Store in KV
      const key = `notification:undelivered:${id}`;
      await this.kvStore.put(key, JSON.stringify(notification), {
        expirationTtl: this.NOTIFICATION_TTL
      });
      
      console.log(`Notification created: ${id}`);
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
  
  // NEW METHOD: Create a test notification
  async createTestNotification(type = 'help_needed') {
    try {
      console.log('Creating test notification of type:', type);
      
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 10);
      let notification;
      
      if (type === 'help_needed') {
        notification = {
          id,
          type: 'help_needed',
          title: 'Test: Customer Needs Help',
          body: `Test notification: Customer needs assistance with their order.`,
          userId: 'test_' + Date.now().toString().slice(-6),
          timestamp: Date.now(),
          urgent: true
        };
      } else if (type === 'order_confirmed') {
        notification = {
          id,
          type: 'order_confirmed',
          title: 'Test: New Order',
          body: `Test notification: A customer has placed a new order.`,
          userId: 'test_' + Date.now().toString().slice(-6),
          timestamp: Date.now()
        };
      } else {
        notification = {
          id,
          type: 'system',
          title: 'Test Notification',
          body: `This is a test notification created at ${new Date().toLocaleTimeString()}`,
          timestamp: Date.now()
        };
      }
      
      // Store in KV
      const key = `notification:undelivered:${id}`;
      await this.kvStore.put(key, JSON.stringify(notification), {
        expirationTtl: this.NOTIFICATION_TTL
      });
      
      console.log(`Test notification created: ${id}`);
      
      return {
        success: true,
        notification
      };
    } catch (error) {
      console.error('Error creating test notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Enhanced conversation monitoring to generate notifications
  async checkConversationsForNotifications() {
    try {
      console.log('Checking conversations for notification triggers');
      
      // Get all conversations
      const keys = await this.kvStore.list({ prefix: 'chat_history:' });
      const currentTime = Date.now();
      const ACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes
      
      for (const key of keys.keys) {
        const userId = key.name.split(':')[1];
        if (!userId) continue;
        
        // Get metadata
        const metadataKey = `chat_metadata:${userId}`;
        const metadata = await this.kvStore.get(metadataKey, 'json') || {};
        
        // Get conversation data
        const conversationData = await this.kvStore.get(key.name, 'json');
        if (!conversationData || !Array.isArray(conversationData)) continue;
        
        // Skip if no messages
        if (conversationData.length === 0) continue;
        
        // Get last message
        const lastMessage = conversationData[conversationData.length - 1];
        const lastMessageTime = lastMessage.timestamp || 0;
        
        // Check if AI is handling and there's recent activity
        if (
          metadata.status === 'ai-handled' && 
          currentTime - lastMessageTime < ACTIVITY_THRESHOLD
        ) {
          // Only check user messages
          if (lastMessage.role === 'user') {
            const content = lastMessage.content.toLowerCase();
            
            // Check for help-related keywords
            const helpPhrases = [
              "help", "aide", "besoin", "need", "assist",
              "comment", "how", "pourquoi", "why", "quand", "when",
              "où", "where", "qui", "who", "aidez", "help me"
            ];
            
            const helpRequested = helpPhrases.some(phrase => content.includes(phrase));
            
            if (helpRequested) {
              await this.createNotification(
                'help_needed',
                'Customer Needs Help',
                `Customer ${userId} appears to need assistance: "${lastMessage.content.substring(0, 50)}${lastMessage.content.length > 50 ? '...' : ''}"`,
                userId,
                { urgent: true, lastMessage: lastMessage.content }
              );
            }
            
            // Check for order-related keywords
            if (
              (content.includes('commander') || content.includes('order')) &&
              (content.includes('confirme') || content.includes('confirm'))
            ) {
              // Create order confirmation notification
              await this.createNotification(
                'order_confirmed',
                'Order Confirmed',
                `Customer ${userId} has confirmed an order`,
                userId,
                { lastMessage: lastMessage.content }
              );
            }
          }
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error checking conversations for notifications:', error);
      return { error: error.message };
    }
  }

  // Route API requests
  async handleRequest(request, url) {
    console.log(`Handling API request: ${request.method} ${url.pathname}`);
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return this.handleOptions();
    }
    
    // Validate API key for all other requests
    if (!this.validateApiKey(request)) {
      console.log('API key validation failed');
      return this.handleUnauthorized();
    }
    
    const path = url.pathname;
    const userId = url.searchParams.get('userId');
    
    try {
      // Route to appropriate handler based on path and method
      if (path === '/api/conversations' && request.method === 'GET') {
        console.log('Routing to listConversations');
        return await this.listConversations();
      }
      
      if (path === '/api/conversation' && request.method === 'GET') {
        console.log(`Routing to getConversation for userId: ${userId}`);
        return await this.getConversation(userId);
      }
      
      if (path === '/api/conversation/status' && request.method === 'PUT') {
        console.log(`Routing to updateConversationStatus for userId: ${userId}`);
        const data = await request.json();
        return await this.updateConversationStatus(
          userId, 
          data.agentId, 
          data.status
        );
      }
      
      if (path === '/api/conversation/message' && request.method === 'POST') {
        console.log(`Routing to sendAgentMessage for userId: ${userId}`);
        const data = await request.json();
        return await this.sendAgentMessage(
          userId,
          data.agentId,
          data.message
        );
      }
      
      // Add the notification endpoints
      if (path === '/api/notifications/pending' && request.method === 'GET') {
        console.log('Routing to getPendingNotifications');
        return await this.getPendingNotifications();
      }
      
      if (path === '/api/notifications/mark-received' && request.method === 'POST') {
        console.log('Routing to markNotificationsReceived');
        const data = await request.json();
        return await this.markNotificationsReceived(data.ids);
      }
      
      // Add a test endpoint for notifications
      if (path === '/api/notifications/test' && request.method === 'POST') {
        console.log('Routing to createTestNotification');
        const data = await request.json();
        const result = await this.createTestNotification(data.type);
        return this.createResponse(result);
      }
      
      // Add a debug endpoint to trigger notification check manually
      if (path === '/api/notifications/check' && request.method === 'POST') {
        console.log('Routing to checkConversationsForNotifications');
        const result = await this.checkConversationsForNotifications();
        return this.createResponse(result);
      }
      
      // Special endpoint for creating test data
      if (path === '/api/test/create-data' && request.method === 'POST') {
        console.log('Routing to createTestData');
        const data = await request.json();
        return await this.createTestData(data.userId || `test_${Date.now()}`);
      }
      
      // If we get here, the endpoint doesn't exist
      console.log(`Endpoint not found: ${path}`);
      return this.createResponse({ error: 'Endpoint not found' }, 404);
    } catch (error) {
      console.error('API error:', error);
      return this.createResponse({ 
        error: 'Internal server error',
        message: error.message
      }, 500);
    }
  }
}