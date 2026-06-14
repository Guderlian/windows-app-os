// ─── Windows App OS ─ Utilities ────────────────────────────────────────
// Shared helper functions used across renderer modules.

const Utils = (() => {

  // ── DOM helpers ───────────────────────────────────────────────────
  function el(selector) {
    return document.querySelector(selector);
  }

  function els(selector) {
    return document.querySelectorAll(selector);
  }

  function on(el, event, fn) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (el) el.addEventListener(event, fn);
  }

  // ── Clock formatter ───────────────────────────────────────────────
  function formatTime(date = new Date()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function formatDate(date = new Date()) {
    return date.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  // ── Debounce ──────────────────────────────────────────────────────
  function debounce(fn, delay = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // ── Format bytes ──────────────────────────────────────────────────
  function formatMB(mb) {
    if (mb >= 1024) return (mb / 1024).toFixed(1) + ' GB';
    return mb + ' MB';
  }

  // ── Format uptime ─────────────────────────────────────────────────
  function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return ${d}d h;
    if (h > 0) return ${h}h m;
    return ${m}m;
  }

  // ── Simple event emitter for decoupled module communication ───────
  const listeners = {};
  function emit(name, data) {
    (listeners[name] || []).forEach(fn => fn(data));
  }
  function listen(name, fn) {
    if (!listeners[name]) listeners[name] = [];
    listeners[name].push(fn);
  }

  // ── Toast notifications ───────────────────────────────────────────
  function toast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 	oast ;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 200ms ease-out';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  // ── Generate unique ID ────────────────────────────────────────────
  function uid() {
    return 'w' + Math.random().toString(36).slice(2, 8);
  }

  return { el, els, on, formatTime, formatDate, debounce, formatMB, formatUptime, emit, listen, toast, uid };
})();
