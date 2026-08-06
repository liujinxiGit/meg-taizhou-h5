import { jsonResponse, validateOrigin } from "../../../_shared/leads.mjs";
import { clearSessionCookieHeader } from "../../../_shared/ops-auth.mjs";

export async function onRequestPost({ request, env }) {
  if (!validateOrigin(request, env, true)) return jsonResponse({ ok:false, error:"origin_not_allowed" }, 403);
  return jsonResponse({ ok:true }, 200, { "Set-Cookie":clearSessionCookieHeader() });
}
