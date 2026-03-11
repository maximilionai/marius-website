// === Startup Chime (Web Audio API) ===
function playStartupChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [261.6, 329.6, 392.0, 523.3]; // C4, E4, G4, C5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.05);
      osc.stop(ctx.currentTime + 2.5);
    });
  } catch (e) { /* Audio not supported */ }
}

// === Startup Animation ===
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('startup-overlay');
  const bar = document.getElementById('startup-progress-bar');
  const text = document.getElementById('startup-text');

  playStartupChime();

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
        setTimeout(() => {
          overlay.remove();
          showCookieBanner();
          initScreensaverTimer();
        }, 500);
      }, 400);
    }
  }, 500);

  // Set clock
  document.getElementById('menubar-clock').textContent = '4:20 PM';

  // Init slideshow filmstrip
  initSlideshow();
});

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
  if (id === 'pong-window') stopPong();
  const win = document.getElementById(id);
  if (win) {
    if (id.startsWith('img-window-') || id.startsWith('vid-window-')) {
      win.remove();
    } else {
      win.style.display = 'none';
      win.classList.remove('zoomed');
    }
  }
}

function toggleZoom(id) {
  const win = document.getElementById(id);
  if (win) {
    if (win.classList.contains('zoomed')) {
      win.classList.remove('zoomed');
      if (win._savedPos) {
        win.style.top = win._savedPos.top;
        win.style.left = win._savedPos.left;
        win.style.width = win._savedPos.width;
        win.style.height = win._savedPos.height;
      }
    } else {
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
const selectedIcons = new Set();
let justMarqueed = false;

function clearSelection() {
  selectedIcons.forEach(ic => ic.classList.remove('selected'));
  selectedIcons.clear();
  selectedIcon = null;
}

function selectIcon(icon, addToSelection) {
  if (!addToSelection) clearSelection();
  icon.classList.add('selected');
  selectedIcons.add(icon);
  selectedIcon = icon;
}

document.addEventListener('click', (e) => {
  if (justMarqueed) { justMarqueed = false; return; }
  const icon = e.target.closest('.desktop-icon');
  if (!icon && e.target.closest('#desktop') && !e.target.closest('.window')) {
    clearSelection();
  }
});

document.querySelectorAll('.desktop-icon').forEach(icon => {
  icon.addEventListener('click', (e) => {
    e.stopPropagation();
    selectIcon(icon, e.shiftKey || e.metaKey);
  });

  icon.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    openFile(icon.dataset.file);
  });

  icon.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFile(icon.dataset.file);
    }
  });
});

// === Marquee (Rubber Band) Selection ===
(function() {
  const desktop = document.getElementById('desktop');
  const marquee = document.createElement('div');
  marquee.id = 'selection-marquee';
  desktop.appendChild(marquee);

  let isSelecting = false;
  let startX, startY;

  desktop.addEventListener('mousedown', (e) => {
    if (e.target.closest('.desktop-icon') || e.target.closest('.window') || e.button !== 0) return;

    isSelecting = true;
    const desktopRect = desktop.getBoundingClientRect();
    startX = e.clientX - desktopRect.left;
    startY = e.clientY - desktopRect.top;

    marquee.style.left = startX + 'px';
    marquee.style.top = startY + 'px';
    marquee.style.width = '0';
    marquee.style.height = '0';
    marquee.style.display = 'block';

    if (!e.shiftKey && !e.metaKey) clearSelection();

    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isSelecting) return;

    const desktopRect = desktop.getBoundingClientRect();
    const currentX = e.clientX - desktopRect.left;
    const currentY = e.clientY - desktopRect.top;

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const w = Math.abs(currentX - startX);
    const h = Math.abs(currentY - startY);

    marquee.style.left = x + 'px';
    marquee.style.top = y + 'px';
    marquee.style.width = w + 'px';
    marquee.style.height = h + 'px';

    const marqueeRect = { left: x, top: y, right: x + w, bottom: y + h };

    desktop.querySelectorAll('.desktop-icon').forEach(icon => {
      const iconRect = icon.getBoundingClientRect();
      const iconRelRect = {
        left: iconRect.left - desktopRect.left,
        top: iconRect.top - desktopRect.top,
        right: iconRect.right - desktopRect.left,
        bottom: iconRect.bottom - desktopRect.top,
      };

      const intersects =
        marqueeRect.left < iconRelRect.right &&
        marqueeRect.right > iconRelRect.left &&
        marqueeRect.top < iconRelRect.bottom &&
        marqueeRect.bottom > iconRelRect.top;

      if (intersects) {
        icon.classList.add('selected');
        selectedIcons.add(icon);
        selectedIcon = icon;
      } else if (!e.shiftKey && !e.metaKey) {
        icon.classList.remove('selected');
        selectedIcons.delete(icon);
      }
    });
  });

  document.addEventListener('mouseup', () => {
    if (!isSelecting) return;
    isSelecting = false;
    marquee.style.display = 'none';
    if (selectedIcons.size > 0) justMarqueed = true;
  });
})();

