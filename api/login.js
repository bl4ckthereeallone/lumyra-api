const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const attempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  const now = Date.now();
  const bucket = attempts.get(ip) || { count: 0, since: now };

  if (now - bucket.since > LOCKOUT_MS) { bucket.count = 0; bucket.since = now; }

  if (bucket.count >= MAX_ATTEMPTS) {
    const wait = Math.ceil((LOCKOUT_MS - (now - bucket.since)) / 60000);
    return res.status(429).json({ error: `Too many attempts. Try again in ${wait} min.` });
  }

  const { password } = req.body || {};

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    bucket.count++;
    attempts.set(ip, bucket);
    const left = MAX_ATTEMPTS - bucket.count;
    return res.status(401).json({ error: `Wrong password. ${left} attempt${left !== 1 ? "s" : ""} left.` });
  }

  attempts.delete(ip);

  const token = crypto.randomBytes(32).toString("hex");
  const expires_at = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  await supabase.from("sessions").insert({ token, expires_at });

  await supabase.from("sessions").delete().lt("expires_at", new Date().toISOString());

  return res.json({ token });
};
