// Botstitch Chat Widget CDN Script (Modern, n8nchatui-style)
// Usage: window.Chatbot.init({ widgetId, webhookUrl, ...config });

window.Chatbot = {
  init: function (userConfig) {
    const config = { ...defaultConfig(), ...userConfig };
    // Determine theme: manual override or auto-detect
    let theme = config.theme;
    if (theme === 'auto') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    config._resolvedTheme = theme;
    // Merge themeColors if provided
    config._themeColors = { ...defaultThemeColors(theme), ...(config.themeColors || {}) };
    renderWidget(config);
    // Listen for system theme changes if auto
    if (config.theme === 'auto') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        const newTheme = e.matches ? 'dark' : 'light';
        config._resolvedTheme = newTheme;
        config._themeColors = { ...defaultThemeColors(newTheme), ...(config.themeColors || {}) };
        renderWidget(config);
      });
    }
  }
};

function defaultConfig() {
  return {
    theme: 'auto', // 'light', 'dark', or 'auto'
    primaryColor: '#7B3FF2',
    accentColor: '#3F8CFF',
    logoUrl: '', // premium only
    botName: 'BotStitch Assistant',
    greeting: '👋 Hi there! How can I help you with BotStitch today?',
    placeholder: 'Type your message...',
    position: 'bottom-right',
    showBranding: true, // premium hides this
    webhookUrl: '',
    premium: false,
  };
}

function defaultThemeColors(theme) {
  if (theme === 'dark') {
    return {
      bg: '#181A20',
      msgBg: '#23262F',
      headerBg: 'linear-gradient(90deg, #23286B, #3F8CFF)',
      text: '#F3F6FC',
      accent: '#3F8CFF',
      userMsgBg: '#23262F',
      userMsgText: '#F3F6FC',
      botMsgBg: '#2D3748',
      botMsgText: '#F3F6FC',
      inputBg: '#23262F',
      inputText: '#F3F6FC',
      border: '#23262F',
      sendBtn: '#3F8CFF',
    };
  } else {
    return {
      bg: '#fff',
      msgBg: '#f9fafb',
      headerBg: 'linear-gradient(90deg, #7B3FF2, #3F8CFF)',
      text: '#222',
      accent: '#7B3FF2',
      userMsgBg: '#f3f4f6',
      userMsgText: '#222',
      botMsgBg: '#7B3FF2',
      botMsgText: '#fff',
      inputBg: '#fff',
      inputText: '#222',
      border: '#e5e7eb',
      sendBtn: '#7B3FF2',
    };
  }
}

// Utility: generate or get sessionId
function getSessionId() {
  let sessionId = localStorage.getItem('botstitch_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now();
    localStorage.setItem('botstitch_session_id', sessionId);
  }
  return sessionId;
}

// Utility: get platform
function getPlatform() {
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return 'mobile';
  return 'desktop';
}

