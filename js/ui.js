// ---------- Search & Equipment Detail ----------
function searchEquipment() {
  var term = document.getElementById('search-eq').value.toLowerCase();
  dbGetAll('equipment').then(function(list) {
    var filtered = list.filter(function(e) {
      return (e.name && e.name.toLowerCase().includes(term)) || (e.uniqueId && e.uniqueId.toLowerCase().includes(term)) || (e.location && e.location.toLowerCase().includes(term));
    });
    var html = '';
    filtered.forEach(function(e) {
      html += '<div class="list-item-glass" onclick="showEquipmentDetailById(\'' + e.id + '\')" style="cursor:pointer;">';
      html += '<div><strong>' + escapeHtml(e.name) + '</strong> <span style="color:var(--text-muted);font-size:0.8rem">(' + escapeHtml(e.uniqueId || '') + ')</span><br><span style="font-size:0.8rem">' + escapeHtml(e.location) + '</span></div>';
      html += '</div>';
    });
    document.getElementById('equipment-list').innerHTML = html;
  });
}

function showEquipmentDetail(eq) {
  var history = eq.maintenanceHistory || [];
  var totalCost = history.reduce(function(sum, r) { return sum + (parseFloat(r.cost) || 0); }, 0);
  var estValue = parseFloat(eq.estimatedValue) || 0;
  var ratio = estValue > 0 ? (totalCost / estValue) * 100 : 0;
  var effClass = 'efficiency-good', effText = t('effExcellent'), effIcon = 'fa-check-circle';
  if (ratio > 80) { effClass = 'efficiency-bad'; effText = t('effBad'); effIcon = 'fa-times-circle'; }
  else if (ratio > 50) { effClass = 'efficiency-warn'; effText = t('effWarn'); effIcon = 'fa-exclamation-triangle'; }
  else if (estValue === 0) { effClass = ''; effText = t('notSetValue'); effIcon = 'fa-info-circle'; }

  var isArchived = eq.status === 'archived';

  var html = '<div class="flex-between"><h3><i class="fas fa-microchip"></i> ' + t('equipData') + '</h3><button onclick="closeModal()" style="background:none;border:none;font-size:24px;cursor:pointer;">&times;</button></div>';

  html += '<div class="detail-header">';
  html += '<div id="eq-detail-qr" class="qr-small"></div>';
  html += '<div><h2 style="font-size:1.3rem;margin-bottom:4px;">' + escapeHtml(eq.name) + (isArchived ? ' <span class="badge-modern" style="background:var(--warning);color:white">مؤرشف</span>' : '') + '</h2><div style="font-family:monospace;background:var(--primary-glow);padding:4px 8px;border-radius:4px;display:inline-block;color:var(--primary);font-weight:bold;letter-spacing:1px;">' + escapeHtml(eq.uniqueId) + '</div></div>';
  html += '<div style="margin-left:auto;text-align:center;"><button onclick="openQRPrint(\'' + eq.id + '\')" class="btn btn-outline"><i class="fas fa-qrcode"></i> ' + t('qrPrint') + '</button></div>';
  html += '</div>';

  html += '<div class="detail-info-grid">';
  html += '<div class="detail-info-item"><span class="label"><i class="fas fa-map-marker-alt"></i> ' + t('location') + '</span><span class="value">' + escapeHtml(eq.location) + '</span></div>';
  html += '<div class="detail-info-item"><span class="label"><i class="fas fa-money-bill-wave"></i> ' + t('estimatedValue') + '</span><span class="value">' + formatCurrency(estValue) + '</span></div>';
  html += '<div class="detail-info-item"><span class="label"><i class="fas fa-wrench"></i> ' + t('totalMaintenance') + '</span><span class="value">' + history.length + ' ' + t('operations') + '</span></div>';
  html += '<div class="detail-info-item"><span class="label"><i class="fas fa-calendar-alt"></i> ' + t('nextMaintenance') + '</span><span class="value">' + (eq.next ? formatDate(eq.next) : t('notSet')) + '</span></div>';
  html += '<div class="detail-info-item" style="grid-column: span 2"><span class="label"><i class="fas fa-wallet"></i> ' + t('totalCost') + ' / ' + t('maintRatio') + '</span><span class="value" style="color:var(--danger)">' + formatCurrency(totalCost) + ' (' + ratio.toFixed(1) + '%)</span></div>';
  if (eq.notes) {
    html += '<div class="detail-info-item" style="grid-column: span 2"><span class="label"><i class="fas fa-sticky-note"></i> ' + t('equipNotes') + '</span><span class="value">' + escapeHtml(eq.notes) + '</span></div>';
  }
  html += '</div>';

  html += '<div class="efficiency-meter ' + effClass + '"><i class="fas ' + effIcon + ' fa-2x" style="opacity:0.8"></i><div><strong style="display:block;font-size:0.85rem">' + t('maintRatio') + '</strong><span style="font-size:0.75rem">' + effText + '</span></div></div>';

  html += '<div class="flex-between" style="margin-top:1.5rem;margin-bottom:1rem"><h4><i class="fas fa-history"></i> ' + t('maintHistory') + '</h4>';
  if (!isArchived) html += '<button class="btn btn-outline" onclick="addMaintenanceRecord(' + eq.id + ')"><i class="fas fa-plus"></i> ' + t('addMaintRecord') + '</button>';
  html += '</div>';

  if (history.length === 0) {
    html += '<div class="empty-state" style="padding:1rem"><i class="fas fa-clipboard" style="font-size:2rem"></i><p>' + t('noMaintHistory') + '</p></div>';
  } else {
    html += '<div class="timeline">';
    history.sort(function(a, b) { return new Date(b.date) - new Date(a.date); }).forEach(function(r) {
      var recordIdParam = r.id ? "'" + r.id + "'" : "'legacy_" + r.date + "_" + escapeHtml(r.description) + "'";
      html += '<div class="timeline-item" onclick="editMaintenanceRecord(' + eq.id + ', ' + recordIdParam + ')" style="cursor:pointer">';
      html += '<span class="date">' + formatDate(r.date) + (r.technician ? ' • <i class="fas fa-user-tools"></i> ' + escapeHtml(r.technician) : '') + ' • <i class="fas fa-info-circle"></i> ' + t(r.status === 'open' ? 'statusOpen' : r.status === 'in-progress' ? 'statusInProgress' : 'statusResolved') + '</span>';
      html += '<div class="flex-between"><span class="desc">' + escapeHtml(r.description) + '</span>';
      if (r.cost > 0) html += '<span class="cost">' + formatCurrency(r.cost) + '</span>';
      html += '</div></div>';
    });
    html += '</div>';
  }

  var modalContent = document.getElementById('modal-content');
  modalContent.innerHTML = html;
  document.getElementById('universal-modal').style.display = 'flex';

  setTimeout(function() {
    new QRCode(document.getElementById('eq-detail-qr'), {
      text: eq.uniqueId,
      width: 72,
      height: 72,
      colorDark : '#0f766e',
      colorLight : '#ffffff',
      correctLevel : QRCode.CorrectLevel.L
    });
  }, 10);
}

