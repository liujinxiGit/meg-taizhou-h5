export const SERVICES = [
  "open_gym", "personal_training", "reformer_pilates", "posture_training",
  "physical_reconditioning", "weightlifting", "functional_training",
  "mobility_recovery", "sports_performance", "boxing", "youth_fitness",
  "group_classes", "other"
];
export const LANGUAGES = ["zh-CN", "en"];
export const EVENT_STAGES = ["claim_opened", "message_copied", "wechat_qr_viewed"];
export const STATUSES = ["new", "wechat_added", "booked", "visited", "converted", "duplicate", "invalid", "closed"];
export const STORES = ["taizhou"];
export const CAMPAIGNS = ["taizhou-opening-2026"];
const CLAIM_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CREATE_FIELDS = ["service", "language", "source", "store", "campaign", "pagePath", "requestId", "clientId"];
const CLIENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders
    }
  });
}

export async function readJsonBody(request, maxBytes = 4096) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new Error("body_too_large");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) throw new Error("body_too_large");
  try { return JSON.parse(text || "{}"); }
  catch { throw new Error("invalid_json"); }
}

export function normalizeSource(value) {
  const source = String(value || "direct").trim();
  if (!source) return "direct";
  if (source.length > 64 || !/^[A-Za-z0-9_-]+$/.test(source)) return "direct";
  return source;
}

export function validateCreatePayload(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok:false, error:"invalid_request" };
  const unknown = Object.keys(input).filter((key) => !CREATE_FIELDS.includes(key));
  if (unknown.length) return { ok:false, error:"unsupported_field" };
  if (!SERVICES.includes(input.service)) return { ok:false, error:"invalid_service" };
  if (!LANGUAGES.includes(input.language)) return { ok:false, error:"invalid_language" };
  const store = input.store || "taizhou";
  const campaign = input.campaign || "taizhou-opening-2026";
  if (!STORES.includes(store)) return { ok:false, error:"invalid_store" };
  if (!CAMPAIGNS.includes(campaign)) return { ok:false, error:"invalid_campaign" };
  const pagePath = String(input.pagePath || (input.language === "en" ? "/en/" : "/"));
  if (pagePath.length > 160 || !/^\/[A-Za-z0-9_./-]*$/.test(pagePath)) return { ok:false, error:"invalid_page_path" };
  const requestId = String(input.requestId || "");
  if (requestId && (requestId.length > 80 || !/^[A-Za-z0-9_-]+$/.test(requestId))) return { ok:false, error:"invalid_request_id" };
  const clientId = String(input.clientId || "").trim().toLowerCase();
  if (clientId && (clientId.length !== 36 || !CLIENT_ID_PATTERN.test(clientId))) return { ok:false, error:"invalid_client_id" };
  return {
    ok:true,
    value:{
      service:input.service,
      language:input.language,
      source:normalizeSource(input.source),
      store,
      campaign,
      pagePath,
      requestId,
      clientId
    }
  };
}

export function isClientId(value) {
  const clientId = String(value || "").trim();
  return clientId.length === 36 && CLIENT_ID_PATTERN.test(clientId);
}

export function validateOpsPatch(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok:false, error:"invalid_request" };
  if (Object.keys(input).some((key) => !["status", "note"].includes(key))) return { ok:false, error:"unsupported_field" };
  if (input.status !== undefined && !STATUSES.includes(input.status)) return { ok:false, error:"invalid_status" };
  if (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 2000)) return { ok:false, error:"invalid_note" };
  if (input.status === undefined && input.note === undefined) return { ok:false, error:"empty_update" };
  return { ok:true, value:{ status:input.status, note:input.note } };
}

