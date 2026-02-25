import { NextResponse } from "next/server";
import { getServerProfile } from "@/lib/auth-server";
import type { CurrencyRate, ProcessedRate } from "@/types";

const NBRB_API = "https://www.nbrb.by/api/exrates/rates?periodicity=0";

const META: Record<string, { flag: string; nameEn: string }> = {
  USD: { flag: "🇺🇸", nameEn: "US Dollar" },
  EUR: { flag: "🇪🇺", nameEn: "Euro" },
  RUB: { flag: "🇷🇺", nameEn: "Russian Ruble" },
  PLN: { flag: "🇵🇱", nameEn: "Polish Złoty" },
  GBP: { flag: "🇬🇧", nameEn: "British Pound" },
  CHF: { flag: "🇨🇭", nameEn: "Swiss Franc" },
  CNY: { flag: "🇨🇳", nameEn: "Chinese Yuan" },
  JPY: { flag: "🇯🇵", nameEn: "Japanese Yen" },
  CZK: { flag: "🇨🇿", nameEn: "Czech Koruna" },
  UAH: { flag: "🇺🇦", nameEn: "Ukrainian Hryvnia" },
  SEK: { flag: "🇸🇪", nameEn: "Swedish Krona" },
  NOK: { flag: "🇳🇴", nameEn: "Norwegian Krone" },
  DKK: { flag: "🇩🇰", nameEn: "Danish Krone" },
  CAD: { flag: "🇨🇦", nameEn: "Canadian Dollar" },
  AUD: { flag: "🇦🇺", nameEn: "Australian Dollar" },
  KZT: { flag: "🇰🇿", nameEn: "Kazakhstani Tenge" },
  TRY: { flag: "🇹🇷", nameEn: "Turkish Lira" },
};

const PRIORITY = ["USD", "EUR", "RUB", "PLN", "GBP", "CHF", "CNY"];

export async function GET() {
  const profile = await getServerProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await fetch(NBRB_API, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`NBRB error: ${res.status}`);

    const raw: CurrencyRate[] = await res.json();

    const rates: ProcessedRate[] = raw
      .map((r) => ({
        code: r.Cur_Abbreviation,
        name: r.Cur_Name,
        nameEn: META[r.Cur_Abbreviation]?.nameEn ?? r.Cur_Name,
        scale: r.Cur_Scale,
        rate: r.Cur_OfficialRate,
        ratePerUnit: r.Cur_OfficialRate / r.Cur_Scale,
        flag: META[r.Cur_Abbreviation]?.flag ?? "🏳️",
      }))
      .sort((a, b) => {
        const ai = PRIORITY.indexOf(a.code);
        const bi = PRIORITY.indexOf(b.code);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.code.localeCompare(b.code);
      });

    return NextResponse.json({ rates, date: raw[0]?.Date ?? new Date().toISOString() });
  } catch (e) {
    console.error("Currency error:", e);
    return NextResponse.json({ error: "Failed to fetch currency rates" }, { status: 500 });
  }
}
