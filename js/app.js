// ---------- Tabs & Dark Mode ----------
document.querySelectorAll('.tab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    if (html5QrCode) { stopCameraScanner(); }
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('section').forEach(function(s) { s.classList.remove('active'); });
    btn.classList.add('active');
    var target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.add('active');
  });
});

var darkToggle = document.getElementById('darkModeToggle');
if (darkToggle) {
  darkToggle.addEventListener('click', function() {
    document.body.classList.toggle('dark');
    var isDark = document.body.classList.contains('dark');
    localStorage.setItem('mosqueDark', isDark);
    darkToggle.querySelector('i').className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    darkToggle.querySelector('span').textContent = isDark ? t('lightMode') : t('darkMode');
  });

  if (localStorage.getItem('mosqueDark') === 'true') {
    document.body.classList.add('dark');
    darkToggle.querySelector('i').className = 'fas fa-sun';
    darkToggle.querySelector('span').textContent = t('lightMode');
  }
}

// ---------- PWA Install ----------
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredPrompt = e;
  var btn = document.getElementById('install-btn');
  if (btn) btn.style.display = 'inline-flex';
});

function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(function() {
    deferredPrompt = null;
    var btn = document.getElementById('install-btn');
    if (btn) btn.style.display = 'none';
  });
}

window.addEventListener('appinstalled', function() {
  deferredPrompt = null;
  var btn = document.getElementById('install-btn');
  if (btn) btn.style.display = 'none';
});

// ---------- Modal overlay click ----------
window.onclick = function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    if (e.target.id === 'qr-modal') closeQRModal();
    else closeModal();
  }
};

// ---------- Service Worker Registration ----------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(function() {
    // console.log('SW: مسجل');
  }).catch(function(err) {
    console.warn('SW: فشل التسجيل', err);
  });
}

// ---------- Init ----------
window.addEventListener('DOMContentLoaded', function() {
  applyLanguage();
  initDB().then(function() {
    return loadMosqueConfig();
  }).then(function() {
    return initFileSystem();
  }).then(function() {
    var savedMosqueId = localStorage.getItem('currentMosqueId');
    if (savedMosqueId) {
      var mosque = mosqueConfig.mosques.find(function(m) { return m.id === savedMosqueId; });
      if (mosque) currentMosque = mosque;
    } else if (mosqueConfig.mosques.length > 0) {
      currentMosque = mosqueConfig.mosques[0];
      localStorage.setItem('currentMosqueId', currentMosque.id);
    }
    renderMosqueSelector();
    
    if (currentMosque) {
      return loadMosqueData(currentMosque).then(function(data) {
        return hydrateAllFromFile(data || { tasks: [], issues: [], finances: [], equipment: [] });
      });
    }
  }).then(function() {
    if (!currentMosque && mosqueConfig.mosques.length === 0) {
      console.log('No mosques found, will prompt user to setup');
      openMosqueModal();
    }
    return App.refresh();
  }).then(function() {
    renderFileSystemStatus();
  }).catch(function(err) {
    console.error('Init error:', err);
    document.body.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--danger)"><i class="fas fa-exclamation-triangle"></i><p>' + t('initError') + '</p></div>';
  });
});
