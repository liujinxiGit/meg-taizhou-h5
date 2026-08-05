import {
  checkRateLimit, isClaimCode, jsonResponse, readJsonBody, validateOrigin
} from "../../../_shared/leads.mjs";

export async function onRequestPatch({ request, env, params }) {
  if (!validateOrigin(request, env, false)) return jsonResponse({ ok:false, error:"origin_not_allowed" }, 403);
  if (!env.DB) return jsonResponse({ ok:false, error:"service_unavailable" }, 503);
  if (!(await checkRateLimit(request, env, "lead-event", 20))) return jsonResponse({ ok:false, error:"too_many_requests" }, 429);
  const claimCode = String(params.claimCode || "").toUpperCase();
  if (!isClaimCode(claimCode)) return jsonResponse({ ok:false, error:"invalid_claim_code" }, 400);
  let input;
  try { input = await readJsonBody(request, 1024); }
  catch { return jsonResponse({ ok:false, error:"invalid_json" }, 400); }
  if (!input || Object.keys(input).length !== 1 || input.eventStage !== "message_copied") {
    return jsonResponse({ ok:false, error:"event_not_allowed" }, 400);
  }
  try {
    const now = new Date().toISOString();
    const result = await env.DB.prepare(`
      UPDATE leads
      SET event_stage = CASE WHEN event_stage = 'claim_opened' THEN 'message_copied' ELSE event_stage END,
          updated_at = CASE WHEN event_stage = 'claim_opened' THEN ? ELSE updated_at END
      WHERE claim_code = ?
    `).bind(now, claimCode).run();
    if (!result.meta || result.meta.changes < 1) return jsonResponse({ ok:false, error:"not_found" }, 404);
    return jsonResponse({ ok:true, claimCode, eventStage:"message_copied" });
  } catch { return jsonResponse({ ok:false, error:"update_failed" }, 500); }
}
