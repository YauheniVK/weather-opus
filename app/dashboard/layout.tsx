import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 container px-4 py-6 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
