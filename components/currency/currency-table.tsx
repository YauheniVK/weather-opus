"use client";

import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock } from "lucide-react";
import type { ProcessedRate } from "@/types";
import Link from "next/link";

interface CurrencyTableProps {
  rates: ProcessedRate[];
  date?: string;
  isLoading?: boolean;
  isPremium?: boolean;
}

const FREE_CURRENCIES = ["USD", "EUR", "PLN", "RUB", "CNY"];
const MAJOR_CURRENCIES = ["USD", "EUR", "RUB", "PLN", "GBP", "CHF", "CNY", "JPY", "CZK", "UAH"];

export function CurrencyTable({ rates, date, isLoading, isPremium }: CurrencyTableProps) {
  const allowedCodes = isPremium ? MAJOR_CURRENCIES : FREE_CURRENCIES;
  const displayRates = rates.filter((r) => allowedCodes.includes(r.code));

  if (isLoading) {
    return <CurrencyTableSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Exchange Rates — BYN
            </CardTitle>
            <CardDescription>
              National Bank of Belarus (NBRB) official daily rates
              {date && (
                <span className="ml-1">
                  · {format(new Date(date), "dd MMM yyyy")}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!isPremium && (
              <Link href="/pricing">
                <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                  <Lock className="h-3 w-3" /> More currencies
                </Button>
              </Link>
            )}
            <Badge variant="outline" className="text-xs">
              Live
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 pl-6">#</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Scale</TableHead>
              <TableHead className="text-right pr-6">Rate (BYN)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRates.map((rate, index) => (
              <TableRow key={rate.code} className="group">
                <TableCell className="pl-6 text-muted-foreground text-sm">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="text-xl" role="img" aria-label={rate.code}>
                      {rate.flag}
                    </span>
                    <div>
                      <p className="font-semibold text-sm">{rate.code}</p>
                      <p className="text-xs text-muted-foreground">{rate.nameEn}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {rate.scale}
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <span className="font-mono font-semibold text-sm">
                    {rate.rate.toFixed(4)}
                  </span>
                  <span className="ml-1 text-xs text-muted-foreground">BYN</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CurrencyTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-6 w-10 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-6 pb-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="ml-auto h-5 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
