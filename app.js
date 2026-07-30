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
  text("brand",c.brandName); text("brandProof",c.brandProof); text("heroTitle",c.heroTitle); text("subtitle",c.subtitle); text("hours",c.businessHours); text("distance",c.subwayDistance);
  text("locationName",c.storeName); text("locationDistance",c.subwayDistance); text("findTip",c.findTip); text("locationHours",c.businessHours); text("footerStore",c.storeName); text("footerHours",c.businessHours); text("footerAddress",c.address.join(" · "));
  document.querySelectorAll("[data-deadline]").forEach(function(el){el.textContent=c.deadlineText;});
  document.getElementById("tags").innerHTML=c.serviceTags.map(function(x){return '<span class="tag">'+x+'</span>';}).join("");
  document.getElementById("address").innerHTML=c.address.map(function(x){return '<div>'+x+'</div>';}).join("");

  var heroBg=document.getElementById("heroBg"), heroTest=new Image(); heroTest.onload=function(){heroBg.style.backgroundImage='url("'+c.heroImage+'")';}; heroTest.onerror=function(){heroBg.classList.add("placeholder");}; heroTest.src=c.heroImage;
  document.getElementById("gallery").innerHTML=c.gallery.map(function(x,i){return '<figure class="gallery-card"><img src="'+x.src+'" alt="'+x.label+'" data-gallery-index="'+i+'"><figcaption class="gallery-label">'+x.label+'</figcaption></figure>';}).join("");
  document.querySelectorAll("[data-gallery-index]").forEach(function(img){img.addEventListener("error",function(){imageFallback(img);});});
  document.getElementById("priceList").innerHTML=(c.membershipPlans||[]).map(function(x){return '<article class="price-card"><div><h3>'+x.name+'</h3><p>'+x.note+'</p></div><div class="price-value"><span>¥</span><strong>'+x.price+'</strong><small>'+x.unit+'</small></div></article>';}).join("");

  var expired=isExpired(c.deadline), selected=null, modal=document.getElementById("claimModal"), sheet=modal.querySelector(".modal-sheet"), startY=0;
  document.getElementById("experienceList").innerHTML=c.experiences.map(function(x){var quota=c.showRemaining?'剩余 '+x.remaining+' 份':'限'+x.quota+'份';return '<article class="experience-card"><div class="experience-head"><div><h3>'+x.name+'</h3><p class="quota">'+quota+'</p></div><span class="number-badge">'+x.icon+'</span></div><ul>'+x.benefits.map(function(b){return '<li>'+b+'</li>';}).join('')+'</ul><button class="btn btn-primary claim-button" data-id="'+x.id+'" '+(expired?'disabled':'')+'>'+x.button+'</button></article>';}).join("");
  function openModal(id){selected=selectExperience(c.experiences,id);if(!selected||expired)return;trackEvent(selected.event);text("selectedName",selected.name);text("messageText",generateMessage(selected));text("copyStatus","");modal.classList.add("open");modal.setAttribute("aria-hidden","false");document.body.classList.add("no-scroll");setTimeout(function(){document.getElementById("copyButton").focus();},50);trackEvent("view_wechat_qr");}
  function closeModal(){modal.classList.remove("open");modal.setAttribute("aria-hidden","true");document.body.classList.remove("no-scroll");}
  document.querySelectorAll(".claim-button").forEach(function(b){b.addEventListener("click",function(){openModal(b.dataset.id);});});
  document.querySelectorAll("[data-close-modal]").forEach(function(b){b.addEventListener("click",closeModal);});
  document.addEventListener("keydown",function(e){if(e.key==="Escape")closeModal();}); sheet.addEventListener("touchstart",function(e){startY=e.touches[0].clientY;},{passive:true});sheet.addEventListener("touchend",function(e){if(e.changedTouches[0].clientY-startY>90)closeModal();},{passive:true});
  async function copyText(value){if(navigator.clipboard&&root.isSecureContext){await navigator.clipboard.writeText(value);return true;}var ta=document.createElement("textarea");ta.value=value;ta.setAttribute("readonly","");ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();ta.setSelectionRange(0,99999);var ok=document.execCommand("copy");document.body.removeChild(ta);return ok;}
  document.getElementById("copyButton").addEventListener("click",function(){if(!selected)return;copyText(generateMessage(selected)).then(function(ok){text("copyStatus",ok?"话术已复制，请添加店长微信并发送。":"复制失败，请长按上方话术手动复制。");if(ok)trackEvent("copy_message");}).catch(function(){text("copyStatus","复制失败，请长按上方话术手动复制。");});});
  text("managerName",c.managerName);text("managerWechat",c.managerWechat);text("footerManager",c.managerName);text("footerWechat",c.managerWechat);
  ["modalQr","footerQr"].forEach(function(id){var img=document.getElementById(id);img.src=c.managerQr;img.onerror=function(){imageFallback(img);};});
  document.querySelectorAll("[data-scroll-claim]").forEach(function(b){if(expired)b.disabled=true;b.addEventListener("click",function(){trackEvent("click_claim_main");document.getElementById("claim").scrollIntoView({behavior:"smooth"});});});
  var map=document.getElementById("mapButton");if(!c.mapUrl){map.disabled=true;document.getElementById("mapHint").hidden=false;}else{map.addEventListener("click",function(){trackEvent("click_navigation");root.location.href=c.mapUrl;});}
  var ruleItems=["本活动仅限首次体验MEG FITNESS泰州路店的新客参与。","每位用户可在自由训练体验周卡、50分钟塑形私教一对一体验课、50分钟器械普拉提一对一体验课中任选一项。","每位用户限领取一次，三项体验不可重复领取、叠加、转赠或兑换现金。","免费体验领取截止时间为2026年9月30日23:00。","用户添加店长微信、发送对应领取话术并获得店长确认后，视为领取成功。","领取成功后，需在14个自然日内完成首次到店体验或首次开通。超过14个自然日未使用，体验资格自动失效。","自由训练体验周卡自首次到店开通时生效，连续7个自然日有效。","自由训练周卡有效期内每天不限进入次数，可使用门店7:00—23:00全部开放时段。","例如用户于9月1日任意时间首次开通自由训练周卡，周卡可使用至9月7日门店当日营业结束。","自由训练体验首次开通需提前预约，并在工作人员在场时完成登记、设施介绍及入场说明。","塑形私教体验课和器械普拉提体验课均为50分钟一对一课程。","具体教练及体验时间以门店预约安排为准。","普拉提体验用户如与朋友共同预约，可在双方自愿的情况下选择一对二体验。","免费体验名额分别为：自由训练体验周卡50份、塑形私教体验课20份、器械普拉提体验课20份。","名额按照添加微信、发送领取话术及店长确认的先后顺序发放，领完即止。","本活动仅适用于MEG FITNESS泰州路店，其他门店不参与。","门店可根据设备维护、教练排班和现场安全情况，对部分预约时间进行合理调整。"];
  var rules=document.getElementById("rules"),toggle=document.getElementById("toggleRules"),expanded=false;rules.innerHTML=ruleItems.map(function(x){return '<li>'+x+'</li>';}).join('');toggle.addEventListener("click",function(){expanded=rulesExpanded(expanded);rules.classList.toggle("expanded",expanded);toggle.textContent=expanded?"收起完整规则 −":"展开完整规则 ＋";toggle.setAttribute("aria-expanded",String(expanded));if(expanded)trackEvent("expand_rules");});
  if(expired){document.getElementById("endedMessage").hidden=false;document.querySelector(".deadline-card").classList.add("expired");}
  function updateCountdown(){var diff=new Date(c.deadline).getTime()-Date.now(),el=document.getElementById("countdown");if(diff<=0){el.textContent="活动已结束";return;}var d=Math.floor(diff/864e5),h=Math.floor(diff%864e5/36e5),m=Math.floor(diff%36e5/6e4);el.textContent="视觉倒计时："+d+"天 "+h+"小时 "+m+"分";} updateCountdown();setInterval(updateCountdown,60000);
})(window);
