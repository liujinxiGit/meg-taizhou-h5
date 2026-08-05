import { onRequestGet as getSummary } from "../functions/api/ops/summary.js";
import { onRequestGet as listLeads } from "../functions/api/ops/leads.js";
import { onRequestGet as getLead, onRequestPatch as patchLead } from "../functions/api/ops/leads/[claimCode].js";

const checks = [];
const check = (name, passed) => checks.push([name, Boolean(passed)]);
const baseEnv = { LOCAL_DEV:"true", OPS_ORIGINS:"http://localhost" };
const lead = {
  claim_code:"TZ-260804-A7K3", created_at:"2026-08-04T02:00:00.000Z", updated_at:"2026-08-04T02:00:00.000Z",
  store:"taizhou", campaign:"taizhou-opening-2026", service:"boxing", language:"zh-CN", source:"direct",
  page_path:"/", device_type:"mobile", browser_family:"wechat", event_stage:"claim_opened", status:"new",
  note:"", status_changed_at:"2026-08-04T02:00:00.000Z"
};
const localRequest = (path, init = {}) => new Request(`http://localhost${path}`, {
  ...init, headers:{ Origin:"http://localhost", ...(init.headers || {}) }
});

class SummaryDb {
  prepare(sql) { return { sql, bind(...values) { this.values = values; return this; } }; }
  async batch(statements) {
    this.statements = statements;
    return [
      { results:[{ count:3 }] }, { results:[{ count:9 }] },
      { results:[{ status:"booked", count:2 }, { status:"visited", count:1 }] },
      { results:[{ date:"2026-08-04", count:3 }] }, { results:[{ service:"boxing", count:3 }] },
      { results:[{ source:"direct", count:3 }] }, { results:[{ language:"zh-CN", count:3 }] }
    ];
  }
}

const summaryDb = new SummaryDb();
const summaryResponse = await getSummary({ request:localRequest("/api/ops/summary"), env:{ ...baseEnv, DB:summaryDb } });
const summary = await summaryResponse.json();
check("1. Summary API returns today and current-week bookings", summaryResponse.status === 200 && summary.bookings.today === 3 && summary.bookings.week === 9);
check("2. Summary API keeps status, trend and breakdown data", summary.today.booked === 2 && summary.today.visited === 1 && summary.trend7d.length === 1 && summary.services.length === 1);
check("3. Current-week query starts on Monday and ends today", summaryDb.statements[1].values.length === 2 && new Date(summaryDb.statements[1].values[0]).getUTCDay() === 0);

class ListDb {
  prepare(sql) {
    return {
      sql, values:[], bind(...values) { this.values = values; return this; },
      async all() { return { results:[lead] }; }
    };
  }
  async batch() { return [{ results:[lead] }, { results:[{ total:1 }] }]; }
}

const listEnv = { ...baseEnv, DB:new ListDb() };
const listResponse = await listLeads({ request:localRequest("/api/ops/leads?page=1&pageSize=20"), env:listEnv });
const list = await listResponse.json();
check("4. Leads Table API returns paginated rows", listResponse.status === 200 && list.total === 1 && list.items[0].claim_code === lead.claim_code);
const csvResponse = await listLeads({ request:localRequest("/api/ops/leads?format=csv"), env:listEnv });
const csv = await csvResponse.text();
check("5. CSV export returns a download without personal fields", csvResponse.status === 200 && /text\/csv/.test(csvResponse.headers.get("content-type")) && csv.includes(lead.claim_code) && !/phone|wechat|mobile/i.test(csv.split("\n")[0]));

class DetailDb {
  constructor() { this.lead = { ...lead }; this.history = []; }
  prepare(sql) {
    const database = this;
    return {
      sql:sql.replace(/\s+/g, " ").trim(), values:[], bind(...values) { this.values = values; return this; },
      async first() {
        if (this.sql.startsWith("SELECT status, note")) return { status:database.lead.status, note:database.lead.note, status_changed_at:database.lead.status_changed_at };
        return { ...database.lead };
      },
      async all() { return { results:database.history.slice() }; }
    };
  }
  async batch(statements) {
    const update = statements[0].values;
    this.lead.status = update[0]; this.lead.note = update[1]; this.lead.updated_at = update[2]; this.lead.status_changed_at = update[3];
    if (statements[1]) this.history.push({ from_status:statements[1].values[1], to_status:statements[1].values[2], changed_at:statements[1].values[3] });
    return statements.map(() => ({ success:true }));
  }
}

const detailDb = new DetailDb();
const detailEnv = { ...baseEnv, DB:detailDb };
const detailResponse = await getLead({ request:localRequest(`/api/ops/leads/${lead.claim_code}`), env:detailEnv, params:{ claimCode:lead.claim_code } });
check("6. Lead detail API returns the selected lead", detailResponse.status === 200 && (await detailResponse.json()).lead.claim_code === lead.claim_code);
const patchResponse = await patchLead({
  request:localRequest(`/api/ops/leads/${lead.claim_code}`, { method:"PATCH", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ status:"booked", note:"已确认到店时间" }) }),
  env:detailEnv, params:{ claimCode:lead.claim_code }
});
const patched = await patchResponse.json();
check("7. Status and note updates persist and return refreshed detail", patchResponse.status === 200 && patched.lead.status === "booked" && patched.lead.note === "已确认到店时间");
check("8. Status changes create timeline history", patched.lead.status_history.length === 1 && patched.lead.status_history[0].to_status === "booked");

checks.forEach(([name, passed]) => console.log(`${passed ? "PASS" : "FAIL"}: ${name}`));
if (checks.some(([, passed]) => !passed)) process.exit(1);
