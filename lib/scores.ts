import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ScoreRow = {
  id: string;
  gameId: string;
  name: string;
  score: number;
  createdAt: string;
};

function toScoreRow(
  row: Database["public"]["Tables"]["scores"]["Row"],
): ScoreRow {
  return {
    id: row.id,
    gameId: row.game_id,
    name: row.name,
    score: row.score,
    createdAt: row.created_at,
  };
}

export async function saveScore(
  supabase: SupabaseClient<Database>,
  entry: { gameId: string; name: string; score: number },
): Promise<void> {
  const { error } = await supabase.from("scores").insert({
    game_id: entry.gameId,
    name: entry.name,
    score: entry.score,
  });

  if (error) {
    throw error;
  }
}

export async function getTopScores(
  supabase: SupabaseClient<Database>,
  gameId: string,
  limit = 10,
): Promise<ScoreRow[]> {
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map(toScoreRow);
}

export async function getBestScoreByName(
  supabase: SupabaseClient<Database>,
  gameId: string,
  name: string,
): Promise<ScoreRow | null> {
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("game_id", gameId)
    .ilike("name", name)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toScoreRow(data) : null;
}
