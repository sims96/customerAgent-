// email-settings.js - Email notification settings management
(function() {
  'use strict';
  
  // Email Settings Module
  window.emailSettings = {
    // Properties
    recipients: {
      notifications: {
        help_needed: [],
        order_confirmed: [],
        all: []
      }
    },
    hasChanges: false,
    
    // Initialize the module
    initialize() {
      window.logToConsole('Initializing email settings module');
      
      // Set up UI elements
      this.setupEventListeners();
      
      // Load email settings when connected
      window.addEventListener('dashboard:connected', this.loadEmailSettings.bind(this));
      
      window.logToConsole('Email settings module initialized');
    },
    
    // Set up event listeners
    setupEventListeners() {
      // Button to open settings modal
      document.getElementById('email-settings-btn')?.addEventListener('click', this.openSettingsModal.bind(this));
      
      // Close button
      document.getElementById('close-email-settings')?.addEventListener('click', this.closeSettingsModal.bind(this));
      
      // Add email buttons
      document.getElementById('add-help-email')?.addEventListener('click', () => this.addEmail('help_needed'));
      document.getElementById('add-order-email')?.addEventListener('click', () => this.addEmail('order_confirmed'));
      document.getElementById('add-all-email')?.addEventListener('click', () => this.addEmail('all'));
      
      // Save button
      document.getElementById('save-email-settings')?.addEventListener('click', this.saveEmailSettings.bind(this));
      
      // Test email button
      document.getElementById('send-test-email')?.addEventListener('click', this.sendTestEmail.bind(this));
      
      // Close modal on backdrop click
      document.getElementById('email-settings-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'email-settings-modal') {
          this.closeSettingsModal();
        }
      });
      
      // Enter key in email inputs
      document.getElementById('help-email-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.addEmail('help_needed');
      });
      
      document.getElementById('order-email-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.addEmail('order_confirmed');
      });
      
      document.getElementById('all-email-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.addEmail('all');
      });
      
      document.getElementById('test-email-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.sendTestEmail();
      });
      
      // Add debug button for testing
      this.addDebugButton();
    },
    
    // Add debug button to help diagnose KV issues
    addDebugButton() {
      if (document.getElementById('debug-email-btn')) return;
      
      const testBtn = document.getElementById('send-test-email');
      if (!testBtn) return;
      
      const debugBtn = document.createElement('button');
      debugBtn.id = 'debug-email-btn';
      debugBtn.className = 'btn-secondary py-2 px-4 rounded-md ml-2 text-xs';
      debugBtn.textContent = 'Debug KV';
      debugBtn.addEventListener('click', this.debugKVStorage.bind(this));
      
      testBtn.parentNode.appendChild(debugBtn);
    },
    
    // Debug KV storage function
    async debugKVStorage() {
      if (!window.dashboardState || !window.dashboardState.connected) {
        alert('Please connect to API first');
        return;
      }
      
      try {
        window.logToConsole('Debugging KV storage for email recipients...');
        
        // Show status
        const statusElement = document.getElementById('test-email-status');
        if (statusElement) {
          statusElement.textContent = 'Checking KV storage...';
          statusElement.className = 'mt-2 text-sm text-gray-300';
        }
        
        // Call debug endpoint
        const response = await window.api.request('/api/debug/email-recipients');
        
        window.logToConsole('Debug response:', response);
        
        // Show results
        if (statusElement) {
          const summary = `KV Data: ${response.rawDataExists ? 'Found' : 'Not found'}\n` +
                         `Keys: ${response.allKVKeys?.join(', ') || 'None'}\n` +
                         `Recipients: ${JSON.stringify(response.parsedData?.notifications || {}, null, 2)}`;
          
          statusElement.innerHTML = `<pre style="max-height: 200px; overflow-y: auto; white-space: pre-wrap; background: #333; padding: 8px; border-radius: 4px;">${summary}</pre>`;
          statusElement.className = 'mt-2 text-sm';
        }
      } catch (error) {
        window.logToConsole(`Debug error: ${error.message}`, true);
        
        // Show error
        const statusElement = document.getElementById('test-email-status');
        if (statusElement) {
          statusElement.textContent = `Debug error: ${error.message}`;
          statusElement.className = 'mt-2 text-sm text-red-400';
        }
      }
    },
    
    // Load email settings from API
    async loadEmailSettings() {
      if (!window.dashboardState || !window.dashboardState.connected) return;
      
      try {
        window.logToConsole('Loading email recipients from API');
        const response = await window.api.request('/api/email-recipients');
        
        window.logToConsole('Email recipients API response:', response);
        
        if (response && response.notifications) {
          this.recipients = response;
          window.logToConsole('Recipients data loaded:', this.recipients);
        } else {
          this.recipients = {
            notifications: {
              help_needed: [],
              order_confirmed: [],
              all: []
            }
          };
          window.logToConsole('Using default recipients structure');
        }
        
        window.logToConsole('Email recipients loaded successfully');
        this.hasChanges = false;
        this.updateEmailLists();
      } catch (error) {
        window.logToConsole(`Failed to load email recipients: ${error.message}`, true);
      }
    },
    
    // Open the settings modal
    openSettingsModal() {
      const modal = document.getElementById('email-settings-modal');
      if (modal) {
        // Load latest settings before opening
        this.loadEmailSettings();
        
        // Show modal
        modal.classList.remove('hidden');
      }
    },
    
    // Close the settings modal
    closeSettingsModal() {
      const modal = document.getElementById('email-settings-modal');
      if (modal) {
        // If there are unsaved changes, confirm before closing
        if (this.hasChanges) {
          if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
            return;
          }
        }
        
        modal.classList.add('hidden');
        this.hasChanges = false;
      }
    },
    
    // Add email to a specific list
    addEmail(type) {
      // Get the right input element based on notification type
      let inputId;
      if (type === 'help_needed') inputId = 'help-email-input';
      else if (type === 'order_confirmed') inputId = 'order-email-input';
      else inputId = 'all-email-input';
      
      const inputElement = document.getElementById(inputId);
      if (!inputElement) return;
      
      const email = inputElement.value.trim();
      if (!email) return;
      
      // Basic email validation
      if (!this.isValidEmail(email)) {
        window.logToConsole(`Invalid email format: ${email}`, true);
        inputElement.classList.add('border-red-500');
        setTimeout(() => {
          inputElement.classList.remove('border-red-500');
        }, 2000);
        return;
      }
      
      // Make sure notifications[type] exists
      if (!this.recipients.notifications[type]) {
        this.recipients.notifications[type] = [];
      }
      
      // Check if email already exists in this list
      if (this.recipients.notifications[type].includes(email)) {
        window.logToConsole(`Email already exists in ${type} list: ${email}`, true);
        inputElement.value = '';
        return;
      }
      
      // Add to recipients
      this.recipients.notifications[type].push(email);
      this.hasChanges = true;
      
      window.logToConsole(`Added email '${email}' to ${type} notifications list`);
      window.logToConsole(`Updated recipients:`, this.recipients);
      
      // Clear input
      inputElement.value = '';
      
      // Update UI
      this.updateEmailLists();
    },
    
    // Remove email from a specific list
    removeEmail(type, email) {
      if (!this.recipients.notifications[type]) return;
      
      window.logToConsole(`Removing email '${email}' from ${type} notifications list`);
      
      this.recipients.notifications[type] = this.recipients.notifications[type].filter(e => e !== email);
      this.hasChanges = true;
      
      window.logToConsole(`Updated recipients:`, this.recipients);
      
      this.updateEmailLists();
    },
    
    // Update email lists in UI
    updateEmailLists() {
      // Help emails
      const helpList = document.getElementById('help-email-list');
      if (helpList) {
        helpList.innerHTML = '';
        if (this.recipients.notifications.help_needed && this.recipients.notifications.help_needed.length > 0) {
          this.recipients.notifications.help_needed.forEach(email => {
            helpList.appendChild(this.createEmailItem('help_needed', email));
          });
        } else {
          helpList.innerHTML = '<div class="text-gray-500 text-sm">No recipients configured</div>';
        }
      }
      
      // Order emails
      const orderList = document.getElementById('order-email-list');
      if (orderList) {
        orderList.innerHTML = '';
        if (this.recipients.notifications.order_confirmed && this.recipients.notifications.order_confirmed.length > 0) {
          this.recipients.notifications.order_confirmed.forEach(email => {
            orderList.appendChild(this.createEmailItem('order_confirmed', email));
          });
        } else {
          orderList.innerHTML = '<div class="text-gray-500 text-sm">No recipients configured</div>';
        }
      }
      
      // All emails
      const allList = document.getElementById('all-email-list');
      if (allList) {
        allList.innerHTML = '';
        if (this.recipients.notifications.all && this.recipients.notifications.all.length > 0) {
          this.recipients.notifications.all.forEach(email => {
            allList.appendChild(this.createEmailItem('all', email));
          });
        } else {
          allList.innerHTML = '<div class="text-gray-500 text-sm">No recipients configured</div>';
        }
      }
    },
    
    // Create email list item element
    createEmailItem(type, email) {
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between bg-gray-700 rounded p-2';
      
      item.innerHTML = `
        <span class="text-white">${email}</span>
        <button class="text-red-400 hover:text-red-300">
          <i class="fas fa-times"></i>
        </button>
      `;
      
      // Add remove button handler
      item.querySelector('button').addEventListener('click', () => {
        this.removeEmail(type, email);
      });
      
      return item;
    },
    
    // Save email settings to API
    async saveEmailSettings() {
      if (!window.dashboardState || !window.dashboardState.connected) return;
      
      try {
        window.logToConsole('Saving email recipients to API');
        window.logToConsole(`Recipients being saved: ${JSON.stringify(this.recipients)}`);
        
        // Show saving indicator
        const saveButton = document.getElementById('save-email-settings');
        if (saveButton) {
          saveButton.innerHTML = '<div class="loader mr-2"></div> Saving...';
          saveButton.disabled = true;
        }
        
        // Save to API with detailed logging
        const startTime = Date.now();
        window.logToConsole(`Making PUT request to /api/email-recipients at ${new Date().toLocaleTimeString()}`);
        
        const response = await window.api.request(
          '/api/email-recipients',
          'PUT',
          this.recipients
        );
        
        window.logToConsole(`API response received after ${Date.now() - startTime}ms: ${JSON.stringify(response)}`);
        
        if (response && response.success) {
          window.logToConsole('Email recipients saved successfully');
          this.hasChanges = false;
          
          // Verify the data was actually saved by retrieving it again
          window.logToConsole('Verifying data was saved by retrieving it...');
          const verifyResponse = await window.api.request('/api/email-recipients');
          window.logToConsole(`Verification data retrieved: ${JSON.stringify(verifyResponse)}`);
          
          // Try the debug endpoint if available
          try {
            const debugResponse = await window.api.request('/api/debug/email-recipients');
            window.logToConsole(`Debug data retrieved: ${JSON.stringify(debugResponse)}`);
          } catch (debugError) {
            window.logToConsole(`Debug endpoint not available: ${debugError.message}`);
          }
          
          // Show success feedback
          if (saveButton) {
            saveButton.innerHTML = '<i class="fas fa-check mr-2"></i> Saved';
            setTimeout(() => {
              saveButton.innerHTML = 'Save Changes';
              saveButton.disabled = false;
            }, 2000);
          }
        } else {
          throw new Error(response.error || 'Unknown error');
        }
      } catch (error) {
        window.logToConsole(`Failed to save email recipients: ${error.message}`, true);
        
        // Restore button
        const saveButton = document.getElementById('save-email-settings');
        if (saveButton) {
          saveButton.innerHTML = 'Save Changes';
          saveButton.disabled = false;
        }
        
        // Show error message
        alert(`Failed to save: ${error.message}`);
      }
    },
    
    // Send a test email
    async sendTestEmail() {
      const inputElement = document.getElementById('test-email-input');
      if (!inputElement) return;
      
      let email = inputElement.value.trim();
      if (!email) {
        // Use default email if none provided
        email = 'simondomfabrice@gmail.com';
        if (inputElement) inputElement.value = email;
      }
      
      // Basic email validation
      if (!this.isValidEmail(email)) {
        window.logToConsole(`Invalid email format for test: ${email}`, true);
        inputElement.classList.add('border-red-500');
        setTimeout(() => {
          inputElement.classList.remove('border-red-500');
        }, 2000);
        return;
      }
      
      try {
        window.logToConsole(`Sending test email to ${email}`);
        
        // Update status
        const statusElement = document.getElementById('test-email-status');
        if (statusElement) {
          statusElement.textContent = 'Sending test email...';
          statusElement.className = 'mt-2 text-sm text-gray-300';
        }
        
        // Disable test button
        const testButton = document.getElementById('send-test-email');
        if (testButton) {
          testButton.innerHTML = '<div class="loader mr-2"></div> Sending';
          testButton.disabled = true;
        }
        
        // Send test email
        const response = await window.api.request(
          '/api/email-recipients/test',
          'POST',
          { email }
        );
        
        window.logToConsole(`Test email API response: ${JSON.stringify(response)}`);
        
        if (response && response.success) {
          window.logToConsole('Test email sent successfully');
          
          // Show success message
          if (statusElement) {
            statusElement.textContent = 'Test email sent successfully! Check your inbox.';
            statusElement.className = 'mt-2 text-sm text-green-400';
          }
        } else {
          throw new Error(response.error || 'Unknown error');
        }
      } catch (error) {
        window.logToConsole(`Failed to send test email: ${error.message}`, true);
        
        // Show error message
        const statusElement = document.getElementById('test-email-status');
        if (statusElement) {
          statusElement.textContent = `Error: ${error.message}`;
          statusElement.className = 'mt-2 text-sm text-red-400';
        }
      } finally {
        // Restore test button
        const testButton = document.getElementById('send-test-email');
        if (testButton) {
          testButton.innerHTML = 'Test';
          testButton.disabled = false;
        }
      }
    },
    
    // Helper: Validate email format
    isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }
  };
  
  // Initialize when document is ready
  document.addEventListener('DOMContentLoaded', function() {
    window.emailSettings.initialize();
  });
})();