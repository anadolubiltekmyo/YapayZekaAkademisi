// ============================================
// State
// ============================================
let conversations = [];
let currentConversation = null;
let isStreaming = false;
let streamCleanup = null;
let availableModels = [];
let selectedModelId = 'llama-3.3-70b-versatile';

// ============================================
// DOM Elements
// ============================================
const sidebar = document.getElementById('sidebar');
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const searchInput = document.getElementById('search-input');
const conversationList = document.getElementById('conversation-list');
const welcomeScreen = document.getElementById('welcome-screen');
const messagesContainer = document.getElementById('messages-container');
const messagesEl = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const headerTitle = document.getElementById('header-title');
const headerModel = document.getElementById('header-model');
const modelSelect = document.getElementById('model-select');
const footerModelLabel = document.getElementById('footer-model-label');

// ============================================
// Init
// ============================================
async function init() {
  await loadModels();
  await loadConversations();
  renderConversationList();
  setupEventListeners();
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
  toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  newChatBtn.addEventListener('click', () => {
    startNewChat();
  });

  searchInput.addEventListener('input', (e) => {
    filterConversations(e.target.value);
  });

  messageInput.addEventListener('input', () => {
    autoResize(messageInput);
    sendBtn.disabled = !messageInput.value.trim() || isStreaming;
  });

  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) sendMessage();
    }
  });

  sendBtn.addEventListener('click', () => {
    if (!sendBtn.disabled) sendMessage();
  });

  modelSelect.addEventListener('change', (e) => {
    selectedModelId = e.target.value;
    updateModelLabels();
  });

  // Suggestion chips
  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      messageInput.value = prompt;
      autoResize(messageInput);
      sendBtn.disabled = false;
      sendMessage();
    });
  });
}

// ============================================
// Models
// ============================================
async function loadModels() {
  availableModels = await window.api.getModels();
  modelSelect.innerHTML = '';

  const providers = {};
  availableModels.forEach((m) => {
    if (!providers[m.provider]) providers[m.provider] = [];
    providers[m.provider].push(m);
  });

  Object.entries(providers).forEach(([provider, models]) => {
    const group = document.createElement('optgroup');
    group.label = provider;
    models.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      if (m.id === selectedModelId) opt.selected = true;
      group.appendChild(opt);
    });
    modelSelect.appendChild(group);
  });

  updateModelLabels();
}

function updateModelLabels() {
  const model = availableModels.find((m) => m.id === selectedModelId);
  const label = model ? `${model.name} (${model.provider})` : selectedModelId;
  headerModel.textContent = model ? model.name : selectedModelId;
  footerModelLabel.textContent = `${label} ile güçlendirilmiştir`;
}

// ============================================
// Conversations
// ============================================
async function loadConversations() {
  conversations = await window.api.getConversations();
}

function renderConversationList(filter = '') {
  conversationList.innerHTML = '';
  const filtered = filter
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(filter.toLowerCase())
      )
    : conversations;

  if (filtered.length === 0) {
    conversationList.innerHTML = `
      <div style="text-align:center; padding:24px; color:var(--text-muted); font-size:13px;">
        ${filter ? 'Sonuç bulunamadı' : 'Henüz sohbet yok'}
      </div>`;
    return;
  }

  filtered.forEach((conv) => {
    const el = document.createElement('div');
    el.className = `conversation-item${currentConversation?.id === conv.id ? ' active' : ''}`;
    el.innerHTML = `
      <span class="conv-title">${escapeHtml(conv.title)}</span>
      <button class="delete-btn" title="Sohbeti sil">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>`;

    el.querySelector('.conv-title').addEventListener('click', () => {
      loadConversation(conv.id);
    });

    el.querySelector('.delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteConversation(conv.id);
    });

    conversationList.appendChild(el);
  });
}

function filterConversations(query) {
  renderConversationList(query);
}

async function loadConversation(id) {
  const conv = await window.api.getConversation(id);
  if (!conv) return;
  currentConversation = conv;
  // Restore the model used in this conversation
  if (conv.modelId && availableModels.find((m) => m.id === conv.modelId)) {
    selectedModelId = conv.modelId;
    modelSelect.value = selectedModelId;
    updateModelLabels();
  }
  showChatView();
  renderMessages();
  headerTitle.textContent = conv.title;
  renderConversationList(searchInput.value);
}

async function deleteConversation(id) {
  await window.api.deleteConversation(id);
  if (currentConversation?.id === id) {
    startNewChat();
  }
  await loadConversations();
  renderConversationList(searchInput.value);
}

