import crypto from "crypto";
import fs from "fs";
import path from "path";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Persisted to a local file on first run so sessions survive dev-server
// restarts. Set APP_SECRET in your environment for a real deployment.
function getSecret(): string {
  if (process.env.APP_SECRET) return process.env.APP_SECRET;
  const secretPath = path.join(process.cwd(), "data", ".session-secret");
  try {
    if (fs.existsSync(secretPath)) return fs.readFileSync(secretPath, "utf-8").trim();
    const generated = crypto.randomBytes(32).toString("hex");
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    fs.writeFileSync(secretPath, generated);
    return generated;
  } catch {
    // Fallback for read-only filesystems — sessions won't survive a restart,
    // but the app keeps working within a single server lifetime.
    return "agentcart-dev-fallback-secret-do-not-use-in-production";
  }
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createSessionToken(userId: string): string {
  const payload = JSON.stringify({ uid: userId, exp: Date.now() + SESSION_MAX_AGE * 1000 });
  const encoded = Buffer.from(payload).toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string): string | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  if (sign(encoded) !== signature) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    if (typeof payload.uid !== "string" || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return payload.uid;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "agentcart_session";
export const SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE;
