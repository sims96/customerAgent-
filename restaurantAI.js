export class ConversationManager {
  constructor(kvNamespace) {
    if (!kvNamespace) {
      throw new Error('KV namespace is required for ConversationManager');
    }
    this.kv = kvNamespace;
    this.maxHistoryLength = 30;
    this.expirationTtl = 60 * 60 * 24; // 24 hours in seconds
  }

  async getUserHistory(userId) {
    try {
      const history = await this.kv.get(`chat_history:${userId}`, 'json');
      return history || [];
    } catch (error) {
      console.error('Error getting user history:', error);
      return [];
    }
  }

  async getMetadata(userId) {
    try {
      const metadata = await this.kv.get(`chat_metadata:${userId}`, 'json');
      return metadata || {
        status: 'ai-handled',
        handledBy: 'ai-agent',
        createdAt: Date.now(),
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('Error getting metadata:', error);
      return {
        status: 'ai-handled',
        handledBy: 'ai-agent', 
        createdAt: Date.now(),
        lastUpdated: Date.now()
      };
    }
  }

  async updateMetadata(userId, updates) {
    try {
      const currentMetadata = await this.getMetadata(userId);
      const updatedMetadata = {
        ...currentMetadata,
        ...updates,
        lastUpdated: Date.now()
      };

      await this.kv.put(
        `chat_metadata:${userId}`,
        JSON.stringify(updatedMetadata),
        { expirationTtl: this.expirationTtl }
      );

      return updatedMetadata;
    } catch (error) {
      console.error('Error updating metadata:', error);
      throw error;
    }
  }

  async addToHistory(userId, role, content, metadata = {}) {
    try {
      let history = await this.getUserHistory(userId);
      
      // Create message with timestamp and any additional metadata
      const message = { 
        role, 
        content,
        timestamp: Date.now(),
        ...metadata
      };
      
      history.push(message);
      
      // Keep only the last N messages
      if (history.length > this.maxHistoryLength) {
        history = history.slice(-this.maxHistoryLength);
      }

      // Store in KV with expiration
      await this.kv.put(
        `chat_history:${userId}`, 
        JSON.stringify(history), 
        { expirationTtl: this.expirationTtl }
      );

      // Update conversation metadata if this is a new conversation
      if (history.length === 1) {
        await this.updateMetadata(userId, {
          createdAt: message.timestamp,
          status: 'ai-handled',
          handledBy: 'ai-agent'
        });
      } else {
        // Just update the last activity timestamp
        await this.updateMetadata(userId, {
          lastUpdated: message.timestamp
        });
      }

      return history;
    } catch (error) {
      console.error('Error adding to history:', error);
      throw error;
    }
  }

  async getContext(userId) {
    return await this.getUserHistory(userId);
  }

  async clearHistory(userId) {
    try {
      await this.kv.delete(`chat_history:${userId}`);
      // Consider whether to keep or delete metadata when clearing history
      // For now, we'll keep metadata but update status
      await this.updateMetadata(userId, {
        status: 'closed',
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('Error clearing history:', error);
      throw error;
    }
  }

  // Get all active conversations (for dashboard)
  async listActiveConversations(limit = 100) {
    try {
      // List all chat history keys
      const keys = await this.kv.list({ prefix: 'chat_history:' });
      const conversations = [];
      
      for (const key of keys.keys) {
        // Extract user ID from key
        const userId = key.name.split(':')[1];
        if (!userId) continue;
        
        // Get metadata for this conversation
        const metadata = await this.getMetadata(userId);
        
        // Get the last message
        const history = await this.getUserHistory(userId);
        const lastMessage = history.length > 0 ? history[history.length - 1] : null;
        
        conversations.push({
          userId,
          metadata,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            role: lastMessage.role,
            timestamp: lastMessage.timestamp
          } : null,
          messageCount: history.length
        });
      }
      
      // Sort by most recent activity first
      conversations.sort((a, b) => 
        (b.metadata.lastUpdated || 0) - (a.metadata.lastUpdated || 0)
      );
      
      // Return limited number of conversations
      return conversations.slice(0, limit);
    } catch (error) {
      console.error('Error listing conversations:', error);
      return [];
    }
  }
}

export class RestaurantAI {
constructor(apiKey, kvNamespace, resendApiKey = '') {
    if (!apiKey) {
        throw new Error('API key is required for RestaurantAI');
    }
    if (!kvNamespace) {
        throw new Error('KV namespace is required for RestaurantAI');
    }

    this.apiKey = apiKey;
    this.resendApiKey = resendApiKey;
    this.conversationManager = new ConversationManager(kvNamespace);
    
    // Import EmailService if we have a Resend API key
    if (this.resendApiKey) {
        import('./emailService.js').then(module => {
            this.emailService = new module.EmailService(this.resendApiKey);
            console.log('Email service initialized with Resend API');
        }).catch(err => {
            console.error('Error initializing email service:', err);
            this.emailService = null;
        });
    } else {
        this.emailService = null;
    }

  this.menuResponse = `merci de demander, Voici notre menu. `;

  this.systemPrompt = `Tu es un employé du restaurant Complexe LeSims. Ton rôle est de comprendre les demandes des clients et de répondre de manière professionnelle tout enssayant de mimiquer un vrai employe humain dans tes reponses. Tu dois donner les prix en francs CFA, par exemple 1500 francs CFA signifie 1500 francs CFA.

Tu dois être poli, amiable, aimant, etre precis et concis dans tes reponses, avoir un peu d'humour occasionellement, patient et serviable. Si le client ecrit ou parle en anglais tu reponds en anglais et si c'est en francais tu reponds en francais. 


Voici notre menu complet:

SALADES:
- Trio de légumes (carottes, laitue, chou rouge): 1000 francs CFA
- Salade de gésiers (poivrons, oignons, gésiers, cornichons, laitue): 1500 francs CFA
- Cocktail d'avocat oeuf dur (avocat, crevettes, oeuf dur, sauce cocktail): 2000 francs CFA
- Salade du chef: 2000 francs CFA

PÂTES:
- Spaghettis bolognaise (spaghetti avec viande hachée et sauce tomate): 1500 francs CFA
- Saute viande pommes/plantains (pommes, plantain et viandes sauté à la tomate): 1500 francs CFA
- Tagliatelle à la carbonara (avec crème fraîche et lardons): 2500 francs CFA

BURGERS:
- Hamburger: 1500 francs CFA
- Cheese burger: 2000 francs CFA
- Chiken burger: 2500 francs CFA
- Double cheese burger: 3000 francs CFA
- Burger xxl: 3500 francs CFA

KFC FOOD:
- Poulet Royal bacon (Blanc de poulet pané, bacon, fromage): 3000 francs CFA
- Spicy chiken (Poulet épicé pané): 3000 francs CFA
- Chiken Wings (Ailes de poulet pané): 3000 francs CFA

POULET GRILLÉ:
- Poulet grillé (1/4): 2500 francs CFA
- Poulet grillé (1/2): 4500 francs CFA
- Poulet grillé (entier): 9500 francs CFA

POULET AVEC SAUCES:
- Sauce forestière (1/4: 3500 francs CFA, 1/2: 5500 francs CFA, entier: 10500 francs CFA)
- Sauce poivre vert (1/4: 3000 francs CFA, 1/2: 5000 francs CFA, entier: 10000 francs CFA)
- Sauce provinciale (1/4: 3000 francs CFA, 1/2: 5000 francs CFA, entier: 10000 francs CFA)

POULET PANÉ:
- Poulet pané (1/4): 3000 francs CFA
- Poulet pané (1/2): 5000 francs CFA
- Poulet pané (entier): 10000 francs CFA

POISSON:
- Poisson friture (plus sauce aux oignons): 1500 francs CFA
- Maquereau grillé: 2000 francs CFA
- Bar grillé à la poêle: 2500 francs CFA

PORC:
- Côte de porc grillées: 2500 francs CFA
- Côte de porc à la sauce provinciale: 3000 francs CFA
- Côte de porc à la sauce forestière: 3500 francs CFA

BOEUF:
- Saute viande pommes/plantains: 1000 francs CFA
- Brochettes de boeuf: 2000 francs CFA
- Steak grillé sauce au poivre vert: 2500 francs CFA
- Filet de boeuf sauce marchand de vin: 2500 francs CFA
- Saucisse de boeuf: 3000 francs CFA
- Émincés de boeuf aux fines herbes: 2500 francs CFA
- Émincés de boeuf stroganoff: 3000 francs CFA

SPÉCIALITÉS AFRICAINES:
- Ndole SAWA: 2000 francs CFA
- Eru: 1000 francs CFA ET 1500 francs CFA
- Taro et bouillon (uniquement le weekend)

PIZZA (Petit/Moyen/Grand):
- Regina (jambon, fromage, champignons, tomates): 3500 francs CFA/5000 francs CFA
- Pizza BBQ: 2500 francs CFA/3500 francs CFA/5000 francs CFA
- Végétarienne: 2500 francs CFA/3500 francs CFA/5000 francs CFA
- Pizza mozzarella: 2500 francs CFA/3500 francs CFA/5000 francs CFA
- Pizza sims: 2500 francs CFA/3500 francs CFA/5000 francs CFA
- Pizza paysanne: 2500 francs CFA/3500 francs CFA/5000 francs CFA
- Pizza dolce vita: 3500 francs CFA/5000 francs CFA
- Pizza Savoyarde: 3500 francs CFA/5000 francs CFA
- Lorsque le client sollicite une pizza avec du fromage, 500 francs CFA sont ajoutés au prix de la pizza

SHAWARMA:
- Shawarma viande: 1000 francs CFA
- Shawarma xxl: 2000 francs CFA

DESSERTS:
- Mousse au chocolat: 1500 francs CFA
- Crêpes sucrées: 1000 francs CFA
- Fruits de saison: 1000 francs CFA

GLACES:
- Cornet: 300 francs CFA
- Petit pot: 500 francs CFA
- Pot moyen: 1000 francs CFA
- Grand pot: 1500 francs CFA

JUS DE FRUITS:
- Jus d'orange(orange): 500 francs CFA
- Jus d'ananas(ananas): 500 francs CFA
- Jus de pastèque(pasteque): 500 francs CFA
- Cocktail: 500 francs CFA

NOS PACKAGES:
Package 1 (2500 francs CFA): Mini Burger Frite Pomme, Rissoles aux Légumes + Poisson, Un Jus de Fruit
Package 2 (3000 francs CFA): Cuisse de Poulet Pané Épicé + Pomme, Tacos Viande + Pomme, Un Jus Cola 0,5ML
Package 3 (2500 francs CFA): Poisson Sauce Basquaise + Riz, Crêpe Melba, Jus d'Oseille
Package 4 (10000 francs CFA): Mix Grille, Une Saucisse, Un 1/4 de Poulet, Une Côte de Porc, 2 Brochettes, Une Pizza Margharita (Pomme + Plantain)
Package 5 (3500 francs CFA): Ndomba de Porc + Plantain/Pomme, Cassade de Fruit
Package 6 (4000 francs CFA): Pizza BBQ, Glace Vanille, Pirogue d'Ananas
Package 7: Gésier Roti à l'Ail + Riz (1000 francs CFA), Rôti de Poulet + Frites (500 francs CFA), Glace (1000 francs CFA)

NOS BOISSONS:
Moët impérial: 60,000 francs CFA
Moët nectar: 75,000 francs CFA
Veuve clicquot: 75,000 francs CFA
Ruinart brut: 90,000 francs CFA
Ruinart blanc: 80,000 francs CFA
Mumm Olympe: 80,000 francs CFA
Mumm classique: 55,000 francs CFA
Belair classique: 50,000 francs CFA
Belair rose: 55,000 francs CFA
Belair gold: 55,000 francs CFA
Belair fantôme: 60,000 francs CFA
Dom Pérignon: 200,000 francs CFA
Castel ice: 15,000 francs CFA
JP Chenet: 20,000 francs CFA
Veuve de vernay: 20,000 francs CFA
Paul Arras: 15,000 francs CFA
Pearlent: 20,000 francs CFA
Consigna: 10,000 francs CFA
Tour de Canteloup: 7,500 francs CFA
Bière: 1,000 francs CFA
Eau: 1,000 francs CFA
Smouth, Isenbek, Heineken, Booster (Grand modèle): 1,500 francs CFA
Vieux moulin: 5,000 francs CFA
Chi Cha: 3,000 francs CFA
Grande Guinness: 2,000 francs CFA

Informations importantes:
- Horaires d'ouverture: 12h à 6h du lundi au dimanche
- Adresse: Yaoundé, Soa Fin Goudron
- Service de livraison disponible au (237) 655 232 584
- Temps de livraison: 30 minutes à 1 heure
- Temps de préparation: 20 à 40 minutes
- le service de livraison est disponible de 12h à 2h du lundi au dimanche
- Nous acceptons les paiements en espèces et par Orange Money
- les commandese peuvent être payées à la livraison
- Nous offrons des réductions pour les commandes en gros
- Toutes commandes du poulet et du poisson sont accompagnées des complements, portion de frites de pommes de terre ou de plantains ou de riz.
- Si le client demande une portion supplémentaire des complements, il doit payer 500 francs CFA en plus pour chaque portion supplémentaire.
- Les frais relatifs à la livraison sont les frais de transport en moyen 500 francs CFA mais peuvent aussi varier en fonction de la distance et le cout de la gamelle qui est a 200 franc CFA par unites et 150 franc CFA a partir de 2 unites. 

A propos de Complexe LeSims:
- le complexe lesims "all in one" est une entreprise qui fait dans la restauration, a des jeux de loisirs tel  que le billard, le ludo, jeu de dames, les echecs, les cartes, le babyfoot. A parir de 20h notre louange est pret avec de la bonne musiques disco et animation par des dj professionnels dans une  atmosphere electique jusqu'a l'aube.
- Complexe LeSims est un restaurant familial qui propose une variété de plats africains et occidentaux.
- Nous sommes fiers de servir des plats frais et délicieux à des prix abordables.
- Notre équipe est dévouée à offrir un service exception
- Nous accuillons les groupes pour des événements spéciaux et des fêtes d'anniversaire.


Options et Restrictions:
- Possibilité de plats végétariens sur demande
- Informez-nous de vos allergies alimentaires
- Options sans gluten disponibles
- Réservations de groupe acceptées (appelez à l'avance)

Réponses standards:
Q: Comment allez-vous/comment cava/vous allez bien/comment vas tu?
R: Je vais bien merci et vous?

Q: Je veux/j'aimerai passer une commande
R: Bien sûr, que voulez-vous commander?

Q: Ce sera tout/ca va/c'est tout/c'est bon
R: Merci! Votre commande a été prise en charge. À bientôt!

Q: La commande est-elle prête?/est-ce que ma commande est prête?/est-ce que c'est prêt?/c'est prêt?/c'est bon?
R: Votre commande sera prête dans un instant. Merci pour votre patience.

Q: Quel repas ne met pas long?
R: Le Poulet Grillé (1/4) à 2500 francs CFA.

Les clients peuvent utiliser différentes formulations pour exprimer la même chose. Par exemple, 'Je veux un poulet grillé' et 'Je voudrais commander du poulet rôti' signifient la même chose. Sers-toi de ce menu pour répondre aux questions concernant le menu du complexe LeSims ou demande des précisions au client si nécessaire.`;
}

async askAI(userId, prompt) {
  console.log('askAI called with prompt:', prompt);
  const retryOptions = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000
  };

  let lastError;

  for (let attempt = 0; attempt < retryOptions.maxRetries; attempt++) {
      try {
          // Get conversation history for this user
          const context = await this.conversationManager.getContext(userId);

          const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${this.apiKey}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  model: "deepseek-chat",
                  messages: [
                      { role: "system", content: this.systemPrompt },
                      ...context,
                      { role: "user", content: prompt }
                  ],
                  language: "fr"
              })
          });

          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`API request failed: ${response.status} ${errorData.error?.message || response.statusText}`);
          }

          const data = await response.json();
          console.log('askAI response data:', data);
          return data.choices[0].message.content;
      } catch (error) {
          lastError = error;

          if (attempt === retryOptions.maxRetries - 1) {
              throw error;
          }

          const delay = Math.min(
              retryOptions.baseDelay * Math.pow(2, attempt),
              retryOptions.maxDelay
          );

          await new Promise(resolve => setTimeout(resolve, delay));
      }
  }

  throw lastError;
}

