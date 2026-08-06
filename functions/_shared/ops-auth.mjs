export const OPS_SESSION_COOKIE = "meg_ops_session";
export const OPS_SESSION_MAX_AGE = 2592000;
export const OPS_LOGIN_WINDOW = 300;
export const OPS_LOGIN_FAILURE_LIMIT = 5;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_VERSION = 1;
const CLOCK_SKEW_SECONDS = 300;
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function bytesToBase64(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

function base64ToBytes(value, urlSafe = false) {
  if (typeof value !== "string" || !value) throw new Error("invalid_base64");
  const pattern = urlSafe ? /^[A-Za-z0-9_-]+$/ : /^[A-Za-z0-9+/]+={0,2}$/;
  if (!pattern.test(value)) throw new Error("invalid_base64");
  const standard = (urlSafe ? value.replace(/-/g, "+").replace(/_/g, "/") : value).replace(/=+$/, "");
  if (standard.length % 4 === 1) throw new Error("invalid_base64");
  const padded = standard.padEnd(Math.ceil(standard.length / 4) * 4, "=");
  const decoded = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  const canonical = urlSafe ? base64UrlEncode(decoded) : bytesToBase64(decoded);
  if (canonical !== value) throw new Error("invalid_base64");
  return decoded;
}

function base64UrlEncode(bytes) { return bytesToBase64(bytes).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"); }

export function constantTimeEqual(left, right) {
  const a = left instanceof Uint8Array ? left : new Uint8Array(left);
  const b = right instanceof Uint8Array ? right : new Uint8Array(right);
  if (a.length !== b.length) return false;
  if (typeof crypto.subtle.timingSafeEqual === "function") return crypto.subtle.timingSafeEqual(a, b);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export function parsePasswordHash(encoded) {
  try {
    const parts = String(encoded || "").split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") return null;
    const iterations = Number(parts[1]);
    if (!Number.isSafeInteger(iterations) || iterations < 210000 || iterations > 2000000) return null;
    const salt = base64ToBytes(parts[2]);
    const expected = base64ToBytes(parts[3]);
    if (salt.length < 16 || salt.length > 64 || expected.length !== 32) return null;
    return { iterations, salt, expected };
  } catch { return null; }
}

export async function verifyPassword(password, encodedHash) {
  if (typeof password !== "string" || password.length < 1 || password.length > 512) return false;
  const parsed = parsePasswordHash(encodedHash);
  if (!parsed) return false;
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = new Uint8Array(await crypto.subtle.deriveBits({ name:"PBKDF2", hash:"SHA-256", salt:parsed.salt, iterations:parsed.iterations }, material, 256));
  return constantTimeEqual(derived, parsed.expected);
}

function sessionSecretBytes(secret) {
  try {
    const bytes = base64ToBytes(String(secret || ""), true);
    return bytes.length >= 32 && bytes.length <= 128 ? bytes : null;
  } catch { return null; }
}

async function importSessionKey(secret) {
  const bytes = sessionSecretBytes(secret);
  if (!bytes) throw new Error("invalid_session_secret");
  return crypto.subtle.importKey("raw", bytes, { name:"HMAC", hash:"SHA-256" }, false, ["sign"]);
}

export async function createSessionToken(secret, nowSeconds = Math.floor(Date.now() / 1000), sessionId = crypto.randomUUID()) {
  const issuedAt = Math.floor(nowSeconds);
  const payload = { v:SESSION_VERSION, iat:issuedAt, exp:issuedAt + OPS_SESSION_MAX_AGE, sessionId };
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await importSessionKey(secret);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload)));
  return `${encodedPayload}.${base64UrlEncode(signature)}`;
}

function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const item of header.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0 || item.slice(0, separator).trim() !== name) continue;
    return item.slice(separator + 1).trim();
  }
  return "";
}