// === Dragging Desktop Icons (with trash drop) ===
const trashedItems = new Set();

document.querySelectorAll('.desktop-icon').forEach(icon => {
  let isDragging = false;
  let startX, startY, origLeft, origTop;

  icon.addEventListener('mousedown', (e) => {
    if (e.detail >= 2) return;
    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;
    const rect = icon.getBoundingClientRect();
    origLeft = rect.left;
    origTop = rect.top - 24;

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

    function onUp(e) {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (isDragging) {
        tryTrashDrop(icon, e.clientX, e.clientY);
      }
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
});

function tryTrashDrop(icon, x, y) {
  const fileId = icon.dataset.file;
  if (fileId === 'trash' || !(fileId.startsWith('photo') || fileId.startsWith('video'))) return;

  const trashEl = document.getElementById('trash-icon');
  const trashRect = trashEl.getBoundingClientRect();
  const margin = 30;

  if (x >= trashRect.left - margin && x <= trashRect.right + margin &&
      y >= trashRect.top - margin && y <= trashRect.bottom + margin) {
    icon.classList.add('trashed');
    trashedItems.add(fileId);
    updateTrashIcon();
  }
}

function updateTrashIcon() {
  const svg = document.getElementById('trash-svg');
  if (trashedItems.size > 0) {
    // Full trash — add crumpled paper
    svg.innerHTML = `
      <path d="M12 16h24v24c0 2-2 4-4 4H16c-2 0-4-2-4-4V16z" fill="#ccc" stroke="#666" stroke-width="1.5"/>
      <path d="M10 12h28v4H10z" fill="#ccc" stroke="#666" stroke-width="1.5"/>
      <path d="M18 12V8h12v4" fill="none" stroke="#666" stroke-width="1.5"/>
      <ellipse cx="24" cy="10" rx="6" ry="5" fill="#f5f5dc" stroke="#999" stroke-width="1"/>
      <path d="M20 8c2 2 4-1 6 1" fill="none" stroke="#bbb" stroke-width="0.5"/>
    `;
  } else {
    svg.innerHTML = `
      <path d="M12 16h24v24c0 2-2 4-4 4H16c-2 0-4-2-4-4V16z" fill="#ccc" stroke="#666" stroke-width="1.5"/>
      <path d="M10 12h28v4H10z" fill="#ccc" stroke="#666" stroke-width="1.5"/>
      <path d="M18 12V8h12v4" fill="none" stroke="#666" stroke-width="1.5"/>
      <line x1="18" y1="20" x2="18" y2="38" stroke="#999" stroke-width="1.5"/>
      <line x1="24" y1="20" x2="24" y2="38" stroke="#999" stroke-width="1.5"/>
      <line x1="30" y1="20" x2="30" y2="38" stroke="#999" stroke-width="1.5"/>
    `;
  }
}

function emptyTrash() {
  if (trashedItems.size === 0) return;
  showAlert(`Are you sure you want to permanently delete ${trashedItems.size} item(s)?`, () => {
    trashedItems.clear();
    updateTrashIcon();
  });
}

// === Alert Dialog ===
function showAlert(message, onOk) {
  const dialog = document.getElementById('alert-dialog');
  document.getElementById('alert-text').textContent = message;
  dialog.style.display = 'flex';

  const okBtn = document.getElementById('alert-ok');
  const cancelBtn = document.getElementById('alert-cancel');

  function cleanup() {
    dialog.style.display = 'none';
    okBtn.removeEventListener('click', handleOk);
    cancelBtn.removeEventListener('click', handleCancel);
  }

  function handleOk() { cleanup(); if (onOk) onOk(); }
  function handleCancel() { cleanup(); }

  okBtn.addEventListener('click', handleOk);
  cancelBtn.addEventListener('click', handleCancel);
}

// === File/Image Data ===
const imageFiles = {
  photo1: { title: 'Landscape.jpg', src: 'images/landscape.jpg', thumb: 'images/thumb_landscape.jpg', w: 640, h: 480 },
  photo2: { title: 'Portrait.jpg', src: 'images/portrait.jpg', thumb: 'images/thumb_portrait.jpg', w: 500, h: 600 },
  photo3: { title: 'Street.jpg', src: 'images/street.jpg', thumb: 'images/thumb_street.jpg', w: 640, h: 420 },
  photo4: { title: 'Nature.jpg', src: 'images/nature.jpg', thumb: 'images/thumb_nature.jpg', w: 640, h: 480 },
  photo5: { title: 'Architecture.jpg', src: 'images/architecture.jpg', thumb: 'images/thumb_architecture.jpg', w: 640, h: 480 },
};

const videoFiles = {};

// Load videos from videos.yaml and create desktop icons
fetch('videos.yaml')
  .then(r => r.text())
  .then(text => {
    const desktop = document.getElementById('desktop');
    const lines = text.trim().split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    const videoIconSvg = `<svg viewBox="0 0 48 48" width="48" height="48">
      <rect x="2" y="6" width="44" height="36" rx="3" fill="#222" stroke="#555" stroke-width="1.5"/>
      <rect x="6" y="10" width="36" height="28" fill="#111"/>
      <polygon points="20,17 20,31 32,24" fill="#fff" opacity="0.8"/>
      <rect x="6" y="38" width="36" height="4" rx="1" fill="#444"/>
      <circle cx="12" cy="40" r="1.5" fill="#888"/>
      <rect x="18" y="39.5" width="16" height="1" rx="0.5" fill="#666"/>
    </svg>`;

    lines.forEach((line, i) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) return;
      const name = line.substring(0, colonIdx).trim();
      const vimeoId = line.substring(colonIdx + 1).trim();
      const fileId = 'video' + (i + 1);

      videoFiles[fileId] = { title: name + '.mov', vimeoId, w: 640, h: 360 };

      const icon = document.createElement('div');
      icon.className = 'desktop-icon';
      icon.dataset.file = fileId;
      icon.style.cssText = `top: ${520 + i * 100}px; right: 20px;`;
      icon.setAttribute('tabindex', '0');
      icon.setAttribute('role', 'button');
      icon.setAttribute('aria-label', 'Play ' + name);

      icon.innerHTML = `<div class="icon-image">${videoIconSvg}</div><span class="icon-label" data-full="${name}.mov">${name}.mov</span>`;

      // Click to select
      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        selectIcon(icon, e.shiftKey || e.metaKey);
      });

      // Double-click to open
      icon.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        openFile(fileId);
      });

      // Keyboard open
      icon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openFile(fileId);
        }
      });

      // Double-tap to open (touch)
      let lastTap = 0;
      icon.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTap < 300) {
          e.preventDefault();
          openFile(fileId);
        }
        lastTap = now;
      });

      desktop.appendChild(icon);
    });
  });

