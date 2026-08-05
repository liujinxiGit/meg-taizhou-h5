import { authorizeOps, jsonResponse, validateOrigin } from "../../_shared/leads.mjs";

export async function onRequestGet({ request, env }) {
  const auth = await authorizeOps(request, env);
  if (!auth.ok) return jsonResponse({ ok:false, error:"unauthorized" }, 401);
  if (!validateOrigin(request, env, true)) return jsonResponse({ ok:false, error:"origin_not_allowed" }, 403);
  if (!env.DB) return jsonResponse({ ok:false, error:"service_unavailable" }, 503);
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Shanghai", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
  const todayStart = new Date(`${localDate}T00:00:00+08:00`).toISOString();
  const todayEnd = new Date(`${localDate}T23:59:59.999+08:00`).toISOString();
  const since = new Date(Date.now() - 6 * 86400000).toLocaleDateString("en-CA", { timeZone:"Asia/Shanghai" });
  try {
    const results = await env.DB.batch([
      env.DB.prepare("SELECT COUNT(*) AS count FROM leads WHERE created_at >= ? AND created_at <= ?").bind(todayStart, todayEnd),
      env.DB.prepare("SELECT status, COUNT(*) AS count FROM leads WHERE updated_at >= ? AND updated_at <= ? AND status IN ('wechat_added','booked','visited','converted') GROUP BY status").bind(todayStart, todayEnd),
      env.DB.prepare("SELECT date(created_at, '+8 hours') AS date, COUNT(*) AS count FROM leads WHERE date(created_at, '+8 hours') >= ? GROUP BY date ORDER BY date ASC").bind(since),
      env.DB.prepare("SELECT service, COUNT(*) AS count FROM leads GROUP BY service ORDER BY count DESC"),
      env.DB.prepare("SELECT source, COUNT(*) AS count FROM leads GROUP BY source ORDER BY count DESC LIMIT 20"),
      env.DB.prepare("SELECT language, COUNT(*) AS count FROM leads GROUP BY language ORDER BY language ASC")
    ]);
    const status = Object.fromEntries((results[1].results || []).map((row) => [row.status, Number(row.count)]));
    return jsonResponse({
      ok:true,
      today:{
        new:Number(results[0].results?.[0]?.count || 0),
        wechat_added:status.wechat_added || 0,
        booked:status.booked || 0,
        visited:status.visited || 0,
        converted:status.converted || 0
      },
      trend7d:results[2].results || [],
      services:results[3].results || [],
      sources:results[4].results || [],
      languages:results[5].results || []
    });
  } catch { return jsonResponse({ ok:false, error:"query_failed" }, 500); }
}
