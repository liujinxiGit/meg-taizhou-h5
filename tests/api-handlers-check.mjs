import { onRequestPost as createLead } from "../functions/api/leads.js";
import { onRequestPatch as recordEvent } from "../functions/api/leads/[claimCode]/event.js";

class FakeStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql.replace(/\s+/g, " ").trim();
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async run() {
    if (this.sql.startsWith("INSERT INTO leads")) {
      const [claimCode, createdAt, updatedAt, store, campaign, service, language, source, pagePath, deviceType, browserFamily] = this.values;
      if (this.database.rows.has(claimCode)) throw new Error("UNIQUE constraint failed");
      this.database.rows.set(claimCode, {
        claim_code:claimCode,
        created_at:createdAt,
        updated_at:updatedAt,
        store,
        campaign,
        service,
        language,
        source,
        page_path:pagePath,
        device_type:deviceType,
        browser_family:browserFamily,
        event_stage:"claim_opened",
        status:"new",
        note:""
      });
      return { meta:{ changes:1 } };
    }

    if (this.sql.startsWith("UPDATE leads SET event_stage")) {
      const [updatedAt, claimCode] = this.values;
      const row = this.database.rows.get(claimCode);
      if (!row) return { meta:{ changes:0 } };
      if (row.event_stage === "claim_opened") {
        row.event_stage = "message_copied";
        row.updated_at = updatedAt;
      }
      return { meta:{ changes:1 } };
    }

    throw new Error(`Unhandled SQL: ${this.sql}`);
  }
}

class FakeD1 {
  constructor() { this.rows = new Map(); }
  prepare(sql) { return new FakeStatement(this, sql); }
}

const checks = [];
const check = (name, passed) => checks.push([name, Boolean(passed)]);
const env = {
  DB:new FakeD1(),
  LOCAL_DEV:"true",
  PUBLIC_ORIGINS:"https://taizhou.jinxiliu.com"
};

function request(path, body) {
  return new Request(`http://localhost${path}`, {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Origin":"http://localhost",
      "User-Agent":"Mozilla/5.0 (iPhone) MicroMessenger"
    },
    body:JSON.stringify(body)
  });
}

const createResponse = await createLead({
  request:request("/api/leads", {
    service:"boxing",
    language:"zh-CN",
    source:"coach-xu",
    store:"taizhou",
    campaign:"taizhou-opening-2026",
    pagePath:"/",
    requestId:"meg_api_test_234"
  }),
  env
});
const created = await createResponse.json();
check("1. POST /api/leads creates an anonymous lead", createResponse.status === 201 && created.ok && /^TZ-\d{6}-[2-9A-HJKMNP-Z]{4}$/.test(created.claimCode));
check("2. Public response contains no internal id or personal fields", !("id" in created) && !Object.keys(created).some((key) => /name|phone|wechat|ip/i.test(key)));
const stored = env.DB.rows.get(created.claimCode);
check("3. D1 write stores service and coarse client classification", stored && stored.service === "boxing" && stored.device_type === "mobile" && stored.browser_family === "wechat");

const eventRequest = new Request(`http://localhost/api/leads/${created.claimCode}/event`, {
  method:"PATCH",
  headers:{ "Content-Type":"application/json", "Origin":"http://localhost" },
  body:JSON.stringify({ eventStage:"message_copied" })
});
const eventResponse = await recordEvent({ request:eventRequest, env, params:{ claimCode:created.claimCode } });
const event = await eventResponse.json();
check("4. PATCH lead event records message_copied", eventResponse.status === 200 && event.ok && stored.event_stage === "message_copied");

const repeatResponse = await recordEvent({
  request:new Request(eventRequest.url, {
    method:"PATCH",
    headers:{ "Content-Type":"application/json", "Origin":"http://localhost" },
    body:JSON.stringify({ eventStage:"message_copied" })
  }),
  env,
  params:{ claimCode:created.claimCode }
});
check("5. message_copied event is idempotent", repeatResponse.status === 200 && stored.event_stage === "message_copied");

const forbiddenResponse = await createLead({
  request:request("/api/leads", { service:"boxing", language:"zh-CN", status:"converted" }),
  env
});
check("6. Visitor cannot inject status", forbiddenResponse.status === 400 && (await forbiddenResponse.json()).error === "unsupported_field");

const originResponse = await createLead({
  request:new Request("https://taizhou.jinxiliu.com/api/leads", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Origin":"https://evil.example" },
    body:JSON.stringify({ service:"boxing", language:"zh-CN" })
  }),
  env:{ ...env, LOCAL_DEV:"false" }
});
check("7. Cross-origin lead creation is rejected", originResponse.status === 403);

checks.forEach(([name, passed]) => console.log(`${passed ? "PASS" : "FAIL"}: ${name}`));
if (checks.some(([, passed]) => !passed)) process.exit(1);
