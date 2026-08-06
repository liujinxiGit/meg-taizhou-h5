import { authorizeOps, isClaimCode, jsonResponse, validateOrigin } from "../../../../_shared/leads.mjs";

export async function onRequestGet({ request, env, params }) {
  const auth = await authorizeOps(request, env);
  if (!auth.ok) return jsonResponse({ ok:false, error:"unauthorized" }, 401);
  if (!validateOrigin(request, env, true)) return jsonResponse({ ok:false, error:"origin_not_allowed" }, 403);
  if (!env.DB) return jsonResponse({ ok:false, error:"service_unavailable" }, 503);
  const claimCode = String(params.claimCode || "").toUpperCase();
  if (!isClaimCode(claimCode)) return jsonResponse({ ok:false, error:"invalid_claim_code" }, 400);
  try {
    const lead = await env.DB.prepare(`
      SELECT suspicious_group_id FROM leads WHERE claim_code = ? AND deleted_at IS NULL
    `).bind(claimCode).first();
    if (!lead) return jsonResponse({ ok:false, error:"not_found" }, 404);
    if (!lead.suspicious_group_id) return jsonResponse({ ok:true, items:[], count:0 });
    const group = await env.DB.prepare(`
      SELECT claim_code, service, created_at, status FROM leads
      WHERE suspicious_group_id = ? AND deleted_at IS NULL
      ORDER BY created_at ASC
    `).bind(lead.suspicious_group_id).all();
    const items = group.results || [];
    return jsonResponse({ ok:true, items, count:items.length });
  } catch { return jsonResponse({ ok:false, error:"query_failed" }, 500); }
}
