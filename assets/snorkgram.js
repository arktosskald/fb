(() => {
  'use strict';

  const form = document.getElementById('snork-connect');
  if (!form) return;

  const address = document.getElementById('snork-address');
  const note = document.getElementById('snork-status');
  const serverStatus = document.getElementById('snork-server-status');
  const root = document.body.dataset.root || './';
  const language = document.documentElement.lang === 'en' ? 'en' : 'ru';
  const preference = 'zonebook.snorkgram.server';
  const loopback = 'http://127.0.0.1:19210/';
  const t = (ru, en) => language === 'en' ? en : ru;
  let configured = '';

  function pagesAddress(value) {
    try {
      return new URL(value.trim()).hostname.endsWith('.github.io');
    } catch {
      return false;
    }
  }

  function explainPages() {
    note.textContent = t(
      'Это адрес портала GitHub Pages. Для входа нужен адрес запущенного ASP.NET-сервера. Для пробы выберите «На этом компьютере».',
      'This is a GitHub Pages portal. Sign-in requires a running ASP.NET server. To try it locally, select On this computer.'
    );
  }

  function parseServer(value) {
    const input = String(value || '').trim();
    if (pagesAddress(input) || !/^https?:\/\//i.test(input) || input.length > 512 || /[\\\s?#]/.test(input)) {
      return null;
    }
    try {
      const url = new URL(input);
      const localHttp = url.protocol === 'http:' &&
        ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
      if ((url.protocol !== 'https:' && !localHttp) ||
          url.username || url.password || url.pathname !== '/' ||
          url.hostname === 'zonebook.local' || url.hostname.endsWith('.zonebook.local')) {
        return null;
      }
      return url.origin + '/';
    } catch {
      return null;
    }
  }

  function loadPreference() {
    try {
      return parseServer(localStorage.getItem(preference)) || '';
    } catch {
      return '';
    }
  }

  function savePreference(value) {
    try {
      if (value) localStorage.setItem(preference, value);
      else localStorage.removeItem(preference);
    } catch {
      // A restricted browser profile can still open the selected server.
    }
  }

  async function checkSharedServer() {
    if (!serverStatus || !configured || !configured.startsWith('https://')) return;
    serverStatus.textContent = t('Проверяем общий сервер…', 'Checking the shared server…');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(new URL('api/status', configured).href, {
        credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal
      });
      if (!response.ok) throw new Error('Server unavailable');
      const status = await response.json();
      if (status.service !== 'SnorkGram' || status.ready !== true) throw new Error('Invalid status');
      const registration = {
        invite: t('Регистрация по приглашениям.', 'Registration by invitation.'),
        open: t('Регистрация открыта.', 'Registration is open.'),
        closed: t('Регистрация закрыта.', 'Registration is closed.')
      };
      serverStatus.textContent = t('Общий сервер на связи.', 'The shared server is online.') +
        (registration[status.registration] ? ' ' + registration[status.registration] : '');
    } catch {
      serverStatus.textContent = t('Общий сервер не ответил на проверку. Можно попробовать открыть его напрямую.', 'The shared server did not answer the status check. You can still try opening it directly.');
    } finally {
      clearTimeout(timeout);
    }
  }

  let edited = false;
  address.value = loadPreference();
  address.addEventListener('input', () => {
    edited = true;
    address.removeAttribute('aria-invalid');
    note.textContent = '';
  });

  if (location.protocol === 'https:' || location.protocol === 'http:') {
    fetch(root + 'snorkgram-server.json', { credentials: 'omit', cache: 'no-cache' })
      .then(response => response.ok ? response.json() : null)
      .then(settings => {
        configured = parseServer(settings?.server_url) || '';
        void checkSharedServer();
        if (!edited && !address.value) {
          address.value = configured;
          if (typeof settings?.server_url === 'string' && pagesAddress(settings.server_url)) explainPages();
        }
      })
      .catch(() => {});
  }

  document.getElementById('snork-local').addEventListener('click', () => {
    address.value = loopback;
    address.dispatchEvent(new Event('input'));
    address.focus();
  });

  document.getElementById('snork-reset').addEventListener('click', () => {
    savePreference('');
    address.value = configured;
    address.dispatchEvent(new Event('input'));
    note.textContent = t('Запомненный адрес удалён.', 'Saved address cleared.');
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const selected = parseServer(address.value);
    if (!selected) {
      address.setAttribute('aria-invalid', 'true');
      if (pagesAddress(address.value)) explainPages();
      else note.textContent = t(
        'Укажите HTTPS-адрес сервера целиком, без пути. HTTP подходит для сервера на этом компьютере.',
        'Enter the full HTTPS server address without a path. HTTP is available for a server on this computer.'
      );
      address.focus();
      return;
    }
    savePreference(selected);
    const destination = new URL(selected);
    destination.searchParams.set('lang', language);
    location.assign(destination.href);
  });
})();
