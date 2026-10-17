import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
export const SESSION_COOKIE = "pinfolio_session";
export const SESSION_SECONDS = 60 * 60 * 24 * 30;
export function passwordHash(
  password: string,
  salt = randomBytes(16).toString("hex"),
) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function passwordMatches(password: string, stored: string) {
  const [salt, hex] = stored.split(":");
  if (!salt || !/^[a-f0-9]{128}$/.test(hex || "") || password.length > 256)
    return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hex, "hex");
  return timingSafeEqual(candidate, expected);
}
function version(hash: string) {
  return createHash("sha256").update(hash).digest("hex").slice(0, 24);
}
export function makeSession(secret: string, hash: string, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(now / 1000) + SESSION_SECONDS,
      version: version(hash),
    }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function validSession(
  token: string,
  secret: string,
  hash: string,
  now = Date.now(),
) {
  try {
    if (secret.length < 32) return false;
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [payload, signature] = parts;
    const expected = createHmac("sha256", secret).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return false;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString());
    const seconds = Math.floor(now / 1000);
    return (
      Number.isInteger(value.exp) &&
      value.exp > seconds &&
      value.exp <= seconds + SESSION_SECONDS &&
      value.version === version(hash)
    );
  } catch {
    return false;
  }
}
export function requestSession(request: Request) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
      ?.slice(SESSION_COOKIE.length + 1) || ""
  );
}
