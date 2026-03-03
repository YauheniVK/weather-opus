"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getActiveTier, type SubscriptionTier } from "@/lib/utils";
import type { UserProfile } from "@/types";

// ─── Context ──────────────────────────────────────────────────────────────────

interface ProfileContextValue {
  profile: UserProfile | null;
  loading: boolean;
  tier: SubscriptionTier;
  isPremium: boolean;
  isElite: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  loading: true,
  tier: "free",
  isPremium: false,
  isElite: false,
  isAdmin: false,
  signOut: async () => {},
  refresh: async () => {},
});

export function useProfile() {
  return useContext(ProfileContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function Providers({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      if (res.ok) {
        setProfile(await res.json());
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Fetch on mount
    fetchProfile();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchProfile();
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    window.location.href = "/";
  };

  const tier = getActiveTier(
    profile?.subscription_status ?? "free",
    profile?.subscription_end ?? null
  );
  const isPremium = tier !== "free";
  const isElite = tier === "elite";
  const isAdmin = profile?.role === "admin";

  return (
    <ProfileContext.Provider
      value={{ profile, loading, tier, isPremium, isElite, isAdmin, signOut, refresh: fetchProfile }}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster position="bottom-right" richColors closeButton theme="system" />
      </ThemeProvider>
    </ProfileContext.Provider>
  );
}
