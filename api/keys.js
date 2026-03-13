import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function generateKey() {
  const seg = () => crypto.randomBytes(3).toString("hex").toUpperCase();
  return `LUM-${seg()}-${seg()}-${seg()}`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-password");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.headers["x-admin-password"] !== ADMIN_PASSWORD)
    return res.status(401).json({ error: "Unauthorized." });

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("keys")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === "POST") {
    const { amount = 1, expiresInDays = null } = req.body;

    const keys = Array.from({ length: Math.min(amount, 100) }, () => ({
      key: generateKey(),
      used: false,
      hwid: null,
      used_at: null,
     expires_at: new Date(Date.now() + ((expiresInDays ?? 1) * 86400000)).toISOString(),
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase.from("keys").insert(keys).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === "DELETE") {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing id." });

    const { error } = await supabase.from("keys").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed." });
}
