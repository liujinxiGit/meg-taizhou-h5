(function (root) {
  "use strict";
  var STATUS_ORDER = ["new", "wechat_added", "booked", "visited", "converted"];
  var STATUS_LABELS = { new:"新线索", wechat_added:"已加微信", booked:"已预约", visited:"已到店", converted:"已成交", invalid:"无效", closed:"已关闭" };
  var SERVICE_LABELS = { open_gym:"自由训练", personal_training:"塑形私教", reformer_pilates:"器械普拉提", posture_training:"体态纠正", physical_reconditioning:"物理重建", weightlifting:"举重训练", functional_training:"功能性训练", mobility_recovery:"拉伸恢复", sports_performance:"运动表现", boxing:"拳击训练", youth_fitness:"青少儿体适能", group_classes:"团体课程", other:"其他" };
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
  function containsForbiddenCsvField(headers) { return (headers || []).some(function (name) { return /name|phone|mobile|wechat|ip|姓名|手机|微信/i.test(name); }); }
  root.MEG_OPS_UTILS = { buildQuery:buildQuery, statusRequiresConfirmation:statusRequiresConfirmation, containsForbiddenCsvField:containsForbiddenCsvField };
  if (!root.document) return;

  var document = root.document;
  var state = { filters:{}, page:1, pageSize:20, total:0, items:[], activeLead:null };
  var toastTimer = 0;
  function escapeHtml(value) { return String(value === null || value === undefined ? "" : value).replace(/[&<>'"]/g, function (char) { return ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]; }); }
  function formatTime(value) { if (!value) return "—"; try { return new Intl.DateTimeFormat("zh-CN", { dateStyle:"short", timeStyle:"short", timeZone:"Asia/Shanghai" }).format(new Date(value)); } catch (error) { return value; } }
  function showToast(message) { var toast = document.getElementById("opsToast"); if (!toast) return; root.clearTimeout(toastTimer); toast.textContent = message; toast.classList.add("show"); toastTimer = root.setTimeout(function () { toast.classList.remove("show"); }, 2200); }
  function setAuth(ok, text) { var element = document.getElementById("authState"); if (!element) return; element.classList.toggle("ok", ok); element.classList.toggle("error", !ok); element.querySelector("span").textContent = text; }
  function fetchJson(url, options) {
    return root.fetch(url, Object.assign({ credentials:"same-origin", headers:{ "Accept":"application/json" } }, options || {}, {
      headers:Object.assign({ "Accept":"application/json" }, (options && options.headers) || {})
    })).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (response.status === 401) throw new Error("unauthorized");
        if (!response.ok) throw new Error(payload.error || "request_failed");
        return payload;
      });
    });
  }

  function renderSummary(data) {
    var bookingTotals = { today_bookings:Number(data.bookings && data.bookings.today || 0), week_bookings:Number(data.bookings && data.bookings.week || 0) };
    Object.keys(bookingTotals).forEach(function (key) { var target = document.querySelector('[data-summary="' + key + '"]'); if (target) target.textContent = bookingTotals[key]; });
    Object.keys(data.today || {}).forEach(function (key) { var target = document.querySelector('[data-summary="' + key + '"]'); if (target) target.textContent = data.today[key]; });
    var trend = data.trend7d || [], maximum = Math.max.apply(Math, trend.map(function (item) { return Number(item.count); }).concat([1]));
    document.getElementById("trendChart").innerHTML = trend.length ? trend.map(function (item) { return '<div class="bar-item"><b>' + Number(item.count) + '</b><i style="height:' + Math.max(3, Math.round(Number(item.count) / maximum * 72)) + 'px"></i><span>' + escapeHtml(item.date.slice(5)) + '</span></div>'; }).join("") : '<p class="empty">近 7 天暂无新增</p>';
    var groups = [["项目", data.services, SERVICE_LABELS], ["来源", data.sources, null], ["语言", data.languages, {"zh-CN":"中文",en:"English"}]];
    document.getElementById("breakdown").innerHTML = groups.map(function (group) { return '<div class="breakdown-row"><b>' + group[0] + '</b><div>' + ((group[1] || []).map(function (item) { var key = item.service || item.source || item.language; return '<span>' + escapeHtml((group[2] && group[2][key]) || key) + ' · ' + Number(item.count) + '</span>'; }).join("") || '<span>暂无数据</span>') + '</div></div>'; }).join("");
  }

  function leadRow(item) {
    return '<tr data-claim-code="' + escapeHtml(item.claim_code) + '"><td class="claim-code">' + escapeHtml(item.claim_code) + '</td><td>' + escapeHtml(formatTime(item.created_at)) + '</td><td>' + escapeHtml(SERVICE_LABELS[item.service] || item.service) + '</td><td>' + escapeHtml(item.source) + '</td><td>' + escapeHtml(item.language) + '</td><td>泰州路</td><td><span class="stage-pill">' + escapeHtml(STAGE_LABELS[item.event_stage] || item.event_stage) + '</span></td><td><span class="status-pill ' + escapeHtml(item.status) + '">' + escapeHtml(STATUS_LABELS[item.status] || item.status) + '</span></td><td class="note-summary">' + escapeHtml(item.note || "—") + '</td></tr>';
  }
  function leadCard(item) {
    return '<button class="lead-card" type="button" data-claim-code="' + escapeHtml(item.claim_code) + '"><div class="lead-card-top"><strong class="claim-code">' + escapeHtml(item.claim_code) + '</strong><span class="status-pill ' + escapeHtml(item.status) + '">' + escapeHtml(STATUS_LABELS[item.status] || item.status) + '</span></div><p>' + escapeHtml(SERVICE_LABELS[item.service] || item.service) + ' · ' + escapeHtml(formatTime(item.created_at)) + '<br>来源：' + escapeHtml(item.source) + (item.note ? '<br>备注：' + escapeHtml(item.note.slice(0, 70)) : '') + '</p><div class="lead-card-meta"><span class="stage-pill">' + escapeHtml(STAGE_LABELS[item.event_stage] || item.event_stage) + '</span><span class="stage-pill">' + escapeHtml(item.language) + '</span></div></button>';
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
  function loadSummary() { return fetchJson("/api/ops/summary").then(function (data) { renderSummary(data); setAuth(true, "Cloudflare Access 登录有效"); }, function (error) { setAuth(false, error.message === "unauthorized" ? "未通过 Cloudflare Access 验证" : "后台 API 暂时不可用"); }); }
  function loadLeads() { var query = buildQuery(state.filters, state.page, state.pageSize); return fetchJson("/api/ops/leads?" + query).then(renderLeads).catch(function () { renderLeads({ items:[], total:0 }); showToast("线索列表加载失败"); }); }
  function refreshAll() { return Promise.all([loadSummary(), loadLeads()]); }

  function detailMarkup(lead) {
    var details = [["预约编号",lead.claim_code],["创建时间",formatTime(lead.created_at)],["项目",SERVICE_LABELS[lead.service] || lead.service],["来源",lead.source],["语言",lead.language],["门店",lead.store],["设备",lead.device_type || "—"],["浏览器",lead.browser_family || "—"],["操作阶段",STAGE_LABELS[lead.event_stage] || lead.event_stage],["当前状态",STATUS_LABELS[lead.status] || lead.status]];
    var statusButtons = Object.keys(STATUS_LABELS).map(function (status) { return '<button class="status-button ' + (status === lead.status ? 'active' : '') + '" type="button" data-status="' + status + '">' + STATUS_LABELS[status] + '</button>'; }).join("");
    var history = [{ from_status:"", to_status:"new", changed_at:lead.created_at }].concat(lead.status_history || []);
    return '<div class="detail-grid">' + details.map(function (item) { return '<div><span>' + item[0] + '</span><strong>' + escapeHtml(item[1]) + '</strong></div>'; }).join("") + '</div><section class="detail-section"><h3>更新状态</h3><div class="status-actions">' + statusButtons + '</div></section><section class="detail-section"><h3>店长备注</h3><textarea class="note-field" id="leadNote" maxlength="2000" placeholder="仅填写跟进备注，不要记录不必要的个人信息。">' + escapeHtml(lead.note || "") + '</textarea><button class="button primary" id="saveNoteButton" type="button">保存备注</button></section><section class="detail-section"><h3>状态时间线</h3><ol class="timeline">' + history.map(function (item) { return '<li><strong>' + escapeHtml(STATUS_LABELS[item.to_status] || item.to_status) + '</strong><time>' + escapeHtml(formatTime(item.changed_at)) + '</time></li>'; }).join("") + '</ol></section>';
  }
  function openDetail(claimCode) { fetchJson("/api/ops/leads/" + encodeURIComponent(claimCode)).then(function (data) { state.activeLead = data.lead; document.getElementById("detailContent").innerHTML = detailMarkup(data.lead); var panel = document.getElementById("detailPanel"); panel.hidden = false; panel.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; }).catch(function () { showToast("详情加载失败"); }); }
  function closeDetail() { var panel = document.getElementById("detailPanel"); panel.hidden = true; panel.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }
  function updateLead(patch) { if (!state.activeLead) return Promise.resolve(); return fetchJson("/api/ops/leads/" + encodeURIComponent(state.activeLead.claim_code), { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(patch) }).then(function (data) { state.activeLead = data.lead; document.getElementById("detailContent").innerHTML = detailMarkup(data.lead); showToast("线索已更新"); return refreshAll(); }).catch(function () { showToast("更新失败，请重试"); }); }

  document.addEventListener("click", function (event) {
    var target = event.target;
    var leadTarget = target.closest && target.closest("[data-claim-code]");
    if (leadTarget) { openDetail(leadTarget.dataset.claimCode); return; }
    if (target.closest && target.closest("[data-close-detail]")) { closeDetail(); return; }
    var statusButton = target.closest && target.closest("[data-status]");
    if (statusButton && state.activeLead) { var next = statusButton.dataset.status; if (next === state.activeLead.status) return; if (statusRequiresConfirmation(state.activeLead.status, next) && !root.confirm("这是状态回退或关闭操作，确认继续吗？")) return; updateLead({ status:next }); return; }
    if (target.id === "saveNoteButton") { updateLead({ note:document.getElementById("leadNote").value }); return; }
    if (target.id === "refreshButton") { refreshAll(); return; }
    if (target.id === "resetButton") { document.getElementById("filterForm").reset(); state.filters = {}; state.page = 1; loadLeads(); return; }
    if (target.id === "prevPage" && state.page > 1) { state.page -= 1; loadLeads(); return; }
    if (target.id === "nextPage" && state.page * state.pageSize < state.total) { state.page += 1; loadLeads(); return; }
    if (target.id === "exportButton") { var params = new URLSearchParams(buildQuery(state.filters)); params.set("format", "csv"); root.location.href = "/api/ops/leads?" + params.toString(); }
  });
  document.getElementById("filterForm").addEventListener("submit", function (event) { event.preventDefault(); var data = new FormData(event.currentTarget); state.filters = {}; data.forEach(function (value, key) { if (String(value).trim()) state.filters[key] = String(value).trim(); }); state.page = 1; loadLeads(); });
  document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeDetail(); });
  refreshAll();
})(typeof window !== "undefined" ? window : globalThis);
