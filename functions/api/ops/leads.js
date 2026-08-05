import {
  SERVICES, LANGUAGES, STATUSES, STORES, authorizeOps, csvEscape, jsonResponse,
  normalizeSource, validateOrigin
} from "../../_shared/leads.mjs";

const PUBLIC_COLUMNS = "claim_code, created_at, updated_at, store, campaign, service, language, source, page_path, device_type, browser_family, event_stage, status, note, status_changed_at";

function filtersFrom(url) {
  const where = [];
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
  if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) add("created_at >= ?", new Date(`${dateFrom}T00:00:00+08:00`).toISOString());
  if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) add("created_at <= ?", new Date(`${dateTo}T23:59:59.999+08:00`).toISOString());
  if (STATUSES.includes(status)) add("status = ?", status);
  if (SERVICES.includes(service)) add("service = ?", service);
  if (source && normalizeSource(source) === source) add("source = ?", source);
  if (STORES.includes(store)) add("store = ?", store);
  if (LANGUAGES.includes(language)) add("language = ?", language);
  if (search) {
    where.push("(claim_code LIKE ? ESCAPE '\\' OR note LIKE ? ESCAPE '\\')");
    const term = `%${search.slice(0, 100).replace(/[\\%_]/g, "\\$&")}%`;
    values.push(term, term);
  }
  return { sql:where.length ? ` WHERE ${where.join(" AND ")}` : "", values };
}

export async function onRequestGet({ request, env }) {
  const auth = await authorizeOps(request, env);
  if (!auth.ok) return jsonResponse({ ok:false, error:"unauthorized" }, 401);
  if (!validateOrigin(request, env, true)) return jsonResponse({ ok:false, error:"origin_not_allowed" }, 403);
  if (!env.DB) return jsonResponse({ ok:false, error:"service_unavailable" }, 503);
  const url = new URL(request.url);
  const filters = filtersFrom(url);
  const format = url.searchParams.get("format") || "json";
  try {
    if (format === "csv") {
      const result = await env.DB.prepare(`SELECT ${PUBLIC_COLUMNS} FROM leads${filters.sql} ORDER BY created_at DESC LIMIT 5000`).bind(...filters.values).all();
      const headers = PUBLIC_COLUMNS.split(", ");
      const rows = [headers.join(",")].concat((result.results || []).map((row) => headers.map((key) => csvEscape(row[key])).join(",")));
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
      env.DB.prepare(`SELECT ${PUBLIC_COLUMNS} FROM leads${filters.sql} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...filters.values, pageSize, offset),
      env.DB.prepare(`SELECT COUNT(*) AS total FROM leads${filters.sql}`).bind(...filters.values)
    ]);
    return jsonResponse({ ok:true, items:rows.results || [], total:Number(count.results?.[0]?.total || 0), page, pageSize });
  } catch { return jsonResponse({ ok:false, error:"query_failed" }, 500); }
}
