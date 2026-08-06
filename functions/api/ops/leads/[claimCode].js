import {
  authorizeOps, isClaimCode, jsonResponse, readJsonBody, validateOpsPatch, validateOrigin
} from "../../../_shared/leads.mjs";

const PUBLIC_COLUMNS = "claim_code, created_at, updated_at, store, campaign, service, language, source, page_path, device_type, browser_family, event_stage, status, note, status_changed_at";

async function loadLead(env, claimCode) {
  const lead = await env.DB.prepare(`
    SELECT ${PUBLIC_COLUMNS}, suspicious_group_id FROM leads
    WHERE claim_code = ? AND deleted_at IS NULL
  `).bind(claimCode).first();
  if (!lead) return null;
  const history = await env.DB.prepare("SELECT from_status, to_status, changed_at FROM lead_status_history WHERE claim_code = ? ORDER BY changed_at ASC, id ASC").bind(claimCode).all();
  let suspiciousGroup = [];
  if (lead.suspicious_group_id) {
    const grouped = await env.DB.prepare(`
      SELECT claim_code, service, created_at, status FROM leads
      WHERE suspicious_group_id = ? AND deleted_at IS NULL
      ORDER BY created_at ASC
    `).bind(lead.suspicious_group_id).all();
    suspiciousGroup = grouped.results || [];
  }
  delete lead.suspicious_group_id;
  return { ...lead, suspicious_count:suspiciousGroup.length, suspicious_group:suspiciousGroup, status_history:history.results || [] };
}

async function authorize(request, env) {
  const auth = await authorizeOps(request, env);
  return auth.ok ? null : jsonResponse({ ok:false, error:"unauthorized" }, 401);
}

export async function onRequestGet({ request, env, params }) {
  const denied = await authorize(request, env);
  if (denied) return denied;
  if (!validateOrigin(request, env, true)) return jsonResponse({ ok:false, error:"origin_not_allowed" }, 403);
  if (!env.DB) return jsonResponse({ ok:false, error:"service_unavailable" }, 503);
  const claimCode = String(params.claimCode || "").toUpperCase();
  if (!isClaimCode(claimCode)) return jsonResponse({ ok:false, error:"invalid_claim_code" }, 400);
  try {
    const lead = await loadLead(env, claimCode);
    return lead ? jsonResponse({ ok:true, lead }) : jsonResponse({ ok:false, error:"not_found" }, 404);
  } catch { return jsonResponse({ ok:false, error:"query_failed" }, 500); }
}

export async function onRequestPatch({ request, env, params }) {
  const denied = await authorize(request, env);
  if (denied) return denied;
  if (!validateOrigin(request, env, true)) return jsonResponse({ ok:false, error:"origin_not_allowed" }, 403);
  if (!env.DB) return jsonResponse({ ok:false, error:"service_unavailable" }, 503);
  const claimCode = String(params.claimCode || "").toUpperCase();
  if (!isClaimCode(claimCode)) return jsonResponse({ ok:false, error:"invalid_claim_code" }, 400);
  let input;
  try { input = await readJsonBody(request); }
  catch { return jsonResponse({ ok:false, error:"invalid_json" }, 400); }
  const validation = validateOpsPatch(input);
  if (!validation.ok) return jsonResponse({ ok:false, error:validation.error }, 400);
  try {
    const existing = await env.DB.prepare("SELECT status, note, status_changed_at FROM leads WHERE claim_code = ? AND deleted_at IS NULL").bind(claimCode).first();
    if (!existing) return jsonResponse({ ok:false, error:"not_found" }, 404);
    const now = new Date().toISOString();
    const status = validation.value.status === undefined ? existing.status : validation.value.status;
    const note = validation.value.note === undefined ? existing.note : validation.value.note;
    const statusChanged = status !== existing.status;
    const statements = [env.DB.prepare(`
      UPDATE leads SET status = ?, note = ?, updated_at = ?, status_changed_at = ? WHERE claim_code = ?
    `).bind(status, note, now, statusChanged ? now : existing.status_changed_at, claimCode)];
    if (statusChanged) statements.push(env.DB.prepare(`
      INSERT INTO lead_status_history (claim_code, from_status, to_status, changed_at) VALUES (?, ?, ?, ?)
    `).bind(claimCode, existing.status, status, now));
    await env.DB.batch(statements);
    const lead = await loadLead(env, claimCode);
    return jsonResponse({ ok:true, lead });
  } catch { return jsonResponse({ ok:false, error:"update_failed" }, 500); }
}
