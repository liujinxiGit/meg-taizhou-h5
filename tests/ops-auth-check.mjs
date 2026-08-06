import assert from "node:assert/strict";
import { createHash, pbkdf2Sync, randomBytes, webcrypto } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { onRequestPost as login } from "../functions/api/ops/auth/login.js";
import { onRequestGet as session } from "../functions/api/ops/auth/session.js";
import { onRequestPost as logout } from "../functions/api/ops/auth/logout.js";
import { onRequestGet as summary } from "../functions/api/ops/summary.js";
import {
  OPS_SESSION_MAX_AGE, createSessionToken, getLoginFailureCount, inspectOpsAuthEnvironment,
  parsePasswordHash, passwordHashFingerprint, verifyPassword, verifyPasswordWithDiagnostics,
  verifySessionToken
} from "../functions/_shared/ops-auth.mjs";

if (!globalThis.crypto) globalThis.crypto = webcrypto;
if (!globalThis.btoa) globalThis.btoa = (value) => Buffer.from(value, "binary").toString("base64");
if (!globalThis.atob) globalThis.atob = (value) => Buffer.from(value, "base64").toString("binary");

class MemoryCache {
  constructor() { this.items = new Map(); }
  key(request) { return typeof request === "string" ? request : request.url; }
  async match(request) { const response = this.items.get(this.key(request)); return response ? response.clone() : undefined; }
  async put(request, response) { this.items.set(this.key(request), response.clone()); }
  async delete(request) { return this.items.delete(this.key(request)); }
}
globalThis.caches = { default:new MemoryCache() };

const origin = "https://megops.jinxiliu.com";
const password = `ops-${randomBytes(18).toString("base64url")}`;
const salt = randomBytes(16);
const iterations = 210000;
const passwordHash = `pbkdf2_sha256$${iterations}$${salt.toString("base64")}$${pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64")}`;
const sessionSecret = randomBytes(32).toString("base64url");
const env = { OPS_PASSWORD_HASH:passwordHash, OPS_SESSION_SECRET:sessionSecret, OPS_ORIGINS:origin, LOCAL_DEV:"false" };

function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Origin", origin);
  headers.set("User-Agent", options.userAgent || "OpsAuthTest/1");
  headers.set("CF-Connecting-IP", options.ip || "192.0.2.10");
  return new Request(origin + path, { ...options, headers });
}
function cookieValue(setCookie) { return String(setCookie || "").split(";", 1)[0].split("=").slice(1).join("="); }

const parsedPasswordHash = parsePasswordHash(passwordHash);
assert.ok(parsedPasswordHash);
assert.ok(parsedPasswordHash.salt instanceof Uint8Array);
assert.equal(parsedPasswordHash.salt.byteLength, 16);
assert.equal(parsedPasswordHash.expected.byteLength, 32);
assert.equal(parsedPasswordHash.iterations, 210000);
assert.equal(parsePasswordHash(`pbkdf2_sha256$210000$not-standard-base64$also-invalid`), null);
assert.equal(await verifyPassword(password, passwordHash), true);
assert.equal(await verifyPassword(`${password}-wrong`, passwordHash), false);
const expectedFingerprint = createHash("sha256").update(passwordHash, "utf8").digest("hex").slice(0, 12);
assert.equal(await passwordHashFingerprint(passwordHash), expectedFingerprint);
assert.equal(await passwordHashFingerprint(passwordHash), await passwordHashFingerprint(passwordHash));
assert.notEqual(await passwordHashFingerprint(passwordHash), await passwordHashFingerprint(`${passwordHash}different`));
assert.deepEqual(inspectOpsAuthEnvironment(env), {
  passwordHashRead:true,
  passwordHashFormatValid:true,
  sessionSecretRead:true,
  sessionSecretFormatValid:true
});
assert.equal((await verifyPasswordWithDiagnostics(`${password}-wrong`, passwordHash)).stage, "password_mismatch");

const debugPassword = `${password}-diagnostic-wrong`;
const debugResponse = await login({
  request:request("/api/ops/auth/login", { ip:"192.0.2.80", userAgent:"DebugTest/1", method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ password:debugPassword }) }),
  env
});
assert.equal(debugResponse.status, 401);
const debugBodyText = await debugResponse.text();
const debugBody = JSON.parse(debugBodyText);
assert.deepEqual(debugBody, {
  ok:false,
  error:"invalid_credentials",
  passwordHashRead:true,
  sessionSecretRead:true,
  passwordHashFingerprint:expectedFingerprint,
  stage:"password_mismatch"
});
assert.equal(debugBodyText.includes(passwordHash), false);
assert.equal(debugBodyText.includes(sessionSecret), false);
assert.equal(debugBodyText.includes(debugPassword), false);

