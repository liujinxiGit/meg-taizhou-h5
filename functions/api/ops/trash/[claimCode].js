import { STATUSES, authorizeOps, isClaimCode, jsonResponse, readJsonBody, validateOrigin } from "../../../_shared/leads.mjs";

const TRASH_DETAIL_COLUMNS = "claim_code, created_at, updated_at, store, campaign, service, language, source, page_path, device_type, browser_family, event_stage, status, note, status_changed_at, status_before_delete, deleted_at, delete_reason";

async function authorize(request, env) {
  const auth = await authorizeOps(request, env);
  if (!auth.ok) return { denied:jsonResponse({ ok:false, error:"unauthorized" }, 401) };
  if (!validateOrigin(request, env, true)) return { denied:jsonResponse({ ok:false, error:"origin_not_allowed" }, 403) };
  return { auth };
}

export async function onRequestGet({ request, env, params }) {
  const access = await authorize(request, env);
  if (access.denied) return access.denied;
  if (!env.DB) return jsonResponse({ ok:false, error:"service_unavailable" }, 503);
  const claimCode = String(params.claimCode || "").toUpperCase();
  if (!isClaimCode(claimCode)) return jsonResponse({ ok:false, error:"invalid_claim_code" }, 400);
  try {
    const lead = await env.DB.prepare(`SELECT ${TRASH_DETAIL_COLUMNS} FROM leads WHERE claim_code = ? AND deleted_at IS NOT NULL`).bind(claimCode).first();
    return lead ? jsonResponse({ ok:true, lead }) : jsonResponse({ ok:false, error:"not_found" }, 404);
  } catch { return jsonResponse({ ok:false, error:"query_failed" }, 500); }
}

export async function onRequestPost({ request, env, params }) {
  const access = await authorize(request, env);
  if (access.denied) return access.denied;
  if (!env.DB) return jsonResponse({ ok:false, error:"service_unavailable" }, 503);
  const claimCode = String(params.claimCode || "").toUpperCase();
  if (!isClaimCode(claimCode)) return jsonResponse({ ok:false, error:"invalid_claim_code" }, 400);
  let input;
  try { input = await readJsonBody(request); }
  catch { return jsonResponse({ ok:false, error:"invalid_json" }, 400); }
  if (input.action !== "restore" || Object.keys(input).some((key) => key !== "action")) return jsonResponse({ ok:false, error:"invalid_action" }, 400);
  try {
    const existing = await env.DB.prepare(`
      SELECT status, status_before_delete, status_changed_at FROM leads WHERE claim_code = ? AND deleted_at IS NOT NULL
    `).bind(claimCode).first();
    if (!existing) return jsonResponse({ ok:false, error:"not_found" }, 404);
    const restoredStatus = STATUSES.includes(existing.status_before_delete) ? existing.status_before_delete : "new";
    const now = new Date().toISOString();
    const actor = String(access.auth.email || (access.auth.local ? "local-development" : "access-user")).slice(0, 320);
    const statements = [
      env.DB.prepare(`
        UPDATE leads SET status = ?, status_before_delete = NULL, deleted_at = NULL, deleted_by = NULL,
          delete_reason = NULL, updated_at = ?, status_changed_at = ? WHERE claim_code = ? AND deleted_at IS NOT NULL
      `).bind(restoredStatus, now, restoredStatus === existing.status ? existing.status_changed_at : now, claimCode),
      env.DB.prepare(`
        INSERT INTO lead_operation_history (claim_code, action, actor, reason, created_at)
        VALUES (?, 'restore', ?, '', ?)
      `).bind(claimCode, actor, now)
    ];
    if (restoredStatus !== existing.status) statements.push(env.DB.prepare(`
      INSERT INTO lead_status_history (claim_code, from_status, to_status, changed_at) VALUES (?, ?, ?, ?)
    `).bind(claimCode, existing.status, restoredStatus, now));
    await env.DB.batch(statements);
    return jsonResponse({ ok:true, claimCode, status:restoredStatus });
  } catch { return jsonResponse({ ok:false, error:"restore_failed" }, 500); }
}

export async function onRequestDelete({ request, env, params }) {
  const access = await authorize(request, env);
  if (access.denied) return access.denied;
  if (!env.DB) return jsonResponse({ ok:false, error:"service_unavailable" }, 503);
  const claimCode = String(params.claimCode || "").toUpperCase();
  if (!isClaimCode(claimCode)) return jsonResponse({ ok:false, error:"invalid_claim_code" }, 400);
  let input;
  try { input = await readJsonBody(request); }
  catch { return jsonResponse({ ok:false, error:"invalid_json" }, 400); }
  if (input.action !== "purge" || String(input.confirmation || "") !== claimCode || Object.keys(input).some((key) => !["action", "confirmation"].includes(key))) {
    return jsonResponse({ ok:false, error:"confirmation_mismatch" }, 400);
  }
  try {
    const existing = await env.DB.prepare("SELECT claim_code FROM leads WHERE claim_code = ? AND deleted_at IS NOT NULL").bind(claimCode).first();
    if (!existing) return jsonResponse({ ok:false, error:"not_found" }, 404);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM lead_status_history WHERE claim_code = ?").bind(claimCode),
      env.DB.prepare("DELETE FROM lead_operation_history WHERE claim_code = ?").bind(claimCode),
      env.DB.prepare("DELETE FROM leads WHERE claim_code = ? AND deleted_at IS NOT NULL").bind(claimCode)
    ]);
    return jsonResponse({ ok:true, claimCode, purged:true });
  } catch { return jsonResponse({ ok:false, error:"purge_failed" }, 500); }
}
