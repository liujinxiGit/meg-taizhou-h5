const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const zh = fs.readFileSync(path.join(root, "index.html"), "utf8");
const en = fs.readFileSync(path.join(root, "en", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const configSource = fs.readFileSync(path.join(root, "config.js"), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(configSource, sandbox);
const coaches = sandbox.window.MEG_CONFIG.coaches;

const count = (source, pattern) => (source.match(pattern) || []).length;
const coachBlock = (source, id) => {
  const start = source.indexOf(`data-coach-id="${id}"`);
  const next = source.indexOf('<article class="coach-card"', start + 1);
  return source.slice(start, next === -1 ? source.indexOf("</div>\n    </div></section>", start) : next);
};
const asset = name => fs.readFileSync(path.join(root, "assets", name));
const isWebp = name => {
  const data = asset(name);
  return data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP";
};

const suixinZh = coachBlock(zh, "suixin");
const majieZh = coachBlock(zh, "majie");
const suixinEn = coachBlock(en, "suixin");
const majieEn = coachBlock(en, "majie");

const checks = [
  ["Both pages show exactly three coach cards", [zh, en].every(source => count(source, /<article class="coach-card"/g) === 3)],
  ["Existing Gym Manager Xu profile is preserved", ["许教练", "MEG FITNESS 泰州路店店长", "300+", "12,000+", "NSCA-CSCS"].every(value => zh.includes(value)) && ["Coach Xu", "Gym Manager Xu", "300+", "12,000+", "NSCA-CSCS"].every(value => en.includes(value))],
  ["Suixin is mapped to the supplied portrait and complete Chinese profile", suixinZh.includes("coach-suixin.webp?v=20260818-1") && ["隋心", "8年训练与教学经验", "休闲体育本科", "NSCA-CPT", "国家健身教练职业认证", "IBFA", "臀部塑形", "腰腹塑形"].every(value => suixinZh.includes(value))],
  ["Majie is mapped to the supplied portrait and complete Chinese profile", majieZh.includes("coach-majie.webp?v=20260818-1") && ["马杰", "8年一线教学经验", "200+", "10,000+", "NSCA-CPT", "CBBA", "功能性训练", "长期进阶"].every(value => majieZh.includes(value))],
  ["English profiles use natural names, roles and verified facts", ["Suixin", "MEG FITNESS Personal Trainer", "8 Years of Coaching Experience", "Bachelor’s Degree in Leisure Sports", "IBFA Certification"].every(value => suixinEn.includes(value)) && ["Majie", "8 Years of Frontline Coaching Experience", "200+", "10,000+", "CBBA Certified Coach"].every(value => majieEn.includes(value))],
  ["Config contains three active coach records", coaches.length === 3 && ["manager", "suixin", "majie"].every(id => coaches.some(coach => coach.id === id && coach.enabled && coach.active))],
  ["New config records use the extensible coach fields", coaches.filter(coach => coach.id !== "manager").every(coach => coach.name && coach.role && coach.photo && coach.experience && Array.isArray(coach.certifications) && Array.isArray(coach.specialties) && Array.isArray(coach.bio) && coach.active === true)],
  ["Coach portraits are optimized WebP assets", ["coach-suixin.webp", "coach-majie.webp"].every(name => fs.existsSync(path.join(root, "assets", name)) && isWebp(name) && asset(name).length < 150000)],
  ["New images reserve a stable 4:5 layout and load asynchronously", [suixinZh, majieZh, suixinEn, majieEn].every(block => block.includes('loading="lazy"') && block.includes('decoding="async"') && block.includes('width="1000" height="1250"')) && css.includes("aspect-ratio:4/5")],
  ["Every coach has an accessible expand/collapse control", [zh, en].every(source => ["manager", "suixin", "majie"].every(id => source.includes(`aria-controls="coach-detail-${id}"`) && source.includes(`id="coach-detail-${id}" hidden`))) && app.includes(".js-coach-toggle")],
  ["Responsive team layout is one column on mobile and three columns on desktop", css.includes("@media(min-width:1100px){.coach-team-section .wrap{width:min(100% - 40px,1200px)}.coach-list{grid-template-columns:repeat(3,minmax(0,1fr))}}") && css.includes("min-width:0")],
  ["Coach copy avoids unverified medical or outcome claims", !/治愈|治疗|康复治疗|guaranteed|cure|medical rehabilitation/i.test(suixinZh + majieZh + suixinEn + majieEn)],
  ["Contact and booking ownership remain with Gym Manager Xu", zh.includes("许店长微信：13101839816") && en.includes("Gym Manager Xu · WeChat") && !/隋心微信|马杰微信|Suixin · WeChat|Majie · WeChat/.test(zh + en)]
];

checks.forEach(([name, passed]) => console.log(`${passed ? "PASS" : "FAIL"}: ${name}`));
if (checks.some(([, passed]) => !passed)) process.exit(1);
