// Fixed embed.js with proper audio and attachment handling

(function() {
  'use strict';

  // BotStitch Chat Widget Embed Script v2.6.0 - FIXED VERSION
  const BotStitch = {
    version: '2.6.0',
    widgets: new Map(),
    
    init: function(config) {
      if (!config) {
        console.error('BotStitch: Configuration is required');
        return;
      }

      if (!config.n8nChatUrl) {
        console.error('BotStitch: n8nChatUrl is required');
        return;
      }

      const widgetId = this.generateWidgetId();
      const widget = new ChatWidget(widgetId, config);
      this.widgets.set(widgetId, widget);
      
      return widget;
    },

    generateWidgetId: function() {
      return 'botstitch-widget-' + Math.random().toString(36).substr(2, 9);
    }
  };

  class ChatWidget {
    constructor(id, config) {
      this.id = id;
      this.config = this.mergeDefaultConfig(config);
      this.isOpen = false;
      this.messages = [];
      this.isRecording = false;
      this.mediaRecorder = null;
      this.audioChunks = [];
      this.starterPromptsShown = false;
      this.pendingFiles = []; // Store files before sending
      
      this.init();
    }

    mergeDefaultConfig(config) {
      const defaults = {
        n8nChatUrl: '',
        metadata: {},
        theme: {
          button: {
            backgroundColor: '#ffc8b8',
            right: 20,
            bottom: 20,
            size: 50,
            iconColor: '#373434',
            customIconSrc: '',
            customIconSize: 24,
            customIconBorderRadius: 0,
            autoWindowOpen: {
              autoOpen: false,
              openDelay: 2
            },
            borderRadius: 'rounded'
          },
          tooltip: {
            showTooltip: true,
            tooltipMessage: 'Hello 👋 Need help?',
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
              acceptFileTypes: ['jpeg', 'jpg', 'png', 'pdf', 'doc', 'docx'],
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
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        z-index: 999998;
        white-space: nowrap;
        max-width: 200px;
      `;
      tooltip.textContent = this.config.theme.tooltip.tooltipMessage;
      document.body.appendChild(tooltip);
      this.tooltipElement = tooltip;
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
      const footer = this.createFooter();
      chatWindow.appendChild(footer);

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
      titleContainer.style.cssText = 'display: flex; align-items: center; gap: 12px;';

      if (this.config.theme.chatWindow.titleAvatarSrc) {
        const avatar = document.createElement('img');
        avatar.src = this.config.theme.chatWindow.titleAvatarSrc;
        avatar.style.cssText = `
          width: 32px;
          height: 32px;
          border-radius: ${this.config.theme.chatWindow.avatarBorderRadius}px;
        `;
        titleContainer.appendChild(avatar);
      }

      const titleText = document.createElement('div');
      titleText.style.cssText = 'font-weight: 600; font-size: 16px;';
      titleText.textContent = this.config.theme.chatWindow.title;
      titleContainer.appendChild(titleText);

      const closeButton = document.createElement('button');
      closeButton.style.cssText = `
        background: none;
        border: none;
        color: ${this.config.theme.chatWindow.botMessage.textColor};
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        opacity: 0.8;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      closeButton.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
      const uploadButton = this.createUploadButton();
      container.appendChild(uploadButton);

      // Voice button
      const voiceButton = this.createVoiceButton();
      container.appendChild(voiceButton);

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
      
      button.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
      
      button.appendChild(fileInput);
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
        font-size: 16px;
      `;
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      `;
      
      button.addEventListener('click', () => this.toggleVoiceRecording());
      this.voiceButton = button;
      
      return button;
    }

    adjustTextareaHeight(textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    updateCharacterCount() {
      const length = this.inputElement.value.length;
      const maxChars = this.config.theme.chatWindow.textInput.maxChars;
      
      if (length > maxChars) {
        this.inputElement.value = this.inputElement.value.substring(0, maxChars);
      }
    }

    addMessage(text, sender, isHTML = false) {
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

    // FIXED: Properly handle file uploads and send to N8N
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
      const validFiles = [];
      for (const file of files) {
        if (file.size > config.maxSizeInMB * 1024 * 1024) {
          this.addMessage(`File "${file.name}" is too large. Maximum size is ${config.maxSizeInMB}MB.`, 'bot');
          continue;
        }

        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!config.acceptFileTypes.includes(fileExtension)) {
          this.addMessage(`File type "${fileExtension}" is not allowed.`, 'bot');
          continue;
        }

        validFiles.push(file);
      }

      if (validFiles.length === 0) {
        return;
      }

      // Add files to pending list and show preview
      this.pendingFiles = [...this.pendingFiles, ...validFiles];
      this.showFilePreview();

      // Clear the file input
      event.target.value = '';
    }

    showFilePreview() {
      this.filePreviewArea.innerHTML = '';
      
      if (this.pendingFiles.length === 0) {
        this.filePreviewArea.style.display = 'none';
        return;
      }

      this.filePreviewArea.style.display = 'block';
      
      this.pendingFiles.forEach((file, index) => {
        const preview = document.createElement('div');
        preview.className = 'botstitch-file-preview';
        preview.innerHTML = `
          <span>📎 ${file.name} (${this.formatFileSize(file.size)})</span>
          <button class="botstitch-file-remove">×</button>
        `;
        
        const removeBtn = preview.querySelector('.botstitch-file-remove');
        removeBtn.addEventListener('click', () => {
          this.pendingFiles.splice(index, 1);
          this.showFilePreview();
        });
        
        this.filePreviewArea.appendChild(preview);
      });
    }

    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // FIXED: Convert file to base64 for N8N
    async fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          // Remove data:mime/type;base64, prefix
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = error => reject(error);
      });
    }

    // FIXED: Send message with proper file and audio handling
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
        // Prepare payload for N8N
        const payload = {
          // Basic message data
          message: message || '',
          sessionId: this.id,
          timestamp: new Date().toISOString(),
          metadata: this.config.metadata || {},
          
          // File attachments (if any)
          attachments: [],
          
          // Message type
          messageType: hasFiles ? 'file' : 'text'
        };

        // Process file attachments
        if (hasFiles) {
          console.log('Processing files for N8N...');
          
          for (const file of this.pendingFiles) {
            try {
              const base64Data = await this.fileToBase64(file);
              
              const attachment = {
                filename: file.name,
                mimeType: file.type,
                size: file.size,
                data: base64Data, // Base64 encoded file data
                extension: file.name.split('.').pop().toLowerCase()
              };
              
              payload.attachments.push(attachment);
              console.log(`Processed file: ${file.name} (${this.formatFileSize(file.size)})`);
            } catch (error) {
              console.error(`Failed to process file ${file.name}:`, error);
              this.addMessage(`Failed to process file: ${file.name}`, 'bot');
            }
          }
        }

        // Clear pending files
        this.pendingFiles = [];
        this.showFilePreview();

        console.log('Sending to N8N:', {
          url: this.config.n8nChatUrl,
          messageType: payload.messageType,
          attachmentCount: payload.attachments.length,
          hasMessage: !!payload.message
        });

        // Send to N8N
        const response = await fetch(this.config.n8nChatUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        this.hideTypingIndicator();

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('N8N Response:', data);

        // Handle different response formats
        let botMessage = '';
        if (data.output) {
          botMessage = data.output;
        } else if (data.message) {
          botMessage = data.message;
        } else if (data.response) {
          botMessage = data.response;
        } else if (typeof data === 'string') {
          botMessage = data;
        } else {
          botMessage = 'Message received successfully!';
        }

        this.addMessage(botMessage, 'bot', this.config.theme.chatWindow.renderHTML);

      } catch (error) {
        console.error('Error sending message to N8N:', error);
        this.hideTypingIndicator();
        this.addMessage(this.config.theme.chatWindow.errorMessage, 'bot');
      }
    }

    // FIXED: Voice recording with proper data handling
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

        // Use supported MIME types
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
          
          // Send audio to N8N
          await this.sendAudioMessage(audioBlob, selectedMimeType);
          
          // Clean up
          stream.getTracks().forEach(track => track.stop());
        });

        this.mediaRecorder.start(1000); // Collect data every second
        this.isRecording = true;
        
        // Update UI
        this.voiceButton.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        `;
        this.voiceButton.classList.add('botstitch-recording');

        // Auto-stop after max time
        this.recordingTimeout = setTimeout(() => {
          if (this.isRecording) {
            console.log('Auto-stopping recording due to time limit');
            this.stopRecording();
          }
        }, this.config.theme.chatWindow.voiceInputConfig.maxRecordingTime * 1000);

        console.log('Recording started successfully');

      } catch (error) {
        console.error('Error starting recording:', error);
        this.addMessage(this.config.theme.chatWindow.voiceInputConfig.recordingNotSupportedMessage, 'bot');
      }
    }

    stopRecording() {
      if (this.mediaRecorder && this.isRecording) {
        console.log('Stopping recording...');
        
        this.mediaRecorder.stop();
        this.isRecording = false;
        
        // Clear timeout
        if (this.recordingTimeout) {
          clearTimeout(this.recordingTimeout);
          this.recordingTimeout = null;
        }
        
        // Reset UI
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

    // FIXED: Send audio message to N8N
    async sendAudioMessage(audioBlob, mimeType) {
      try {
        console.log('Sending audio to N8N...');
        this.showTypingIndicator();

        // Convert audio to base64
        const base64Audio = await this.blobToBase64(audioBlob);
        
        const payload = {
          message: '',
          sessionId: this.id,
          timestamp: new Date().toISOString(),
          metadata: this.config.metadata || {},
          messageType: 'audio',
          audio: {
            data: base64Audio,
            mimeType: mimeType,
            size: audioBlob.size,
            duration: this.config.theme.chatWindow.voiceInputConfig.maxRecordingTime // Approximate
          }
        };

        console.log('Audio payload prepared:', {
          mimeType,
          size: audioBlob.size,
          base64Length: base64Audio.length
        });

        const response = await fetch(this.config.n8nChatUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        this.hideTypingIndicator();

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('N8N Audio Response:', data);

        // Handle response
        let botMessage = '';
        if (data.output) {
          botMessage = data.output;
        } else if (data.message) {
          botMessage = data.message;
        } else if (data.transcription) {
          botMessage = `I heard: "${data.transcription}"`;
        } else {
          botMessage = 'Voice message received!';
        }

        this.addMessage(botMessage, 'bot', this.config.theme.chatWindow.renderHTML);

      } catch (error) {
        console.error('Error sending audio to N8N:', error);
        this.hideTypingIndicator();
        this.addMessage('Failed to process voice message. Please try again.', 'bot');
      }
    }

    // Helper: Convert blob to base64
    async blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => {
          // Remove data:mime/type;base64, prefix
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = error => reject(error);
      });
    }

    // Show typing indicator
    showTypingIndicator() {
      // Remove existing indicator
      this.hideTypingIndicator();
      
      const indicator = document.createElement('div');
      indicator.id = `${this.id}-typing`;
      indicator.style.cssText = `
        display: flex;
        justify-content: flex-start;
        margin-bottom: 12px;
      `;
      
      const indicatorContent = document.createElement('div');
      indicatorContent.style.cssText = `
        background-color: ${this.config.theme.chatWindow.botMessage.backgroundColor};
        color: ${this.config.theme.chatWindow.botMessage.textColor};
        padding: 12px 16px;
        border-radius: ${this.config.theme.chatWindow.messageBorderRadius}px;
        display: flex;
        align-items: center;
        gap: 4px;
      `;
      
      indicatorContent.innerHTML = `
        <span style="animation: botstitch-pulse 1.4s infinite;">•</span>
        <span style="animation: botstitch-pulse 1.4s infinite 0.2s;">•</span>
        <span style="animation: botstitch-pulse 1.4s infinite 0.4s;">•</span>
      `;
      
      indicator.appendChild(indicatorContent);
      this.messagesContainer.appendChild(indicator);
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    // Hide typing indicator
    hideTypingIndicator() {
      const indicator = document.getElementById(`${this.id}-typing`);
      if (indicator) {
        indicator.remove();
      }
    }

    open() {
      this.isOpen = true;
      this.chatElement.classList.remove('botstitch-hidden');
      this.chatElement.classList.add('botstitch-fade-in');
      this.hideTooltip();
      
      if (this.config.theme.chatWindow.textInput.autoFocus) {
        setTimeout(() => this.inputElement.focus(), 100);
      }

      if (this.messages.length === 1 && this.config.theme.chatWindow.starterPrompts.length > 0 && !this.starterPromptsShown) {
        this.showStarterPrompts();
        this.starterPromptsShown = true;
      }
    }

    close() {
      this.isOpen = false;
      this.chatElement.classList.add('botstitch-hidden');
      this.chatElement.classList.remove('botstitch-fade-in');
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    showStarterPrompts() {
      const promptsContainer = document.createElement('div');
      promptsContainer.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      `;

      this.config.theme.chatWindow.starterPrompts.forEach(prompt => {
        if (prompt.trim()) {
          const button = document.createElement('button');
          button.style.cssText = `
            background: none;
            border: 1px solid #e5e5e5;
            border-radius: 20px;
            padding: 6px 12px;
            cursor: pointer;
            font-size: ${this.config.theme.chatWindow.starterPromptFontSize}px;
            color: #666;
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

})();Bot
