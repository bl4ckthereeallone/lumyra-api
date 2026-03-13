import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ valid: false, message: "Method not allowed." });

  const { key, hwid } = req.body;

  if (!key || !hwid)
    return res.status(400).json({ valid: false, message: "Missing key or hwid." });

  const { data, error } = await supabase
    .from("keys")
    .select("*")
    .eq("key", key.trim().toUpperCase())
    .single();

  if (error || !data)
    return res.json({ valid: false, message: "Invalid key." });

  if (data.used && data.hwid !== hwid)
    return res.json({ valid: false, message: "Key is already in use on another PC." });

  if (data.expires_at && new Date(data.expires_at) < new Date())
    return res.json({ valid: false, message: "Key has expired." });

  if (!data.used) {
    await supabase
      .from("keys")
      .update({ used: true, hwid, used_at: new Date().toISOString() })
      .eq("key", key.trim().toUpperCase());
  }

  return res.json({ valid: true, message: "Key accepted." });
}
