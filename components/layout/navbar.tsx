"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CloudSun, LayoutDashboard, CreditCard, Shield,
  LogOut, ChevronDown, Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfile } from "@/components/providers";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { profile, isPremium, isAdmin, signOut, loading } = useProfile();
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/pricing",   label: "Pricing",   icon: CreditCard },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30">
            <CloudSun className="h-5 w-5 text-white" />
          </div>
          <span className="hidden font-bold text-lg sm:block">
            Weather<span className="text-blue-500">Opus</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button variant="ghost" size="sm" className={cn("gap-2", pathname === item.href && "bg-accent")}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin">
              <Button variant="ghost" size="sm" className={cn("gap-2 text-orange-500", pathname.startsWith("/admin") && "bg-orange-500/10")}>
                <Shield className="h-4 w-4" /> Admin
              </Button>
            </Link>
          )}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {!loading && profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile.image ?? ""} />
                    <AvatarFallback className="text-xs">
                      {profile.name?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                    {profile.name}
                  </span>
                  {isPremium && (
                    <Badge variant="premium" className="hidden sm:flex gap-1 text-[10px] px-1.5 py-0">
                      <Sparkles className="h-2.5 w-2.5" /> Pro
                    </Badge>
                  )}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium truncate">{profile.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Link>
                </DropdownMenuItem>
                {!isPremium && (
                  <DropdownMenuItem asChild>
                    <Link href="/pricing" className="text-blue-500">
                      <Sparkles className="mr-2 h-4 w-4" /> Upgrade to Premium
                    </Link>
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="text-orange-500">
                        <Shield className="mr-2 h-4 w-4" /> Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive cursor-pointer" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </header>
  );
}