const imageOrder = ['photo1', 'photo2', 'photo3', 'photo4', 'photo5'];
let windowCounter = 0;

function openFile(fileId) {
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
  if (fileId === 'impressum') {
    const win = document.getElementById('impressum-window');
    win.style.display = 'flex';
    bringToFront(win);
    return;
  }
  if (fileId === 'slideshow') {
    const win = document.getElementById('slideshow-window');
    win.style.display = 'flex';
    bringToFront(win);
    goToSlide(0);
    return;
  }
  if (fileId === 'pong') {
    const win = document.getElementById('pong-window');
    win.style.display = 'flex';
    bringToFront(win);
    startPong();
    return;
  }
  if (fileId === 'trash') {
    if (trashedItems.size > 0) {
      emptyTrash();
    }
    return;
  }

  // Video files
  const video = videoFiles[fileId];
  if (video) {
    openVideoWindow(video);
    return;
  }

  const img = imageFiles[fileId];
  if (!img) return;

  windowCounter++;
  const winId = 'img-window-' + windowCounter;

  const win = document.createElement('div');
  win.className = 'window';
  win.id = winId;

  const maxW = Math.min(img.w + 4, window.innerWidth - 100);
  const maxH = Math.min(img.h + 26, window.innerHeight - 80);
  const scale = Math.min(maxW / (img.w + 4), maxH / (img.h + 26), 1);
  const finalW = Math.round((img.w + 4) * scale);
  const finalH = Math.round((img.h + 26) * scale);

  const offset = (windowCounter % 5) * 20;
  win.style.cssText = `
    width: ${finalW}px;
    height: ${finalH}px;
    top: ${60 + offset}px;
    left: ${80 + offset}px;
    display: flex;
  `;

  const titlebar = document.createElement('div');
  titlebar.className = 'window-titlebar';

  const closeBtn = document.createElement('div');
  closeBtn.className = 'window-close';
  closeBtn.setAttribute('tabindex', '0');
  closeBtn.setAttribute('role', 'button');
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', () => closeWindow(winId));
  closeBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeWindow(winId); } });

  const titleSpan = document.createElement('span');
  titleSpan.className = 'window-title';
  titleSpan.textContent = img.title;

  const zoomBtn = document.createElement('div');
  zoomBtn.className = 'window-zoom';
  zoomBtn.setAttribute('tabindex', '0');
  zoomBtn.setAttribute('role', 'button');
  zoomBtn.setAttribute('aria-label', 'Zoom');
  zoomBtn.addEventListener('click', () => toggleZoom(winId));
  zoomBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleZoom(winId); } });

  titlebar.append(closeBtn, titleSpan, zoomBtn);

  const content = document.createElement('div');
  content.className = 'window-content image-content';
  const imgEl = document.createElement('img');
  imgEl.src = img.src;
  imgEl.alt = img.title;
  content.appendChild(imgEl);

  win.append(titlebar, content);

  document.getElementById('desktop').appendChild(win);
  bringToFront(win);
}

