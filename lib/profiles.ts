import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function getProfileByUsername(
  supabase: SupabaseClient<Database>,
  username: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data !== null;
}

export async function getProfileById(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ id: string; username: string } | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
