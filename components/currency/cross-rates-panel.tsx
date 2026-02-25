"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles } from "lucide-react";
import { convertCurrency } from "@/lib/utils";
import type { ProcessedRate } from "@/types";
import Link from "next/link";

interface CrossRatesPanelProps {
  rates: ProcessedRate[];
  isPremium?: boolean;
}

// BYN pseudo-entry for cross-rate calculations
const BYN_ENTRY: ProcessedRate = {
  code: "BYN",
  name: "Беларускі рубль",
  nameEn: "Belarusian Ruble",
  scale: 1,
  rate: 1,
  ratePerUnit: 1,
  flag: "🇧🇾",
};

export function CrossRatesPanel({ rates, isPremium }: CrossRatesPanelProps) {
  const allRates = [BYN_ENTRY, ...rates];
  const [selected, setSelected] = useState(rates[0]?.code ?? "USD");

  const rateMap = Object.fromEntries(
    rates.map((r) => [r.code, { rate: r.rate, scale: r.scale }])
  );

  const otherRates = allRates.filter((r) => r.code !== selected);

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Cross Rates</CardTitle>
          {!isPremium && (
            <Badge variant="premium" className="gap-1 text-[10px]">
              <Lock className="h-2.5 w-2.5" />
              Premium
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Blurred content for free users */}
        <div className={!isPremium ? "blur-sm pointer-events-none select-none" : undefined}>
          {/* Currency selector buttons */}
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-2 min-w-max">
              {allRates.map((r) => (
                <Button
                  key={r.code}
                  size="sm"
                  variant={r.code === selected ? "default" : "outline"}
                  onClick={() => setSelected(r.code)}
                >
                  <span className="mr-1.5">{r.flag}</span>
                  {r.code}
                </Button>
              ))}
            </div>
          </div>

          {/* Cross-rates table */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left font-medium text-muted-foreground px-4 py-2.5">Currency</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-2.5">
                    1 {selected} =
                  </th>
                </tr>
              </thead>
              <tbody>
                {otherRates.map((r) => {
                  let crossRate: number;
                  try {
                    crossRate = convertCurrency(1, selected, r.code, rateMap);
                  } catch {
                    return null;
                  }
                  return (
                    <tr key={r.code} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{r.flag}</span>
                          <div>
                            <p className="font-semibold leading-tight">{r.code}</p>
                            <p className="text-xs text-muted-foreground">{r.nameEn}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-semibold">{crossRate.toFixed(4)}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">{r.code}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upgrade overlay for free users */}
        {!isPremium && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px]">
            <div className="rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-6 text-center mx-6">
              <Lock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Cross-currency rates</p>
              <p className="text-xs text-muted-foreground mb-4">
                Compare any currency against all others — available with Premium
              </p>
              <Link href="/pricing">
                <Button size="sm" variant="gradient" className="gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Upgrade to Premium
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
