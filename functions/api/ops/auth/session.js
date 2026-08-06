import { jsonResponse, validateOrigin } from "../../../_shared/leads.mjs";
import { verifyOpsSession } from "../../../_shared/ops-auth.mjs";

export async function onRequestGet({ request, env }) {
  if (!validateOrigin(request, env, true)) return jsonResponse({ ok:false, authenticated:false }, 403);
  const session = await verifyOpsSession(request, env);
  return session.ok
    ? jsonResponse({ ok:true, authenticated:true })
    : jsonResponse({ ok:false, authenticated:false }, 401);
}
