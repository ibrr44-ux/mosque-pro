// ---------- Multi-Tenant / Mosque Management ----------
function saveAllData() {
  if (!currentMosque) return Promise.resolve();
  return getAllData().then(function(data) {
    return saveMosqueData(data);
  });
}

function saveMosqueConfig() {
  return dbMetaSet('mosqueConfig', mosqueConfig).then(function() {
    if (fsDirHandle && fsReady) {
      return ensureFilePermission().then(function(granted) {
        if (!granted) return;
        mosqueConfig._meta = { version: 1, updatedAt: new Date().toISOString() };
        return writeJSONFile(fsDirHandle, 'config.json', mosqueConfig).catch(function(err) {
          console.warn('Config save failed:', err);
        });
      });
    }
  });
}

function loadMosqueConfig() {
  return dbMetaGet('mosqueConfig').then(function(localConfig) {
    if (localConfig && Array.isArray(localConfig.mosques)) {
      mosqueConfig = localConfig;
    } else {
      mosqueConfig = { mosques: [] };
    }
    
    if (fsDirHandle && fsReady) {
      return getMosqueConfigFile().then(function(fileConfig) {
        if (fileConfig && Array.isArray(fileConfig.mosques)) {
          if (fileConfig.mosques.length >= mosqueConfig.mosques.length) {
            mosqueConfig = fileConfig;
            dbMetaSet('mosqueConfig', mosqueConfig);
          }
        }
        return mosqueConfig;
      });
    }
    return mosqueConfig;
  });
}

function getMosqueConfigFile() {
  if (!fsDirHandle) return Promise.resolve(null);
  return ensureFilePermission().then(function(granted) {
    if (!granted) return null;
    return readJSONFile(fsDirHandle, 'config.json');
  });
}

function addMosque(mosqueName) {
  var id = 'M' + Date.now();
  var newMosque = { id: id, name: mosqueName, createdAt: new Date().toISOString(), dataFile: 'mosque_' + id + '.json' };
  mosqueConfig.mosques.push(newMosque);
  return saveMosqueConfig().then(function() {
    return newMosque;
  });
}

function selectMosque(mosqueId) {
  var mosque = mosqueConfig.mosques.find(function(m) { return m.id === mosqueId; });
  if (!mosque) { alert(t('alertMosqueNotFound')); return; }
  
  var switchPromise = currentMosque ? saveAllData() : Promise.resolve();

  return switchPromise.then(function() {
    currentMosque = mosque;
    localStorage.setItem('currentMosqueId', mosqueId);
    if (typeof renderMosqueSelector !== 'undefined') renderMosqueSelector();
    return loadMosqueData(mosque);
  }).then(function(data) {
    return hydrateAllFromFile(data || { tasks: [], issues: [], finances: [], equipment: [] });
  });
}

function getMosqueDataFile() {
  if (!currentMosque || !fsDirHandle) return null;
  return currentMosque.dataFile;
}

function loadMosqueData(mosque) {
  if (!mosque) return Promise.resolve(null);
  return dbMetaGet('mosqueData_' + mosque.id).then(function(localData) {
    if (fsDirHandle && fsReady) {
      return ensureFilePermission().then(function(granted) {
        if (!granted) return localData;
        return readJSONFile(fsDirHandle, mosque.dataFile).then(function(fileData) {
          if (fileData) {
            dbMetaSet('mosqueData_' + mosque.id, fileData);
            return fileData;
          }
          return localData;
        });
      });
    }
    return localData;
  });
}

function saveMosqueData(data) {
  if (!currentMosque) return Promise.resolve();
  return dbMetaSet('mosqueData_' + currentMosque.id, data).then(function() {
    if (fsDirHandle && fsReady) {
      return ensureFilePermission().then(function(granted) {
        if (granted) {
          data._meta = { version: 3, mosqueId: currentMosque.id, mosqueName: currentMosque.name, updatedAt: new Date().toISOString() };
          return writeJSONFile(fsDirHandle, currentMosque.dataFile, data).catch(function(err) {
            console.warn('Mosque data save failed:', err);
          });
        }
      });
    }
  });
}

function renderMosqueSelector() {
  var btn = document.getElementById('mosque-button');
  var label = document.getElementById('mosque-button-label');
  if (!btn || !label) return;
  if (currentMosque) {
    label.textContent = currentMosque.name;
    btn.dataset.mosqueId = currentMosque.id;
  } else {
    label.textContent = '-- اختر مسجد --';
    delete btn.dataset.mosqueId;
  }
}

