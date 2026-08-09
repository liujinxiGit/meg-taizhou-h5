const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const enPath = path.join(root, "en", "index.html");
const en = fs.existsSync(enPath) ? fs.readFileSync(enPath, "utf8") : "";
const zh = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const withoutScripts = en.replace(/<script[\s\S]*?<\/script>/gi, "");
const openGymSection = (en.match(/<section class="section open-gym-section"[\s\S]*?<\/section>/) || [""])[0];
const coachingSection = (en.match(/<section class="section coaching-section"[\s\S]*?<\/section>/) || [""])[0];

const requiredPrices = ["Single Visit", "Pay as you go", "First Month", "New member trial", "First-time purchase only", "Annual Membership", "Save ¥889", "Approx. ¥225 / month", "59", "149", "2699"];
const removedPrices = ["First Month Offer", "12-Month Monthly Plan", "6-Month Monthly Plan", "One-Month Pass"];
const coreContent = ["Open Gym", "7-Day Open Gym Trial", "50-Minute Personal Training Trial", "50-Minute Reformer Pilates Trial", "Boxing Training Trial", "7:00 AM–11:00 PM", "Around 300㎡", "13101839816", "manager-wechat.png", "2nd Floor, opposite Yuyao Road Police Station", "Intersection of Taizhou Road and Yuyao Road", "Jing’an District, Shanghai"];
const checks = [
  ["/en/index.html exists", fs.existsSync(enPath)],
  ["English html lang is present", /<html lang="en">/.test(en)],
  ["English page contains Open Gym", en.includes("Open Gym")],
  ["All four trials are present", ["7-Day Open Gym Trial", "50-Minute Personal Training Trial", "50-Minute Reformer Pilates Trial", "Boxing Training Trial"].every(x => en.includes(x))],
  ["Open Gym section is substantially larger than coaching section", openGymSection.length > coachingSection.length * 1.2],
  ["Opening hours are present", en.includes("7:00 AM–11:00 PM")],
  ["Around 300㎡ Open Gym area is present", en.includes("Around 300㎡")],
  ["All three membership options and prices are present", requiredPrices.every(x => en.includes(x))],
  ["Removed English memberships are absent", removedPrices.every(x => !en.includes(x))],
  ["Gym Manager WeChat is present", en.includes("13101839816")],
  ["Manager QR image is present", en.includes("manager-wechat.png")],
  ["Complete English address is present", ["2nd Floor, opposite Yuyao Road Police Station", "Intersection of Taizhou Road and Yuyao Road", "Jing’an District, Shanghai"].every(x => en.includes(x))],
  ["No stair-related content is present", !/stair|楼梯/i.test(en)],
  ["Core content remains without JavaScript", coreContent.every(x => withoutScripts.includes(x))],
  ["Chinese page remains intact", /<html lang="zh-CN">/.test(zh) && zh.includes("开业免费体验") && zh.includes("MEG FITNESS 泰州路店")],
  ["Both pages contain language switches", zh.includes('href="/en/"') && en.includes('href="/"')],
  ["No obvious horizontal overflow rule", /body\{[^}]*overflow-x:hidden/.test(css) && !/(?:^|[;{])width:\s*[1-9][0-9]{3,}px/.test(css)],
  ["Both pages use root resource paths and current versions", zh.includes('href="/styles.css?v=20260809-1"') && zh.includes('src="/config.js?v=20260809-1"') && zh.includes('src="/app.js?v=20260809-1"') && en.includes('href="/styles.css?v=20260809-1"') && en.includes('src="/config.js?v=20260809-1"') && en.includes('src="/app.js?v=20260809-1"') && !en.includes('../app.js') && !en.includes('../config.js') && !en.includes('../styles.css')]
];

checks.forEach(([name, passed]) => console.log(`${passed ? "PASS" : "FAIL"}: ${name}`));
if (checks.some(([, passed]) => !passed)) process.exit(1);
