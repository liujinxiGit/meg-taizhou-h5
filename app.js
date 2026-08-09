(function (root) {
  "use strict";

  var EXPERIENCE_CONTENT = {
    "zh-CN": {
      "open-gym": {
        title: "自由训练体验周卡",
        message: "你好，我从 MEG FITNESS 泰州路店开业活动页面进入，想预约【自由训练体验周卡】。"
      },
      "personal-training": {
        title: "塑形私教体验课",
        message: "你好，我从 MEG FITNESS 泰州路店开业活动页面进入，想预约【塑形私教体验课】。"
      },
      pilates: {
        title: "器械普拉提体验课",
        message: "你好，我从 MEG FITNESS 泰州路店开业活动页面进入，想预约【器械普拉提体验课】。"
      },
      boxing: {
        title: "拳击体验课",
        message: "你好，我从 MEG FITNESS 泰州路店开业活动页面进入，想预约【拳击体验课】。"
      }
    },
    en: {
      "open-gym": {
        title: "7-Day Open Gym Trial",
        message: "Hi, I found MEG FITNESS Taizhou Road through the opening promotion and would like to book the 7-day Open Gym trial."
      },
      "personal-training": {
        title: "Personal Training Trial",
        message: "Hi, I found MEG FITNESS Taizhou Road through the opening promotion and would like to book the Personal Training trial."
      },
      pilates: {
        title: "Reformer Pilates Trial",
        message: "Hi, I found MEG FITNESS Taizhou Road through the opening promotion and would like to book the Reformer Pilates trial."
      },
      boxing: {
        title: "Boxing Training Trial",
        message: "Hi, I found MEG FITNESS Taizhou Road through the opening promotion and would like to book the Boxing Training trial."
      }
    }
  };

  var MEMBERSHIP_CONTENT = {
    en: {
      title: "Open Gym Memberships",
      message: "Hi, I would like to ask about the Open Gym membership options at MEG FITNESS Taizhou Road."
    }
  };

  var CONSULTATION_CONTENT = {
    "zh-CN": {
      "physical-reconditioning": { title:"运动功能重建咨询", message:"你好，我从MEG FITNESS泰州路店活动网页进入，想咨询【运动功能重建】课程。" },
      weightlifting: { title:"举重训练咨询", message:"你好，我从MEG FITNESS泰州路店活动网页进入，想咨询【举重训练】课程。" },
      "sports-performance": { title:"运动表现咨询", message:"你好，我从MEG FITNESS泰州路店活动网页进入，想咨询【运动表现】课程。" },
      boxing: { title:"拳击训练咨询", message:"你好，我从MEG FITNESS泰州路店活动网页进入，想咨询【拳击训练】课程。" },
      "youth-fitness": { title:"青少儿体适能咨询", message:"你好，我从MEG FITNESS泰州路店活动网页进入，想咨询【青少儿体适能】课程。" },
      "group-classes": { title:"团体课程咨询", message:"你好，我从MEG FITNESS泰州路店活动网页进入，想咨询【团体课程】最新课表。" },
      recovery: { title:"拉伸恢复咨询", message:"你好，我从MEG FITNESS泰州路店活动网页进入，想咨询【拉伸恢复】课程。" }
    },
    en: {
      "physical-reconditioning": { title:"Movement Rehabilitation Inquiry", message:"Hi, I found MEG FITNESS Taizhou Road through the website. I would like to ask about the Movement Rehabilitation sessions." },
      weightlifting: { title:"Olympic Weightlifting Inquiry", message:"Hi, I found MEG FITNESS Taizhou Road through the website. I would like to ask about the Olympic Weightlifting sessions." },
      "sports-performance": { title:"Sports Performance Inquiry", message:"Hi, I found MEG FITNESS Taizhou Road through the website. I would like to ask about the Sports Performance sessions." },
      boxing: { title:"Boxing Training Inquiry", message:"Hi, I found MEG FITNESS Taizhou Road through the website. I would like to ask about the Boxing Training sessions." },
      "youth-fitness": { title:"Youth Fitness Inquiry", message:"Hi, I found MEG FITNESS Taizhou Road through the website. I would like to ask about the Youth Fitness sessions." },
      "group-classes": { title:"Group Classes Inquiry", message:"Hi, I found MEG FITNESS Taizhou Road through the website. I would like to ask about the latest Group Classes schedule." },
      recovery: { title:"Mobility & Recovery Inquiry", message:"Hi, I found MEG FITNESS Taizhou Road through the website. I would like to ask about the Mobility & Recovery sessions." }
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
  function mapLeadService(value) {
    var services = {
      "open-gym":"open_gym", "open-gym-membership":"open_gym", "personal-training":"personal_training",
      pilates:"reformer_pilates", posture:"posture_training", "physical-reconditioning":"physical_reconditioning",
      weightlifting:"weightlifting", functional:"functional_training", "mobility-recovery":"mobility_recovery",
      recovery:"mobility_recovery", "sports-performance":"sports_performance", boxing:"boxing",
      "youth-fitness":"youth_fitness", "group-classes":"group_classes"
    };
    return services[value] || "other";
  }
  function buildBookingMessage(baseMessage, claimCode, language) {
    var normalizedLanguage = normalizeLanguage(language);
    var closing = normalizedLanguage === "en" ? "Could you let me know the available times?" : "请问最近可以预约什么时间？";
    var reference = claimCode ? (normalizedLanguage === "en" ? "Booking reference: " : "预约编号：") + claimCode : "";
    return [String(baseMessage || "").trim(), reference, closing].filter(Boolean).join("\n\n");
  }
  function isAnonymousClientId(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
  }
  function createAnonymousClientId(cryptoApi) {
    try {
      if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID().toLowerCase();
      if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
        var bytes = cryptoApi.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 15) | 64;
        bytes[8] = (bytes[8] & 63) | 128;
        var hex = Array.prototype.map.call(bytes, function (byte) { return byte.toString(16).padStart(2, "0"); });
        return hex.slice(0, 4).join("") + "-" + hex.slice(4, 6).join("") + "-" + hex.slice(6, 8).join("") + "-" + hex.slice(8, 10).join("") + "-" + hex.slice(10).join("");
      }
    } catch (error) {}
    return "";
  }
  function imageLoadingPlan(group, index, expanded) {
    if (group === "hero") return { tier:"critical", loading:"eager", fetchPriority:"high", rootMargin:"0px" };
    if (group === "space" && Number(index) < 4) return { tier:"near", loading:"lazy", fetchPriority:"auto", rootMargin:"1000px" };
    if (group === "folded-gallery" && !expanded) return { tier:"deferred", loading:"lazy", fetchPriority:"low", rootMargin:"0px" };
    return { tier:"later", loading:"lazy", fetchPriority:"low", rootMargin:"650px" };
  }
  function normalizeWebUrl(value) {
    try {
      var url = new URL(String(value || "").trim());
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch (error) { return ""; }
  }

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
    normalizeLanguage:normalizeLanguage,
    mapLeadService:mapLeadService,
    buildBookingMessage:buildBookingMessage,
    isAnonymousClientId:isAnonymousClientId,
    createAnonymousClientId:createAnonymousClientId,
    imageLoadingPlan:imageLoadingPlan,
    normalizeWebUrl:normalizeWebUrl
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
    var currentClaimCode = "";
    var currentExperience = "";
    var currentLeadService = "";
    var leadRequestToken = 0;
    var leadPromises = {};
    var storage = null;
    var session = null;
    try { storage = root.localStorage; } catch (error) { storage = null; }
    try { session = root.sessionStorage; } catch (error) { session = null; }

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
    function sessionGet(key) {
      if (!session) return "";
      try { return session.getItem(key) || ""; } catch (error) { return ""; }
    }
    function sessionSet(key, value) {
      if (!session) return;
      try { session.setItem(key, String(value)); } catch (error) {}
    }
    function createRequestId(service) {
      var existing = sessionGet("megLeadRequest:" + service);
      if (existing) return existing;
      var random = "";
      try {
        var bytes = new Uint8Array(12);
        root.crypto.getRandomValues(bytes);
        random = Array.prototype.map.call(bytes, function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
      } catch (error) { random = String(Date.now()) + String(Math.random()).slice(2); }
      var requestId = "meg_" + service + "_" + random;
      sessionSet("megLeadRequest:" + service, requestId);
      return requestId;
    }
    function getAnonymousClientId() {
      var key = "megAnonymousClientId";
      var existing = "";
      if (storage) {
        try { existing = storage.getItem(key) || ""; } catch (error) { existing = ""; }
      }
      if (isAnonymousClientId(existing)) return existing.toLowerCase();
      var generated = createAnonymousClientId(root.crypto);
      if (generated && storage) {
        try { storage.setItem(key, generated); } catch (error) {}
      }
      return generated;
    }
    function trackEvent(name, details) {
      var logs = safeGet("eventLogs", []);
      var event = createEvent(name, source, undefined, pageLanguage);
      Object.keys(details || {}).forEach(function (key) { event[key] = details[key]; });
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
    var imagePreview = document.getElementById("imagePreview");
    var imagePreviewImg = document.getElementById("imagePreviewImg");
    var toast = document.getElementById("toast");
    var mobileCtaBar = document.querySelector(".mobile-cta-bar");
    var sectionNav = document.querySelector("[data-section-nav]");
    var sectionMenu = document.getElementById("sectionMenu");
    var sectionMenuButton = document.querySelector("[data-open-section-menu]");
    var touchStartY = 0;
    var previewTouchStartY = 0;
    var savedScrollY = 0;
    var toastTimer = 0;
    var expired = isExpired(deadline);
    var goalSelectorOpened = false;

    function showToast(message) {
      if (!toast || !message) return;
      root.clearTimeout(toastTimer);
      toast.textContent = message;
      toast.classList.add("show");
      toastTimer = root.setTimeout(function () { toast.classList.remove("show"); }, 2100);
    }

    function lockPage() {
      if (body.classList.contains("no-scroll")) return;
      savedScrollY = root.pageYOffset || document.documentElement.scrollTop || 0;
      body.style.top = "-" + savedScrollY + "px";
      body.classList.add("no-scroll");
    }

    function unlockPage() {
      if ((modal && modal.classList.contains("open")) || (imagePreview && imagePreview.classList.contains("open")) || (sectionMenu && sectionMenu.classList.contains("open"))) return;
      body.classList.remove("no-scroll");
      body.style.top = "";
      root.scrollTo(0, savedScrollY);
    }

    var coachSection = document.querySelector('[data-config-section="coach"]');
    var locationsSection = document.querySelector('[data-config-section="locations"]');
    if (coachSection) coachSection.hidden = config.showCoachSection !== true;
    document.querySelectorAll("[data-coach-id]").forEach(function (card) {
      var coach = (config.coaches || []).find(function (item) { return item.id === card.dataset.coachId; });
      card.hidden = Boolean(coach && (coach.active === false || coach.enabled === false));
    });
    if (locationsSection) locationsSection.hidden = config.showLocationsSection === false;

    function renderDianpingLinks() {
      document.querySelectorAll(".brand-location-card[data-location-id]").forEach(function (card) {
        card.querySelectorAll(".dianping-link").forEach(function (link) { link.remove(); });
        var location = (config.locations || []).find(function (item) { return item.id === card.dataset.locationId; });
        var url = normalizeWebUrl(location && location.dianpingUrl);
        var detailsToggle = card.querySelector(".js-location-toggle");
        if (!url || !detailsToggle) return;
        var link = document.createElement("a");
        link.className = "dianping-link";
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = pageLanguage === "en" ? "View on Dianping ↗" : "大众点评查看门店 ↗";
        detailsToggle.parentNode.insertBefore(link, detailsToggle);
      });
    }
    root.MEG_UTILS.renderDianpingLinks = renderDianpingLinks;
    renderDianpingLinks();

    function experienceEvent(experience) {
      if (experience === "open-gym") return pageLanguage === "en" ? "select_open_gym" : "select_free_training";
      if (experience === "personal-training") return "select_personal_training";
      if (experience === "boxing") return "select_boxing";
      return "select_pilates";
    }

    function setClaimLoading(loading, message) {
      var copyButton = document.getElementById("copyButton");
      var claimCodeElement = document.getElementById("claimCode");
      var claimCodeStatus = document.getElementById("claimCodeStatus");
      if (copyButton) copyButton.disabled = Boolean(loading);
      if (claimCodeElement) claimCodeElement.textContent = loading ? (pageLanguage === "en" ? "Generating…" : "正在生成…") : (currentClaimCode || (pageLanguage === "en" ? "Not available" : "暂未生成"));
      if (claimCodeStatus) {
        claimCodeStatus.textContent = message || "";
        claimCodeStatus.classList.toggle("is-error", !loading && !currentClaimCode && Boolean(message));
      }
    }

    function requestLead(service, language) {
      var cachedCode = sessionGet("megClaimCode:" + service);
      if (cachedCode) return Promise.resolve({ claimCode:cachedCode, reused:true });
      if (leadPromises[service]) return leadPromises[service];
      if (!root.fetch) return Promise.reject(new Error("fetch_unavailable"));
      var requestId = createRequestId(service);
      var payload = {
        service:service,
        language:normalizeLanguage(language),
        source:source,
        store:"taizhou",
        campaign:"taizhou-opening-2026",
        pagePath:(root.location && root.location.pathname) || "/",
        requestId:requestId,
        clientId:getAnonymousClientId()
      };
      var timeoutPromise = new Promise(function (_, reject) {
        root.setTimeout(function () { reject(new Error("request_timeout")); }, 5500);
      });
      var leadPromise = Promise.race([
        root.fetch("/api/leads", {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          credentials:"same-origin",
          body:JSON.stringify(payload)
        }).then(function (response) {
          if (!response.ok) throw new Error("lead_create_failed");
          return response.json();
        }).then(function (data) {
          if (!data || !data.ok || !data.claimCode) throw new Error("invalid_lead_response");
          sessionSet("megClaimCode:" + service, data.claimCode);
          return data;
        }),
        timeoutPromise
      ]);
      leadPromises[service] = leadPromise.then(function (value) {
        delete leadPromises[service];
        return value;
      }, function (error) {
        delete leadPromises[service];
        throw error;
      });
      return leadPromises[service];
    }

    function prepareLead(experience, language, baseMessage) {
      var normalizedLanguage = normalizeLanguage(language);
      var service = mapLeadService(experience);
      var requestToken = ++leadRequestToken;
      currentLeadService = service;
      currentClaimCode = "";
      currentClaimMessage = buildBookingMessage(baseMessage, "", normalizedLanguage);
      setText("messageText", currentClaimMessage);
      setText("copyStatus", "");
      setClaimLoading(true, normalizedLanguage === "en" ? "Generating your anonymous booking reference…" : "正在生成匿名预约编号…");
      requestLead(service, normalizedLanguage).then(function (data) {
        if (requestToken !== leadRequestToken || currentLeadService !== service) return;
        currentClaimCode = data.claimCode;
        currentClaimMessage = buildBookingMessage(baseMessage, currentClaimCode, normalizedLanguage);
        setText("messageText", currentClaimMessage);
        setClaimLoading(false, normalizedLanguage === "en" ? "Reference ready" : "预约编号已生成");
      }).catch(function () {
        if (requestToken !== leadRequestToken || currentLeadService !== service) return;
        currentClaimCode = "";
        currentClaimMessage = buildBookingMessage(baseMessage, "", normalizedLanguage);
        setText("messageText", currentClaimMessage);
        setClaimLoading(false, normalizedLanguage === "en"
          ? "The reference could not be generated. You can still add Gym Manager Xu on WeChat and book directly."
          : "预约编号暂时生成失败，你仍可直接添加微信预约。");
      });
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
      setText("selectedName", content.title);
      modal.hidden = false;
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      lockPage();
      trackEvent(experienceEvent(experience));
      trackEvent("view_wechat_qr");
      prepareLead(experience, normalizedLanguage, content.message);
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
      setText("selectedName", content.title);
      modal.hidden = false;
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      lockPage();
      trackEvent("click_open_gym_membership");
      trackEvent("view_wechat_qr");
      prepareLead("open-gym-membership", pageLanguage, content.message);
    }

    function openConsultationModal(topic, language) {
      var normalizedLanguage = normalizeLanguage(language);
      var content = CONSULTATION_CONTENT[normalizedLanguage] && CONSULTATION_CONTENT[normalizedLanguage][topic];
      if (!modal || !content) {
        if (!modal && root.console && root.console.error) root.console.error("Claim modal not found");
        return;
      }
      currentExperience = topic;
      setText("selectedName", content.title);
      modal.hidden = false;
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      lockPage();
      trackEvent("view_wechat_qr");
      prepareLead(topic, normalizedLanguage, content.message);
    }

    function closeModal() {
      if (!modal) return;
      leadRequestToken += 1;
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      modal.hidden = true;
      unlockPage();
    }

    function openImagePreview(trigger) {
      if (!imagePreview || !imagePreviewImg) return;
      imagePreviewImg.src = trigger.dataset.previewSrc || "";
      imagePreviewImg.alt = trigger.dataset.previewAlt || "";
      imagePreview.hidden = false;
      imagePreview.classList.add("open");
      imagePreview.setAttribute("aria-hidden", "false");
      lockPage();
    }

    function closeImagePreview() {
      if (!imagePreview || !imagePreviewImg) return;
      imagePreview.classList.remove("open");
      imagePreview.setAttribute("aria-hidden", "true");
      imagePreview.hidden = true;
      imagePreviewImg.removeAttribute("src");
      unlockPage();
    }

    function openSectionMenu() {
      if (!sectionMenu || !sectionMenuButton) return;
      if (modal && modal.classList.contains("open")) closeModal();
      if (imagePreview && imagePreview.classList.contains("open")) closeImagePreview();
      sectionMenu.hidden = false;
      sectionMenu.classList.add("open");
      sectionMenu.setAttribute("aria-hidden", "false");
      sectionMenuButton.setAttribute("aria-expanded", "true");
      lockPage();
      var firstLink = sectionMenu.querySelector("a");
      if (firstLink) root.setTimeout(function () { firstLink.focus(); }, 40);
    }

    function closeSectionMenu() {
      if (!sectionMenu || !sectionMenuButton) return;
      sectionMenu.classList.remove("open");
      sectionMenu.setAttribute("aria-hidden", "true");
      sectionMenu.hidden = true;
      sectionMenuButton.setAttribute("aria-expanded", "false");
      unlockPage();
    }

    function scrollToSection(selector) {
      var section = selector ? document.querySelector(selector) : null;
      if (!section) return;
      var reduced = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
      section.scrollIntoView({ behavior:reduced ? "auto" : "smooth", block:"start" });
    }

    function setMoreProgramsExpanded(section, expanded) {
      if (!section) return;
      var toggle = section.querySelector("[data-toggle-more-programs]");
      if (toggle) {
        toggle.setAttribute("aria-expanded", String(expanded));
        toggle.textContent = expanded ? toggle.dataset.collapseLabel : toggle.dataset.expandLabel;
      }
      section.querySelectorAll("[data-more-programs]").forEach(function (panel) {
        panel.hidden = panel.classList.contains("program-details") ? !expanded : false;
      });
    }

    function revealDeferredGallery(container) {
      if (!container) return;
      container.querySelectorAll("img[data-progressive-src]").forEach(function (image) {
        image.src = image.dataset.progressiveSrc;
        image.removeAttribute("data-progressive-src");
      });
    }

    function prepareProgressiveImages() {
      var spaceImages = Array.prototype.slice.call(document.querySelectorAll("#space [data-gallery-index]"));
      spaceImages.forEach(function (image, index) {
        var plan = imageLoadingPlan("space", index, true);
        image.dataset.imageTier = plan.tier;
        image.loading = plan.loading;
        image.decoding = "async";
        image.fetchPriority = plan.fetchPriority;
      });
      document.querySelectorAll(".brand-location-detail img").forEach(function (image) {
        var plan = imageLoadingPlan("folded-gallery", 0, false);
        image.dataset.imageTier = plan.tier;
        if (image.getAttribute("src")) {
          image.dataset.progressiveSrc = image.getAttribute("src");
          image.removeAttribute("src");
        }
        image.loading = plan.loading;
        image.decoding = "async";
      });

      var prewarmed = false;
      function prewarm() {
        if (prewarmed) return;
        prewarmed = true;
        spaceImages.slice(0, 4).forEach(function (image, index) {
          var load = function () {
            var warmImage = new root.Image();
            warmImage.decoding = "async";
            warmImage.src = image.currentSrc || image.src;
          };
          root.setTimeout(load, index * 140);
        });
      }
      var trialSection = document.getElementById("trial-options");
      if (trialSection && "IntersectionObserver" in root) {
        var warmObserver = new root.IntersectionObserver(function (entries) {
          if (entries.some(function (entry) { return entry.isIntersecting; })) {
            prewarm();
            warmObserver.disconnect();
          }
        }, { rootMargin:imageLoadingPlan("space", 0, true).rootMargin + " 0px", threshold:0 });
        warmObserver.observe(trialSection);
      }
      if (typeof root.requestIdleCallback === "function") root.requestIdleCallback(prewarm, { timeout:1400 });
      else root.setTimeout(prewarm, 900);
    }
    prepareProgressiveImages();

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
          ? "Copied. Add Gym Manager Xu on WeChat and send the message."
          : "已复制，添加许店长微信后直接粘贴发送即可";
        var failure = body.dataset.copyFailure || (pageLanguage === "en" ? "Copy failed. Please copy the message manually." : "复制失败，请长按上方话术手动复制。");
        setText("copyStatus", copied ? success : failure);
        showToast(copied ? success : failure);
        if (copied) {
          trackEvent("copy_message");
          if (currentClaimCode && root.fetch) {
            root.fetch("/api/leads/" + encodeURIComponent(currentClaimCode) + "/event", {
              method:"PATCH",
              headers:{ "Content-Type":"application/json" },
              credentials:"same-origin",
              body:JSON.stringify({ eventStage:"message_copied" })
            }).catch(function () {});
          }
        }
      }).catch(function () {
        var failure = pageLanguage === "en" ? "Copy failed. Please copy the message manually." : "复制失败，请长按上方话术手动复制。";
        setText("copyStatus", failure);
        showToast(failure);
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

      if (target.closest("[data-open-section-menu]")) {
        event.preventDefault();
        openSectionMenu();
        return;
      }

      if (target.closest("[data-close-section-menu]")) {
        event.preventDefault();
        closeSectionMenu();
        return;
      }

      var sectionLink = target.closest(".section-nav a, .section-menu a");
      if (sectionLink) {
        event.preventDefault();
        var sectionTarget = sectionLink.getAttribute("href");
        if (sectionMenu && sectionMenu.classList.contains("open")) closeSectionMenu();
        root.setTimeout(function () { scrollToSection(sectionTarget); }, 0);
        return;
      }

      var scrollButton = target.closest(".js-scroll-to-trials");
      if (scrollButton) {
        event.preventDefault();
        trackEvent("click_claim_main");
        if (scrollButton.classList.contains("floating-cta") && currentExperience) {
          if (currentExperience === "open-gym-membership") openMembershipModal();
          else if (EXPERIENCE_CONTENT[pageLanguage] && EXPERIENCE_CONTENT[pageLanguage][currentExperience]) openClaimModal(currentExperience, pageLanguage);
          else openConsultationModal(currentExperience, pageLanguage);
          return;
        }
        var trialOptions = document.querySelector("#trial-options");
        if (trialOptions) scrollToSection("#trial-options");
        return;
      }

      if (target.closest(".js-open-gym-membership")) {
        event.preventDefault();
        openMembershipModal();
        return;
      }

      var moreProgramsButton = target.closest("[data-toggle-more-programs]");
      if (moreProgramsButton) {
        event.preventDefault();
        var moreExpanded = moreProgramsButton.getAttribute("aria-expanded") !== "true";
        setMoreProgramsExpanded(moreProgramsButton.closest(".programs-section"), moreExpanded);
        return;
      }

      var programButton = target.closest(".js-program-toggle");
      if (programButton) {
        event.preventDefault();
        var programId = programButton.dataset.program;
        var programsSection = programButton.closest(".programs-section");
        var moreProgramsToggle = programsSection && programsSection.querySelector("[data-toggle-more-programs]");
        if (moreProgramsToggle && moreProgramsToggle.getAttribute("aria-expanded") !== "true") {
          setMoreProgramsExpanded(programsSection, true);
        }
        var programButtons = programsSection ? programsSection.querySelectorAll(".js-program-toggle") : [];
        var programDetails = programsSection ? programsSection.querySelectorAll("[data-program-detail]") : [];
        programButtons.forEach(function (button) {
          button.setAttribute("aria-expanded", "false");
          button.classList.remove("active");
        });
        programDetails.forEach(function (detail) { detail.hidden = true; });
        var programDetail = programsSection && programsSection.querySelector('[data-program-detail="' + programId + '"]');
        programButton.setAttribute("aria-expanded", "true");
        programButton.classList.add("active");
        if (programDetail) {
          programDetail.hidden = false;
          root.setTimeout(function () {
            var reduced = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
            programDetail.scrollIntoView({ behavior:reduced ? "auto" : "smooth", block:"nearest" });
          }, 40);
        }
        trackEvent("training_program_selected", { program:programId });
        return;
      }

      var goalButton = target.closest(".js-goal-button");
      if (goalButton) {
        event.preventDefault();
        var goal = goalButton.dataset.goal || "";
        var recommendedService = goalButton.dataset.recommendedService || "";
        if (!goalSelectorOpened) {
          goalSelectorOpened = true;
          trackEvent("goal_selector_open", { goal:goal, recommended_service:recommendedService });
        }
        document.querySelectorAll(".js-goal-button").forEach(function (button) {
          var selected = button === goalButton;
          button.classList.toggle("active", selected);
          button.setAttribute("aria-pressed", String(selected));
        });
        document.querySelectorAll("[data-goal-result]").forEach(function (result) {
          result.hidden = result.dataset.goalResult !== goal;
        });
        trackEvent("goal_selected", { goal:goal, recommended_service:recommendedService });
        return;
      }

      var goalCta = target.closest(".js-goal-cta");
      if (goalCta) {
        event.preventDefault();
        var ctaGoal = goalCta.dataset.goal || "";
        var ctaService = goalCta.dataset.recommendedService || goalCta.dataset.experience || goalCta.dataset.consultation || "";
        trackEvent("goal_recommendation_cta", { goal:ctaGoal, recommended_service:ctaService });
        if (goalCta.dataset.consultation) openConsultationModal(goalCta.dataset.consultation, goalCta.dataset.language || pageLanguage);
        else openClaimModal(goalCta.dataset.experience, goalCta.dataset.language || pageLanguage);
        return;
      }

      var coachToggle = target.closest(".js-coach-toggle");
      if (coachToggle) {
        event.preventDefault();
        var coachDetails = document.getElementById(coachToggle.getAttribute("aria-controls"));
        var coachExpanded = coachToggle.getAttribute("aria-expanded") !== "true";
        coachToggle.setAttribute("aria-expanded", String(coachExpanded));
        if (coachDetails) coachDetails.hidden = !coachExpanded;
        coachToggle.textContent = coachExpanded
          ? (coachToggle.dataset.collapseLabel || "收起专业背景")
          : (coachToggle.dataset.expandLabel || "查看专业背景");
        if (coachExpanded) trackEvent("coach_profile_expanded", { coach_id:coachToggle.dataset.coachId || "manager" });
        return;
      }

      var locationToggle = target.closest(".js-location-toggle");
      if (locationToggle) {
        event.preventDefault();
        var locationDetails = document.getElementById(locationToggle.getAttribute("aria-controls"));
        var locationExpanded = locationToggle.getAttribute("aria-expanded") !== "true";
        locationToggle.setAttribute("aria-expanded", String(locationExpanded));
        if (locationDetails) locationDetails.hidden = !locationExpanded;
        if (locationExpanded) revealDeferredGallery(locationDetails);
        locationToggle.textContent = locationExpanded
          ? (locationToggle.dataset.collapseLabel || "收起门店详情")
          : (locationToggle.dataset.expandLabel || "查看门店详情");
        if (locationExpanded) trackEvent("location_card_expanded", { location_id:locationToggle.dataset.locationId || "" });
        return;
      }

      var locationMap = target.closest(".js-location-map");
      if (locationMap) {
        trackEvent("location_map_clicked", { location_id:locationMap.dataset.locationId || "" });
        return;
      }

      var faqToggle = target.closest(".js-faq-toggle");
      if (faqToggle) {
        event.preventDefault();
        var faqAnswer = document.getElementById(faqToggle.getAttribute("aria-controls"));
        var faqExpanded = faqToggle.getAttribute("aria-expanded") === "true";
        document.querySelectorAll(".js-faq-toggle").forEach(function (button) {
          button.setAttribute("aria-expanded", "false");
          var answer = document.getElementById(button.getAttribute("aria-controls"));
          if (answer) answer.hidden = true;
        });
        if (!faqExpanded) {
          faqToggle.setAttribute("aria-expanded", "true");
          if (faqAnswer) faqAnswer.hidden = false;
        }
        return;
      }

      var imageTrigger = target.closest(".js-image-preview");
      if (imageTrigger) {
        event.preventDefault();
        if (imageTrigger.classList.contains("is-fallback")) return;
        openImagePreview(imageTrigger);
        return;
      }

      if (target.closest("[data-close-image-preview]")) {
        event.preventDefault();
        closeImagePreview();
        return;
      }

      if (target.closest("#copyButton")) {
        event.preventDefault();
        copyCurrentMessage();
        return;
      }

      var copyWechatButton = target.closest("#copyWechatButton, [data-copy-manager-wechat]");
      if (copyWechatButton) {
        event.preventDefault();
        copyText(copyWechatButton.dataset.wechat || "13101839816").then(function (copied) {
          showToast(copied ? (pageLanguage === "en" ? "WeChat ID Copied" : "微信号已复制") : (pageLanguage === "en" ? "Copy failed" : "复制失败"));
        });
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
      if (event.key === "Escape") {
        if (modal && modal.classList.contains("open")) closeModal();
        if (imagePreview && imagePreview.classList.contains("open")) closeImagePreview();
        if (sectionMenu && sectionMenu.classList.contains("open")) closeSectionMenu();
      }
    });
    if (modalSheet) {
      modalSheet.addEventListener("touchstart", function (event) { if (event.touches[0]) touchStartY = event.touches[0].clientY; }, { passive:true });
      modalSheet.addEventListener("touchend", function (event) { if (event.changedTouches[0] && event.changedTouches[0].clientY - touchStartY > 90) closeModal(); }, { passive:true });
    }
    if (imagePreview) {
      imagePreview.addEventListener("touchstart", function (event) { if (event.touches[0]) previewTouchStartY = event.touches[0].clientY; }, { passive:true });
      imagePreview.addEventListener("touchend", function (event) { if (event.changedTouches[0] && event.changedTouches[0].clientY - previewTouchStartY > 100) closeImagePreview(); }, { passive:true });
    }

    document.querySelectorAll("[data-gallery-index]").forEach(function (img) {
      img.addEventListener("error", function () { imageFallback(img); });
    });
    document.querySelectorAll("[data-fallback-image]").forEach(function (img) {
      img.addEventListener("error", function () { imageFallback(img); });
      if (img.complete && !img.naturalWidth) imageFallback(img);
    });
    ["modalQr", "footerQr"].forEach(function (id) {
      var image = document.getElementById(id);
      if (image) image.addEventListener("error", function () { imageFallback(image); });
    });

    document.querySelectorAll("[data-switch-language]").forEach(function (link) {
      if (source !== "direct") {
        try {
          var languageUrl = new URL(link.getAttribute("href"), root.location.href);
          languageUrl.searchParams.set("source", source);
          link.setAttribute("href", languageUrl.pathname + languageUrl.search);
        } catch (error) {}
      }
      link.addEventListener("click", function () { trackEvent("switch_language"); });
    });
    var mapButton = document.getElementById("mapButton");
    if (mapButton) mapButton.addEventListener("click", function () { trackEvent("click_navigation"); });

    var copyAddressButton = document.getElementById("copyAddressButton");
    var copyAddressTimer;
    if (copyAddressButton) copyAddressButton.addEventListener("click", function () {
      copyText(copyAddressButton.dataset.address || "").then(function (copied) {
        if (!copied) {
          showToast(pageLanguage === "en" ? "Copy failed" : "复制失败");
          return;
        }
        trackEvent("copy_address");
        showToast(pageLanguage === "en" ? "Address Copied" : "地址已复制");
        root.clearTimeout(copyAddressTimer);
        copyAddressButton.textContent = copyAddressButton.dataset.successLabel || "✔ 地址已复制";
        copyAddressTimer = root.setTimeout(function () { copyAddressButton.textContent = copyAddressButton.dataset.defaultLabel || "复制门店地址"; }, 2000);
      }).catch(function () { showToast(pageLanguage === "en" ? "Copy failed" : "复制失败"); });
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

    var timeline = document.querySelector("[data-brand-timeline]");
    if (timeline && "IntersectionObserver" in root) {
      var timelineObserver = new root.IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) {
          timeline.classList.add("viewed");
          trackEvent("timeline_viewed");
          timelineObserver.disconnect();
        }
      }, { threshold:0.2 });
      timelineObserver.observe(timeline);
    } else if (timeline) {
      timeline.classList.add("viewed");
    }

    var finalCta = document.querySelector(".final-cta");
    var heroSection = document.querySelector(".hero");
    if (finalCta && heroSection && "IntersectionObserver" in root) {
      var hiddenCtaTargets = [];
      var ctaObserver = new root.IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var index = hiddenCtaTargets.indexOf(entry.target);
          if (entry.isIntersecting && index === -1) hiddenCtaTargets.push(entry.target);
          if (!entry.isIntersecting && index !== -1) hiddenCtaTargets.splice(index, 1);
        });
        var hidden = hiddenCtaTargets.length > 0;
        if (mobileCtaBar) mobileCtaBar.classList.toggle("is-hidden", hidden);
        if (sectionNav) sectionNav.classList.toggle("is-visible", !hidden);
        if (sectionMenuButton) sectionMenuButton.classList.toggle("is-visible", !hidden);
      }, { threshold:0.08 });
      ctaObserver.observe(heroSection);
      ctaObserver.observe(finalCta);
    }

    var navSections = Array.prototype.slice.call(document.querySelectorAll("[data-nav-section]"));
    if (navSections.length) {
      var navFrame = 0;
      function updateActiveSection() {
        navFrame = 0;
        var marker = (root.innerHeight || 800) * 0.32;
        var activeSection = navSections[0];
        navSections.forEach(function (section) {
          var rect = section.getBoundingClientRect();
          if (rect.top <= marker && rect.bottom > marker) activeSection = section;
        });
        var activeId = activeSection.id;
        document.querySelectorAll('.section-nav a, .section-menu a').forEach(function (link) {
          var active = link.getAttribute("href") === "#" + activeId;
          link.classList.toggle("active", active);
          if (active) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      }
      function requestActiveSectionUpdate() {
        if (!navFrame) navFrame = root.requestAnimationFrame(updateActiveSection);
      }
      if ("IntersectionObserver" in root) {
        var navObserver = new root.IntersectionObserver(requestActiveSectionUpdate, { rootMargin:"-20% 0px -65%", threshold:[0, 0.15, 0.5] });
        navSections.forEach(function (section) { navObserver.observe(section); });
      }
      root.addEventListener("scroll", requestActiveSectionUpdate, { passive:true });
      root.addEventListener("resize", requestActiveSectionUpdate, { passive:true });
      updateActiveSection();
    }

    if (expired) {
      document.querySelectorAll(".js-claim-experience").forEach(function (button) { button.disabled = true; });
      var deadlineCard = document.querySelector(".deadline-card");
      var trialWrap = document.querySelector("#trial-options .wrap");
      if (trialWrap && !document.getElementById("endedMessage")) {
        var endedMessage = document.createElement("p");
        endedMessage.id = "endedMessage";
        endedMessage.className = "ended";
        endedMessage.setAttribute("role", "status");
        endedMessage.textContent = pageLanguage === "en" ? "This opening trial offer has ended." : "本期开业免费体验领取已结束。";
        trialWrap.appendChild(endedMessage);
      }
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