function renderMosqueList() {
  var listEl = document.getElementById('mosque-list');
  if (!listEl) return;
  if (mosqueConfig.mosques.length === 0) {
    listEl.innerHTML = '<p style="color: var(--text-muted); text-align: center;"><i class="fas fa-inbox"></i> ' + t('emptyMosques') + '</p>';
    return;
  }
  var html = '';
  mosqueConfig.mosques.forEach(function(m) {
    var isActive = currentMosque && currentMosque.id === m.id;
    html += '<div class="list-item-glass" style="' + (isActive ? 'background: var(--primary)20; border-right-color: var(--primary);' : '') + '">';
    html += '<div><strong>' + escapeHtml(m.name) + '</strong>';
    html += '<p style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">';
    html += 'ID: ' + m.id + ' • ' + t('createdAt') + ' ' + formatDate(m.createdAt) + '</p></div>';
    html += '<div style="display: flex; gap: 0.5rem;">';
    if (!isActive) html += '<button onclick="selectMosque(\'' + m.id + '\')" class="btn" style="font-size: 0.75rem;"><i class="fas fa-check"></i> ' + t('select') + '</button>';
    html += '<button onclick="deleteMosque(\'' + m.id + '\')" class="btn btn-danger" style="font-size: 0.75rem;"><i class="fas fa-trash"></i> ' + t('delete') + '</button>';
    html += '</div></div>';
  });
  listEl.innerHTML = html;
  applyLanguage();
}

function addNewMosque() {
  var name = document.getElementById('new-mosque-name').value.trim();
  if (!name) { alert(t('alertEnterName')); return; }
  addMosque(name).then(function(mosque) {
    selectMosque(mosque.id).then(function() {
      document.getElementById('new-mosque-name').value = '';
      renderMosqueList();
      renderMosqueSelector();
      if (typeof App !== 'undefined') App.refresh();
      alert(t('alertMosqueAdded'));
    });
  });
}

function deleteMosque(mosqueId) {
  if (!confirm(t('confirmDeleteMosque'))) return;
  mosqueConfig.mosques = mosqueConfig.mosques.filter(function(m) { return m.id !== mosqueId; });
  dbMetaSet('mosqueData_' + mosqueId, null);
  
  if (fsDirHandle && fsReady) {
    ensureFilePermission().then(function(granted) {
      if (granted) deleteJSONFile(fsDirHandle, 'mosque_' + mosqueId + '.json');
    });
  }
  
  saveMosqueConfig().then(function() {
    if (currentMosque && currentMosque.id === mosqueId) {
      currentMosque = mosqueConfig.mosques.length > 0 ? mosqueConfig.mosques[0] : null;
      localStorage.removeItem('currentMosqueId');
      if (currentMosque) {
        selectMosque(currentMosque.id);
      } else {
        clearAllData(true).then(function() {
          renderMosqueList();
          renderMosqueSelector();
          if (typeof App !== 'undefined') App.refresh();
        });
        return;
      }
    }
    renderMosqueList();
    renderMosqueSelector();
    if (typeof App !== 'undefined') App.refresh();
  });
}

function openMosqueModal() {
  document.getElementById('mosque-modal').style.display = 'flex';
  renderMosqueList();
}

function closeMosqueModal() {
  document.getElementById('mosque-modal').style.display = 'none';
}

function renderMosqueDropdown() {
  var list = document.getElementById('mosque-dropdown-list');
  if (!list) return;
  if (!mosqueConfig.mosques || mosqueConfig.mosques.length === 0) {
    list.innerHTML = '<div class="empty">' + t('emptyMosquesShort') + '</div>';
    return;
  }
  var html = mosqueConfig.mosques.map(function(m) {
    var active = currentMosque && currentMosque.id === m.id;
    return '<div class="mosque-item" data-id="' + m.id + '"><div>' +
      '<strong>' + escapeHtml(m.name) + '</strong>' +
      '<div class="meta">' + escapeHtml(m.id) + ' • ' + formatDate(m.createdAt) + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center;">' +
        (active ? '<span style="color:var(--primary);font-weight:700;">' + t('selected') + '</span>' : '<button class="btn" data-action="select" data-id="' + m.id + '" style="font-size:0.8rem;padding:6px 8px;"><i class="fas fa-check"></i></button>') +
        '<button class="btn btn-outline" data-action="delete" data-id="' + m.id + '" style="font-size:0.8rem;padding:6px 8px;"><i class="fas fa-trash"></i></button>' +
      '</div></div>';
  }).join('');
  list.innerHTML = html;

  list.querySelectorAll('[data-action="select"]').forEach(function(b) {
    b.addEventListener('click', function(ev) {
      ev.stopPropagation();
      var id = this.dataset.id;
      selectMosque(id).then(function() {
        closeMosqueDropdown();
        renderMosqueList();
        if (typeof App !== 'undefined') App.refresh();
      });
    });
  });
  list.querySelectorAll('[data-action="delete"]').forEach(function(b) {
    b.addEventListener('click', function(ev) {
      ev.stopPropagation();
      var id = this.dataset.id;
      if (confirm(t('confirmDeleteMosqueFiles'))) {
        deleteMosque(id);
        renderMosqueDropdown();
      }
    });
  });

  list.querySelectorAll('.mosque-item').forEach(function(it) {
    it.addEventListener('click', function() {
      var id = this.dataset.id;
      selectMosque(id).then(function() {
        closeMosqueDropdown();
        renderMosqueList();
        if (typeof App !== 'undefined') App.refresh();
      });
    });
  });
}

