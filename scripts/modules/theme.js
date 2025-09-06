// Theme handling
(() => {
  const App = (window.App = window.App || {});
  const THEME_KEY = 'theme';

  function applyTheme(t) {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(t);
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
      const img = btn.querySelector('img');
      if (img) img.src = t === 'dark' ? 'icons/moon.svg' : 'icons/sun.svg';
    }
  }
  function initTheme() {
    let t = localStorage.getItem(THEME_KEY);
    if (!t) t = 'dark';
    applyTheme(t);
  }
  function toggleTheme() {
    const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  }

  App.theme = { applyTheme, initTheme, toggleTheme };
})();
