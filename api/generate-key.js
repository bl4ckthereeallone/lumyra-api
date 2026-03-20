const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const requests = new Map();
const MAX = 1;
const WINDOW = 24 * 60 * 60 * 1000;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Request-Token");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const seg = () => crypto.randomBytes(3).toString("hex").toUpperCase();
  const key = `LUM-${seg()}-${seg()}-${seg()}`;
  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const { token } = req.body || {};
if (!token) return res.status(403).json({ error: "Complete the verification link first." });

const verify = await fetch(`https://api.linkvertise.com/v1/token/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token, api_key: process.env.LINKVERTISE_API_KEY })
});
const vData = await verify.json();
if (!vData.success) return res.status(403).json({ error: "Verification failed. Please complete the link." });
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
