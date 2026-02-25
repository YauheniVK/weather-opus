import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/types";

// ─── Lazy singleton ───────────────────────────────────────────────────────────
// Created on first use so missing env vars don't crash the module at load-time
// (e.g. when rendering the public landing page before a DB is configured).

let _admin: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
      );
    }
    _admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _admin;
}

// ─── Profile helpers ──────────────────────────────────────────────────────────

export async function upsertProfile(
  email: string,
  name: string | null,
  image: string | null
): Promise<UserProfile | null> {
  let db: SupabaseClient;
  try {
    db = getAdminClient();
  } catch {
    // DB not configured — skip silently during development
    return null;
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const isAdmin = adminEmails.includes(email);

  const { data, error } = await db
    .from("profiles")
    .upsert(
      { email, name, image, updated_at: new Date().toISOString() },
      { onConflict: "email", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) {
    console.error("Error upserting profile:", error);
    return null;
  }

  if (isAdmin && data.role !== "admin") {
    await db.from("profiles").update({ role: "admin" }).eq("email", email);
    return { ...data, role: "admin" } as UserProfile;
  }

  return data as UserProfile;
}

export async function getProfileByEmail(
  email: string
): Promise<UserProfile | null> {
  let db: SupabaseClient;
  try {
    db = getAdminClient();
  } catch {
    return null;
  }

  const { data: profile, error } = await db
    .from("profiles")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !profile) return null;

  // Overlay subscription data from the legacy User + Subscription tables
  try {
    const { data: user } = await db
      .from("User")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (user?.id) {
      const { data: sub } = await db
        .from("Subscription")
        .select("tier, stripeCustomerId, stripeSubscriptionId, stripeCurrentPeriodEnd, endDate")
        .eq("userId", user.id)
        .order("createdAt", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub) {
        return {
          ...profile,
          subscription_status: sub.tier === "PREMIUM" ? "premium" : "free",
          subscription_end: sub.stripeCurrentPeriodEnd ?? sub.endDate ?? profile.subscription_end,
          stripe_customer_id: sub.stripeCustomerId ?? profile.stripe_customer_id,
          stripe_subscription_id: sub.stripeSubscriptionId ?? profile.stripe_subscription_id,
        } as UserProfile;
      }
    }
  } catch {
    // Legacy tables not accessible — fall back to profiles data
  }

  return profile as UserProfile;
}

export async function updateProfile(
  email: string,
  updates: Partial<UserProfile>
): Promise<UserProfile | null> {
  const db = getAdminClient();
  const { data, error } = await db
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("email", email)
    .select()
    .single();
  if (error) {
    console.error("Error updating profile:", error);
    return null;
  }
  return data as UserProfile;
}

export async function updateProfileByStripeCustomer(
  stripeCustomerId: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const db = getAdminClient();
  const { error } = await db
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("stripe_customer_id", stripeCustomerId);
  if (error) console.error("Error updating profile by stripe customer:", error);
}

export async function getAllProfiles(
  page: number = 1,
  pageSize: number = 20,
  search?: string
) {
  const db = getAdminClient();
  let query = db
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (search) query = query.ilike("email", `%${search}%`);

  const { data, error, count } = await query;
  if (error) {
    console.error("Error fetching profiles:", error);
    return { data: [], total: 0 };
  }
  return { data: data as UserProfile[], total: count ?? 0 };
}

export async function getProfileById(id: string): Promise<UserProfile | null> {
  const db = getAdminClient();
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as UserProfile;
}