const subtlePrototype = Object.getPrototypeOf(crypto.subtle);
const originalDeriveBits = subtlePrototype.deriveBits;
subtlePrototype.deriveBits = async function () {
  const error = new Error(`forced derivation failure for ${password}; ${passwordHash}`);
  error.name = "OperationError";
  throw error;
};
try {
  const cryptoFailureResponse = await login({
    request:request("/api/ops/auth/login", { ip:"192.0.2.83", userAgent:"CryptoFailureTest/1", method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ password }) }),
    env
  });
  assert.equal(cryptoFailureResponse.status, 503);
  const cryptoFailureText = await cryptoFailureResponse.text();
  const cryptoFailureBody = JSON.parse(cryptoFailureText);
  assert.equal(cryptoFailureBody.error, "auth_configuration_error");
  assert.equal(cryptoFailureBody.stage, "pbkdf2_derivation_failed");
  assert.equal("cryptoErrorName" in cryptoFailureBody, false);
  assert.equal("cryptoErrorMessage" in cryptoFailureBody, false);
  assert.equal("cryptoErrorStage" in cryptoFailureBody, false);

  const cryptoDebugResponse = await login({
    request:request("/api/ops/auth/login", { ip:"192.0.2.84", userAgent:"CryptoDebugTest/1", method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ password }) }),
    env:{ ...env, OPS_AUTH_DEBUG:"true" }
  });
  assert.equal(cryptoDebugResponse.status, 503);
  const cryptoDebugText = await cryptoDebugResponse.text();
  const cryptoDebugBody = JSON.parse(cryptoDebugText);
  assert.equal(cryptoDebugBody.error, "auth_configuration_error");
  assert.equal(cryptoDebugBody.cryptoErrorName, "OperationError");
  assert.equal(cryptoDebugBody.cryptoErrorStage, "pbkdf2_derive_bits_failed");
  assert.ok(cryptoDebugBody.cryptoErrorMessage.length <= 160);
  assert.equal(cryptoDebugText.includes(password), false);
  assert.equal(cryptoDebugText.includes(passwordHash), false);
  assert.equal(cryptoDebugText.includes(sessionSecret), false);
  assert.equal(cryptoDebugText.includes("stack"), false);
} finally {
  subtlePrototype.deriveBits = originalDeriveBits;
}

const originalImportKey = subtlePrototype.importKey;
subtlePrototype.importKey = async function () {
  const error = new Error(`forced key import failure for ${password}`);
  error.name = "DataError";
  throw error;
};
try {
  const importFailure = await verifyPasswordWithDiagnostics(password, passwordHash);
  assert.equal(importFailure.ok, false);
  assert.equal(importFailure.stage, "pbkdf2_key_import_failed");
  assert.equal(importFailure.cryptoErrorName, "DataError");
  assert.equal(importFailure.cryptoErrorStage, "password_key_import_failed");
  assert.ok(importFailure.cryptoErrorMessage.length <= 160);
  assert.equal(importFailure.cryptoErrorMessage.includes(password), false);
} finally {
  subtlePrototype.importKey = originalImportKey;
}

const badSessionResponse = await login({
  request:request("/api/ops/auth/login", { ip:"192.0.2.81", userAgent:"DebugSessionTest/1", method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ password }) }),
  env:{ ...env, OPS_SESSION_SECRET:"not-a-valid-session-secret" }
});
assert.equal(badSessionResponse.status, 503);
assert.deepEqual(await badSessionResponse.json(), {
  ok:false,
  error:"auth_unavailable",
  passwordHashRead:true,
  sessionSecretRead:true,
  passwordHashFingerprint:expectedFingerprint,
  stage:"session_signing_failed"
});

const generated = spawnSync(process.execPath, ["scripts/generate-ops-secrets.mjs"], {
  cwd:new URL("..", import.meta.url),
  env:{ ...process.env, OPS_PASSWORD:"fingerprint-test-password" },
  encoding:"utf8"
});
assert.equal(generated.status, 0);
const generatedHash = (generated.stdout.match(/^OPS_PASSWORD_HASH=(.+)$/m) || [])[1];
const generatedFingerprint = (generated.stdout.match(/^OPS_PASSWORD_HASH_FINGERPRINT=([0-9a-f]{12})$/m) || [])[1];
assert.ok(generatedHash);
assert.equal(generatedFingerprint, createHash("sha256").update(generatedHash, "utf8").digest("hex").slice(0, 12));

