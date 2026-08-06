import { authorizeOps, jsonResponse, validateOrigin } from "../../_shared/leads.mjs";

const TRASH_COLUMNS = "claim_code, service, status, status_before_delete, deleted_at, delete_reason, created_at";

export async function onRequestGet({ request, env }) {
  const auth = await authorizeOps(request, env);
  if (!auth.ok) return jsonResponse({ ok:false, error:"unauthorized" }, 401);
  if (!validateOrigin(request, env, true)) return jsonResponse({ ok:false, error:"origin_not_allowed" }, 403);
  if (!env.DB) return jsonResponse({ ok:false, error:"service_unavailable" }, 503);
  const url = new URL(request.url);
  const page = Math.max(1, Math.min(100000, Number(url.searchParams.get("page") || 1)));
  const pageSize = Math.max(1, Math.min(100, Number(url.searchParams.get("pageSize") || 20)));
  const search = String(url.searchParams.get("search") || "").trim().slice(0, 100);
  const where = ["deleted_at IS NOT NULL"];
  const values = [];
  if (search) {
    const term = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    where.push("(claim_code LIKE ? ESCAPE '\\' OR delete_reason LIKE ? ESCAPE '\\')");
    values.push(term, term);
  }
  const sql = ` WHERE ${where.join(" AND ")}`;
  try {
    const [rows, count] = await env.DB.batch([
      env.DB.prepare(`SELECT ${TRASH_COLUMNS} FROM leads${sql} ORDER BY deleted_at DESC LIMIT ? OFFSET ?`).bind(...values, pageSize, (page - 1) * pageSize),
      env.DB.prepare(`SELECT COUNT(*) AS total FROM leads${sql}`).bind(...values)
    ]);
    return jsonResponse({ ok:true, items:rows.results || [], total:Number(count.results?.[0]?.total || 0), page, pageSize });
  } catch { return jsonResponse({ ok:false, error:"query_failed" }, 500); }
}
