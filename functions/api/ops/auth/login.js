import { jsonResponse, readJsonBody, validateOrigin } from "../../../_shared/leads.mjs";
import {
  OPS_LOGIN_FAILURE_LIMIT, OPS_LOGIN_WINDOW, clearLoginFailures, createSessionToken,
  getLoginFailureCount, inspectOpsAuthEnvironment, parsePasswordHash, recordLoginFailure,
  passwordHashFingerprint, sessionCookieHeader, verifyPasswordWithDiagnostics
} from "../../../_shared/ops-auth.mjs";

async function debugPayload(env, stage, passwordRead = false) {
  if (env.OPS_AUTH_DEBUG !== "true") return {};
  const diagnostic = inspectOpsAuthEnvironment(env);
  return { debug:{
    ...diagnostic,
    passwordHashFingerprint:diagnostic.passwordHashRead ? await passwordHashFingerprint(env.OPS_PASSWORD_HASH) : null,
    passwordRead,
    stage
  } };
}

async function authResponse(env, data, status, stage, passwordRead = false, headers = {}) {
  return jsonResponse({ ...data, ...await debugPayload(env, stage, passwordRead) }, status, headers);
}

export async function onRequestPost({ request, env }) {
  if (!validateOrigin(request, env, true)) return authResponse(env, { ok:false, error:"origin_not_allowed" }, 403, "origin_not_allowed");
  const failureCount = await getLoginFailureCount(request);
  if (failureCount >= OPS_LOGIN_FAILURE_LIMIT) {
    return authResponse(env, { ok:false, error:"rate_limited" }, 429, "rate_limited", false, { "Retry-After":String(OPS_LOGIN_WINDOW) });
  }
  if (!parsePasswordHash(env.OPS_PASSWORD_HASH)) {
    return authResponse(env, { ok:false, error:"auth_unavailable" }, 503, "password_hash_invalid");
  }
  let body;
  try { body = await readJsonBody(request, 2048); }
  catch { body = {}; }
  const password = body && typeof body.password === "string" ? body.password : "";
  const passwordRead = password.length > 0;
  const verification = await verifyPasswordWithDiagnostics(password, env.OPS_PASSWORD_HASH);
  if (!verification.ok) {
    await recordLoginFailure(request);
    return authResponse(env, { ok:false, error:"invalid_credentials" }, 401, verification.stage, passwordRead);
  }
  try {
    const token = await createSessionToken(env.OPS_SESSION_SECRET);
    await clearLoginFailures(request);
    return authResponse(env, { ok:true }, 200, "authenticated", passwordRead, { "Set-Cookie":sessionCookieHeader(token) });
  } catch {
    return authResponse(env, { ok:false, error:"auth_unavailable" }, 503, "session_signing_failed", passwordRead);
  }
}