function toggleMosqueDropdown() {
  var dd = document.getElementById('mosque-dropdown');
  if (!dd) return;
  if (dd.style.display === 'block') return closeMosqueDropdown();
  renderMosqueDropdown();
  dd.style.display = 'block';
  setTimeout(function() { document.addEventListener('click', outsideMosqueClick); });
}

function closeMosqueDropdown() {
  var dd = document.getElementById('mosque-dropdown');
  if (!dd) return;
  dd.style.display = 'none';
  document.removeEventListener('click', outsideMosqueClick);
}

function outsideMosqueClick(e) {
  var dd = document.getElementById('mosque-dropdown');
  var btn = document.getElementById('mosque-button');
  if (!dd || !btn) return;
  if (dd.contains(e.target) || btn.contains(e.target)) return;
  closeMosqueDropdown();
}

// ---------- IndexedDB ----------
function initDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function(e) {
      var dbRef = e.target.result;
      var oldVersion = e.oldVersion;
      if (!dbRef.objectStoreNames.contains('tasks')) dbRef.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
      if (!dbRef.objectStoreNames.contains('issues')) dbRef.createObjectStore('issues', { keyPath: 'id', autoIncrement: true });
      if (!dbRef.objectStoreNames.contains('finances')) dbRef.createObjectStore('finances', { keyPath: 'id', autoIncrement: true });
      if (!dbRef.objectStoreNames.contains('equipment')) {
        var eqStore = dbRef.createObjectStore('equipment', { keyPath: 'id', autoIncrement: true });
        eqStore.createIndex('uniqueId', 'uniqueId', { unique: true });
      } else {
        try {
          var existingEq = e.target.transaction.objectStore('equipment');
          if (!existingEq.indexNames.contains('uniqueId')) {
            existingEq.createIndex('uniqueId', 'uniqueId', { unique: true });
          }
        } catch(ex) {
          console.warn('Could not create index during upgrade:', ex);
        }
      }
      if (!dbRef.objectStoreNames.contains('meta')) {
        dbRef.createObjectStore('meta', { keyPath: 'key' });
      }
      if (oldVersion < 4 && dbRef.objectStoreNames.contains('equipment')) {
        var tx = e.target.transaction;
        var eqStoreTx = tx.objectStore('equipment');
        eqStoreTx.openCursor().onsuccess = function(ev) {
          var cursor = ev.target.result;
          if (cursor) {
            var eq = cursor.value;
            if (!eq.uniqueId) {
              eq.uniqueId = generateUniqueId(eq.name || 'DEV', cursor.key);
              eq.maintenanceHistory = eq.maintenanceHistory || [];
              cursor.update(eq);
            }
            cursor.continue();
          }
        };
      }
      if (oldVersion < 5 && dbRef.objectStoreNames.contains('equipment')) {
        var tx5 = e.target.transaction;
        var eqStore5 = tx5.objectStore('equipment');
        eqStore5.openCursor().onsuccess = function(ev) {
          var cursor = ev.target.result;
          if (cursor) {
            var eq = cursor.value;
            if (eq.estimatedValue === undefined) {
              eq.estimatedValue = 0;
              cursor.update(eq);
            }
            cursor.continue();
          }
        };
      }
    };
    req.onsuccess = function(e) { db = e.target.result; resolve(db); };
    req.onerror = function(e) { reject(e); };
  });
}

function dbGetAll(store) {
  return new Promise(function(res, rej) {
    var tx = db.transaction(store, 'readonly');
    var req = tx.objectStore(store).getAll();
    req.onsuccess = function() { res(req.result); };
    req.onerror = function(e) { rej(e); };
  });
}

function dbGetByIndex(store, indexName, value) {
  return new Promise(function(res, rej) {
    var tx = db.transaction(store, 'readonly');
    var index = tx.objectStore(store).index(indexName);
    var req = index.get(value);
    req.onsuccess = function() { res(req.result); };
    req.onerror = function(e) { rej(e); };
  });
}

function dbAdd(store, data) {
  return fileSyncAfter(new Promise(function(res, rej) {
    var tx = db.transaction(store, 'readwrite');
    var req = tx.objectStore(store).add(data);
    req.onsuccess = function() { res(req.result); };
    req.onerror = function(e) { rej(e); };
  }));
}

function dbUpdate(store, data) {
  return fileSyncAfter(new Promise(function(res, rej) {
    var tx = db.transaction(store, 'readwrite');
    var req = tx.objectStore(store).put(data);
    req.onsuccess = function() { res(req.result); };
    req.onerror = function(e) { rej(e); };
  }));
}

