import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function signUp(
  supabase: SupabaseClient<Database>,
  params: { email: string; password: string; username: string },
): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: { username: params.username },
    },
  });

  if (error) {
    throw error;
  }
  if (!data.user) {
    throw new Error("No se pudo crear la cuenta.");
  }

  return data.user;
}

export async function signIn(
  supabase: SupabaseClient<Database>,
  params: { email: string; password: string },
): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });

  if (error) {
    throw error;
  }

  return data.user;
}

export async function resendConfirmationEmail(
  supabase: SupabaseClient<Database>,
  email: string,
): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    throw error;
  }
}

export async function signOut(
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function getSessionUser(
  supabase: SupabaseClient<Database>,
): Promise<User | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session?.user ?? null;
}
