(function() {
  'use strict';

  class BotStitch {
    static widgets = new Map();

    static init(config) {
      const widget = new BotStitch(config);
      BotStitch.widgets.set(widget.id, widget);
      return widget;
    }

    constructor(config = {}) {
      this.config = this.getDefaultConfig(config);
      this.id = this.generateSessionId();
      this.messages = [];
      this.pendingFiles = [];
      this.isRecording = false;
      this.mediaRecorder = null;
      this.audioChunks = [];
      this.recordingTimeout = null;
      this.isOpen = false;
      this.buttonElement = null;
      this.chatElement = null;
      this.tooltipElement = null;
      this.messagesContainer = null;
      this.filePreviewArea = null;
      this.inputElement = null;
      this.sendButton = null;
      this.voiceButton = null;
      this.fileButton = null;
      this.fileInput = null;
      
      this.init();
    }

    generateSessionId() {
      return 'botstitch-widget-' + Math.random().toString(36).substr(2, 9);
    }

    getDefaultConfig(config = {}) {
      const defaults = {
        n8nChatUrl: '',
        n8nAudioFastUrl: '', // Optional: dedicated fast audio endpoint
        n8nAudioStorageUrl: '', // Optional: dedicated storage endpoint
        metadata: {},
        theme: {
          button: {
            backgroundColor: '#f36539',
            iconColor: '#ffffff',
            customIconSrc: '',
            customIconSize: 24,
            customIconBorderRadius: 0,
            size: 60,
            bottom: 20,
            right: 20,
            borderRadius: 'rounded',
            autoWindowOpen: {
              autoOpen: false,
              openDelay: 0
            }
          },
          tooltip: {
            showTooltip: true,
            tooltipText: 'Chat with us!',
            tooltipBackgroundColor: '#fff9f6',
            tooltipTextColor: '#1c1c1c',
            tooltipFontSize: 15
          },
          chatWindow: {
            borderRadiusStyle: 'rounded',
            avatarBorderRadius: 25,
            messageBorderRadius: 6,
            showTitle: true,
            title: 'BotStitch Chat',
            titleAvatarSrc: '',
            welcomeMessage: 'Hello! How can I help you today?',
            errorMessage: 'Sorry, something went wrong. Please try again.',
            backgroundColor: '#ffffff',
            height: 600,
            width: 400,
            fontSize: 16,
            starterPrompts: [],
            starterPromptFontSize: 15,
            renderHTML: false,
            clearChatOnReload: false,
            botMessage: {
              backgroundColor: '#f36539',
              textColor: '#fafafa',
              showAvatar: true,
              avatarSrc: ''
            },
            userMessage: {
              backgroundColor: '#fff6f3',
              textColor: '#050505',
              showAvatar: true,
              avatarSrc: ''
            },
            textInput: {
              placeholder: 'Type your message...',
              backgroundColor: '#ffffff',
              textColor: '#1e1e1f',
              sendButtonColor: '#f36539',
              maxChars: 500,
              maxCharsWarningMessage: 'Message too long. Please keep it under 500 characters.',
              autoFocus: false,
              borderRadius: 6,
              sendButtonBorderRadius: 50
            },
            uploadsConfig: {
              enabled: true,
              acceptFileTypes: ['jpeg', 'jpg', 'png', 'pdf', 'doc', 'docx', 'mp3', 'wav'],
              maxFiles: 5,
              maxSizeInMB: 10
            },
            voiceInputConfig: {
              enabled: true,
              maxRecordingTime: 15,
              recordingNotSupportedMessage: 'Voice recording is not supported in this browser'
            },
            footer: {
              enabled: true,
              text: 'Free customizable chat widget for n8n',
              link: 'https://botstitch.com',
              linkText: 'botstitch.com'
            }
          }
        }
      };

      return this.deepMerge(defaults, config);
    }

    deepMerge(target, source) {
      const result = { ...target };
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
      return result;
    }

    init() {
      console.log('🚀 BotStitch Widget v2.6.0 initializing...');
      console.log('📊 Config:', {
        footer: this.config.theme.chatWindow.footer,
        uploads: this.config.theme.chatWindow.uploadsConfig?.enabled,
        voice: this.config.theme.chatWindow.voiceInputConfig?.enabled
      });
      
      this.createStyles();
      this.createButton();
      this.createChatWindow();
      
      if (this.config.theme.button.autoWindowOpen.autoOpen) {
        setTimeout(() => {
          this.open();
        }, this.config.theme.button.autoWindowOpen.openDelay * 1000);
      }

      // Add welcome message
      this.addMessage(this.config.theme.chatWindow.welcomeMessage, 'bot');
      
      console.log('✅ BotStitch Widget initialized successfully');
    }

    createStyles() {
      const style = document.createElement('style');
      style.textContent = `
        .botstitch-widget * {
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }
        .botstitch-widget svg {
          flex-shrink: 0;
          vertical-align: middle;
        }
        .botstitch-hidden { display: none !important; }
        .botstitch-fade-in { 
          animation: botstitch-fadeIn 0.3s ease-in-out;
        }
        @keyframes botstitch-fadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        .botstitch-recording {
          animation: botstitch-pulse 1s infinite;
          background-color: #ef4444 !important;
        }
        @keyframes botstitch-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .botstitch-file-preview {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 8px 12px;
          margin: 4px 0;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
        }
        .botstitch-file-remove {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 2px 6px;
          cursor: pointer;
          font-size: 10px;
        }
        @media (max-width: 480px) {
          .botstitch-widget.botstitch-chat-window {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            height: 100% !important;
            border-radius: 0 !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    createButton() {
      const button = document.createElement('div');
      button.id = `${this.id}-button`;
      button.className = 'botstitch-widget';
      button.style.cssText = `
        position: fixed;
        right: ${this.config.theme.button.right}px;
        bottom: ${this.config.theme.button.bottom}px;
        width: ${this.config.theme.button.size}px;
        height: ${this.config.theme.button.size}px;
        background-color: ${this.config.theme.button.backgroundColor};
        border-radius: ${this.config.theme.button.borderRadius === 'rounded' ? '50%' : '8px'};
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      `;

      // Add icon
      if (this.config.theme.button.customIconSrc) {
        const icon = document.createElement('img');
        icon.src = this.config.theme.button.customIconSrc;
        icon.style.cssText = `
          width: ${this.config.theme.button.customIconSize ? this.config.theme.button.customIconSize + 'px' : '24px'};
          height: ${this.config.theme.button.customIconSize ? this.config.theme.button.customIconSize + 'px' : '24px'};
          border-radius: ${this.config.theme.button.customIconBorderRadius ? this.config.theme.button.customIconBorderRadius + 'px' : '0px'};
          object-fit: contain;
        `;
        icon.onerror = () => {
          console.warn('BotStitch: Custom icon failed to load, falling back to default icon');
          icon.style.display = 'none';
          this.addDefaultIcon(button);
        };
        icon.crossOrigin = 'anonymous';
        button.appendChild(icon);
      } else {
        this.addDefaultIcon(button);
      }

      button.addEventListener('click', () => this.toggle());
      button.addEventListener('mouseenter', () => this.showTooltip());
      button.addEventListener('mouseleave', () => this.hideTooltip());

      document.body.appendChild(button);
      this.buttonElement = button;

      if (this.config.theme.tooltip.showTooltip) {
        this.createTooltip();
      }
    }

    addDefaultIcon(button) {
      button.innerHTML = '';
      
      const iconSvg = document.createElement('div');
      iconSvg.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
          <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="${this.config.theme.button.iconColor}" stroke="${this.config.theme.button.iconColor}" stroke-width="0.5"/>
          <circle cx="8" cy="10" r="1.5" fill="${this.config.theme.button.backgroundColor}"/>
          <circle cx="12" cy="10" r="1.5" fill="${this.config.theme.button.backgroundColor}"/>
          <circle cx="16" cy="10" r="1.5" fill="${this.config.theme.button.backgroundColor}"/>
        </svg>
      `;
      iconSvg.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
      `;
      button.appendChild(iconSvg);
    }

    createTooltip() {
      const tooltip = document.createElement('div');
      tooltip.id = `${this.id}-tooltip`;
      tooltip.className = 'botstitch-widget botstitch-hidden';
      tooltip.style.cssText = `
        position: fixed;
        right: ${this.config.theme.button.right + this.config.theme.button.size + 10}px;
        bottom: ${this.config.theme.button.bottom}px;
        background-color: ${this.config.theme.tooltip.tooltipBackgroundColor};
        color: ${this.config.theme.tooltip.tooltipTextColor};
        padding: 8px 12px;
        border-radius: 8px;
        font-size: ${this.config.theme.tooltip.tooltipFontSize}px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 999998;
        white-space: nowrap;
        pointer-events: none;
      `;
      tooltip.textContent = this.config.theme.tooltip.tooltipText;
      
      document.body.appendChild(tooltip);
      this.tooltipElement = tooltip;
    }

    createChatWindow() {
      const chatWindow = document.createElement('div');
      chatWindow.id = `${this.id}-chat`;
      chatWindow.className = 'botstitch-widget botstitch-chat-window botstitch-hidden';
      chatWindow.style.cssText = `
        position: fixed;
        right: ${this.config.theme.button.right}px;
        bottom: ${this.config.theme.button.bottom + this.config.theme.button.size + 10}px;
        width: ${this.config.theme.chatWindow.width}px;
        height: ${this.config.theme.chatWindow.height}px;
        background-color: ${this.config.theme.chatWindow.backgroundColor};
        border-radius: ${this.config.theme.chatWindow.borderRadiusStyle === 'rounded' ? '12px' : '4px'};
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        font-size: ${this.config.theme.chatWindow.fontSize}px;
      `;

      // Header
      if (this.config.theme.chatWindow.showTitle) {
        const header = this.createHeader();
        chatWindow.appendChild(header);
      }

      // Messages container
      const messagesContainer = document.createElement('div');
      messagesContainer.id = `${this.id}-messages`;
      messagesContainer.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      `;
      chatWindow.appendChild(messagesContainer);

      // File preview area
      const filePreviewArea = document.createElement('div');
      filePreviewArea.id = `${this.id}-file-preview`;
      filePreviewArea.style.cssText = `
        padding: 0 16px;
        max-height: 100px;
        overflow-y: auto;
        display: none;
      `;
      chatWindow.appendChild(filePreviewArea);

      // Input container
      const inputContainer = this.createInputContainer();
      chatWindow.appendChild(inputContainer);

      // Footer
      if (this.config.theme.chatWindow.footer.enabled) {
        const footer = this.createFooter();
        chatWindow.appendChild(footer);
      }

      document.body.appendChild(chatWindow);
      this.chatElement = chatWindow;
      this.messagesContainer = messagesContainer;
      this.filePreviewArea = filePreviewArea;
    }

    createHeader() {
      const header = document.createElement('div');
      header.style.cssText = `
        background-color: ${this.config.theme.chatWindow.botMessage.backgroundColor};
        color: ${this.config.theme.chatWindow.botMessage.textColor};
        padding: 16px;
        border-radius: ${this.config.theme.chatWindow.borderRadiusStyle === 'rounded' ? '12px 12px 0 0' : '4px 4px 0 0'};
        display: flex;
        align-items: center;
        justify-content: space-between;
      `;

      const titleContainer = document.createElement('div');
      titleContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
      `;

      if (this.config.theme.chatWindow.titleAvatarSrc) {
        const avatar = document.createElement('img');
        avatar.src = this.config.theme.chatWindow.titleAvatarSrc;
        avatar.style.cssText = `
          width: 24px;
          height: 24px;
          border-radius: 50%;
          object-fit: cover;
        `;
        titleContainer.appendChild(avatar);
      }

      const title = document.createElement('span');
      title.textContent = this.config.theme.chatWindow.title;
      title.style.fontWeight = '500';
      titleContainer.appendChild(title);

      const closeButton = document.createElement('button');
      closeButton.style.cssText = `
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      closeButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      `;
      closeButton.addEventListener('click', () => this.close());

      header.appendChild(titleContainer);
      header.appendChild(closeButton);

      return header;
    }

    createInputContainer() {
      const container = document.createElement('div');
      container.style.cssText = `
        padding: 16px;
        border-top: 1px solid #e5e5e5;
        display: flex;
        gap: 8px;
        align-items: flex-end;
      `;

      // Upload button
      if (this.config.theme.chatWindow.uploadsConfig.enabled) {
        const uploadButton = this.createUploadButton();
        container.appendChild(uploadButton);
      }

      // Voice button
      if (this.config.theme.chatWindow.voiceInputConfig.enabled) {
        const voiceButton = this.createVoiceButton();
        container.appendChild(voiceButton);
      }

      // Text input
      const input = document.createElement('textarea');
      input.id = `${this.id}-input`;
      input.placeholder = this.config.theme.chatWindow.textInput.placeholder;
      input.style.cssText = `
        flex: 1;
        background-color: ${this.config.theme.chatWindow.textInput.backgroundColor};
        color: ${this.config.theme.chatWindow.textInput.textColor};
        border: 1px solid #e5e5e5;
        border-radius: ${this.config.theme.chatWindow.textInput.borderRadius}px;
        padding: 8px 12px;
        resize: none;
        min-height: 40px;
        max-height: 120px;
        font-size: 14px;
        outline: none;
      `;

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      input.addEventListener('input', () => {
        this.adjustTextareaHeight(input);
        this.updateCharacterCount();
      });

      container.appendChild(input);

      // Send button
      const sendButton = document.createElement('button');
      sendButton.style.cssText = `
        background-color: ${this.config.theme.chatWindow.textInput.sendButtonColor};
        color: white;
        border: none;
        border-radius: ${this.config.theme.chatWindow.textInput.sendButtonBorderRadius}px;
        padding: 8px 12px;
        cursor: pointer;
        min-width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      sendButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22,2 15,22 11,13 2,9"/>
        </svg>
      `;
      sendButton.addEventListener('click', () => this.sendMessage());

      container.appendChild(sendButton);

      this.inputElement = input;
      this.sendButton = sendButton;

      return container;
    }

    createUploadButton() {
      const button = document.createElement('button');
      button.style.cssText = `
        background: none;
        border: 1px solid #e5e5e5;
        border-radius: 6px;
        padding: 8px;
        cursor: pointer;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      `;
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.88 16.95a2 2 0 0 1-2.83-2.83l8.49-8.49"/>
        </svg>
      `;
      
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.style.display = 'none';
      fileInput.accept = this.config.theme.chatWindow.uploadsConfig.acceptFileTypes.map(type => '.' + type).join(',');
      fileInput.multiple = this.config.theme.chatWindow.uploadsConfig.maxFiles > 1;
      
      fileInput.addEventListener('change', (event) => this.handleFileUpload(event));
      button.addEventListener('click', () => fileInput.click());
      
      button.appendChild(fileInput);
      this.fileButton = button;
      this.fileInput = fileInput;
      
      return button;
    }

    createVoiceButton() {
      const button = document.createElement('button');
      button.style.cssText = `
        background: none;
        border: 1px solid #e5e5e5;
        border-radius: 6px;
        padding: 8px;
        cursor: pointer;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #666;
        transition: all 0.2s ease;
      `;
      
      this.updateVoiceButtonState();
      button.addEventListener('click', () => this.toggleVoiceRecording());
      
      this.voiceButton = button;
      return button;
    }

    createFooter() {
      const footer = document.createElement('div');
      footer.style.cssText = `
        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
        color: #ffffff;
        padding: 10px 16px;
        text-align: center;
        font-size: 12px;
        border-radius: 0 0 ${this.config.theme.chatWindow.borderRadiusStyle === 'rounded' ? '12px 12px' : '4px 4px'};
        border-top: 2px solid #3b82f6;
        font-weight: 500;
        min-height: 35px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      const footerConfig = this.config.theme.chatWindow.footer || {
        text: 'Powered by',
        link: 'https://botstitch.com',
        linkText: 'Botstitch'
      };

      const footerText = document.createElement('span');
      footerText.textContent = footerConfig.text + ' | ';
      
      const footerLink = document.createElement('a');
      footerLink.href = footerConfig.link;
      footerLink.textContent = footerConfig.linkText;
      footerLink.target = '_blank';
      footerLink.style.cssText = `
        color: #ffffff;
        text-decoration: underline;
        font-weight: 700;
      `;

      footer.appendChild(footerText);
      footer.appendChild(footerLink);
      
      return footer;
    }

    // FIXED: Enhanced sendMessage with proper FormData for attachments
    async sendMessage() {
      const message = this.inputElement.value.trim();
      const hasFiles = this.pendingFiles.length > 0;
      
      if (!message && !hasFiles) return;

      // Show user message
      if (message) {
        this.addMessage(message, 'user');
      }

      // Show file attachments in chat
      if (hasFiles) {
        const fileNames = this.pendingFiles.map(f => f.name).join(', ');
        this.addMessage(`📎 Attachments: ${fileNames}`, 'user');
      }

      // Clear input and files
      this.inputElement.value = '';
      this.adjustTextareaHeight(this.inputElement);

      // Show typing indicator
      this.showTypingIndicator();

      try {
        let response;

        if (hasFiles) {
          // FIXED: Use FormData for file attachments (like embed-pretty.js)
          response = await this.sendMessageWithFormData(message, this.pendingFiles);
        } else {
          // Use JSON for text-only messages
          response = await this.sendTextMessage(message);
        }

        const data = await response.json();
        this.handleN8NResponse(data);

      } catch (error) {
        console.error('Error sending message to N8N:', error);
        this.hideTypingIndicator();
        this.addMessage(this.config.theme.chatWindow.errorMessage, 'bot');
      }

      // Clear pending files
      this.pendingFiles = [];
      this.showFilePreview();
    }

    // FIXED: FormData implementation for file attachments (matching embed-pretty.js)
    async sendMessageWithFormData(message, files) {
      const formData = new FormData();
      
      // Add metadata (matching embed-pretty.js structure)
      const metadata = {
        clientCurrentDateTime: new Date().toString(),
        clientCurrentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...this.config.metadata
      };
      
      formData.append("metadata", JSON.stringify(metadata));
      formData.append("action", "sendMessage");
      formData.append("sessionId", this.id);
      formData.append("chatInput", message || "");
      // FIXED: File appending in sendMessageWithFormData
for (const file of files) {
  try {
    // Direct file upload (this should work)
    formData.append("upload", file, file.name);
    console.log(`✅ Appended file: ${file.name}, size: ${file.size}`);
  } catch (error) {
    console.error(`❌ Failed to append file ${file.name}:`, error);
  }
}

// Debug: Check what's actually in FormData
console.log('FormData contents:');
for (let [key, value] of formData.entries()) {
  console.log(key, value instanceof File ? `File: ${value.name}` : value);
}
      // Process and append files
      for (const file of files) {
        try {
          if (file instanceof File) {
            // Direct file upload
            formData.append("upload", file, file.name);
            console.log(`✅ Appended file: ${file.name}, size: ${file.size}`);
          } else if (file.data && file.data.startsWith("data:")) {
            // Convert base64 to blob (matching embed-pretty.js logic)
            const base64Data = file.data.split(",")[1];
            const mimeType = file.data.split(",")[0].split(":")[1].split(";")[0];
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            const blob = new Blob([bytes], { type: mimeType });
            formData.append("upload", blob, file.name);
            console.log(`✅ Appended blob file: ${file.name}, size: ${blob.size}`);
          }
          
          console.log(`Processed file for FormData: ${file.name}`);
        } catch (error) {
          console.error(`❌ Failed to process file ${file.name}:`, error);
          this.addMessage(`Failed to process file: ${file.name}`, 'bot');
        }
      }

      // Debug: Check what's actually in FormData
      console.log('🔍 FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value);
      }

      // Send FormData request (no Content-Type header - browser sets it automatically)
      return fetch(this.config.n8nChatUrl, {
        method: 'POST',
        body: formData
      });
    }

    // FIXED: Text message with proper N8N structure
    async sendTextMessage(message) {
      const payload = {
        metadata: {
          clientCurrentDateTime: new Date().toString(),
          clientCurrentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ...this.config.metadata
        },
        action: "sendMessage",
        sessionId: this.id,
        chatInput: message
      };

      return fetch(this.config.n8nChatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
    }

    // FIXED: Dual endpoint audio processing
    async sendAudioMessage(audioBlob, mimeType) {
      try {
        console.log('Processing audio with dual endpoint strategy...');
        this.showTypingIndicator();

        // Convert audio to base64
        const base64Audio = await this.blobToBase64(audioBlob);
        
        // PRIMARY: Fast JSON endpoint for real-time LLM processing
        const fastPayload = {
          messageType: 'audio',
          sessionId: this.id,
          timestamp: new Date().toISOString(),
          metadata: {
            clientCurrentDateTime: new Date().toString(),
            clientCurrentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            ...this.config.metadata
          },
          audio: {
            data: base64Audio,
            mimeType: mimeType,
            size: audioBlob.size,
            duration: this.config.theme.chatWindow.voiceInputConfig.maxRecordingTime
          }
        };

        // SECONDARY: FormData endpoint for file storage (optional)
        const formData = new FormData();
        formData.append("metadata", JSON.stringify(fastPayload.metadata));
        formData.append("action", "sendMessage");
        formData.append("sessionId", this.id);
        formData.append("chatInput", "");
        formData.append("upload", audioBlob, `audio_${Date.now()}.wav`);

        console.log('Sending to both endpoints...');

        // Send both requests (primary for speed, secondary for storage)
        const fastEndpoint = this.config.n8nAudioFastUrl || this.config.n8nChatUrl;
        const storageEndpoint = this.config.n8nAudioStorageUrl || this.config.n8nChatUrl;

        const [fastResponse] = await Promise.allSettled([
          // Primary: Fast JSON processing
          fetch(fastEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(fastPayload)
          }),
          
          // Secondary: File storage (don't wait for this)
          fetch(storageEndpoint, {
            method: 'POST',
            body: formData
          }).catch(err => {
            console.log('Storage endpoint failed, but continuing with fast response:', err);
          })
        ]);

        this.hideTypingIndicator();

        if (fastResponse.status === 'fulfilled' && fastResponse.value.ok) {
          const data = await fastResponse.value.json();
          console.log('Fast audio processing response:', data);
          this.handleN8NResponse(data);
        } else {
          throw new Error(`Fast audio processing failed: ${fastResponse.reason}`);
        }

      } catch (error) {
        console.error('Error processing audio:', error);
        this.hideTypingIndicator();
        this.addMessage('Failed to process voice message. Please try again.', 'bot');
      }
    }

    // FIXED: Enhanced response handler
    handleN8NResponse(data) {
      this.hideTypingIndicator();
      
      let botMessage = '';
      
      // Handle different N8N response formats
      if (data.text || data.output) {
        botMessage = data.text || data.output;
      } else if (data.message) {
        botMessage = data.message;
      } else if (data.response) {
        botMessage = data.response;
      } else if (data.transcription) {
        botMessage = `I heard: "${data.transcription}"`;
      } else if (data.json) {
        botMessage = JSON.stringify(data.json, null, 2);
      } else if (typeof data === 'string') {
        botMessage = data;
      } else {
        botMessage = JSON.stringify(data, null, 2);
      }

      // Update session ID if provided by N8N
      if (data.chatId) {
        this.id = data.chatId;
      }

      this.addMessage(botMessage, 'bot', this.config.theme.chatWindow.renderHTML);
    }

    // FIXED: Voice recording with proper FormData processing
    async toggleVoiceRecording() {
      if (!this.config.theme.chatWindow.voiceInputConfig.enabled) {
        this.addMessage('Voice recording is not enabled for this chat.', 'bot');
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.addMessage(this.config.theme.chatWindow.voiceInputConfig.recordingNotSupportedMessage, 'bot');
        return;
      }

      if (this.isRecording) {
        this.stopRecording();
      } else {
        await this.startRecording();
      }
    }

    async startRecording() {
      try {
        console.log('Starting voice recording...');
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });

        // Use supported MIME types (matching embed-pretty.js logic)
        const mimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/wav'
        ];
        
        let selectedMimeType = null;
        for (const mimeType of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            selectedMimeType = mimeType;
            break;
          }
        }

        if (!selectedMimeType) {
          throw new Error('No supported audio format found');
        }

        this.mediaRecorder = new MediaRecorder(stream, {
          mimeType: selectedMimeType
        });
        
        this.audioChunks = [];
        this.isRecording = true;

        this.mediaRecorder.addEventListener('dataavailable', event => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        });

        this.mediaRecorder.addEventListener('stop', async () => {
          console.log('Recording stopped, processing audio...');
          
          const audioBlob = new Blob(this.audioChunks, { type: selectedMimeType });
          console.log(`Audio recorded: ${this.formatFileSize(audioBlob.size)}`);
          
          // Add to UI
          this.addMessage('🎙️ Voice message recorded', 'user');
          
          // Send to N8N using dual endpoint strategy
          await this.sendAudioMessage(audioBlob, selectedMimeType);
          
          // Cleanup
          stream.getTracks().forEach(track => track.stop());
          this.isRecording = false;
          this.updateVoiceButtonState();
        });

        this.mediaRecorder.start();
        this.updateVoiceButtonState();

        // Auto-stop after max recording time
        this.recordingTimeout = setTimeout(() => {
          if (this.isRecording) {
            this.stopRecording();
          }
        }, this.config.theme.chatWindow.voiceInputConfig.maxRecordingTime * 1000);

      } catch (error) {
        console.error('Error starting recording:', error);
        this.addMessage('Failed to start recording. Please check microphone permissions.', 'bot');
        this.isRecording = false;
        this.updateVoiceButtonState();
      }
    }

    stopRecording() {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      if (this.recordingTimeout) {
        clearTimeout(this.recordingTimeout);
        this.recordingTimeout = null;
      }
    }

    updateVoiceButtonState() {
      if (!this.voiceButton) return;

      if (this.isRecording) {
        this.voiceButton.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        `;
        this.voiceButton.classList.add('botstitch-recording');
      } else {
        this.voiceButton.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        `;
        this.voiceButton.classList.remove('botstitch-recording');
      }
    }

    // FIXED: File handling with proper preview and FormData support
    async handleFileUpload(event) {
      const files = Array.from(event.target.files);
      const config = this.config.theme.chatWindow.uploadsConfig;
      
      if (!config.enabled) {
        this.addMessage('File uploads are not enabled for this chat.', 'bot');
        return;
      }
      
      if (files.length > config.maxFiles) {
        this.addMessage(`Too many files. Maximum ${config.maxFiles} files allowed.`, 'bot');
        return;
      }

      // Validate and process files
      for (const file of files) {
        if (this.pendingFiles.length >= config.maxFiles) {
          this.addMessage(`Maximum ${config.maxFiles} files allowed.`, 'bot');
          break;
        }

        if (file.size > config.maxSizeInMB * 1024 * 1024) {
          this.addMessage(`File "${file.name}" is too large. Maximum size is ${config.maxSizeInMB}MB.`, 'bot');
          continue;
        }

        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!config.acceptFileTypes.includes(fileExtension)) {
          this.addMessage(`File type .${fileExtension} is not supported.`, 'bot');
          continue;
        }

        // Add file to pending list (keep as File object for FormData)
        this.pendingFiles.push(file);
        console.log(`Added file: ${file.name} (${this.formatFileSize(file.size)})`);
      }

      this.showFilePreview();
      event.target.value = ''; // Clear input
    }

    showFilePreview() {
      if (!this.filePreviewArea) return;

      if (this.pendingFiles.length === 0) {
        this.filePreviewArea.style.display = 'none';
        return;
      }

      this.filePreviewArea.style.display = 'block';
      this.filePreviewArea.innerHTML = '';

      this.pendingFiles.forEach((file, index) => {
        const preview = document.createElement('div');
        preview.className = 'botstitch-file-preview';
        
        const fileType = file.type.startsWith('image/') ? 'image' : 'file';
        
        preview.innerHTML = `
          <div class="botstitch-file-info">
            <span class="botstitch-file-icon">${fileType === 'image' ? '🖼️' : '📄'}</span>
            <span class="botstitch-file-name">${file.name}</span>
            <span class="botstitch-file-size">${this.formatFileSize(file.size)}</span>
            <button class="botstitch-file-remove" onclick="window.BotStitch.widgets.get('${this.id}').removeFile(${index})">✕</button>
          </div>
        `;

        // Show image preview
        if (fileType === 'image') {
          const img = document.createElement('img');
          img.className = 'botstitch-image-preview';
          img.src = URL.createObjectURL(file);
          img.style.maxWidth = '100px';
          img.style.maxHeight = '100px';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '4px';
          preview.appendChild(img);
        }

        this.filePreviewArea.appendChild(preview);
      });
    }

    removeFile(index) {
      this.pendingFiles.splice(index, 1);
      this.showFilePreview();
    }

    addMessage(text, sender, isHTML = false) {
      if (!this.messagesContainer) return;

      const messageDiv = document.createElement('div');
      messageDiv.style.cssText = `
        display: flex;
        ${sender === 'user' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
        margin-bottom: 12px;
      `;

      const messageContent = document.createElement('div');
      messageContent.style.cssText = `
        max-width: 80%;
        padding: 12px 16px;
        border-radius: ${this.config.theme.chatWindow.messageBorderRadius}px;
        background-color: ${sender === 'user' 
          ? this.config.theme.chatWindow.userMessage.backgroundColor 
          : this.config.theme.chatWindow.botMessage.backgroundColor};
        color: ${sender === 'user' 
          ? this.config.theme.chatWindow.userMessage.textColor 
          : this.config.theme.chatWindow.botMessage.textColor};
        word-wrap: break-word;
      `;

      if (isHTML && this.config.theme.chatWindow.renderHTML) {
        messageContent.innerHTML = text;
      } else {
        messageContent.textContent = text;
      }

      messageDiv.appendChild(messageContent);
      this.messagesContainer.appendChild(messageDiv);
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

      this.messages.push({ text, sender, timestamp: new Date() });
    }

    showTypingIndicator() {
      this.addMessage('...', 'bot');
    }

    hideTypingIndicator() {
      const messages = this.messagesContainer.querySelectorAll('div');
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.textContent.includes('...')) {
        lastMessage.remove();
      }
    }

    adjustTextareaHeight(element) {
      element.style.height = 'auto';
      element.style.height = element.scrollHeight + 'px';
    }

    updateCharacterCount() {
      const maxChars = this.config.theme.chatWindow.textInput.maxChars;
      if (!maxChars) return;

      const currentLength = this.inputElement.value.length;
      if (currentLength > maxChars) {
        this.addMessage(this.config.theme.chatWindow.textInput.maxCharsWarningMessage, 'bot');
      }
    }

    showTooltip() {
      if (this.tooltipElement && !this.isOpen) {
        this.tooltipElement.classList.remove('botstitch-hidden');
      }
    }

    hideTooltip() {
      if (this.tooltipElement) {
        this.tooltipElement.classList.add('botstitch-hidden');
      }
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      if (this.chatElement) {
        this.chatElement.classList.remove('botstitch-hidden');
        this.chatElement.classList.add('botstitch-fade-in');
        this.isOpen = true;
        this.hideTooltip();
        
        if (this.config.theme.chatWindow.textInput.autoFocus && this.inputElement) {
          setTimeout(() => this.inputElement.focus(), 100);
        }

        // Show starter prompts if configured
        if (this.config.theme.chatWindow.starterPrompts.length > 0) {
          this.showStarterPrompts();
        }
      }
    }

    close() {
      if (this.chatElement) {
        this.chatElement.classList.add('botstitch-hidden');
        this.chatElement.classList.remove('botstitch-fade-in');
        this.isOpen = false;
      }
    }

    showStarterPrompts() {
      if (!this.config.theme.chatWindow.starterPrompts.length) return;

      const promptsContainer = document.createElement('div');
      promptsContainer.style.cssText = `
        padding: 16px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      `;

      this.config.theme.chatWindow.starterPrompts.forEach(prompt => {
        if (prompt) {
          const button = document.createElement('button');
          button.style.cssText = `
            background: ${this.config.theme.chatWindow.userMessage.backgroundColor};
            color: ${this.config.theme.chatWindow.userMessage.textColor};
            border: 1px solid #e5e5e5;
            border-radius: 20px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: ${this.config.theme.chatWindow.starterPromptFontSize}px;
            transition: all 0.2s ease;
          `;
          button.textContent = prompt;
          button.addEventListener('click', () => {
            this.inputElement.value = prompt;
            this.sendMessage();
            promptsContainer.remove();
          });
          promptsContainer.appendChild(button);
        }
      });

      this.messagesContainer.appendChild(promptsContainer);
    }

    // Utility methods
    async blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    async fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Public API methods
    send(message) {
      this.inputElement.value = message;
      this.sendMessage();
    }

    destroy() {
      // Stop any ongoing recording
      if (this.isRecording) {
        this.stopRecording();
      }
      
      // Clean up timers
      if (this.recordingTimeout) {
        clearTimeout(this.recordingTimeout);
      }
      
      // Remove elements
      if (this.buttonElement) this.buttonElement.remove();
      if (this.chatElement) this.chatElement.remove();
      if (this.tooltipElement) this.tooltipElement.remove();
      
      // Remove from widgets map
      BotStitch.widgets.delete(this.id);
    }
  }

  // Expose BotStitch globally
  window.BotStitch = BotStitch;
  
  // Legacy compatibility
  window.Chatbot = BotStitch;

  // Auto-initialize if data attributes are present
  document.addEventListener('DOMContentLoaded', function() {
    const scripts = document.querySelectorAll('script[data-botstitch-id]');
    scripts.forEach(script => {
      const widgetId = script.getAttribute('data-botstitch-id');
      if (widgetId) {
        fetch(`/api/widget/${widgetId}`)
          .then(response => response.json())
          .then(config => {
            BotStitch.init(config);
          })
          .catch(error => {
            console.error('Failed to load BotStitch widget:', error);
          });
      }
    });
  });

})();
