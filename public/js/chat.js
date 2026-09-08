// ============ widget de chat — lógica ============
(() => {
  const widget = document.getElementById('chatWidget');
  const toggle = document.getElementById('chatToggle');
  const closeBtn = document.getElementById('chatClose');
  const messagesEl = document.getElementById('chatMessages');
  const typingEl = document.getElementById('chatTyping');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');

  const history = [];
  let sending = false;

  function openChat() {
    widget.classList.add('open');
    setTimeout(() => input.focus(), 250);
  }

  function closeChat() {
    widget.classList.remove('open');
  }

  toggle.addEventListener('click', () => {
    widget.classList.contains('open') ? closeChat() : openChat();
  });
  closeBtn.addEventListener('click', closeChat);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  function addMessage(kind, text) {
    const el = document.createElement('div');
    el.className =
      'chat-msg ' +
      (kind === 'user' ? 'chat-msg-user' : kind === 'error' ? 'chat-msg-error' : 'chat-msg-bot');
    const p = document.createElement('p');
    p.textContent = text;
    el.appendChild(p);
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || sending) return;

    addMessage('user', text);
    history.push({ role: 'user', content: text });
    input.value = '';
    sending = true;
    typingEl.hidden = false;
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-8) }),
      });
      const data = await res.json();
      typingEl.hidden = true;

      if (!res.ok || data.error || !data.reply) {
        addMessage('error', 'No pude responder justo ahora. Intenta de nuevo o escríbenos a contacto@vivaforge.io.');
      } else {
        addMessage('bot', data.reply);
        history.push({ role: 'assistant', content: data.reply });
      }
    } catch (err) {
      typingEl.hidden = true;
      addMessage('error', 'Hubo un problema de conexión. Intenta de nuevo.');
    } finally {
      sending = false;
      input.focus();
    }
  });
})();
