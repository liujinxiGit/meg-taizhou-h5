const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const zh = fs.readFileSync(path.join(root, "index.html"), "utf8");
const en = fs.readFileSync(path.join(root, "en", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const config = fs.readFileSync(path.join(root, "config.js"), "utf8");
const opsHtml = fs.readFileSync(path.join(root, "ops", "index.html"), "utf8");
const opsJs = fs.readFileSync(path.join(root, "ops", "ops.js"), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(app, sandbox);
const plan = sandbox.window.MEG_UTILS.imageLoadingPlan;

function inOrder(source, fragments) {
  let previous = -1;
  return fragments.every(fragment => {
    const index = source.indexOf(fragment);
    if (index <= previous) return false;
    previous = index;
    return true;
  });
}

const navTargets = ["hero", "trial-options", "space", "training", "coaches", "location", "faq"];
const checks = [
  ["Chinese page follows the decision-making order", inOrder(zh, ['id="hero"', 'id="trial-options"', 'id="space"', 'id="training"', 'id="coaches"', 'id="brand-trust"', 'id="membership"', 'id="location"', 'id="faq"', 'class="section rules-section"', 'id="final-cta"'])],
  ["English page follows the same hierarchy", inOrder(en, ['id="hero"', 'id="trial-options"', 'id="space"', 'id="training"', 'id="coaches"', 'id="brand-trust"', 'id="open-gym-memberships"', 'id="location"', 'id="faq"', 'class="section rules-section"', 'id="final-cta"'])],
  ["Both pages include complete desktop and mobile navigation anchors", navTargets.every(id => (zh.match(new RegExp(`href="#${id}"`, "g")) || []).length >= 2 && (en.match(new RegExp(`href="#${id}"`, "g")) || []).length >= 2)],
  ["Mobile menu and desktop active-section logic exist", app.includes("openSectionMenu") && app.includes("aria-current") && app.includes("IntersectionObserver") && css.includes(".section-menu-button") && css.includes(".section-nav.is-visible")],
  ["Ended body copy is absent from pre-deadline HTML", !zh.includes("本期开业免费体验领取已结束") && !en.includes("This opening trial offer has ended")],
  ["Ended body copy is created only by JavaScript after expiry", app.includes('if (expired)') && app.includes('document.createElement("p")') && app.includes('endedMessage.textContent')],
  ["Hero is the only explicitly preloaded high-priority image", [zh, en].every(html => (html.match(/rel="preload" as="image"/g) || []).length === 1 && html.includes('fetchpriority="high"'))],
  ["Progressive image strategy is pure and has three levels", plan("hero", 0, true).tier === "critical" && plan("space", 0, true).tier === "near" && plan("folded-gallery", 0, false).tier === "deferred" && plan("later", 0, true).tier === "later"],
  ["Near images prewarm without blocking initial render", app.includes("requestIdleCallback") && app.includes('rootMargin:imageLoadingPlan("space"') && app.includes("spaceImages.slice(0, 4)")],
  ["Folded store galleries defer their src until expansion", app.includes('image.dataset.progressiveSrc') && app.includes('image.removeAttribute("src")') && app.includes("revealDeferredGallery(locationDetails)")],
  ["Content media has stable CSS aspect ratios", css.includes("aspect-ratio:4/3") && css.includes("contain:layout paint")],
  ["Reduced motion covers scrolling navigation", css.includes("prefers-reduced-motion:reduce") && app.includes('behavior:reduced ? "auto" : "smooth"')],
  ["Training selectors stay available while details start collapsed", [zh, en].every(html => html.includes("data-toggle-more-programs") && /class="program-tabs"[^>]*data-more-programs(?![^>]*hidden)/.test(html) && /class="program-details"[^>]*data-more-programs hidden/.test(html))],
  ["Public terminology is fully updated", [zh, app, config, opsHtml, opsJs].every(source => !source.includes("物理重建")) && zh.includes("运动功能重建") && config.includes("运动功能重建") && !en.includes("Physical Reconditioning") && en.includes("Movement Rehabilitation")],
  ["Membership savings and totals are accurate", ["全年共省¥889", "折合约¥225/月", "比单月购买12个月省¥889"].every(text => zh.includes(text))],
  ["Coach data supports active records", config.includes("coaches:") && config.includes("active: true") && app.includes("coach.active === false")],
  ["Static assets use the current cache versions", [zh, en].every(html => html.includes('/styles.css?v=20260809-1') && html.includes('/config.js?v=20260809-1') && html.includes('/app.js?v=20260809-1')) && config.includes('assetVersion: "20260806-2"')]
];

checks.forEach(([name, passed]) => console.log(`${passed ? "PASS" : "FAIL"}: ${name}`));
if (checks.some(([, passed]) => !passed)) process.exit(1);
