import { createClient } from "@/lib/supabase/server";
import { getProfileByEmail } from "@/lib/supabase";
import type { UserProfile } from "@/types";

/**
 * Returns the current user's profile from the DB.
 * Use this in API route handlers and Server Components.
 * Returns null if unauthenticated or profile not found.
 */
export async function getServerProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;
  return getProfileByEmail(user.email);
}
