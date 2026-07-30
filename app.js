(function (root) {
  "use strict";
  var storage = root.localStorage;

  function parseSource(search) {
    try { return new URLSearchParams(search || "").get("source") || "direct"; }
    catch (e) { return "direct"; }
  }
  function generateMessage(experience) { return experience && experience.message ? experience.message : ""; }
  function isExpired(deadline, now) { return new Date(now || Date.now()).getTime() >= new Date(deadline).getTime(); }
  function selectExperience(items, id) { return (items || []).find(function (item) { return item.id === id; }) || null; }
  function createEvent(event, source, timestamp) { return { event: event, source: source || "direct", timestamp: timestamp || new Date().toISOString(), page: "taizhou-opening" }; }
  function serializeStorage(value) { try { return JSON.stringify(value); } catch (e) { return "[]"; } }
  function rulesExpanded(current) { return !Boolean(current); }
  function imageFallback(img) { if (img && img.parentElement) img.parentElement.classList.add("is-fallback"); return true; }

  var Utils = { parseSource:parseSource, generateMessage:generateMessage, isExpired:isExpired, selectExperience:selectExperience, createEvent:createEvent, serializeStorage:serializeStorage, rulesExpanded:rulesExpanded, imageFallback:imageFallback };
  root.MEG_UTILS = Utils;
  if (!root.document || !root.MEG_CONFIG) return;

  var c = root.MEG_CONFIG;
  document.documentElement.style.setProperty("--accent", c.accentColor);
  var source = parseSource(root.location.search);
  function safeGet(key, fallback) { try { return JSON.parse(storage.getItem(key)) || fallback; } catch (e) { return fallback; } }
  function safeSet(key, value) { try { storage.setItem(key, typeof value === "string" ? value : serializeStorage(value)); } catch (e) {} }
  function trackEvent(name) { var logs=safeGet("eventLogs",[]); var event=createEvent(name,source); logs.push(event); if(logs.length>200) logs=logs.slice(-200); safeSet("eventLogs",logs); console.log("[MEG event]",event); return event; }
  root.trackEvent = trackEvent;
  var nowIso = new Date().toISOString();
  if (!storage.getItem("megFirstSource")) { safeSet("megFirstSource", source); safeSet("megFirstVisitTime", nowIso); }
  safeSet("megLatestSource", source); safeSet("megLatestVisitTime", nowIso); trackEvent("page_view");

  function text(id,value){var el=document.getElementById(id);if(el)el.textContent=value;}
  document.querySelectorAll("[data-deadline]").forEach(function(el){el.textContent=c.deadlineText;});
  document.querySelectorAll("[data-gallery-index]").forEach(function(img){img.addEventListener("error",function(){imageFallback(img);});});

  var expired=isExpired(c.deadline), selected=null, modal=document.getElementById("claimModal"), sheet=modal.querySelector(".modal-sheet"), startY=0;
  if(expired)document.querySelectorAll(".claim-button").forEach(function(button){button.disabled=true;});
  function openModal(id){selected=selectExperience(c.experiences,id);if(!selected||expired)return;trackEvent(selected.event);text("selectedName",selected.name);text("messageText",generateMessage(selected));text("copyStatus","");modal.classList.add("open");modal.setAttribute("aria-hidden","false");document.body.classList.add("no-scroll");setTimeout(function(){document.getElementById("copyButton").focus();},50);trackEvent("view_wechat_qr");}
  function closeModal(){modal.classList.remove("open");modal.setAttribute("aria-hidden","true");document.body.classList.remove("no-scroll");}
  document.querySelectorAll(".claim-button").forEach(function(b){b.addEventListener("click",function(){openModal(b.dataset.id);});});
  document.querySelectorAll("[data-close-modal]").forEach(function(b){b.addEventListener("click",closeModal);});
  document.addEventListener("keydown",function(e){if(e.key==="Escape")closeModal();}); sheet.addEventListener("touchstart",function(e){startY=e.touches[0].clientY;},{passive:true});sheet.addEventListener("touchend",function(e){if(e.changedTouches[0].clientY-startY>90)closeModal();},{passive:true});
  async function copyText(value){if(navigator.clipboard&&root.isSecureContext){await navigator.clipboard.writeText(value);return true;}var ta=document.createElement("textarea");ta.value=value;ta.setAttribute("readonly","");ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();ta.setSelectionRange(0,99999);var ok=document.execCommand("copy");document.body.removeChild(ta);return ok;}
  document.getElementById("copyButton").addEventListener("click",function(){if(!selected)return;copyText(generateMessage(selected)).then(function(ok){text("copyStatus",ok?"话术已复制，请添加店长微信并发送。":"复制失败，请长按上方话术手动复制。");if(ok)trackEvent("copy_message");}).catch(function(){text("copyStatus","复制失败，请长按上方话术手动复制。");});});
  ["modalQr","footerQr"].forEach(function(id){var img=document.getElementById(id);img.onerror=function(){imageFallback(img);};});
  document.querySelectorAll("[data-scroll-claim]").forEach(function(b){if(expired)b.disabled=true;b.addEventListener("click",function(){trackEvent("click_claim_main");document.getElementById("claim").scrollIntoView({behavior:"smooth"});});});
  var map=document.getElementById("mapButton");if(!c.mapUrl){map.disabled=true;document.getElementById("mapHint").hidden=false;}else{map.addEventListener("click",function(){trackEvent("click_navigation");root.location.href=c.mapUrl;});}
  var rules=document.getElementById("rules"),toggle=document.getElementById("toggleRules"),expanded=false;toggle.addEventListener("click",function(){expanded=rulesExpanded(expanded);rules.classList.toggle("expanded",expanded);toggle.textContent=expanded?"收起完整规则 −":"展开完整规则 ＋";toggle.setAttribute("aria-expanded",String(expanded));if(expanded)trackEvent("expand_rules");});
  if(expired){document.getElementById("endedMessage").hidden=false;document.querySelector(".deadline-card").classList.add("expired");}
  function updateCountdown(){var diff=new Date(c.deadline).getTime()-Date.now(),el=document.getElementById("countdown");if(diff<=0){el.textContent="活动已结束";return;}var d=Math.floor(diff/864e5),h=Math.floor(diff%864e5/36e5),m=Math.floor(diff%36e5/6e4);el.textContent="视觉倒计时："+d+"天 "+h+"小时 "+m+"分";} updateCountdown();setInterval(updateCountdown,60000);
})(window);
