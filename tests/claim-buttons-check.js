const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const zh = fs.readFileSync(path.join(root, "index.html"), "utf8");
const en = fs.readFileSync(path.join(root, "en", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

function buttonHas(html, experience, language) {
  const buttons = html.match(/<button\b[^>]*class="[^"]*js-claim-experience[^"]*"[^>]*>/g) || [];
  return buttons.some(button => button.includes(`data-experience="${experience}"`) && button.includes(`data-language="${language}"`) && button.includes('type="button"'));
}

const experiences = ["open-gym", "personal-training", "pilates"];
const checks = [
  ["Chinese page has exactly three experience claim buttons", (zh.match(/js-claim-experience/g) || []).length === 3],
  ["English page has exactly three experience claim buttons", (en.match(/js-claim-experience/g) || []).length === 3],
  ["Chinese buttons use the required data attributes", experiences.every(item => buttonHas(zh, item, "zh-CN"))],
  ["English buttons use the required data attributes", experiences.every(item => buttonHas(en, item, "en"))],
  ["Both pages expose trial-options", zh.includes('id="trial-options"') && en.includes('id="trial-options"')],
  ["Main CTA uses scroll-only class", zh.includes("js-scroll-to-trials") && en.includes("js-scroll-to-trials")],
  ["App uses delegated experience clicks", app.includes('document.addEventListener("click"') && app.includes('target.closest(".js-claim-experience")')],
  ["App opens and safely updates the claim modal", app.includes('function openClaimModal(experience, language)') && app.includes('console.error("Claim modal not found")') && app.includes('modal.hidden = false')],
  ["Open modal has a visible CSS state", css.includes(".modal.open{visibility:visible;opacity:1}")],
  ["Chinese titles and messages are present", ["自由训练体验周卡", "塑形私教体验课", "器械普拉提体验课", "想领取自由训练体验周卡。", "想预约塑形私教体验。", "想预约器械普拉提体验。"].every(text => app.includes(text))],
  ["English titles and messages are present", ["7-Day Open Gym Trial", "Personal Training Trial", "Reformer Pilates Trial", "I would like to claim the 7-day Open Gym trial.", "I would like to book the Personal Training trial.", "I would like to book the Reformer Pilates trial."].every(text => app.includes(text))],
  ["Clipboard fallback is present", app.includes('document.createElement("textarea")') && app.includes('document.execCommand("copy")')],
  ["Copy success messages are exact", app.includes("话术已复制，请添加店长微信并发送") && app.includes("Message copied. Please add the gym manager on WeChat and send it.")],
  ["English root resources cannot resolve under /en/", en.includes('href="/styles.css?v=20260804-3"') && en.includes('src="/config.js?v=20260804-3"') && en.includes('src="/app.js?v=20260804-3"') && !/src="(?:\.\/)?app\.js/.test(en)],
  ["Scripts defer until the DOM is ready", /<script defer src="\/config\.js\?v=20260804-3"><\/script><script defer src="\/app\.js\?v=20260804-3"><\/script>/.test(zh) && /<script defer src="\/config\.js\?v=20260804-3"><\/script><script defer src="\/app\.js\?v=20260804-3"><\/script>/.test(en) && app.includes('document.addEventListener("DOMContentLoaded", init')],
  ["App tolerates a missing config object", app.includes("root.MEG_CONFIG || {}")],
  ["English membership inquiry uses delegated interaction", en.includes("js-open-gym-membership") && app.includes('target.closest(".js-open-gym-membership")')]
];

checks.forEach(([name, passed]) => console.log(`${passed ? "PASS" : "FAIL"}: ${name}`));
if (checks.some(([, passed]) => !passed)) process.exit(1);
