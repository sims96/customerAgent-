// index.js - Updated with email notification support and improved CORS handling
import { WhatsAppHandler } from './whatsappHandler.js';
import { RestaurantAI } from './restaurantAI.js';
import { MediaUploader } from './mediaUploader.js';
import { MenuManager } from './menuManager.js'; 
import { DashboardAPI } from './dashboardApi.js';
import { EmailService } from './emailService.js';

export default {
    async fetch(request, env, ctx) {
        try {
            console.log('Received request:', request.method, request.url);
            const url = new URL(request.url);

            // Handle OPTIONS requests globally for CORS
            if (request.method === 'OPTIONS') {
                console.log('Handling global OPTIONS request for CORS preflight');
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

            // Check if this is a dashboard API request
            if (url.pathname.startsWith('/api/')) {
                console.log('Routing to dashboard API:', url.pathname);
                
                // Special endpoint for sending WhatsApp messages
                if (url.pathname === '/api/whatsapp/send' && request.method === 'POST') {
                    console.log('Processing WhatsApp send request');
                    
                    // Verify API key
                    const authHeader = request.headers.get('Authorization');
                    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.substring(7) !== env.ADMIN_API_KEY) {
                        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                            status: 401,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            }
                        });
                    }
                    
                    try {
                        const data = await request.json();
                        if (!data.userId || !data.message) {
                            return new Response(JSON.stringify({ error: 'Missing userId or message' }), {
                                status: 400,
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Access-Control-Allow-Origin': '*'
                                }
                            });
                        }
                        
                        // Create handler and send message
                        const handler = new WhatsAppHandler(env);
                        await handler.sendWhatsAppMessage(data.userId, {
                            type: 'text',
                            content: data.message
                        });
                        
                        return new Response(JSON.stringify({ 
                            success: true,
                            message: 'WhatsApp message sent'
                        }), {
                            status: 200,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            }
                        });
                    } catch (error) {
                        console.error('Error sending WhatsApp message:', error);
                        return new Response(JSON.stringify({ 
                            error: 'Failed to send WhatsApp message',
                            message: error.message 
                        }), {
                            status: 500,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            }
                        });
                    }
                }
                
                // Regular dashboard API requests
                const dashboardAPI = new DashboardAPI(env);
                return await dashboardAPI.handleRequest(request, url);
            }

            // Create WhatsAppHandler
            const handler = new WhatsAppHandler(env);
            
            // Create and link MenuManager
            const menuManager = new MenuManager(
                env.WHATSAPP_ACCESS_TOKEN, 
                env.WHATSAPP_PHONE_NUMBER_ID,
                env.CHAT_HISTORY
            );
            
            // Set MediaUploader in MenuManager to use the one from WhatsAppHandler
            menuManager.mediaUploader = handler.mediaUploader;
            
            // Set MenuManager in WhatsAppHandler
            handler.menuManager = menuManager;
            
            // Create RestaurantAI with both Deepseek and Resend API keys
            const restaurantAI = new RestaurantAI(
                env.DEEPSEEK_API_KEY, 
                env.CHAT_HISTORY,
                env.RESEND_API_KEY  // Pass Resend API key for email notifications
            );

            // Set RestaurantAI in handler
            handler.setRestaurantAI(restaurantAI);

            // Special endpoint to manually set the menu ID
            if (request.method === 'GET' && url.pathname === '/admin/set-menu-id') {
                // Verify admin API key
                const authHeader = request.headers.get('Authorization');
                if (authHeader !== `Bearer ${env.ADMIN_API_KEY}`) {
                    return new Response('Unauthorized', { status: 401 });
                }
                
                // Get the media ID from the URL parameter
                const mediaId = url.searchParams.get('id');
                if (!mediaId) {
                    return new Response('Missing media ID parameter', { status: 400 });
                }
                
                try {
                    console.log('Admin setting menu ID manually:', mediaId);
                    // Store the media ID in KV
                    await env.CHAT_HISTORY.put('whatsapp_menu_media_id', mediaId, {
                        expirationTtl: 86400 * 30 // 30 days
                    });
                    
                    // Test retrieving the value to verify it was set
                    const storedId = await env.CHAT_HISTORY.get('whatsapp_menu_media_id');
                    console.log('Verification - retrieved menu ID:', storedId);
                    
                    return new Response(JSON.stringify({
                        success: true,
                        message: `Menu ID ${mediaId} set successfully`,
                        verified: storedId === mediaId
                    }), {
                        status: 200,
                        headers: { 
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                        }
                    });
                } catch (error) {
                    console.error('Error setting menu ID:', error);
                    return new Response(JSON.stringify({
                        success: false,
                        error: error.message
                    }), {
                        status: 500,
                        headers: { 
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                        }
                    });
                }
            }

            // Special endpoint to test email sending
            if (request.method === 'GET' && url.pathname === '/admin/test-email') {
                // Verify admin API key
                const authHeader = request.headers.get('Authorization');
                if (authHeader !== `Bearer ${env.ADMIN_API_KEY}`) {
                    return new Response('Unauthorized', { status: 401 });
                }
                
                // Get the email address from the URL parameter
                const email = url.searchParams.get('email');
                if (!email) {
                    return new Response('Missing email parameter', { status: 400 });
                }
                
                try {
                    console.log('Admin sending test email to:', email);
                    
                    // Create EmailService instance
                    const emailService = new EmailService(env.RESEND_API_KEY);
                    
                    // Generate test email content
                    const htmlContent = emailService.generateNotificationEmail(
                        'system',
                        'Test Email from LeSims Dashboard',
                        'This is a test email to verify your email notification configuration is working correctly.',
                        null
                    );
                    
                    // Send the email
                    const result = await emailService.sendEmail(
                        email,
                        'LeSims Dashboard - Test Email',
                        htmlContent
                    );
                    
                    return new Response(JSON.stringify({
                        success: true,
                        message: `Test email sent successfully to ${email}`,
                        id: result.id
                    }), {
                        status: 200,
                        headers: { 
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        }
                    });
                } catch (error) {
                    console.error('Error sending test email:', error);
                    return new Response(JSON.stringify({
                        success: false,
                        error: error.message
                    }), {
                        status: 500,
                        headers: { 
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        }
                    });
                }
            }

            // Check and initialize menu if needed
            try {
                const menuId = await menuManager.getStoredMenuId();
                if (!menuId) {
                    console.log('No menu ID found, but not attempting automatic upload');
                }
            } catch (menuError) {
                console.error('Error initializing menu:', menuError);
            }

            // Handle the WhatsApp webhook requests
            switch (request.method) {
                case 'GET':
                    return await handler.verifyWebhook(request);
                case 'POST':
                    return await handler.handleWebhook(request, ctx);
                default:
                    return new Response('Method not allowed', { 
                        status: 405,
                        headers: {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                        }
                    });
            }
        } catch (error) {
            console.error('Error in fetch:', error);
            console.error('Error stack:', error.stack);
            return new Response('Internal Server Error', { 
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }
    }
};