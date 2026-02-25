"use client";

import { useState, useCallback } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { convertCurrency } from "@/lib/utils";
import type { ProcessedRate } from "@/types";

interface CurrencyConverterProps {
  rates: ProcessedRate[];
}

const BYN_OPTION: ProcessedRate = {
  code: "BYN",
  name: "Беларускі рубль",
  nameEn: "Belarusian Ruble",
  scale: 1,
  rate: 1,
  ratePerUnit: 1,
  flag: "🇧🇾",
};

export function CurrencyConverter({ rates }: CurrencyConverterProps) {
  const [amount, setAmount] = useState("100");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("BYN");
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allCurrencies = [BYN_OPTION, ...rates];

  const rateMap = Object.fromEntries(
    rates.map((r) => [r.code, { rate: r.rate, scale: r.scale }])
  );

  const handleConvert = useCallback(() => {
    setError(null);
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      const converted = convertCurrency(num, fromCurrency, toCurrency, rateMap);
      setResult(converted);
    } catch (err) {
      setError("Conversion failed. Rate not available.");
    }
  }, [amount, fromCurrency, toCurrency, rateMap]);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setResult(null);
  };

  const fromInfo = allCurrencies.find((c) => c.code === fromCurrency);
  const toInfo = allCurrencies.find((c) => c.code === toCurrency);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Currency Converter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount */}
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setResult(null);
            }}
            placeholder="Enter amount..."
            className="text-lg font-mono"
          />
        </div>

        {/* Currency selectors */}
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label>From</Label>
            <Select
              value={fromCurrency}
              onValueChange={(v) => { setFromCurrency(v); setResult(null); }}
            >
              <SelectTrigger>
                <SelectValue>
                  {fromInfo && (
                    <span className="flex items-center gap-2">
                      <span>{fromInfo.flag}</span>
                      <span className="font-semibold">{fromInfo.code}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {allCurrencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="flex items-center gap-2">
                      <span>{c.flag}</span>
                      <span className="font-semibold">{c.code}</span>
                      <span className="text-muted-foreground text-xs">— {c.nameEn}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="mb-0 h-10 w-10 shrink-0"
            onClick={handleSwap}
            title="Swap currencies"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>

          <div className="flex-1 space-y-1.5">
            <Label>To</Label>
            <Select
              value={toCurrency}
              onValueChange={(v) => { setToCurrency(v); setResult(null); }}
            >
              <SelectTrigger>
                <SelectValue>
                  {toInfo && (
                    <span className="flex items-center gap-2">
                      <span>{toInfo.flag}</span>
                      <span className="font-semibold">{toInfo.code}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {allCurrencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="flex items-center gap-2">
                      <span>{c.flag}</span>
                      <span className="font-semibold">{c.code}</span>
                      <span className="text-muted-foreground text-xs">— {c.nameEn}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Convert button */}
        <Button onClick={handleConvert} className="w-full" variant="gradient">
          Convert
        </Button>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {/* Result */}
        {result !== null && !error && (
          <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              {amount} {fromCurrency} =
            </p>
            <p className="text-3xl font-bold font-mono text-blue-400">
              {result.toFixed(4)}
            </p>
            <p className="text-lg font-semibold text-muted-foreground">{toCurrency}</p>

            {/* Rate info */}
            {fromCurrency !== "BYN" && toCurrency !== "BYN" && (
              <p className="text-xs text-muted-foreground mt-2 opacity-70">
                via BYN exchange rate
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
