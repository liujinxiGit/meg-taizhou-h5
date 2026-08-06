import { authorizeOps, jsonResponse, validateOrigin } from "../../_shared/leads.mjs";

export async function onRequestGet({ request, env }) {
  const auth = await authorizeOps(request, env);
  if (!auth.ok) return jsonResponse({ ok:false, error:"unauthorized" }, 401);
  if (!validateOrigin(request, env, true)) return jsonResponse({ ok:false, error:"origin_not_allowed" }, 403);
  if (!env.DB) return jsonResponse({ ok:false, error:"service_unavailable" }, 503);
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Shanghai", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
  const todayStart = new Date(`${localDate}T00:00:00+08:00`).toISOString();
  const todayEnd = new Date(`${localDate}T23:59:59.999+08:00`).toISOString();
  const localNoon = new Date(`${localDate}T12:00:00+08:00`);
  const daysSinceMonday = (localNoon.getUTCDay() + 6) % 7;
  const weekStart = new Date(new Date(`${localDate}T00:00:00+08:00`).getTime() - daysSinceMonday * 86400000).toISOString();
  const since = new Date(Date.now() - 6 * 86400000).toLocaleDateString("en-CA", { timeZone:"Asia/Shanghai" });
  const active = "deleted_at IS NULL AND status NOT IN ('duplicate', 'invalid')";
  try {
    const results = await env.DB.batch([
      env.DB.prepare(`SELECT COUNT(*) AS count FROM leads WHERE ${active} AND created_at >= ? AND created_at <= ?`).bind(todayStart, todayEnd),
      env.DB.prepare(`SELECT COUNT(*) AS count FROM leads WHERE ${active} AND created_at >= ? AND created_at <= ?`).bind(weekStart, todayEnd),
      env.DB.prepare(`SELECT status, COUNT(*) AS count FROM leads WHERE ${active} AND updated_at >= ? AND updated_at <= ? AND status IN ('wechat_added','booked','visited','converted') GROUP BY status`).bind(todayStart, todayEnd),
      env.DB.prepare(`SELECT date(created_at, '+8 hours') AS date, COUNT(*) AS count FROM leads WHERE ${active} AND date(created_at, '+8 hours') >= ? GROUP BY date ORDER BY date ASC`).bind(since),
      env.DB.prepare(`SELECT service, COUNT(*) AS count FROM leads WHERE ${active} GROUP BY service ORDER BY count DESC`),
      env.DB.prepare(`SELECT source, COUNT(*) AS count FROM leads WHERE ${active} GROUP BY source ORDER BY count DESC LIMIT 20`),
      env.DB.prepare(`SELECT language, COUNT(*) AS count FROM leads WHERE ${active} GROUP BY language ORDER BY language ASC`),
      env.DB.prepare("SELECT COUNT(*) AS count FROM leads WHERE deleted_at IS NOT NULL")
    ]);
    const status = Object.fromEntries((results[2].results || []).map((row) => [row.status, Number(row.count)]));
    const todayBookings = Number(results[0].results?.[0]?.count || 0);
    return jsonResponse({
      ok:true,
      bookings:{ today:todayBookings, week:Number(results[1].results?.[0]?.count || 0) },
      today:{
        new:todayBookings,
        wechat_added:status.wechat_added || 0,
        booked:status.booked || 0,
        visited:status.visited || 0,
        converted:status.converted || 0
      },
      trend7d:results[3].results || [],
      services:results[4].results || [],
      sources:results[5].results || [],
      languages:results[6].results || [],
      trashCount:Number(results[7].results?.[0]?.count || 0)
    });
  } catch { return jsonResponse({ ok:false, error:"query_failed" }, 500); }
}
