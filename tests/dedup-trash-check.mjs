import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { onRequestPost as createLead } from "../functions/api/leads.js";
import { onRequestGet as listLeads } from "../functions/api/ops/leads.js";
import { onRequestGet as summary } from "../functions/api/ops/summary.js";
import { onRequestGet as duplicateGroup } from "../functions/api/ops/leads/[claimCode]/duplicates.js";
import { onRequestPost as softDelete } from "../functions/api/ops/leads/[claimCode]/trash.js";
import { onRequestGet as listTrash } from "../functions/api/ops/trash.js";
import { onRequestPost as restoreTrash, onRequestDelete as purgeTrash } from "../functions/api/ops/trash/[claimCode].js";

class D1Statement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.values = []; }
  bind(...values) { this.values = values; return this; }
  async run() { const result = this.db.prepare(this.sql).run(...this.values); return { success:true, meta:{ changes:Number(result.changes || 0) } }; }
  async first(column) { const row = this.db.prepare(this.sql).get(...this.values) || null; return column && row ? row[column] : row; }
  async all() { return { success:true, results:this.db.prepare(this.sql).all(...this.values) }; }
}
class SqliteD1 {
  constructor(db) { this.db = db; }
  prepare(sql) { return new D1Statement(this.db, sql); }
  withSession() { return this; }
  async batch(statements) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const results = [];
      for (const statement of statements) {
        if (/^\s*SELECT/i.test(statement.sql)) results.push(await statement.all());
        else results.push(await statement.run());
      }
      this.db.exec("COMMIT");
      return results;
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
}

const sqlite = new DatabaseSync(":memory:");
sqlite.exec("PRAGMA foreign_keys = ON");
sqlite.exec(fs.readFileSync(new URL("../migrations/0001_create_leads.sql", import.meta.url), "utf8"));
sqlite.exec(fs.readFileSync(new URL("../migrations/0002_lead_dedup_and_trash.sql", import.meta.url), "utf8"));
const env = { DB:new SqliteD1(sqlite), LOCAL_DEV:"true", PUBLIC_ORIGINS:"http://localhost", OPS_ORIGINS:"http://localhost" };
const checks = [];
const check = (name, passed) => checks.push([name, Boolean(passed)]);
const client = (suffix) => `123e4567-e89b-42d3-a456-426614174${suffix}`;
const localRequest = (path, init = {}) => new Request(`http://localhost${path}`, { ...init, headers:{ Origin:"http://localhost", "Content-Type":"application/json", ...(init.headers || {}) } });
let requestCounter = 0;
async function create(service, clientId) {
  requestCounter += 1;
  const response = await createLead({ request:localRequest("/api/leads", { method:"POST", body:JSON.stringify({ service, language:"zh-CN", source:"test", store:"taizhou", campaign:"taizhou-opening-2026", pagePath:"/", requestId:`test_${requestCounter}`, clientId }) }), env });
  return { response, body:await response.json() };
}

const first = await create("open_gym", client("001"));
const repeated = await create("open_gym", client("001"));
check("1. Same client, campaign and service within 30 minutes creates one lead", sqlite.prepare("SELECT COUNT(*) count FROM leads WHERE client_id = ?").get(client("001")).count === 1);
check("2. Deduplicated request returns the original claim code", repeated.response.status === 200 && repeated.body.deduplicated === true && repeated.body.claimCode === first.body.claimCode);