export function classifyUserAgent(userAgent = "") {
  const ua = String(userAgent);
  const deviceType = /iPad|Tablet/i.test(ua) ? "tablet" : /Mobile|iPhone|Android/i.test(ua) ? "mobile" : "desktop";
  let browserFamily = "other";
  if (/MicroMessenger/i.test(ua)) browserFamily = "wechat";
  else if (/Edg\//i.test(ua)) browserFamily = "edge";
  else if (/CriOS|Chrome\//i.test(ua)) browserFamily = "chrome";
  else if (/FxiOS|Firefox\//i.test(ua)) browserFamily = "firefox";
  else if (/Safari\//i.test(ua)) browserFamily = "safari";
  return { deviceType, browserFamily };
}

export function shanghaiDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone:"Asia/Shanghai", year:"2-digit", month:"2-digit", day:"2-digit"
  }).formatToParts(date).reduce((all, part) => { all[part.type] = part.value; return all; }, {});
  return `${parts.year}${parts.month}${parts.day}`;
}

export function generateClaimCode(date = new Date(), randomValues) {
  const values = randomValues || crypto.getRandomValues(new Uint8Array(4));
  let suffix = "";
  for (let index = 0; index < 4; index += 1) suffix += CLAIM_ALPHABET[values[index] % CLAIM_ALPHABET.length];
  return `TZ-${shanghaiDateParts(date)}-${suffix}`;
}

export function isClaimCode(value) {
  return /^TZ-\d{6}-[2-9A-HJKMNP-Z]{4}$/.test(String(value || ""));
}

function allowedOrigins(env, ops) {
  const raw = String((ops ? env.OPS_ORIGINS : env.PUBLIC_ORIGINS) || (ops ? "https://megops.jinxiliu.com" : "https://taizhou.jinxiliu.com"));
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

export function validateOrigin(request, env, ops = false) {
  const origin = request.headers.get("origin") || "";
  const referer = request.headers.get("referer") || "";
  let candidate = origin;
  if (!candidate && referer) {
    try { candidate = new URL(referer).origin; }
    catch { candidate = ""; }
  }
  if (env.LOCAL_DEV === "true" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(candidate)) return true;
  if (candidate) return allowedOrigins(env, ops).includes(candidate);
  const fetchSite = request.headers.get("sec-fetch-site") || "";
  return fetchSite === "same-origin" && allowedOrigins(env, ops).includes(new URL(request.url).origin);
}

function bytesToHex(bytes) { return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
async function sha256(value) { return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))); }

export async function checkRateLimit(request, env, route, limit = 8, ttl = 60) {
  const rawKey = `${request.headers.get("CF-Connecting-IP") || "unknown"}|${request.headers.get("user-agent") || "unknown"}|${route}`;
  const key = await sha256(rawKey);
  if (env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === "function") {
    const result = await env.RATE_LIMITER.limit({ key });
    return result && result.success !== false;
  }
  if (typeof caches === "undefined" || !caches.default) return true;
  const cacheKey = new Request(`https://meg-rate-limit.invalid/${route}/${key}`);
  const existing = await caches.default.match(cacheKey);
  const count = existing ? Number((await existing.json()).count || 0) : 0;
  if (count >= limit) return false;
  await caches.default.put(cacheKey, new Response(JSON.stringify({ count:count + 1 }), { headers:{ "Cache-Control":`max-age=${ttl}` } }));
  return true;
}

export async function getDedupedResponse(requestId) {
  if (!requestId || typeof caches === "undefined" || !caches.default) return null;
  const key = await sha256(requestId);
  const cached = await caches.default.match(new Request(`https://meg-dedupe.invalid/${key}`));
  return cached ? cached.json() : null;
}

export async function saveDedupedResponse(requestId, payload) {
  if (!requestId || typeof caches === "undefined" || !caches.default) return;
  const key = await sha256(requestId);
  await caches.default.put(new Request(`https://meg-dedupe.invalid/${key}`), new Response(JSON.stringify(payload), { headers:{ "Cache-Control":"max-age=600" } }));
}

function base64UrlBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(normalized), (char) => char.charCodeAt(0));
}

function decodeJwtPart(value) { return JSON.parse(new TextDecoder().decode(base64UrlBytes(value))); }

export async function authorizeOps(request, env) {
  const url = new URL(request.url);
  if (env.LOCAL_DEV === "true" && ["localhost", "127.0.0.1"].includes(url.hostname)) return { ok:true, local:true };
  if (!allowedOrigins(env, true).includes(url.origin)) return { ok:false };
  const token = request.headers.get("Cf-Access-Jwt-Assertion") || "";
  const team = String(env.CF_ACCESS_TEAM_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\.cloudflareaccess\.com.*$/, "");
  const audience = String(env.CF_ACCESS_AUD || "");
  if (!token || !team || !audience || team.startsWith("REPLACE_") || audience.startsWith("REPLACE_")) return { ok:false };
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { ok:false };
    const header = decodeJwtPart(parts[0]);
    const payload = decodeJwtPart(parts[1]);
    const issuer = `https://${team}.cloudflareaccess.com`;
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    const now = Math.floor(Date.now() / 1000);
    if (payload.iss !== issuer || !audiences.includes(audience) || !payload.exp || payload.exp <= now) return { ok:false };
    const certs = await fetch(`${issuer}/cdn-cgi/access/certs`, { cf:{ cacheTtl:3600, cacheEverything:true } }).then((response) => response.json());
    const jwk = (certs.keys || []).find((key) => key.kid === header.kid);
    if (!jwk) return { ok:false };
    const key = await crypto.subtle.importKey("jwk", jwk, { name:"RSASSA-PKCS1-v1_5", hash:"SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, base64UrlBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    return valid ? { ok:true, email:payload.email || "" } : { ok:false };
  } catch { return { ok:false }; }
}

export function csvEscape(value) {
  const text = String(value === null || value === undefined ? "" : value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