function dbDelete(store, id) {
  return fileSyncAfter(new Promise(function(res, rej) {
    var tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = res;
    tx.onerror = function(e) { rej(e); };
  }));
}

function dbMetaGet(key) {
  return new Promise(function(res, rej) {
    var tx = db.transaction('meta', 'readonly');
    var req = tx.objectStore('meta').get(key);
    req.onsuccess = function() { res(req.result ? req.result.value : null); };
    req.onerror = function(e) { rej(e); };
  });
}

function dbMetaSet(key, value) {
  return new Promise(function(res, rej) {
    var tx = db.transaction('meta', 'readwrite');
    var req = tx.objectStore('meta').put({ key: key, value: value });
    req.onsuccess = res;
    req.onerror = function(e) { rej(e); };
  });
}

// ---------- File System Access API ----------
function getStoredDirHandle() {
  return new Promise(function(resolve) {
    var tx = db.transaction('meta', 'readonly');
    var req = tx.objectStore('meta').get('fsDirHandle');
    req.onsuccess = function() {
      if (req.result && req.result.value) {
        try { resolve(req.result.value); } catch(e) { resolve(null); }
      } else { resolve(null); }
    };
    req.onerror = function() { resolve(null); };
  });
}

function storeDirHandle(handle) {
  return dbMetaSet('fsDirHandle', handle);
}

function pickDirectory() {
  if (!fsSupported) { return Promise.reject(new Error('FS_NOT_SUPPORTED')); }
  return window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' }).then(function(handle) {
    fsDirHandle = handle;
    return storeDirHandle(handle).then(function() { return handle; });
  });
}

function ensureFilePermission() {
  if (!fsDirHandle) return Promise.resolve(false);
  return fsDirHandle.requestPermission({ mode: 'readwrite' }).then(function(status) {
    return status === 'granted';
  });
}

function readJSONFile(handle, name) {
  return handle.getFileHandle(name).then(function(fh) {
    return fh.getFile().then(function(file) { return file.text(); });
  }).then(function(text) {
    return JSON.parse(text);
  }).catch(function() { return null; });
}

function writeJSONFile(handle, name, data) {
  return handle.getFileHandle(name, { create: true }).then(function(fh) {
    return fh.createWritable().then(function(w) {
      return w.write(JSON.stringify(data, null, 2)).then(function() { return w.close(); });
    });
  });
}

function deleteJSONFile(handle, name) {
  return handle.removeEntry(name).catch(function() {});
}

function getAllData() {
  return Promise.all([
    dbGetAll('tasks'), dbGetAll('issues'), dbGetAll('finances'), dbGetAll('equipment')
  ]).then(function(r) {
    return { tasks: r[0], issues: r[1], finances: r[2], equipment: r[3] };
  });
}

function saveAllToFile() {
  if (!fsDirHandle || !currentMosque) return Promise.resolve();
  return ensureFilePermission().then(function(granted) {
    if (!granted) return;
    return getAllData().then(function(data) {
      return saveMosqueData(data);
    });
  });
}

function loadAllFromFile() {
  if (!fsDirHandle || !currentMosque) return Promise.resolve(null);
  return loadMosqueData(currentMosque);
}

function hydrateAllFromFile(data) {
  if (!data) return Promise.resolve();
  var clearP = clearAllData(true);
  var addP = clearP.then(function() {
    var promises = [];
    if (data.tasks) data.tasks.forEach(function(t) { promises.push(dbAdd('tasks', t)); });
    if (data.issues) data.issues.forEach(function(i) { promises.push(dbAdd('issues', i)); });
    if (data.finances) data.finances.forEach(function(f) { promises.push(dbAdd('finances', f)); });
    if (data.equipment) data.equipment.forEach(function(eq) {
      if (!eq.maintenanceHistory) eq.maintenanceHistory = [];
      promises.push(dbAdd('equipment', eq));
    });
    return Promise.all(promises);
  });
  return addP;
}

function initFileSystem() {
  if (!fsSupported) { fsReady = false; return Promise.resolve(); }
  return getStoredDirHandle().then(function(handle) {
    if (handle) {
      fsDirHandle = handle;
      fsReady = false; // We have a handle, but require manual 'Reconnect' to grant permission on reload
    } else {
      fsDirHandle = null;
      fsReady = false;
    }
    return Promise.resolve();
  }).catch(function(err) {
    console.warn('File system init failed, falling back to IndexedDB:', err);
    fsDirHandle = null;
    fsReady = false;
    return storeDirHandle(null);
  });
}

