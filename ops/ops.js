(function (root) {
  "use strict";
  var STATUS_ORDER = ["new", "wechat_added", "booked", "visited", "converted"];
  var STATUS_LABELS = { new:"新线索", wechat_added:"已加微信", booked:"已预约", visited:"已到店", converted:"已成交", duplicate:"重复", invalid:"无效", closed:"已关闭" };
  var SERVICE_LABELS = { open_gym:"自由训练", personal_training:"塑形私教", reformer_pilates:"器械普拉提", posture_training:"体态纠正", physical_reconditioning:"运动功能重建", weightlifting:"举重训练", functional_training:"功能性训练", mobility_recovery:"拉伸恢复", sports_performance:"运动表现", boxing:"拳击训练", youth_fitness:"青少儿体适能", group_classes:"团体课程", other:"其他" };
  var STAGE_LABELS = { claim_opened:"已打开预约", message_copied:"已复制话术", wechat_qr_viewed:"已查看二维码" };

  function buildQuery(filters, page, pageSize) {
    var params = new URLSearchParams();
    Object.keys(filters || {}).forEach(function (key) { if (filters[key]) params.set(key, filters[key]); });
    if (page) params.set("page", String(page));
    if (pageSize) params.set("pageSize", String(pageSize));
    return params.toString();
  }
  function statusRequiresConfirmation(current, next) {
    var currentIndex = STATUS_ORDER.indexOf(current), nextIndex = STATUS_ORDER.indexOf(next);
    if (current === next) return false;
    if (currentIndex < 0) return true;
    return nextIndex < currentIndex || nextIndex < 0;
  }
  function containsForbiddenCsvField(headers) { return (headers || []).some(function (name) { return /client|group|name|phone|mobile|wechat|ip|姓名|手机|微信/i.test(name); }); }
  root.MEG_OPS_UTILS = { buildQuery:buildQuery, statusRequiresConfirmation:statusRequiresConfirmation, containsForbiddenCsvField:containsForbiddenCsvField };
  if (!root.document) return;

  var document = root.document;
  var state = {
    authenticated:false,
    filters:{}, page:1, pageSize:20, total:0, items:[], activeLead:null, view:"leads",
    trash:{ search:"", page:1, pageSize:20, total:0, items:[] }
  };
  var toastTimer = 0;
  function escapeHtml(value) { return String(value === null || value === undefined ? "" : value).replace(/[&<>'"]/g, function (char) { return ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]; }); }
  function formatTime(value) { if (!value) return "—"; try { return new Intl.DateTimeFormat("zh-CN", { dateStyle:"short", timeStyle:"short", timeZone:"Asia/Shanghai" }).format(new Date(value)); } catch (error) { return value; } }
  function showToast(message) { var toast = document.getElementById("opsToast"); if (!toast) return; root.clearTimeout(toastTimer); toast.textContent = message; toast.classList.add("show"); toastTimer = root.setTimeout(function () { toast.classList.remove("show"); }, 2200); }
  function setAuth(ok, text) { var element = document.getElementById("authState"); if (!element) return; element.classList.toggle("ok", ok); element.classList.toggle("error", !ok); element.querySelector("span").textContent = text; }
  function resetDashboardState() {
    state.authenticated = false; state.items = []; state.total = 0; state.activeLead = null; state.view = "leads";
    state.trash = { search:"", page:1, pageSize:20, total:0, items:[] };
    closeDetail();
  }
  function showLogin(message) {
    resetDashboardState();
    document.getElementById("loginScreen").hidden = false;
    document.getElementById("opsHeader").hidden = true;
    document.getElementById("dashboard").hidden = true;
    document.getElementById("loginError").textContent = message || "";
    root.setTimeout(function () { document.getElementById("opsPassword").focus(); }, 0);
  }
  function showDashboard() {
    state.authenticated = true;
    document.getElementById("loginScreen").hidden = true;
    document.getElementById("opsHeader").hidden = false;
    document.getElementById("dashboard").hidden = false;
    document.getElementById("loginError").textContent = "";
    setAuth(true, "已登录 · 30 天会话");
  }
  function fetchJson(url, options, suppressAuthReset) {
    return root.fetch(url, Object.assign({ credentials:"same-origin", headers:{ "Accept":"application/json" } }, options || {}, {
      headers:Object.assign({ "Accept":"application/json" }, (options && options.headers) || {})
    })).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (response.status === 401) {
          if (!suppressAuthReset) showLogin("登录已失效，请重新登录");
          var unauthorized = new Error(payload.error || "unauthorized"); unauthorized.status = 401; throw unauthorized;
        }
        if (!response.ok) { var failure = new Error(payload.error || "request_failed"); failure.status = response.status; failure.retryAfter = response.headers.get("Retry-After") || ""; throw failure; }
        return payload;
      });
    });
  }

  function renderSummary(data) {
    var totals = {
      today_bookings:Number(data.bookings && data.bookings.today || 0),
      week_bookings:Number(data.bookings && data.bookings.week || 0),
      trash_count:Number(data.trashCount || 0)
    };
    Object.keys(totals).forEach(function (key) { var target = document.querySelector('[data-summary="' + key + '"]'); if (target) target.textContent = totals[key]; });
    document.getElementById("trashBadge").textContent = totals.trash_count;
    Object.keys(data.today || {}).forEach(function (key) { var target = document.querySelector('[data-summary="' + key + '"]'); if (target) target.textContent = data.today[key]; });
    var trend = data.trend7d || [], maximum = Math.max.apply(Math, trend.map(function (item) { return Number(item.count); }).concat([1]));
    document.getElementById("trendChart").innerHTML = trend.length ? trend.map(function (item) { return '<div class="bar-item"><b>' + Number(item.count) + '</b><i style="height:' + Math.max(3, Math.round(Number(item.count) / maximum * 72)) + 'px"></i><span>' + escapeHtml(item.date.slice(5)) + '</span></div>'; }).join("") : '<p class="empty">近 7 天暂无新增</p>';
    var groups = [["项目", data.services, SERVICE_LABELS], ["来源", data.sources, null], ["语言", data.languages, {"zh-CN":"中文",en:"English"}]];
    document.getElementById("breakdown").innerHTML = groups.map(function (group) { return '<div class="breakdown-row"><b>' + group[0] + '</b><div>' + ((group[1] || []).map(function (item) { var key = item.service || item.source || item.language; return '<span>' + escapeHtml((group[2] && group[2][key]) || key) + ' · ' + Number(item.count) + '</span>'; }).join("") || '<span>暂无数据</span>') + '</div></div>'; }).join("");
  }

  function suspiciousBadge(item) { return Number(item.suspicious_count || 0) >= 2 ? '<span class="suspicious-pill">疑似重复 · 同组 ' + Number(item.suspicious_count) + ' 条</span>' : ''; }
  function leadRow(item) {
    return '<tr data-claim-code="' + escapeHtml(item.claim_code) + '"><td class="claim-code">' + escapeHtml(item.claim_code) + suspiciousBadge(item) + '</td><td>' + escapeHtml(formatTime(item.created_at)) + '</td><td>' + escapeHtml(SERVICE_LABELS[item.service] || item.service) + '</td><td>' + escapeHtml(item.source) + '</td><td>' + escapeHtml(item.language) + '</td><td>泰州路</td><td><span class="stage-pill">' + escapeHtml(STAGE_LABELS[item.event_stage] || item.event_stage) + '</span></td><td><span class="status-pill ' + escapeHtml(item.status) + '">' + escapeHtml(STATUS_LABELS[item.status] || item.status) + '</span></td><td class="note-summary">' + escapeHtml(item.note || "—") + '</td></tr>';
  }
  function leadCard(item) {
    return '<button class="lead-card" type="button" data-claim-code="' + escapeHtml(item.claim_code) + '"><div class="lead-card-top"><strong class="claim-code">' + escapeHtml(item.claim_code) + '</strong><span class="status-pill ' + escapeHtml(item.status) + '">' + escapeHtml(STATUS_LABELS[item.status] || item.status) + '</span></div>' + suspiciousBadge(item) + '<p>' + escapeHtml(SERVICE_LABELS[item.service] || item.service) + ' · ' + escapeHtml(formatTime(item.created_at)) + '<br>来源：' + escapeHtml(item.source) + (item.note ? '<br>备注：' + escapeHtml(item.note.slice(0, 70)) : '') + '</p><div class="lead-card-meta"><span class="stage-pill">' + escapeHtml(STAGE_LABELS[item.event_stage] || item.event_stage) + '</span><span class="stage-pill">' + escapeHtml(item.language) + '</span></div></button>';
  }
  function renderLeads(data) {
    state.items = data.items || []; state.total = Number(data.total || 0);
    document.getElementById("leadTableBody").innerHTML = state.items.map(leadRow).join("");
    document.getElementById("leadCards").innerHTML = state.items.map(leadCard).join("");
    document.getElementById("leadEmpty").hidden = state.items.length > 0;
    var pages = Math.max(1, Math.ceil(state.total / state.pageSize));
    document.getElementById("pageInfo").textContent = "第 " + state.page + " / " + pages + " 页 · 共 " + state.total + " 条";
    document.getElementById("prevPage").disabled = state.page <= 1;
    document.getElementById("nextPage").disabled = state.page >= pages;
  }
  function trashActions(item) { return '<div class="trash-actions"><button class="button ghost" type="button" data-trash-action="restore" data-trash-code="' + escapeHtml(item.claim_code) + '">恢复</button><button class="button danger" type="button" data-trash-action="purge" data-trash-code="' + escapeHtml(item.claim_code) + '">永久删除</button></div>'; }
  function trashRow(item) { return '<tr><td class="claim-code">' + escapeHtml(item.claim_code) + '</td><td>' + escapeHtml(SERVICE_LABELS[item.service] || item.service) + '</td><td><span class="status-pill ' + escapeHtml(item.status_before_delete || item.status) + '">' + escapeHtml(STATUS_LABELS[item.status_before_delete || item.status] || item.status_before_delete || item.status) + '</span></td><td>' + escapeHtml(formatTime(item.deleted_at)) + '</td><td>' + escapeHtml(item.delete_reason || "—") + '</td><td>' + trashActions(item) + '</td></tr>'; }
  function trashCard(item) { return '<article class="lead-card trash-card"><div class="lead-card-top"><strong class="claim-code">' + escapeHtml(item.claim_code) + '</strong><span class="status-pill ' + escapeHtml(item.status_before_delete || item.status) + '">' + escapeHtml(STATUS_LABELS[item.status_before_delete || item.status] || item.status_before_delete || item.status) + '</span></div><p>' + escapeHtml(SERVICE_LABELS[item.service] || item.service) + ' · 删除于 ' + escapeHtml(formatTime(item.deleted_at)) + '<br>原因：' + escapeHtml(item.delete_reason || "—") + '</p>' + trashActions(item) + '</article>'; }
  function renderTrash(data) {
    state.trash.items = data.items || []; state.trash.total = Number(data.total || 0);
    document.getElementById("trashTableBody").innerHTML = state.trash.items.map(trashRow).join("");
    document.getElementById("trashCards").innerHTML = state.trash.items.map(trashCard).join("");
    document.getElementById("trashEmpty").hidden = state.trash.items.length > 0;
    var pages = Math.max(1, Math.ceil(state.trash.total / state.trash.pageSize));
    document.getElementById("trashPageInfo").textContent = "第 " + state.trash.page + " / " + pages + " 页 · 共 " + state.trash.total + " 条";
    document.getElementById("trashPrevPage").disabled = state.trash.page <= 1;
    document.getElementById("trashNextPage").disabled = state.trash.page >= pages;
  }
  function loadSummary() { return fetchJson("/api/ops/summary").then(function (data) { renderSummary(data); setAuth(true, "已登录 · 30 天会话"); }, function (error) { if (error.status !== 401) setAuth(false, "后台 API 暂时不可用"); }); }
  function loadLeads() { var query = buildQuery(state.filters, state.page, state.pageSize); return fetchJson("/api/ops/leads?" + query).then(renderLeads).catch(function () { renderLeads({ items:[], total:0 }); showToast("线索列表加载失败"); }); }
  function loadTrash() { var query = buildQuery({ search:state.trash.search }, state.trash.page, state.trash.pageSize); return fetchJson("/api/ops/trash?" + query).then(renderTrash).catch(function () { renderTrash({ items:[], total:0 }); showToast("回收站加载失败"); }); }
  function refreshAll() { return Promise.all([loadSummary(), state.view === "trash" ? loadTrash() : loadLeads()]); }
  function showView(view) { state.view = view; document.querySelector('[aria-labelledby="leadListTitle"]').hidden = view !== "leads"; document.getElementById("trashSection").hidden = view !== "trash"; if (view === "trash") loadTrash(); else loadLeads(); }

  function detailMarkup(lead) {
    var details = [["预约编号",lead.claim_code],["创建时间",formatTime(lead.created_at)],["项目",SERVICE_LABELS[lead.service] || lead.service],["来源",lead.source],["语言",lead.language],["门店",lead.store],["设备",lead.device_type || "—"],["浏览器",lead.browser_family || "—"],["操作阶段",STAGE_LABELS[lead.event_stage] || lead.event_stage],["当前状态",STATUS_LABELS[lead.status] || lead.status]];
    var statusButtons = Object.keys(STATUS_LABELS).map(function (status) { return '<button class="status-button ' + (status === lead.status ? 'active' : '') + '" type="button" data-status="' + status + '">' + STATUS_LABELS[status] + '</button>'; }).join("");
    var history = [{ from_status:"", to_status:"new", changed_at:lead.created_at }].concat(lead.status_history || []);
    var suspicious = Number(lead.suspicious_count || 0) >= 2 ? '<section class="detail-section suspicious-group"><h3>疑似重复 · 同组 ' + Number(lead.suspicious_count) + ' 条</h3><div class="group-list">' + (lead.suspicious_group || []).map(function (item) { return '<div><strong>' + escapeHtml(item.claim_code) + '</strong><span>' + escapeHtml(SERVICE_LABELS[item.service] || item.service) + ' · ' + escapeHtml(formatTime(item.created_at)) + '</span></div>'; }).join("") + '</div></section>' : '';
    return '<div class="detail-grid">' + details.map(function (item) { return '<div><span>' + item[0] + '</span><strong>' + escapeHtml(item[1]) + '</strong></div>'; }).join("") + '</div>' + suspicious + '<section class="detail-section"><h3>快捷操作</h3><div class="quick-actions"><button class="button secondary" type="button" data-quick-status="duplicate">标记重复</button><button class="button secondary" type="button" data-quick-status="invalid">标记无效</button><button class="button secondary" type="button" data-quick-status="new">恢复为新线索</button><button class="button danger" id="softDeleteButton" type="button">软删除</button></div></section><section class="detail-section"><h3>更新状态</h3><div class="status-actions">' + statusButtons + '</div></section><section class="detail-section"><h3>店长备注</h3><textarea class="note-field" id="leadNote" maxlength="2000" placeholder="仅填写跟进备注，不要记录不必要的个人信息。">' + escapeHtml(lead.note || "") + '</textarea><button class="button primary" id="saveNoteButton" type="button">保存备注</button></section><section class="detail-section"><h3>状态时间线</h3><ol class="timeline">' + history.map(function (item) { return '<li><strong>' + escapeHtml(STATUS_LABELS[item.to_status] || item.to_status) + '</strong><time>' + escapeHtml(formatTime(item.changed_at)) + '</time></li>'; }).join("") + '</ol></section>';
  }
  function openDetail(claimCode) { fetchJson("/api/ops/leads/" + encodeURIComponent(claimCode)).then(function (data) { state.activeLead = data.lead; document.getElementById("detailContent").innerHTML = detailMarkup(data.lead); var panel = document.getElementById("detailPanel"); panel.hidden = false; panel.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; }).catch(function () { showToast("详情加载失败"); }); }
  function closeDetail() { var panel = document.getElementById("detailPanel"); panel.hidden = true; panel.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; state.activeLead = null; }
  function updateLead(patch) { if (!state.activeLead) return Promise.resolve(); return fetchJson("/api/ops/leads/" + encodeURIComponent(state.activeLead.claim_code), { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(patch) }).then(function (data) { state.activeLead = data.lead; document.getElementById("detailContent").innerHTML = detailMarkup(data.lead); showToast("线索已更新"); return refreshAll(); }).catch(function () { showToast("更新失败，请重试"); }); }
  function softDeleteActive() {
    if (!state.activeLead) return;
    var reason = root.prompt("请输入删除原因（可在回收站恢复）：", "重复点击或测试数据");
    if (!reason || !String(reason).trim()) return;
    if (!root.confirm("确认将 " + state.activeLead.claim_code + " 移入回收站吗？")) return;
    fetchJson("/api/ops/leads/" + encodeURIComponent(state.activeLead.claim_code) + "/trash", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ reason:String(reason).trim() }) }).then(function () { closeDetail(); showToast("已移入回收站"); refreshAll(); }).catch(function () { showToast("软删除失败，请重试"); });
  }
  function restoreTrash(claimCode) { if (!root.confirm("确认恢复 " + claimCode + " 吗？")) return; fetchJson("/api/ops/trash/" + encodeURIComponent(claimCode), { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"restore" }) }).then(function () { showToast("线索已恢复"); refreshAll(); }).catch(function () { showToast("恢复失败，请重试"); }); }
  function purgeTrash(claimCode) {
    var entered = root.prompt("永久删除后不可恢复。请输入完整预约编号确认：", "");
    if (String(entered || "") !== claimCode) { if (entered !== null) showToast("预约编号不匹配"); return; }
    if (!root.confirm("最后确认：永久删除 " + claimCode + " 及全部相关历史？")) return;
    fetchJson("/api/ops/trash/" + encodeURIComponent(claimCode), { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"purge", confirmation:entered }) }).then(function () { showToast("已永久删除"); refreshAll(); }).catch(function () { showToast("永久删除失败，请重试"); });
  }

  function checkSession() {
    return fetchJson("/api/ops/auth/session", { method:"GET" }, true).then(function (data) {
      if (!data.authenticated) throw new Error("unauthorized");
      showDashboard(); return refreshAll();
    }).catch(function (error) {
      showLogin(error.status === 401 ? "" : "后台暂时不可用，请稍后重试");
    });
  }

  function downloadCsv() {
    var params = new URLSearchParams(buildQuery(state.filters)); params.set("format", "csv");
    root.fetch("/api/ops/leads?" + params.toString(), { credentials:"same-origin", headers:{ "Accept":"text/csv" } }).then(function (response) {
      if (response.status === 401) { showLogin("登录已失效，请重新登录"); throw new Error("unauthorized"); }
      if (!response.ok) throw new Error("export_failed");
      return response.blob();
    }).then(function (blob) {
      var link = document.createElement("a"), url = URL.createObjectURL(blob);
      link.href = url; link.download = "meg-operations-leads.csv"; document.body.appendChild(link); link.click(); link.remove();
      root.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }).catch(function (error) { if (error.message !== "unauthorized") showToast("CSV 导出失败，请重试"); });
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    var trashAction = target.closest && target.closest("[data-trash-action]");
    if (trashAction) { if (trashAction.dataset.trashAction === "restore") restoreTrash(trashAction.dataset.trashCode); else purgeTrash(trashAction.dataset.trashCode); return; }
    if (target.closest && target.closest("[data-close-detail]")) { closeDetail(); return; }
    var quickStatus = target.closest && target.closest("[data-quick-status]");
    if (quickStatus) { if (root.confirm("确认执行此状态操作吗？")) updateLead({ status:quickStatus.dataset.quickStatus }); return; }
    var statusButton = target.closest && target.closest("[data-status]");
    if (statusButton && state.activeLead) { var next = statusButton.dataset.status; if (next === state.activeLead.status) return; if (statusRequiresConfirmation(state.activeLead.status, next) && !root.confirm("这是状态回退、重复或关闭操作，确认继续吗？")) return; updateLead({ status:next }); return; }
    var leadTarget = target.closest && target.closest("[data-claim-code]");
    if (leadTarget) { openDetail(leadTarget.dataset.claimCode); return; }
    if (target.id === "saveNoteButton") { updateLead({ note:document.getElementById("leadNote").value }); return; }
    if (target.id === "softDeleteButton") { softDeleteActive(); return; }
    if (target.id === "refreshButton") { refreshAll(); return; }
    if (target.id === "trashButton") { showView("trash"); return; }
    if (target.id === "backToLeadsButton") { showView("leads"); return; }
    if (target.id === "resetButton") { document.getElementById("filterForm").reset(); state.filters = {}; state.page = 1; loadLeads(); return; }
    if (target.id === "trashResetButton") { document.getElementById("trashFilterForm").reset(); state.trash.search = ""; state.trash.page = 1; loadTrash(); return; }
    if (target.id === "prevPage" && state.page > 1) { state.page -= 1; loadLeads(); return; }
    if (target.id === "nextPage" && state.page * state.pageSize < state.total) { state.page += 1; loadLeads(); return; }
    if (target.id === "trashPrevPage" && state.trash.page > 1) { state.trash.page -= 1; loadTrash(); return; }
    if (target.id === "trashNextPage" && state.trash.page * state.trash.pageSize < state.trash.total) { state.trash.page += 1; loadTrash(); return; }
    if (target.id === "exportButton") { downloadCsv(); return; }
    if (target.id === "logoutButton") {
      fetchJson("/api/ops/auth/logout", { method:"POST" }, true).catch(function () {}).then(function () { showLogin(""); });
    }
  });
  document.getElementById("loginForm").addEventListener("submit", function (event) {
    event.preventDefault();
    var passwordInput = document.getElementById("opsPassword"), button = document.getElementById("loginButton"), errorTarget = document.getElementById("loginError");
    var password = passwordInput.value;
    errorTarget.textContent = ""; button.disabled = true; button.textContent = "正在登录…";
    fetchJson("/api/ops/auth/login", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ password:password }) }, true).then(function () {
      document.getElementById("loginForm").reset(); showDashboard(); return refreshAll();
    }).catch(function (error) {
      if (error.status === 429) errorTarget.textContent = "尝试次数过多，请稍后再试";
      else if (error.status === 401) errorTarget.textContent = "密码不正确，请重新输入";
      else errorTarget.textContent = "后台认证暂时不可用，请联系管理员";
      passwordInput.select();
    }).then(function () { button.disabled = false; button.textContent = "登录"; });
  });
  document.getElementById("filterForm").addEventListener("submit", function (event) { event.preventDefault(); var data = new FormData(event.currentTarget); state.filters = {}; data.forEach(function (value, key) { if (String(value).trim()) state.filters[key] = String(value).trim(); }); state.page = 1; loadLeads(); });
  document.getElementById("trashFilterForm").addEventListener("submit", function (event) { event.preventDefault(); state.trash.search = document.getElementById("trashSearchInput").value.trim(); state.trash.page = 1; loadTrash(); });
  document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeDetail(); });
  checkSession();
})(typeof window !== "undefined" ? window : globalThis);
