import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SERVICES, STATUSES, authorizeOps, classifyUserAgent, csvEscape, generateClaimCode,
  normalizeSource, validateCreatePayload, validateOpsPatch
} from "../functions/_shared/leads.mjs";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const app = read("app.js");
const zh = read("index.html");
const en = read("en/index.html");
const migration = read("migrations/0001_create_leads.sql");
const createApi = read("functions/api/leads.js");
const eventApi = read("functions/api/leads/[claimCode]/event.js");
const listApi = read("functions/api/ops/leads.js");
const patchApi = read("functions/api/ops/leads/[claimCode].js");
const summaryApi = read("functions/api/ops/summary.js");
const opsHtml = read("ops/index.html");
const opsCss = read("ops/ops.css");
const opsJs = read("ops/ops.js");

const checks = [];
const check = (name, passed) => checks.push([name, Boolean(passed)]);
const codeA = generateClaimCode(new Date("2026-08-04T12:00:00Z"), new Uint8Array([0, 1, 2, 3]));
const codeB = generateClaimCode(new Date("2026-08-04T12:00:00Z"), new Uint8Array([4, 5, 6, 7]));
check("1. Claim codes are readable, date-based and unique", /^TZ-260804-[2-9A-HJKMNP-Z]{4}$/.test(codeA) && codeA !== codeB && !/[01ILO]/.test(codeA.split("-")[2]));
check("2. All required services and statuses are whitelisted", ["open_gym","reformer_pilates","boxing","group_classes"].every((item) => SERVICES.includes(item)) && ["new","wechat_added","booked","visited","converted","invalid","closed"].every((item) => STATUSES.includes(item)));
check("3. Valid anonymous lead payload passes", validateCreatePayload({ service:"reformer_pilates", language:"zh-CN", source:"flyer", store:"taizhou", campaign:"taizhou-opening-2026", pagePath:"/", requestId:"meg_test_ABC234" }).ok);
check("4. Invalid service is rejected", !validateCreatePayload({ service:"medical", language:"zh-CN" }).ok);
check("5. Client cannot submit status, note or claimCode", ["status","note","claimCode"].every((key) => !validateCreatePayload({ service:"boxing", language:"en", [key]:"x" }).ok));
check("6. Source is length and safe-character limited", normalizeSource("coach-xu") === "coach-xu" && normalizeSource("bad source!") === "direct" && normalizeSource("x".repeat(65)) === "direct");
check("7. Coarse User-Agent classification works", classifyUserAgent("Mozilla/5.0 iPhone MicroMessenger").deviceType === "mobile" && classifyUserAgent("Mozilla/5.0 iPhone MicroMessenger").browserFamily === "wechat");
check("8. Public create response never exposes database id", createApi.includes("claimCode, createdAt:now, service:data.service") && !/jsonResponse\([^\n]*\bid\b/.test(createApi));
check("9. message_copied update is idempotent and exclusive", eventApi.includes("input.eventStage !== \"message_copied\"") && eventApi.includes("CASE WHEN event_stage = 'claim_opened'") && !/wechat_added|booked|visited|converted/.test(eventApi));
check("10. Same-session service reuse and different service keys exist", app.includes('sessionGet("megClaimCode:" + service)') && app.includes('sessionSet("megClaimCode:" + service') && app.includes('sessionGet("megLeadRequest:" + service)'));
check("11. API failure keeps no-code message and enables copy", app.includes("预约编号暂时生成失败，你仍可直接添加微信预约。") && app.includes("setClaimLoading(false") && app.includes('buildBookingMessage(baseMessage, "", normalizedLanguage)'));
check("12. Chinese and English booking messages include references", app.includes("预约编号：") && app.includes("Booking reference: ") && app.includes("请问最近可以预约什么时间？") && app.includes("Could you let me know the available times?"));
check("13. Ops list supports pagination and status filtering", listApi.includes("LIMIT ? OFFSET ?") && listApi.includes('STATUSES.includes(status)') && listApi.includes("pageSize"));
check("14. Ops patch only accepts status and note", validateOpsPatch({ status:"booked", note:"已确认" }).ok && !validateOpsPatch({ service:"boxing" }).ok && patchApi.includes("lead_status_history"));
check("15. CSV has no personal or IP columns", listApi.includes('format === "csv"') && !/name|phone|mobile|wechat|ip_address/i.test(listApi.match(/const PUBLIC_COLUMNS[^\n]+/)[0]) && csvEscape('a,"b"') === '"a,""b"""');
check("16. Unauthorized ops API is rejected and every ops API validates its source", !(await authorizeOps(new Request("https://megops.jinxiliu.com/api/ops/leads"), { LOCAL_DEV:"false", OPS_ORIGINS:"https://megops.jinxiliu.com" })).ok && [listApi, patchApi, summaryApi].every((source) => source.includes("authorizeOps") && source.includes("validateOrigin")));
check("17. Ops mobile card and Bottom Sheet layouts exist", opsCss.includes(".lead-cards{display:grid") && opsCss.includes("max-height:88dvh") && opsCss.includes("font-size:16px") && opsHtml.includes('id="detailPanel"'));
check("18. Existing H5 modal and long-press QR structure remain", [zh, en].every((html) => html.includes('id="claimModal"') && /<img[^>]+id="modalQr"[^>]+manager-wechat\.png/.test(html)) && !/contextmenu|touchstart[^\n]+preventDefault/.test(app));
check("19. Ops filters, status controls, notes and export exist", ["dateFrom","dateTo","service","source","status","language","exportButton","leadNote","data-status"].every((value) => (opsHtml + opsJs).includes(value)) && opsJs.includes("if (currentIndex < 0) return true"));
check("20. Migration contains required indexes and no personal fields", ["idx_leads_claim_code","idx_leads_created_at","idx_leads_status","idx_leads_service","idx_leads_source","idx_leads_store"].every((value) => migration.includes(value)) && !/phone|mobile|wechat|ip_address|gender|health/i.test(migration));

checks.forEach(([name, passed]) => console.log(`${passed ? "PASS" : "FAIL"}: ${name}`));
if (checks.some(([, passed]) => !passed)) process.exit(1);