function renderFileSystemStatus() {
  var el = document.getElementById('fs-status');
  if (!el) return;
  if (!fsSupported) {
    el.innerHTML = '<p style="color:var(--text-muted);"><i class="fas fa-mobile-alt"></i> ' + t('fsNotSupportedMobile') + '</p>';
    document.getElementById('fs-setup-btn').style.display = 'none';
    document.getElementById('mobile-backup-btn').style.display = 'inline-flex';
    return;
  }
  
  document.getElementById('mobile-backup-btn').style.display = 'none';
  
  if (fsDirHandle && fsReady) {
    el.innerHTML = '<p style="color:var(--success);"><i class="fas fa-check-circle"></i> <strong>' + t('fsConnected') + '</strong></p>' +
      '<p style="font-size:0.8rem;color:var(--text-muted);">' + t('fsAllSaved') + '</p>' +
      '<ul style="font-size:0.8rem;color:var(--text-muted);margin:0.5rem 0;"><li>' + t('fsConfigFile') + '</li>' +
      '<li>' + t('fsDataFile') + '</li></ul>' +
      (currentMosque ? '<p style="font-size:0.8rem;color:var(--primary);font-weight:600;">' + t('fsCurrentMosque') + ': ' + escapeHtml(currentMosque.name) + ' (' + currentMosque.id + ')</p>' : '');
    document.getElementById('fs-reconnect-btn').style.display = 'none';
    document.getElementById('fs-setup-btn').style.display = 'none';
    document.getElementById('fs-disconnect-btn').style.display = 'inline-flex';
  } else if (fsDirHandle && !fsReady) {
    el.innerHTML = '<p style="color:var(--warning);"><i class="fas fa-exclamation-triangle"></i> <strong>' + t('fsDisconnected') + '</strong> - ' + t('fsReconnectHint') + '</p>';
    document.getElementById('fs-reconnect-btn').style.display = 'inline-flex';
    document.getElementById('fs-setup-btn').style.display = 'none';
    document.getElementById('fs-disconnect-btn').style.display = 'inline-flex';
  } else {
    el.innerHTML = '<p style="color:var(--text-muted);"><i class="fas fa-folder-open"></i> ' + t('fsNotSelected') + '</p>';
    document.getElementById('fs-reconnect-btn').style.display = 'none';
    document.getElementById('fs-setup-btn').style.display = 'inline-flex';
    document.getElementById('fs-disconnect-btn').style.display = 'none';
  }
}

function setupFileSystem() {
  if (!fsSupported) { alert(t('alertNotSupported')); return; }
  pickDirectory().then(function() {
    return ensureFilePermission();
  }).then(function(granted) {
    if (granted) {
      fsReady = true;
      return loadMosqueConfig().then(function(config) {
        if (config.mosques.length > 0) {
          if (!currentMosque) currentMosque = config.mosques[0];
          return loadMosqueData(currentMosque).then(hydrateAllFromFile);
        } else {
          return saveMosqueConfig().then(saveAllData);
        }
      }).then(function() {
        renderFileSystemStatus();
        if (typeof App !== 'undefined') App.refresh();
      });
    } else {
      fsReady = false;
      renderFileSystemStatus();
    }
  }).catch(function(err) {
    if (err.message === 'FS_NOT_SUPPORTED') alert(t('alertNotSupportedFolder'));
    renderFileSystemStatus();
  });
}

function reconnectFileSystem() {
  if (!fsDirHandle) { setupFileSystem(); return; }
  ensureFilePermission().then(function(granted) {
    if (granted) {
      fsReady = true;
      return loadMosqueConfig().then(function(config) {
        if (config.mosques.length > 0 && currentMosque) {
          return loadMosqueData(currentMosque).then(hydrateAllFromFile);
        } else if (currentMosque) {
          return saveAllData();
        }
      }).then(function() {
        renderFileSystemStatus();
        if (typeof App !== 'undefined') App.refresh();
      });
    } else {
      fsReady = false;
      renderFileSystemStatus();
      alert(t('alertGrantFailed'));
    }
  });
}

function disconnectFileSystem() {
  if (confirm(t('confirmDisconnect'))) {
    fsDirHandle = null;
    fsReady = false;
    storeDirHandle(null).then(function() {
      renderFileSystemStatus();
    });
  }
}

// Wrap save operations to automatically trigger sync
function fileSyncAfter(opPromise) {
  return opPromise.then(function(result) {
    saveAllData();
    return result;
  });
}

