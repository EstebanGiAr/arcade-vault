import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Cliente sin cookies, para usarse en generateStaticParams (tiempo de build),
// donde no hay request HTTP ni acceso a cookies().
export function createStaticClient() {
  return createSupabaseJsClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
