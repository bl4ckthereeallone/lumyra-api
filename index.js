require("dotenv").config();
const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.post("/validate", async (req, res) => {
  const { key, hwid } = req.body;

  if (!key || !hwid) {
    return res.status(400).json({ valid: false, message: "Missing key or hwid." });
  }

  const { data, error } = await supabase
    .from("keys")
    .select("*")
    .eq("key", key.trim().toUpperCase())
    .single();

  if (error || !data) {
    return res.json({ valid: false, message: "Invalid key." });
  }

  if (data.used && data.hwid !== hwid) {
    return res.json({ valid: false, message: "Key is already in use on another PC." });
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return res.json({ valid: false, message: "Key has expired." });
  }

  if (!data.used) {
    await supabase
      .from("keys")
      .update({ used: true, hwid, used_at: new Date().toISOString() })
      .eq("key", key.trim().toUpperCase());
  }

  return res.json({ valid: true, message: "Key accepted." });
});

app.get("/health", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Lumyra API running on port ${PORT}`));