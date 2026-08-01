(function (root) {
  "use strict";

  var EXPERIENCE_CONTENT = {
    "zh-CN": {
      "open-gym": {
        title: "自由训练体验周卡",
        message: "你好，我从MEG FITNESS泰州路店开业宣传单扫码进入，想领取自由训练体验周卡。"
      },
      "personal-training": {
        title: "塑形私教体验课",
        message: "你好，我从MEG FITNESS泰州路店开业宣传单扫码进入，想预约塑形私教体验。"
      },
      pilates: {
        title: "器械普拉提体验课",
        message: "你好，我从MEG FITNESS泰州路店开业宣传单扫码进入，想预约器械普拉提体验。"
      }
    },
    en: {
      "open-gym": {
        title: "7-Day Open Gym Trial",
        message: "Hi, I found MEG FITNESS Taizhou Road through the opening promotion. I would like to claim the 7-day Open Gym trial."
      },
      "personal-training": {
        title: "Personal Training Trial",
        message: "Hi, I found MEG FITNESS Taizhou Road through the opening promotion. I would like to book the Personal Training trial."
      },
      pilates: {
        title: "Reformer Pilates Trial",
        message: "Hi, I found MEG FITNESS Taizhou Road through the opening promotion. I would like to book the Reformer Pilates trial."
      }
    }
  };

  var MEMBERSHIP_CONTENT = {
    en: {
      title: "Open Gym Memberships",
      message: "Hi, I would like to ask about the Open Gym membership options at MEG FITNESS Taizhou Road."
    }
  };

  function parseSource(search) {
    try { return new URLSearchParams(search || "").get("source") || "direct"; }
    catch (error) { return "direct"; }
  }
  function generateMessage(experience) { return experience && experience.message ? experience.message : ""; }
  function isExpired(deadline, now) {
    if (!deadline) return false;
    return new Date(now || Date.now()).getTime() >= new Date(deadline).getTime();
  }
  function selectExperience(items, id) { return (items || []).find(function (item) { return item.id === id; }) || null; }
  function createEvent(event, source, timestamp, language) {
    return { event:event, source:source || "direct", timestamp:timestamp || new Date().toISOString(), page:"taizhou-opening", language:language || "zh-CN" };
  }
  function serializeStorage(value) { try { return JSON.stringify(value); } catch (error) { return "[]"; } }
  function rulesExpanded(current) { return !Boolean(current); }
  function imageFallback(img) { if (img && img.parentElement) img.parentElement.classList.add("is-fallback"); return true; }
  function normalizeLanguage(language) { return String(language || "").toLowerCase().indexOf("en") === 0 ? "en" : "zh-CN"; }

  root.MEG_EXPERIENCE_CONTENT = EXPERIENCE_CONTENT;
  root.MEG_UTILS = {
    parseSource:parseSource,
    generateMessage:generateMessage,
    isExpired:isExpired,
    selectExperience:selectExperience,
    createEvent:createEvent,
    serializeStorage:serializeStorage,
    rulesExpanded:rulesExpanded,
    imageFallback:imageFallback,
    normalizeLanguage:normalizeLanguage
  };

  if (!root.document) return;

  function init() {
    var document = root.document;
    var config = root.MEG_CONFIG || {};
    var body = document.body;
    if (!body || body.dataset.megInitialized === "true") return;
    body.dataset.megInitialized = "true";

    var pageLanguage = normalizeLanguage(body.dataset.language || document.documentElement.lang || "zh-CN");
    var deadline = config.deadline || "2026-09-30T23:00:00+08:00";
    var source = parseSource(root.location && root.location.search);
    var currentClaimMessage = "";
    var currentExperience = "";
    var storage = null;
    try { storage = root.localStorage; } catch (error) { storage = null; }

    if (config.accentColor) document.documentElement.style.setProperty("--accent", config.accentColor);

    function safeGet(key, fallback) {
      if (!storage) return fallback;
      try { return JSON.parse(storage.getItem(key)) || fallback; } catch (error) { return fallback; }
    }
    function safeSet(key, value) {
      if (!storage) return;
      try { storage.setItem(key, typeof value === "string" ? value : serializeStorage(value)); } catch (error) {}
    }
    function hasStoredValue(key) {
      if (!storage) return false;
      try { return Boolean(storage.getItem(key)); } catch (error) { return false; }
    }
    function trackEvent(name) {
      var logs = safeGet("eventLogs", []);
      var event = createEvent(name, source, undefined, pageLanguage);
      logs.push(event);
      if (logs.length > 200) logs = logs.slice(-200);
      safeSet("eventLogs", logs);
      if (root.console && root.console.log) root.console.log("[MEG event]", event);
      return event;
    }
    root.trackEvent = trackEvent;

    var nowIso = new Date().toISOString();
    if (!hasStoredValue("megFirstSource")) {
      safeSet("megFirstSource", source);
      safeSet("megFirstVisitTime", nowIso);
    }
    safeSet("megLatestSource", source);
    safeSet("megLatestVisitTime", nowIso);
    trackEvent("page_view");

    function setText(id, value) {
      var element = document.getElementById(id);
      if (element) element.textContent = value;
    }

    var modal = document.getElementById("claimModal");
    var modalSheet = modal ? modal.querySelector(".modal-sheet") : null;
    var touchStartY = 0;
    var expired = isExpired(deadline);

    function experienceEvent(experience) {
      if (experience === "open-gym") return pageLanguage === "en" ? "select_open_gym" : "select_free_training";
      if (experience === "personal-training") return "select_personal_training";
      return "select_pilates";
    }

    function openClaimModal(experience, language) {
      var normalizedLanguage = normalizeLanguage(language);
      var content = EXPERIENCE_CONTENT[normalizedLanguage] && EXPERIENCE_CONTENT[normalizedLanguage][experience];
      if (!content || (expired && experience !== "open-gym-membership")) return;
      if (!modal) {
        if (root.console && root.console.error) root.console.error("Claim modal not found");
        return;
      }
      currentExperience = experience;
      currentClaimMessage = content.message;
      setText("selectedName", content.title);
      setText("messageText", content.message);
      setText("copyStatus", "");
      modal.hidden = false;
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      body.classList.add("no-scroll");
      trackEvent(experienceEvent(experience));
      trackEvent("view_wechat_qr");
      root.setTimeout(function () {
        var copyButton = document.getElementById("copyButton");
        if (copyButton) copyButton.focus();
      }, 50);
    }

    function openMembershipModal() {
      var content = MEMBERSHIP_CONTENT.en;
      if (!modal || !content) {
        if (!modal && root.console && root.console.error) root.console.error("Claim modal not found");
        return;
      }
      currentExperience = "open-gym-membership";
      currentClaimMessage = content.message;
      setText("selectedName", content.title);
      setText("messageText", content.message);
      setText("copyStatus", "");
      modal.hidden = false;
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      body.classList.add("no-scroll");
      trackEvent("click_open_gym_membership");
      trackEvent("view_wechat_qr");
    }

    function closeModal() {
      if (!modal) return;
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      modal.hidden = true;
      body.classList.remove("no-scroll");
    }

    async function copyText(value) {
      if (!value) return false;
      try {
        if (root.navigator && root.navigator.clipboard && root.isSecureContext) {
          await root.navigator.clipboard.writeText(value);
          return true;
        }
      } catch (error) {}
      var textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      var copied = false;
      try { copied = document.execCommand("copy"); } catch (error) { copied = false; }
      body.removeChild(textarea);
      return copied;
    }

    function copyCurrentMessage() {
      if (!currentClaimMessage) return;
      copyText(currentClaimMessage).then(function (copied) {
        var success = pageLanguage === "en"
          ? "Message copied. Please add the gym manager on WeChat and send it."
          : "话术已复制，请添加店长微信并发送";
        var failure = body.dataset.copyFailure || (pageLanguage === "en" ? "Copy failed. Please copy the message manually." : "复制失败，请长按上方话术手动复制。");
        setText("copyStatus", copied ? success : failure);
        if (copied) trackEvent("copy_message");
      }).catch(function () {
        setText("copyStatus", pageLanguage === "en" ? "Copy failed. Please copy the message manually." : "复制失败，请长按上方话术手动复制。");
      });
    }

    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || !target.closest) return;

      var claimButton = target.closest(".js-claim-experience");
      if (claimButton) {
        event.preventDefault();
        openClaimModal(claimButton.dataset.experience, claimButton.dataset.language || document.documentElement.lang || "zh-CN");
        return;
      }

      var scrollButton = target.closest(".js-scroll-to-trials");
      if (scrollButton) {
        event.preventDefault();
        trackEvent("click_claim_main");
        var trialOptions = document.querySelector("#trial-options");
        if (trialOptions) trialOptions.scrollIntoView({ behavior:"smooth" });
        return;
      }

      if (target.closest(".js-open-gym-membership")) {
        event.preventDefault();
        openMembershipModal();
        return;
      }

      if (target.closest("#copyButton")) {
        event.preventDefault();
        copyCurrentMessage();
        return;
      }

      if (target.closest("[data-close-modal]")) {
        event.preventDefault();
        closeModal();
        return;
      }

      var membershipScroll = target.closest("[data-scroll-membership]");
      if (membershipScroll) {
        event.preventDefault();
        trackEvent("click_open_gym_membership");
        var memberships = document.getElementById("open-gym-memberships");
        if (memberships) memberships.scrollIntoView({ behavior:"smooth" });
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeModal();
    });
    if (modalSheet) {
      modalSheet.addEventListener("touchstart", function (event) { if (event.touches[0]) touchStartY = event.touches[0].clientY; }, { passive:true });
      modalSheet.addEventListener("touchend", function (event) { if (event.changedTouches[0] && event.changedTouches[0].clientY - touchStartY > 90) closeModal(); }, { passive:true });
    }

    document.querySelectorAll("[data-gallery-index]").forEach(function (img) {
      img.addEventListener("error", function () { imageFallback(img); });
    });
    ["modalQr", "footerQr"].forEach(function (id) {
      var image = document.getElementById(id);
      if (image) image.addEventListener("error", function () { imageFallback(image); });
    });

    document.querySelectorAll("[data-switch-language]").forEach(function (link) {
      link.addEventListener("click", function () { trackEvent("switch_language"); });
    });
    var mapButton = document.getElementById("mapButton");
    if (mapButton) mapButton.addEventListener("click", function () { trackEvent("click_navigation"); });

    var copyAddressButton = document.getElementById("copyAddressButton");
    var copyAddressTimer;
    if (copyAddressButton) copyAddressButton.addEventListener("click", function () {
      copyText(copyAddressButton.dataset.address || "").then(function (copied) {
        if (!copied) return;
        trackEvent("copy_address");
        root.clearTimeout(copyAddressTimer);
        copyAddressButton.textContent = copyAddressButton.dataset.successLabel || "✔ 地址已复制";
        copyAddressTimer = root.setTimeout(function () { copyAddressButton.textContent = copyAddressButton.dataset.defaultLabel || "复制门店地址"; }, 2000);
      }).catch(function () {});
    });

    var rules = document.getElementById("rules");
    var toggle = document.getElementById("toggleRules");
    var expanded = false;
    if (rules && toggle) toggle.addEventListener("click", function () {
      expanded = rulesExpanded(expanded);
      rules.classList.toggle("expanded", expanded);
      toggle.textContent = expanded ? (toggle.dataset.collapseLabel || "收起完整规则 −") : (toggle.dataset.expandLabel || "展开完整规则 ＋");
      toggle.setAttribute("aria-expanded", String(expanded));
      if (expanded) trackEvent("expand_rules");
    });

    if (expired) {
      document.querySelectorAll(".js-claim-experience").forEach(function (button) { button.disabled = true; });
      var endedMessage = document.getElementById("endedMessage");
      var deadlineCard = document.querySelector(".deadline-card");
      if (endedMessage) endedMessage.hidden = false;
      if (deadlineCard) deadlineCard.classList.add("expired");
    }

    function updateCountdown() {
      var countdown = document.getElementById("countdown");
      if (!countdown) return;
      var difference = new Date(deadline).getTime() - Date.now();
      if (difference <= 0) {
        countdown.textContent = body.dataset.countdownEnded || (pageLanguage === "en" ? "This offer has ended" : "活动已结束");
        return;
      }
      var days = Math.floor(difference / 864e5);
      var hours = Math.floor(difference % 864e5 / 36e5);
      var minutes = Math.floor(difference % 36e5 / 6e4);
      countdown.textContent = pageLanguage === "en" ? "Closes in " + days + "d " + hours + "h " + minutes + "m" : "视觉倒计时：" + days + "天 " + hours + "小时 " + minutes + "分";
    }
    updateCountdown();
    root.setInterval(updateCountdown, 60000);
  }

  if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})(window);