// ---------- App Render ----------
var App = {
  refresh: function() {
    if (!currentMosque && mosqueConfig.mosques.length === 0) {
      return Promise.resolve();
    }
    return Promise.all([
      dbGetAll('tasks'), dbGetAll('issues'), dbGetAll('finances'), dbGetAll('equipment')
    ]).then(function(results) {
      App.renderTasks(results[0]);
      App.renderIssues(results[1]);
      App.renderFinances(results[2]);
      App.renderEquipment(results[3]);
      App.renderDashboard(results[0], results[1], results[2], results[3]);
      App.renderReports(results[1], results[2], results[3]);
    });
  },
  renderTasks: function(tasks) {
    var today = new Date().toISOString().slice(0, 10);
    var filtered = tasks.filter(function(taskItem) { return taskItem.date === today; });
    var html = '';
    if (filtered.length === 0) {
      html = '<div class="empty-state"><i class="fas fa-clipboard-list"></i><p>' + t('emptyTasks') + '</p></div>';
    } else {
      filtered.forEach(function(taskItem) {
        var priorityColor = taskItem.priority === 'high' ? 'var(--danger)' : taskItem.priority === 'low' ? 'var(--info)' : 'var(--warning)';
        html += '<div class="list-item-glass" style="border-right-color: ' + priorityColor + '">';
        html += '<div style="display:flex;align-items:center;gap:12px;">';
        html += '<input type="checkbox" ' + (taskItem.completed ? 'checked' : '') + ' onchange="toggleTaskComplete(' + taskItem.id + ', this.checked)" style="width:20px;height:20px;accent-color:var(--primary);cursor:pointer;margin:0">';
        html += '<div style="' + (taskItem.completed ? 'text-decoration:line-through;opacity:0.6' : '') + '"><strong>' + escapeHtml(taskItem.title) + '</strong><br><span style="font-size:0.8rem;color:var(--text-muted)">' + (taskItem.period === 'morning' ? t('taskMorning') : taskItem.period === 'afternoon' ? t('taskAfternoon') : t('taskEvening')) + '</span></div>';
        html += '</div>';
        html += '<div><button onclick="openModal(\'task\', ' + taskItem.id + ')" class="btn btn-outline"><i class="fas fa-edit"></i></button> ';
        html += '<button onclick="deleteItem(\'tasks\', ' + taskItem.id + ')" class="btn btn-danger"><i class="fas fa-trash"></i></button></div>';
        html += '</div>';
      });
    }
    document.getElementById('task-list').innerHTML = html;
  },
  renderIssues: function(issues) {
    var active = issues.filter(function(i) { return i.status !== 'resolved'; });
    var html = '';
    if (active.length === 0) {
      html = '<div class="empty-state"><i class="fas fa-tools"></i><p>' + t('emptyIssues') + '</p></div>';
    } else {
      active.forEach(function(i) {
        html += '<div class="list-item-glass" style="border-right-color: var(--danger)">';
        html += '<div><span class="badge-modern" style="background:#fef2f2;color:var(--danger);margin-bottom:8px;">' + t('issuePending') + '</span>';
        html += '<strong>' + escapeHtml(i.location) + (i.equipment ? ' - ' + escapeHtml(i.equipment) : '') + '</strong><br><span style="font-size:0.85rem">' + escapeHtml(i.desc) + '</span></div>';
        html += '<div style="display:flex;gap:8px;"><button onclick="resolveIssue(' + i.id + ')" class="btn btn-success"><i class="fas fa-check"></i> ' + t('issueResolved') + '</button>';
        html += '<button onclick="openModal(\'issue\', ' + i.id + ')" class="btn btn-outline"><i class="fas fa-edit"></i></button></div>';
        html += '</div>';
      });
    }
    document.getElementById('issue-list').innerHTML = html;
  },
  renderFinances: function(finances) {
    var sorted = finances.sort(function(a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 50);
    var html = '';
    if (sorted.length === 0) {
      html = '<div class="empty-state"><i class="fas fa-wallet"></i><p>' + t('emptyTransactions') + '</p></div>';
    } else {
      sorted.forEach(function(f) {
        var isInc = f.type === 'donation';
        html += '<div class="list-item-glass" style="border-right-color: ' + (isInc ? 'var(--success)' : 'var(--danger)') + '">';
        html += '<div><strong>' + escapeHtml(f.desc || f.name) + '</strong><br><span style="font-size:0.8rem;color:var(--text-muted)">' + formatDate(f.date) + (f.category ? ' - ' + escapeHtml(f.category) : '') + (f.autoGenerated ? ' <i class="fas fa-robot" title="Auto Generated"></i>' : '') + '</span></div>';
        html += '<div style="display:flex;align-items:center;gap:12px;"><span style="font-weight:700;color:' + (isInc ? 'var(--success)' : 'var(--danger)') + '">' + (isInc ? '+' : '-') + formatCurrency(f.amount) + '</span>';
        html += '<button onclick="deleteItem(\'finances\', ' + f.id + ')" class="btn btn-danger" style="padding:6px 10px"><i class="fas fa-trash"></i></button></div>';
        html += '</div>';
      });
    }
    document.getElementById('finance-list').innerHTML = html;
  },
  renderEquipment: function(equipment) {
    equipmentOptions = equipment.filter(function(e) { return e.status !== 'archived'; });
    var term = document.getElementById('search-eq').value.toLowerCase();
    var filtered = equipmentOptions.filter(function(e) {
      return (e.name && e.name.toLowerCase().includes(term)) || (e.uniqueId && e.uniqueId.toLowerCase().includes(term)) || (e.location && e.location.toLowerCase().includes(term));
    });
    var archived = equipment.filter(function(e) { return e.status === 'archived'; });
    var html = '';
    if (filtered.length === 0) {
      html = '<div class="empty-state"><i class="fas fa-server"></i><p>' + (equipmentOptions.length === 0 ? t('emptyDevices') : t('deviceNotFound')) + '</p></div>';
    } else {
      filtered.forEach(function(e) {
        var est = parseFloat(e.estimatedValue) || 0;
        html += '<div class="list-item-glass" onclick="showEquipmentDetailById(\'' + e.id + '\')" style="cursor:pointer;border-right-color:var(--primary-light)">';
        html += '<div><strong>' + escapeHtml(e.name) + '</strong> <span style="font-family:monospace;font-size:0.75rem;color:var(--primary);background:var(--primary-glow);padding:2px 6px;border-radius:4px;">' + escapeHtml(e.uniqueId || '') + '</span><br>';
        html += '<span style="font-size:0.8rem;color:var(--text-muted)"><i class="fas fa-map-marker-alt"></i> ' + escapeHtml(e.location) + ' | <i class="fas fa-wallet"></i> ' + formatCurrency(est) + '</span></div>';
        html += '<div><button onclick="event.stopPropagation(); openModal(\'equipment\', ' + e.id + ')" class="btn btn-outline" style="padding:6px 10px;margin-left:4px"><i class="fas fa-edit"></i></button>';
        html += '<button onclick="event.stopPropagation(); deleteItem(\'equipment\', ' + e.id + ')" class="btn btn-danger" style="padding:6px 10px"><i class="fas fa-archive"></i></button></div>';
        html += '</div>';
      });
    }
    document.getElementById('equipment-list').innerHTML = html;

    var archHtml = '';
    if (archived.length > 0) {
      archived.forEach(function(e) {
        archHtml += '<div class="list-item-glass" style="border-right-color:var(--text-muted); opacity:0.7">';
        archHtml += '<div><strong>' + escapeHtml(e.name) + '</strong> <span style="font-family:monospace;font-size:0.75rem;">' + escapeHtml(e.uniqueId || '') + '</span><br>';
        archHtml += '<span style="font-size:0.8rem;"><i class="fas fa-map-marker-alt"></i> ' + escapeHtml(e.location) + '</span></div>';
        archHtml += '<div><button onclick="deleteItem(\'equipment\', ' + e.id + ')" class="btn btn-outline" style="padding:6px 10px"><i class="fas fa-undo"></i> ' + t('reactivate') + '</button></div>';
        html += '</div>';
      });
      document.getElementById('archived-equipment-list').innerHTML = archHtml;
      document.getElementById('archived-section').style.display = 'block';
    } else {
      document.getElementById('archived-section').style.display = 'none';
    }
  },
  renderDashboard: function(tasks, issues, finances, equipment) {
    var today = new Date().toISOString().slice(0, 10);
    document.getElementById('dash-tasks').textContent = tasks.filter(function(t) { return t.date === today && !t.completed; }).length;
    document.getElementById('dash-issues').textContent = issues.filter(function(i) { return i.status !== 'resolved'; }).length;

    var inc = 0, exp = 0;
    finances.forEach(function(f) {
      if (f.type === 'donation') inc += parseFloat(f.amount);
      else exp += parseFloat(f.amount);
    });
    document.getElementById('dash-income').textContent = formatCurrency(inc);
    document.getElementById('dash-balance').textContent = formatCurrency(inc - exp);
    var balEl = document.getElementById('dash-balance');
    balEl.style.color = (inc - exp) < 0 ? 'var(--danger)' : 'var(--text)';

    var actHtml = '';
    var recent = finances.slice(-3).reverse();
    if (recent.length === 0) actHtml = '<p style="color:var(--text-muted);text-align:center;font-size:0.85rem">' + t('noActivity') + '</p>';
    recent.forEach(function(f) {
      actHtml += '<div style="font-size:0.85rem;padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">';
      actHtml += '<span>' + escapeHtml(f.desc || f.name) + '</span>';
      actHtml += '<span style="color:' + (f.type === 'donation' ? 'var(--success)' : 'var(--danger)') + ';">' + (f.type === 'donation' ? '+' : '-') + formatCurrency(f.amount) + '</span></div>';
    });
    document.getElementById('dash-activity').innerHTML = actHtml;

    var upcHtml = '';
    var next7 = new Date(); next7.setDate(next7.getDate() + 7);
    var upcoming = equipment.filter(function(e) { return e.next && new Date(e.next) <= next7 && e.status !== 'archived'; });
    if (upcoming.length === 0) upcHtml = '<p style="color:var(--text-muted);text-align:center;font-size:0.85rem">' + t('noMaint') + '</p>';
    upcoming.forEach(function(e) {
      upcHtml += '<div style="font-size:0.85rem;padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">';
      actHtml += '<span>' + escapeHtml(e.name) + ' (' + escapeHtml(e.location) + ')</span>';
      actHtml += '<span style="color:var(--warning)">' + formatDate(e.next) + '</span></div>';
    });
    document.getElementById('dash-upcoming').innerHTML = upcHtml;
  },
  renderReports: function(issues, finances, equipment) {
    var inc = 0, exp = 0;
    finances.forEach(function(f) {
      if (f.type === 'donation') inc += parseFloat(f.amount);
      else exp += parseFloat(f.amount);
    });

    var ctx = document.getElementById('financeChart');
    if (ctx) {
      if (chartInstance) chartInstance.destroy();
      chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: [t('incomeLabel'), t('expenseLabel')],
          datasets: [{ data: [inc, exp], backgroundColor: ['#10b981', '#ef4444'], borderWidth: 0, hoverOffset: 10 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: 'var(--text)' } } }, cutout: '75%' }
      });
    }

    var catExp = {};
    finances.forEach(function(f) {
      if (f.type === 'expense') {
        var cat = f.category || t('other');
        catExp[cat] = (catExp[cat] || 0) + parseFloat(f.amount);
      }
    });

    var cCtx = document.getElementById('categoryChart');
    if (cCtx) {
      if (categoryChartInstance) categoryChartInstance.destroy();
      categoryChartInstance = new Chart(cCtx, {
        type: 'bar',
        data: {
          labels: Object.keys(catExp).map(function(k) { return t(k); }),
          datasets: [{ label: t('expenseLabel'), data: Object.values(catExp), backgroundColor: '#3b82f6', borderRadius: 6 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } } }
      });
    }

    var catHtml = '';
    if (exp > 0) {
      Object.keys(catExp).forEach(function(k) {
        var p = ((catExp[k] / exp) * 100).toFixed(1);
        catHtml += '<tr><td>' + t(k) + '</td><td>' + formatCurrency(catExp[k]) + '</td><td><span class="badge-modern" style="background:var(--primary-glow);color:var(--primary)">' + p + '%</span></td></tr>';
      });
    } else {
      catHtml = '<tr><td colspan="3" class="text-center" style="color:var(--text-muted)">' + t('emptyExpenses') + '</td></tr>';
    }
    document.getElementById('cat-table').innerHTML = catHtml;

    var eqHtml = '';
    var hasHighCost = false;
    equipment.forEach(function(e) {
      var history = e.maintenanceHistory || [];
      var totalCost = history.reduce(function(sum, r) { return sum + (parseFloat(r.cost) || 0); }, 0);
      var est = parseFloat(e.estimatedValue) || 0;
      if (est > 0 && (totalCost / est) > 0.5) {
        hasHighCost = true;
        var r = (totalCost / est) * 100;
        var alertClass = r > 80 ? 'alert-red' : 'alert-orange';
        var rec = r > 80 ? t('replaceUrgent') : t('replaceSoon');
        eqHtml += '<tr class="' + alertClass + '"><td>' + escapeHtml(e.name) + '</td><td>' + formatCurrency(est) + '</td><td>' + formatCurrency(totalCost) + '</td><td><strong>' + r.toFixed(1) + '%</strong></td><td>' + rec + '</td></tr>';
      }
    });
    if (!hasHighCost) eqHtml = '<tr><td colspan="5" class="text-center" style="color:var(--text-muted)">' + t('emptyHighCost') + '</td></tr>';
    document.getElementById('eq-report-table').innerHTML = eqHtml;

    var techMap = {};
    equipment.forEach(function(e) {
      (e.maintenanceHistory || []).forEach(function(r) {
        if (r.technician && r.technician.trim() !== '') {
          var tName = r.technician.trim();
          if (!techMap[tName]) techMap[tName] = { count: 0, cost: 0, devices: new Set() };
          techMap[tName].count++;
          techMap[tName].cost += (parseFloat(r.cost) || 0);
          techMap[tName].devices.add(e.id);
        }
      });
    });
    var techHtml = '';
    var techKeys = Object.keys(techMap);
    if (techKeys.length > 0) {
      techKeys.sort(function(a, b) { return techMap[b].count - techMap[a].count; }).forEach(function(tName) {
        var d = techMap[tName];
        techHtml += '<tr><td>' + escapeHtml(tName) + '</td><td>' + d.count + '</td><td>' + d.devices.size + '</td><td>' + formatCurrency(d.cost) + '</td><td>' + (d.count / d.devices.size).toFixed(1) + '</td></tr>';
      });
    } else {
      techHtml = '<tr><td colspan="5" class="text-center" style="color:var(--text-muted)">' + t('emptyTechData') + '</td></tr>';
    }
    document.getElementById('tech-table').innerHTML = techHtml;

    var monthData = Array(12).fill(0);
    issues.forEach(function(i) {
      var d = new Date(i.date || i.resolvedAt || Date.now());
      monthData[d.getMonth()]++;
    });

    var tCtx = document.getElementById('trendChart');
    if (tCtx) {
      if (trendChartInstance) trendChartInstance.destroy();
      trendChartInstance = new Chart(tCtx, {
        type: 'line',
        data: {
          labels: t('months'),
          datasets: [{ label: t('tabIssues'), data: monthData, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      });
    }

    document.getElementById('print-gen-date').textContent = formatDate(new Date());
    document.getElementById('print-issues-total').textContent = issues.length;
    document.getElementById('print-issues-resolved').textContent = issues.filter(function(i) { return i.status === 'resolved'; }).length;
    document.getElementById('print-equipment-count').textContent = equipment.length;
    document.getElementById('print-maint-cost').textContent = formatCurrency(exp);
  }
};

// ---------- Modal Forms ----------
function openModal(type, id) {
  var modal = document.getElementById('universal-modal');
  var content = document.getElementById('modal-content');
  var html = '';
  currentEdit = { type: type, id: id };
  var isEdit = !!id;
  var title = isEdit ? t('edit') : t('add');

  if (type === 'task') {
    html = '<div class="flex-between"><h3><i class="fas fa-tasks"></i> ' + title + ' ' + t('task') + '</h3><button onclick="closeModal()" style="background:none;border:none;font-size:24px;cursor:pointer">&times;</button></div>';
    html += '<input id="task-title" placeholder="' + t('taskTitlePlaceholder') + '" required>';
    html += '<select id="task-priority"><option value="normal">' + t('priorityNormal') + '</option><option value="high">' + t('priorityHigh') + '</option><option value="low">' + t('priorityLow') + '</option></select>';
    html += '<select id="task-period"><option value="morning">' + t('taskMorning') + '</option><option value="afternoon">' + t('taskAfternoon') + '</option><option value="evening">' + t('taskEvening') + '</option></select>';
    html += '<textarea id="task-notes" placeholder="' + t('taskNotes') + '"></textarea>';
    html += '<button onclick="saveModal()" class="btn btn-primary btn-full">' + t('save') + '</button>';
  } else if (type === 'issue') {
    html = '<div class="flex-between"><h3><i class="fas fa-exclamation-triangle"></i> ' + title + ' ' + t('fault') + '</h3><button onclick="closeModal()" style="background:none;border:none;font-size:24px;cursor:pointer">&times;</button></div>';
    html += '<input id="issue-loc" placeholder="' + t('issueLocation') + ' (مثال: ' + t('mainPrayerHall') + ')" required>';
    html += '<select id="issue-eq"><option value="">' + t('selectEquip') + '</option>';
    equipmentOptions.forEach(function(e) { html += '<option value="' + e.id + '">' + escapeHtml(e.name) + ' - ' + escapeHtml(e.location) + '</option>'; });
    html += '</select>';
    html += '<textarea id="issue-desc" placeholder="' + t('issueDesc') + '" required></textarea>';
    html += '<button onclick="saveModal()" class="btn btn-primary btn-full">' + t('save') + '</button>';
  } else if (type === 'donation') {
    html = '<div class="flex-between"><h3><i class="fas fa-hand-holding-usd"></i> ' + title + ' ' + t('donation') + '</h3><button onclick="closeModal()" style="background:none;border:none;font-size:24px;cursor:pointer">&times;</button></div>';
    html += '<input id="donor-name" placeholder="' + t('donorName') + '">';
    html += '<input type="number" id="amount" placeholder="' + t('amount') + '" required min="1">';
    html += '<select id="purpose"><option value="general">' + t('general') + '</option><option value="maintenance">' + t('maintenance') + '</option></select>';
    html += '<button onclick="saveModal()" class="btn btn-success btn-full">' + t('save') + '</button>';
  } else if (type === 'expense') {
    html = '<div class="flex-between"><h3><i class="fas fa-file-invoice-dollar"></i> ' + title + ' ' + t('expense') + '</h3><button onclick="closeModal()" style="background:none;border:none;font-size:24px;cursor:pointer">&times;</button></div>';
    html += '<input id="expense-desc" placeholder="' + t('expenseDesc') + '" required>';
    html += '<input type="number" id="expense-amount" placeholder="' + t('amount') + '" required min="1">';
    html += '<select id="expense-cat"><option value="maintenance">' + t('maintenance') + '</option><option value="invoice">' + t('invoice') + '</option><option value="general">' + t('general') + '</option></select>';
    html += '<button onclick="saveModal()" class="btn btn-danger btn-full">' + t('save') + '</button>';
  } else if (type === 'equipment') {
    html = '<div class="flex-between"><h3><i class="fas fa-server"></i> ' + title + ' ' + t('device') + '</h3><button onclick="closeModal()" style="background:none;border:none;font-size:24px;cursor:pointer">&times;</button></div>';
    html += '<input id="equip-name" placeholder="' + t('equipName') + '" required>';
    html += '<input id="equip-location" placeholder="' + t('equipLocation') + ' (' + t('prayerHall') + '...)" required>';
    html += '<input type="number" id="equip-value" placeholder="' + t('equipValue') + '" min="0" step="0.01">';
    html += '<label style="display:block;margin-bottom:4px;font-size:0.8rem;color:var(--text-muted)">' + t('equipNext') + '</label>';
    html += '<input type="date" id="equip-next">';
    html += '<textarea id="equip-notes" placeholder="' + t('equipNotes') + '"></textarea>';
    html += '<div id="equip-archived-msg" style="display:none;background:var(--warning);color:white;padding:8px;border-radius:4px;margin-bottom:12px;font-size:0.85rem;"><i class="fas fa-info-circle"></i> ' + t('equipArchivedNote') + '</div>';
    html += '<button id="equip-save-btn" onclick="saveModal()" class="btn btn-primary btn-full">' + t('save') + '</button>';
  }
  content.innerHTML = html;
  modal.style.display = 'flex';

  if (isEdit) {
    var store = type === 'task' ? 'tasks' : type === 'issue' ? 'issues' : type === 'equipment' ? 'equipment' : 'finances';
    dbGetAll(store).then(function(items) {
      var item = items.find(function(i) { return i.id === id; });
      if (!item) return;
      if (type === 'task') {
        document.getElementById('task-title').value = item.title;
        document.getElementById('task-priority').value = item.priority;
        document.getElementById('task-period').value = item.period;
        document.getElementById('task-notes').value = item.notes || '';
      } else if (type === 'issue') {
        document.getElementById('issue-loc').value = item.location;
        document.getElementById('issue-eq').value = item.equipmentId || '';
        document.getElementById('issue-desc').value = item.desc;
      } else if (type === 'donation') {
        document.getElementById('donor-name').value = item.name || '';
        document.getElementById('amount').value = item.amount;
        document.getElementById('purpose').value = item.purpose;
      } else if (type === 'expense') {
        document.getElementById('expense-desc').value = item.desc;
        document.getElementById('expense-amount').value = item.amount;
        document.getElementById('expense-cat').value = item.category || 'maintenance';
      } else if (type === 'equipment') {
        document.getElementById('equip-name').value = item.name;
        document.getElementById('equip-location').value = item.location;
        document.getElementById('equip-value').value = item.estimatedValue || 0;
        document.getElementById('equip-next').value = item.next || '';
        document.getElementById('equip-notes').value = item.notes || '';
        if (item.status === 'archived') {
          document.getElementById('equip-archived-msg').style.display = 'block';
          document.getElementById('equip-save-btn').innerHTML = '<i class="fas fa-undo"></i> ' + t('reactivateSave');
        }
      }
    });
  }
}

function closeModal() {
  document.getElementById('universal-modal').style.display = 'none';
  currentEdit = { type: null, id: null };
}

function saveModal() {
  var type = currentEdit.type;
  var data = {};
  var promise;

  if (type === 'task') {
    data = { title: document.getElementById('task-title').value, priority: document.getElementById('task-priority').value, period: document.getElementById('task-period').value, notes: document.getElementById('task-notes').value, date: new Date().toISOString().slice(0, 10), completed: false };
    if (currentEdit.id) {
      promise = dbGetAll('tasks').then(function(tasks) {
        var old = tasks.find(function(t) { return t.id === currentEdit.id; });
        if (old) { data = Object.assign({}, old, data); }
        return dbUpdate('tasks', data);
      });
    } else {
      promise = dbAdd('tasks', data);
    }
  } else if (type === 'issue') {
    var eqSelect = document.getElementById('issue-eq');
    data = { location: document.getElementById('issue-loc').value, equipmentId: eqSelect.value ? parseInt(eqSelect.value) : null, equipment: eqSelect.options[eqSelect.selectedIndex].text.replace('-- اختر الجهاز --', '').replace('-- Select Equipment --', ''), desc: document.getElementById('issue-desc').value, date: new Date().toISOString(), status: 'open' };
    if (currentEdit.id) {
      promise = dbGetAll('issues').then(function(issues) {
        var old = issues.find(function(i) { return i.id === currentEdit.id; });
        if (old) { data = Object.assign({}, old, data); }
        if (!data.status) data.status = 'open';
        return dbUpdate('issues', data);
      });
    } else {
      promise = dbAdd('issues', data);
    }
  } else if (type === 'donation') {
    data = { type: 'donation', name: document.getElementById('donor-name').value, amount: parseFloat(document.getElementById('amount').value), purpose: document.getElementById('purpose').value, date: new Date().toISOString() };
    if (currentEdit.id) {
      promise = dbGetAll('finances').then(function(fins) {
        var old = fins.find(function(f) { return f.id === currentEdit.id; });
        if (old) { data = Object.assign({}, old, data); }
        return dbUpdate('finances', data);
      });
    } else {
      promise = dbAdd('finances', data);
    }
  } else if (type === 'expense') {
    data = { type: 'expense', desc: document.getElementById('expense-desc').value, amount: parseFloat(document.getElementById('expense-amount').value), category: document.getElementById('expense-cat').value, date: new Date().toISOString() };
    if (currentEdit.id) {
      promise = dbGetAll('finances').then(function(fins) {
        var old = fins.find(function(f) { return f.id === currentEdit.id; });
        if (old) { data = Object.assign({}, old, data); }
        return dbUpdate('finances', data);
      });
    } else {
      promise = dbAdd('finances', data);
    }
  } else if (type === 'equipment') {
    var nameVal = document.getElementById('equip-name').value;
    data = { name: nameVal, location: document.getElementById('equip-location').value, estimatedValue: parseFloat(document.getElementById('equip-value').value) || 0, next: document.getElementById('equip-next').value, notes: document.getElementById('equip-notes').value, maintenanceHistory: [] };
    if (currentEdit.id) {
      promise = dbGetAll('equipment').then(function(eqs) {
        var old = eqs.find(function(e) { return e.id === currentEdit.id; });
        if (old) { data = Object.assign({}, old, data); }
        if (!data.maintenanceHistory) data.maintenanceHistory = [];
        delete data.status;
        return dbUpdate('equipment', data);
      });
    } else {
      promise = generateNextId(nameVal).then(function(uid) {
        data.uniqueId = uid;
        return dbAdd('equipment', data);
      });
    }
  }

  closeModal();
  if (promise) {
    promise.then(function() { App.refresh(); }).catch(function(err) { console.error('Save error:', err); });
  }
}
