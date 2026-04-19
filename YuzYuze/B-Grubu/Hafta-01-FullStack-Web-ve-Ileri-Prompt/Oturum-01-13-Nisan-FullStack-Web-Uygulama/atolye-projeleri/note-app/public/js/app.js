// === State ===
let currentUser = null;
let notes = [];
let editingNoteId = null;
let currentColor = '#ffffff';
let currentPinned = false;
let searchTimeout = null;

// === DOM Elements ===
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authError = document.getElementById('auth-error');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const logoutBtn = document.getElementById('logout-btn');
const userGreeting = document.getElementById('user-greeting');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const newNoteBtn = document.getElementById('new-note-btn');
const notesContainer = document.getElementById('notes-container');
const emptyState = document.getElementById('empty-state');
const noteModal = document.getElementById('note-modal');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalDeleteBtn = document.getElementById('modal-delete-btn');
const modalPinBtn = document.getElementById('modal-pin-btn');
const modalDate = document.getElementById('modal-date');
const modalOverlay = noteModal.querySelector('.modal-overlay');
const colorBtns = document.querySelectorAll('.color-btn');
const toastEl = document.getElementById('toast');

// === API Helpers ===
async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Bir hata oluştu');
  return data;
}

function showToast(msg, isError = false) {
  toastEl.textContent = msg;
  toastEl.className = 'toast' + (isError ? ' error' : '');
  setTimeout(() => toastEl.classList.add('hidden'), 3000);
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'Z');
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// === Auth ===
showRegisterLink.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
  authError.classList.add('hidden');
});

showLoginLink.addEventListener('click', (e) => {
  e.preventDefault();
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
  authError.classList.add('hidden');
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.classList.add('hidden');
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    currentUser = data.user;
    showApp();
  } catch (err) {
    authError.textContent = err.message;
    authError.classList.remove('hidden');
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.classList.add('hidden');
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  try {
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    currentUser = data.user;
    showApp();
  } catch (err) {
    authError.textContent = err.message;
    authError.classList.remove('hidden');
  }
});

logoutBtn.addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  currentUser = null;
  notes = [];
  authSection.classList.remove('hidden');
  appSection.classList.add('hidden');
  loginForm.reset();
  registerForm.reset();
  showToast('Çıkış yapıldı');
});

// === App Init ===
async function checkAuth() {
  try {
    const data = await api('/api/auth/me');
    currentUser = data.user;
    showApp();
  } catch {
    authSection.classList.remove('hidden');
    appSection.classList.add('hidden');
  }
}

function showApp() {
  authSection.classList.add('hidden');
  appSection.classList.remove('hidden');
  userGreeting.textContent = `Merhaba, ${escapeHtml(currentUser.username)}`;
  loadNotes();
}

// === Notes ===
async function loadNotes() {
  const search = searchInput.value.trim();
  const sort = sortSelect.value;
  let url = `/api/notes?sort=${encodeURIComponent(sort)}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;

  try {
    const data = await api(url);
    notes = data.notes;
    renderNotes();
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderNotes() {
  if (notes.length === 0) {
    notesContainer.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  notesContainer.classList.remove('hidden');

  notesContainer.innerHTML = notes.map(note => `
    <div class="note-card ${note.pinned ? 'pinned' : ''}" data-id="${note.id}" style="background: ${escapeHtml(note.color)}">
      <div class="note-card-title">${escapeHtml(note.title) || '<em>Başlıksız</em>'}</div>
      <div class="note-card-content">${escapeHtml(note.content)}</div>
      <div class="note-card-date">${formatDate(note.updated_at)}</div>
    </div>
  `).join('');

  // Add click listeners
  notesContainer.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', () => {
      const noteId = parseInt(card.dataset.id);
      const note = notes.find(n => n.id === noteId);
      if (note) openModal(note);
    });
  });
}

// === Search & Sort ===
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadNotes, 300);
});

sortSelect.addEventListener('change', loadNotes);

// === Modal ===
function openModal(note = null) {
  editingNoteId = note ? note.id : null;
  modalTitle.value = note ? note.title : '';
  modalContent.value = note ? note.content : '';
  currentColor = note ? note.color : '#ffffff';
  currentPinned = note ? !!note.pinned : false;

  noteModal.querySelector('.modal-content').style.background = currentColor;
  updateColorBtns();
  updatePinBtn();

  if (note) {
    modalDeleteBtn.classList.remove('hidden');
    modalDate.textContent = `Düzenlendi: ${formatDate(note.updated_at)}`;
  } else {
    modalDeleteBtn.classList.add('hidden');
    modalDate.textContent = '';
  }

  noteModal.classList.remove('hidden');
  modalTitle.focus();
}

function closeModal() {
  noteModal.classList.add('hidden');
  editingNoteId = null;
}

function updateColorBtns() {
  colorBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === currentColor);
  });
}

function updatePinBtn() {
  modalPinBtn.style.opacity = currentPinned ? 1 : 0.4;
}

newNoteBtn.addEventListener('click', () => openModal());
modalCloseBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !noteModal.classList.contains('hidden')) {
    closeModal();
  }
});

colorBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentColor = btn.dataset.color;
    noteModal.querySelector('.modal-content').style.background = currentColor;
    updateColorBtns();
  });
});

modalPinBtn.addEventListener('click', () => {
  currentPinned = !currentPinned;
  updatePinBtn();
});

modalSaveBtn.addEventListener('click', async () => {
  const title = modalTitle.value.trim();
  const content = modalContent.value.trim();

  if (!title && !content) {
    showToast('Başlık veya içerik gereklidir', true);
    return;
  }

  try {
    if (editingNoteId) {
      await api(`/api/notes/${editingNoteId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, content, color: currentColor, pinned: currentPinned }),
      });
      showToast('Not güncellendi');
    } else {
      await api('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ title, content, color: currentColor }),
      });
      showToast('Not oluşturuldu');
    }
    closeModal();
    loadNotes();
  } catch (err) {
    showToast(err.message, true);
  }
});

modalDeleteBtn.addEventListener('click', async () => {
  if (!editingNoteId) return;
  if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) return;

  try {
    await api(`/api/notes/${editingNoteId}`, { method: 'DELETE' });
    showToast('Not silindi');
    closeModal();
    loadNotes();
  } catch (err) {
    showToast(err.message, true);
  }
});

// === Keyboard Shortcut ===
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + K to focus search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    searchInput.focus();
  }
});

// === Start ===
checkAuth();
