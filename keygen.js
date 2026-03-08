require("dotenv").config();
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

function generateKey() {
  const seg = () => crypto.randomBytes(3).toString("hex").toUpperCase();
  return `LUM-${seg()}-${seg()}-${seg()}`;
}

async function createKeys(amount = 1, expiresInDays = null) {
  const keys = Array.from({ length: amount }, () => ({
    key: generateKey(),
    used: false,
    hwid: null,
    used_at: null,
    expires_at: expiresInDays
      ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
      : null,
    created_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase.from("keys").insert(keys).select();

  if (error) {
    console.error("Failed to insert keys:", error.message);
    return;
  }

  console.log(`\nGenerated ${data.length} key(s):\n`);
  data.forEach((k) => console.log(` ${k.key}${k.expires_at ? `  (expires ${k.expires_at.slice(0, 10)})` : ""}`));
  console.log("");
}

const amount = parseInt(process.argv[2]) || 1;
const days = process.argv[3] ? parseInt(process.argv[3]) : null;

createKeys(amount, days);