export async function verifySessionToken(token, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  try {
    if (typeof token !== "string" || token.length < 40 || token.length > 2048) return { ok:false };
    const parts = token.split(".");
    if (parts.length !== 2) return { ok:false };
    const supplied = base64ToBytes(parts[1], true);
    if (supplied.length !== 32) return { ok:false };
    const key = await importSessionKey(secret);
    const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(parts[0])));
    if (!constantTimeEqual(expected, supplied)) return { ok:false };
    const payload = JSON.parse(decoder.decode(base64ToBytes(parts[0], true)));
    const now = Math.floor(nowSeconds);
    if (!payload || payload.v !== SESSION_VERSION || !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp)) return { ok:false };
    if (!SESSION_ID_PATTERN.test(String(payload.sessionId || ""))) return { ok:false };
    if (payload.iat > now + CLOCK_SKEW_SECONDS || payload.exp <= now || payload.exp - payload.iat !== OPS_SESSION_MAX_AGE) return { ok:false };
    return { ok:true, method:"session", sessionId:payload.sessionId, iat:payload.iat, exp:payload.exp };
  } catch { return { ok:false }; }
}

export function sessionCookieHeader(token) {
  return `${OPS_SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${OPS_SESSION_MAX_AGE}`;
}

export function clearSessionCookieHeader() {
  return `${OPS_SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function verifyOpsSession(request, env, nowSeconds) {
  const token = readCookie(request, OPS_SESSION_COOKIE);
  if (!token) return Promise.resolve({ ok:false });
  return verifySessionToken(token, env.OPS_SESSION_SECRET, nowSeconds);
}

function allowedOpsOrigins(env) {
  return String(env.OPS_ORIGINS || "https://megops.jinxiliu.com").split(",").map((item) => item.trim()).filter(Boolean);
}

function decodeJwtPart(value) { return JSON.parse(decoder.decode(base64ToBytes(value, true))); }

async function authorizeAccess(request, env) {
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
    const response = await fetch(`${issuer}/cdn-cgi/access/certs`, { cf:{ cacheTtl:3600, cacheEverything:true } });
    if (!response.ok) return { ok:false };
    const certs = await response.json();
    const jwk = (certs.keys || []).find((item) => item.kid === header.kid);
    if (!jwk) return { ok:false };
    const key = await crypto.subtle.importKey("jwk", jwk, { name:"RSASSA-PKCS1-v1_5", hash:"SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, base64ToBytes(parts[2], true), encoder.encode(`${parts[0]}.${parts[1]}`));
    return valid ? { ok:true, method:"access", email:payload.email || "" } : { ok:false };
  } catch { return { ok:false }; }
}

export async function authorizeOps(request, env) {
  const url = new URL(request.url);
  if (env.LOCAL_DEV === "true" && ["localhost", "127.0.0.1"].includes(url.hostname)) return { ok:true, method:"local", local:true };
  if (!allowedOpsOrigins(env).includes(url.origin)) return { ok:false };
  const session = await verifyOpsSession(request, env);
  if (session.ok) return session;
  return authorizeAccess(request, env);
}

async function loginRateCacheKey(request) {
  const fingerprint = `${request.headers.get("CF-Connecting-IP") || "unknown"}|${request.headers.get("user-agent") || "unknown"}`;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(fingerprint)));
  return new Request(`https://meg-ops-login-rate.invalid/${base64UrlEncode(digest)}`);
}

function loginRateCache() { return typeof caches !== "undefined" && caches.default ? caches.default : null; }

export async function getLoginFailureCount(request) {
  const cache = loginRateCache();
  if (!cache) return 0;
  const response = await cache.match(await loginRateCacheKey(request));
  if (!response) return 0;
  try { return Math.max(0, Number((await response.json()).count || 0)); }
  catch { return 0; }
}

export async function recordLoginFailure(request) {
  const cache = loginRateCache();
  if (!cache) return 0;
  const key = await loginRateCacheKey(request);
  const count = await getLoginFailureCount(request) + 1;
  await cache.put(key, new Response(JSON.stringify({ count }), { headers:{ "Cache-Control":`max-age=${OPS_LOGIN_WINDOW}` } }));
  return count;
}

export async function clearLoginFailures(request) {
  const cache = loginRateCache();
  if (cache) await cache.delete(await loginRateCacheKey(request));
}
