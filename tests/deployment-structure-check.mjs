import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const check = (name, passed) => checks.push([name, Boolean(passed)]);

const publicConfig = read("wrangler.toml");
const opsConfig = read("ops/wrangler.toml");
const explicitOpsConfig = read("wrangler.ops.toml");
const opsHtml = read("ops/index.html");
const opsHeaders = read("ops/_headers");
const summaryAdapter = read("ops/functions/api/ops/summary.js");
const listAdapter = read("ops/functions/api/ops/leads.js");
const detailAdapter = read("ops/functions/api/ops/leads/[claimCode].js");

check("1. Frontend Pages config remains rooted at repository output", /name\s*=\s*"meg-taizhou-h5"/.test(publicConfig) && /pages_build_output_dir\s*=\s*"\."/.test(publicConfig));
check("2. Operations has an independent config inside ops", /name\s*=\s*"meg-operations"/.test(opsConfig) && /pages_build_output_dir\s*=\s*"\."/.test(opsConfig));
check("3. Operations config keeps the production D1 binding", /binding\s*=\s*"DB"/.test(opsConfig) && opsConfig.includes("13bad6c0-ee9f-41bb-9b22-c488ce34ccc1"));
check("4. Operations static root contains all required files", ["ops/index.html","ops/ops.js","ops/ops.css","ops/_headers"].every(exists));
check("5. Operations assets remain root-relative to the ops project", /href="ops\.css\?v=/.test(opsHtml) && /src="ops\.js\?v=/.test(opsHtml) && !/(?:href|src)="\/ops\//.test(opsHtml));
check("6. Operations headers target root static assets", opsHeaders.includes("/index.html") && opsHeaders.includes("/ops.css") && opsHeaders.includes("/ops.js"));
check("7. Operations Pages Functions expose all existing API routes", summaryAdapter.includes("functions/api/ops/summary.js") && listAdapter.includes("functions/api/ops/leads.js") && detailAdapter.includes("functions/api/ops/leads/[claimCode].js"));
check("8. API adapters reuse handlers instead of duplicating backend logic", [summaryAdapter,listAdapter,detailAdapter].every((source) => source.trim().startsWith("export {") && !source.includes("prepare(")));
check("9. Existing explicit CLI config remains scoped to the ops output", /name\s*=\s*"meg-operations"/.test(explicitOpsConfig) && /pages_build_output_dir\s*=\s*"\.\/ops"/.test(explicitOpsConfig));

checks.forEach(([name, passed]) => console.log(`${passed ? "PASS" : "FAIL"}: ${name}`));
if (checks.some(([, passed]) => !passed)) process.exit(1);