function openVideoWindow(video) {
  windowCounter++;
  const winId = 'vid-window-' + windowCounter;

  const win = document.createElement('div');
  win.className = 'window';
  win.id = winId;

  const maxW = Math.min(video.w + 4, window.innerWidth - 100);
  const maxH = Math.min(video.h + 26, window.innerHeight - 80);
  const scale = Math.min(maxW / (video.w + 4), maxH / (video.h + 26), 1);
  const finalW = Math.round((video.w + 4) * scale);
  const finalH = Math.round((video.h + 26) * scale);

  const offset = (windowCounter % 5) * 20;
  win.style.cssText = `
    width: ${finalW}px;
    height: ${finalH}px;
    top: ${60 + offset}px;
    left: ${80 + offset}px;
    display: flex;
  `;

  const titlebar = document.createElement('div');
  titlebar.className = 'window-titlebar';

  const closeBtn = document.createElement('div');
  closeBtn.className = 'window-close';
  closeBtn.setAttribute('tabindex', '0');
  closeBtn.setAttribute('role', 'button');
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', () => closeWindow(winId));
  closeBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeWindow(winId); } });

  const titleSpan = document.createElement('span');
  titleSpan.className = 'window-title';
  titleSpan.textContent = video.title;

  const zoomBtn = document.createElement('div');
  zoomBtn.className = 'window-zoom';
  zoomBtn.setAttribute('tabindex', '0');
  zoomBtn.setAttribute('role', 'button');
  zoomBtn.setAttribute('aria-label', 'Zoom');
  zoomBtn.addEventListener('click', () => toggleZoom(winId));
  zoomBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleZoom(winId); } });

  titlebar.append(closeBtn, titleSpan, zoomBtn);

  const content = document.createElement('div');
  content.className = 'window-content video-content';

  const iframe = document.createElement('iframe');
  iframe.src = `https://player.vimeo.com/video/${video.vimeoId}?autoplay=1&title=0&byline=0&portrait=0`;
  iframe.setAttribute('allow', 'autoplay; fullscreen');
  iframe.setAttribute('allowfullscreen', '');
  iframe.title = video.title;
  content.appendChild(iframe);

  win.append(titlebar, content);

  document.getElementById('desktop').appendChild(win);
  bringToFront(win);
}

