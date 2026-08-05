const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const zh = fs.readFileSync(path.join(root, "index.html"), "utf8");
const en = fs.readFileSync(path.join(root, "en", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const headers = fs.readFileSync(path.join(root, "_headers"), "utf8");

const mobileCss = (css.match(/@media\(max-width:767px\)\{[\s\S]*?\n\}/) || [""])[0];
const checks = [
  ["1. Mobile goal selector uses a compact two-row rail", css.includes("grid-template-rows:repeat(2,auto)") && css.includes(".program-tabs,.goal-buttons")],
  ["2. Mobile specialist program entry uses a compact two-row rail", css.includes("grid-auto-columns:minmax(148px,44vw)") && css.includes("scroll-snap-type:x proximity")],
  ["3. WHY MEG uses two columns on mobile", mobileCss.includes(".program-tabs,.goal-buttons,.why-grid{grid-template-columns:repeat(2")],
  ["4. Location cards support horizontal scroll snap", mobileCss.includes(".brand-location-list{display:flex") && mobileCss.includes("scroll-snap-type:x mandatory")],
  ["5. Main training modes use compact horizontal cards", mobileCss.includes(".experience-list,.training-grid,.coaching-grid{display:flex") && mobileCss.includes("scroll-snap-align:start")],
  ["6. Bottom CTA is mobile-only", css.includes(".mobile-cta-bar{display:none}") && css.includes("@media(max-width:767px)") && css.includes(".mobile-cta-bar{position:fixed") && css.includes("@media(min-width:768px){.mobile-cta-bar{display:none}")],
  ["7. Claim dialog is a mobile bottom sheet", mobileCss.includes(".modal-sheet{max-height:85vh;max-height:85dvh") && css.includes(".modal-sheet{position:absolute;bottom:0")],
  ["8. Dialog locks and restores page scroll", app.includes("function lockPage()") && app.includes("function unlockPage()") && app.includes("root.scrollTo(0, savedScrollY)")],
  ["9. Bilingual toast messages exist", ["已复制，添加店长微信后直接粘贴发送即可", "Copied. Add the gym manager on WeChat and send the message.", "地址已复制", "Address Copied", "微信号已复制", "WeChat ID Copied"].every(text => app.includes(text))],
  ["10. QR images remain ordinary long-pressable images", [zh, en].every(html => /<img[^>]+id="modalQr"[^>]+manager-wechat\.png/.test(html)) && !/modalQr[\s\S]{0,160}preventDefault/.test(app)],
  ["11. Clipboard textarea fallback remains", app.includes('document.createElement("textarea")') && app.includes('document.execCommand("copy")')],
  ["12. Horizontal overflow is guarded", /body\{[^}]*overflow-x:hidden/.test(css) && css.includes("overflow-wrap:anywhere")],
  ["13. English long text is guarded", css.includes(".lang-en") && css.includes("overflow-wrap:anywhere")],
  ["14. 375px layout is covered by mobile rules", css.includes("@media(max-width:390px)") && mobileCss.includes("min(84vw,360px)")],
  ["15. 390px layout has a compact breakpoint", css.includes("@media(max-width:390px)")],
  ["16. 430px layout is covered by the 767px breakpoint", css.includes("@media(max-width:767px)")],
  ["17. Safe area styles exist", css.includes("env(safe-area-inset-bottom)") && css.includes("env(safe-area-inset-top)")],
  ["18. Reduced motion is respected", css.includes("@media(prefers-reduced-motion:reduce)")],
  ["19. All four claim buttons remain", (zh.match(/js-claim-experience/g) || []).length === 4 && (en.match(/js-claim-experience/g) || []).length === 4],
  ["20. Goal recommendation logic remains", app.includes('target.closest(".js-goal-button")') && app.includes("data-goal-result")],
  ["21. Image fallback remains", app.includes('classList.add("is-fallback")') && css.includes(".is-fallback img{display:none}")],
  ["22. HTML cache headers cover both languages", headers.includes("/index.html") && headers.includes("/en/index.html") && (headers.match(/no-cache, no-store, must-revalidate/g) || []).length >= 4],
  ["FAQ is bilingual and accordion-based", [zh, en].every(html => (html.match(/js-faq-toggle/g) || []).length === 6) && app.includes('target.closest(".js-faq-toggle")')],
  ["Non-hero images use lazy loading", [zh, en].every(html => (html.match(/loading="lazy"/g) || []).length >= 20)],
  ["Hero image is preloaded", [zh, en].every(html => html.includes('rel="preload" as="image"') && html.includes("hero.webp?v=20260804-7"))],
  ["Facility galleries include swipe hints", zh.includes("左右滑动查看更多门店图片") && en.includes("Swipe to view more gym photos")],
  ["Four main Chinese training modes are visible", zh.includes("四种训练方式") && zh.includes("左右滑动查看四种训练方式") && zh.includes("<span class=\"card-no\">04</span><h3>拳击训练</h3>")],
  ["Language switch stays fully visible on mobile", css.includes(".language-switch .language-current,.language-switch .language-full,.language-switch i{display:inline}") && css.includes(".language-switch .language-short{display:none}")],
  ["Language switch preserves source", app.includes('languageUrl.searchParams.set("source", source)')],
  ["Static resources share cache version 20260804-7", [zh, en].every(html => html.includes("/styles.css?v=20260804-7") && html.includes("/app.js?v=20260804-7"))]
];

checks.forEach(([name, passed]) => console.log(`${passed ? "PASS" : "FAIL"}: ${name}`));
if (checks.some(([, passed]) => !passed)) process.exit(1);