// Add this method to get email recipients
async getEmailRecipients() {
  try {
    console.log('RestaurantAI: Retrieving email recipients from KV');
    
    // Get raw data as string
    const rawData = await this.conversationManager.kv.get('staff_email_recipients');
    console.log('Raw email recipients data:', rawData);
    
    // If no data found, return default
    if (!rawData) {
      console.log('No email recipients found in KV, returning default structure');
      return {
        notifications: {
          help_needed: [],
          order_confirmed: [],
          all: []
        }
      };
    }
    
    // Try to parse as JSON
    try {
      const recipients = JSON.parse(rawData);
      console.log('Parsed recipients:', recipients);
      return recipients;
    } catch (parseError) {
      console.error('Error parsing recipients JSON:', parseError);
      return {
        notifications: {
          help_needed: [],
          order_confirmed: [],
          all: []
        }
      };
    }
  } catch (error) {
    console.error('Error getting email recipients:', error);
    return {
      notifications: {
        help_needed: [],
        order_confirmed: [],
        all: []
      }
    };
  }
}


// Add this method to send email notifications
async sendEmailNotification(notification) {
  // Skip if email service isn't initialized
  if (!this.emailService) {
    console.log('Email service not initialized, skipping email notification');
    return;
  }
  
  try {
    console.log(`Sending email notification for type: ${notification.type}`);
    
    // Get raw data from KV store
    const rawData = await this.conversationManager.kv.get('staff_email_recipients');
    console.log('Raw email recipients data:', rawData);
    
    let recipientsData;
    try {
      recipientsData = rawData ? JSON.parse(rawData) : null;
    } catch (parseError) {
      console.error('Error parsing recipients JSON:', parseError);
      recipientsData = null;
    }
    
    // Check what structure we have and normalize it
    let normalizedRecipients;
    
    if (recipientsData) {
      if (recipientsData.notifications) {
        // It's already in the expected structure
        normalizedRecipients = recipientsData.notifications;
        console.log('Using existing notifications structure from KV');
      } else if (Array.isArray(recipientsData.all)) {
        // It has a direct structure without the notifications wrapper
        normalizedRecipients = recipientsData;
        console.log('Using direct email lists without notifications wrapper');
      } else {
        // Unknown structure - use empty defaults
        normalizedRecipients = { help_needed: [], order_confirmed: [], all: [] };
        console.log('Unknown data structure in KV, using defaults');
      }
    } else {
      // No data found - use empty defaults
      normalizedRecipients = { help_needed: [], order_confirmed: [], all: [] };
      console.log('No recipient data found in KV, using defaults');
    }
    
    console.log('Normalized recipients structure:', JSON.stringify(normalizedRecipients));
    
    // Determine which recipients should get this notification
    // IMPORTANT: First create a copy of the arrays to avoid modifying original data
    let recipients = [...(normalizedRecipients.all || [])];
    console.log(`Recipients from 'all' category: ${JSON.stringify(recipients)}`);
    
    // Add type-specific recipients
    if (notification.type === 'help_needed' && normalizedRecipients.help_needed) {
      recipients = [...recipients, ...normalizedRecipients.help_needed];
      console.log(`Added ${normalizedRecipients.help_needed.length} help_needed recipients`);
    } else if (notification.type === 'order_confirmed' && normalizedRecipients.order_confirmed) {
      recipients = [...recipients, ...normalizedRecipients.order_confirmed];
      console.log(`Added ${normalizedRecipients.order_confirmed.length} order_confirmed recipients`);
    }
    
    // Add default email for testing/backup
    const defaultEmail = 'simondomfabrice@gmail.com';
    if (!recipients.includes(defaultEmail)) {
      recipients.push(defaultEmail);
      console.log(`Added default email: ${defaultEmail}`);
    }
    
    // Deduplicate recipients
    recipients = [...new Set(recipients)];
    console.log(`Final recipient list (${recipients.length}): ${JSON.stringify(recipients)}`);
    
    if (recipients.length === 0) {
      console.log('No email recipients configured for notification type:', notification.type);
      return;
    }
    
    // Generate email content
    const emailContent = this.emailService.generateNotificationEmail(
      notification.type,
      notification.title,
      notification.body,
      notification.userId
    );
    
    // Send emails individually with better error handling
    let successCount = 0;
    for (const recipient of recipients) {
      try {
        console.log(`Sending email to recipient: ${recipient}`);
        await this.emailService.sendEmail(
          recipient,
          `LeSims Dashboard: ${notification.title}`,
          emailContent
        );
        console.log(`✅ Email sent successfully to ${recipient}`);
        successCount++;
      } catch (emailError) {
        console.error(`❌ Failed to send email to ${recipient}:`, emailError);
        // Try to extract useful error info
        const errorMessage = emailError.message || 'Unknown error';
        const responseText = emailError.responseText || '';
        console.error(`Error details: ${errorMessage} | ${responseText}`);
      }
    }
    
    console.log(`Email notification process completed. Sent ${successCount}/${recipients.length} emails successfully`);
  } catch (error) {
    console.error('Error in sendEmailNotification:', error);
  }
}

