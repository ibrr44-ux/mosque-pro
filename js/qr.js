// ---------- QR Code Generation ----------
function generateQRCode(containerId, text, size) {
  size = size || 120;
  var container = document.getElementById(containerId);
  container.innerHTML = '';
  try {
    new QRCode(container, { text: text, width: size, height: size, colorDark: '#0f766e', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
  } catch(e) {
    container.innerHTML = '<div style="width:'+size+'px;height:'+size+'px;background:var(--glass-bg);display:flex;align-items:center;justify-content:center;border-radius:12px;font-size:0.7rem;color:var(--text-muted);">' + escapeHtml(text) + '</div>';
  }
}

function openQRPrint(equipId) {
  dbGetAll('equipment').then(function(list) {
    var eq = list.find(function(x) { return x.id === equipId; });
    if (!eq || !eq.uniqueId) { alert(t('alertDeviceNotFound')); return; }
    var html = '<div class="flex-between"><h3><i class="fas fa-qrcode"></i> ' + t('qrBarcode') + '</h3><button onclick="closeQRModal()" style="background:none;border:none;font-size:24px;cursor:pointer;">&times;</button></div>';
    html += '<div id="qr-print-area">';
    html += '<div id="qr-print-target" style="display:flex;flex-direction:column;align-items:center;padding:1rem;background:white;border-radius:12px;max-width:280px;margin:0 auto;"></div>';
    html += '<div style="margin-top:1rem;display:flex;gap:8px;justify-content:center;">';
    html += '<button class="btn btn-primary" onclick="printQR()"><i class="fas fa-print"></i> ' + t('qrPrint') + '</button>';
    html += '<button class="btn btn-success" onclick="downloadQR(\'' + escapeHtml(eq.name).replace(/'/g, "\\'") + '\')"><i class="fas fa-download"></i> ' + t('qrDownload') + '</button>';
    html += '</div></div>';
    document.getElementById('qr-modal-content').innerHTML = html;
    document.getElementById('qr-modal').style.display = 'flex';
    setTimeout(function() {
      generateQRCode('qr-print-target', eq.uniqueId, 200);
      var label = document.createElement('div');
      label.style.cssText = 'text-align:center;margin-top:8px;direction:rtl;';
      label.innerHTML = '<div style="font-weight:700;font-size:1rem;color:#1e293b;">' + escapeHtml(eq.name) + '</div><div style="font-size:0.8rem;color:#5b6e8c;font-family:monospace;direction:ltr;">' + escapeHtml(eq.uniqueId) + '</div>';
      document.getElementById('qr-print-target').appendChild(label);
    }, 100);
  });
}

function closeQRModal() { document.getElementById('qr-modal').style.display = 'none'; }

function printQR() {
  var printContents = document.getElementById('qr-print-area').innerHTML;
  var win = window.open('', '_blank');
  var printDir = currentLang === 'ar' ? 'rtl' : 'ltr';
  win.document.write('<html dir="' + printDir + '"><head><title>' + t('qrBarcode') + '</title>');
  win.document.write('<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;}');
  win.document.write('#qr-print-target{display:flex;flex-direction:column;align-items:center;padding:1rem;}');
  win.document.write('canvas,img{max-width:200px;max-height:200px;}</style></head><body>');
  win.document.write('<div id="qr-print-target">' + document.getElementById('qr-print-target').innerHTML + '</div>');
  win.document.write('</body></html>');
  win.document.close();
  setTimeout(function() { win.print(); }, 300);
}

function downloadQR(name) {
  var canvas = document.querySelector('#qr-print-target canvas');
  if (canvas) {
    var a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = name + '_QR.png';
    a.click();
  } else {
    var img = document.querySelector('#qr-print-target img');
    if (img && img.src) {
      var a = document.createElement('a');
      a.href = img.src;
      a.download = name + '_QR.png';
      a.click();
    }
  }
}

// ---------- Scanner ----------
function onScanSuccess(decodedText, decodedResult) {
  stopCameraScanner();
  showEquipmentDetailById(decodedText);
}

function onScanFailure(error) {
  // console.warn('QR error:', error);
}

function startCameraScanner() {
  var statusEl = document.getElementById('scanner-status');
  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode('qr-reader');
  }
  statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + t('cameraStarting');
  html5QrCode.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScanSuccess, onScanFailure)
    .then(function() {
      document.getElementById('scanner-options').style.display = 'none';
      document.getElementById('camera-container').style.display = 'block';
      statusEl.innerHTML = '<span style="color:var(--success)"><i class="fas fa-camera"></i> ' + t('cameraOn') + '</span>';
    })
    .catch(function(err) {
      console.error(err);
      statusEl.innerHTML = '<span style="color:var(--danger)"><i class="fas fa-exclamation-circle"></i> ' + t('cameraFail') + ': ' + err + '</span>';
    });
}

function stopCameraScanner() {
  if (html5QrCode && html5QrCode.isScanning) {
    html5QrCode.stop().then(function() {
      document.getElementById('scanner-options').style.display = 'flex';
      document.getElementById('camera-container').style.display = 'none';
      document.getElementById('scanner-status').innerHTML = '';
      html5QrCode.clear();
    }).catch(function(err) { console.error('Failed to stop scanner', err); });
  }
}

function scanImageFile(e) {
  if (e.target.files.length == 0) { return; }
  var file = e.target.files[0];
  var statusEl = document.getElementById('scanner-status');
  statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + t('scanImage');
  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode('qr-reader');
  }
  html5QrCode.scanFile(file, true)
    .then(function(decodedText) {
      statusEl.innerHTML = '<span style="color:var(--success)"><i class="fas fa-check-circle"></i> ' + t('scanSuccess') + '</span>';
      showEquipmentDetailById(decodedText);
    })
    .catch(function(err) {
      statusEl.innerHTML = '<span style="color:var(--danger)"><i class="fas fa-times-circle"></i> ' + t('scanNoBarcode') + '</span>';
      console.error('File scan error:', err);
    });
  e.target.value = '';
}
