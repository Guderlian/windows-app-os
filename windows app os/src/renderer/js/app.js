// ─── Windows App OS ─ App Entry Point ──────────────────────────────────
// Bootstrap: initializes all renderer modules on DOMContentLoaded.

(function () {
  'use strict';

  // ── Wait for DOM and preload bridge ─────────────────────────────────
  function boot() {
    // Initialize all modules in order
    Desktop.init();
    Taskbar.init();
    StartMenu.init();

    // Register global keyboard shortcuts
    registerShortcuts();

    console.log('[winOS] Renderer initialized.');
    console.log('[winOS] Platform:', window.winOS ? window.winOS.platform : 'browser (no IPC)');
  }

  // ── Global keyboard shortcuts (Windows 11 style) ────────────────────
  function registerShortcuts() {
    document.addEventListener('keydown', (e) => {

      // Win key (Meta) opens/closes start menu
      if (e.key === 'Meta') {
        e.preventDefault();
        StartMenu.toggle();
        return;
      }

      // Alt+F4 closes focused window
      if (e.altKey && e.key === 'F4') {
        e.preventDefault();
        const focused = document.querySelector('.app-window.focused');
        if (focused) {
          WindowManager.close(focused.id);
        }
        return;
      }

      // Ctrl+Shift+Esc to toggle task manager (placeholder)
      if (e.ctrlKey && e.shiftKey && e.key === 'Escape') {
        e.preventDefault();
        Utils.toast('Task Manager — coming in Step 4', 'info');
        return;
      }
    });
  }

  // ── Boot when ready ──────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
