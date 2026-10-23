import type { SupabaseClient } from "@supabase/supabase-js";
import type { Game, GameCategory } from "@/app/data";
import type { Database } from "@/lib/supabase/database.types";

export async function getRealGames(
  supabase: SupabaseClient<Database>,
): Promise<Game[]> {
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("*");

  if (gamesError) {
    throw gamesError;
  }

  const { data: scores, error: scoresError } = await supabase
    .from("scores")
    .select("game_id, score");

  if (scoresError) {
    throw scoresError;
  }

  const statsByGameId = new Map<string, { best: number; plays: number }>();
  for (const row of scores ?? []) {
    const stats = statsByGameId.get(row.game_id) ?? { best: 0, plays: 0 };
    stats.best = Math.max(stats.best, row.score);
    stats.plays += 1;
    statsByGameId.set(row.game_id, stats);
  }

  return (games ?? []).map((g) => {
    const stats = statsByGameId.get(g.id) ?? { best: 0, plays: 0 };
    return {
      id: g.id,
      title: g.title,
      short: g.short,
      long: g.long,
      cat: g.cat as GameCategory,
      cover: g.cover,
      color: g.color as Game["color"],
      best: stats.best,
      plays: String(stats.plays),
    };
  });
}

export async function getAllGames(
  supabase: SupabaseClient<Database>,
): Promise<Game[]> {
  return getRealGames(supabase);
}

export async function getGameById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Game | null> {
  const { data: g, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!g) {
    return null;
  }

  const { data: scores, error: scoresError } = await supabase
    .from("scores")
    .select("score")
    .eq("game_id", id);

  if (scoresError) {
    throw scoresError;
  }

  const best = (scores ?? []).reduce((max, s) => Math.max(max, s.score), 0);

  return {
    id: g.id,
    title: g.title,
    short: g.short,
    long: g.long,
    cat: g.cat as GameCategory,
    cover: g.cover,
    color: g.color as Game["color"],
    best,
    plays: String(scores?.length ?? 0),
  };
}
