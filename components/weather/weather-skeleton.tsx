import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function WeatherSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-20 w-20 rounded-full" />
          </div>
          <Skeleton className="h-20 w-48 mb-6" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <Skeleton className="h-14 flex-1 rounded-lg" />
            <Skeleton className="h-14 flex-1 rounded-lg" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
