require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function upsertAllPlayers() {
  // Fetch all NFL players from Sleeper
  const res = await fetch('https://api.sleeper.app/v1/players/nfl');
  const allPlayers = await res.json();

  // Prepare data for upsert
  const upsertData = Object.values(allPlayers)
    .filter((p) => p.full_name && ["QB", "RB", "WR", "TE"].includes(p.position))
    .map((p) => ({
      player_id: p.player_id,
      full_name: p.full_name,
      position: p.position,
      team: p.team || "Free Agent",
    }));

  // Upsert in batches (Supabase limit is 1000 rows per request)
  for (let i = 0; i < upsertData.length; i += 1000) {
    const batch = upsertData.slice(i, i + 1000);
    const { error } = await supabase.from("players").upsert(batch, { onConflict: "player_id" });
    if (error) {
      console.error("Supabase upsert error:", error);
      process.exit(1);
    }
  }

  console.log(`Upserted ${upsertData.length} players.`);
}

upsertAllPlayers();