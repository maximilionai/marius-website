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

document.addEventListener('click', (e) => {
  const icon = e.target.closest('.desktop-icon');
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

  icon.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFile(icon.dataset.file);
    }
  });
});

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

const videoFiles = {
  video1: { title: 'Showreel.mov', vimeoId: '305214127', w: 640, h: 360 },
  video2: { title: 'BTS.mov', vimeoId: '217499569', w: 640, h: 360 },
};

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
