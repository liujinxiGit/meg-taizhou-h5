const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const zh = fs.readFileSync(path.join(root, "index.html"), "utf8");
const en = fs.readFileSync(path.join(root, "en", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const config = fs.readFileSync(path.join(root, "config.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

const programIds = ["posture", "physical-reconditioning", "weightlifting", "functional", "mobility-recovery", "sports-performance", "youth-fitness", "boxing", "group-classes"];
const goalIds = ["independent", "body-shaping", "posture", "discomfort", "strength", "weightlifting", "sports-performance", "boxing", "youth-fitness", "pilates", "group-classes", "recovery"];
const count = (html, pattern) => (html.match(pattern) || []).length;
const block = (html, selector, id) => (html.match(new RegExp(`<article class="${selector}"[^>]*data-[^=]+="${id}"[\\s\\S]*?</article>`)) || [""])[0];
const ordered = (html, values) => values.every((value, index) => index === 0 || html.indexOf(value) > html.indexOf(values[index - 1]));
const assetExists = filename => fs.existsSync(path.join(root, "assets", filename));
const isTransparentPng = filename => {
  const png = fs.readFileSync(path.join(root, "assets", filename));
  return png.subarray(1, 4).toString() === "PNG" && [4, 6].includes(png[25]);
};

const checks = [
  ["1. Nine specialist programs exist on both pages", [zh, en].every(html => count(html, /class="program-tab js-program-toggle"/g) === 9 && programIds.every(id => html.includes(`data-program="${id}"`) && html.includes(`data-program-detail="${id}"`)))],
  ["2. Movement Rehabilitation replaces the old public term", zh.includes("运动功能重建") && !zh.includes("物理重建") && !zh.includes("运动康复")],
  ["3. English uses Movement Rehabilitation", en.includes("Movement Rehabilitation") && !en.includes("Physical Reconditioning") && !/Medical Rehabilitation|Physical Therapy|Injury Treatment|Pain Treatment|Rehabilitation Treatment/i.test(en)],
  ["4. Boxing Training exists", zh.includes("拳击训练") && en.includes("Boxing Training") && programIds.includes("boxing")],
  ["5. Youth age is 5–12", zh.includes("5—12岁") && en.includes("aged 5–12")],
  ["6. Specialist personal training is one-on-one and by appointment", ["posture", "physical-reconditioning", "weightlifting", "functional", "mobility-recovery", "sports-performance", "youth-fitness", "boxing"].every(id => block(zh, "program-detail", id).includes("预约制一对一私教") && block(en, "program-detail", id).includes("One-on-one Personal Training") && block(en, "program-detail", id).includes("Advance booking required"))],
  ["7. Group classes are one-to-many", block(zh, "program-detail", "group-classes").includes("一对多") && block(en, "program-detail", "group-classes").includes("One-to-many")],
  ["8. Group classes are led by the Gym Manager", block(zh, "program-detail", "group-classes").includes("泰州路店店长") && block(en, "program-detail", "group-classes").includes("Taizhou Road Gym Manager")],
  ["9. Olympic Weightlifting is led by Coach Xu", block(zh, "program-detail", "weightlifting").includes("许教练") && block(en, "program-detail", "weightlifting").includes("Coach Xu")],
  ["10. Coach Xu profile is complete", ["许教练", "从业10年", "社会体育指导与管理专业", "功能性训练", "塑形减脂", "举重训练"].every(value => zh.includes(value)) && ["Coach Xu", "10 years", "Social Sports Instruction and Management", "Functional Training", "Fat Loss &amp; Body Shaping", "Olympic Weightlifting"].every(value => en.includes(value))],
  ["11. Only the two verified certifications are shown", [zh, en].every(html => html.includes("NSCA-CSCS") && html.includes("SNC")) && !/\b(?:NASM|ACE|ACSM|ISSA|FMS)\b|CrossFit Level|Precision Nutrition/i.test(zh + en)],
  ["12. Coach service statistics are shown", zh.includes("300+") && zh.includes("12,000+") && en.includes("300+") && en.includes("12,000+")],
  ["13. Internal coach education role is shown", zh.includes("MEG内训课程总监") && en.includes("Director of Internal Coach Education at MEG FITNESS")],
  ["14. PAC information is accurate", ["2016年始于三和大厦", "2024年迁入PAC商场并更名为PAC店", "PAC购物中心1号楼", "昌平路地铁站2号口", "约190㎡"].every(value => zh.includes(value)) && ["Founded at Sanhe Building in 2016", "relocated to PAC Mall in 2024", "becoming MEG FITNESS PAC", "Building 1, PAC Mall", "Changping Road Metro Station, Exit 2", "Around 190㎡"].every(value => en.includes(value))],
  ["15. Wuding Road information is accurate", ["2021", "武定路1102号怡甸公寓", "进门右手边一楼", "约250㎡"].every(value => zh.includes(value)) && ["Ground Floor, Yidian Apartment", "1102 Wuding Road", "Caojiadu, Jing'an District", "Around 250㎡"].every(value => en.includes(value))],
  ["16. Taizhou Road information is accurate", ["2026年", "600㎡双层空间", "约300㎡自由训练区", "每日7:00—23:00", "余姚路派出所对面二楼"].every(value => zh.includes(value)) && ["Established in 2026", "600㎡ over two floors", "Around 300㎡ Open Gym area", "7:00 AM to 11:00 PM", "opposite Yuyao Road Police Station"].every(value => en.includes(value))],
  ["17. All three store years are accurate", [zh, en].every(html => ["2016", "2021", "2024", "2026"].every(year => html.includes(year)))],
  ["18. Brand timeline order and history are accurate", ordered(block(zh, "brand-timeline", "never") || zh.slice(zh.indexOf("data-brand-timeline")), ["2016", "2021", "2024", "2026"]) && ["三和大厦店开业", "迁入 PAC 商场，更名为 PAC 店"].every(value => zh.includes(value)) && ordered(en.slice(en.indexOf("data-brand-timeline")), ["2016", "2021", "2024", "2026"]) && ["Sanhe Building studio opened", "Moved to PAC Mall and became MEG FITNESS PAC"].every(value => en.includes(value))],
  ["19. Missing location images use a branded fallback", [zh, en].every(html => count(html, /data-fallback-image/g) >= 5 && count(html, /image-fallback-card/g) === 3) && app.includes('classList.add("is-fallback")') && app.includes('imageTrigger.classList.contains("is-fallback")') && css.includes(".image-preview-trigger.is-fallback")],
  ["20. Chinese core page remains intact", zh.includes("开业免费体验，任选一项") && zh.includes("正式会员卡价") && zh.includes("立即领取免费体验")],
  ["21. English core page remains intact", en.includes("Choose One Free Opening Trial") && en.includes("Open Gym Memberships") && en.includes("Claim Your Free Trial")],
  ["22. Existing claim modal is reused", count(zh, /id="claimModal"/g) === 1 && count(en, /id="claimModal"/g) === 1 && app.includes("openClaimModal") && app.includes("openConsultationModal")],
  ["23. Mobile page overflow is guarded", /body\{[^}]*overflow-x:hidden/.test(css) && css.includes("min-width:0") && css.includes("overflow-wrap:anywhere") && css.includes(".brand-location-list{display:flex") && css.includes("overflow-x:auto")],
  ["24. New analytics events and metadata exist", ["training_program_selected", "goal_selected", "goal_recommendation_cta", "coach_profile_expanded", "location_card_expanded", "location_map_clicked", "timeline_viewed", "recommended_service", "timestamp"].every(value => app.includes(value))],
  ["Twelve bilingual goals and result cards exist", [zh, en].every(html => count(html, /class="goal-button js-goal-button"/g) === 12 && count(html, /data-goal-result=/g) === 12 && goalIds.every(id => html.includes(`data-goal="${id}"`) && html.includes(`data-goal-result="${id}"`)))],
  ["Program, coach and location data are direct HTML", config.includes("showCoachSection: true") && !/data-config-section="coach" hidden/.test(zh + en) && [zh, en].every(html => count(html, /data-location-id="(?:pac|wuding|taizhou)"/g) >= 3)],
  ["Official logos are transparent and have no white CSS card", ["meg-logo-horizontal.png", "meg-logo-vertical.png"].every(isTransparentPng) && [zh, en].every(html => html.includes("meg-logo-horizontal.png") && html.includes("meg-logo-vertical.png")) && !/\.brand-logo-horizontal\{[^}]*background:/.test(css) && !/\.footer-brand-logo\{[^}]*background:/.test(css)],
  ["All supplied Wuding Road photos are included", ["location-wuding.webp", "location-wuding-cardio.webp", "location-wuding-dumbbells.webp", "location-wuding-strength.webp", "location-wuding-conditioning.webp", "location-wuding-changing.webp"].every(assetExists) && [zh, en].every(html => html.includes("location-wuding.webp") && html.includes("location-wuding-changing.webp"))],
  ["All supplied PAC photos are included", ["location-pac.webp", "location-pac-storefront.webp", "location-pac-strength.webp", "location-pac-rack.webp", "location-pac-cardio.webp", "location-pac-rower.webp", "location-pac-boxing.webp", "location-pac-refreshments.webp", "location-pac-wash.webp"].every(assetExists) && [zh, en].every(html => count(html, /class="location-photo-item js-image-preview"/g) === 13 && html.includes("location-pac.webp") && html.includes("location-pac-wash.webp"))]
];

checks.forEach(([name, passed]) => console.log(`${passed ? "PASS" : "FAIL"}: ${name}`));
if (checks.some(([, passed]) => !passed)) process.exit(1);