function renderWidget(config) {
  // Remove existing widget if present
  const existing = document.getElementById('botstitch-widget-container');
  if (existing) existing.remove();

  const theme = config._resolvedTheme;
  const colors = config._themeColors;

  // Container
  const container = document.createElement('div');
  container.id = 'botstitch-widget-container';
  container.style.position = 'fixed';
  container.style[config.position.split('-')[1]] = '24px';
  container.style[config.position.split('-')[0]] = '24px';
  container.style.zIndex = 9999;

  // Floating Bubble/Button
  const bubble = document.createElement('button');
  bubble.id = 'botstitch-bubble';
  bubble.style.background = colors.headerBg;
  bubble.style.width = bubble.style.height = '56px';
  bubble.style.borderRadius = '50%';
  bubble.style.display = 'flex';
  bubble.style.alignItems = 'center';
  bubble.style.justifyContent = 'center';
  bubble.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
  bubble.style.cursor = 'pointer';
  bubble.style.transition = 'transform 0.2s';
  bubble.onmouseenter = () => bubble.style.transform = 'scale(1.08)';
  bubble.onmouseleave = () => bubble.style.transform = 'scale(1)';
  bubble.innerHTML = config.logoUrl && config.premium
    ? `<img src="${config.logoUrl}" alt="logo" style="width:32px;height:32px;border-radius:8px;" />`
    : `<svg width="28" height="28" fill="none" stroke="#fff" stroke-width="2"><circle cx="14" cy="14" r="12" /></svg>`;

  // Chat Window
  const chatWindow = document.createElement('div');
  chatWindow.id = 'botstitch-chat-window';
  chatWindow.style.display = 'none';
  chatWindow.style.width = '360px';
  chatWindow.style.maxWidth = '95vw';
  chatWindow.style.height = '480px';
  chatWindow.style.maxHeight = '80vh';
  chatWindow.style.background = colors.bg;
  chatWindow.style.borderRadius = '18px';
  chatWindow.style.boxShadow = '0 8px 32px rgba(0,0,0,0.16)';
  chatWindow.style.position = 'absolute';
  chatWindow.style.bottom = '72px';
  chatWindow.style.right = '0';
  chatWindow.style.overflow = 'hidden';
  chatWindow.style.display = 'flex';
  chatWindow.style.flexDirection = 'column';
  chatWindow.style.transition = 'opacity 0.2s';

  // Header
  const header = document.createElement('div');
  header.style.background = colors.headerBg;
  header.style.color = colors.text;
  header.style.padding = '16px';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      ${config.logoUrl && config.premium ? `<img src="${config.logoUrl}" alt="logo" style="width:32px;height:32px;border-radius:8px;" />` : `<svg width="28" height="28" fill="none" stroke="#fff" stroke-width="2"><circle cx="14" cy="14" r="12" /></svg>`}
      <div>
        <div style="font-weight:600;font-size:16px;">${config.botName}</div>
        <div style="font-size:12px;opacity:0.85;">Online now</div>
      </div>
    </div>
    <button id="botstitch-close-btn" style="background:none;border:none;color:#fff;cursor:pointer;font-size:22px;">&times;</button>
  `;

  // Messages Area
  const messagesArea = document.createElement('div');
  messagesArea.id = 'botstitch-messages';
  messagesArea.style.flex = '1';
  messagesArea.style.padding = '16px';
  messagesArea.style.overflowY = 'auto';
  messagesArea.style.background = colors.msgBg;
  messagesArea.innerHTML = `<div class="bot-msg" style="background:${colors.botMsgBg};color:${colors.botMsgText};padding:12px 16px;border-radius:14px 14px 4px 14px;max-width:80%;margin-bottom:8px;">${config.greeting}</div>`;

  // Input Area
  const inputArea = document.createElement('div');
  inputArea.style.padding = '16px';
  inputArea.style.borderTop = `1px solid ${colors.border}`;
  inputArea.style.background = colors.inputBg;
  inputArea.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;">
      <input id="botstitch-input" type="text" placeholder="${config.placeholder}" style="flex:1;padding:10px 14px;border:1px solid ${colors.border};border-radius:8px;font-size:15px;outline:none;background:${colors.inputBg};color:${colors.inputText};" />
      <input id="botstitch-file" type="file" style="display:none;" ${config.premium ? 'multiple' : ''} accept=".jpg,.jpeg,.png,.pdf,.doc,.docx" />
      <button id="botstitch-attach" title="Attach file" style="background:none;border:none;cursor:pointer;font-size:18px;color:${colors.accent};"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 13V7a5 5 0 0 1 10 0v6a5 5 0 0 1-10 0V8"/></svg></button>
      <button id="botstitch-send" style="background:${colors.sendBtn};color:#fff;border:none;padding:10px 18px;border-radius:8px;cursor:pointer;font-weight:500;font-size:15px;">Send</button>
    </div>
  `;

  // Branding (footer)
  let brandingText = '';
  if (!config.premium) {
    brandingText = '<span>Powered by BotStitch</span>';
  } else {
    if (config.showFooter) {
      if (config.footer) {
        brandingText = `<span>${config.footer}</span>`;
      } else {
        brandingText = '';
      }
    } else {
      brandingText = '';
    }
  }
  const branding = document.createElement('div');
  branding.style.padding = '8px 0 12px 0';
  branding.style.textAlign = 'center';
  branding.style.fontSize = '12px';
  branding.style.color = '#aaa';
  branding.innerHTML = brandingText;

  // Logo upload (premium only, placeholder)
  if (config.premium) {
    const logoUpload = document.createElement('input');
    logoUpload.type = 'file';
    logoUpload.accept = 'image/*';
    logoUpload.style.margin = '8px 0 0 16px';
    logoUpload.onchange = (e) => {
      // Placeholder: handle logo upload (to be implemented in dashboard/backend)
      alert('Logo upload is handled in the dashboard for premium users.');
    };
    header.appendChild(logoUpload);
  }

  // Assemble chat window
  chatWindow.appendChild(header);
  chatWindow.appendChild(messagesArea);
  chatWindow.appendChild(inputArea);
  chatWindow.appendChild(branding);

  // Add to DOM
  container.appendChild(bubble);
  container.appendChild(chatWindow);
  document.body.appendChild(container);

  // Animation and open/close logic
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

  // File attachment button
  inputArea.querySelector('#botstitch-attach').onclick = () => {
    inputArea.querySelector('#botstitch-file').click();
  };

  // File upload handler
  inputArea.querySelector('#botstitch-file').onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    // For each file, POST to webhook as FormData
    const fileUrls = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      // Add metadata fields
      formData.append('sessionId', getSessionId());
      formData.append('timestamp', new Date().toISOString());
      formData.append('source', 'web');
      formData.append('userAgent', navigator.userAgent);
      formData.append('platform', getPlatform());
      formData.append('metadata', JSON.stringify(config.metadata || {}));
      const url = config.n8nChatUrl || config.webhookUrl;
      try {
        const res = await fetch(url, { method: 'POST', body: formData });
        if (res.ok) {
          // Optionally, get file URL from response
          const data = await res.json();
          if (data.fileUrl) fileUrls.push(data.fileUrl);
        }
      } catch (err) {
        // handle error
      }
    }
    // Show file(s) in chat
    fileUrls.forEach(fileUrl => {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'user-msg';
      msgDiv.style.background = config._themeColors.userMsgBg;
      msgDiv.style.color = config._themeColors.userMsgText;
      msgDiv.style.padding = '12px 16px';
      msgDiv.style.borderRadius = '14px 14px 14px 4px';
      msgDiv.style.maxWidth = '80%';
      msgDiv.style.margin = '8px 0 8px auto';
      msgDiv.innerHTML = `<a href="${fileUrl}" target="_blank" rel="noopener">📎 File</a>`;
      messagesArea.appendChild(msgDiv);
      messagesArea.scrollTop = messagesArea.scrollHeight;
    });
    e.target.value = '';
  };

  // Send message logic (webhook POST)
  inputArea.querySelector('#botstitch-send').onclick = async () => {
    const input = inputArea.querySelector('#botstitch-input');
    if (input.value.trim()) {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'user-msg';
      msgDiv.style.background = config._themeColors.userMsgBg;
      msgDiv.style.color = config._themeColors.userMsgText;
      msgDiv.style.padding = '12px 16px';
      msgDiv.style.borderRadius = '14px 14px 14px 4px';
      msgDiv.style.maxWidth = '80%';
      msgDiv.style.margin = '8px 0 8px auto';
      msgDiv.innerText = input.value;
      messagesArea.appendChild(msgDiv);
      messagesArea.scrollTop = messagesArea.scrollHeight;
      // POST to webhook
      const payload = {
        message: input.value,
        sessionId: getSessionId(),
        timestamp: new Date().toISOString(),
        source: 'web',
        userAgent: navigator.userAgent,
        platform: getPlatform(),
        metadata: config.metadata || {},
        fileUrls: [],
      };
      const url = config.n8nChatUrl || config.webhookUrl;
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        // handle error
      }
      input.value = '';
    }
  };
}
