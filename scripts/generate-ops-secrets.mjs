import { pbkdf2Sync, randomBytes } from "node:crypto";
import { emitKeypressEvents } from "node:readline";

const ITERATIONS = 210000;

function readHiddenPassword() {
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("非交互环境请通过 OPS_PASSWORD 环境变量提供待哈希密码。");
  }
  return new Promise((resolve, reject) => {
    let value = "";
    const wasRaw = Boolean(process.stdin.isRaw);
    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdout.write("请输入新的 Operations 后台密码：");
    function finish(error) {
      process.stdin.off("keypress", onKeypress);
      process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error); else resolve(value);
    }
    function onKeypress(text, key = {}) {
      if (key.ctrl && key.name === "c") return finish(new Error("已取消。"));
      if (key.name === "return" || key.name === "enter") return finish();
      if (key.name === "backspace") {
        if (value) { value = Array.from(value).slice(0, -1).join(""); process.stdout.write("\b \b"); }
        return;
      }
      if (!key.ctrl && !key.meta && text && value.length < 512) { value += text; process.stdout.write("•"); }
    }
    process.stdin.on("keypress", onKeypress);
  });
}

try {
  const password = process.env.OPS_PASSWORD || await readHiddenPassword();
  if (password.length < 12 || password.length > 512) throw new Error("密码长度必须为 12–512 个字符。");
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");
  const sessionSecret = randomBytes(32).toString("base64url");
  process.stdout.write(`OPS_PASSWORD_HASH=pbkdf2_sha256$${ITERATIONS}$${salt.toString("base64")}$${hash.toString("base64")}\n`);
  process.stdout.write(`OPS_SESSION_SECRET=${sessionSecret}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
