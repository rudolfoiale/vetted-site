const SUPABASE_URL = "https://vzxvilqixewowiqmltcu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6eHZpbHFpeGV3b3dpcW1sdGN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA0ODg0OSwiZXhwIjoyMDg3NjI0ODQ5fQ.uEH1Aqpfv8GqIWDGZEFuwp-PUfmp_IArACdBkto5YNQ";
const TG_BOT_TOKEN = "8529901915:AAGGKx4G0ApMk8YaMOOalyPgQmD6Wl-frR0";
const TG_CHAT_ID = "8235099154";

export default async (req) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
  
  if (req.method === "OPTIONS") return new Response("", { headers: cors });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

  try {
    const data = await req.json();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Parse JSON strings safely
    let supps = [];
    let skincare = [];
    try { supps = JSON.parse(data["supplements-data"] || "[]"); } catch {}
    try { skincare = JSON.parse(data["skincare-data"] || "[]"); } catch {}

    const row = {
      id,
      name: data.name || null,
      email: data.email || null,
      age: data.age || null,
      sex: data.sex || null,
      audit_type: data["audit-type"] || null,
      supplements_data: supps.length ? supps : null,
      skincare_data: skincare.length ? skincare : null,
      medications: data.medications || null,
      health_goals: data["health-goals"] || null,
      conditions: data.conditions || null,
      skin_type: data["skin-type"] || null,
      skin_concerns: data["skin-concerns"] || null,
      raw_payload: data,
    };

    // 1. Store in Supabase
    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/intake_submissions`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(row),
    });
    
    if (!dbRes.ok) {
      const err = await dbRes.text();
      console.error("Supabase error:", err);
      // Don't fail the user — still send notification
    }

    // 2. Telegram notification
    const suppList = supps.map(s => `  • ${s.name || "?"}${s.dose ? " — " + s.dose : ""}${s.frequency ? " (" + s.frequency + ")" : ""}`).join("\n");
    const msg = [
      `🔔 *NEW INTAKE SUBMISSION*`,
      ``,
      `*Name:* ${data.name || "—"}`,
      `*Email:* ${data.email || "—"}`,
      `*Age:* ${data.age || "—"} | *Sex:* ${data.sex || "—"}`,
      `*Audit:* ${data["audit-type"] || "—"}`,
      supps.length ? `\n*Supplements:*\n${suppList}` : "",
      data.medications ? `*Medications:* ${data.medications}` : "",
      data["health-goals"] ? `*Goals:* ${data["health-goals"]}` : "",
      data.conditions ? `*Conditions:* ${data.conditions}` : "",
      `\n_${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}_`,
    ].filter(Boolean).join("\n");

    await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown" }),
    }).catch(err => console.error("TG error:", err));

    // 3. Log as backup
    console.log("SUBMISSION:" + JSON.stringify({ id, name: data.name, email: data.email, audit: data["audit-type"] }));

    return Response.json({ success: true, id }, { headers: cors });
  } catch (err) {
    console.error("Error:", err);
    return Response.json({ error: "Failed to save" }, { status: 500, headers: cors });
  }
};

export const config = { path: "/api/submit-intake" };
