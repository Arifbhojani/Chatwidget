/**
 * BotStitch Enhanced Chat Widget
 * Version: 2.0.0
 * Replicate n8nchatui.com functionality with additional features
 * License: MIT
 */

(function() {
    'use strict';

    // Widget Configuration Schema
    const defaultConfig = {
        // Backend Integration
        n8nChatUrl: '',
        apiKey: '',
        metadata: {},
        
        // Plan Configuration
        plan: 'free', // 'free', 'premium', 'enterprise'
        
        // Theme Configuration
        theme: {
            // Floating Button
            button: {
                backgroundColor: '#007bff',
                iconColor: '#ffffff',
                right: 20,
                bottom: 20,
                size: 60,
                borderRadius: 'circle', // 'square', 'rounded', 'circle'
                customIconSrc: null,
                customIconSize: 70,
                autoWindowOpen: {
                    autoOpen: false,
                    openDelay: 3
                }
            },
            
            // Tooltip
            tooltip: {
                showTooltip: true,
                tooltipMessage: 'Need help? Chat with us!',
                tooltipBackgroundColor: '#1f2937',
                tooltipTextColor: '#ffffff',
                tooltipFontSize: 14
            },
            
            // Chat Window
            chatWindow: {
                borderRadiusStyle: 'rounded', // 'square', 'rounded'
                backgroundColor: '#ffffff',
                width: 380,
                height: 600,
                fontSize: 14,
                
                // Header
                showTitle: true,
                title: 'Chat with us',
                titleAvatarSrc: null,
                
                // Messages
                welcomeMessage: 'Hello! 👋 How can we help you today?',
                errorMessage: 'Sorry, something went wrong. Please try again.',
                starterPrompts: [],
                starterPromptFontSize: 13,
                
                // Bot Messages
                botMessage: {
                    backgroundColor: '#f1f5f9',
                    textColor: '#1e293b',
                    showAvatar: true,
                    avatarSrc: null
                },
                
                // User Messages
                userMessage: {
                    backgroundColor: '#007bff',
                    textColor: '#ffffff',
                    showAvatar: false,
                    avatarSrc: null
                },
                
                // Input Area
                textInput: {
                    placeholder: 'Type your message...',
                    backgroundColor: '#ffffff',
                    textColor: '#1f2937',
                    sendButtonColor: '#007bff',
                    maxChars: 500,
                    maxCharsWarningMessage: 'Message too long. Please keep it under 500 characters.',
                    autoFocus: false,
                    borderRadius: 8
                },
                
                // File Uploads (Premium Feature)
                uploadsConfig: {
                    enabled: false,
                    acceptFileTypes: ['jpeg', 'jpg', 'png', 'pdf', 'doc', 'docx'],
                    maxFiles: 3,
                    maxSizeInMB: 5
                },
                
                // Voice Input (Premium Feature)
                voiceInputConfig: {
                    enabled: false,
                    maxRecordingTime: 30,
                    recordingNotSupportedMessage: 'Voice recording requires a modern browser with microphone access.'
                },
                
                // Behavior
                renderHTML: false,
                clearChatOnReload: false
            }
        },
        
        // Branding
        branding: {
            showPoweredBy: true,
            customBranding: null,
            footerText: 'Powered by BotStitch',
            footerLink: 'https://botstitch.com'
        }
    };

    // Chat Widget Class
    class BotStitchWidget {
        constructor() {
            this.config = null;
            this.isOpen = false;
            this.isMinimized = false;
            this.session = null;
            this.messages = [];
            this.elements = {};
            this.isRecording = false;
            this.mediaRecorder = null;
            this.autoOpenTimer = null;
            
            // Unique session ID
            this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Analytics tracking
            this.analytics = {
                widgetLoaded: false,
                interactions: 0,
                messagesExchanged: 0,
                sessionDuration: 0,
                startTime: Date.now()
            };
        }

        // Initialize widget
        async init(userConfig) {
            try {
                this.config = this.mergeConfig(defaultConfig, userConfig);
                this.validateConfig();
                this.applyPlanRestrictions();
                
                await this.loadStyles();
                this.createFloatingButton();
                this.bindEvents();
                this.setupAnalytics();
                
                // Auto-open functionality
                if (this.config.theme.button.autoWindowOpen.autoOpen) {
                    this.scheduleAutoOpen();
                }
                
                this.trackEvent('widget_loaded');
                console.log('BotStitch Widget initialized successfully');
                
            } catch (error) {
                console.error('BotStitch Widget initialization failed:', error);
            }
        }

        // Merge configurations
        mergeConfig(defaultConfig, userConfig) {
            const merged = JSON.parse(JSON.stringify(defaultConfig));
            
            function deepMerge(target, source) {
                for (const key in source) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        target[key] = target[key] || {};
                        deepMerge(target[key], source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            }
            
            deepMerge(merged, userConfig);
            return merged;
        }

        // Validate configuration
        validateConfig() {
            if (!this.config.n8nChatUrl) {
                throw new Error('n8nChatUrl is required');
            }
            
            // Validate URL format
            try {
                new URL(this.config.n8nChatUrl);
            } catch (e) {
                throw new Error('Invalid n8nChatUrl format');
            }
        }

        // Apply plan-based restrictions
        applyPlanRestrictions() {
            const plan = this.config.plan || 'free';
            
            if (plan === 'free') {
                // Force branding for free tier
                this.config.branding.showPoweredBy = true;
                this.config.branding.footerText = 'Powered by BotStitch';
                this.config.branding.footerLink = 'https://botstitch.com';
                
                // Disable premium features
                this.config.theme.chatWindow.uploadsConfig.enabled = false;
                this.config.theme.chatWindow.voiceInputConfig.enabled = false;
                
                // Limit starter prompts
                if (this.config.theme.chatWindow.starterPrompts.length > 3) {
                    this.config.theme.chatWindow.starterPrompts = this.config.theme.chatWindow.starterPrompts.slice(0, 3);
                }
            }
        }

        // Load CSS styles
        async loadStyles() {
            const styleId = 'botstitch-widget-styles';
            if (document.getElementById(styleId)) return;

            const styles = this.generateCSS();
            const styleElement = document.createElement('style');
            styleElement.id = styleId;
            styleElement.textContent = styles;
            document.head.appendChild(styleElement);
        }

        // Generate dynamic CSS
        generateCSS() {
            const config = this.config.theme;
            const buttonRadius = this.getBorderRadius(config.button.borderRadius, config.button.size);
            const windowRadius = config.chatWindow.borderRadiusStyle === 'rounded' ? '12px' : '0px';

            return `
                .botstitch-widget * {
                    box-sizing: border-box;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                }
                
                .botstitch-button {
                    position: fixed;
                    right: ${config.button.right}px;
                    bottom: ${config.button.bottom}px;
                    width: ${config.button.size}px;
                    height: ${config.button.size}px;
                    background-color: ${config.button.backgroundColor};
                    border: none;
                    border-radius: ${buttonRadius};
                    cursor: pointer;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    transition: all 0.3s ease;
                }
                
                .botstitch-button:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
                }
                
                .botstitch-button svg {
                    width: ${config.button.size * 0.5}px;
                    height: ${config.button.size * 0.5}px;
                    fill: ${config.button.iconColor};
                }
                
                .botstitch-button.minimized svg {
                    transform: rotate(45deg);
                }
                
                .botstitch-tooltip {
                    position: fixed;
                    right: ${config.button.right + config.button.size + 10}px;
                    bottom: ${config.button.bottom + config.button.size / 2 - 20}px;
                    background-color: ${config.tooltip.tooltipBackgroundColor};
                    color: ${config.tooltip.tooltipTextColor};
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: ${config.tooltip.tooltipFontSize}px;
                    white-space: nowrap;
                    z-index: 9998;
                    opacity: 0;
                    transform: translateX(10px);
                    transition: all 0.3s ease;
                    pointer-events: none;
                }
                
                .botstitch-tooltip.show {
                    opacity: 1;
                    transform: translateX(0);
                }
                
                .botstitch-tooltip::after {
                    content: '';
                    position: absolute;
                    left: 100%;
                    top: 50%;
                    transform: translateY(-50%);
                    border: 6px solid transparent;
                    border-left-color: ${config.tooltip.tooltipBackgroundColor};
                }
                
                .botstitch-window {
                    position: fixed;
                    right: ${config.button.right}px;
                    bottom: ${config.button.bottom + config.button.size + 10}px;
                    width: ${config.chatWindow.width}px;
                    height: ${config.chatWindow.height}px;
                    background-color: ${config.chatWindow.backgroundColor};
                    border-radius: ${windowRadius};
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                    z-index: 9997;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transform: scale(0.8) translateY(20px);
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    pointer-events: none;
                }
                
                .botstitch-window.open {
                    transform: scale(1) translateY(0);
                    opacity: 1;
                    pointer-events: all;
                }
                
                .botstitch-header {
                    padding: 16px;
                    background: linear-gradient(135deg, ${config.button.backgroundColor}, ${this.adjustColor(config.button.backgroundColor, -20)});
                    color: white;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .botstitch-header-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background-color: rgba(255, 255, 255, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .botstitch-header-title {
                    flex: 1;
                    font-size: 16px;
                }
                
                .botstitch-close {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    opacity: 0.8;
                    transition: opacity 0.2s;
                }
                
                .botstitch-close:hover {
                    opacity: 1;
                    background-color: rgba(255, 255, 255, 0.1);
                }
                
                .botstitch-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .botstitch-message {
                    display: flex;
                    gap: 8px;
                    max-width: 85%;
                    animation: messageSlideIn 0.3s ease-out;
                }
                
                @keyframes messageSlideIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .botstitch-message.user {
                    align-self: flex-end;
                    flex-direction: row-reverse;
                }
                
                .botstitch-message-avatar {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background-color: #e2e8f0;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                }
                
                .botstitch-message-content {
                    background-color: ${config.chatWindow.botMessage.backgroundColor};
                    color: ${config.chatWindow.botMessage.textColor};
                    padding: 10px 14px;
                    border-radius: 18px;
                    font-size: ${config.chatWindow.fontSize}px;
                    line-height: 1.4;
                    word-wrap: break-word;
                }
                
                .botstitch-message.user .botstitch-message-content {
                    background-color: ${config.chatWindow.userMessage.backgroundColor};
                    color: ${config.chatWindow.userMessage.textColor};
                }
                
                .botstitch-starter-prompts {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-top: 8px;
                }
                
                .botstitch-starter-prompt {
                    background-color: #f8fafc;
                    border: 1px solid #e2e8f0;
                    padding: 8px 12px;
                    border-radius: 12px;
                    font-size: ${config.chatWindow.starterPromptFontSize}px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: left;
                }
                
                .botstitch-starter-prompt:hover {
                    background-color: #f1f5f9;
                    border-color: ${config.button.backgroundColor};
                }
                
                .botstitch-input-area {
                    padding: 16px;
                    border-top: 1px solid #e2e8f0;
                }
                
                .botstitch-input-container {
                    display: flex;
                    gap: 8px;
                    align-items: flex-end;
                    background-color: ${config.chatWindow.textInput.backgroundColor};
                    border: 1px solid #e2e8f0;
                    border-radius: ${config.chatWindow.textInput.borderRadius}px;
                    padding: 8px;
                }
                
                .botstitch-input {
                    flex: 1;
                    border: none;
                    outline: none;
                    resize: none;
                    background: transparent;
                    color: ${config.chatWindow.textInput.textColor};
                    font-size: 14px;
                    min-height: 20px;
                    max-height: 100px;
                }
                
                .botstitch-input::placeholder {
                    color: #94a3b8;
                }
                
                .botstitch-send-button {
                    background-color: ${config.chatWindow.textInput.sendButtonColor};
                    border: none;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .botstitch-send-button:hover {
                    transform: scale(1.1);
                }
                
                .botstitch-send-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }
                
                .botstitch-send-button svg {
                    width: 16px;
                    height: 16px;
                    fill: white;
                }
                
                .botstitch-file-input {
                    display: none;
                }
                
                .botstitch-upload-button, .botstitch-voice-button {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 4px;
                    transition: background-color 0.2s;
                }
                
                .botstitch-upload-button:hover, .botstitch-voice-button:hover {
                    background-color: #f1f5f9;
                }
                
                .botstitch-voice-button.recording {
                    background-color: #fecaca;
                    animation: pulse 1s infinite;
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                
                .botstitch-typing-indicator {
                    display: flex;
                    gap: 4px;
                    padding: 10px 14px;
                }
                
                .botstitch-typing-dot {
                    width: 6px;
                    height: 6px;
                    background-color: #94a3b8;
                    border-radius: 50%;
                    animation: typingDot 1.4s infinite;
                }
                
                .botstitch-typing-dot:nth-child(2) { animation-delay: 0.2s; }
                .botstitch-typing-dot:nth-child(3) { animation-delay: 0.4s; }
                
                @keyframes typingDot {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-10px); }
                }
                
                .botstitch-footer {
                    padding: 8px 16px;
                    text-align: center;
                    border-top: 1px solid #f1f5f9;
                    font-size: 11px;
                    color: #64748b;
                }
                
                .botstitch-footer a {
                    color: ${config.button.backgroundColor};
                    text-decoration: none;
                }
                
                .botstitch-footer a:hover {
                    text-decoration: underline;
                }
                
                @media (max-width: 480px) {
                    .botstitch-window {
                        right: 10px;
                        bottom: 10px;
                        width: calc(100vw - 20px);
                        height: calc(100vh - 20px);
                        max-width: 400px;
                        max-height: 600px;
                    }
                    
                    .botstitch-button {
                        right: 20px;
                        bottom: 20px;
                    }
                }
            `;
        }

        // Create floating button
        createFloatingButton() {
            const button = document.createElement('button');
            button.className = 'botstitch-button';
            button.setAttribute('aria-label', 'Open chat');
            
            const icon = this.config.theme.button.customIconSrc ? 
                `<img src="${this.config.theme.button.customIconSrc}" style="width: ${this.config.theme.button.customIconSize}%; height: ${this.config.theme.button.customIconSize}%; object-fit: contain;" alt="Chat">` :
                this.getChatIcon();
                
            button.innerHTML = icon;
            
            document.body.appendChild(button);
            this.elements.button = button;
            
            // Create tooltip
            if (this.config.theme.tooltip.showTooltip) {
                this.createTooltip();
            }
        }

        // Create tooltip
        createTooltip() {
            const tooltip = document.createElement('div');
            tooltip.className = 'botstitch-tooltip';
            tooltip.textContent = this.config.theme.tooltip.tooltipMessage;
            
            document.body.appendChild(tooltip);
            this.elements.tooltip = tooltip;
            
            // Show tooltip on hover
            this.elements.button.addEventListener('mouseenter', () => {
                if (!this.isOpen) {
                    tooltip.classList.add('show');
                }
            });
            
            this.elements.button.addEventListener('mouseleave', () => {
                tooltip.classList.remove('show');
            });
        }

        // Create chat window
        createChatWindow() {
            if (this.elements.window) return;

            const window = document.createElement('div');
            window.className = 'botstitch-window';
            
            window.innerHTML = `
                <div class="botstitch-header">
                    ${this.config.theme.chatWindow.titleAvatarSrc ? 
                        `<div class="botstitch-header-avatar">
                            <img src="${this.config.theme.chatWindow.titleAvatarSrc}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" alt="Avatar">
                        </div>` : 
                        '<div class="botstitch-header-avatar">💬</div>'
                    }
                    <div class="botstitch-header-title">${this.config.theme.chatWindow.title}</div>
                    <button class="botstitch-close" aria-label="Close chat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div class="botstitch-messages" id="botstitch-messages">
                    <!-- Messages will be inserted here -->
                </div>
                
                <div class="botstitch-input-area">
                    <div class="botstitch-input-container">
                        ${this.config.theme.chatWindow.uploadsConfig.enabled ? 
                            `<button class="botstitch-upload-button" title="Upload file">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                                </svg>
                            </button>
                            <input type="file" class="botstitch-file-input" multiple accept="${this.getAcceptedFileTypes()}">` : ''
                        }
                        
                        <textarea 
                            class="botstitch-input" 
                            placeholder="${this.config.theme.chatWindow.textInput.placeholder}"
                            rows="1"
                            maxlength="${this.config.theme.chatWindow.textInput.maxChars}"
                        ></textarea>
                        
                        ${this.config.theme.chatWindow.voiceInputConfig.enabled ? 
                            `<button class="botstitch-voice-button" title="Voice message">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                                    <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                                    <line x1="12" y1="19" x2="12" y2="23"/>
                                    <line x1="8" y1="23" x2="16" y2="23"/>
                                </svg>
                            </button>` : ''
                        }
                        
                        <button class="botstitch-send-button" disabled>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22,2 15,22 11,13 2,9"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>
                
                ${this.config.branding.showPoweredBy ? 
                    `<div class="botstitch-footer">
                        <a href="${this.config.branding.footerLink}" target="_blank" rel="noopener">
                            ${this.config.branding.footerText}
                        </a>
                    </div>` : ''
                }
            `;
            
            document.body.appendChild(window);
            this.elements.window = window;
            
            // Cache elements
            this.elements.messages = window.querySelector('.botstitch-messages');
            this.elements.input = window.querySelector('.botstitch-input');
            this.elements.sendButton = window.querySelector('.botstitch-send-button');
            this.elements.closeButton = window.querySelector('.botstitch-close');
            this.elements.uploadButton = window.querySelector('.botstitch-upload-button');
            this.elements.fileInput = window.querySelector('.botstitch-file-input');
            this.elements.voiceButton = window.querySelector('.botstitch-voice-button');
            
            this.bindWindowEvents();
            this.showWelcomeMessage();
        }

        // Bind events
        bindEvents() {
            this.elements.button.addEventListener('click', () => this.toggleWindow());
            
            // Close window when clicking outside
            document.addEventListener('click', (e) => {
                if (this.isOpen && 
                    !this.elements.window.contains(e.target) && 
                    !this.elements.button.contains(e.target)) {
                    // Optional: auto-close behavior
                }
            });
        }

        // Bind window events
        bindWindowEvents() {
            // Close button
            this.elements.closeButton.addEventListener('click', () => this.closeWindow());
            
            // Input events
            this.elements.input.addEventListener('input', () => this.handleInputChange());
            this.elements.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
            
            // Send button
            this.elements.sendButton.addEventListener('click', () => this.sendMessage());
            
            // File upload
            if (this.elements.uploadButton) {
                this.elements.uploadButton.addEventListener('click', () => this.elements.fileInput.click());
                this.elements.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
            }
            
            // Voice input
            if (this.elements.voiceButton) {
                this.elements.voiceButton.addEventListener('click', () => this.toggleVoiceRecording());
            }
        }

        // Show welcome message
        showWelcomeMessage() {
            if (this.config.theme.chatWindow.welcomeMessage) {
                this.addMessage('bot', this.config.theme.chatWindow.welcomeMessage);
                
                // Show starter prompts
                if (this.config.theme.chatWindow.starterPrompts.length > 0) {
                    this.showStarterPrompts();
                }
            }
        }

        // Show starter prompts
        showStarterPrompts() {
            const promptsContainer = document.createElement('div');
            promptsContainer.className = 'botstitch-starter-prompts';
            
            this.config.theme.chatWindow.starterPrompts.forEach(prompt => {
                const promptButton = document.createElement('button');
                promptButton.className = 'botstitch-starter-prompt';
                promptButton.textContent = prompt;
                promptButton.addEventListener('click', () => {
                    this.elements.input.value = prompt;
                    this.sendMessage();
                    promptsContainer.remove();
                });
                promptsContainer.appendChild(promptButton);
            });
            
            this.elements.messages.appendChild(promptsContainer);
            this.scrollToBottom();
        }

        // Toggle window
        toggleWindow() {
            if (this.isOpen) {
                this.closeWindow();
            } else {
                this.openWindow();
            }
        }

        // Open window
        openWindow() {
            if (!this.elements.window) {
                this.createChatWindow();
            }
            
            this.isOpen = true;
            this.elements.window.classList.add('open');
            this.elements.button.classList.add('minimized');
            
            if (this.elements.tooltip) {
                this.elements.tooltip.classList.remove('show');
            }
            
            if (this.config.theme.chatWindow.textInput.autoFocus) {
                setTimeout(() => this.elements.input.focus(), 300);
            }
            
            this.clearAutoOpenTimer();
            this.trackEvent('widget_opened');
        }

        // Close window
        closeWindow() {
            this.isOpen = false;
            this.elements.window.classList.remove('open');
            this.elements.button.classList.remove('minimized');
            this.trackEvent('widget_closed');
        }

        // Handle input change
        handleInputChange() {
            const hasText = this.elements.input.value.trim().length > 0;
            this.elements.sendButton.disabled = !hasText;
            
            // Auto-resize textarea
            this.elements.input.style.height = 'auto';
            this.elements.input.style.height = this.elements.input.scrollHeight + 'px';
            
            // Character limit warning
            const charCount = this.elements.input.value.length;
            const maxChars = this.config.theme.chatWindow.textInput.maxChars;
            
            if (charCount > maxChars * 0.9) {
                // Show warning near limit
                console.warn('Approaching character limit');
            }
        }

        // Handle key down
        handleKeyDown(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!this.elements.sendButton.disabled) {
                    this.sendMessage();
                }
            }
        }

        // Send message
        async sendMessage() {
            const text = this.elements.input.value.trim();
            if (!text) return;
            
            // Add user message
            this.addMessage('user', text);
            this.elements.input.value = '';
            this.elements.sendButton.disabled = true;
            this.elements.input.style.height = 'auto';
            
            // Show typing indicator
            this.showTypingIndicator();
            
            try {
                // Send to N8N webhook
                const response = await this.sendToN8N(text);
                this.hideTypingIndicator();
                
                if (response && response.output) {
                    this.addMessage('bot', response.output);
                } else {
                    this.addMessage('bot', this.config.theme.chatWindow.errorMessage);
                }
            } catch (error) {
                console.error('Error sending message:', error);
                this.hideTypingIndicator();
                this.addMessage('bot', this.config.theme.chatWindow.errorMessage);
            }
            
            this.trackEvent('message_sent');
        }

        // Send to N8N webhook
        async sendToN8N(message) {
            const payload = {
                action: 'sendMessage',
                sessionId: this.sessionId,
                chatInput: message,
                ...this.config.metadata
            };
            
            const response = await fetch(this.config.n8nChatUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        }

        // Add message to chat
        addMessage(type, content) {
            const messageElement = document.createElement('div');
            messageElement.className = `botstitch-message ${type}`;
            
            const config = this.config.theme.chatWindow;
            const messageConfig = type === 'user' ? config.userMessage : config.botMessage;
            
            let avatarHtml = '';
            if (messageConfig.showAvatar) {
                const avatarSrc = messageConfig.avatarSrc || (type === 'user' ? '👤' : '🤖');
                if (avatarSrc.startsWith('http')) {
                    avatarHtml = `<div class="botstitch-message-avatar">
                        <img src="${avatarSrc}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" alt="Avatar">
                    </div>`;
                } else {
                    avatarHtml = `<div class="botstitch-message-avatar">${avatarSrc}</div>`;
                }
            }
            
            const contentHtml = config.renderHTML ? content : this.escapeHtml(content);
            
            messageElement.innerHTML = `
                ${avatarHtml}
                <div class="botstitch-message-content">${contentHtml}</div>
            `;
            
            this.elements.messages.appendChild(messageElement);
            this.scrollToBottom();
            
            // Store message
            this.messages.push({ type, content, timestamp: Date.now() });
        }

        // Show typing indicator
        showTypingIndicator() {
            this.hideTypingIndicator(); // Remove existing
            
            const indicator = document.createElement('div');
            indicator.className = 'botstitch-message bot';
            indicator.id = 'botstitch-typing';
            
            indicator.innerHTML = `
                <div class="botstitch-message-avatar">🤖</div>
                <div class="botstitch-message-content">
                    <div class="botstitch-typing-indicator">
                        <div class="botstitch-typing-dot"></div>
                        <div class="botstitch-typing-dot"></div>
                        <div class="botstitch-typing-dot"></div>
                    </div>
                </div>
            `;
            
            this.elements.messages.appendChild(indicator);
            this.scrollToBottom();
        }

        // Hide typing indicator
        hideTypingIndicator() {
            const indicator = document.getElementById('botstitch-typing');
            if (indicator) {
                indicator.remove();
            }
        }

        // Handle file upload
        handleFileUpload(event) {
            const files = Array.from(event.target.files);
            const config = this.config.theme.chatWindow.uploadsConfig;
            
            // Validate file count
            if (files.length > config.maxFiles) {
                alert(`Maximum ${config.maxFiles} files allowed`);
                return;
            }
            
            // Validate file sizes and types
            for (const file of files) {
                if (file.size > config.maxSizeInMB * 1024 * 1024) {
                    alert(`File "${file.name}" is too large. Maximum size: ${config.maxSizeInMB}MB`);
                    return;
                }
                
                const extension = file.name.split('.').pop().toLowerCase();
                if (!config.acceptFileTypes.includes(extension)) {
                    alert(`File type "${extension}" not supported`);
                    return;
                }
            }
            
            // Process files
            files.forEach(file => {
                this.addMessage('user', `📎 ${file.name} (${this.formatFileSize(file.size)})`);
                // TODO: Upload file to server
            });
            
            event.target.value = '';
        }

        // Toggle voice recording
        async toggleVoiceRecording() {
            if (this.isRecording) {
                this.stopVoiceRecording();
            } else {
                await this.startVoiceRecording();
            }
        }

        // Start voice recording
        async startVoiceRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.mediaRecorder = new MediaRecorder(stream);
                this.audioChunks = [];
                
                this.mediaRecorder.ondataavailable = (event) => {
                    this.audioChunks.push(event.data);
                };
                
                this.mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                    this.handleVoiceMessage(audioBlob);
                    stream.getTracks().forEach(track => track.stop());
                };
                
                this.mediaRecorder.start();
                this.isRecording = true;
                this.elements.voiceButton.classList.add('recording');
                
                // Auto-stop after max time
                setTimeout(() => {
                    if (this.isRecording) {
                        this.stopVoiceRecording();
                    }
                }, this.config.theme.chatWindow.voiceInputConfig.maxRecordingTime * 1000);
                
            } catch (error) {
                console.error('Voice recording error:', error);
                alert(this.config.theme.chatWindow.voiceInputConfig.recordingNotSupportedMessage);
            }
        }

        // Stop voice recording
        stopVoiceRecording() {
            if (this.mediaRecorder && this.isRecording) {
                this.mediaRecorder.stop();
                this.isRecording = false;
                this.elements.voiceButton.classList.remove('recording');
            }
        }

        // Handle voice message
        handleVoiceMessage(audioBlob) {
            const audioUrl = URL.createObjectURL(audioBlob);
            this.addMessage('user', `🎤 Voice message (${this.formatFileSize(audioBlob.size)})`);
            // TODO: Send audio to server for transcription
        }

        // Schedule auto-open
        scheduleAutoOpen() {
            const delay = this.config.theme.button.autoWindowOpen.openDelay * 1000;
            this.autoOpenTimer = setTimeout(() => {
                if (!this.isOpen) {
                    this.openWindow();
                }
            }, delay);
        }

        // Clear auto-open timer
        clearAutoOpenTimer() {
            if (this.autoOpenTimer) {
                clearTimeout(this.autoOpenTimer);
                this.autoOpenTimer = null;
            }
        }

        // Setup analytics
        setupAnalytics() {
            this.analytics.widgetLoaded = true;
            
            // Track session duration
            setInterval(() => {
                this.analytics.sessionDuration = Date.now() - this.analytics.startTime;
            }, 5000);
            
            // Track page unload
            window.addEventListener('beforeunload', () => {
                this.trackEvent('session_ended', {
                    duration: this.analytics.sessionDuration,
                    interactions: this.analytics.interactions,
                    messages: this.analytics.messagesExchanged
                });
            });
        }

        // Track events
        trackEvent(eventType, data = {}) {
            const eventData = {
                eventType,
                sessionId: this.sessionId,
                timestamp: Date.now(),
                url: window.location.href,
                ...data
            };
            
            // Send to analytics endpoint
            if (navigator.sendBeacon) {
                navigator.sendBeacon('/api/analytics/track', JSON.stringify(eventData));
            } else {
                fetch('/api/analytics/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(eventData),
                    keepalive: true
                }).catch(() => {}); // Ignore errors
            }
            
            this.analytics.interactions++;
        }

        // Utility functions
        getBorderRadius(style, size) {
            switch (style) {
                case 'square': return '0px';
                case 'rounded': return '12px';
                case 'circle': return '50%';
                default: return '50%';
            }
        }

        adjustColor(color, amount) {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * amount);
            const R = (num >> 16) + amt;
            const G = (num >> 8 & 0x00FF) + amt;
            const B = (num & 0x0000FF) + amt;
            return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        getAcceptedFileTypes() {
            return this.config.theme.chatWindow.uploadsConfig.acceptFileTypes
                .map(type => `.${type}`)
                .join(',');
        }

        scrollToBottom() {
            setTimeout(() => {
                this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
            }, 100);
        }

        getChatIcon() {
            return `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path>
                </svg>
            `;
        }

        // Public API methods
        updateConfig(newConfig) {
            this.config = this.mergeConfig(this.config, newConfig);
            this.applyPlanRestrictions();
            
            // Regenerate styles
            const existingStyles = document.getElementById('botstitch-widget-styles');
            if (existingStyles) {
                existingStyles.textContent = this.generateCSS();
            }
            
            // Update existing elements
            if (this.elements.window) {
                this.elements.window.remove();
                this.elements.window = null;
                if (this.isOpen) {
                    this.createChatWindow();
                    this.elements.window.classList.add('open');
                }
            }
        }

        destroy() {
            // Clean up all elements and event listeners
            Object.values(this.elements).forEach(element => {
                if (element && element.remove) {
                    element.remove();
                }
            });
            
            const styles = document.getElementById('botstitch-widget-styles');
            if (styles) styles.remove();
            
            this.clearAutoOpenTimer();
            
            if (this.mediaRecorder) {
                this.mediaRecorder.stop();
            }
        }
    }

    // Global API
    window.BotStitch = {
        // Initialize widget
        init: function(config) {
            if (window.botStitchWidget) {
                window.botStitchWidget.destroy();
            }
            
            window.botStitchWidget = new BotStitchWidget();
            return window.botStitchWidget.init(config);
        },
        
        // Update configuration
        updateConfig: function(config) {
            if (window.botStitchWidget) {
                window.botStitchWidget.updateConfig(config);
            }
        },
        
        // Control methods
        open: function() {
            if (window.botStitchWidget) {
                window.botStitchWidget.openWindow();
            }
        },
        
        close: function() {
            if (window.botStitchWidget) {
                window.botStitchWidget.closeWindow();
            }
        },
        
        // Destroy widget
        destroy: function() {
            if (window.botStitchWidget) {
                window.botStitchWidget.destroy();
                window.botStitchWidget = null;
            }
        }
    };

    // Auto-initialize if config is provided
    if (window.botStitchConfig) {
        window.BotStitch.init(window.botStitchConfig);
    }

})();
