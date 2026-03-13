const crypto = require("crypto");

const sessions = new Map();
const loginAttempts = new Map();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const SESSION_MS = 2 * 60 * 60 * 1000;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  const now = Date.now();

  const attempts = loginAttempts.get(ip) || { count: 0, since: now };

  if (now - attempts.since > LOCKOUT_MS) {
    attempts.count = 0;
    attempts.since = now;
  }

  if (attempts.count >= MAX_ATTEMPTS) {
    const wait = Math.ceil((LOCKOUT_MS - (now - attempts.since)) / 60000);
    return res.status(429).json({ error: `Too many attempts. Try again in ${wait} min.` });
  }

  const { password } = req.body;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    attempts.count++;
    loginAttempts.set(ip, attempts);
    const left = MAX_ATTEMPTS - attempts.count;
    return res.status(401).json({ error: `Wrong password. ${left} attempt${left !== 1 ? "s" : ""} left.` });
  }

  loginAttempts.delete(ip);

  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { created: now, expires: now + SESSION_MS });

  setTimeout(() => sessions.delete(token), SESSION_MS);

  return res.json({ token });
};

module.exports.sessions = sessions;
