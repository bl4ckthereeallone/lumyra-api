const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const attempts = new Map();
const MAX = 10;
const WINDOW = 60 * 1000;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  const now = Date.now();
  const bucket = attempts.get(ip) || { count: 0, since: now };

  if (now - bucket.since > WINDOW) {
    bucket.count = 0;
    bucket.since = now;
  }

  if (bucket.count >= MAX)
    return res.status(429).json({ valid: false, message: "Too many attempts. Try again later." });

  bucket.count++;
  attempts.set(ip, bucket);

  const { key, hwid } = req.body || {};

  if (!key || !hwid)
    return res.status(400).json({ valid: false, message: "Missing key or hwid." });

  if (!/^LUM-[A-F0-9]{6}-[A-F0-9]{6}-[A-F0-9]{6}$/.test(key.trim().toUpperCase()))
    return res.json({ valid: false, message: "Invalid key format." });

  const { data, error } = await supabase
    .from("keys")
    .select("*")
    .eq("key", key.trim().toUpperCase())
    .single();

  if (error || !data)
    return res.json({ valid: false, message: "Invalid key." });

  if (data.used && data.hwid !== hwid)
    return res.json({ valid: false, message: "Key is locked to another PC." });

  if (data.expires_at && new Date(data.expires_at) < new Date())
    return res.json({ valid: false, message: "Key has expired." });

  if (!data.used) {
    await supabase
      .from("keys")
      .update({ used: true, hwid, used_at: new Date().toISOString() })
      .eq("key", key.trim().toUpperCase());
  }

  return res.json({ valid: true, message: "Key accepted." });
};
