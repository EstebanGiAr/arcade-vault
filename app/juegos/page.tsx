import { createClient } from "@/lib/supabase/server";
import { getAllGames } from "@/lib/games";
import { GamesBrowser } from "@/components/games-browser";

// getAllGames consulta `scores` en vivo (best/plays), así que no puede
// prerenderizarse como shell estático bajo cacheComponents.
export const instant = false;

export default async function Juegos() {
  const supabase = await createClient();
  const games = await getAllGames(supabase);

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      <GamesBrowser games={games} />
    </div>
  );
}
