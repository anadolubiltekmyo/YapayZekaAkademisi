const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');

// Load .env manually
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const value = trimmed.substring(idx + 1).trim();
        process.env[key] = value;
      }
    }
  }
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

const MODELS = {
  'gpt-5.4-nano': { client: openai, name: 'GPT-5.4 Nano', provider: 'OpenAI' },
  'llama-3.3-70b-versatile': { client: groq, name: 'Llama 3.3 70B', provider: 'Groq' },
  'llama-3.1-8b-instant': { client: groq, name: 'Llama 3.1 8B', provider: 'Groq' },
  'gemma2-9b-it': { client: groq, name: 'Gemma 2 9B', provider: 'Groq' },
  'mixtral-8x7b-32768': { client: groq, name: 'Mixtral 8x7B', provider: 'Groq' },
  'deepseek-r1-distill-llama-70b': { client: groq, name: 'DeepSeek R1 70B', provider: 'Groq' },
};

const HISTORY_DIR = path.join(app.getPath('userData'), 'chat_history');

function ensureHistoryDir() {
  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
  }
}

function getConversationPath(id) {
  // Sanitize to prevent path traversal
  const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(HISTORY_DIR, `${sanitized}.json`);
}

// ---- IPC Handlers ----

ipcMain.handle('get-conversations', () => {
  ensureHistoryDir();
  const files = fs.readdirSync(HISTORY_DIR).filter(f => f.endsWith('.json'));
  const conversations = files.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, f), 'utf-8'));
    return {
      id: data.id,
      title: data.title,
      updatedAt: data.updatedAt
    };
  });
  conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return conversations;
});

ipcMain.handle('get-conversation', (_event, id) => {
  const filePath = getConversationPath(id);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return null;
});

ipcMain.handle('save-conversation', (_event, conversation) => {
  ensureHistoryDir();
  const filePath = getConversationPath(conversation.id);
  fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2), 'utf-8');
  return true;
});

ipcMain.handle('delete-conversation', (_event, id) => {
  const filePath = getConversationPath(id);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  return true;
});

ipcMain.handle('get-models', () => {
  return Object.entries(MODELS).map(([id, m]) => ({ id, name: m.name, provider: m.provider }));
});

ipcMain.handle('chat-completion', async (_event, messages, modelId) => {
  const model = MODELS[modelId] || MODELS['gpt-5.4-nano'];
  try {
    const response = await model.client.chat.completions.create({
      model: modelId,
      messages,
      stream: false
    });
    return { success: true, message: response.choices[0].message };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('chat-completion-stream', async (event, messages, modelId) => {
  const model = MODELS[modelId] || MODELS['gpt-5.4-nano'];
  try {
    const stream = await model.client.chat.completions.create({
      model: modelId,
      messages,
      stream: true
    });
    let fullContent = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      fullContent += delta;
      event.sender.send('stream-chunk', delta);
    }
    event.sender.send('stream-end');
    return { success: true, content: fullContent };
  } catch (error) {
    event.sender.send('stream-end');
    return { success: false, error: error.message };
  }
});

// ---- Window ----

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