// === Wire up static window close/zoom buttons via data attributes ===
document.querySelectorAll('[data-close]').forEach(btn => {
  const id = btn.dataset.close;
  btn.addEventListener('click', () => closeWindow(id));
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeWindow(id); }
  });
});

document.querySelectorAll('[data-zoom]').forEach(btn => {
  const id = btn.dataset.zoom;
  btn.addEventListener('click', () => toggleZoom(id));
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleZoom(id); }
  });
});

// === Menu Bar Actions ===
document.getElementById('menu-about-mac')?.addEventListener('click', () => {
  const win = document.getElementById('about-mac-window');
  win.style.display = 'flex';
  bringToFront(win);
});

document.getElementById('menu-help-about')?.addEventListener('click', () => {
  const win = document.getElementById('about-mac-window');
  win.style.display = 'flex';
  bringToFront(win);
});

document.getElementById('menu-open')?.addEventListener('click', () => {
  if (selectedIcon) {
    openFile(selectedIcon.dataset.file);
  }
});

document.getElementById('menu-close-window')?.addEventListener('click', () => {
  if (activeWindow) {
    const id = activeWindow.id;
    closeWindow(id);
  }
});

document.getElementById('menu-show-desktop')?.addEventListener('click', () => {
  document.querySelectorAll('.window').forEach(win => {
    if (win.style.display !== 'none') {
      win._wasVisible = true;
      win.style.display = 'none';
    }
  });
});

document.getElementById('menu-show-all')?.addEventListener('click', () => {
  document.querySelectorAll('.window').forEach(win => {
    if (win._wasVisible) {
      win.style.display = 'flex';
      win._wasVisible = false;
    }
  });
});

document.getElementById('menu-empty-trash')?.addEventListener('click', () => {
  emptyTrash();
});

document.getElementById('menu-slideshow')?.addEventListener('click', () => {
  openFile('slideshow');
});

// === Slideshow ===
let currentSlide = 0;

function initSlideshow() {
  const strip = document.getElementById('slideshow-filmstrip');
  imageOrder.forEach((id, idx) => {
    const img = document.createElement('img');
    img.className = 'filmstrip-thumb';
    img.src = imageFiles[id].thumb;
    img.alt = imageFiles[id].title;
    img.addEventListener('click', () => goToSlide(idx));
    strip.appendChild(img);
  });

  document.getElementById('slide-prev').addEventListener('click', () => {
    goToSlide((currentSlide - 1 + imageOrder.length) % imageOrder.length);
  });
  document.getElementById('slide-next').addEventListener('click', () => {
    goToSlide((currentSlide + 1) % imageOrder.length);
  });
}

function goToSlide(idx) {
  currentSlide = idx;
  const id = imageOrder[idx];
  const img = imageFiles[id];
  document.getElementById('slideshow-img').src = img.src;
  document.getElementById('slideshow-img').alt = img.title;
  document.getElementById('slide-counter').textContent = `${idx + 1} / ${imageOrder.length}`;

  document.querySelectorAll('.filmstrip-thumb').forEach((thumb, i) => {
    thumb.classList.toggle('active', i === idx);
  });
}

// === Cookie Banner ===
function showCookieBanner() {
  if (localStorage.getItem('cookieChoice')) return;
  const banner = document.getElementById('cookie-banner');
  banner.style.display = 'flex';

  document.getElementById('cookie-accept').addEventListener('click', () => {
    localStorage.setItem('cookieChoice', 'accepted');
    banner.style.display = 'none';
  });

  document.getElementById('cookie-decline').addEventListener('click', () => {
    localStorage.setItem('cookieChoice', 'declined');
    banner.style.display = 'none';
  });
}

// === Screensaver (Starfield) ===
let screensaverActive = false;
let screensaverRAF = null;
let idleTimer = null;
const IDLE_TIMEOUT = 45000; // 45 seconds

function initScreensaverTimer() {
  resetIdleTimer();
  ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => {
      if (screensaverActive) {
        stopScreensaver();
      }
      resetIdleTimer();
    });
  });
}

function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(startScreensaver, IDLE_TIMEOUT);
}

