const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getConversations: () => ipcRenderer.invoke('get-conversations'),
  getConversation: (id) => ipcRenderer.invoke('get-conversation', id),
  saveConversation: (conv) => ipcRenderer.invoke('save-conversation', conv),
  deleteConversation: (id) => ipcRenderer.invoke('delete-conversation', id),
  getModels: () => ipcRenderer.invoke('get-models'),
  chatCompletion: (messages, modelId) => ipcRenderer.invoke('chat-completion', messages, modelId),
  chatCompletionStream: (messages, modelId) => ipcRenderer.invoke('chat-completion-stream', messages, modelId),
  onStreamChunk: (callback) => {
    const handler = (_event, chunk) => callback(chunk);
    ipcRenderer.on('stream-chunk', handler);
    return () => ipcRenderer.removeListener('stream-chunk', handler);
  },
  onStreamEnd: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('stream-end', handler);
    return () => ipcRenderer.removeListener('stream-end', handler);
  }
});