// ---------- Unique ID Generator with Mosque ID ----------
function generateUniqueId(name, fallbackNum) {
  var prefix = currentMosque ? currentMosque.id : 'MOSQ';
  var code = 'DEV';
  var nameUpper = (name || '').toUpperCase();
  if (nameUpper.includes('مكيف') || nameUpper.includes('AC') || nameUpper.includes('AIR') || nameUpper.includes('تكييف')) code = 'AC';
  else if (nameUpper.includes('مروحة') || nameUpper.includes('FAN') || nameUpper.includes('VENT')) code = 'FAN';
  else if (nameUpper.includes('لمبة') || nameUpper.includes('LIGHT') || nameUpper.includes('LAMP') || nameUpper.includes('LED') || nameUpper.includes('اضاءة') || nameUpper.includes('إنارة')) code = 'LGT';
  else if (nameUpper.includes('ماء') || nameUpper.includes('WATER') || nameUpper.includes('سباكة') || nameUpper.includes('PIPE') || nameUpper.includes('صنابير') || nameUpper.includes('خلاط')) code = 'PLB';
  else if (nameUpper.includes('كهرباء') || nameUpper.includes('ELECTRIC') || nameUpper.includes('POWER') || nameUpper.includes('ELEC')) code = 'ELC';
  else if (nameUpper.includes('كاميرا') || nameUpper.includes('CAMERA') || nameUpper.includes('CCTV')) code = 'CAM';
  else if (nameUpper.includes('صوت') || nameUpper.includes('SOUND') || nameUpper.includes('SPEAKER') || nameUpper.includes('سماعة') || nameUpper.includes('ميكروفون')) code = 'AUD';
  return prefix + '-' + code + '-' + String(fallbackNum || 1).padStart(3, '0');
}

