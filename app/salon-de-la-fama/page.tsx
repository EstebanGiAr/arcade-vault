import type { ScoreRow } from "@/app/data";
import { createClient } from "@/lib/supabase/server";
import { getAllGames } from "@/lib/games";
import { getTopScores } from "@/lib/scores";
import { HallOfFameTabs } from "@/components/hall-of-fame-tabs";

// getAllGames/getTopScores consultan datos en vivo, así que esta página no
// puede prerenderizarse como shell estático bajo cacheComponents.
export const instant = false;

export default async function HallOfFamePage() {
  const supabase = await createClient();
  const games = await getAllGames(supabase);
  const firstGame = games[0];

  const initialRows: ScoreRow[] = (
    await getTopScores(supabase, firstGame.id, 12)
  ).map((s, i) => ({
    rank: i + 1,
    name: s.name,
    score: s.score,
    date: new Date(s.createdAt).toLocaleDateString("es-ES"),
  }));

  return (
    <HallOfFameTabs
      games={games}
      initialTab={firstGame.id}
      initialRows={initialRows}
    />
  );
}
