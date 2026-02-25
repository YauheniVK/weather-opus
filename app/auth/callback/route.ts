import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertProfile } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(errorDescription ?? error)}`, origin)
    );
  }

  if (code) {
    const supabase = createClient();
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError && data.user?.email) {
      // Sync profile to our profiles table
      await upsertProfile(
        data.user.email,
        data.user.user_metadata?.full_name ??
          data.user.user_metadata?.name ??
          null,
        data.user.user_metadata?.avatar_url ??
          data.user.user_metadata?.picture ??
          null
      );

      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/?error=AuthFailed", origin));
}
