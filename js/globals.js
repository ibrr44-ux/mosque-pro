var DB_NAME = 'MosqueProDB';
var DB_VERSION = 5;
var db;
var chartInstance = null;
var categoryChartInstance = null;
var trendChartInstance = null;
var equipmentOptions = [];
var currentEdit = { type: null, id: null };
var html5QrCode = null;
var deferredPrompt = null;
var fsDirHandle = null;
var fsSupported = 'showDirectoryPicker' in window;
var fsReady = false;
var fsPendingSave = false;

// Multi-Tenant variables
var currentMosque = null;
var mosqueConfig = { mosques: [] };

// ---------- Escape HTML & Formatters ----------
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    if (m === '"') return '&quot;';
    return m;
  });
}

function sameId(a, b) {
  if (a === b) return true;
  if (a === undefined || a === null || b === undefined || b === null) return false;
  return String(a).trim() === String(b).trim();
}

function formatCurrency(val) {
  var locale = currentLang === 'ar' ? 'ar-SA' : 'en-US';
  var symbol = currentLang === 'ar' ? ' ر.س' : ' SAR';
  return Number(val).toLocaleString(locale) + symbol;
}

function formatDate(d) {
  if (!d) return '';
  var locale = currentLang === 'ar' ? 'ar-SA' : 'en-US';
  return new Date(d).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}
