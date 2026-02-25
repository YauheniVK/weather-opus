import { Suspense } from "react";
import { getAdminClient } from "@/lib/supabase";
import { AdminUsersTable } from "@/components/admin/users-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, Shield, Ban } from "lucide-react";

async function getStats() {
  const db = getAdminClient();
  const [total, premium, admins, blocked] = await Promise.all([
    db.from("profiles").select("*", { count: "exact", head: true }),
    db.from("profiles").select("*", { count: "exact", head: true }).eq("subscription_status", "premium"),
    db.from("profiles").select("*", { count: "exact", head: true }).eq("role", "admin"),
    db.from("profiles").select("*", { count: "exact", head: true }).eq("is_blocked", true),
  ]);
  return {
    total: total.count ?? 0,
    premium: premium.count ?? 0,
    admins: admins.count ?? 0,
    blocked: blocked.count ?? 0,
  };
}

export default async function AdminPage() {
  const stats = await getStats();

  const statCards = [
    { title: "Total Users",    value: stats.total,   icon: <Users  className="h-5 w-5 text-blue-400"   />, description: "All registered accounts"  },
    { title: "Premium Users",  value: stats.premium, icon: <Crown  className="h-5 w-5 text-amber-400"  />, description: "Active subscriptions"     },
    { title: "Admins",         value: stats.admins,  icon: <Shield className="h-5 w-5 text-orange-400" />, description: "Admin role accounts"       },
    { title: "Blocked",        value: stats.blocked, icon: <Ban    className="h-5 w-5 text-red-400"    />, description: "Suspended accounts"        },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-orange-400" />
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage users, subscriptions, and account status
          </p>
        </div>
        <Badge variant="outline" className="text-orange-400 border-orange-400/30">
          Admin Access
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">All Users</h2>
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading users...</div>}>
          <AdminUsersTable />
        </Suspense>
      </div>
    </div>
  );
}