const loginResponse = await login({ request:request("/api/ops/auth/login", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ password }) }), env });
assert.equal(loginResponse.status, 200);
const successfulBodyText = await loginResponse.clone().text();
assert.equal(successfulBodyText.includes("passwordHashFingerprint"), false);
assert.equal(successfulBodyText.includes("stage"), false);
const setCookie = loginResponse.headers.get("Set-Cookie");
assert.match(setCookie, /meg_ops_session=/);
assert.match(setCookie, /HttpOnly/i);
assert.match(setCookie, /Secure/i);
assert.match(setCookie, /SameSite=Lax/i);
assert.match(setCookie, /Path=\//i);
assert.match(setCookie, new RegExp(`Max-Age=${OPS_SESSION_MAX_AGE}`));

const token = cookieValue(setCookie);
assert.equal((await verifySessionToken(token, sessionSecret)).ok, true);
const sessionResponse = await session({ request:request("/api/ops/auth/session", { headers:{ Cookie:`meg_ops_session=${token}` } }), env });
assert.equal(sessionResponse.status, 200);
assert.equal((await sessionResponse.json()).authenticated, true);

const fakeDb = {
  prepare(sql) { return { sql, bind() { return this; } }; },
  async batch() { return Array.from({ length:8 }, () => ({ results:[] })); }
};
const summaryResponse = await summary({ request:request("/api/ops/summary", { headers:{ Cookie:`meg_ops_session=${token}` } }), env:{ ...env, DB:fakeDb } });
assert.equal(summaryResponse.status, 200);
const unauthorizedSummary = await summary({ request:request("/api/ops/summary"), env:{ ...env, DB:fakeDb } });
assert.equal(unauthorizedSummary.status, 401);

const changed = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
assert.equal((await session({ request:request("/api/ops/auth/session", { headers:{ Cookie:`meg_ops_session=${changed}` } }), env })).status, 401);
const expired = await createSessionToken(sessionSecret, Math.floor(Date.now() / 1000) - OPS_SESSION_MAX_AGE - 1);
assert.equal((await session({ request:request("/api/ops/auth/session", { headers:{ Cookie:`meg_ops_session=${expired}` } }), env })).status, 401);

const logoutResponse = await logout({ request:request("/api/ops/auth/logout", { method:"POST", headers:{ Cookie:`meg_ops_session=${token}` } }), env });
assert.equal(logoutResponse.status, 200);
assert.match(logoutResponse.headers.get("Set-Cookie"), /Max-Age=0/);

const wrongIdentity = { ip:"198.51.100.77", userAgent:"RateLimitTest/1" };
for (let attempt = 0; attempt < 5; attempt += 1) {
  const response = await login({ request:request("/api/ops/auth/login", { ...wrongIdentity, method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ password:`${password}-bad` }) }), env });
  assert.equal(response.status, 401);
}
const limited = await login({ request:request("/api/ops/auth/login", { ...wrongIdentity, method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ password:`${password}-bad` }) }), env });
assert.equal(limited.status, 429);
assert.equal(limited.headers.get("Retry-After"), "300");

const resetIdentity = { ip:"203.0.113.25", userAgent:"RateResetTest/1" };
await login({ request:request("/api/ops/auth/login", { ...resetIdentity, method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ password:`${password}-bad` }) }), env });
assert.equal(await getLoginFailureCount(request("/api/ops/auth/login", resetIdentity)), 1);
assert.equal((await login({ request:request("/api/ops/auth/login", { ...resetIdentity, method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ password }) }), env })).status, 200);
assert.equal(await getLoginFailureCount(request("/api/ops/auth/login", resetIdentity)), 0);

const opsHtml = readFileSync(new URL("../ops/index.html", import.meta.url), "utf8");
const opsJs = readFileSync(new URL("../ops/ops.js", import.meta.url), "utf8");
const opsAuthSource = readFileSync(new URL("../functions/_shared/ops-auth.mjs", import.meta.url), "utf8");
const configs = ["../wrangler.toml", "../wrangler.ops.toml", "../ops/wrangler.toml"].map((path) => readFileSync(new URL(path, import.meta.url), "utf8")).join("\n");
assert.match(opsHtml, /type="password"/);
assert.match(opsHtml, /autocomplete="current-password"/);
assert.match(opsJs, /\/api\/ops\/auth\/session/);
assert.match(opsJs, /credentials:"same-origin"/);
assert.match(opsJs, /后台认证暂时不可用，请联系管理员/);
assert.match(opsAuthSource, /new TextEncoder\(\)\.encode\(password\)/);
assert.match(opsAuthSource, /\{ name:"PBKDF2" \}/);
assert.match(opsAuthSource, /salt:new Uint8Array|const salt = new Uint8Array/);
assert.match(opsAuthSource, /}, passwordKey, 256\)/);
assert.doesNotMatch(opsHtml + opsJs, /pbkdf2_sha256\$\d+\$/);
assert.doesNotMatch(configs, /OPS_PASSWORD_HASH|OPS_SESSION_SECRET/);

console.log("ops-auth-check: all assertions passed");
