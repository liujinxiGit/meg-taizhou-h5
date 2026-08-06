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

  const nowDate = new Date();
  const now = nowDate.toISOString();
  const dedupeSince = new Date(nowDate.getTime() - 30 * 60 * 1000).toISOString();
  const suspiciousSince = new Date(nowDate.getTime() - 15 * 60 * 1000).toISOString();
  const userAgent = classifyUserAgent(request.headers.get("user-agent") || "");
  const db = typeof env.DB.withSession === "function" ? env.DB.withSession("first-primary") : env.DB;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const claimCode = generateClaimCode();
    try {
      const insert = await db.prepare(`
        INSERT INTO leads (
          claim_code, created_at, updated_at, store, campaign, service, language,
          source, page_path, device_type, browser_family, event_stage, status, note, client_id
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'claim_opened', 'new', '', NULLIF(?, '')
        WHERE ? = '' OR NOT EXISTS (
          SELECT 1 FROM leads
          WHERE client_id = ? AND campaign = ? AND service = ?
            AND created_at >= ? AND deleted_at IS NULL
        )
      `).bind(
        claimCode, now, now, data.store, data.campaign, data.service, data.language,
        data.source, data.pagePath, userAgent.deviceType, userAgent.browserFamily,
        data.clientId, data.clientId, data.clientId, data.campaign, data.service, dedupeSince
      ).run();
      if (Number(insert.meta?.changes || 0) === 0 && data.clientId) {
        const existing = await db.prepare(`
          SELECT claim_code, created_at, service FROM leads
          WHERE client_id = ? AND campaign = ? AND service = ?
            AND created_at >= ? AND deleted_at IS NULL
          ORDER BY created_at DESC LIMIT 1
        `).bind(data.clientId, data.campaign, data.service, dedupeSince).first();
        if (existing) {
          const response = { ok:true, claimCode:existing.claim_code, createdAt:existing.created_at, service:existing.service, deduplicated:true };
          await saveDedupedResponse(data.requestId, response);
          return jsonResponse(response, 200);
        }
        continue;
      }

      if (data.clientId) {
        const related = await db.prepare(`
          SELECT suspicious_group_id FROM leads
          WHERE client_id = ? AND campaign = ? AND service <> ?
            AND created_at >= ? AND deleted_at IS NULL
          ORDER BY created_at DESC LIMIT 1
        `).bind(data.clientId, data.campaign, data.service, suspiciousSince).first();
        if (related) {
          const groupId = related.suspicious_group_id || `SG-${crypto.randomUUID()}`;
          await db.prepare(`
            UPDATE leads SET suspicious_group_id = ?
            WHERE client_id = ? AND campaign = ? AND created_at >= ? AND deleted_at IS NULL
          `).bind(groupId, data.clientId, data.campaign, suspiciousSince).run();
        }
      }

      const response = { ok:true, claimCode, createdAt:now, service:data.service, deduplicated:false };
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
