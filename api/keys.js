const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function verifySession(req) {
  const auth = req.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return false;

  const { data } = await supabase
    .from("sessions")
    .select("expires_at")
    .eq("token", token)
    .single();

  if (!data) return false;
  if (new Date(data.expires_at) < new Date()) {
    await supabase.from("sessions").delete().eq("token", token);
    return false;
  }
  return true;
}

function generateKey() {
  const seg = () => crypto.randomBytes(3).toString("hex").toUpperCase();
  return `LUM-${seg()}-${seg()}-${seg()}`;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (!(await verifySession(req)))
    return res.status(401).json({ error: "Unauthorized." });

if (req.method === "GET") {
    await supabase.from("keys").delete().lt("expires_at", new Date().toISOString());
    const { data, error } = await supabase
      .from("keys")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === "POST") {
    const { amount = 1, expiresInDays } = req.body || {};
    const clamped = Math.min(Math.max(parseInt(amount) || 1, 1), 100);

    const keys = Array.from({ length: clamped }, () => ({
      key: generateKey(),
      used: false,
      hwid: null,
      used_at: null,
      expires_at: new Date(Date.now() + ((parseInt(expiresInDays) || 1) * 86400000)).toISOString(),
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase.from("keys").insert(keys).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

if (req.method === "DELETE") {
  const { id, deleteAll, deleteAmount } = req.body || {};

  if (deleteAll) {
    const { data: all, error: fetchErr } = await supabase.from("keys").select("id");
    if (fetchErr) return res.status(500).json({ error: fetchErr.message });
    const { error } = await supabase.from("keys").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, deleted: all.length });
  }

  if (deleteAmount) {
    const amt = Math.min(Math.max(parseInt(deleteAmount) || 1, 1), 1000);
    const { data: oldest, error: fetchErr } = await supabase
      .from("keys").select("id").order("created_at", { ascending: true }).limit(amt);
    if (fetchErr) return res.status(500).json({ error: fetchErr.message });
    const ids = oldest.map(k => k.id);
    const { error } = await supabase.from("keys").delete().in("id", ids);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, deleted: ids.length });
  }

  if (!id) return res.status(400).json({ error: "Missing id." });
  const { error } = await supabase.from("keys").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
}

  return res.status(405).end();
};
