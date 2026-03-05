// === Startup Animation ===
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('startup-overlay');
  const bar = document.getElementById('startup-progress-bar');
  const text = document.getElementById('startup-text');

  const steps = [
    { progress: 20, text: 'Loading System...' },
    { progress: 45, text: 'Initializing Finder...' },
    { progress: 70, text: 'Mounting Desktop...' },
    { progress: 90, text: 'Loading portfolio...' },
    { progress: 100, text: 'Welcome to Marius OS' },
  ];

  let i = 0;
  const interval = setInterval(() => {
    if (i < steps.length) {
      bar.style.width = steps[i].progress + '%';
      text.textContent = steps[i].text;
      i++;
    } else {
      clearInterval(interval);
      setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.5s';
        setTimeout(() => overlay.remove(), 500);
      }, 400);
    }
  }, 500);

  // Start clock
  updateClock();
  setInterval(updateClock, 30000);
});

// === Clock ===
function updateClock() {
  const el = document.getElementById('menubar-clock');
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  el.textContent = `${h12}:${m} ${ampm}`;
}

// === Window Management ===
let topZ = 100;
let activeWindow = null;

function bringToFront(win) {
  if (activeWindow && activeWindow !== win) {
    activeWindow.classList.add('inactive');
  }
  topZ++;
  win.style.zIndex = topZ;
  win.classList.remove('inactive');
  activeWindow = win;
}

function closeWindow(id) {
  const win = document.getElementById(id);
  if (win) {
    win.style.display = 'none';
    win.classList.remove('zoomed');
  }
}

function toggleZoom(id) {
  const win = document.getElementById(id);
  if (win) {
    if (win.classList.contains('zoomed')) {
      win.classList.remove('zoomed');
      // Restore saved position
      if (win._savedPos) {
        win.style.top = win._savedPos.top;
        win.style.left = win._savedPos.left;
        win.style.width = win._savedPos.width;
        win.style.height = win._savedPos.height;
      }
    } else {
      // Save current position
      win._savedPos = {
        top: win.style.top,
        left: win.style.left,
        width: win.style.width,
        height: win.style.height,
      };
      win.classList.add('zoomed');
    }
  }
}

// === Dragging Windows ===
document.addEventListener('mousedown', (e) => {
  const titlebar = e.target.closest('.window-titlebar');
  if (!titlebar || e.target.closest('.window-close') || e.target.closest('.window-zoom')) return;

  const win = titlebar.closest('.window');
  if (win.classList.contains('zoomed')) return;

  bringToFront(win);

  const startX = e.clientX;
  const startY = e.clientY;
  const rect = win.getBoundingClientRect();
  const offsetX = startX - rect.left;
  const offsetY = startY - rect.top;

  titlebar.style.cursor = 'grabbing';

  function onMove(e) {
    win.style.left = (e.clientX - offsetX) + 'px';
    win.style.top = (e.clientY - offsetY) + 'px';
    win.style.right = 'auto';
    win.style.bottom = 'auto';
  }

  function onUp() {
    titlebar.style.cursor = 'grab';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  e.preventDefault();
});

// Click on window to bring to front
document.addEventListener('mousedown', (e) => {
  const win = e.target.closest('.window');
  if (win) bringToFront(win);
});

// === Desktop Icon Selection & Opening ===
let selectedIcon = null;

document.addEventListener('click', (e) => {
  const icon = e.target.closest('.desktop-icon');

  // Deselect if clicking empty desktop
  if (!icon && e.target.closest('#desktop') && !e.target.closest('.window')) {
    if (selectedIcon) selectedIcon.classList.remove('selected');
    selectedIcon = null;
  }
});

document.querySelectorAll('.desktop-icon').forEach(icon => {
  icon.addEventListener('click', (e) => {
    e.stopPropagation();
    if (selectedIcon) selectedIcon.classList.remove('selected');
    icon.classList.add('selected');
    selectedIcon = icon;
  });

  icon.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    openFile(icon.dataset.file);
  });
});

