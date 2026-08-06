import { authorizeOps, isClaimCode, jsonResponse, readJsonBody, validateOrigin } from "../../../../_shared/leads.mjs";

export async function onRequestPost({ request, env, params }) {
  const auth = await authorizeOps(request, env);
  if (!auth.ok) return jsonResponse({ ok:false, error:"unauthorized" }, 401);
  if (!validateOrigin(request, env, true)) return jsonResponse({ ok:false, error:"origin_not_allowed" }, 403);
  if (!env.DB) return jsonResponse({ ok:false, error:"service_unavailable" }, 503);
  const claimCode = String(params.claimCode || "").toUpperCase();
  if (!isClaimCode(claimCode)) return jsonResponse({ ok:false, error:"invalid_claim_code" }, 400);
  let input;
  try { input = await readJsonBody(request); }
  catch { return jsonResponse({ ok:false, error:"invalid_json" }, 400); }
  const reason = String(input.reason || "").trim();
  if (!reason || reason.length > 500 || Object.keys(input).some((key) => key !== "reason")) {
    return jsonResponse({ ok:false, error:"invalid_delete_reason" }, 400);
  }
  try {
    const existing = await env.DB.prepare(`
      SELECT status FROM leads WHERE claim_code = ? AND deleted_at IS NULL
    `).bind(claimCode).first();
    if (!existing) return jsonResponse({ ok:false, error:"not_found" }, 404);
    const now = new Date().toISOString();
    const actor = String(auth.email || (auth.local ? "local-development" : "access-user")).slice(0, 320);
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE leads SET status_before_delete = ?, deleted_at = ?, deleted_by = ?, delete_reason = ?, updated_at = ?
        WHERE claim_code = ? AND deleted_at IS NULL
      `).bind(existing.status, now, actor, reason, now, claimCode),
      env.DB.prepare(`
        INSERT INTO lead_operation_history (claim_code, action, actor, reason, created_at)
        VALUES (?, 'soft_delete', ?, ?, ?)
      `).bind(claimCode, actor, reason, now)
    ]);
    return jsonResponse({ ok:true, claimCode, deletedAt:now });
  } catch { return jsonResponse({ ok:false, error:"delete_failed" }, 500); }
}
