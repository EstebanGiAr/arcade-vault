import { createClient } from "@/lib/supabase/server";
import { getAllGames } from "@/lib/games";
import { HomeContent } from "@/components/home-content";

// getAllGames consulta `scores` en vivo (best/plays), así que no puede
// prerenderizarse como shell estático bajo cacheComponents.
export const instant = false;

export default async function Home() {
  const supabase = await createClient();
  const games = await getAllGames(supabase);

  return <HomeContent games={games} />;
}
