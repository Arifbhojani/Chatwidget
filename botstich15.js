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
        this.starterPromptsDisplayed = false;
        
        // NEW: Form & Human Transfer
        this.userInfo = null;
        this.chatStartTime = null;
        this.timerInterval = null;
    this.humanModeActive = false;
        this.pollingInterval = null;
        this.formSubmitted = false;
    this.isHumanTransferred = false;
        
        this.init();
      }
  
      generateSessionId() {
        const existing = sessionStorage.getItem('botstitch_sessionId');
        if (existing) return existing;
        
        const newId = 'botstitch-widget-' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('botstitch_sessionId', newId);
        return newId;
      }
  
      getDefaultConfig(config = {}) {
        const defaults = {
          n8nChatUrl: '',
          n8nAudioFastUrl: '',
          n8nAudioStorageUrl: '',
          metadata: {},
          // NEW: Feature flags
          features: {
            formCollection: {
              enabled: false,
              fields: ['name', 'email'],
              persistence: 'session', // 'session' | 'permanent' | '24h' | '7d' | 'none'
              allowReset: true // Show reset button in header
            },
            humanTransfer: {
              enabled: false,
              triggerAfterSeconds: 120
            }
          },
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
              header: {
                backgroundColor: '#f36539',
                textColor: '#fafafa'
              },
              footer: {
                enabled: true,
                text: 'Powered by',
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
        console.log('🚀 BotStitch Widget v2.7.0 initializing...');
        
        // Check if user info already exists based on persistence setting
        const persistence = this.config.features?.formCollection?.persistence || 'session';
        let savedUserInfo = null;
        
        switch(persistence) {
          case 'session':
            savedUserInfo = sessionStorage.getItem('botstitch_userInfo_' + this.id);
            break;
          case 'permanent':
            savedUserInfo = localStorage.getItem('botstitch_userInfo_' + this.id);
            break;
          case '24h':
          case '7d':
            savedUserInfo = localStorage.getItem('botstitch_userInfo_' + this.id);
            if (savedUserInfo) {
              const parsed = JSON.parse(savedUserInfo);
              const expiryHours = persistence === '24h' ? 24 : (7 * 24);
              if (Date.now() < parsed.expiry) {
                this.userInfo = parsed.data;
                this.formSubmitted = true;
              } else {
                // Expired
                localStorage.removeItem('botstitch_userInfo_' + this.id);
                savedUserInfo = null;
              }
            }
            break;
          case 'none':
            // Always show form
            savedUserInfo = null;
            break;
        }
        
        // Parse saved info if not already parsed (for session/permanent)
        if (savedUserInfo && !this.userInfo && persistence !== '24h' && persistence !== '7d') {
          try {
            this.userInfo = JSON.parse(savedUserInfo);
            this.formSubmitted = true;
          } catch(e) {
            console.error('Error parsing saved user info:', e);
          }
        }
        
        this.createStyles();
        this.createButton();
        this.createChatWindow();
        
        if (this.config.theme.button.autoWindowOpen.autoOpen) {
          setTimeout(() => {
            this.open();
          }, this.config.theme.button.autoWindowOpen.openDelay * 1000);
        }
  
        // NEW: Check if form is required
        if (this.config.features.formCollection?.enabled && !this.formSubmitted) {
          // Form will be shown when chat opens
          console.log('📋 Form collection enabled');
        } else {
          // Add welcome message
          this.addMessage(this.config.theme.chatWindow.welcomeMessage, 'bot');
        }
        
        // NEW: Start timer if human transfer enabled
        if (this.config.features.humanTransfer?.enabled) {
          console.log('⏱️ Human transfer enabled');
        }
        
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
          .botstitch-form-container {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            margin: 15px;
          }
          .botstitch-form-container h3 {
            margin: 0 0 15px 0;
            font-size: 18px;
            color: #333;
          }
          .botstitch-form-container form {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .botstitch-form-container input,
          .botstitch-form-container select {
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
          }
          .botstitch-form-container button {
            background: #1175D6;
            color: #fff;
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
          }
          .botstitch-transfer-offer {
            background: #fff3cd;
            padding: 15px;
            border-radius: 12px;
            margin: 15px;
          }
          .botstitch-transfer-offer p {
            margin: 0 0 12px 0;
            font-weight: 600;
            color: #856404;
          }
          .botstitch-transfer-buttons {
            display: flex;
            gap: 10px;
          }
          .botstitch-transfer-buttons button {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
          }
          .botstitch-btn-yes {
            background: #28a745;
            color: #fff;
          }
          .botstitch-btn-no {
            background: #6c757d;
            color: #fff;
          }
          @media (max-width: 480px) {
            .botstitch-widget.botstitch-chat-window {
              position: fixed !important;
              top: 50% !important;
              left: 50% !important;
              transform: translate(-50%, -50%) !important;
              width: 90vw !important;
              height: 80vh !important;
              max-width: 400px !important;
              max-height: 600px !important;
              border-radius: 12px !important;
              z-index: 999999 !important;
              overflow: hidden !important;
              box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important;
            }
          }
          @media (max-width: 768px) and (orientation: landscape) {
            .botstitch-widget.botstitch-chat-window {
              height: 85vh !important;
              max-height: 500px !important;
            }
          }
          @supports (-webkit-touch-callout: none) {
            @media (max-width: 480px) {
              .botstitch-widget.botstitch-chat-window {
                height: min(80vh, 600px) !important;
              }
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
  
        if (this.config.theme.chatWindow.showTitle) {
          const header = this.createHeader();
          chatWindow.appendChild(header);
        }
  
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
  
        const filePreviewArea = document.createElement('div');
        filePreviewArea.id = `${this.id}-file-preview`;
        filePreviewArea.style.cssText = `
          padding: 0 16px;
          max-height: 100px;
          overflow-y: auto;
          display: none;
        `;
        chatWindow.appendChild(filePreviewArea);
  
        const inputContainer = this.createInputContainer();
        chatWindow.appendChild(inputContainer);
  
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
        header.id = `${this.id}-header`;
        header.style.cssText = `
          background-color: ${this.config.theme.chatWindow.header.backgroundColor};
          color: ${this.config.theme.chatWindow.header.textColor};
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
        title.id = `${this.id}-title`;
        title.textContent = this.config.theme.chatWindow.title;
        title.style.fontWeight = '500';
        titleContainer.appendChild(title);
  
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  
        // Add reset button if form is enabled and allowReset is true
        if (this.config.features?.formCollection?.enabled && 
            this.config.features?.formCollection?.allowReset && 
            this.formSubmitted) {
          const resetButton = document.createElement('button');
          resetButton.title = 'Reset your information';
          resetButton.style.cssText = `
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
          resetButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M3 21v-5h5"/>
            </svg>
          `;
          resetButton.addEventListener('click', () => this.resetForm());
          buttonsContainer.appendChild(resetButton);
        }
  
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
  
        buttonsContainer.appendChild(closeButton);
  
        header.appendChild(titleContainer);
        header.appendChild(buttonsContainer);
  
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
  
        if (this.config.theme.chatWindow.uploadsConfig.enabled) {
          const uploadButton = this.createUploadButton();
          container.appendChild(uploadButton);
        }
  
        if (this.config.theme.chatWindow.voiceInputConfig.enabled) {
          const voiceButton = this.createVoiceButton();
          container.appendChild(voiceButton);
        }
  
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
          background: transparent;
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
  
      createFooter() {
        const footer = document.createElement('div');
        footer.style.cssText = `
          background-color: #f8f9fa;
          color: #6c757d;
          padding: 12px 16px;
          text-align: center;
          font-size: 12px;
          border-radius: 0 0 ${this.config.theme.chatWindow.borderRadiusStyle === 'rounded' ? '12px 12px' : '4px 4px'};
          border-top: 1px solid #e9ecef;
          font-weight: 400;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        `;
  
        const footerConfig = this.config.theme.chatWindow.footer || {
          text: 'Powered by',
          link: 'https://botstitch.com',
          linkText: 'Botstitch'
        };
  
        const footerText = document.createElement('span');
        footerText.textContent = footerConfig.text + ' |';
        footerText.style.color = '#6c757d';
        
        const footerLink = document.createElement('a');
        footerLink.href = footerConfig.link;
        footerLink.textContent = footerConfig.linkText;
        footerLink.target = '_blank';
        footerLink.style.cssText = `
          color: #007bff;
          text-decoration: none;
          font-weight: 600;
          margin-left: 4px;
        `;
        
        footerLink.addEventListener('mouseenter', () => {
          footerLink.style.textDecoration = 'underline';
        });
        
        footerLink.addEventListener('mouseleave', () => {
          footerLink.style.textDecoration = 'none';
        });
  
        footer.appendChild(footerText);
        footer.appendChild(footerLink);
        
        return footer;
      }
  
  // 🆕 Add User Form Display (after createChatWindow)
  showUserForm() {
    if (!this.config.userForm?.enabled) {
      this.chatStartTime = Date.now();
      return;
    }

    const formHTML = this.createFormHTML();
    this.addMessage(formHTML, 'bot', true);
  }

  createFormHTML() {
    const fields = (this.config.userForm && this.config.userForm.fields) || [];
    let html = '<div class="botstitch-user-form" style="padding: 10px;">';
    html += '<p style="margin-bottom: 15px; font-weight: 500;">Please fill in your details to start:</p>';
    
    fields.forEach(field => {
      html += `<div style="margin-bottom: 12px;">`;
      html += `<label style="display: block; margin-bottom: 4px; font-size: 13px;">${field.label}${field.required ? ' *' : ''}</label>`;
      
      if (field.type === 'select') {
        html += `<select id="form-${field.name}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" ${field.required ? 'required' : ''}>`;
        html += `<option value="">Select...</option>`;
        (field.options || []).forEach(opt => {
          html += `<option value="${opt}">${opt}</option>`;
        });
        html += `</select>`;
      } else {
        const placeholder = field.placeholder || '';
        html += `<input type="${field.type}" id="form-${field.name}" placeholder="${placeholder}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" ${field.required ? 'required' : ''}>`;
      }
      
      html += `</div>`;
    });
    
    const submitText = (this.config.userForm && this.config.userForm.submitButtonText) || 'Start Chat';
    html += `<button onclick="window.BotStitch.widgets.get('${this.id}').submitUserForm()" style="width: 100%; padding: 10px; background: ${this.config.theme.chatWindow.textInput.sendButtonColor}; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">${submitText}</button>`;
    html += '</div>';
    
    return html;
  }

  submitUserForm() {
    const fields = (this.config.userForm && this.config.userForm.fields) || [];
    const formData = {};
    let isValid = true;
    
    fields.forEach(field => {
      const input = document.getElementById(`form-${field.name}`);
      if (input) {
        formData[field.name] = input.value;
        if (field.required && !input.value) {
          isValid = false;
          input.style.borderColor = 'red';
        } else {
          input.style.borderColor = '#ddd';
        }
      }
    });
    
    if (!isValid) {
      this.addMessage('Please fill in all required fields.', 'bot');
      return;
    }
    
    this.userInfo = formData;
    this.chatStartTime = Date.now();
    if (this.config.humanTransfer?.enabled) {
      this.startNewHumanTransferTimer();
    }
    
    // Remove form from chat
    const formElements = document.querySelectorAll('.botstitch-user-form');
    formElements.forEach(el => el.remove());
    
    const userName = formData.name || 'there';
    this.addMessage(`Thanks ${userName}! How can I help you today?`, 'bot');
  }

  // 🆕 Timer for new humanTransfer config (auto trigger without extra user message)
  startNewHumanTransferTimer() {
    if (!this.config.humanTransfer?.enabled) return;
    if (!this.chatStartTime) this.chatStartTime = Date.now();
    if (this.timerInterval) return; // avoid duplicate timers
    const threshold = this.config.humanTransfer.timeThreshold || 120;
    this.timerInterval = setInterval(() => {
      if (this.isHumanTransferred) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        return;
      }
      const elapsed = (Date.now() - this.chatStartTime) / 1000;
      if (elapsed >= threshold) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.triggerHumanTransfer();
      }
    }, 5000);
  }

  // 🆕 Check if human transfer needed (call this in sendMessage)
  checkHumanTransfer() {
    if (!this.config.humanTransfer?.enabled) return false;
    if (this.isHumanTransferred) return false;
    if (!this.chatStartTime) return false;
    
    const elapsed = (Date.now() - this.chatStartTime) / 1000;
    
    if (elapsed >= this.config.humanTransfer.timeThreshold) {
      this.triggerHumanTransfer();
      return true;
    }
    
    return false;
  }

  // 🆕 Transfer to Human (new-config path)
  async triggerHumanTransfer() {
    this.isHumanTransferred = true;
    
    if (this.config.humanTransfer?.transferMessage) {
      this.addMessage(this.config.humanTransfer.transferMessage, 'bot');
    }
    
    const transferUrl = this.config.humanTransfer?.transferUrl;
    if (!transferUrl) {
      // Fallback to existing transfer if URL not provided
      if (typeof this.transferToHuman === 'function') {
        this.transferToHuman();
      }
      return;
    }
    
    try {
      const response = await fetch(transferUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.id,
          userInfo: this.userInfo,
          chatHistory: this.messages.filter(m => m.sender !== 'starter-prompts'),
          timestamp: new Date().toISOString(),
          duration: Math.floor((Date.now() - this.chatStartTime) / 1000)
        })
      });
      
      if (response.ok) {
        if (this.config.humanTransfer?.waitingMessage) {
          this.addMessage(this.config.humanTransfer.waitingMessage, 'bot');
        }
        this.startPolling();
      }
    } catch (error) {
      console.error('Transfer failed:', error);
      this.addMessage('Failed to connect to agent. Please try again.', 'bot');
    }
  }

      // NEW: Show form collection
      showFormCollection() {
        if (!this.messagesContainer) return;
        
        // CHECK: If form already exists, don't add again
        const existingForm = document.getElementById(`${this.id}-user-form`);
        if (existingForm) {
          console.log('⚠️ Form already displayed, skipping...');
          return;
        }
        
        const formFields = this.config.features.formCollection.fields || ['name', 'email'];
        
        const formContainer = document.createElement('div');
        formContainer.className = 'botstitch-form-container';
        formContainer.innerHTML = `
          <h3>Welcome! Please tell us about yourself</h3>
          <form id="${this.id}-user-form">
            ${formFields.includes('name') ? '<input type="text" name="name" placeholder="Your Name *" required>' : ''}
            ${formFields.includes('email') ? '<input type="email" name="email" placeholder="Email Address *" required>' : ''}
            ${formFields.includes('faith') ? `
              <select name="faith" required>
                <option value="">Faith Background *</option>
                <option value="Muslim">Muslim</option>
                <option value="Non-Muslim">Non-Muslim</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            ` : ''}
            ${formFields.includes('source') ? `
              <select name="source" required>
                <option value="">How did you find us? *</option>
                <option value="Google Search">Google Search</option>
                <option value="Social Media">Social Media</option>
                <option value="Friend">Friend/Family</option>
                <option value="Other">Other</option>
              </select>
            ` : ''}
            <button type="submit">Start Chat</button>
          </form>
        `;
        
        this.messagesContainer.appendChild(formContainer);
        
        const form = document.getElementById(`${this.id}-user-form`);
        form.addEventListener('submit', (e) => this.handleFormSubmit(e, formContainer));
        
        console.log('📋 Form displayed successfully');
      }
  
      // NEW: Handle form submission
      handleFormSubmit(e, formContainer) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userData = {};
        formData.forEach((value, key) => {
          userData[key] = value;
        });
        
        // Save based on persistence setting
        this.userInfo = userData;
        this.formSubmitted = true;
        
        const persistence = this.config.features?.formCollection?.persistence || 'session';
        
        switch(persistence) {
          case 'session':
            sessionStorage.setItem('botstitch_userInfo_' + this.id, JSON.stringify(userData));
            console.log('💾 Form saved to session (clears on browser close)');
            break;
          case 'permanent':
            localStorage.setItem('botstitch_userInfo_' + this.id, JSON.stringify(userData));
            console.log('💾 Form saved permanently');
            break;
          case '24h':
            localStorage.setItem('botstitch_userInfo_' + this.id, JSON.stringify({
              data: userData,
              expiry: Date.now() + (24 * 60 * 60 * 1000)
            }));
            console.log('💾 Form saved for 24 hours');
            break;
          case '7d':
            localStorage.setItem('botstitch_userInfo_' + this.id, JSON.stringify({
              data: userData,
              expiry: Date.now() + (7 * 24 * 60 * 60 * 1000)
            }));
            console.log('💾 Form saved for 7 days');
            break;
          case 'none':
            console.log('💾 Form not saved (will ask again next time)');
            break;
        }
        
        console.log('📋 Form Data:', userData);
        
        // Send to SAME N8N webhook with action flag
        fetch(this.config.n8nChatUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'submitForm',
            sessionId: this.id,
            name: userData.name || '',
            email: userData.email || '',
            faith: userData.faith || '',
            source: userData.source || '',
            timestamp: new Date().toISOString(),
            metadata: {
              userAgent: navigator.userAgent,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
          })
        })
        .then(response => response.json())
        .then(data => {
          console.log('✅ Form submitted to N8N:', data);
        })
        .catch(err => {
          console.error('❌ Form submission error:', err);
        });
        
        // Remove form and show welcome
        formContainer.remove();
        this.addMessage(`Thank you, ${userData.name}! ${this.config.theme.chatWindow.welcomeMessage}`, 'bot');
        
        // Show starter prompts
        if (this.config.theme.chatWindow.starterPrompts.length > 0 && !this.starterPromptsDisplayed) {
          this.showStarterPrompts();
        }
        
        // Start timer for human transfer
        if (this.config.features.humanTransfer?.enabled) {
          this.startHumanTransferTimer();
        }
      }
  
      // NEW: Start timer for human transfer
      startHumanTransferTimer() {
        this.chatStartTime = Date.now();
        const transferDelay = this.config.features.humanTransfer.triggerAfterSeconds || 120;
        
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
      }
  
      // NEW: Offer human transfer
      offerHumanTransfer() {
        if (!this.messagesContainer) return;
        
        const offerDiv = document.createElement('div');
        offerDiv.className = 'botstitch-transfer-offer';
        offerDiv.innerHTML = `
          <p>Would you like to speak with our team? 🙋</p>
          <div class="botstitch-transfer-buttons">
            <button class="botstitch-btn-yes" id="${this.id}-transfer-yes">Yes, connect me</button>
            <button class="botstitch-btn-no" id="${this.id}-transfer-no">No, continue</button>
          </div>
        `;
        
        this.messagesContainer.appendChild(offerDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        
        document.getElementById(`${this.id}-transfer-yes`).addEventListener('click', () => {
          offerDiv.remove();
          this.transferToHuman();
        });
        
        document.getElementById(`${this.id}-transfer-no`).addEventListener('click', () => {
          offerDiv.remove();
        });
      }
  
     // NEW: Transfer to human agent
      transferToHuman() {
        this.humanModeActive = true;
        
        // Update header
        const titleElement = document.getElementById(`${this.id}-title`);
        if (titleElement) {
          titleElement.textContent = '🟢 Connecting to agent...';
        }
        
        // Notify N8N - SAME WEBHOOK
        fetch(this.config.n8nChatUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'transferToHuman',  // ✅ Action flag
            sessionId: this.id,
            userInfo: this.userInfo,
            chatHistory: this.messages,
            duration: Math.floor((Date.now() - this.chatStartTime) / 1000),
            timestamp: new Date().toISOString()
          })
        })
        .then(res => res.json())
        .then(data => {
          if (titleElement) {
            titleElement.textContent = '🟢 Connected to Support Agent';
          }
          this.addMessage('You are now connected to our support team. An agent will respond shortly.', 'bot');
          this.startPolling();
          console.log('✅ Transfer successful:', data);
        })
        .catch(err => {
          console.error('Transfer error:', err);
          this.addMessage('Unable to connect to agent. Please try again later.', 'bot');
        });
      }
  
      // NEW: Start polling for agent replies (supports new humanTransfer config or legacy n8n path)
      startPolling() {
        if (this.pollingInterval) return;
        
        // Prefer new configurable polling if provided
        if (this.config.humanTransfer?.checkReplyUrl) {
          const checkUrl = this.config.humanTransfer.checkReplyUrl;
          const interval = this.config.humanTransfer.pollingInterval || 3000;
          this.pollingInterval = setInterval(async () => {
            try {
              const response = await fetch(`${checkUrl}?session=${this.id}`);
              const data = await response.json();
              
              if (data.newReply) {
                if (this.config.humanTransfer.showAgentName && data.agentName) {
                  const joinMsg = (this.config.humanTransfer.agentJoinedMessage || '{agentName} joined').replace('{agentName}', data.agentName);
                  this.addMessage(joinMsg, 'bot');
                }
                this.addMessage(data.reply, 'bot');
                if (typeof this.clearAgentReply === 'function') {
                  await this.clearAgentReply();
                }
              }
            } catch (error) {
              console.error('Polling error:', error);
            }
          }, interval);
          return;
        }

        // Legacy fallback to n8n endpoint
        const pollingEndpoint = this.config.n8nChatUrl.replace(/\/[^\/]*$/, '/CheckAgentReply');
        this.pollingInterval = setInterval(() => {
          fetch(`${pollingEndpoint}?session=${this.id}`)
            .then(res => res.json())
            .then(data => {
              if (data.newReply) {
                const agentPrefix = data.agentName ? `<strong>${data.agentName}:</strong> ` : '';
                this.addMessage(agentPrefix + data.reply, 'bot');
              }
            })
            .catch(err => console.error('Polling error:', err));
        }, 3000);
      }

      async clearAgentReply() {
        if (!this.config.humanTransfer?.checkReplyUrl) return;
        try {
          await fetch(this.config.humanTransfer.checkReplyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              session: this.id,
              action: 'clear'
            })
          });
        } catch (error) {
          console.error('Clear reply error:', error);
        }
      }
  
      async sendMessage() {
        const message = this.inputElement.value.trim();
        const hasFiles = this.pendingFiles.length > 0;
        
        if (!message && !hasFiles) return;

        // 🆕 Check if human transfer is needed (configurable path)
        if (typeof this.checkHumanTransfer === 'function' && this.config.humanTransfer?.enabled) {
          const triggered = this.checkHumanTransfer();
          if (triggered) {
            this.inputElement.value = '';
            this.adjustTextareaHeight(this.inputElement);
            return;
          }
        }
  
        if (message) {
          this.addMessage(message, 'user');
        }
  
        if (hasFiles) {
          const fileNames = this.pendingFiles.map(f => f.name).join(', ');
          this.addMessage(`📎 Attachments: ${fileNames}`, 'user');
        }
  
        this.inputElement.value = '';
        this.adjustTextareaHeight(this.inputElement);
  
        this.showTypingIndicator();
  
        try {
          let response;
  
          if (hasFiles) {
            response = await this.sendMessageWithFormData(message, this.pendingFiles);
          } else {
            response = await this.sendTextMessage(message);
          }
  
          const data = await response.json();
          this.handleN8NResponse(data);
  
        } catch (error) {
          console.error('Error sending message to N8N:', error);
          this.hideTypingIndicator();
          this.addMessage(this.config.theme.chatWindow.errorMessage, 'bot');
        }
  
        this.pendingFiles = [];
        this.showFilePreview();
      }
  
      async sendMessageWithFormData(message, files) {
        const formData = new FormData();
        
        const metadata = {
          clientCurrentDateTime: new Date().toString(),
          clientCurrentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ...this.config.metadata
        };
        
        formData.append("metadata", JSON.stringify(metadata));
        formData.append("action", "sendMessage");
        formData.append("sessionId", this.id);
        formData.append("chatInput", message || "");
        
        if (this.userInfo) {
          formData.append("userInfo", JSON.stringify(this.userInfo));
        }
        
        if (this.humanModeActive) {
          formData.append("mode", "human");
        }
  
        for (const file of files) {
          try {
            if (file instanceof File) {
              formData.append("upload", file, file.name);
              console.log(`✅ Appended file: ${file.name}, size: ${file.size}`);
            } else if (file.data && file.data.startsWith("data:")) {
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
          } catch (error) {
            console.error(`❌ Failed to process file ${file.name}:`, error);
            this.addMessage(`Failed to process file: ${file.name}`, 'bot');
          }
        }
  
        const endpoint = this.humanModeActive 
          ? this.config.n8nChatUrl.replace(/\/[^\/]*$/, '/HumanAgent')
          : this.config.n8nChatUrl;
  
        return fetch(endpoint, {
          method: 'POST',
          body: formData
        });
      }
  
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
        
        if (this.userInfo) {
          payload.userInfo = this.userInfo;
        }
        
        if (this.humanModeActive) {
          payload.mode = "human";
        }
  
        const endpoint = this.humanModeActive 
          ? this.config.n8nChatUrl.replace(/\/[^\/]*$/, '/HumanAgent')
          : this.config.n8nChatUrl;
  
        return fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
      }
  
      async sendAudioMessage(audioBlob, mimeType) {
        try {
          console.log('Processing audio with dual endpoint strategy...');
          this.showTypingIndicator();
  
          const base64Audio = await this.blobToBase64(audioBlob);
          
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
          
          if (this.userInfo) {
            fastPayload.userInfo = this.userInfo;
          }
          
          if (this.humanModeActive) {
            fastPayload.mode = "human";
          }
  
          const formData = new FormData();
          formData.append("metadata", JSON.stringify(fastPayload.metadata));
          formData.append("action", "sendMessage");
          formData.append("sessionId", this.id);
          formData.append("chatInput", "");
          formData.append("upload", audioBlob, `audio_${Date.now()}.wav`);
  
          console.log('Sending to both endpoints...');
  
          const fastEndpoint = this.config.n8nAudioFastUrl || this.config.n8nChatUrl;
          const storageEndpoint = this.config.n8nAudioStorageUrl || this.config.n8nChatUrl;
  
          const [fastResponse] = await Promise.allSettled([
            fetch(fastEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(fastPayload)
            }),
            
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
  
      handleN8NResponse(data) {
        this.hideTypingIndicator();
        
        let botMessage = '';
        
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
  
        if (data.chatId) {
          this.id = data.chatId;
        }
  
        this.addMessage(botMessage, 'bot', this.config.theme.chatWindow.renderHTML);
      }
  
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
            
            this.addMessage('🎙️ Voice message recorded', 'user');
            
            await this.sendAudioMessage(audioBlob, selectedMimeType);
            
            stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            this.updateVoiceButtonState();
          });
  
          this.mediaRecorder.start();
          this.updateVoiceButtonState();
  
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
          this.voiceButton.style.backgroundColor = '#ef4444';
          this.voiceButton.style.color = 'white';
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
          this.voiceButton.style.backgroundColor = 'transparent';
          this.voiceButton.style.color = '#666';
        }
      }
  
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
  
          this.pendingFiles.push(file);
          console.log(`Added file: ${file.name} (${this.formatFileSize(file.size)})`);
        }
  
        this.showFilePreview();
        event.target.value = '';
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
          
          // NEW: Prefer configurable userForm if enabled
          if (this.config.userForm?.enabled && !this.userInfo) {
            setTimeout(() => this.showUserForm(), 500);
          } else {
            // Original formCollection flow
            if (this.config.features.formCollection?.enabled && !this.formSubmitted) {
              const existingForm = document.getElementById(`${this.id}-user-form`);
              if (!existingForm) {
                this.showFormCollection();
              }
            } else {
              // Show starter prompts if not shown yet
              if (this.config.theme.chatWindow.starterPrompts.length > 0 && !this.starterPromptsDisplayed) {
                this.showStarterPrompts();
              }
              
              // Start timer if enabled and not already started
              if (this.config.features.humanTransfer?.enabled && !this.chatStartTime) {
                this.startHumanTransferTimer();
              }
            }
          }
          
          if (this.config.theme.chatWindow.textInput.autoFocus && this.inputElement) {
            setTimeout(() => this.inputElement.focus(), 100);
          }

          // 🆕 If new humanTransfer config is enabled and userInfo already present, start timer
          if (this.config.humanTransfer?.enabled && this.userInfo) {
            this.startNewHumanTransferTimer();
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
        if (this.starterPromptsDisplayed) return;
  
        const existing = document.getElementById(`${this.id}-starter-prompts`);
        if (existing) {
          this.starterPromptsDisplayed = true;
          return;
        }
  
        if (this.messages.some(msg => msg.sender === 'starter-prompts')) {
          this.starterPromptsDisplayed = true;
          return;
        }
  
        const promptsContainer = document.createElement('div');
        promptsContainer.id = `${this.id}-starter-prompts`;
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
              this.starterPromptsDisplayed = true;
              this.messages.push({ text: 'starter-prompts', sender: 'starter-prompts', timestamp: new Date() });
            });
            promptsContainer.appendChild(button);
          }
        });
  
        this.messagesContainer.appendChild(promptsContainer);
        this.starterPromptsDisplayed = true;
        this.messages.push({ text: 'starter-prompts', sender: 'starter-prompts', timestamp: new Date() });
      }
  
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
  
      send(message) {
        this.inputElement.value = message;
        this.sendMessage();
      }
  
      resetForm() {
        // Clear all storage
        localStorage.removeItem('botstitch_userInfo_' + this.id);
        sessionStorage.removeItem('botstitch_userInfo_' + this.id);
        
        // Reset state
        this.userInfo = null;
        this.formSubmitted = false;
        
        // Clear messages
        if (this.messagesContainer) {
          this.messagesContainer.innerHTML = '';
        }
        
        // Show form again
        if (this.config.features?.formCollection?.enabled) {
          this.showFormCollection();
        }
        
        console.log('🔄 Form reset - user will need to fill it again');
      }
  
      destroy() {
        if (this.isRecording) {
          this.stopRecording();
        }
        
        if (this.recordingTimeout) {
          clearTimeout(this.recordingTimeout);
        }
        
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
        }
        
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
        }
        
        if (this.buttonElement) this.buttonElement.remove();
        if (this.chatElement) this.chatElement.remove();
        if (this.tooltipElement) this.tooltipElement.remove();
        
        BotStitch.widgets.delete(this.id);
      }
    }
  
    window.BotStitch = BotStitch;
    window.Chatbot = BotStitch;
  
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