const oldTime = new Date(Date.now() - 31 * 60 * 1000).toISOString();
sqlite.prepare(`INSERT INTO leads (claim_code,created_at,updated_at,store,campaign,service,language,source,event_stage,status,note,client_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run("TZ-260806-2345", oldTime, oldTime, "taizhou", "taizhou-opening-2026", "open_gym", "zh-CN", "test", "claim_opened", "new", "", client("002"));
const afterWindow = await create("open_gym", client("002"));
check("3. A lead older than 30 minutes does not prevent a new claim", afterWindow.response.status === 201 && sqlite.prepare("SELECT COUNT(*) count FROM leads WHERE client_id = ?").get(client("002")).count === 2);

const differentA = await create("open_gym", client("003"));
const differentB = await create("open_gym", client("004"));
check("4. Different client IDs never deduplicate each other", differentA.body.claimCode !== differentB.body.claimCode);

const multiA = await create("open_gym", client("005"));
const multiB = await create("boxing", client("005"));
const groupedRows = sqlite.prepare("SELECT suspicious_group_id FROM leads WHERE client_id = ? ORDER BY created_at").all(client("005"));
const groupResponse = await duplicateGroup({ request:localRequest(`/api/ops/leads/${multiA.body.claimCode}/duplicates`), env, params:{ claimCode:multiA.body.claimCode } });
const groupBody = await groupResponse.json();
check("5. Different services within 15 minutes receive one persistent suspicious group", groupedRows.length === 2 && groupedRows[0].suspicious_group_id && groupedRows[0].suspicious_group_id === groupedRows[1].suspicious_group_id && groupBody.count === 2);
check("6. Suspicious group API exposes only safe lead fields", !JSON.stringify(groupBody).includes(client("005")) && !JSON.stringify(groupBody).includes(groupedRows[0].suspicious_group_id));

sqlite.prepare("UPDATE leads SET status = 'duplicate' WHERE claim_code = ?").run(differentA.body.claimCode);
sqlite.prepare("UPDATE leads SET status = 'invalid' WHERE claim_code = ?").run(differentB.body.claimCode);
const deletable = await create("personal_training", client("006"));
const deleteResponse = await softDelete({ request:localRequest(`/api/ops/leads/${deletable.body.claimCode}/trash`, { method:"POST", body:JSON.stringify({ reason:"测试回收站" }) }), env, params:{ claimCode:deletable.body.claimCode } });
check("7. Soft delete stores deletion metadata without deleting the row", deleteResponse.status === 200 && sqlite.prepare("SELECT deleted_at, status_before_delete FROM leads WHERE claim_code = ?").get(deletable.body.claimCode).deleted_at);

const listResponse = await listLeads({ request:localRequest("/api/ops/leads?page=1&pageSize=100"), env });
const listBody = await listResponse.json();
check("8. Default list excludes soft-deleted leads", !listBody.items.some((item) => item.claim_code === deletable.body.claimCode));
const trashResponse = await listTrash({ request:localRequest("/api/ops/trash?page=1&pageSize=20"), env });
const trashBody = await trashResponse.json();
check("9. Trash list finds the soft-deleted lead", trashBody.items.some((item) => item.claim_code === deletable.body.claimCode && item.delete_reason === "测试回收站"));

const restoreResponse = await restoreTrash({ request:localRequest(`/api/ops/trash/${deletable.body.claimCode}`, { method:"POST", body:JSON.stringify({ action:"restore" }) }), env, params:{ claimCode:deletable.body.claimCode } });
const restored = sqlite.prepare("SELECT deleted_at,status FROM leads WHERE claim_code = ?").get(deletable.body.claimCode);
check("10. Restore clears trash fields and returns the original status", restoreResponse.status === 200 && restored.deleted_at === null && restored.status === "new" && sqlite.prepare("SELECT COUNT(*) count FROM lead_operation_history WHERE claim_code = ? AND action = 'restore'").get(deletable.body.claimCode).count === 1);

await softDelete({ request:localRequest(`/api/ops/leads/${deletable.body.claimCode}/trash`, { method:"POST", body:JSON.stringify({ reason:"准备永久删除" }) }), env, params:{ claimCode:deletable.body.claimCode } });
sqlite.prepare("INSERT INTO lead_status_history (claim_code,from_status,to_status,changed_at) VALUES (?,?,?,?)").run(deletable.body.claimCode, "new", "invalid", new Date().toISOString());
const badPurge = await purgeTrash({ request:localRequest(`/api/ops/trash/${deletable.body.claimCode}`, { method:"DELETE", body:JSON.stringify({ action:"purge", confirmation:"TZ-260806-XXXX" }) }), env, params:{ claimCode:deletable.body.claimCode } });
const caseMismatchPurge = await purgeTrash({ request:localRequest(`/api/ops/trash/${deletable.body.claimCode}`, { method:"DELETE", body:JSON.stringify({ action:"purge", confirmation:deletable.body.claimCode.toLowerCase() }) }), env, params:{ claimCode:deletable.body.claimCode } });
check("11. Permanent deletion requires the full, exact claim code", badPurge.status === 400 && caseMismatchPurge.status === 400 && sqlite.prepare("SELECT COUNT(*) count FROM leads WHERE claim_code = ?").get(deletable.body.claimCode).count === 1);
const purgeResponse = await purgeTrash({ request:localRequest(`/api/ops/trash/${deletable.body.claimCode}`, { method:"DELETE", body:JSON.stringify({ action:"purge", confirmation:deletable.body.claimCode }) }), env, params:{ claimCode:deletable.body.claimCode } });
check("12. Permanent deletion removes lead and related history transactionally", purgeResponse.status === 200 && sqlite.prepare("SELECT COUNT(*) count FROM leads WHERE claim_code = ?").get(deletable.body.claimCode).count === 0 && sqlite.prepare("SELECT COUNT(*) count FROM lead_status_history WHERE claim_code = ?").get(deletable.body.claimCode).count === 0 && sqlite.prepare("SELECT COUNT(*) count FROM lead_operation_history WHERE claim_code = ?").get(deletable.body.claimCode).count === 0);

const legacy = await create("reformer_pilates", "");
check("13. Historical-style records without client_id remain valid", legacy.response.status === 201 && sqlite.prepare("SELECT client_id FROM leads WHERE claim_code = ?").get(legacy.body.claimCode).client_id === null);

const summaryResponse = await summary({ request:localRequest("/api/ops/summary"), env });
const summaryBody = await summaryResponse.json();
const activeToday = sqlite.prepare("SELECT COUNT(*) count FROM leads WHERE deleted_at IS NULL AND status NOT IN ('duplicate','invalid') AND date(created_at,'+8 hours') = date('now','+8 hours')").get().count;
check("14. Summary excludes duplicate, invalid and soft-deleted records", summaryResponse.status === 200 && summaryBody.bookings.today === activeToday);

const csvResponse = await listLeads({ request:localRequest("/api/ops/leads?format=csv"), env });
const csv = await csvResponse.text();
const csvHeader = csv.split(/\r?\n/)[0];
check("15. CSV excludes privacy fields and duplicate/invalid leads", !/client_id|suspicious_group_id/i.test(csvHeader) && !csv.includes(differentA.body.claimCode) && !csv.includes(differentB.body.claimCode));

checks.forEach(([name, passed]) => console.log(`${passed ? "PASS" : "FAIL"}: ${name}`));
if (checks.some(([, passed]) => !passed)) process.exit(1);
