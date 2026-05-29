import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "capturista" | "supervisor" | "consulta";

export interface AuthState {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  profile: { id: string; full_name: string; email: string; area_id: string | null } | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    roles: [],
    profile: null,
    loading: true,
  });

  const loadExtras = useCallback(async (user: User | null) => {
    if (!user) {
      setState((s) => ({ ...s, roles: [], profile: null, loading: false }));
      return;
    }
    try {
      const [rolesRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("id, full_name, email, area_id").eq("id", user.id).maybeSingle(),
      ]);
      setState((s) => ({
        ...s,
        roles: (rolesRes.data ?? []).map((r) => r.role as AppRole),
        profile: profileRes.data ?? null,
        loading: false,
      }));
    } catch (err) {
      console.error("loadExtras failed", err);
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((s) => ({ ...s, session, user: session?.user ?? null }));
      // Defer the extra fetches to avoid deadlocking the auth listener
      setTimeout(() => { void loadExtras(session?.user ?? null); }, 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((s) => ({ ...s, session, user: session?.user ?? null }));
      void loadExtras(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [loadExtras]);

  return {
    ...state,
    isAuthenticated: !!state.user,
    hasRole: (r: AppRole) => state.roles.includes(r),
    isAdmin: state.roles.includes("admin"),
    signOut: () => supabase.auth.signOut(),
    refresh: () => loadExtras(state.user),
  };
}
