// BotStitch Web Component Chat Widget Loader (EXCELLENT, Production-Grade)
(function(){
  if (typeof window === 'undefined') return;
  if (!window.customElements || window.customElements.get('botstitch-widget')) return;

  // Deep merge utility
  function deepMerge(target, ...sources) {
    for (const source of sources) {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
    return target;
  }

  // Default WidgetConfig (from markdown)
  const defaultConfig = {
    id: '',
    n8nChatUrl: '',
    metadata: {},
    theme: {
      button: {
        backgroundColor: '#8b5cf6',
        right: 24,
        bottom: 24,
        size: 56,
        iconColor: '#fff',
        borderRadius: 'circle',
        customIconSrc: '',
        customIconSize: 32,
        customIconBorderRadius: 8,
        position: 'bottom-right',
        showBranding: true,
        premium: false,
      },
      tooltip: {},
      chatWindow: {
        backgroundColor: '#fff',
        height: 480,
        width: 360,
        borderRadiusStyle: 'rounded',
        showTitle: true,
        title: 'BotStitch Assistant',
        titleAvatarSrc: '',
        welcomeMessage: '👋 Hi there! How can I help you with BotStitch today?',
        errorMessage: 'Sorry, something went wrong. Please try again.',
        fontSize: 15,
        botMessage: {
          backgroundColor: '#8b5cf6',
          textColor: '#fff',
          borderRadius: 10,
          fontSize: 15,
        },
        userMessage: {
          backgroundColor: '#f3f4f6',
          textColor: '#1c1c1c',
          borderRadius: 10,
          fontSize: 15,
        },
        textInput: {
          placeholder: 'Type your message...',
          backgroundColor: '#fff',
          textColor: '#1c1c1c',
          borderRadius: 10,
          fontSize: 15,
        },
        uploadsConfig: {
          enabled: false,
          acceptFileTypes: ['image/*', 'application/pdf'],
          maxFiles: 3,
          maxSizeInMB: 10,
        },
        voiceInputConfig: {
          enabled: false,
          maxRecordingTime: 30,
          recordingNotSupportedMessage: 'Voice input is not supported on this device.',
        },
        renderHTML: false,
        clearChatOnReload: false,
        showBranding: true,
        shadow: true,
      },
      footer: {},
    },
    features: {
      fileUpload: false,
      voiceInput: false,
    }
  };

  // Utility: create and inject styles into shadow DOM
  function injectStyles(shadowRoot, darkMode) {
    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
      .bs-root { font-family: system-ui, sans-serif; }
      .bs-bubble { transition: box-shadow 0.2s, transform 0.2s; }
      .bs-bubble:focus { outline: 2px solid #6366f1; }
      .bs-chat-window { box-shadow: 0 8px 32px rgba(139,92,246,0.2); transition: opacity 0.2s; }
      .bs-header { font-weight: 600; font-size: 16px; display: flex; align-items: center; gap: 10px; }
      .bs-close-btn { background: none; border: none; color: #fff; cursor: pointer; font-size: 22px; }
      .bs-messages { flex: 1; overflow-y: auto; padding: 16px; background: var(--bs-msg-bg, #f9fafb); }
      .bs-msg { margin-bottom: 8px; padding: 12px 16px; border-radius: 14px; max-width: 80%; }
      .bs-msg.bot { background: var(--bs-bot-bg, #8b5cf6); color: var(--bs-bot-color, #fff); border-radius: 14px 14px 4px 14px; }
      .bs-msg.user { background: var(--bs-user-bg, #f3f4f6); color: var(--bs-user-color, #1c1c1c); border-radius: 14px 14px 14px 4px; margin-left: auto; }
      .bs-input-row { display: flex; gap: 8px; align-items: center; padding: 16px; border-top: 1px solid #e5e7eb; background: var(--bs-input-bg, #fff); }
      .bs-input { flex: 1; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 15px; outline: none; background: var(--bs-input-bg, #fff); color: var(--bs-input-color, #222); }
      .bs-send-btn { background: #8b5cf6; color: #fff; border: none; padding: 10px 14px; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 15px; display: flex; align-items: center; justify-content: center; }
      .bs-upload-btn, .bs-voice-btn { background: none; border: none; cursor: pointer; padding: 0 6px; }
      .bs-upload-btn:hover, .bs-voice-btn:hover { opacity: 0.7; }
      .bs-voice-btn.recording { color: #ef4444; animation: pulse 1s infinite; }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      .bs-branding { padding: 8px 0 12px 0; text-align: center; font-size: 12px; color: #aaa; }
      .bs-typing { font-size: 13px; color: #888; margin: 8px 0; }
      .bs-file-input { display: none; }
      .bs-file-preview { display: flex; gap: 8px; margin: 8px 0; flex-wrap: wrap; }
      .bs-file-item { display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: #f3f4f6; border-radius: 4px; font-size: 12px; }
      .bs-file-remove { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 14px; }
      @media (max-width: 600px) {
        .bs-chat-window { width: 98vw !important; height: 80vh !important; right: 1vw !important; bottom: 80px !important; }
      }
      ${darkMode ? `
        .bs-root, .bs-chat-window, .bs-input-row { background: #18181b !important; color: #f3f4f6 !important; }
        .bs-input { background: #27272a !important; color: #f3f4f6 !important; border-color: #444; }
        .bs-msg.user { background: #27272a !important; color: #f3f4f6 !important; }
        .bs-msg.bot { background: #8b5cf6 !important; color: #fff !important; }
        .bs-file-item { background: #27272a !important; color: #f3f4f6 !important; }
      ` : ''}
    `;
    shadowRoot.appendChild(style);
  }

  class BotStitchWidget extends HTMLElement {
    set config(val) {
      this._config = deepMerge(JSON.parse(JSON.stringify(defaultConfig)), val);
      if (this._initialized) this._render();
    }
    get config() { return this._config; }
    
    constructor() {
      super();
      this._config = JSON.parse(JSON.stringify(defaultConfig));
      this._shadow = this.attachShadow({mode: 'open'});
      this._container = document.createElement('div');
      this._shadow.appendChild(this._container);
      this._initialized = false;
      this._darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this._mediaRecorder = null;
      this._audioChunks = [];
      this._isRecording = false;
      this._selectedFiles = [];
      
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        this._darkMode = e.matches;
        this._render();
      });
    }
    
    connectedCallback() {
      this._upgradeProperties();
      this._render();
      this._initialized = true;
    }
    
    _upgradeProperties() {
      if (this.hasAttribute('data-config')) {
        try { this.config = JSON.parse(this.getAttribute('data-config')); } catch (e) { console.warn('Invalid data-config JSON', e); }
      }
    }
    
    _addMessage(content, isUser = false, files = []) {
      const messagesArea = this._shadow.querySelector('.bs-messages');
      if (!messagesArea) return;
      
      const msgDiv = document.createElement('div');
      msgDiv.className = `bs-msg ${isUser ? 'user' : 'bot'}`;
      msgDiv.style.background = isUser 
        ? (this._config.theme.chatWindow.userMessage.backgroundColor || '#f3f4f6')
        : (this._config.theme.chatWindow.botMessage.backgroundColor || this._config.theme.button.backgroundColor);
      msgDiv.style.color = isUser 
        ? (this._config.theme.chatWindow.userMessage.textColor || '#1c1c1c')
        : (this._config.theme.chatWindow.botMessage.textColor || '#fff');
      msgDiv.style.padding = '12px 16px';
      msgDiv.style.borderRadius = isUser ? '14px 14px 14px 4px' : '14px 14px 4px 14px';
      msgDiv.style.maxWidth = '80%';
      msgDiv.style.margin = isUser ? '8px 0 8px auto' : '8px 0';
      
      // Add text content
      if (content) {
        const textDiv = document.createElement('div');
        textDiv.innerText = content;
        msgDiv.appendChild(textDiv);
      }
      
      // Add file previews
      if (files && files.length > 0) {
        const filePreview = document.createElement('div');
        filePreview.className = 'bs-file-preview';
        filePreview.style.marginTop = '8px';
        
        files.forEach(file => {
          const fileItem = document.createElement('div');
          fileItem.className = 'bs-file-item';
          fileItem.innerHTML = `
            <span>📎 ${file.name}</span>
            <span style="color: #666;">(${(file.size / 1024 / 1024).toFixed(1)}MB)</span>
          `;
          filePreview.appendChild(fileItem);
        });
        
        msgDiv.appendChild(filePreview);
      }
      
      messagesArea.appendChild(msgDiv);
      messagesArea.scrollTop = messagesArea.scrollHeight;
    }
    
    _sendMessage(text = '', files = []) {
      if (!text.trim() && files.length === 0) return;
      
      // Add user message
      this._addMessage(text, true, files);
      
      // Clear input and files
      const input = this._shadow.querySelector('#botstitch-input');
      if (input) input.value = '';
      this._selectedFiles = [];
      this._updateFilePreview();
      
      // Simulate bot response (replace with actual API call)
      setTimeout(() => {
        let response = 'Thanks for your message!';
        if (files.length > 0) {
          response += ` I received ${files.length} file(s).`;
        }
        response += ' (Demo preview)';
        this._addMessage(response, false);
      }, 800);
    }
    
    _updateFilePreview() {
      const filePreview = this._shadow.querySelector('.bs-file-preview');
      if (!filePreview) return;
      
      filePreview.innerHTML = '';
      
      this._selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'bs-file-item';
        fileItem.innerHTML = `
          <span>📎 ${file.name}</span>
          <span style="color: #666;">(${(file.size / 1024 / 1024).toFixed(1)}MB)</span>
          <button class="bs-file-remove" onclick="this.parentElement.remove(); this._selectedFiles.splice(${index}, 1); this._updateFilePreview();">×</button>
        `;
        filePreview.appendChild(fileItem);
      });
    }
    
    _handleFileUpload() {
      const fileInput = this._shadow.querySelector('.bs-file-input');
      if (!fileInput) return;
      
      fileInput.click();
    }
    
    _handleFileSelect(event) {
      const files = Array.from(event.target.files);
      const config = this._config.theme.chatWindow.uploadsConfig;
      
      // Validate file count
      if (this._selectedFiles.length + files.length > config.maxFiles) {
        alert(`Maximum ${config.maxFiles} files allowed.`);
        return;
      }
      
      // Validate file size
      const oversizedFiles = files.filter(file => file.size > config.maxSizeInMB * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        alert(`Files must be smaller than ${config.maxSizeInMB}MB.`);
        return;
      }
      
      // Validate file types
      const invalidFiles = files.filter(file => {
        return !config.acceptFileTypes.some(type => {
          if (type.endsWith('/*')) {
            return file.type.startsWith(type.replace('/*', ''));
          }
          return file.type === type;
        });
      });
      
      if (invalidFiles.length > 0) {
        alert(`Invalid file type. Allowed: ${config.acceptFileTypes.join(', ')}`);
        return;
      }
      
      this._selectedFiles.push(...files);
      this._updateFilePreview();
    }
    
    async _handleVoiceInput() {
      const voiceBtn = this._shadow.querySelector('#botstitch-voice');
      if (!voiceBtn) return;
      
      if (this._isRecording) {
        // Stop recording
        this._stopRecording();
        return;
      }
      
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this._mediaRecorder = new MediaRecorder(stream);
        this._audioChunks = [];
        
        this._mediaRecorder.ondataavailable = (event) => {
          this._audioChunks.push(event.data);
        };
        
        this._mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this._audioChunks, { type: 'audio/wav' });
          const audioFile = new File([audioBlob], 'voice-message.wav', { type: 'audio/wav' });
          this._selectedFiles = [audioFile];
          this._updateFilePreview();
          this._addMessage('Voice message recorded', true, [audioFile]);
          
          // Simulate bot response
          setTimeout(() => {
            this._addMessage('I received your voice message! (Demo preview)', false);
          }, 800);
        };
        
        this._mediaRecorder.start();
        this._isRecording = true;
        voiceBtn.classList.add('recording');
        voiceBtn.title = 'Stop recording';
        
        // Auto-stop after max time
        setTimeout(() => {
          if (this._isRecording) {
            this._stopRecording();
          }
        }, (this._config.theme.chatWindow.voiceInputConfig.maxRecordingTime || 30) * 1000);
        
      } catch (error) {
        console.error('Voice recording failed:', error);
        alert(this._config.theme.chatWindow.voiceInputConfig.recordingNotSupportedMessage || 'Voice recording is not supported.');
      }
    }
    
    _stopRecording() {
      if (this._mediaRecorder && this._isRecording) {
        this._mediaRecorder.stop();
        this._mediaRecorder.stream.getTracks().forEach(track => track.stop());
        this._isRecording = false;
        
        const voiceBtn = this._shadow.querySelector('#botstitch-voice');
        if (voiceBtn) {
          voiceBtn.classList.remove('recording');
          voiceBtn.title = 'Voice input';
        }
      }
    }
    
    _render() {
      this._container.innerHTML = '';
      injectStyles(this._shadow, this._darkMode);
      
      // Widget root
      const root = document.createElement('div');
      root.className = 'bs-root';
      root.style.position = 'fixed';
      const pos = (this._config.theme.button.position || 'bottom-right').split('-');
      root.style[pos[0]] = '24px';
      root.style[pos[1]] = '24px';
      root.style.zIndex = 9999;
      
      // Bubble button
      const bubble = document.createElement('button');
      bubble.className = 'bs-bubble';
      bubble.style.background = this._config.theme.button.backgroundColor;
      bubble.style.width = bubble.style.height = '56px';
      bubble.style.borderRadius = '50%';
      bubble.style.display = 'flex';
      bubble.style.alignItems = 'center';
      bubble.style.justifyContent = 'center';
      bubble.style.boxShadow = '0 4px 16px rgba(139, 92, 246, 0.3)';
      bubble.style.cursor = 'pointer';
      bubble.style.transition = 'transform 0.2s';
      bubble.innerHTML = this._config.theme.button.customIconSrc && this._config.theme.button.premium
        ? `<img src="${this._config.theme.button.customIconSrc}" alt="BotStitch" style="width:32px;height:32px;border-radius:8px;" />`
        : `<svg width="28" height="28" fill="none" stroke="#fff" stroke-width="2"><circle cx="14" cy="14" r="12" /></svg>`;
      
      // Chat window
      const chatWindow = document.createElement('div');
      chatWindow.className = 'bs-chat-window';
      chatWindow.style.display = 'none';
      chatWindow.style.width = (this._config.theme.chatWindow.width ? this._config.theme.chatWindow.width + 'px' : '360px');
      chatWindow.style.maxWidth = '95vw';
      chatWindow.style.height = (this._config.theme.chatWindow.height ? this._config.theme.chatWindow.height + 'px' : '480px');
      chatWindow.style.maxHeight = '80vh';
      chatWindow.style.background = this._config.theme.chatWindow.backgroundColor || '#fff';
      chatWindow.style.borderRadius = (typeof this._config.theme.chatWindow.borderRadius === 'number' ? this._config.theme.chatWindow.borderRadius + 'px' : this._config.theme.chatWindow.borderRadius || '18px');
      chatWindow.style.boxShadow = this._config.theme.chatWindow.shadow === false ? 'none' : '0 8px 32px rgba(139, 92, 246, 0.2)';
      chatWindow.style.position = 'absolute';
      chatWindow.style.bottom = '72px';
      chatWindow.style.right = '0';
      chatWindow.style.overflow = 'hidden';
      chatWindow.style.display = 'flex';
      chatWindow.style.flexDirection = 'column';
      chatWindow.style.transition = 'opacity 0.2s';
      if (this._config.theme.chatWindow.fontFamily) chatWindow.style.fontFamily = this._config.theme.chatWindow.fontFamily;
      chatWindow.style.fontSize = (this._config.theme.chatWindow.fontSize || 15) + 'px';
      
      // Header
      const header = document.createElement('div');
      header.className = 'bs-header';
      header.style.background = this._config.theme.button.backgroundColor;
      header.style.color = '#fff';
      header.style.padding = '16px';
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';
      header.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          ${this._config.theme.chatWindow.titleAvatarSrc ? `<img src="${this._config.theme.chatWindow.titleAvatarSrc}" alt="Avatar" style="width:32px;height:32px;border-radius:50%;" />` : ''}
          <div>
            <div style="font-weight:600;font-size:16px;">${this._config.theme.chatWindow.title}</div>
            <div style="font-size:12px;opacity:0.85;">Online now</div>
          </div>
        </div>
        <button id="botstitch-close-btn" class="bs-close-btn">&times;</button>
      `;
      
      // Messages area
      const messagesArea = document.createElement('div');
      messagesArea.className = 'bs-messages';
      messagesArea.style.flex = '1';
      messagesArea.style.padding = '16px';
      messagesArea.style.overflowY = 'auto';
      messagesArea.style.background = this._config.theme.chatWindow.botMessage.backgroundColor || '#f9fafb';
      
      // Add welcome message
      if (this._config.theme.chatWindow.welcomeMessage) {
        this._addMessage(this._config.theme.chatWindow.welcomeMessage, false);
      }
      
      // Input area
      const inputArea = document.createElement('div');
      inputArea.className = 'bs-input-row';
      inputArea.style.padding = '16px';
      inputArea.style.borderTop = `1px solid ${this._config.theme.chatWindow.border || '#e5e7eb'}`;
      inputArea.style.background = this._config.theme.chatWindow.backgroundColor || '#fff';
      inputArea.style.fontSize = (this._config.theme.chatWindow.fontSize || 15) + 'px';
      
      // File input (hidden)
      const fileInput = document.createElement('input');
      fileInput.className = 'bs-file-input';
      fileInput.type = 'file';
      fileInput.multiple = true;
      fileInput.accept = (this._config.theme.chatWindow.uploadsConfig.acceptFileTypes || ['*/*']).join(',');
      
      // File preview area
      const filePreview = document.createElement('div');
      filePreview.className = 'bs-file-preview';
      filePreview.style.display = 'none';
      
      // Feature flags
      const features = this._config.features || {};
      const uploadsEnabled = features.fileUpload || this._config.theme.chatWindow.uploadsConfig.enabled;
      const voiceEnabled = features.voiceInput || this._config.theme.chatWindow.voiceInputConfig.enabled;
      
      inputArea.innerHTML = `
        <div style="display:flex;gap:8px;align-items:center;">
          ${uploadsEnabled ? `<button id="botstitch-upload" class="bs-upload-btn" title="Upload file"><svg width="22" height="22" fill="none" stroke="#888" stroke-width="2"><path d="M16.5 13.5V17a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3.5"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></button>` : ''}
          <input id="botstitch-input" type="text" placeholder="${this._config.theme.chatWindow.textInput.placeholder || 'Type your message...'}" class="bs-input" />
          ${voiceEnabled ? `<button id="botstitch-voice" class="bs-voice-btn" title="Voice input"><svg width="22" height="22" fill="none" stroke="#888" stroke-width="2"><rect x="9" y="3" width="4" height="10" rx="2"/><path d="M5 10v2a7 7 0 0 0 14 0v-2"/><line x1="12" y1="19" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></svg></button>` : ''}
          <button id="botstitch-send" class="bs-send-btn" title="Send">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12l15-6-6 15-2-7-7-2z"/></svg>
          </button>
        </div>
      `;
      
      // Branding
      let brandingText = '';
      if (!this._config.theme.button.premium && this._config.theme.chatWindow.showBranding) {
        brandingText = '<span>Powered by BotStitch</span>';
      }
      const branding = document.createElement('div');
      branding.className = 'bs-branding';
      branding.style.padding = '8px 0 12px 0';
      branding.style.textAlign = 'center';
      branding.style.fontSize = '12px';
      branding.style.color = '#aaa';
      branding.innerHTML = brandingText;
      
      // Assemble
      chatWindow.appendChild(header);
      chatWindow.appendChild(messagesArea);
      chatWindow.appendChild(filePreview);
      chatWindow.appendChild(inputArea);
      chatWindow.appendChild(branding);
      root.appendChild(bubble);
      root.appendChild(chatWindow);
      root.appendChild(fileInput);
      this._container.appendChild(root);
      
      // Event listeners
      bubble.onclick = () => {
        chatWindow.style.display = chatWindow.style.display === 'none' ? 'flex' : 'none';
        if (chatWindow.style.display === 'flex') {
          setTimeout(() => chatWindow.style.opacity = '1', 10);
        } else {
          chatWindow.style.opacity = '0';
        }
      };
      
      header.querySelector('#botstitch-close-btn').onclick = () => {
        chatWindow.style.display = 'none';
      };
      
      // Send message
      inputArea.querySelector('#botstitch-send').onclick = () => {
        const input = inputArea.querySelector('#botstitch-input');
        this._sendMessage(input.value, this._selectedFiles);
      };
      
      // Enter key to send
      inputArea.querySelector('#botstitch-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const input = inputArea.querySelector('#botstitch-input');
          this._sendMessage(input.value, this._selectedFiles);
        }
      });
      
      // File upload
      if (uploadsEnabled) {
        inputArea.querySelector('#botstitch-upload').onclick = () => this._handleFileUpload();
        fileInput.onchange = (e) => this._handleFileSelect(e);
      }
      
      // Voice input
      if (voiceEnabled) {
        inputArea.querySelector('#botstitch-voice').onclick = () => this._handleVoiceInput();
      }
    }
  }
  
  window.customElements.define('botstitch-widget', BotStitchWidget);

  // Global ChatWidget object for compatibility
  if (!window.ChatWidget) {
    window.ChatWidget = {
      instances: new Map(),
      init: (config) => {
        if (!config || !config.id) {
          console.warn('ChatWidget.init: config.id is required');
          return;
        }
        window.ChatWidget.destroy(config.id);
        
        function appendWidget() {
          const el = document.createElement('botstitch-widget');
          el.config = config;
          el.id = `chat-widget-${config.id}`;
          if (document.body) {
            document.body.appendChild(el);
            window.ChatWidget.instances.set(config.id, el);
          } else {
            console.warn('ChatWidget.init: document.body is not available. Widget not appended.');
          }
          return el;
        }
        
        if (document.readyState === 'loading') {
          window.addEventListener('DOMContentLoaded', appendWidget);
        } else {
          appendWidget();
        }
      },
      destroy: (id) => {
        const el = document.getElementById(`chat-widget-${id}`);
        if (el && el.parentNode) el.parentNode.removeChild(el);
        window.ChatWidget.instances.delete(id);
      }
    };
  }

  if (!window.customElements) {
    console.warn('Custom elements are not supported in this browser. BotStitch widget cannot be rendered.');
  }
})(); 