function startScreensaver() {
  if (screensaverActive) return;
  screensaverActive = true;

  const canvas = document.getElementById('screensaver');
  canvas.style.display = 'block';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');

  // Create stars
  const stars = [];
  for (let i = 0; i < 300; i++) {
    stars.push({
      x: (Math.random() - 0.5) * canvas.width * 2,
      y: (Math.random() - 0.5) * canvas.height * 2,
      z: Math.random() * canvas.width,
    });
  }

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  function animate() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach(star => {
      star.z -= 4;
      if (star.z <= 0) {
        star.x = (Math.random() - 0.5) * canvas.width * 2;
        star.y = (Math.random() - 0.5) * canvas.height * 2;
        star.z = canvas.width;
      }

      const sx = (star.x / star.z) * 300 + cx;
      const sy = (star.y / star.z) * 300 + cy;
      const size = Math.max(0, (1 - star.z / canvas.width) * 3);
      const brightness = Math.max(0, 255 - (star.z / canvas.width) * 255);

      ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    });

    if (screensaverActive) {
      screensaverRAF = requestAnimationFrame(animate);
    }
  }

  // Clear canvas fully first
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  animate();
}

function stopScreensaver() {
  screensaverActive = false;
  if (screensaverRAF) cancelAnimationFrame(screensaverRAF);
  const canvas = document.getElementById('screensaver');
  canvas.style.display = 'none';
}

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

// === Pong Game ===
let pongRAF = null;
let pongRunning = false;
let pongAbort = null;

function startPong() {
  stopPong();
  pongRunning = true;
  pongAbort = new AbortController();
  const signal = pongAbort.signal;

  const canvas = document.getElementById('pong-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const paddleW = 8, paddleH = 50;
  const ballSize = 8;
  const winScore = 5;

  let player = { y: H / 2 - paddleH / 2 };
  let cpu = { y: H / 2 - paddleH / 2 };
  let ball = { x: W / 2, y: H / 2, vx: 7, vy: 4 };
  let score = { player: 0, cpu: 0 };
  let gameOver = false;
  let winner = '';
  let cpuSpeed = 4;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleY = H / rect.height;
    player.y = (e.clientY - rect.top) * scaleY - paddleH / 2;
    player.y = Math.max(0, Math.min(H - paddleH, player.y));
  }, { signal });

  canvas.addEventListener('click', () => {
    if (gameOver) {
      gameOver = false;
      winner = '';
      score.player = 0;
      score.cpu = 0;
      player.y = H / 2 - paddleH / 2;
      cpu.y = H / 2 - paddleH / 2;
      ball.x = W / 2; ball.y = H / 2;
      ball.vx = 7; ball.vy = (Math.random() - 0.5) * 6;
    }
  }, { signal });

  function resetBall(dir) {
    ball.x = W / 2;
    ball.y = H / 2;
    ball.vx = 7 * dir;
    ball.vy = (Math.random() - 0.5) * 4;
  }

  function update() {
    if (gameOver) return;

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.y <= 0) { ball.y = 0; ball.vy = Math.abs(ball.vy); }
    if (ball.y >= H - ballSize) { ball.y = H - ballSize; ball.vy = -Math.abs(ball.vy); }

    if (ball.x <= 20 + paddleW && ball.x >= 20 &&
        ball.y + ballSize >= player.y && ball.y <= player.y + paddleH) {
      ball.x = 20 + paddleW;
      ball.vx = Math.abs(ball.vx) * 1.05;
      ball.vy = ((ball.y + ballSize / 2 - player.y) / paddleH - 0.5) * 6;
    }

    if (ball.x + ballSize >= W - 20 - paddleW && ball.x + ballSize <= W - 20 &&
        ball.y + ballSize >= cpu.y && ball.y <= cpu.y + paddleH) {
      ball.x = W - 20 - paddleW - ballSize;
      ball.vx = -Math.abs(ball.vx) * 1.05;
      ball.vy = ((ball.y + ballSize / 2 - cpu.y) / paddleH - 0.5) * 6;
    }

    const maxSpeed = 20;
    ball.vx = Math.max(-maxSpeed, Math.min(maxSpeed, ball.vx));
    ball.vy = Math.max(-maxSpeed, Math.min(maxSpeed, ball.vy));

    if (ball.x < 0) {
      score.cpu++;
      if (score.cpu >= winScore) { gameOver = true; winner = 'Jobs Wins, You Lose!'; }
      else resetBall(1);
    }
    if (ball.x > W) {
      score.player++;
      if (score.player >= winScore) { gameOver = true; winner = 'You Win!'; }
      else resetBall(-1);
    }

    // Jobs AI: predict where ball will arrive
    let target = ball.y + ballSize / 2;
    if (ball.vx > 0) {
      const frames = (W - 20 - paddleW - ball.x) / ball.vx;
      let py = ball.y + ball.vy * frames;
      // Bounce prediction
      while (py < 0 || py > H) {
        if (py < 0) py = -py;
        if (py > H) py = 2 * H - py;
      }
      target = py;
    }
    const cpuCenter = cpu.y + paddleH / 2;
    if (cpuCenter < target - 5) cpu.y += cpuSpeed;
    else if (cpuCenter > target + 5) cpu.y -= cpuSpeed;
    cpu.y = Math.max(0, Math.min(H - paddleH, cpu.y));
  }

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#fff';
    ctx.fillRect(20, player.y, paddleW, paddleH);
    ctx.fillRect(W - 20 - paddleW, cpu.y, paddleW, paddleH);
    ctx.fillRect(ball.x, ball.y, ballSize, ballSize);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#555';
    ctx.font = '10px Futura, Helvetica Neue, sans-serif';
    ctx.fillText('You', W / 2 - 40, 20);
    ctx.fillText('Jobs', W / 2 + 40, 20);
    ctx.font = '24px Futura, Helvetica Neue, sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(score.player, W / 2 - 40, 42);
    ctx.fillText(score.cpu, W / 2 + 40, 42);

    if (gameOver) {
      ctx.fillStyle = '#fff';
      ctx.font = '28px Futura, Helvetica Neue, sans-serif';
      ctx.fillText(winner, W / 2, H / 2 - 10);
      ctx.font = '14px Futura, Helvetica Neue, sans-serif';
      ctx.fillStyle = '#999';
      ctx.fillText('Click to play again', W / 2, H / 2 + 20);
    }
  }

  function loop() {
    update();
    draw();
    if (pongRunning) pongRAF = requestAnimationFrame(loop);
  }

  loop();
}

