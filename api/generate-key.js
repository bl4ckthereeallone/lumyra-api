const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const requests = new Map();
const MAX = 1;
const WINDOW = 24 * 60 * 60 * 1000;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  const now = Date.now();
  const bucket = requests.get(ip) || { count: 0, since: now };
  if (now - bucket.since > WINDOW) { bucket.count = 0; bucket.since = now; }
  if (bucket.count >= MAX)
    return res.status(429).json({ error: "You already generated a key today. Try again later." });
  bucket.count++;
  requests.set(ip, bucket);

const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || 
           req.headers["x-real-ip"] || "unknown";
const now = Date.now();
const bucket = requests.get(ip) || { count: 0, since: now };
if (now - bucket.since > WINDOW) { bucket.count = 0; bucket.since = now; }
if (bucket.count >= MAX) {
  return res.status(429).json({ 
    error: "One key per IP per day. Try again tomorrow.",
    retryAfter: Math.ceil((WINDOW - (now - bucket.since)) / 1000)
  });
}
bucket.count++;
requests.set(ip, bucket);
  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("keys").insert({
    key,
    used: false,
    hwid: null,
    used_at: null,
    expires_at,
    created_at: new Date().toISOString(),
  });

  if (error) return res.status(500).json({ error: "Failed to generate key." });
  return res.json({ key });
};
