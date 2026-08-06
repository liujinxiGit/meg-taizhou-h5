import assert from "node:assert/strict";
import { randomBytes, randomInt } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const opsRoot = join(projectRoot, "ops");
const password = `workers-runtime-${randomBytes(12).toString("base64url")}`;
const generated = spawnSync(process.execPath, [join(projectRoot, "scripts/generate-ops-secrets.mjs")], {
  cwd:projectRoot,
  env:{ ...process.env, OPS_PASSWORD:password },
  encoding:"utf8"
});
assert.equal(generated.status, 0, "secret generator must succeed");
const passwordHash = (generated.stdout.match(/^OPS_PASSWORD_HASH=(.+)$/m) || [])[1];
const sessionSecret = (generated.stdout.match(/^OPS_SESSION_SECRET=(.+)$/m) || [])[1];
assert.ok(passwordHash && passwordHash.startsWith("pbkdf2_sha256$100000$"));
assert.ok(sessionSecret);

const port = randomInt(18000, 28000);
const inspectorPort = randomInt(28001, 38000);
const origin = `http://127.0.0.1:${port}`;

const wranglerBinary = process.env.WRANGLER_BIN || "npx";
const wranglerArgs = process.env.WRANGLER_BIN ? [] : ["wrangler"];
wranglerArgs.push(
  "pages", "dev", ".",
  "--binding", `OPS_PASSWORD_HASH=${passwordHash}`,
  "--binding", `OPS_SESSION_SECRET=${sessionSecret}`,
  "--binding", `OPS_ORIGINS=${origin}`,
  "--binding", "LOCAL_DEV=true",
  "--ip", "127.0.0.1",
  "--port", String(port),
  "--inspector-port", String(inspectorPort),
  "--log-level", "warn",
  "--show-interactive-dev-session=false"
);

const wrangler = spawn(wranglerBinary, wranglerArgs, {
  cwd:opsRoot,
  env:{ ...process.env, NO_PROXY:"127.0.0.1,localhost", no_proxy:"127.0.0.1,localhost" },
  stdio:["ignore", "pipe", "pipe"]
});
let runtimeLogs = "";
wrangler.stdout.on("data", (chunk) => { runtimeLogs += chunk; });
wrangler.stderr.on("data", (chunk) => { runtimeLogs += chunk; });

async function waitForRuntime() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (wrangler.exitCode !== null) throw new Error(`Wrangler exited before startup: ${runtimeLogs.slice(-1200)}`);
    try {
      const response = await fetch(origin, { signal:AbortSignal.timeout(1000) });
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Wrangler did not start: ${runtimeLogs.slice(-1200)}`);
}

async function login(passwordValue) {
  return fetch(`${origin}/api/ops/auth/login`, {
    method:"POST",
    headers:{ "Content-Type":"application/json", Origin:origin },
    body:JSON.stringify({ password:passwordValue }),
    signal:AbortSignal.timeout(30000)
  });
}

try {
  await waitForRuntime();
  const validResponse = await login(password);
  assert.equal(validResponse.status, 200, await validResponse.text());

  const invalidResponse = await login(`${password}-wrong`);
  assert.equal(invalidResponse.status, 401);
  const invalidBody = await invalidResponse.json();
  assert.deepEqual(invalidBody, { ok:false, error:"invalid_credentials" });
  console.log("wrangler-pages-pbkdf2-check: 100000 iterations passed in workerd");
} finally {
  wrangler.kill("SIGTERM");
}
