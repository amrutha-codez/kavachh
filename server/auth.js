import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, db } from "./store.js";

// ---------- secret used to sign login tokens ----------
function getSecret() {
  if (process.env.KAVACH_SECRET) return process.env.KAVACH_SECRET;
  const file = path.join(DATA_DIR, ".secret");
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    const fresh = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(file, fresh);
    return fresh;
  }
}
const SECRET = getSecret();
const TOKEN_DAYS = 7;

// ---------- passwords (never stored as plain text) ----------
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function checkPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const attempt = crypto.scryptSync(password, salt, 64);
  const real = Buffer.from(hash, "hex");
  return attempt.length === real.length && crypto.timingSafeEqual(attempt, real);
}

// ---------- login tokens ----------
function sign(text) {
  return crypto.createHmac("sha256", SECRET).update(text).digest("base64url");
}

export function makeToken(userId) {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + TOKEN_DAYS * 86400000 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  if (typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.exp > Date.now() ? data.uid : null;
  } catch {
    return null;
  }
}

// ---------- Express middleware: "you must be logged in" ----------
export function requireLogin(req, res, next) {
  const header = req.headers.authorization || "";
  const userId = readToken(header.startsWith("Bearer ") ? header.slice(7) : "");
  const user = db.users.find((u) => u.id === userId);
  if (!user) return res.status(401).json({ error: "Please log in first." });
  req.user = user;
  next();
}

// what we send to the website (no password!)
export function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || "",
    homeArea: u.homeArea || "",
    emergencyContact: u.emergencyContact || "",
    settings: u.settings || { notifications: true },
  };
}

// ---------- tiny rate limiter (stops password guessing / spam) ----------
const hits = new Map();
export function rateLimit(name, maxHits, windowMs) {
  return (req, res, next) => {
    const key = `${name}:${req.user?.id || req.ip}`;
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= maxHits) {
      return res.status(429).json({ error: "Too many tries. Please wait a little and try again." });
    }
    recent.push(now);
    hits.set(key, recent);
    next();
  };
}
