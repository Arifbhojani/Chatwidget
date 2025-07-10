
(function() {
  'use strict';

  // BotStitch Chat Widget Embed Script v2.3.0
  const BotStitch = {
    version: '2.3.0',
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
      this.starterPromptsShown = false;
      
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
              acceptFileTypes: ['jpeg', 'jpg', 'png', 'pdf'],
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
      console.log('🚀 BotStitch Widget v2.2.0 initializing...');
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
        }
        @keyframes botstitch-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
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
        // Handle image loading errors
        icon.onerror = () => {
          console.warn('BotStitch: Custom icon failed to load, falling back to default icon');
          icon.style.display = 'none';
          this.addDefaultIcon(button);
        };
        // Handle cross-origin issues
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
      // Clear existing content
      button.innerHTML = '';
      
      // Create a proper chat/message icon
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

      // Input container
      const inputContainer = this.createInputContainer();
      chatWindow.appendChild(inputContainer);

      // Footer - Always show in development
      console.log('Creating footer...');
      const footer = this.createFooter();
      chatWindow.appendChild(footer);
      console.log('Footer added to chat window');

      document.body.appendChild(chatWindow);
      this.chatElement = chatWindow;
      this.messagesContainer = messagesContainer;
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

      // Upload button (always show)
      const uploadButton = this.createUploadButton();
      container.appendChild(uploadButton);

      // Voice button (always show)
      const voiceButton = this.createVoiceButton();
      container.appendChild(voiceButton);

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
        background-color: #fef3c7;
        color: #92400e;
        padding: 10px 16px;
        text-align: center;
        font-size: 12px;
        border-radius: 0 0 ${this.config.theme.chatWindow.borderRadiusStyle === 'rounded' ? '12px 12px' : '4px 4px'};
        border-top: 2px solid #f59e0b;
        font-weight: 500;
        min-height: 35px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      // Use footer config if available, otherwise use defaults
      const footerConfig = this.config.theme.chatWindow.footer || {
        text: 'Free customizable chat widget for n8n',
        link: 'https://botstitch.com',
        linkText: 'botstitch.com'
      };

      const footerText = document.createElement('span');
      footerText.textContent = footerConfig.text + ' | ';
      
      const footerLink = document.createElement('a');
      footerLink.href = footerConfig.link;
      footerLink.textContent = footerConfig.linkText;
      footerLink.target = '_blank';
      footerLink.style.cssText = `
        color: #92400e;
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

    async sendMessage() {
      const message = this.inputElement.value.trim();
      if (!message) return;

      this.addMessage(message, 'user');
      this.inputElement.value = '';
      this.adjustTextareaHeight(this.inputElement);

      try {
        const response = await fetch(this.config.n8nChatUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: message,
            metadata: this.config.metadata,
            sessionId: this.id
          })
        });

        const data = await response.json();
        this.addMessage(data.message || 'Thanks for your message!', 'bot', this.config.theme.chatWindow.renderHTML);
      } catch (error) {
        console.error('Error sending message:', error);
        this.addMessage(this.config.theme.chatWindow.errorMessage, 'bot');
      }
    }

    handleFileUpload(event) {
      const files = Array.from(event.target.files);
      const config = this.config.theme.chatWindow.uploadsConfig;
      
      // Check if uploads are actually enabled
      if (!config.enabled) {
        this.addMessage('File uploads are not enabled for this chat.', 'bot');
        return;
      }
      
      if (files.length > config.maxFiles) {
        this.addMessage(`Too many files. Maximum ${config.maxFiles} files allowed.`, 'bot');
        return;
      }

      files.forEach(file => {
        if (file.size > config.maxSizeInMB * 1024 * 1024) {
          this.addMessage(`File "${file.name}" is too large. Maximum size is ${config.maxSizeInMB}MB.`, 'bot');
          return;
        }

        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!config.acceptFileTypes.includes(fileExtension)) {
          this.addMessage(`File type "${fileExtension}" is not allowed.`, 'bot');
          return;
        }

        this.addMessage(`📄 Uploaded: ${file.name}`, 'user');
      });
    }

    async toggleVoiceRecording() {
      // Check if voice recording is enabled
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
        this.startRecording();
      }
    }

    async startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];

        this.mediaRecorder.addEventListener('dataavailable', event => {
          this.audioChunks.push(event.data);
        });

        this.mediaRecorder.addEventListener('stop', () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
          this.addMessage('🎙️ Voice message recorded', 'user');
          stream.getTracks().forEach(track => track.stop());
        });

        this.mediaRecorder.start();
        this.isRecording = true;
        this.voiceButton.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        `;
        this.voiceButton.classList.add('botstitch-recording');

        setTimeout(() => {
          if (this.isRecording) {
            this.stopRecording();
          }
        }, this.config.theme.chatWindow.voiceInputConfig.maxRecordingTime * 1000);

      } catch (error) {
        console.error('Error starting recording:', error);
        this.addMessage(this.config.theme.chatWindow.voiceInputConfig.recordingNotSupportedMessage, 'bot');
      }
    }

    stopRecording() {
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();
        this.isRecording = false;
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

    open() {
      this.isOpen = true;
      this.chatElement.classList.remove('botstitch-hidden');
      this.chatElement.classList.add('botstitch-fade-in');
      this.hideTooltip();
      
      if (this.config.theme.chatWindow.textInput.autoFocus) {
        setTimeout(() => this.inputElement.focus(), 100);
      }

      // Add starter prompts only once on first open
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
      if (this.buttonElement) this.buttonElement.remove();
      if (this.chatElement) this.chatElement.remove();
      if (this.tooltipElement) this.tooltipElement.remove();
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
        // Fetch widget config from API
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
