import {
  SERVICES, LANGUAGES, STATUSES, STORES, authorizeOps, csvEscape, jsonResponse,
  normalizeSource, validateOrigin
} from "../../_shared/leads.mjs";

const PUBLIC_FIELDS = [
  "claim_code", "created_at", "updated_at", "store", "campaign", "service", "language",
  "source", "page_path", "device_type", "browser_family", "event_stage", "status", "note", "status_changed_at"
];
const PUBLIC_COLUMNS = PUBLIC_FIELDS.map((field) => `l.${field} AS ${field}`).join(", ");
const SUSPICIOUS_COUNT = `CASE WHEN l.suspicious_group_id IS NULL THEN 0 ELSE (
  SELECT COUNT(*) FROM leads grouped
  WHERE grouped.suspicious_group_id = l.suspicious_group_id AND grouped.deleted_at IS NULL
) END AS suspicious_count`;

function filtersFrom(url, csv = false) {
  const where = ["l.deleted_at IS NULL"];
  const values = [];
  const add = (sql, value) => { where.push(sql); values.push(value); };
  const dateFrom = url.searchParams.get("dateFrom") || "";
  const dateTo = url.searchParams.get("dateTo") || "";
  const status = url.searchParams.get("status") || "";
  const service = url.searchParams.get("service") || "";
  const source = url.searchParams.get("source") || "";
  const store = url.searchParams.get("store") || "";
  const language = url.searchParams.get("language") || "";
  const search = (url.searchParams.get("search") || "").trim();
  if (csv) where.push("l.status NOT IN ('duplicate', 'invalid')");
  if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) add("l.created_at >= ?", new Date(`${dateFrom}T00:00:00+08:00`).toISOString());
  if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) add("l.created_at <= ?", new Date(`${dateTo}T23:59:59.999+08:00`).toISOString());
  if (STATUSES.includes(status)) add("l.status = ?", status);
  if (SERVICES.includes(service)) add("l.service = ?", service);
  if (source && normalizeSource(source) === source) add("l.source = ?", source);
  if (STORES.includes(store)) add("l.store = ?", store);
  if (LANGUAGES.includes(language)) add("l.language = ?", language);
  if (search) {
    where.push("(l.claim_code LIKE ? ESCAPE '\\' OR l.note LIKE ? ESCAPE '\\')");
    const term = `%${search.slice(0, 100).replace(/[\\%_]/g, "\\$&")}%`;
    values.push(term, term);
  }
  return { sql:` WHERE ${where.join(" AND ")}`, values };
}

export async function onRequestGet({ request, env }) {
  const auth = await authorizeOps(request, env);
  if (!auth.ok) return jsonResponse({ ok:false, error:"unauthorized" }, 401);
  if (!validateOrigin(request, env, true)) return jsonResponse({ ok:false, error:"origin_not_allowed" }, 403);
  if (!env.DB) return jsonResponse({ ok:false, error:"service_unavailable" }, 503);
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "json";
  const filters = filtersFrom(url, format === "csv");
  try {
    if (format === "csv") {
      const result = await env.DB.prepare(`SELECT ${PUBLIC_COLUMNS} FROM leads l${filters.sql} ORDER BY l.created_at DESC LIMIT 5000`).bind(...filters.values).all();
      const rows = [PUBLIC_FIELDS.join(",")].concat((result.results || []).map((row) => PUBLIC_FIELDS.map((key) => csvEscape(row[key])).join(",")));
      return new Response("\uFEFF" + rows.join("\r\n"), {
        headers:{
          "Content-Type":"text/csv; charset=utf-8",
          "Content-Disposition":`attachment; filename="meg-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
          "Cache-Control":"no-store",
          "X-Content-Type-Options":"nosniff"
        }
      });
    }
    const page = Math.max(1, Math.min(100000, Number(url.searchParams.get("page") || 1)));
    const pageSize = Math.max(1, Math.min(100, Number(url.searchParams.get("pageSize") || 20)));
    const offset = (page - 1) * pageSize;
    const [rows, count] = await env.DB.batch([
      env.DB.prepare(`SELECT ${PUBLIC_COLUMNS}, ${SUSPICIOUS_COUNT} FROM leads l${filters.sql} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`).bind(...filters.values, pageSize, offset),
      env.DB.prepare(`SELECT COUNT(*) AS total FROM leads l${filters.sql}`).bind(...filters.values)
    ]);
    return jsonResponse({ ok:true, items:rows.results || [], total:Number(count.results?.[0]?.total || 0), page, pageSize });
  } catch { return jsonResponse({ ok:false, error:"query_failed" }, 500); }
}
