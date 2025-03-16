// emailService.js - Email notification service using Resend
export class EmailService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.resend.com/emails';
    
    // Correctly configured domain - verified in Resend dashboard
    this.fromDomain = 'complexelesims.com';
    this.fromEmail = `notifications@${this.fromDomain}`;
    
    this.defaultTestEmail = 'simondomfabrice@gmail.com';
    
    // Add validation to catch typos
    const validatedDomain = this.fromDomain.trim().toLowerCase();
    console.log(`EmailService initialized with domain: "${validatedDomain}"`);
  }

  async sendEmail(to, subject, htmlContent) {
    try {
      console.log(`Sending email to ${to}`);
      
      // Create the from field with proper formatted name and domain
      const fromField = `LeSims Restaurant <${this.fromEmail}>`;
      
      // Add explicit domain debugging
      console.log('----- EMAIL DOMAIN DEBUG -----');
      console.log('Domain being used:', this.fromDomain);
      console.log('From email:', this.fromEmail);
      console.log('Full from field:', fromField);
      console.log('-----------------------------');
      
      // Log request details
      console.log(`Request to Resend API:
        URL: ${this.baseUrl}
        From: ${fromField}
        To: ${to}
        Subject: ${subject}
        Content length: ${htmlContent.length} characters
      `);
      
      // Create the request body
      const requestBody = {
        from: fromField,
        to,
        subject,
        html: htmlContent
      };
      
      console.log('API request body:', JSON.stringify(requestBody, null, 2));
      
      const startTime = Date.now();
      
      // Set a timeout in case the request hangs
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20-second timeout
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Log response time and status
      console.log(`Email API response received in ${Date.now() - startTime}ms with status ${response.status}`);
      
      if (!response.ok) {
        // Get response as text first to ensure we capture the error details
        const responseText = await response.text();
        console.error('API Error Response:', responseText);
        
        let errorData;
        try {
          // Try to parse as JSON if possible
          errorData = JSON.parse(responseText);
          console.error('Parsed API error:', errorData);
        } catch (e) {
          // If not JSON, use the raw text
          errorData = { error: responseText };
          console.error('Raw API error (not JSON):', responseText);
        }
        
        // Check for common error types
        if (response.status === 403 && responseText.includes('domain is not verified')) {
          console.error('DOMAIN VERIFICATION ERROR: The domain appears to be unverified by Resend');
          console.error('Please check your domain spelling and verification status in Resend dashboard');
        } else if (response.status === 429) {
          console.error('RATE LIMIT EXCEEDED: Email provider is rate limiting requests');
        } else if (responseText.includes('quota') || responseText.includes('limit')) {
          console.error('QUOTA ERROR: Email provider quota or limit may be exceeded');
        }
        
        throw new Error(`Resend API error: ${response.status} - ${responseText}`);
      }
  
      const data = await response.json();
      console.log(`Email sent successfully to ${to}, ID: ${data.id}`);
      return data;
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
      
      // Add more context to the error
      error.recipientEmail = to;
      error.apiKey = this.apiKey ? `${this.apiKey.substring(0, 5)}...` : 'missing';
      error.fromEmail = this.fromEmail;
      error.fromDomain = this.fromDomain;
      error.responseText = error.message;
      
      throw error;
    }
  }

  // Send to multiple recipients
  async sendBulkEmails(recipients, subject, htmlContent) {
    if (!recipients || recipients.length === 0) {
      console.log('No recipients provided for bulk email');
      return [];
    }
    
    console.log(`Sending bulk email to ${recipients.length} recipients`);
    
    // For multiple recipients
    const promises = recipients.map(recipient => 
      this.sendEmail(recipient, subject, htmlContent)
    );
    
    // Wait for all emails to be sent
    return Promise.allSettled(promises);
  }

  // Generate HTML email content with dashboard link
  generateNotificationEmail(notificationType, title, body, userId) {
    // Dashboard base URL with your specific URL
    const dashboardBaseUrl = 'http://customer-agent.pages.dev';
    
    // Create deep link to the specific conversation if userId exists
    const dashboardUrl = userId ? 
      `${dashboardBaseUrl}/?chat=${encodeURIComponent(userId)}` : 
      dashboardBaseUrl;
      
    // Backend API URL
    const apiUrl = 'https://restaurant-ai-worker.simondomfabrice.workers.dev';
    
    // Set icon based on notification type
    let iconName = 'bell';
    let accentColor = '#9370DB'; // Purple
    
    if (notificationType === 'help_needed') {
      iconName = 'question-circle';
      accentColor = '#ff4d4d'; // Red
    } else if (notificationType === 'order_confirmed') {
      iconName = 'shopping-cart';
      accentColor = '#4da6ff'; // Blue
    }
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 0;
            }
            .header { 
              background: linear-gradient(135deg, #FF69B4, ${accentColor}); 
              padding: 20px; 
              color: white; 
              border-radius: 5px 5px 0 0;
              text-align: center;
            }
            .content { 
              padding: 20px; 
              border: 1px solid #ddd; 
              border-top: none; 
              border-radius: 0 0 5px 5px;
              background-color: #fff;
            }
            .button { 
              display: inline-block; 
              background: linear-gradient(135deg, #FF69B4, ${accentColor}); 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 4px;
              font-weight: bold;
              margin-top: 15px;
            }
            .button:hover {
              opacity: 0.9;
            }
            .footer {
              margin-top: 20px;
              font-size: 12px;
              color: #888;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>LeSims Restaurant Dashboard</h1>
            </div>
            <div class="content">
              <h2>${title}</h2>
              <p>${body}</p>
              <p>
                <a href="${dashboardUrl}" class="button">View in Dashboard</a>
              </p>
              <div class="footer">
                <p>This is an automated notification from the LeSims Restaurant Dashboard.</p>
                <p style="font-size:10px; color:#999;">Powered by Complexe LeSims AI</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}