    // Initialize the widget
    function init() {
        // Enable debug by pressing D + E + B + U + G keys in sequence
        let debugSequence = "";
        document.addEventListener('keydown', (e) => {
            debugSequence += e.key.toLowerCase();
            if (debugSequence.length > 5) {
                debugSequence = debugSequence.substring(1);
            }
            if (debugSequence === "debug") {
                debugInfo.style.display = debugInfo.style.display === 'none' ? 'block' : 'none';
                logDebug("Debug mode " + (debugInfo.style.display === 'none' ? 'OFF' : 'ON'));
            }
        });
        
        // Check for existing session after a delay to allow page to load
        setTimeout(checkExistingSession, 500);
    }
    
    // Start the widget
    init();// Interactive Chat Widget for n8n
(function() {
    // Initialize widget only once
    if (window.N8nChatWidgetLoaded) return;
    window.N8nChatWidgetLoaded = true;

    // Load font resource - using Poppins for a fresh look
    const fontElement = document.createElement('link');
    fontElement.rel = 'stylesheet';
    fontElement.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';
    document.head.appendChild(fontElement);

    // Apply widget styles with completely different design approach
    const widgetStyles = document.createElement('style');
    widgetStyles.textContent = `
        .chat-assist-widget {
            --chat-color-primary: var(--chat-widget-primary, #8c52ff);
            --chat-color-secondary: var(--chat-widget-secondary, #7a3aff);
            --chat-color-tertiary: var(--chat-widget-tertiary, #6c29ff);
            --chat-color-light: var(--chat-widget-light, #f5f1ff);
            --chat-color-surface: var(--chat-widget-surface, #ffffff);
            --chat-color-text: var(--chat-widget-text, #333333);
            --chat-color-text-light: var(--chat-widget-text-light, #666666);
            --chat-color-border: var(--chat-widget-border, #e5e7eb);
            --chat-color-success: var(--chat-widget-success, #4caf50);
            --chat-shadow-sm: 0 2px 5px rgba(0, 0, 0, 0.1);
            --chat-shadow-md: 0 4px 8px rgba(0, 0, 0, 0.12);
            --chat-shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.14);
            --chat-radius-sm: 8px;
            --chat-radius-md: 12px;
            --chat-radius-lg: 16px;
            --chat-radius-full: 9999px;
            --chat-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Poppins', sans-serif;
        }

        .chat-assist-widget .chat-window {
            position: fixed;
            bottom: 90px;
            z-index: 1000;
            width: 350px;
            height: 520px;
            background: var(--chat-color-surface);
            border-radius: var(--chat-radius-md);
            box-shadow: var(--chat-shadow-lg);
            overflow: hidden;
            display: none;
            flex-direction: column;
            transition: var(--chat-transition);
            opacity: 0;
            transform: translateY(20px) scale(0.95);
        }

        .chat-assist-widget .chat-window.right-side {
            right: 20px;
        }

        .chat-assist-widget .chat-window.left-side {
            left: 20px;
        }

        .chat-assist-widget .chat-window.visible {
            display: flex !important;
            opacity: 1;
            transform: translateY(0) scale(1);
        }

        .chat-assist-widget .chat-header {
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            background: var(--chat-color-primary);
            color: white;
            position: relative;
        }

        .chat-assist-widget .chat-header-logo {
            width: 30px;
            height: 30px;
            border-radius: var(--chat-radius-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            color: var(--chat-color-primary);
            font-weight: 700;
            font-size: 14px;
        }

        .chat-assist-widget .chat-header-title {
            font-size: 16px;
            font-weight: 600;
            color: white;
            text-transform: uppercase;
        }

        .chat-assist-widget .chat-close-btn {
            position: absolute;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            background: transparent;
            border: none;
            color: white;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: var(--chat-transition);
            font-size: 18px;
        }

        .chat-assist-widget .chat-close-btn:hover {
            transform: translateY(-50%) rotate(90deg);
        }

        .chat-assist-widget .chat-welcome {
            padding: 40px 20px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
        }

        .chat-assist-widget .chat-welcome-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--chat-color-text);
            margin-bottom: 10px;
            line-height: 1.3;
        }

        .chat-assist-widget .chat-welcome-subtitle {
            font-size: 14px;
            color: var(--chat-color-text-light);
            margin-bottom: 30px;
            line-height: 1.4;
        }

        .chat-assist-widget .chat-start-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            max-width: 240px;
            padding: 12px 20px;
            background: var(--chat-color-primary);
            color: white;
            border: none;
            border-radius: var(--chat-radius-full);
            cursor: pointer;
            font-size: 15px;
            transition: var(--chat-transition);
            font-weight: 500;
            font-family: inherit;
            margin-bottom: 16px;
            box-shadow: var(--chat-shadow-md);
        }

        .chat-assist-widget .chat-start-btn:hover {
            background: var(--chat-color-secondary);
            transform: translateY(-2px);
        }

        .chat-assist-widget .chat-body {
            display: none;
            flex-direction: column;
            height: 100%;
        }

        .chat-assist-widget .chat-body.active {
            display: flex;
        }

        .chat-assist-widget .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f9f9f9;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .chat-assist-widget .chat-messages::-webkit-scrollbar {
            width: 6px;
        }

        .chat-assist-widget .chat-messages::-webkit-scrollbar-track {
            background: transparent;
        }

        .chat-assist-widget .chat-messages::-webkit-scrollbar-thumb {
            background-color: rgba(140, 82, 255, 0.3);
            border-radius: var(--chat-radius-full);
        }

        .chat-assist-widget .chat-bubble {
            padding: 12px 16px;
            border-radius: var(--chat-radius-lg);
            max-width: 80%;
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.5;
            position: relative;
            white-space: pre-line;
        }

        .chat-assist-widget .chat-bubble.user-bubble {
            background: white;
            color: var(--chat-color-text);
            align-self: flex-end;
            border: 1px solid #eee;
            box-shadow: var(--chat-shadow-sm);
        }

        .chat-assist-widget .chat-bubble.bot-bubble {
            background: white;
            color: var(--chat-color-text);
            align-self: flex-start;
            border: 1px solid #eee;
            box-shadow: var(--chat-shadow-sm);
        }

        .chat-assist-widget .message-timestamp {
            font-size: 10px;
            color: var(--chat-color-text-light);
            margin-top: 4px;
            display: block;
        }

        .chat-assist-widget .message-status {
            display: inline-block;
            margin-left: 4px;
            color: var(--chat-color-success);
        }

        /* Typing animation */
        .chat-assist-widget .typing-indicator {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 14px 18px;
            background: white;
            border-radius: var(--chat-radius-lg);
            max-width: 80px;
            align-self: flex-start;
            box-shadow: var(--chat-shadow-sm);
            border: 1px solid #eee;
        }

        .chat-assist-widget .typing-dot {
            width: 8px;
            height: 8px;
            background: var(--chat-color-primary);
            border-radius: var(--chat-radius-full);
            opacity: 0.7;
            animation: typingAnimation 1.4s infinite ease-in-out;
        }

        .chat-assist-widget .typing-dot:nth-child(1) {
            animation-delay: 0s;
        }

        .chat-assist-widget .typing-dot:nth-child(2) {
            animation-delay: 0.2s;
        }

        .chat-assist-widget .typing-dot:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes typingAnimation {
            0%, 60%, 100% {
                transform: translateY(0);
            }
            30% {
                transform: translateY(-4px);
            }
        }

        .chat-assist-widget .chat-controls {
            padding: 10px 15px;
            background: var(--chat-color-surface);
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .chat-assist-widget .chat-input-container {
            flex: 1;
            position: relative;
            border-radius: var(--chat-radius-full);
            background: #f1f1f1;
            display: flex;
            align-items: center;
        }

        .chat-assist-widget .chat-textarea {
            flex: 1;
            padding: 12px 16px;
            border: none;
            border-radius: var(--chat-radius-full);
            background: #f1f1f1;
            color: var(--chat-color-text);
            resize: none;
            font-family: inherit;
            font-size: 14px;
            line-height: 1.5;
            max-height: 120px;
            min-height: 40px;
            transition: var(--chat-transition);
        }

        .chat-assist-widget .chat-textarea:focus {
            outline: none;
        }

        .chat-assist-widget .chat-textarea::placeholder {
            color: var(--chat-color-text-light);
        }

        .chat-assist-widget .chat-submit {
            background: var(--chat-color-primary);
            color: white;
            border: none;
            border-radius: var(--chat-radius-full);
            width: 36px;
            height: 36px;
            cursor: pointer;
            transition: var(--chat-transition);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .chat-assist-widget .chat-submit:hover {
            background: var(--chat-color-secondary);
        }

        .chat-assist-widget .chat-submit svg {
            width: 18px;
            height: 18px;
            transform: rotate(45deg);
        }

        .chat-assist-widget .chat-launcher {
            position: fixed;
            bottom: 20px;
            z-index: 999;
            height: 60px;
            width: 60px;
            border-radius: var(--chat-radius-full);
            background: var(--chat-color-primary);
            color: white;
            border: none;
            cursor: pointer;
            box-shadow: var(--chat-shadow-md);
            transition: var(--chat-transition);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .chat-assist-widget .chat-launcher.right-side {
            right: 20px;
        }

        .chat-assist-widget .chat-launcher.left-side {
            left: 20px;
        }

        .chat-assist-widget .chat-launcher:hover {
            transform: scale(1.1);
            background: var(--chat-color-secondary);
        }

        .chat-assist-widget .chat-launcher svg {
            width: 30px;
            height: 30px;
            transition: transform 0.4s ease-in-out;
        }
        
        .chat-assist-widget .chat-launcher:hover svg {
            transform: scale(1.1) rotate(10deg);
        }

        .chat-assist-widget .chat-launcher .chat-icon-background {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: var(--chat-radius-full);
            background: rgba(255, 255, 255, 0.1);
            transform: scale(0);
            transition: transform 0.5s ease-out;
        }
        
        .chat-assist-widget .chat-launcher:hover .chat-icon-background {
            transform: scale(1.5);
            opacity: 0;
        }

        .chat-assist-widget .suggested-questions {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin: 12px 0;
            align-self: flex-start;
            max-width: 85%;
        }

        .chat-assist-widget .suggested-question-btn {
            background: white;
            border: 1px solid #eee;
            border-radius: var(--chat-radius-md);
            padding: 10px 14px;
            text-align: left;
            font-size: 13px;
            color: var(--chat-color-text);
            cursor: pointer;
            transition: var(--chat-transition);
            font-family: inherit;
            line-height: 1.4;
        }

        .chat-assist-widget .suggested-question-btn:hover {
            background: var(--chat-color-light);
            border-color: var(--chat-color-primary);
        }

        .chat-assist-widget .chat-link {
            color: var(--chat-color-primary);
            text-decoration: underline;
            word-break: break-all;
            transition: var(--chat-transition);
        }

        .chat-assist-widget .chat-link:hover {
            color: var(--chat-color-secondary);
            text-decoration: underline;
        }

        .chat-assist-widget .user-registration {
            padding: 30px 20px;
            text-align: center;
            width: 100%;
            display: none;
        }

        .chat-assist-widget .user-registration.active {
            display: block;
        }

        .chat-assist-widget .registration-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--chat-color-text);
            margin-bottom: 20px;
            line-height: 1.3;
        }

        .chat-assist-widget .registration-form {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-bottom: 20px;
        }

        .chat-assist-widget .form-field {
            display: flex;
            flex-direction: column;
            gap: 4px;
            text-align: left;
        }

        .chat-assist-widget .form-label {
            font-size: 14px;
            font-weight: 500;
            color: var(--chat-color-text);
            margin-bottom: 4px;
        }

        .chat-assist-widget .form-input {
            padding: 12px 16px;
            border: 1px solid var(--chat-color-border);
            border-radius: var(--chat-radius-md);
            font-family: inherit;
            font-size: 14px;
            transition: var(--chat-transition);
        }

        .chat-assist-widget .form-input:focus {
            outline: none;
            border-color: var(--chat-color-primary);
            box-shadow: 0 0 0 3px rgba(140, 82, 255, 0.2);
        }

        .chat-assist-widget .form-input.error {
            border-color: #ef4444;
        }

        .chat-assist-widget .error-text {
            font-size: 12px;
            color: #ef4444;
            margin-top: 2px;
        }

        .chat-assist-widget .submit-registration {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 14px 20px;
            background: var(--chat-color-primary);
            color: white;
            border: none;
            border-radius: var(--chat-radius-full);
            cursor: pointer;
            font-size: 15px;
            transition: var(--chat-transition);
            font-weight: 500;
            font-family: inherit;
        }

        .chat-assist-widget .submit-registration:hover {
            background: var(--chat-color-secondary);
        }

        .chat-assist-widget .submit-registration:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
        }
    `;
    document.head.appendChild(widgetStyles);

    // Default configuration
    const defaultSettings = {
        webhook: {
            url: '',
            route: ''
        },
        branding: {
            logo: '',
            name: '',
            welcomeText: 'We will reply as soon as we can',
            welcomeSubtext: 'Ask us anything about our pet accessories.',
            responseTimeText: '',
            poweredBy: {
                text: 'Powered by n8n',
                link: 'https://n8n.partnerlinks.io/fabimarkl'
            }
        },
        style: {
            primaryColor: '#8c52ff', // Purple
            secondaryColor: '#7a3aff', // Darker purple
            position: 'left', // Changed from 'right' to 'left'
            backgroundColor: '#ffffff',
            fontColor: '#333333'
        },
        suggestedQuestions: [] // Default empty array for suggested questions
    };

    // Merge user settings with defaults
    const settings = window.ChatWidgetConfig ? 
        {
            webhook: { ...defaultSettings.webhook, ...window.ChatWidgetConfig.webhook },
            branding: { ...defaultSettings.branding, ...window.ChatWidgetConfig.branding },
            style: { 
                ...defaultSettings.style, 
                ...window.ChatWidgetConfig.style
            },
            suggestedQuestions: window.ChatWidgetConfig.suggestedQuestions || defaultSettings.suggestedQuestions
        } : defaultSettings;

    // Session tracking with improved persistence
    let conversationId = localStorage.getItem('n8n_chat_session_id') || '';
    let isWaitingForResponse = false;
    let userName = localStorage.getItem('n8n_chat_user_name') || '';
    let userEmail = localStorage.getItem('n8n_chat_user_email') || '';
    let sessionActive = false;
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    let sessionTimer = null;

    // Create widget DOM structure
    const widgetRoot = document.createElement('div');
    widgetRoot.className = 'chat-assist-widget';
    
    // Apply custom colors
    widgetRoot.style.setProperty('--chat-widget-primary', settings.style.primaryColor);
    widgetRoot.style.setProperty('--chat-widget-secondary', settings.style.secondaryColor);
    widgetRoot.style.setProperty('--chat-widget-tertiary', settings.style.secondaryColor);
    widgetRoot.style.setProperty('--chat-widget-surface', settings.style.backgroundColor);
    widgetRoot.style.setProperty('--chat-widget-text', settings.style.fontColor);
    widgetRoot.style.setProperty('--chat-widget-success', '#4caf50'); // Green for checkmarks

    // Create chat panel
    const chatWindow = document.createElement('div');
    chatWindow.className = `chat-window ${settings.style.position === 'left' ? 'left-side' : 'right-side'}`;
    
    // Debug element to test visibility
    const debugStyle = document.createElement('style');
    debugStyle.textContent = `
        .debug-info {
            position: fixed;
            bottom: 5px;
            left: 5px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 5px;
            font-size: 10px;
            z-index: 9999;
            border-radius: 3px;
            display: none;
        }
    `;
    document.head.appendChild(debugStyle);
    
    const debugInfo = document.createElement('div');
    debugInfo.className = 'debug-info';
    document.body.appendChild(debugInfo);
    
    // Debug function
    function logDebug(message) {
        console.log("Chat Debug:", message);
        debugInfo.innerHTML += message + "<br>";
        // Keep only the last 5 lines
        const lines = debugInfo.innerHTML.split("<br>");
        if (lines.length > 5) {
            debugInfo.innerHTML = lines.slice(lines.length - 5).join("<br>");
        }
    }
    
    // Direct style fixes for the chat window for Safari and older browsers
    chatWindow.style.position = "fixed";
    chatWindow.style.bottom = "90px";
    chatWindow.style.zIndex = "1000";
    chatWindow.style.backgroundColor = settings.style.backgroundColor;
    chatWindow.style.left = settings.style.position === 'left' ? "20px" : "auto";
    chatWindow.style.right = settings.style.position === 'right' ? "20px" : "auto";
    
    // Extract first two letters for logo placeholder
    const logoLetters = settings.branding.name ? settings.branding.name.substring(0, 2).toUpperCase() : 'FC';
    
    // Create welcome screen with header
    const welcomeScreenHTML = `
        <div class="chat-header">
            <div class="chat-header-logo">${logoLetters}</div>
            <span class="chat-header-title">${settings.branding.name || 'FLUFFY COMFORT'}</span>
            <button class="chat-close-btn">×</button>
        </div>
        <div class="chat-welcome">
            <h2 class="chat-welcome-title">${settings.branding.welcomeText}</h2>
            <p class="chat-welcome-subtitle">${settings.branding.welcomeSubtext}</p>
            <button class="chat-start-btn">
                Start a conversation with us!
            </button>
        </div>
        <div class="user-registration">
            <h2 class="registration-title">Please enter your details to start chatting</h2>
            <form class="registration-form">
                <div class="form-field">
                    <label class="form-label" for="chat-user-name">Name</label>
                    <input type="text" id="chat-user-name" class="form-input" placeholder="Your name" required>
                    <div class="error-text" id="name-error"></div>
                </div>
                <div class="form-field">
                    <label class="form-label" for="chat-user-email">Email</label>
                    <input type="email" id="chat-user-email" class="form-input" placeholder="Your email address" required>
                    <div class="error-text" id="email-error"></div>
                </div>
                <button type="submit" class="submit-registration">Continue to Chat</button>
            </form>
        </div>
    `;

    // Create chat interface without duplicating the header
    const chatInterfaceHTML = `
        <div class="chat-body">
            <div class="chat-messages"></div>
            <div class="chat-controls">
                <div class="chat-input-container">
                    <textarea class="chat-textarea" placeholder="Type your message..." rows="1"></textarea>
                </div>
                <button class="chat-submit">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
        </div>
    `;
    
    chatWindow.innerHTML = welcomeScreenHTML + chatInterfaceHTML;
    
    // Create toggle button with improved icon and animations
    const launchButton = document.createElement('button');
    launchButton.className = `chat-launcher ${settings.style.position === 'left' ? 'left-side' : 'right-side'}`;
    launchButton.innerHTML = `
        <div class="chat-icon-background"></div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v3c0 .6.4 1 1 1h.5c.2 0 .5-.1.7-.3L15 18h5c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path>
            <circle cx="8.5" cy="10" r="1.5"></circle>
            <circle cx="12" cy="10" r="1.5"></circle>
            <circle cx="15.5" cy="10" r="1.5"></circle>
        </svg>`;
    
    // Direct style fixes for Safari and older browsers
    launchButton.style.zIndex = "999";
    launchButton.style.position = "fixed";
    launchButton.style.bottom = "20px";
    launchButton.style.left = settings.style.position === 'left' ? "20px" : "auto";
    launchButton.style.right = settings.style.position === 'right' ? "20px" : "auto";
    launchButton.style.cursor = "pointer";
    
    // Add elements to DOM
    widgetRoot.appendChild(chatWindow);
    widgetRoot.appendChild(launchButton);
    document.body.appendChild(widgetRoot);

    // Get DOM elements
    const startChatButton = chatWindow.querySelector('.chat-start-btn');
    const chatBody = chatWindow.querySelector('.chat-body');
    const messagesContainer = chatWindow.querySelector('.chat-messages');
    const messageTextarea = chatWindow.querySelector('.chat-textarea');
    const sendButton = chatWindow.querySelector('.chat-submit');
    
    // Registration form elements
    const registrationForm = chatWindow.querySelector('.registration-form');
    const userRegistration = chatWindow.querySelector('.user-registration');
    const chatWelcome = chatWindow.querySelector('.chat-welcome');
    const nameInput = chatWindow.querySelector('#chat-user-name');
    const emailInput = chatWindow.querySelector('#chat-user-email');
    const nameError = chatWindow.querySelector('#name-error');
    const emailError = chatWindow.querySelector('#email-error');

    // Helper function to generate unique session ID
    function createSessionId() {
        const newId = crypto.randomUUID();
        localStorage.setItem('n8n_chat_session_id', newId);
        return newId;
    }
    
    // Function to maintain session activity
    function refreshSession() {
        clearTimeout(sessionTimer);
        sessionTimer = setTimeout(() => {
            // Only ping if there's an active session
            if (sessionActive && conversationId) {
                pingSession();
            }
        }, SESSION_TIMEOUT / 2); // Refresh halfway through timeout period
    }
    
    // Function to ping the server to keep session alive
    async function pingSession() {
        try {
            const pingData = {
                action: "pingSession",
                sessionId: conversationId,
                route: settings.webhook.route,
                metadata: {
                    userId: userEmail,
                    userName: userName
                }
            };
            
            const response = await fetch(settings.webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pingData)
            });
            
            if (response.ok) {
                refreshSession(); // Continue the session
            } else {
                // Session may be invalid, but we'll keep trying
                refreshSession();
            }
        } catch (error) {
            console.warn('Session ping failed, will retry later:', error);
            refreshSession(); // Try again later
        }
    }

    // Create typing indicator element
    function createTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        return indicator;
    }

    // Helper function to format time
    function formatTime() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // Convert 0 to 12
        return `${hours}:${minutes} ${ampm}`;
    }

    // Function to convert URLs in text to clickable links
    function linkifyText(text) {
        // URL pattern that matches http, https, ftp links
        const urlPattern = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
        
        // Convert URLs to HTML links
        return text.replace(urlPattern, function(url) {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-link">${url}</a>`;
        });
    }

    // Check if there's a previous session to restore
    function checkExistingSession() {
        // If we have a saved session ID and user info
        if (conversationId && userName && userEmail) {
            // We'll only restore the session when the chat is opened
            // This prevents the session check from interfering with window opening
            console.log("Found existing session, will restore when chat is opened");
        }
    }
    
    // Restore a previous session
    async function restoreSession() {
        try {
            // Show chat interface instead of welcome screen
            chatWelcome.style.display = 'none';
            userRegistration.classList.remove('active');
            chatBody.classList.add('active');
            
            // Show typing indicator
            const typingIndicator = createTypingIndicator();
            messagesContainer.appendChild(typingIndicator);
            
            // Attempt to ping the session
            const pingData = {
                action: "pingSession",
                sessionId: conversationId,
                route: settings.webhook.route,
                metadata: {
                    userId: userEmail,
                    userName: userName
                }
            };
            
            const response = await fetch(settings.webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pingData)
            });
            
            if (!response.ok) {
                throw new Error('Could not restore previous session');
            }
            
            // Session is active again
            sessionActive = true;
            refreshSession();
            
            // Remove typing indicator
            if (messagesContainer.contains(typingIndicator)) {
                messagesContainer.removeChild(typingIndicator);
            }
            
            // Show welcome back message
            const welcomeBackMessage = document.createElement('div');
            welcomeBackMessage.className = 'chat-bubble bot-bubble';
            welcomeBackMessage.textContent = `Welcome back, ${userName}! How can I help you today?`;
            
            // Add timestamp
            const welcomeTimestamp = document.createElement('span');
            welcomeTimestamp.className = 'message-timestamp';
            welcomeTimestamp.textContent = formatTime();
            welcomeBackMessage.appendChild(welcomeTimestamp);
            
            messagesContainer.appendChild(welcomeBackMessage);
            
            // Add sample questions if configured
            if (settings.suggestedQuestions && Array.isArray(settings.suggestedQuestions) && settings.suggestedQuestions.length > 0) {
                const suggestedQuestionsContainer = document.createElement('div');
                suggestedQuestionsContainer.className = 'suggested-questions';
                
                settings.suggestedQuestions.forEach(question => {
                    const questionButton = document.createElement('button');
                    questionButton.className = 'suggested-question-btn';
                    questionButton.textContent = question;
                    questionButton.addEventListener('click', () => {
                        submitMessage(question);
                        // Remove the suggestions after clicking
                        if (suggestedQuestionsContainer.parentNode) {
                            suggestedQuestionsContainer.parentNode.removeChild(suggestedQuestionsContainer);
                        }
                    });
                    suggestedQuestionsContainer.appendChild(questionButton);
                });
                
                messagesContainer.appendChild(suggestedQuestionsContainer);
            }
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (error) {
            console.log('Could not restore session:', error);
            
            // Remove typing indicator if exists
            const indicator = messagesContainer.querySelector('.typing-indicator');
            if (indicator) {
                messagesContainer.removeChild(indicator);
            }
            
            // Reset to initial state
            chatBody.classList.remove('active');
            chatWelcome.style.display = 'flex';
            
            // Clear cached session
            localStorage.removeItem('n8n_chat_session_id');
            conversationId = '';
            sessionActive = false;
        }
    }

    // Validate email format
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Handle registration form submission
    async function handleRegistration(event) {
        event.preventDefault();
        
        // Reset error messages
        nameError.textContent = '';
        emailError.textContent = '';
        nameInput.classList.remove('error');
        emailInput.classList.remove('error');
        
        // Get values
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        
        // Validate
        let isValid = true;
        
        if (!name) {
            nameError.textContent = 'Please enter your name';
            nameInput.classList.add('error');
            isValid = false;
        }
        
        if (!email) {
            emailError.textContent = 'Please enter your email';
            emailInput.classList.add('error');
            isValid = false;
        } else if (!isValidEmail(email)) {
            emailError.textContent = 'Please enter a valid email address';
            emailInput.classList.add('error');
            isValid = false;
        }
        
        if (!isValid) return;
        
        // Save user info to localStorage for persistence
        localStorage.setItem('n8n_chat_user_name', name);
        localStorage.setItem('n8n_chat_user_email', email);
        userName = name;
        userEmail = email;
        
        // Initialize conversation with user data or retrieve existing
        if (!conversationId) {
            conversationId = createSessionId();
        }
        
        // First, load the session
        const sessionData = [{
            action: "loadPreviousSession",
            sessionId: conversationId,
            route: settings.webhook.route,
            metadata: {
                userId: email,
                userName: name
            }
        }];

        try {
            // Hide registration form, show chat interface
            userRegistration.classList.remove('active');
            chatBody.classList.add('active');
            
            // Show typing indicator
            const typingIndicator = createTypingIndicator();
            messagesContainer.appendChild(typingIndicator);
            
            // Load session
            const sessionResponse = await fetch(settings.webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sessionData)
            });
            
            if (!sessionResponse.ok) {
                throw new Error('Failed to load session');
            }
            
            const sessionResponseData = await sessionResponse.json();
            
            // Send user info as first message
            const userInfoMessage = `Name: ${name}\nEmail: ${email}`;
            
            const userInfoData = {
                action: "sendMessage",
                sessionId: conversationId,
                route: settings.webhook.route,
                chatInput: userInfoMessage,
                metadata: {
                    userId: email,
                    userName: name,
                    isUserInfo: true
                }
            };
            
            // Send user info
            const userInfoResponse = await fetch(settings.webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userInfoData)
            });
            
            if (!userInfoResponse.ok) {
                throw new Error('Failed to send user info');
            }
            
            const userInfoResponseData = await userInfoResponse.json();
            
            // Session is now active
            sessionActive = true;
            refreshSession();
            
            // Remove typing indicator
            messagesContainer.removeChild(typingIndicator);
            
            // Display initial bot message with clickable links
            const botMessage = document.createElement('div');
            botMessage.className = 'chat-bubble bot-bubble';
            const messageText = Array.isArray(userInfoResponseData) ? 
                userInfoResponseData[0].output : userInfoResponseData.output;
            botMessage.innerHTML = linkifyText(messageText);
            
            // Add timestamp to bot message
            const botTimestamp = document.createElement('span');
            botTimestamp.className = 'message-timestamp';
            botTimestamp.textContent = formatTime();
            botMessage.appendChild(botTimestamp);
            
            messagesContainer.appendChild(botMessage);
            
            // Add sample questions if configured
            if (settings.suggestedQuestions && Array.isArray(settings.suggestedQuestions) && settings.suggestedQuestions.length > 0) {
                const suggestedQuestionsContainer = document.createElement('div');
                suggestedQuestionsContainer.className = 'suggested-questions';
                
                settings.suggestedQuestions.forEach(question => {
                    const questionButton = document.createElement('button');
                    questionButton.className = 'suggested-question-btn';
                    questionButton.textContent = question;
                    questionButton.addEventListener('click', () => {
                        submitMessage(question);
                        // Remove the suggestions after clicking
                        if (suggestedQuestionsContainer.parentNode) {
                            suggestedQuestionsContainer.parentNode.removeChild(suggestedQuestionsContainer);
                        }
                    });
                    suggestedQuestionsContainer.appendChild(questionButton);
                });
                
                messagesContainer.appendChild(suggestedQuestionsContainer);
            }
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (error) {
            console.error('Registration error:', error);
            
            // Remove typing indicator if it exists
            const indicator = messagesContainer.querySelector('.typing-indicator');
            if (indicator) {
                messagesContainer.removeChild(indicator);
            }
            
            // Show error message
            const errorMessage = document.createElement('div');
            errorMessage.className = 'chat-bubble bot-bubble';
            errorMessage.textContent = "Sorry, I couldn't connect to the server. Please try again later.";
            
            // Add timestamp to error message
            const errorTimestamp = document.createElement('span');
            errorTimestamp.className = 'message-timestamp';
            errorTimestamp.textContent = formatTime();
            errorMessage.appendChild(errorTimestamp);
            
            messagesContainer.appendChild(errorMessage);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // Send a message to the webhook
    async function submitMessage(messageText) {
        if (isWaitingForResponse) return;
        
        isWaitingForResponse = true;
        
        // Get user info from persistence
        const email = userEmail || (nameInput ? nameInput.value.trim() : "");
        const name = userName || (emailInput ? emailInput.value.trim() : "");
        
        // Check if we need to recreate session
        if (!conversationId || !sessionActive) {
            // Try to recreate session
            conversationId = createSessionId();
            
            // Show registration form if no user info
            if (!name || !email) {
                showRegistrationForm();
                isWaitingForResponse = false;
                return;
            }
        }
        
        const requestData = {
            action: "sendMessage",
            sessionId: conversationId,
            route: settings.webhook.route,
            chatInput: messageText,
            metadata: {
                userId: email,
                userName: name
            }
        };

        // Display user message
        const userMessage = document.createElement('div');
        userMessage.className = 'chat-bubble user-bubble';
        userMessage.textContent = messageText;
        
        // Add timestamp and check mark to user message
        const userTimestamp = document.createElement('span');
        userTimestamp.className = 'message-timestamp';
        userTimestamp.innerHTML = formatTime() + ' <span class="message-status">✓</span>';
        userMessage.appendChild(userTimestamp);
        
        messagesContainer.appendChild(userMessage);
        
        // Show typing indicator
        const typingIndicator = createTypingIndicator();
        messagesContainer.appendChild(typingIndicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            const response = await fetch(settings.webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            // Check if session is still valid
            if (!response.ok) {
                const status = response.status;
                
                if (status === 401 || status === 403 || status === 404) {
                    // Session expired or invalid
                    sessionActive = false;
                    throw new Error('Session expired or invalid');
                }
                
                throw new Error(`Server responded with status: ${status}`);
            }
            
            const responseData = await response.json();
            
            // Session is active and working
            sessionActive = true;
            refreshSession();
            
            // Remove typing indicator
            messagesContainer.removeChild(typingIndicator);
            
            // Display bot response with clickable links
            const botMessage = document.createElement('div');
            botMessage.className = 'chat-bubble bot-bubble';
            const responseText = Array.isArray(responseData) ? responseData[0].output : responseData.output;
            botMessage.innerHTML = linkifyText(responseText);
            
            // Add timestamp to bot message
            const botTimestamp = document.createElement('span');
            botTimestamp.className = 'message-timestamp';
            botTimestamp.textContent = formatTime();
            botMessage.appendChild(botTimestamp);
            
            messagesContainer.appendChild(botMessage);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (error) {
            console.error('Message submission error:', error);
            
            // Remove typing indicator if it exists
            if (messagesContainer.contains(typingIndicator)) {
                messagesContainer.removeChild(typingIndicator);
            }
            
            // Show error message
            const errorMessage = document.createElement('div');
            errorMessage.className = 'chat-bubble bot-bubble';
            
            if (!sessionActive) {
                // Session timeout message
                errorMessage.textContent = "Your session has expired. Reconnecting...";
                
                // Try to reconnect
                setTimeout(() => {
                    // Clear messages and try to start a new session
                    messagesContainer.innerHTML = '';
                    handleRegistration({ preventDefault: () => {} });
                }, 1500);
            } else {
                errorMessage.textContent = "Sorry, I couldn't send your message. Please try again.";
            }
            
            // Add timestamp to error message
            const errorTimestamp = document.createElement('span');
            errorTimestamp.className = 'message-timestamp';
            errorTimestamp.textContent = formatTime();
            errorMessage.appendChild(errorTimestamp);
            
            messagesContainer.appendChild(errorMessage);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } finally {
            isWaitingForResponse = false;
        }
    }

    // Auto-resize textarea as user types
    function autoResizeTextarea() {
        messageTextarea.style.height = 'auto';
        messageTextarea.style.height = (messageTextarea.scrollHeight > 120 ? 120 : messageTextarea.scrollHeight) + 'px';
    }

    // Event listeners
    startChatButton.addEventListener('click', showRegistrationForm);
    registrationForm.addEventListener('submit', handleRegistration);
    
    // Check for existing session when widget loads
    window.addEventListener('load', checkExistingSession);
    
    // Update session before page unload
    window.addEventListener('beforeunload', () => {
        // If session is active, save it
        if (sessionActive && conversationId) {
            localStorage.setItem('n8n_chat_session_id', conversationId);
            localStorage.setItem('n8n_chat_user_name', userName);
            localStorage.setItem('n8n_chat_user_email', userEmail);
        }
    });
    
    sendButton.addEventListener('click', () => {
        const messageText = messageTextarea.value.trim();
        if (messageText && !isWaitingForResponse) {
            submitMessage(messageText);
            messageTextarea.value = '';
            messageTextarea.style.height = 'auto';
        }
    });
    
    messageTextarea.addEventListener('input', autoResizeTextarea);
    
    messageTextarea.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const messageText = messageTextarea.value.trim();
            if (messageText && !isWaitingForResponse) {
                submitMessage(messageText);
                messageTextarea.value = '';
                messageTextarea.style.height = 'auto';
            }
        }
    });
    
    launchButton.addEventListener('click', () => {
        // Log debug info
        logDebug("Launch button clicked");
        
        // Force display block first to ensure transition works
        chatWindow.style.display = 'flex';
        
        // Force a reflow before adding the visible class
        void chatWindow.offsetWidth;
        
        // Add visible class for animation
        chatWindow.classList.toggle('visible');
        
        // Log the state
        logDebug("Is visible: " + chatWindow.classList.contains('visible'));
        
        // If window becomes visible
        if (chatWindow.classList.contains('visible')) {
            // If we have an active session or saved session data
            if (sessionActive || (conversationId && userName && userEmail)) {
                // Try to restore only if we have all the data and not already active
                if (!sessionActive && conversationId && userName && userEmail) {
                    setTimeout(() => {
                        restoreSession();
                    }, 100);
                } else if (sessionActive) {
                    // Just refresh the existing session
                    refreshSession();
                }
            }
        } else {
            // If closing, set display to none after transition completes
            setTimeout(() => {
                if (!chatWindow.classList.contains('visible')) {
                    chatWindow.style.display = 'none';
                }
            }, 300); // Match the transition duration
        }
    });

    // Close button functionality
    const closeButtons = chatWindow.querySelectorAll('.chat-close-btn');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            chatWindow.classList.remove('visible');
        });
    });
})();
