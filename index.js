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

// NEW GENERATE KEY ENDPOINT - ADDED HERE
app.post("/generate-key", async (req, res) => {
  try {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'LUMYRA-';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 5; j++) {
        key += chars[Math.floor(Math.random() * chars.length)];
      }
      if (i < 3) key += '-';
    }
    
    const { data, error } = await supabase
      .from("keys")
      .insert([{ 
        key, 
        used: false, 
        hwid: null, 
        created_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }])
      .select();
      
    if (error) {
      console.error("Error saving key:", error);
      return res.status(500).json({ error: "Failed to create key" });
    }
    
    console.log("Generated new key:", key);
    res.json({ key: data[0].key });
    
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/health", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Lumyra API running on port ${PORT}`));