async checkMessageForNotification(userId, messageType, content) {
  // Skip for non-text messages
  if (messageType !== 'text') return null;

  // Add debug logging for notification checking
  console.log(`Checking message for notification triggers: userId=${userId}, content="${content.substring(0, 30)}..."`);

  // Convert to lowercase for easier matching
  const lowerContent = content.toLowerCase();

  try {
    // Enhanced help detection - more keywords, especially in French
    const helpPhrases = [
      "help", "aide", "besoin", "need", "assist", "support",
      "question", "problème", "problem", "urgent", "important",
      "comment", "how", "pourquoi", "why", "quand", "when",
      "où", "where", "qui", "who", "aidez", "help me",
      "s'il vous plaît", "please", "merci", "thanks",
      "pouvez-vous", "can you", "pourriez-vous", "could you",
      "je ne comprends pas", "i don't understand",
      "expliquer", "explain", "clarifier", "clarify"
    ];
    
    // Order detection phrases
    const orderPhrases = [
      "commander", "commande", "acheter", "order", "buy", 
      "j'aimerais", "je voudrais", "i would like", "i want",
      "menu", "prix", "price", "coût", "cost",
      "livraison", "delivery", "emporter", "takeout"
    ];
    
    // Direct help requests detection (stronger signals)
    const directHelpRequests = [
      "help me", "aidez-moi", "besoin d'aide", "need help",
      "s'il vous plaît", "please help", "pouvez-vous m'aider",
      "can you help", "j'ai besoin", "i need"
    ];
    
    // Get the conversation history to check context
    const context = await this.conversationManager.getContext(userId);
    
    // Check for direct help request in the current message
    const isDirectHelpRequest = directHelpRequests.some(phrase => 
      lowerContent.includes(phrase)
    );
    
    if (isDirectHelpRequest) {
      console.log(`Direct help request detected from user ${userId}: "${content.substring(0, 50)}..."`);
      
      const notificationInfo = {
        type: 'help_needed',
        title: 'Customer Needs Help',
        body: `Customer ${userId} is explicitly asking for help: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
        userId,
        urgent: true,
        lastMessage: content
      };
      
      // Create notification in KV
      const timestamp = Date.now().toString();
      const id = `${timestamp}-${Math.random().toString(36).substring(2, 10)}`;
      
      await this.conversationManager.kv.put(
          `notification:undelivered:${id}`,
          JSON.stringify({
              id,
              ...notificationInfo,
              timestamp: Date.now()
          }),
          { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
      );
      
      // Send email notification
      await this.sendEmailNotification(notificationInfo);
      
      console.log(`Created notification ${id} for help request from user ${userId} and sent email notification`);
      
      return notificationInfo;
    }
    
    // If we don't have enough context, check for help phrases in the current message
    if (context.length < 2) {
      // If the message contains multiple help phrases, it's likely a help request
      const helpPhraseCount = helpPhrases.filter(phrase => 
        lowerContent.includes(phrase)
      ).length;
      
      if (helpPhraseCount >= 2) {
        console.log(`Help request detected (based on multiple help phrases) from user ${userId}`);
        
        const notificationInfo = {
          type: 'help_needed',
          title: 'Customer Likely Needs Help',
          body: `Customer ${userId} used multiple help-related phrases: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
          userId,
          urgent: true,
          lastMessage: content
        };
        
        // Create notification in KV
        const timestamp = Date.now().toString();
        const id = `${timestamp}-${Math.random().toString(36).substring(2, 10)}`;
        
        await this.conversationManager.kv.put(
            `notification:undelivered:${id}`,
            JSON.stringify({
                id,
                ...notificationInfo,
                timestamp: Date.now()
            }),
            { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
        );
        
        // Send email notification
        await this.sendEmailNotification(notificationInfo);
        
        console.log(`Created notification ${id} for likely help request from user ${userId} and sent email notification`);
        
        return notificationInfo;
      }
      
      return null;
    }
    
    // For established conversations, check the context pattern
    // Look for patterns where the user is asking something and the AI responds
    const lastTwoMessages = context.slice(-2);
    
    // Check for help context - user asks something then sends a follow-up with help phrases
    if (context.length >= 3) {
      const lastThreeMessages = context.slice(-3);
      
      // If the last message is from user after an AI response, and contains help phrases
      if (lastThreeMessages[1].role === 'assistant' && 
          lastThreeMessages[2].role === 'user') {
        
        const userFollowUp = lastThreeMessages[2].content.toLowerCase();
        const helpPhraseCount = helpPhrases.filter(phrase => 
          userFollowUp.includes(phrase)
        ).length;
        
        if (helpPhraseCount >= 1) {
          console.log(`Help request detected (follow-up after AI response) from user ${userId}`);
          
          const notificationInfo = {
            type: 'help_needed',
            title: 'Customer Needs Clarification',
            body: `Customer ${userId} is asking follow-up questions after AI response: "${userFollowUp.substring(0, 50)}${userFollowUp.length > 50 ? '...' : ''}"`,
            userId,
            urgent: false,
            lastMessage: userFollowUp
          };
          
          // Create notification in KV
          const timestamp = Date.now().toString();
          const id = `${timestamp}-${Math.random().toString(36).substring(2, 10)}`;
          
          await this.conversationManager.kv.put(
              `notification:undelivered:${id}`,
              JSON.stringify({
                  id,
                  ...notificationInfo,
                  timestamp: Date.now()
              }),
              { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
          );
          
          // Send email notification
          await this.sendEmailNotification(notificationInfo);
          
          console.log(`Created notification ${id} for clarification request from user ${userId} and sent email notification`);
          
          return notificationInfo;
        }
      }
    }
    
    // Only trigger on user messages followed by AI responses
    if (lastTwoMessages.length >= 2 && 
        lastTwoMessages[0].role === 'user' && 
        lastTwoMessages[1].role === 'assistant') {
      
      const userMessage = lastTwoMessages[0].content.toLowerCase();
      const aiResponse = lastTwoMessages[1].content.toLowerCase();
      
      // Check for uncertainty in AI response
      const uncertaintyPhrases = [
        "je ne comprends pas", "je ne peux pas", "je ne suis pas sûr", 
        "je ne sais pas", "je n'ai pas cette information", 
        "i don't understand", "i can't", "i'm not sure", 
        "i don't know", "i don't have that information",
        "désolé", "sorry", "malheureusement", "unfortunately"
      ];
      
      const aiUncertainty = uncertaintyPhrases.some(phrase => 
        aiResponse.includes(phrase)
      );
      
      if (aiUncertainty) {
        console.log(`AI uncertainty detected in response to user ${userId}`);
        
        const notificationInfo = {
          type: 'help_needed',
          title: 'AI Knowledge Gap',
          body: `Customer ${userId} asked something the AI is uncertain about: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}"`,
          userId,
          urgent: true,
          lastMessage: userMessage,
          aiResponse: aiResponse
        };
        
        // Create notification in KV
        const timestamp = Date.now().toString();
        const id = `${timestamp}-${Math.random().toString(36).substring(2, 10)}`;
        
        await this.conversationManager.kv.put(
            `notification:undelivered:${id}`,
            JSON.stringify({
                id,
                ...notificationInfo,
                timestamp: Date.now()
            }),
            { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
        );
        
        // Send email notification
        await this.sendEmailNotification(notificationInfo);
        
        console.log(`Created notification ${id} for AI knowledge gap for user ${userId} and sent email notification`);
        
        return notificationInfo;
      }
      
      // Check for order intentions
      const orderIntent = orderPhrases.some(phrase => 
        userMessage.includes(phrase)
      );
      
      const aiConfirmedOrder = aiResponse.includes('commande') || 
                              aiResponse.includes('confirmé') || 
                              aiResponse.includes('order') || 
                              aiResponse.includes('confirmed');
      
      if (orderIntent && aiConfirmedOrder) {
        console.log(`Order confirmation detected for user ${userId}`);
        
        const notificationInfo = {
          type: 'order_confirmed',
          title: 'New Order',
          body: `Customer ${userId} has placed an order that should be processed.`,
          userId,
          lastMessage: userMessage,
          aiResponse: aiResponse
        };
        
        // Create notification in KV
        const timestamp = Date.now().toString();
        const id = `${timestamp}-${Math.random().toString(36).substring(2, 10)}`;
        
        await this.conversationManager.kv.put(
            `notification:undelivered:${id}`,
            JSON.stringify({
                id,
                ...notificationInfo,
                timestamp: Date.now()
            }),
            { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
        );
        
        // Send email notification
        await this.sendEmailNotification(notificationInfo);
        
        console.log(`Created notification ${id} for order confirmation from user ${userId} and sent email notification`);
        
        return notificationInfo;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error checking message for notification:', error);
    return null;
  }
}


async handleMessage(userId, messageType, content) {
  console.log('restaurantAI.handleMessage called with type:', messageType, 'content:', content);
  try {
      if (messageType === 'text') {
          if (!content) {
              return {
                  type: "text",
                  content: "Désolé, je n'ai pas reçu de message. Pourriez-vous réessayer?"
              };
          }

          const lowerContent = content.toLowerCase();

          if (["exit", "quitter", "au revoir"].includes(lowerContent)) {
              return {
                  type: "text",
                  content: "Merci d'avoir choisi Complexe LeSims. À bientôt!"
              };
          }

          // Check metadata to see if this conversation is being handled by a human agent
          const metadata = await this.conversationManager.getMetadata(userId);
          
          // If a human agent is handling this conversation, we'll just store the message
          // but won't respond - the dashboard will show this message and a human will respond
          if (metadata.status === 'human-handled' && metadata.handledBy !== 'ai-agent') {
              // Just add the message to history
              await this.conversationManager.addToHistory(userId, "user", content);
              
              // Return special response indicating human should handle this
              return {
                  type: "human_handoff",
                  content: "Message received and waiting for human agent response.",
                  metadata: {
                      handledBy: metadata.handledBy,
                      status: 'awaiting-response'
                  }
              };
          }

          // Enhanced menu request detection
          if (["menu", "carte", "tarifs", "plats"].some(keyword => lowerContent.includes(keyword))) {
              // First send a text response
              const menuResponse = this.menuResponse;
              
              // Add the message to history
              await this.conversationManager.addToHistory(userId, "user", content);
              await this.conversationManager.addToHistory(userId, "assistant", menuResponse);
              
              // Then indicate we want to send the menu document
              return {
                  type: "document",
                  content: {
                      type: "menu_request",
                      text: menuResponse
                  }
              };
          }

          // Get AI response for other queries
          const response = await this.askAI(userId, content);

          // Update conversation history with timestamps
          await this.conversationManager.addToHistory(userId, "user", content);
          await this.conversationManager.addToHistory(userId, "assistant", response);
          
          // Check if this message should trigger a notification
          // We do this after the AI response so we can analyze both
          const notificationInfo = await this.checkMessageForNotification(userId, messageType, content);
          
          return {
              type: "text",
              content: response
          };
      }

      return {
          type: "text",
          content: "Type de message non pris en charge."
      };
  } catch (error) {
      console.error("Error handling message:", error);
      return {
          type: "text",
          content: "Désolé, une erreur s'est produite. Veuillez réessayer."
      };
  }
}

async clearConversation(userId) {
  await this.conversationManager.clearHistory(userId);
}
}