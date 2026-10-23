import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import { getGameById, getRealGames } from "@/lib/games";
import { GamePlayer } from "@/components/game-player";

// getGameById consulta `scores` en vivo (best/plays), así que no puede
// prerenderizarse como shell estático bajo cacheComponents.
export const instant = false;

export async function generateStaticParams() {
  const realGames = await getRealGames(createStaticClient());
  return realGames.map((g) => ({ id: g.id }));
}

export default async function GamePlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const game = await getGameById(supabase, id);

  if (!game) {
    notFound();
  }

  return <GamePlayer game={game} />;
}