function stopPong() {
  pongRunning = false;
  if (pongRAF) cancelAnimationFrame(pongRAF);
  if (pongAbort) { pongAbort.abort(); pongAbort = null; }
}

// === Touch Support ===

// Touch: drag windows
document.addEventListener('touchstart', (e) => {
  const titlebar = e.target.closest('.window-titlebar');
  if (!titlebar || e.target.closest('.window-close') || e.target.closest('.window-zoom')) return;

  const win = titlebar.closest('.window');
  if (win.classList.contains('zoomed')) return;

  bringToFront(win);

  const touch = e.touches[0];
  const rect = win.getBoundingClientRect();
  const offsetX = touch.clientX - rect.left;
  const offsetY = touch.clientY - rect.top;

  function onTouchMove(e) {
    e.preventDefault();
    const t = e.touches[0];
    win.style.left = (t.clientX - offsetX) + 'px';
    win.style.top = (t.clientY - offsetY) + 'px';
    win.style.right = 'auto';
    win.style.bottom = 'auto';
  }

  function onTouchEnd() {
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  }

  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);
}, { passive: true });

// Touch: drag desktop icons
document.querySelectorAll('.desktop-icon').forEach(icon => {
  icon.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    const rect = icon.getBoundingClientRect();
    const origLeft = rect.left;
    const origTop = rect.top - 24;
    let moved = false;

    function onTouchMove(e) {
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        moved = true;
        e.preventDefault();
        icon.style.left = (origLeft + dx) + 'px';
        icon.style.top = (origTop + dy) + 'px';
        icon.style.right = 'auto';
        icon.style.bottom = 'auto';
      }
    }

    function onTouchEnd(e) {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      if (moved) {
        const t = e.changedTouches[0];
        tryTrashDrop(icon, t.clientX, t.clientY);
      }
    }

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }, { passive: true });

  // Double-tap to open
  let lastTap = 0;
  icon.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      e.preventDefault();
      openFile(icon.dataset.file);
    }
    lastTap = now;
  });
});
