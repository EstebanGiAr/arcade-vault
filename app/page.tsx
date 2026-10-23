import { createClient } from "@/lib/supabase/server";
import { getAllGames } from "@/lib/games";
import { HomeContent } from "@/components/home-content";

export default async function Home() {
  const supabase = await createClient();
  const games = await getAllGames(supabase);

  return <HomeContent games={games} />;
}
