import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { StaffMember } from "@printflow/shared";
import { config } from "../config.js";

const tokenTtlSeconds = 60 * 60 * 12;

interface TokenPayload {
  sub: string;
  email: string;
  exp: number;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const key = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt$${salt}$${key}`;
}

export function verifyPassword(password: string, storedHash: string | undefined): boolean {
  if (!storedHash) return false;
  const [algorithm, salt, key] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !key) return false;
  const candidate = Buffer.from(scryptSync(password, salt, 64).toString("base64url"));
  const expected = Buffer.from(key);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function issueStaffToken(staff: Pick<StaffMember, "id" | "email">): string {
  const payload: TokenPayload = {
    sub: staff.id,
    email: staff.email,
    exp: Math.floor(Date.now() / 1000) + tokenTtlSeconds
  };
  return signJwt(payload);
}

export function verifyStaffToken(token: string): TokenPayload {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) throw Object.assign(new Error("Invalid bearer token."), { statusCode: 401 });
  const signed = `${encodedHeader}.${encodedPayload}`;
  const expected = signature(signed);
  const received = Buffer.from(encodedSignature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw Object.assign(new Error("Bearer token signature is invalid."), { statusCode: 401 });
  }
  const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as TokenPayload;
  if (!payload.sub || !payload.email) throw Object.assign(new Error("Bearer token payload is invalid."), { statusCode: 401 });
  if (payload.exp * 1000 <= Date.now()) throw Object.assign(new Error("Bearer token has expired."), { statusCode: 401 });
  return payload;
}

function signJwt(payload: TokenPayload): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signed = `${header}.${body}`;
  return `${signed}.${signature(signed).toString()}`;
}

function signature(input: string): Buffer {
  const secret = config.appAuthSecret || "printflow-local-development-secret";
  return Buffer.from(createHmac("sha256", secret).update(input).digest("base64url"));
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
}
