import Link from "next/link";
import { CloudSun, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-6 shadow-lg shadow-blue-500/30">
        <CloudSun className="h-9 w-9 text-white" />
      </div>
      <h1 className="text-6xl font-bold mb-2">404</h1>
      <h2 className="text-xl font-semibold mb-3">Page Not Found</h2>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Looks like this page drifted away. Let&apos;s get you back on track.
      </p>
      <Button asChild variant="gradient">
        <Link href="/dashboard">
          <Home className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}
