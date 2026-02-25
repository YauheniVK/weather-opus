import { NextRequest, NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth-server";
import { getAllProfiles } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const profile = await getServerProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "15", 10);
  const search = searchParams.get("search") ?? undefined;

  const { data, total } = await getAllProfiles(page, pageSize, search);

  return NextResponse.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}
