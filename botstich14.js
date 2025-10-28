/**
 * BotStitch - Customizable Chat Widget
 * Version 2.0 - Form Collection + Human Transfer
 */

const BotStitch = {
  config: {},
  sessionId: null,
  chatStartTime: null,
  timerInterval: null,
  pollingInterval: null,
  humanModeActive: false,
  userInfo: null,
  conversationHistory: [],

  /**
   * Initialize the chat widget
   */
  init: function(config) {
    this.config = config;
    this.sessionId = this.generateSessionId();
    
    // Load user info from localStorage if exists
    const savedUserInfo = localStorage.getItem('botStitch_userInfo_' + this.sessionId);
    if (savedUserInfo) {
      this.userInfo = JSON.parse(savedUserInfo);
    }
    
    // Check if form is required
    const formRequired = config.features?.formCollection?.enabled || false;
    
    if (formRequired && !this.userInfo) {
      // Show form first
      this.renderChatWithForm();
    } else {
      // Direct chat
      this.renderChat();
    }
    
    // Start timer if human transfer is enabled
    const humanTransferEnabled = config.features?.humanTransfer?.enabled || false;
    if (humanTransferEnabled) {
      this.chatStartTime = Date.now();
      this.startTimerCheck();
    }
    
    // Render chat button
    this.renderChatButton();
  },

  /**
   * Generate unique session ID
   */
  generateSessionId: function() {
    const existing = sessionStorage.getItem('botStitch_sessionId');
    if (existing) return existing;
    
    const newId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('botStitch_sessionId', newId);
    return newId;
  },

  /**
   * Render chat button
   */
  renderChatButton: function() {
    const buttonConfig = this.config.theme?.button || {};
    
    const button = document.createElement('div');
    button.id = 'botStitch-button';
    button.style.cssText = `
      position: fixed;
      bottom: ${buttonConfig.bottom || 20}px;
      right: ${buttonConfig.right || 20}px;
      width: ${buttonConfig.size || 60}px;
      height: ${buttonConfig.size || 60}px;
      background-color: ${buttonConfig.backgroundColor || '#1175D6'};
      border-radius: ${buttonConfig.borderRadius === 'rounded' ? '50%' : '12px'};
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      transition: transform 0.3s ease;
    `;
    
    // Custom icon or default
    if (buttonConfig.customIconSrc) {
      button.innerHTML = `<img src="${buttonConfig.customIconSrc}" style="width: ${buttonConfig.customIconSize || 40}px; height: ${buttonConfig.customIconSize || 40}px; border-radius: ${buttonConfig.customIconBorderRadius || 0}px;">`;
    } else {
      button.innerHTML = `<svg width="30" height="30" viewBox="0 0 24 24" fill="${buttonConfig.iconColor || '#fff'}"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;
    }
    
    button.addEventListener('click', () => this.toggleChat());
    button.addEventListener('mouseenter', () => button.style.transform = 'scale(1.1)');
    button.addEventListener('mouseleave', () => button.style.transform = 'scale(1)');
    
    document.body.appendChild(button);
    
    // Tooltip
    if (this.config.theme?.tooltip?.showTooltip) {
      this.renderTooltip();
    }
    
    // Auto-open
    if (buttonConfig.autoWindowOpen?.autoOpen) {
      setTimeout(() => this.toggleChat(), buttonConfig.autoWindowOpen.openDelay * 1000 || 2000);
    }
  },

  /**
   * Render tooltip
   */
  renderTooltip: function() {
    const tooltipConfig = this.config.theme?.tooltip || {};
    
    const tooltip = document.createElement('div');
    tooltip.id = 'botStitch-tooltip';
    tooltip.textContent = tooltipConfig.tooltipText || 'Need help?';
    tooltip.style.cssText = `
      position: fixed;
      bottom: ${(this.config.theme?.button?.bottom || 20) + (this.config.theme?.button?.size || 60) + 10}px;
      right: ${this.config.theme?.button?.right || 20}px;
      background-color: ${tooltipConfig.tooltipBackgroundColor || '#fff'};
      color: ${tooltipConfig.tooltipTextColor || '#000'};
      padding: 10px 15px;
      border-radius: 8px;
      font-size: ${tooltipConfig.tooltipFontSize || 14}px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 999998;
      animation: fadeIn 0.3s ease;
    `;
    
    document.body.appendChild(tooltip);
    
    // Hide after 5 seconds
    setTimeout(() => tooltip.style.display = 'none', 5000);
  },

  /**
   * Toggle chat window
   */
  toggleChat: function() {
    const chatWindow = document.getElementById('botStitch-chat-window');
    if (chatWindow) {
      chatWindow.style.display = chatWindow.style.display === 'none' ? 'flex' : 'none';
    }
  },

  /**
   * Render chat with form
   */
  renderChatWithForm: function() {
    const chatWindow = this.createChatWindow();
    
    // Add form to chat
    const formHTML = this.generateFormHTML();
    const messagesContainer = chatWindow.querySelector('#botStitch-messages');
    messagesContainer.innerHTML = formHTML;
    
    // Attach form submit handler
    const form = chatWindow.querySelector('#botStitch-form');
    form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    
    document.body.appendChild(chatWindow);
  },

  /**
   * Render chat (without form)
   */
  renderChat: function() {
    const chatWindow = this.createChatWindow();
    
    // Add welcome message
    const messagesContainer = chatWindow.querySelector('#botStitch-messages');
    this.addBotMessage(this.config.theme?.chatWindow?.welcomeMessage || 'Hello! How can I help?', messagesContainer);
    
    // Add starter prompts
    this.renderStarterPrompts(messagesContainer);
    
    document.body.appendChild(chatWindow);
  },

  /**
   * Create chat window structure
   */
  createChatWindow: function() {
    const windowConfig = this.config.theme?.chatWindow || {};
    const headerConfig = this.config.theme?.chatWindow?.header || {};
    
    const chatWindow = document.createElement('div');
    chatWindow.id = 'botStitch-chat-window';
    chatWindow.style.cssText = `
      position: fixed;
      bottom: ${(this.config.theme?.button?.bottom || 20) + (this.config.theme?.button?.size || 60) + 10}px;
      right: ${this.config.theme?.button?.right || 20}px;
      width: ${windowConfig.width || 350}px;
      height: ${windowConfig.height || 500}px;
      background-color: ${windowConfig.backgroundColor || '#fff'};
      border-radius: ${windowConfig.borderRadiusStyle === 'rounded' ? '16px' : '8px'};
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      z-index: 999997;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      background-color: ${headerConfig.backgroundColor || '#1175D6'};
      color: ${headerConfig.textColor || '#fff'};
      padding: 15px;
      border-radius: ${windowConfig.borderRadiusStyle === 'rounded' ? '16px 16px 0 0' : '8px 8px 0 0'};
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;
    
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = 'display: flex; align-items: center; gap: 10px;';
    
    if (windowConfig.showTitle && windowConfig.titleAvatarSrc) {
      titleContainer.innerHTML = `
        <img src="${windowConfig.titleAvatarSrc}" style="width: 35px; height: 35px; border-radius: 50%;">
        <span style="font-weight: 600; font-size: 16px;">${windowConfig.title || 'Chat'}</span>
      `;
    } else {
      titleContainer.innerHTML = `<span style="font-weight: 600; font-size: 16px;">${windowConfig.title || 'Chat'}</span>`;
    }
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: ${headerConfig.textColor || '#fff'};
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
    `;
    closeBtn.addEventListener('click', () => this.toggleChat());
    
    header.appendChild(titleContainer);
    header.appendChild(closeBtn);
    
    // Messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.id = 'botStitch-messages';
    messagesContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 15px;
      font-size: ${windowConfig.fontSize || 14}px;
    `;
    
    // Input container
    const inputContainer = this.createInputContainer();
    
    chatWindow.appendChild(header);
    chatWindow.appendChild(messagesContainer);
    chatWindow.appendChild(inputContainer);
    
    // Footer
    if (windowConfig.footer?.enabled) {
      const footer = this.createFooter();
      chatWindow.appendChild(footer);
    }
    
    return chatWindow;
  },

  /**
   * Generate form HTML
   */
  generateFormHTML: function() {
    const formFields = this.config.features?.formCollection?.fields || ['name', 'email'];
    
    let formHTML = `
      <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 15px;">
        <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333;">Welcome! Please tell us about yourself</h3>
        <form id="botStitch-form" style="display: flex; flex-direction: column; gap: 12px;">
    `;
    
    formFields.forEach(field => {
      if (field === 'name') {
        formHTML += `
          <input type="text" name="name" placeholder="Your Name *" required 
            style="padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
        `;
      } else if (field === 'email') {
        formHTML += `
          <input type="email" name="email" placeholder="Email Address *" required 
            style="padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
        `;
      } else if (field === 'faith') {
        formHTML += `
          <select name="faith" required 
            style="padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
            <option value="">Faith Background *</option>
            <option value="Muslim">Muslim</option>
            <option value="Non-Muslim">Non-Muslim</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        `;
      } else if (field === 'source') {
        formHTML += `
          <select name="source" required 
            style="padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
            <option value="">How did you find us? *</option>
            <option value="Google Search">Google Search</option>
            <option value="Social Media">Social Media</option>
            <option value="Friend">Friend/Family</option>
            <option value="Other">Other</option>
          </select>
        `;
      }
    });
    
    formHTML += `
          <button type="submit" 
            style="background: #1175D6; color: #fff; padding: 12px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;">
            Start Chat
          </button>
        </form>
      </div>
    `;
    
    return formHTML;
  },

  /**
   * Handle form submission
   */
  handleFormSubmit: function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {};
    formData.forEach((value, key) => {
      userData[key] = value;
    });
    
    // Save to localStorage
    this.userInfo = userData;
    localStorage.setItem('botStitch_userInfo_' + this.sessionId, JSON.stringify(userData));
    
    // Send to N8N
    fetch(this.config.n8nChatUrl.replace(/\/[^\/]*$/, '/CollectUserInfo'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...userData,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.error('Form submission error:', err));
    
    // Replace form with chat
    const messagesContainer = document.getElementById('botStitch-messages');
    messagesContainer.innerHTML = '';
    
    this.addBotMessage(`Thank you, ${userData.name}! ${this.config.theme?.chatWindow?.welcomeMessage || 'How can I help you?'}`, messagesContainer);
    this.renderStarterPrompts(messagesContainer);
  },

  /**
   * Create input container
   */
  createInputContainer: function() {
    const inputConfig = this.config.theme?.chatWindow?.textInput || {};
    
    const container = document.createElement('div');
    container.style.cssText = `
      padding: 15px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 10px;
      align-items: center;
    `;
    
    const input = document.createElement('input');
    input.id = 'botStitch-input';
    input.type = 'text';
    input.placeholder = inputConfig.placeholder || 'Type your message...';
    input.maxLength = inputConfig.maxChars || 500;
    input.style.cssText = `
      flex: 1;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: ${inputConfig.borderRadius || 8}px;
      font-size: 14px;
      background-color: ${inputConfig.backgroundColor || '#fff'};
      color: ${inputConfig.textColor || '#000'};
    `;
    
    const sendBtn = document.createElement('button');
    sendBtn.innerHTML = '➤';
    sendBtn.style.cssText = `
      background-color: ${inputConfig.sendButtonColor || '#1175D6'};
      color: #fff;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: ${inputConfig.sendButtonBorderRadius || 50}%;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const sendMessage = () => {
      const text = input.value.trim();
      if (!text) return;
      
      this.addUserMessage(text);
      input.value = '';
      this.sendToN8N(text);
    };
    
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
    
    container.appendChild(input);
    container.appendChild(sendBtn);
    
    return container;
  },

  /**
   * Create footer
   */
  createFooter: function() {
    const footerConfig = this.config.theme?.chatWindow?.footer || {};
    
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 10px 15px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #eee;
    `;
    
    footer.innerHTML = `
      ${footerConfig.text || ''} 
      ${footerConfig.link ? `<a href="${footerConfig.link}" target="_blank" style="color: #1175D6; text-decoration: none;">${footerConfig.linkText || 'Learn more'}</a>` : ''}
    `;
    
    return footer;
  },

  /**
   * Render starter prompts
   */
  renderStarterPrompts: function(container) {
    const prompts = this.config.theme?.chatWindow?.starterPrompts || [];
    if (prompts.length === 0) return;
    
    const promptsContainer = document.createElement('div');
    promptsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin-top: 10px;';
    
    prompts.forEach(prompt => {
      const btn = document.createElement('button');
      btn.textContent = prompt;
      btn.style.cssText = `
        background: #f0f7ff;
        color: #1175D6;
        border: 1px solid #1175D6;
        padding: 10px;
        border-radius: 8px;
        cursor: pointer;
        font-size: ${this.config.theme?.chatWindow?.starterPromptFontSize || 14}px;
        text-align: left;
        transition: all 0.2s;
      `;
      
      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#1175D6';
        btn.style.color = '#fff';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = '#f0f7ff';
        btn.style.color = '#1175D6';
      });
      
      btn.addEventListener('click', () => {
        this.addUserMessage(prompt);
        this.sendToN8N(prompt);
        promptsContainer.remove();
      });
      
      promptsContainer.appendChild(btn);
    });
    
    container.appendChild(promptsContainer);
  },

  /**
   * Add bot message
   */
  addBotMessage: function(text, container) {
    if (!container) container = document.getElementById('botStitch-messages');
    
    const botConfig = this.config.theme?.chatWindow?.botMessage || {};
    
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 15px; align-items: flex-start;';
    
    if (botConfig.showAvatar && botConfig.avatarSrc) {
      const avatar = document.createElement('img');
      avatar.src = botConfig.avatarSrc;
      avatar.style.cssText = `width: 35px; height: 35px; border-radius: ${this.config.theme?.chatWindow?.avatarBorderRadius || 50}%;`;
      messageDiv.appendChild(avatar);
    }
    
    const bubble = document.createElement('div');
    bubble.style.cssText = `
      background-color: ${botConfig.backgroundColor || '#f1f1f1'};
      color: ${botConfig.textColor || '#000'};
      padding: 12px;
      border-radius: ${this.config.theme?.chatWindow?.messageBorderRadius || 12}px;
      max-width: 75%;
      word-wrap: break-word;
    `;
    
    if (this.config.theme?.chatWindow?.renderHTML) {
      bubble.innerHTML = text;
    } else {
      bubble.textContent = text;
    }
    
    messageDiv.appendChild(bubble);
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    
    this.conversationHistory.push({ role: 'bot', text });
  },

  /**
   * Add user message
   */
  addUserMessage: function(text) {
    const container = document.getElementById('botStitch-messages');
    const userConfig = this.config.theme?.chatWindow?.userMessage || {};
    
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 15px; align-items: flex-start; justify-content: flex-end;';
    
    const bubble = document.createElement('div');
    bubble.style.cssText = `
      background-color: ${userConfig.backgroundColor || '#1175D6'};
      color: ${userConfig.textColor || '#fff'};
      padding: 12px;
      border-radius: ${this.config.theme?.chatWindow?.messageBorderRadius || 12}px;
      max-width: 75%;
      word-wrap: break-word;
    `;
    bubble.textContent = text;
    
    messageDiv.appendChild(bubble);
    
    if (userConfig.showAvatar && userConfig.avatarSrc) {
      const avatar = document.createElement('img');
      avatar.src = userConfig.avatarSrc;
      avatar.style.cssText = `width: 35px; height: 35px; border-radius: ${this.config.theme?.chatWindow?.avatarBorderRadius || 50}%;`;
      messageDiv.appendChild(avatar);
    }
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    
    this.conversationHistory.push({ role: 'user', text });
  },

  /**
   * Send message to N8N
   */
  sendToN8N: function(text) {
    const container = document.getElementById('botStitch-messages');
    
    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.style.cssText = 'margin: 10px 0; color: #999; font-style: italic; font-size: 13px;';
    typingDiv.textContent = 'Typing...';
    container.appendChild(typingDiv);
    
    const endpoint = this.humanModeActive 
      ? this.config.n8nChatUrl.replace(/\/[^\/]*$/, '/HumanAgent')
      : this.config.n8nChatUrl;
    
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatInput: text,
        sessionId: this.sessionId,
        userInfo: this.userInfo,
        mode: this.humanModeActive ? 'human' : 'bot'
      })
    })
    .then(res => res.json())
    .then(data => {
      typingDiv.remove();
      this.addBotMessage(data.output || data.response || 'Sorry, I could not process that.', container);
    })
    .catch(err => {
      typingDiv.remove();
      this.addBotMessage(this.config.theme?.chatWindow?.errorMessage || 'Connection error. Please try again.', container);
      console.error('N8N error:', err);
    });
  },

  /**
   * Start timer for human transfer
   */
  startTimerCheck: function() {
    const transferDelay = this.config.features?.humanTransfer?.triggerAfterSeconds || 120;
    
    this.timerInterval = setInterval(() => {
      if (this.humanModeActive) {
        clearInterval(this.timerInterval);
        return;
      }
      
      const elapsed = (Date.now() - this.chatStartTime) / 1000;
      
      if (elapsed >= transferDelay) {
        clearInterval(this.timerInterval);
        this.offerHumanTransfer();
      }
    }, 10000); // Check every 10 seconds
  },

  /**
   * Offer human transfer
   */
  offerHumanTransfer: function() {
    const container = document.getElementById('botStitch-messages');
    
    const offerDiv = document.createElement('div');
    offerDiv.style.cssText = 'background: #fff3cd; padding: 15px; border-radius: 12px; margin: 15px 0;';
    offerDiv.innerHTML = `
      <p style="margin: 0 0 12px 0; font-weight: 600; color: #856404;">
        Would you like to speak with our team? 🙋
      </p>
      <div style="display: flex; gap: 10px;">
        <button id="transfer-yes" style="flex: 1; background: #28a745; color: #fff; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600;">
          Yes, connect me
        </button>
        <button id="transfer-no" style="flex: 1; background: #6c757d; color: #fff; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600;">
          No, continue
        </button>
      </div>
    `;
    
    container.appendChild(offerDiv);
    container.scrollTop = container.scrollHeight;
    
    document.getElementById('transfer-yes').addEventListener('click', () => {
      offerDiv.remove();
      this.transferToHuman();
    });
    
    document.getElementById('transfer-no').addEventListener('click', () => {
      offerDiv.remove();
    });
  },

  /**
   * Transfer to human agent
   */
  transferToHuman: function() {
    this.humanModeActive = true;
    
    // Update header
    const header = document.querySelector('#botStitch-chat-window > div:first-child');
    const titleSpan = header.querySelector('span');
    titleSpan.innerHTML = '🟢 Connecting to agent...';
    
    // Notify N8N
    fetch(this.config.n8nChatUrl.replace(/\/[^\/]*$/, '/TransferToHuman'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        userInfo: this.userInfo,
        chatHistory: this.conversationHistory
      })
    })
    .then(() => {
      titleSpan.innerHTML = '🟢 Connected to Support Agent';
      this.addBotMessage('You are now connected to our support team. An agent will respond shortly.', document.getElementById('botStitch-messages'));
      this.startPolling();
    })
    .catch(err => {
      console.error('Transfer error:', err);
      this.addBotMessage('Unable to connect to agent. Please try again later.', document.getElementById('botStitch-messages'));
    });
  },

  /**
   * Start polling for agent replies
   */
  startPolling: function() {
    this.pollingInterval = setInterval(() => {
      fetch(this.config.n8nChatUrl.replace(/\/[^\/]*$/, '/CheckAgentReply') + `?session=${this.sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.newReply) {
            const agentName = data.agentName || 'Support Agent';
            this.addBotMessage(`<strong>${agentName}:</strong> ${data.reply}`, document.getElementById('botStitch-messages'));
          }
        })
        .catch(err => console.error('Polling error:', err));
    }, 3000); // Poll every 3 seconds
  }
};

// Export for use
window.BotStitch = BotStitch;
