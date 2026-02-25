import { NextRequest, NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth-server";
import { getAdminClient } from "@/lib/supabase";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getServerProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const allowed = ["role", "subscription_status", "subscription_start", "subscription_end", "is_blocked"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }
  updates.updated_at = new Date().toISOString();

  const db = getAdminClient();
  const { data, error } = await db.from("profiles").update(updates).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  return NextResponse.json(data);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getServerProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getAdminClient();
  const { data, error } = await db.from("profiles").select("*").eq("id", params.id).single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(data);
}
