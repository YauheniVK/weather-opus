import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByEmail } from "@/lib/supabase";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json(null, { status: 401 });
  }

  const profile = await getProfileByEmail(user.email);
  if (!profile) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json(profile);
}
