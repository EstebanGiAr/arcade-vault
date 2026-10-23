import { notFound } from "next/navigation";
import { FAKE_GAMES } from "@/app/data";
import { createClient } from "@/lib/supabase/server";
import { getGameById, getRealGames } from "@/lib/games";
import { GamePlayer } from "@/components/game-player";

export async function generateStaticParams() {
  const supabase = await createClient();
  const realGames = await getRealGames(supabase);
  return [...FAKE_GAMES, ...realGames].map((g) => ({ id: g.id }));
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
