"use client";

import { useState } from "react";
import { Calendar, ExternalLink, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { NASAApodData } from "@/types";

interface ApodCardProps {
  data: NASAApodData | null;
  isLoading: boolean;
  error: string | null;
}

const EXPLANATION_LIMIT = 400;

export function ApodCard({ data, isLoading, error }: ApodCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-32 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    );
  }

  if (!data) return null;

  const isLong = data.explanation.length > EXPLANATION_LIMIT;
  const displayedText =
    isLong && !expanded
      ? data.explanation.slice(0, EXPLANATION_LIMIT) + "…"
      : data.explanation;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <CardTitle className="text-lg leading-snug">{data.title}</CardTitle>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Calendar className="h-3.5 w-3.5" />
            {data.date}
          </div>
        </div>
        {data.copyright && (
          <p className="text-xs text-muted-foreground">© {data.copyright}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {data.media_type === "video" ? (
          <div className="relative w-full overflow-hidden rounded-xl bg-muted" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={data.url}
              title={data.title}
              className="absolute inset-0 h-full w-full"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.url}
              alt={data.title}
              className="w-full object-cover max-h-[520px]"
            />
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {displayedText}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Read more
                </>
              )}
            </button>
          )}
        </div>

        {data.media_type === "image" && data.hdurl && (
          <a
            href={data.hdurl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View HD Image
          </a>
        )}
      </CardContent>
    </Card>
  );
}
