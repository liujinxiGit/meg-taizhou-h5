import { jsonResponse, readJsonBody, validateOrigin } from "../../../_shared/leads.mjs";
import {
  OPS_LOGIN_FAILURE_LIMIT, OPS_LOGIN_WINDOW, clearLoginFailures, createSessionToken,
  getLoginFailureCount, inspectOpsAuthEnvironment, parsePasswordHash, recordLoginFailure,
  passwordHashFingerprint, sessionCookieHeader, verifyPasswordWithDiagnostics
} from "../../../_shared/ops-auth.mjs";

async function failureDiagnostics(env, stage, cryptoFailure = null) {
  const diagnostic = inspectOpsAuthEnvironment(env);
  const result = {
    passwordHashRead:diagnostic.passwordHashRead,
    sessionSecretRead:diagnostic.sessionSecretRead,
    passwordHashFingerprint:diagnostic.passwordHashRead ? await passwordHashFingerprint(env.OPS_PASSWORD_HASH) : null,
    stage
  };
  if (env.OPS_AUTH_DEBUG === "true" && cryptoFailure && cryptoFailure.cryptoErrorStage) {
    result.cryptoErrorName = cryptoFailure.cryptoErrorName;
    result.cryptoErrorMessage = cryptoFailure.cryptoErrorMessage;
    result.cryptoErrorStage = cryptoFailure.cryptoErrorStage;
  }
  return result;
}

async function failureResponse(env, data, status, stage, headers = {}, cryptoFailure = null) {
  return jsonResponse({ ...data, ...await failureDiagnostics(env, stage, cryptoFailure) }, status, headers);
}

export async function onRequestPost({ request, env }) {
  if (!validateOrigin(request, env, true)) return failureResponse(env, { ok:false, error:"origin_not_allowed" }, 403, "origin_not_allowed");
  const failureCount = await getLoginFailureCount(request);
  if (failureCount >= OPS_LOGIN_FAILURE_LIMIT) {
    return failureResponse(env, { ok:false, error:"rate_limited" }, 429, "rate_limited", { "Retry-After":String(OPS_LOGIN_WINDOW) });
  }
  if (!parsePasswordHash(env.OPS_PASSWORD_HASH)) {
    return failureResponse(env, { ok:false, error:"auth_unavailable" }, 503, "password_hash_invalid");
  }
  let body;
  try { body = await readJsonBody(request, 2048); }
  catch { body = {}; }
  const password = body && typeof body.password === "string" ? body.password : "";
  const verification = await verifyPasswordWithDiagnostics(password, env.OPS_PASSWORD_HASH);
  if (!verification.ok) {
    if (verification.cryptoErrorStage) {
      return failureResponse(
        env,
        { ok:false, error:"auth_configuration_error" },
        503,
        verification.stage,
        {},
        verification
      );
    }
    await recordLoginFailure(request);
    return failureResponse(env, { ok:false, error:"invalid_credentials" }, 401, verification.stage);
  }
  try {
    const token = await createSessionToken(env.OPS_SESSION_SECRET);
    await clearLoginFailures(request);
    return jsonResponse({ ok:true }, 200, { "Set-Cookie":sessionCookieHeader(token) });
  } catch {
    return failureResponse(env, { ok:false, error:"auth_unavailable" }, 503, "session_signing_failed");
  }
}
