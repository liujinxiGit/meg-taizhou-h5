import { jsonResponse, readJsonBody, validateOrigin } from "../../../_shared/leads.mjs";
import {
  OPS_LOGIN_FAILURE_LIMIT, OPS_LOGIN_WINDOW, clearLoginFailures, createSessionToken,
  getLoginFailureCount, parsePasswordHash, recordLoginFailure, sessionCookieHeader, verifyPassword
} from "../../../_shared/ops-auth.mjs";

export async function onRequestPost({ request, env }) {
  if (!validateOrigin(request, env, true)) return jsonResponse({ ok:false, error:"origin_not_allowed" }, 403);
  const failureCount = await getLoginFailureCount(request);
  if (failureCount >= OPS_LOGIN_FAILURE_LIMIT) {
    return jsonResponse({ ok:false, error:"rate_limited" }, 429, { "Retry-After":String(OPS_LOGIN_WINDOW) });
  }
  if (!parsePasswordHash(env.OPS_PASSWORD_HASH)) return jsonResponse({ ok:false, error:"auth_unavailable" }, 503);
  let body;
  try { body = await readJsonBody(request, 2048); }
  catch { body = {}; }
  const password = body && typeof body.password === "string" ? body.password : "";
  let valid = false;
  try { valid = await verifyPassword(password, env.OPS_PASSWORD_HASH); }
  catch { valid = false; }
  if (!valid) {
    await recordLoginFailure(request);
    return jsonResponse({ ok:false, error:"invalid_credentials" }, 401);
  }
  try {
    const token = await createSessionToken(env.OPS_SESSION_SECRET);
    await clearLoginFailures(request);
    return jsonResponse({ ok:true }, 200, { "Set-Cookie":sessionCookieHeader(token) });
  } catch {
    return jsonResponse({ ok:false, error:"auth_unavailable" }, 503);
  }
}
