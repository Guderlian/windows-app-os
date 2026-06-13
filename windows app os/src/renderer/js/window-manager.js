// ─── Windows App OS ─ Window Manager ───────────────────────────────────
// Manages draggable, resizable, minimizable app windows within the desktop.

const WindowManager = (() => {
  const windows = new Map();
  const orderStack = [];
  let zIndexCounter = 100;

  // ── Create a new window ──────────────────────────────────────────
  function create({ id, title, icon, content, width = 700, height = 460, x, y }) {
    const winId = id || Utils.uid();

    // Default position: cascade
    const cascadeCount = windows.size % 8;
    const posX = x ?? (60 + cascadeCount * 30);
    const posY = y ?? (60 + cascadeCount * 30);
    const desktopW = window.innerWidth;
    const desktopH = window.innerHeight - 48; // taskbar
    const finalW = Math.min(width, desktopW - 40);
    const finalH = Math.min(height, desktopH - 40);

    const winEl = document.createElement('div');
    winEl.className = 'app-window opening';
    winEl.id = winId;
    winEl.style.cssText = left:px; top:px; width:px; height:px; z-index:;;

    winEl.innerHTML = 
      <div class=\"window-titlebar\" data-winid=\"\">
        <span class=\"window-title\"> </span>
        <div class=\"window-controls\">
          <button class=\"window-ctrl\" data-action=\"minimize\" title=\"Minimize\">&#x2014;</button>
          <button class=\"window-ctrl\" data-action=\"maximize\" title=\"Maximize\">&#x25A1;</button>
          <button class=\"window-ctrl close\" data-action=\"close\" title=\"Close\">&#x2715;</button>
        </div>
      </div>
      <div class=\"window-body\"></div>
      <div class=\"resize-handle n\"  data-resize=\"n\"></div>
      <div class=\"resize-handle s\"  data-resize=\"s\"></div>
      <div class=\"resize-handle w\"  data-resize=\"w\"></div>
      <div class=\"resize-handle e\"  data-resize=\"e\"></div>
      <div class=\"resize-handle nw\" data-resize=\"nw\"></div>
      <div class=\"resize-handle ne\" data-resize=\"ne\"></div>
      <div class=\"resize-handle sw\" data-resize=\"sw\"></div>
      <div class=\"resize-handle se\" data-resize=\"se\"></div>
    ;

    document.getElementById('desktop').appendChild(winEl);

    // Remove opening animation class
    setTimeout(() => winEl.classList.remove('opening'), 200);

    // Event bindings
    bindTitlebar(winEl);
    bindResize(winEl);
    bindFocus(winEl);
    bindControls(winEl);

    windows.set(winId, {
      el: winEl,
      title,
      icon,
      minimized: false,
      maximized: false,
      prevBounds: null,
    });
    orderStack.push(winId);
    updateTaskbarButtons();

    // Emit event
    Utils.emit('window:created', { id: winId, title });
    focus(winId);

    return winId;
  }

  // ── Titlebar dragging ────────────────────────────────────────────
  function bindTitlebar(winEl) {
    const titlebar = winEl.querySelector('.window-titlebar');
    let startX, startY, startLeft, startTop, dragging = false;

    titlebar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.window-ctrl')) return; // Don't drag on buttons
      const win = windows.get(winEl.id);
      if (win && win.maximized) return;

      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = winEl.offsetLeft;
      startTop = winEl.offsetTop;
      titlebar.classList.add('dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      winEl.style.left = Math.max(0, startLeft + dx) + 'px';
      winEl.style.top = Math.max(0, startTop + dy) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        titlebar.classList.remove('dragging');
      }
    });

    // Double-click titlebar to maximize/restore
    titlebar.addEventListener('dblclick', () => {
      toggleMaximize(winEl.id);
    });
  }

  // ── Resize ───────────────────────────────────────────────────────
  function bindResize(winEl) {
    const handles = winEl.querySelectorAll('.resize-handle');
    let resizing = false, dir, startX, startY, startW, startH, startL, startT;

    handles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        const win = windows.get(winEl.id);
        if (win && win.maximized) return;
        resizing = true;
        dir = handle.dataset.resize;
        startX = e.clientX;
        startY = e.clientY;
        startW = winEl.offsetWidth;
        startH = winEl.offsetHeight;
        startL = winEl.offsetLeft;
        startT = winEl.offsetTop;
        e.preventDefault();
        e.stopPropagation();
      });
    });

    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const minW = 400, minH = 280;

      let newW = startW, newH = startH, newL = startL, newT = startT;

      if (dir.includes('e')) newW = Math.max(minW, startW + dx);
      if (dir.includes('w')) { newW = Math.max(minW, startW - dx); newL = startL + dx; }
      if (dir.includes('s')) newH = Math.max(minH, startH + dy);
      if (dir.includes('n')) { newH = Math.max(minH, startH - dy); newT = startT + dy; }

      winEl.style.width = newW + 'px';
      winEl.style.height = newH + 'px';
      winEl.style.left = newL + 'px';
      winEl.style.top = newT + 'px';
    });

    document.addEventListener('mouseup', () => { resizing = false; });
  }

  // ── Focus / bring to front ───────────────────────────────────────
  function bindFocus(winEl) {
    winEl.addEventListener('mousedown', () => focus(winEl.id));
  }

  function focus(winId) {
    const win = windows.get(winId);
    if (!win || win.minimized) return;
    win.el.style.zIndex = ++zIndexCounter;
    win.el.classList.add('focused');
    // Remove focused from others
    windows.forEach((w, id) => {
      if (id !== winId) w.el.classList.remove('focused');
    });
    // Reorder stack
    const idx = orderStack.indexOf(winId);
    if (idx > -1) orderStack.splice(idx, 1);
    orderStack.push(winId);
    updateTaskbarButtons();

    Utils.emit('window:focused', { id: winId });
  }

  // ── Window controls (min/max/close) ──────────────────────────────
  function bindControls(winEl) {
    winEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.window-ctrl');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'minimize') minimize(winEl.id);
      if (action === 'maximize') toggleMaximize(winEl.id);
      if (action === 'close') close(winEl.id);
    });
  }

  function minimize(winId) {
    const win = windows.get(winId);
    if (!win) return;
    win.el.style.display = 'none';
    win.minimized = true;
    win.el.classList.remove('focused');
    updateTaskbarButtons();
    Utils.emit('window:minimized', { id: winId });
  }

  function restore(winId) {
    const win = windows.get(winId);
    if (!win) return;
    win.el.style.display = 'flex';
    win.minimized = false;
    focus(winId);
  }

  function toggleMaximize(winId) {
    const win = windows.get(winId);
    if (!win) return;
    if (win.maximized) {
      // Restore
      win.el.classList.remove('maximized');
      if (win.prevBounds) {
        win.el.style.left = win.prevBounds.left;
        win.el.style.top = win.prevBounds.top;
        win.el.style.width = win.prevBounds.width;
        win.el.style.height = win.prevBounds.height;
      }
      win.maximized = false;
    } else {
      // Maximize
      win.prevBounds = {
        left: win.el.style.left,
        top: win.el.style.top,
        width: win.el.style.width,
        height: win.el.style.height,
      };
      win.el.classList.add('maximized');
      win.maximized = true;
    }
  }

  function close(winId) {
    const win = windows.get(winId);
    if (!win) return;
    win.el.remove();
    windows.delete(winId);
    const idx = orderStack.indexOf(winId);
    if (idx > -1) orderStack.splice(idx, 1);
    updateTaskbarButtons();
    Utils.emit('window:closed', { id: winId });
  }

  // ── Get window body for content injection ────────────────────────
  function getBody(winId) {
    const win = windows.get(winId);
    return win ? win.el.querySelector('.window-body') : null;
  }

  function setTitle(winId, title) {
    const win = windows.get(winId);
    if (!win) return;
    win.title = title;
    const titleEl = win.el.querySelector('.window-title');
    if (titleEl) titleEl.textContent = title;
    updateTaskbarButtons();
  }

  // ── Taskbar button sync ──────────────────────────────────────────
  function updateTaskbarButtons() {
    Utils.emit('taskbar:update', {
      apps: Array.from(windows.entries()).map(([id, w]) => ({
        id,
        title: w.title,
        icon: w.icon,
        minimized: w.minimized,
        focused: !w.minimized && orderStack[orderStack.length - 1] === id,
      })),
    });
  }

  // ── Public API ───────────────────────────────────────────────────
  function getWindows() {
    return Array.from(windows.entries()).map(([id, w]) => ({
      id,
      title: w.title,
      minimized: w.minimized,
      maximized: w.maximized,
    }));
  }

  function focusOrRestore(winId) {
    const win = windows.get(winId);
    if (!win) return;
    if (win.minimized) {
      restore(winId);
    } else if (orderStack[orderStack.length - 1] === winId && !win.minimized) {
      minimize(winId);
    } else {
      focus(winId);
    }
  }

  return { create, close, minimize, restore, toggleMaximize, focus, focusOrRestore,
           getBody, setTitle, getWindows, updateTaskbarButtons };
})();