function startNewChat() {
  currentConversation = null;
  headerTitle.textContent = 'Yeni Sohbet';
  showWelcomeView();
  renderConversationList(searchInput.value);
  messageInput.focus();
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// ============================================
// Views
// ============================================
function showChatView() {
  welcomeScreen.style.display = 'none';
  messagesContainer.style.display = 'flex';
}

function showWelcomeView() {
  welcomeScreen.style.display = 'flex';
  messagesContainer.style.display = 'none';
  messagesEl.innerHTML = '';
}

// ============================================
// Messages
// ============================================
function renderMessages() {
  messagesEl.innerHTML = '';
  if (!currentConversation) return;

  currentConversation.messages.forEach((msg) => {
    if (msg.role === 'system') return;
    appendMessageToDOM(msg.role, msg.content);
  });

  scrollToBottom();
}

function appendMessageToDOM(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';

  const isUser = role === 'user';
  const senderName = isUser ? 'Sen' : 'Asistan';
  const avatarClass = isUser ? 'user' : 'assistant';
  const avatarLetter = isUser ? 'S' : 'A';

  messageDiv.innerHTML = `
    <div class="message-header">
      <div class="avatar ${avatarClass}">${avatarLetter}</div>
      <span class="message-sender">${senderName}</span>
    </div>
    <div class="message-body">${isUser ? escapeHtml(content).replace(/\n/g, '<br>') : formatMarkdown(content)}</div>`;

  messagesEl.appendChild(messageDiv);

  // Add copy buttons to code blocks
  messageDiv.querySelectorAll('pre').forEach((pre) => {
    const btn = document.createElement('button');
    btn.className = 'copy-code-btn';
    btn.textContent = 'Kopyala';
    btn.addEventListener('click', () => {
      const code = pre.querySelector('code')?.textContent || pre.textContent;
      navigator.clipboard.writeText(code);
      btn.textContent = 'Kopyalandı!';
      setTimeout(() => (btn.textContent = 'Kopyala'), 2000);
    });
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });

  return messageDiv;
}

function createStreamingMessage() {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';
  messageDiv.innerHTML = `
    <div class="message-header">
      <div class="avatar assistant">A</div>
      <span class="message-sender">Asistan</span>
    </div>
    <div class="message-body">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>`;
  messagesEl.appendChild(messageDiv);
  return messageDiv;
}

function updateStreamingMessage(messageDiv, content) {
  const body = messageDiv.querySelector('.message-body');
  body.innerHTML = formatMarkdown(content);

  // Add copy buttons
  body.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.copy-code-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'copy-code-btn';
    btn.textContent = 'Kopyala';
    btn.addEventListener('click', () => {
      const code = pre.querySelector('code')?.textContent || pre.textContent;
      navigator.clipboard.writeText(code);
      btn.textContent = 'Kopyalandı!';
      setTimeout(() => (btn.textContent = 'Kopyala'), 2000);
    });
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });
}

// ============================================
// Send Message
// ============================================
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || isStreaming) return;

  // Create conversation if new
  if (!currentConversation) {
    currentConversation = {
      id: generateId(),
      title: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      modelId: selectedModelId,
      messages: [
        {
          role: 'system',
          content: 'Sen yardımsever bir asistansın. Kullanıcıyla Türkçe konuş. Kısa ve öz cevaplar ver ama gerektiğinde detaylı açıklama yap.'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    showChatView();
  }

  // Add user message
  currentConversation.messages.push({ role: 'user', content: text });
  appendMessageToDOM('user', text);

  // Clear input
  messageInput.value = '';
  autoResize(messageInput);
  sendBtn.disabled = true;
  isStreaming = true;

  scrollToBottom();

  // Create streaming placeholder
  const streamDiv = createStreamingMessage();
  scrollToBottom();

  // Start streaming
  let fullContent = '';

  // Clean up previous listeners
  if (streamCleanup) {
    streamCleanup();
    streamCleanup = null;
  }

  const removeChunkListener = window.api.onStreamChunk((chunk) => {
    fullContent += chunk;
    updateStreamingMessage(streamDiv, fullContent);
    scrollToBottom();
  });

  const removeEndListener = window.api.onStreamEnd(() => {
    cleanup();
  });

  function cleanup() {
    removeChunkListener();
    removeEndListener();
    streamCleanup = null;
  }

  streamCleanup = cleanup;

  try {
    const apiMessages = currentConversation.messages.map((m) => ({
      role: m.role,
      content: m.content
    }));

    const result = await window.api.chatCompletionStream(apiMessages, selectedModelId);

    if (result.success) {
      fullContent = result.content;
      updateStreamingMessage(streamDiv, fullContent);
      currentConversation.messages.push({ role: 'assistant', content: fullContent });
    } else {
      streamDiv.querySelector('.message-body').innerHTML = `
        <div class="error-message">Hata: ${escapeHtml(result.error)}</div>`;
    }
  } catch (err) {
    streamDiv.querySelector('.message-body').innerHTML = `
      <div class="error-message">Bağlantı hatası: ${escapeHtml(err.message)}</div>`;
  }

  // Save & update
  isStreaming = false;
  sendBtn.disabled = !messageInput.value.trim();
  currentConversation.updatedAt = new Date().toISOString();
  headerTitle.textContent = currentConversation.title;
  await window.api.saveConversation(currentConversation);
  await loadConversations();
  renderConversationList(searchInput.value);
  scrollToBottom();
}

// ============================================
// Utilities
// ============================================
function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatMarkdown(text) {
  if (!text) return '';

  // Code blocks (```lang\ncode\n```)
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  // Blockquotes
  text = text.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Unordered lists
  text = text.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  text = text.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Ordered lists
  text = text.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Headers
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Paragraphs - split by double newlines
  text = text
    .split(/\n\n+/)
    .map((block) => {
      block = block.trim();
      if (!block) return '';
      if (
        block.startsWith('<pre>') ||
        block.startsWith('<ul>') ||
        block.startsWith('<ol>') ||
        block.startsWith('<h') ||
        block.startsWith('<blockquote')
      ) {
        return block;
      }
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  return text;
}

// ============================================
// Start
// ============================================
init();
