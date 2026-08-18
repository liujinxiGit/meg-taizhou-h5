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
const managerZh = coachBlock(zh, "manager");
const managerEn = coachBlock(en, "manager");
const managerConfig = coaches.find(coach => coach.id === "manager");
const suixinConfig = coaches.find(coach => coach.id === "suixin");
const majieConfig = coaches.find(coach => coach.id === "majie");

const checks = [
  ["Both pages show exactly three coach cards", [zh, en].every(source => count(source, /<article class="coach-card"/g) === 3)],
  ["Gym Manager Xu uses his full name in both languages", ["许宇祥", "MEG FITNESS 泰州路店店长", "300+", "12,000+", "NSCA-CSCS"].every(value => managerZh.includes(value)) && ["Yuxiang Xu", "Gym Manager", "300+", "12,000+", "NSCA-CSCS"].every(value => managerEn.includes(value)) && managerConfig.name === "许宇祥" && managerConfig.englishName === "Yuxiang Xu"],
  ["Gym Manager Xu follows the shared coach card structure", [managerZh, managerEn].every(block => block.includes("coach-cert-summary") && block.includes("coach-positioning") && block.includes("coach-role-badge")) && managerZh.includes("查看完整介绍") && managerEn.includes("View Full Profile") && managerConfig.experience === "从业10年" && managerConfig.stats.clients === "300+" && managerConfig.stats.sessions === "12,000+"],
  ["Suixin Chinese profile owns the verified experience, performance and certifications", suixinZh.includes("coach-suixin.webp?v=20260818-1") && ["隋心", "从业8年", "200+", "10000+", "NSCA-CPT", "CBBA", "常规力量训练", "功能性训练", "增肌减脂", "腰腹塑形", "臀部塑形"].every(value => suixinZh.includes(value))],
  ["Suixin Chinese profile excludes Majie's education and certifications", ["休闲体育本科", "国家健身教练职业认证", "IBFA"].every(value => !suixinZh.includes(value))],
  ["Majie Chinese profile owns the verified education and certifications", majieZh.includes("coach-majie.webp?v=20260818-1") && ["马杰", "休闲体育本科", "国家健身教练职业认证", "IBFA", "增肌", "减脂", "功能性训练", "循序渐进"].every(value => majieZh.includes(value))],
  ["Majie Chinese profile excludes Suixin's experience, performance and certifications", ["8年", "200+", "10000+", "10,000+", "NSCA-CPT", "CBBA", "腰腹塑形", "臀部塑形"].every(value => !majieZh.includes(value))],
  ["Suixin English profile owns only Suixin's verified facts", ["Suixin", "8 Years of Coaching Experience", "200+", "10,000+", "NSCA-CPT", "CBBA Certified Coach", "Glute Development", "Core &amp; Waistline Training"].every(value => suixinEn.includes(value)) && ["Bachelor's Degree in Leisure Sports", "Bachelor’s Degree in Leisure Sports", "National Fitness Coach Certification", "IBFA Certification"].every(value => !suixinEn.includes(value))],
  ["Majie English profile owns only Majie's verified facts", ["Majie", "Bachelor's Degree in Leisure Sports", "National Fitness Coach Certification", "IBFA Certification", "Muscle Gain", "Fat Loss", "Functional Training"].every(value => majieEn.includes(value)) && ["8 Years", "200+", "10,000+", "NSCA-CPT", "CBBA Certified Coach", "Glute Development", "Glute Shaping", "Core &amp; Waistline Training"].every(value => !majieEn.includes(value))],
  ["Config contains three active coach records", coaches.length === 3 && ["manager", "suixin", "majie"].every(id => coaches.some(coach => coach.id === id && coach.enabled && coach.active))],
  ["Config keeps optional coach fields genuinely optional", coaches.filter(coach => coach.id !== "manager").every(coach => coach.name && coach.role && coach.photo && Array.isArray(coach.certifications) && Array.isArray(coach.specialties) && Array.isArray(coach.bio) && coach.active === true) && suixinConfig.experience && suixinConfig.stats && !suixinConfig.education && majieConfig.education && !majieConfig.experience && !majieConfig.stats],
  ["Config prevents the verified data from crossing between Suixin and Majie", suixinConfig.photo.includes("coach-suixin.webp") && majieConfig.photo.includes("coach-majie.webp") && suixinConfig.certifications.join(" ").includes("NSCA-CPT") && suixinConfig.certifications.join(" ").includes("CBBA") && !suixinConfig.certifications.join(" ").includes("IBFA") && majieConfig.certifications.join(" ").includes("IBFA") && !majieConfig.certifications.join(" ").includes("NSCA-CPT") && !majieConfig.certifications.join(" ").includes("CBBA")],
  ["Coach portraits are optimized WebP assets", ["coach-suixin.webp", "coach-majie.webp"].every(name => fs.existsSync(path.join(root, "assets", name)) && isWebp(name) && asset(name).length < 150000)],
  ["Coach portraits reserve a stable 4:5 layout and load asynchronously", [managerZh, suixinZh, majieZh, managerEn, suixinEn, majieEn].every(block => block.includes('loading="lazy"') && block.includes('decoding="async"') && block.includes('width="1000" height="1250"')) && css.includes("aspect-ratio:4/5")],
  ["Every coach has an accessible expand/collapse control", [zh, en].every(source => ["manager", "suixin", "majie"].every(id => source.includes(`aria-controls="coach-detail-${id}"`) && source.includes(`id="coach-detail-${id}" hidden`))) && app.includes(".js-coach-toggle")],
  ["Responsive team layout is one column on mobile and three columns on desktop", css.includes("@media(min-width:1100px){.coach-team-section .wrap{width:min(100% - 40px,1200px)}.coach-list{grid-template-columns:repeat(3,minmax(0,1fr))}}") && css.includes("min-width:0")],
  ["Coach copy avoids unverified medical or outcome claims", !/治愈|治疗|康复治疗|guaranteed|cure|medical rehabilitation/i.test(suixinZh + majieZh + suixinEn + majieEn)],
  ["Contact and booking ownership remain with Gym Manager Xu", zh.includes("许店长微信：13101839816") && en.includes("Gym Manager Xu · WeChat") && !/隋心微信|马杰微信|Suixin · WeChat|Majie · WeChat/.test(zh + en)]
];

checks.forEach(([name, passed]) => console.log(`${passed ? "PASS" : "FAIL"}: ${name}`));
if (checks.some(([, passed]) => !passed)) process.exit(1);
