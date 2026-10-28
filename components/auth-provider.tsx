"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  signIn as signInRequest,
  signOut as signOutRequest,
  signUp as signUpRequest,
} from "@/lib/auth";
import { getProfileById } from "@/lib/profiles";

export type SessionUser = { id: string; name: string };

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  signIn: (params: { email: string; password: string }) => Promise<void>;
  signUp: (params: {
    email: string;
    password: string;
    username: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabaseRef = useRef(createClient());
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = supabaseRef.current;

    const resolveUser = async (authUser: User | null) => {
      if (!authUser) {
        setUser(null);
        return;
      }

      const profile = await getProfileById(supabase, authUser.id);
      setUser({ id: authUser.id, name: profile?.username ?? "JUGADOR" });
    };

    supabase.auth.getSession().then(async ({ data }) => {
      await resolveUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await resolveUser(session?.user ?? null);
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signIn: AuthContextValue["signIn"] = async (params) => {
    await signInRequest(supabaseRef.current, params);
  };

  const signUp: AuthContextValue["signUp"] = async (params) => {
    await signUpRequest(supabaseRef.current, params);
  };

  const signOut: AuthContextValue["signOut"] = async () => {
    await signOutRequest(supabaseRef.current);
  };

  const refreshProfile: AuthContextValue["refreshProfile"] = async () => {
    const supabase = supabaseRef.current;
    const { data } = await supabase.auth.getSession();
    const authUser = data.session?.user ?? null;

    if (!authUser) {
      setUser(null);
      return;
    }

    const profile = await getProfileById(supabase, authUser.id);
    setUser({ id: authUser.id, name: profile?.username ?? "JUGADOR" });
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
