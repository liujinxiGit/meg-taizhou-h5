const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const zh = fs.readFileSync(path.join(root, "index.html"), "utf8");
const en = fs.readFileSync(path.join(root, "en", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const configSource = fs.readFileSync(path.join(root, "config.js"), "utf8");
const configWindow = {};
vm.runInNewContext(configSource, { window: configWindow });

function section(html, id) {
  return (html.match(new RegExp(`<section[^>]+id="${id}"[\\s\\S]*?<\\/section>`)) || [""])[0];
}

const zhPrices = section(zh, "membership");
const enPrices = section(en, "open-gym-memberships");
const removedZh = ["连续包月 · 12个月", "连续包月 · 6个月", "单次月卡"];
const removedEn = ["12-Month Monthly Plan", "6-Month Monthly Plan", "One-Month Pass"];
const locations = configWindow.MEG_CONFIG.locations;

const utilityWindow = {};
vm.runInNewContext(app, { window: utilityWindow, URL, URLSearchParams, TextEncoder, Uint8Array });

const checks = [
  ["Chinese membership section has exactly three cards", (zhPrices.match(/class="price-card/g) || []).length === 3],
  ["English membership section has exactly three cards", (enPrices.match(/class="price-card/g) || []).length === 3],
  ["Chinese membership content is complete", ["次卡", "随买随用，适合偶尔训练", "首次月卡", "新客约5折体验", "年卡", "全年共省¥889", "折合约¥225/月", "比单月购买12个月省¥889"].every(value => zhPrices.includes(value))],
  ["English membership content is complete", ["Single Visit", "Pay as you go", "First Month", "New member trial", "First-time purchase only", "Annual Membership", "Save ¥889", "Approx. ¥225 / month"].every(value => enPrices.includes(value))],
  ["Removed memberships are absent from page DOM", removedZh.every(value => !zh.includes(value)) && removedEn.every(value => !en.includes(value))],
  ["All three stores have empty Dianping configuration", ["pac", "wuding", "taizhou"].every(id => locations.some(location => location.id === id && location.dianpingUrl === ""))],
  ["Empty configuration does not hardcode Dianping links in HTML", !zh.includes("dianping-link") && !en.includes("dianping-link")],
  ["Dianping links use safe web URLs and new-page attributes", app.includes('link.target = "_blank"') && app.includes('link.rel = "noopener noreferrer"') && utilityWindow.MEG_UTILS.normalizeWebUrl("https://example.com/store") === "https://example.com/store" && utilityWindow.MEG_UTILS.normalizeWebUrl("dianping://shop/1") === ""],
  ["Dianping secondary action keeps a 44px touch target", /\.dianping-link\{[^}]*min-height:44px/.test(css)],
  ["Both languages use the same cache version", [zh, en].every(html => ["styles.css", "config.js", "app.js"].every(asset => html.includes(`/${asset}?v=20260809-1`)))]
];

checks.forEach(([name, passed]) => console.log(`${passed ? "PASS" : "FAIL"}: ${name}`));
if (checks.some(([, passed]) => !passed)) process.exit(1);
