// ---------- State ----------
const API_BASE = '/api';
let authToken = localStorage.getItem('access_token');

// ---------- Helpers ----------
function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerText = message;
    el.style.display = 'block';
    setTimeout(() => {
        if (el) el.style.display = 'none';
    }, 4000);
}

async function apiRequest(endpoint, method, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: method,
        headers: headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 401 && authToken) {
        localStorage.removeItem('access_token');
        authToken = null;
        window.location.reload();
        throw new Error('Session expired');
    }
    return response;
}

function showAuth(showLogin) {
    document.getElementById('loginForm').style.display = showLogin ? 'block' : 'none';
    document.getElementById('registerForm').style.display = showLogin ? 'none' : 'block';
}

function logout() {
    localStorage.removeItem('access_token');
    authToken = null;
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('chatSection').style.display = 'none';
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('regUsername').value = '';
    document.getElementById('regPassword').value = '';
}

function addMessage(text, isUser) {
    const container = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    msgDiv.innerText = text;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

// ---------- Auth ----------
async function tryAutoLogin() {
    if (!authToken) return false;
    try {
        const res = await apiRequest('/chat', 'POST', { message: 'ping' });
        if (res.status === 200) {
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            document.getElementById('chatUsername').innerText = payload.sub;
            document.getElementById('authSection').style.display = 'none';
            document.getElementById('chatSection').style.display = 'block';
            return true;
        }
        throw new Error('invalid');
    } catch (e) {
        localStorage.removeItem('access_token');
        authToken = null;
        return false;
    }
}

async function register() {
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    if (!username || !password) {
        showError('regError', 'Username & password required');
        return;
    }
    const btn = document.getElementById('registerBtn');
    btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Registration failed');
        localStorage.setItem('access_token', data.access_token);
        authToken = data.access_token;
        window.location.reload();
    } catch (err) {
        showError('regError', err.message);
    } finally {
        btn.disabled = false;
    }
}

async function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!username || !password) {
        showError('loginError', 'Enter credentials');
        return;
    }
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Invalid login');
        localStorage.setItem('access_token', data.access_token);
        authToken = data.access_token;
        window.location.reload();
    } catch (err) {
        showError('loginError', err.message);
    } finally {
        btn.disabled = false;
    }
}

// ---------- Chat ----------
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    addMessage(msg, true);
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    sendBtn.innerText = '...';
    try {
        const res = await apiRequest('/chat', 'POST', { message: msg });
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || 'Chat failed');
        }
        const data = await res.json();
        addMessage(data.reply, false);
    } catch (err) {
        addMessage('⚠️ Error: ' + err.message, false);
        console.error(err);
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerText = 'Send';
        input.focus();
    }
}

// ---------- Event Listeners ----------
document.addEventListener('DOMContentLoaded', async () => {
    // Toggle forms
    document.getElementById('showRegisterLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showAuth(false);
    });
    document.getElementById('showLoginLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showAuth(true);
    });

    // Buttons
    document.getElementById('loginBtn')?.addEventListener('click', login);
    document.getElementById('registerBtn')?.addEventListener('click', register);
    document.getElementById('sendBtn')?.addEventListener('click', sendMessage);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);

    // Enter to send
    document.getElementById('messageInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-login
    const logged = await tryAutoLogin();
    if (!logged) {
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('chatSection').style.display = 'none';
    } else {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('chatSection').style.display = 'block';
    }
});