// === Dragging Desktop Icons ===
document.querySelectorAll('.desktop-icon').forEach(icon => {
  let isDragging = false;
  let startX, startY, origLeft, origTop;

  icon.addEventListener('mousedown', (e) => {
    if (e.detail >= 2) return; // Ignore double-click
    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;
    const rect = icon.getBoundingClientRect();
    origLeft = rect.left;
    origTop = rect.top - 24; // account for menubar

    function onMove(e) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        isDragging = true;
        icon.style.left = (origLeft + dx) + 'px';
        icon.style.top = (origTop + dy) + 'px';
        icon.style.right = 'auto';
        icon.style.bottom = 'auto';
      }
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
});

// === File/Image Data ===
const imageFiles = {
  photo1: { title: 'Landscape.jpg', src: 'images/landscape.jpg', w: 640, h: 480 },
  photo2: { title: 'Portrait.jpg', src: 'images/portrait.jpg', w: 500, h: 600 },
  photo3: { title: 'Street.jpg', src: 'images/street.jpg', w: 640, h: 420 },
  photo4: { title: 'Nature.jpg', src: 'images/nature.jpg', w: 640, h: 480 },
  photo5: { title: 'Architecture.jpg', src: 'images/architecture.jpg', w: 640, h: 480 },
};

let windowCounter = 0;

function openFile(fileId) {
  // Special windows
  if (fileId === 'about') {
    const win = document.getElementById('about-window');
    win.style.display = 'flex';
    bringToFront(win);
    return;
  }
  if (fileId === 'contact') {
    const win = document.getElementById('contact-window');
    win.style.display = 'flex';
    bringToFront(win);
    return;
  }
  if (fileId === 'trash') {
    // Easter egg: empty trash
    return;
  }

  // Image files
  const img = imageFiles[fileId];
  if (!img) return;

  windowCounter++;
  const winId = 'img-window-' + windowCounter;

  const win = document.createElement('div');
  win.className = 'window';
  win.id = winId;

  // Calculate size to fit viewport
  const maxW = Math.min(img.w + 4, window.innerWidth - 100);
  const maxH = Math.min(img.h + 26, window.innerHeight - 80);
  const scale = Math.min(maxW / (img.w + 4), maxH / (img.h + 26), 1);
  const finalW = Math.round((img.w + 4) * scale);
  const finalH = Math.round((img.h + 26) * scale);

  // Offset each new window slightly
  const offset = (windowCounter % 5) * 20;
  win.style.cssText = `
    width: ${finalW}px;
    height: ${finalH}px;
    top: ${60 + offset}px;
    left: ${80 + offset}px;
    display: flex;
  `;

  win.innerHTML = `
    <div class="window-titlebar">
      <div class="window-close" onclick="closeWindow('${winId}')"></div>
      <span class="window-title">${img.title}</span>
      <div class="window-zoom" onclick="toggleZoom('${winId}')"></div>
    </div>
    <div class="window-content image-content">
      <img src="${img.src}" alt="${img.title}">
    </div>
  `;

  document.getElementById('desktop').appendChild(win);
  bringToFront(win);
}

// === About This Mac (from Apple menu) ===
document.querySelector('#apple-dropdown .dropdown-item')?.addEventListener('click', () => {
  const win = document.getElementById('about-mac-window');
  win.style.display = 'flex';
  bringToFront(win);
});

// === Eyeball Tracking ===
document.addEventListener('mousemove', (e) => {
  const pupils = [document.getElementById('pupil-left'), document.getElementById('pupil-right')];
  pupils.forEach(pupil => {
    if (!pupil) return;
    const eye = pupil.parentElement;
    const rect = eye.getBoundingClientRect();
    const eyeCenterX = rect.left + rect.width / 2;
    const eyeCenterY = rect.top + rect.height / 2;
    const dx = e.clientX - eyeCenterX;
    const dy = e.clientY - eyeCenterY;
    const angle = Math.atan2(dy, dx);
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 100);
    const maxMove = 3.5;
    const move = (dist / 100) * maxMove;
    const px = Math.cos(angle) * move;
    const py = Math.sin(angle) * move;
    pupil.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
  });
});

// === Close menu on click outside ===
document.addEventListener('click', (e) => {
  if (!e.target.closest('#menubar')) {
    // Menus close naturally via CSS :hover
  }
});
