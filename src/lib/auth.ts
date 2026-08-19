/**
 * SIP — Security module
 * --------------------
 *  - Password hashing : salted SHA-256 (WebCrypto)
 *  - Tokens           : compact signed JWT-like tokens (HS256, HMAC-SHA256)
 *  - Role detection   : username search across all role collections
 *  - Access codes     : per-role 12-char codes (e.g. SIP-S-7K2M9Q4F)
 */

import { readDb } from "./db";
import type {
  Admin,
  Consultant,
  Parent,
  Role,
  Student,
  TeachersFile,
  AdminFile,
  ConsultantsFile,
  ParentsFile,
  StudentsFile,
  Teacher,
} from "./types";

const TOKEN_KEY = "sip-token";
const SECRET_KEY = "sip-secret";
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PASSWORD_MIN = 6;

/* ---------------- hashing ---------------- */

const te = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", te.encode(text));
  return toHex(digest);
}

function getSecret(): string {
  let secret = localStorage.getItem(SECRET_KEY);
  if (!secret) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    secret = toHex(bytes.buffer);
    localStorage.setItem(SECRET_KEY, secret);
  }
  return secret;
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const hash = await sha256Hex(`${salt}::${password}`);
  return { hash, salt };
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const hash = await sha256Hex(`${salt}::${password}`);
  return hash === expectedHash;
}

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN) return "رمز عبور باید حداقل ۶ کاراکتر باشد";
  if (!/\d/.test(password)) return "رمز عبور باید شامل حداقل یک عدد باشد";
  return null;
}

/* ---------------- access codes ---------------- */

function randomCodePart(len: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (let i = 0; i < len; i += 1) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function generateAccessCode(role: Role): string {
  const prefix = role === "admin" ? "A" : role === "teacher" ? "T" : role === "consultant" ? "C" : role === "parent" ? "P" : "S";
  return `SIP-${prefix}-${randomCodePart(4)}-${randomCodePart(4)}`;
}

export function generatePassword(): string {
  return `${randomCodePart(4)}${randomCodePart(4)}`;
}

/* ---------------- tokens (HS256) ---------------- */

function b64url(input: string): string {
  return btoa(unescape(encodeURIComponent(input)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return decodeURIComponent(escape(atob(input.replace(/-/g, "+").replace(/_/g, "/") + pad)));
}

async function hmacSign(data: string): Promise<string> {
  const keyData = te.encode(getSecret());
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, te.encode(data));
  return toHex(sig);
}

export interface TokenPayload {
  sub: string;
  role: Role;
  name: string;
  exp: number;
}

export async function signToken(payload: Omit<TokenPayload, "exp">): Promise<string> {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ ...payload, exp: Date.now() + TOKEN_TTL_MS }));
  const sig = await hmacSign(`${header}.${body}`);
  return `${header}.${body}.${sig}`;
}

export async function verifyToken(token: string | null): Promise<TokenPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const expected = await hmacSign(`${parts[0]}.${parts[1]}`);
  if (expected !== parts[2]) return null;
  try {
    const payload = JSON.parse(b64urlDecode(parts[1])) as TokenPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function readToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/* ---------------- lookup / login ---------------- */

export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  username: string;
  accessCode: string;
}

export function findUserByUsername(username: string): AuthUser | null {
  const u = username.trim().toLowerCase();
  const admin = readDb<AdminFile>("admin").admins.find((a) => a.username.toLowerCase() === u);
  if (admin) return toAuthUser(admin, "admin");
  const teachers = readDb<TeachersFile>("teachers").teachers.find((t) => t.username.toLowerCase() === u);
  if (teachers) return toAuthUser(teachers, "teacher");
  const students = readDb<StudentsFile>("students").students.find((s) => s.username.toLowerCase() === u);
  if (students) return toAuthUser(students, "student");
  const parents = readDb<ParentsFile>("parents").parents.find((p) => p.username.toLowerCase() === u);
  if (parents) return toAuthUser(parents, "parent");
  const consultants = readDb<ConsultantsFile>("consultants").consultants.find(
    (c) => c.username.toLowerCase() === u,
  );
  if (consultants) return toAuthUser(consultants, "consultant");
  return null;
}

function toAuthUser(
  u: Admin | Teacher | Student | Parent | Consultant,
  role: Role,
): AuthUser {
  return {
    id: u.id,
    role,
    name: u.fullName,
    username: u.username,
    accessCode: u.accessCode,
  };
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  token?: string;
  user?: AuthUser;
}

export async function attemptLogin(
  username: string,
  password: string,
): Promise<LoginResult> {
  const found = findUserByUsername(username);
  if (!found) return { ok: false, error: "کاربری با این نام کاربری یافت نشد" };
  const ok = await verifyPasswordForUser(found, password);
  if (!ok) return { ok: false, error: "رمز عبور نادرست است" };
  const token = await signToken({ sub: found.id, role: found.role, name: found.name });
  storeToken(token);
  return { ok: true, token, user: found };
}

export interface PasswordRecord {
  id: string;
  salt: string;
  passwordHash: string;
}

/** Verify a password for any user by id across all role collections. */
export async function verifyPasswordForUser(
  user: { id: string; role: Role },
  password: string,
): Promise<boolean> {
  const pools: PasswordRecord[][] = [
    readDb<AdminFile>("admin").admins,
    readDb<TeachersFile>("teachers").teachers,
    readDb<StudentsFile>("students").students,
    readDb<ParentsFile>("parents").parents,
    readDb<ConsultantsFile>("consultants").consultants,
  ];
  void user.role;
  const record = pools.flatMap((p) => p).find((r) => r.id === user.id);
  if (!record) return false;
  return verifyPassword(password, record.salt, record.passwordHash);
}