function generateNextId(name) {
  return dbGetAll('equipment').then(function(list) {
    var maxNum = 0;
    list.forEach(function(eq) {
      var parts = (eq.uniqueId || '').split('-');
      var num = parseInt(parts[2], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    return generateUniqueId(name, maxNum + 1);
  });
}

// ---------- Maintenance History CRUD ----------
function handleFinanceForMaintenance(eqName, maintDesc, newCost, maintDate, maintenanceRecordId, oldCost) {
  return dbGetAll('finances').then(function(finances) {
    var existingEntry = finances.find(function(f) {
      return f.maintenanceRecordId === maintenanceRecordId && f.type === 'expense' && f.autoGenerated === true;
    });
    if (existingEntry) {
      if (newCost !== oldCost) {
        existingEntry.amount = newCost;
        existingEntry.desc = 'صيانة جهاز: ' + eqName + ' - ' + maintDesc;
        existingEntry.category = 'صيانة';
        existingEntry.date = maintDate + 'T00:00:00.000Z';
        return dbUpdate('finances', existingEntry);
      }
      return Promise.resolve();
    } else {
      if (newCost > 0) {
        return dbAdd('finances', {
          type: 'expense',
          desc: 'صيانة جهاز: ' + eqName + ' - ' + maintDesc,
          amount: newCost,
          category: 'صيانة',
          date: maintDate + 'T00:00:00.000Z',
          autoGenerated: true,
          maintenanceRecordId: maintenanceRecordId
        });
      }
      return Promise.resolve();
    }
  });
}

function addMaintenanceRecord(equipId, existingRecordId) {
  var isEdit = !!existingRecordId;
  var title = isEdit ? t('editMaintTitle') : t('addMaintTitle');
  var html = '<div class="flex-between"><h3><i class="fas fa-plus-circle"></i> ' + title + '</h3><button onclick="closeModal()" style="background:none;border:none;font-size:24px;cursor:pointer;">&times;</button></div>';
  html += '<form id="maint-form">';
  html += '<input type="date" id="maint-date" value="' + new Date().toISOString().slice(0, 10) + '" required>';
  html += '<textarea id="maint-desc" required placeholder="' + t('maintDesc') + '"></textarea>';
  html += '<input type="number" id="maint-cost" min="0" placeholder="' + t('maintCost') + '" step="0.01">';
  html += '<input id="maint-tech" placeholder="' + t('maintTech') + '">';
  html += '<select id="maint-status"><option value="open">' + t('statusOpen') + '</option><option value="in-progress">' + t('statusInProgress') + '</option><option value="resolved" selected>' + t('statusResolved') + '</option></select>';
  html += '<button type="submit" class="btn btn-primary btn-full">' + t('saveRecord') + '</button>';
  html += '</form>';
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('universal-modal').style.display = 'flex';

  if (isEdit) {
    dbGetAll('equipment').then(function(list) {
      var eq = list.find(function(x) { return x.id === equipId; });
      if (eq && eq.maintenanceHistory) {
        var record = eq.maintenanceHistory.find(function(r) { return r.id === existingRecordId; });
        if (record) {
          document.getElementById('maint-date').value = record.date || '';
          document.getElementById('maint-desc').value = record.description || '';
          document.getElementById('maint-cost').value = record.cost || 0;
          document.getElementById('maint-tech').value = record.technician || '';
          document.getElementById('maint-status').value = record.status || 'resolved';
        }
      }
    });
  }

  document.getElementById('maint-form').onsubmit = function(e) {
    e.preventDefault();
    var maintCost = parseFloat(document.getElementById('maint-cost').value) || 0;
    var maintDesc = document.getElementById('maint-desc').value;
    var maintDate = document.getElementById('maint-date').value;
    var maintTech = document.getElementById('maint-tech').value || '';
    var maintStatus = document.getElementById('maint-status').value;
    var eqName = '';
    dbGetAll('equipment').then(function(list) {
      var eq = list.find(function(x) { return x.id === equipId; });
      if (!eq) { alert(t('alertDeviceNotFound')); return; }
      eqName = eq.name;
      eq.maintenanceHistory = eq.maintenanceHistory || [];

      if (isEdit) {
        var index = eq.maintenanceHistory.findIndex(function(r) { return r.id === existingRecordId; });
        if (index !== -1) {
          var oldRecord = eq.maintenanceHistory[index];
          var oldCost = oldRecord.cost || 0;
          eq.maintenanceHistory[index] = {
            id: existingRecordId,
            date: maintDate,
            description: maintDesc,
            cost: maintCost,
            technician: maintTech,
            status: maintStatus
          };
          return dbUpdate('equipment', eq).then(function() {
            return handleFinanceForMaintenance(eqName, maintDesc, maintCost, maintDate, existingRecordId, oldCost);
          });
        } else {
          alert('Record not found');
          return;
        }
      } else {
        var newId = 'maint_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        eq.maintenanceHistory.push({
          id: newId,
          date: maintDate,
          description: maintDesc,
          cost: maintCost,
          technician: maintTech,
          status: maintStatus
        });
        return dbUpdate('equipment', eq).then(function() {
          return handleFinanceForMaintenance(eqName, maintDesc, maintCost, maintDate, newId, 0);
        });
      }
    }).then(function() {
      closeModal();
      return dbGetAll('equipment');
    }).then(function(list) {
      var eq = list.find(function(x) { return x.id === equipId; });
      if (eq && typeof showEquipmentDetail !== 'undefined') showEquipmentDetail(eq);
    }).catch(function(err) {
      console.error('Error saving maintenance:', err);
      alert(t('alertSaveFailed'));
    });
  };
}

function editMaintenanceRecord(equipId, recordId) {
  dbGetAll('equipment').then(function(list) {
    var eq = list.find(function(x) { return x.id === equipId; });
    if (!eq || !eq.maintenanceHistory) { addMaintenanceRecord(equipId); return; }
    if (recordId.indexOf('legacy_') === 0) {
      var parts = recordId.replace('legacy_', '').split('_');
      var legacyDate = parts[0];
      var legacyDesc = parts.slice(1).join('_');
      var record = eq.maintenanceHistory.find(function(r) { return !r.id && r.date === legacyDate && r.description === legacyDesc; });
      if (record) {
        var newId = 'maint_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        record.id = newId;
        dbUpdate('equipment', eq).then(function() { addMaintenanceRecord(equipId, newId); });
        return;
      }
    } else {
      addMaintenanceRecord(equipId, recordId);
      return;
    }
    addMaintenanceRecord(equipId);
  });
}

function showEquipmentDetailById(id) {
  dbGetAll('equipment').then(function(list) {
    var eq = list.find(function(x) { return x.id === id; });
    if (eq && typeof showEquipmentDetail !== 'undefined') showEquipmentDetail(eq);
    else alert(t('alertDeviceNotFound'));
  });
}

// ---------- CRUD Helpers ----------
function toggleTaskComplete(id, completed) {
  dbGetAll('tasks').then(function(tasks) {
    var task = tasks.find(function(t) { return t.id === id; });
    if (!task) return;
    task.completed = completed;
    dbUpdate('tasks', task).then(function() { if (typeof App !== 'undefined') App.refresh(); });
  });
}

function resolveIssue(id) {
  dbGetAll('issues').then(function(issues) {
    var issue = issues.find(function(i) { return i.id === id; });
    if (!issue) return;
    issue.status = 'resolved';
    issue.resolvedAt = new Date().toISOString();
    return dbUpdate('issues', issue).then(function() {
      if (issue.equipmentId) {
        return dbGetAll('equipment').then(function(list) {
          var eq = list.find(function(e) { return e.id === issue.equipmentId; });
          if (eq) {
            eq.maintenanceHistory = eq.maintenanceHistory || [];
            var existingRecord = eq.maintenanceHistory.find(function(h) {
              return h.issueId === id || (h.date === issue.resolvedAt.slice(0,10) && h.description === issue.desc);
            });
            if (!existingRecord) {
              eq.maintenanceHistory.push({
                date: issue.resolvedAt.slice(0, 10),
                description: '[' + t('statusResolved') + '] ' + (issue.desc || ''),
                cost: 0,
                technician: '',
                status: 'resolved',
                issueId: id
              });
              return dbUpdate('equipment', eq);
            }
          }
        });
      }
    }).then(function() { if (typeof App !== 'undefined') App.refresh(); });
  });
}

function deleteItem(store, id) {
  if (store === 'equipment') {
    dbGetAll('equipment').then(function(list) {
      var eq = list.find(function(e) { return e.id === id; });
      if (!eq) return;
      if (eq.status === 'archived') {
        if (confirm(t('confirmReactivateEquip') + ' "' + eq.name + '"?')) {
          delete eq.status;
          dbUpdate('equipment', eq).then(function() { if (typeof App !== 'undefined') App.refresh(); });
        }
      } else {
        if (confirm(t('confirmArchiveEquip') + ' "' + eq.name + '"?')) {
          eq.status = 'archived';
          dbUpdate('equipment', eq).then(function() { if (typeof App !== 'undefined') App.refresh(); });
        }
      }
    });
  } else if (store === 'finances') {
    if (confirm(t('confirmDeleteRecord'))) {
      dbDelete(store, id).then(function() { if (typeof App !== 'undefined') App.refresh(); }).catch(function(e) { console.error('Delete failed:', e); });
    }
  } else {
    if (confirm(t('confirmDeletePermanent'))) {
      dbDelete(store, id).then(function() { if (typeof App !== 'undefined') App.refresh(); }).catch(function(e) { console.error('Delete failed:', e); });
    }
  }
}

// ---------- Export / Import ----------
function exportData() {
  Promise.all([dbGetAll('tasks'), dbGetAll('issues'), dbGetAll('finances'), dbGetAll('equipment')]).then(function(results) {
    var data = {
      tasks: results[0],
      issues: results[1],
      finances: results[2],
      equipment: results[3],
      mosqueMeta: {
        id: currentMosque ? currentMosque.id : 'unknown',
        name: currentMosque ? currentMosque.name : 'غير محدد'
      },
      exportedAt: new Date().toISOString(),
      version: 4
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    var filename = 'mosque_backup_' + (currentMosque ? currentMosque.name.replace(/\s+/g, '_') : 'backup') + '_' + new Date().toISOString().slice(0, 10) + '.json';
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

function shareDataMobile() {
  Promise.all([dbGetAll('tasks'), dbGetAll('issues'), dbGetAll('finances'), dbGetAll('equipment')]).then(function(results) {
    var data = {
      tasks: results[0],
      issues: results[1],
      finances: results[2],
      equipment: results[3],
      mosqueMeta: {
        id: currentMosque ? currentMosque.id : 'unknown',
        name: currentMosque ? currentMosque.name : 'غير محدد'
      },
      exportedAt: new Date().toISOString(),
      version: 4
    };
    var jsonStr = JSON.stringify(data, null, 2);
    var filename = 'mosque_backup_' + (currentMosque ? currentMosque.name.replace(/\s+/g, '_') : 'backup') + '_' + new Date().toISOString().slice(0, 10) + '.json';
    var file = new File([jsonStr], filename, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: 'نسخة احتياطية - ' + (currentMosque ? currentMosque.name : ''),
        text: 'مرفق نسخة احتياطية من بيانات المسجد للحفاظ عليها'
      }).then(function() {
        console.log('Shared successfully');
      }).catch(function(err) {
        console.error('Error sharing:', err);
      });
    } else {
      alert(typeof t !== 'undefined' ? t('alertNotSupportedMobile') : 'ميزة المشاركة غير مدعومة في جهازك. سيتم تنزيل الملف مباشرة.');
      exportData();
    }
  });
}

function importData(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var d = JSON.parse(e.target.result);
      clearAllData(true).then(function() {
        var promises = [];
        if (d.tasks) d.tasks.forEach(function(t) { promises.push(dbAdd('tasks', t)); });
        if (d.issues) d.issues.forEach(function(i) { promises.push(dbAdd('issues', i)); });
        if (d.finances) d.finances.forEach(function(f) { promises.push(dbAdd('finances', f)); });
        if (d.equipment) d.equipment.forEach(function(eq) {
          if (!eq.maintenanceHistory) eq.maintenanceHistory = [];
          promises.push(dbAdd('equipment', eq));
        });
        return Promise.all(promises);
      }).then(function() {
        alert(t('alertImported'));
        if (typeof App !== 'undefined') App.refresh();
      }).catch(function(err) {
        console.error('Import error:', err);
        alert(t('alertImportFailed'));
      });
    } catch (err) {
      alert(t('alertInvalidFile'));
    }
  };
  reader.readAsText(file);
  input.value = '';
}

function clearAllData(silent) {
  if (!silent && !confirm(t('confirmClearAll'))) return Promise.resolve();
  return new Promise(function(res, rej) {
    var tx = db.transaction(['tasks', 'issues', 'finances', 'equipment'], 'readwrite');
    tx.objectStore('tasks').clear();
    tx.objectStore('issues').clear();
    tx.objectStore('finances').clear();
    tx.objectStore('equipment').clear();
    
    tx.oncomplete = function() {
      if (!silent) {
        if (fsDirHandle && fsReady && currentMosque) {
          deleteJSONFile(fsDirHandle, currentMosque.dataFile);
        }
        alert(t('alertCleared'));
      }
      if (typeof App !== 'undefined') App.refresh();
      res();
    };
    tx.onerror = function(e) { rej(e); };
  });
}
