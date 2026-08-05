import {
  checkRateLimit, classifyUserAgent, generateClaimCode, getDedupedResponse,
  jsonResponse, readJsonBody, saveDedupedResponse, validateCreatePayload, validateOrigin
} from "../_shared/leads.mjs";

export async function onRequestPost({ request, env }) {
  if (!validateOrigin(request, env, false)) return jsonResponse({ ok:false, error:"origin_not_allowed" }, 403);
  if (!env.DB) return jsonResponse({ ok:false, error:"service_unavailable" }, 503);
  if (!(await checkRateLimit(request, env, "create-lead"))) return jsonResponse({ ok:false, error:"too_many_requests" }, 429);

  let input;
  try { input = await readJsonBody(request); }
  catch (error) { return jsonResponse({ ok:false, error:error.message === "body_too_large" ? "body_too_large" : "invalid_json" }, 400); }
  const validation = validateCreatePayload(input);
  if (!validation.ok) return jsonResponse({ ok:false, error:validation.error }, 400);
  const data = validation.value;
  const deduped = await getDedupedResponse(data.requestId);
  if (deduped) return jsonResponse(deduped, 200);

  const now = new Date().toISOString();
  const userAgent = classifyUserAgent(request.headers.get("user-agent") || "");
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const claimCode = generateClaimCode();
    try {
      await env.DB.prepare(`
        INSERT INTO leads (
          claim_code, created_at, updated_at, store, campaign, service, language,
          source, page_path, device_type, browser_family, event_stage, status, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'claim_opened', 'new', '')
      `).bind(
        claimCode, now, now, data.store, data.campaign, data.service, data.language,
        data.source, data.pagePath, userAgent.deviceType, userAgent.browserFamily
      ).run();
      const response = { ok:true, claimCode, createdAt:now, service:data.service };
      await saveDedupedResponse(data.requestId, response);
      return jsonResponse(response, 201);
    } catch (error) {
      if (!/unique|constraint/i.test(String(error && error.message || error)) || attempt === 5) {
        return jsonResponse({ ok:false, error:"create_failed" }, 500);
      }
    }
  }
  return jsonResponse({ ok:false, error:"create_failed" }, 500);
}
