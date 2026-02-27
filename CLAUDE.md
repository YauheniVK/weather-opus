# WeatherOpus — Project Guide for Claude

## What is this project?

Full-stack Next.js 14+ web application with multiple feature modules:
- **Weather** — current conditions + forecast (OpenWeatherMap API)
- **Currency** — NBRB exchange rates with cross-rates panel
- **Space Dashboard** — Solar system map, Voyager tracker, Solar activity (NASA JPL Horizons)
- **Auth** — Supabase Google OAuth
- **Payments** — Stripe subscriptions (monthly/annual)
- **Admin panel** — user management

---

## Tech Stack

- **Framework**: Next.js 14.2.x, App Router, TypeScript
- **Auth**: Supabase Auth (Google OAuth), `@supabase/ssr`
- **Database**: Supabase (PostgreSQL), single `profiles` table
- **Payments**: Stripe Checkout + Webhooks
- **UI**: Tailwind CSS + shadcn/ui components, next-themes, lucide-react, sonner
- **APIs**: OpenWeatherMap, NBRB, NASA JPL Horizons

---

## Key Architectural Rules

- **DO NOT use `experimental.serverComponentsExternalPackages`** in next.config.js — breaks Next.js 14.2.x
- Auth is **Supabase only** — NextAuth is fully removed
- `lib/auth-server.ts` → `getServerProfile()` used in all API routes as auth guard
- `lib/plans.ts` is client-safe (no server-only imports)
- `lib/stripe.ts` is server-only
- Weather and currency APIs are proxied through Next.js API routes (never called client-side)

---

## Free vs Premium

| Feature | Free | Premium |
|---|---|---|
| Weather forecast | 2 days | 7 days |
| Currency rates | 5 currencies | 10 currencies |
| Cross-rates panel | Blurred | Full access |
| Space dashboard | Full access | Full access |

---

## Space Dashboard — Architecture

### Files

| File | Role |
|---|---|
| `components/SpaceDashboard.tsx` | Main container, CSS starfield, phase state machine, Earth info block |
| `components/SolarSystemMap.tsx` | SVG solar system visualization |
| `components/VoyagerTracker.tsx` | Voyager 1 & 2 live distance/speed cards |
| `components/SolarActivity.tsx` | Solar flares + geomagnetic storm panel |
| `components/DataLoader.tsx` | NASA JPL Horizons data fetch UI (terminal-style) |
| `components/AnimationControls.tsx` | Playback controls for real-data animation |
| `hooks/useAnimation.ts` | rAF animation loop, interpolation, seek |
| `hooks/useSpaceData.ts` | Data fetching hook |
| `app/api/horizons/route.ts` | Server-side NASA JPL Horizons proxy |
| `lib/mockData.ts` | JPL reference positions (2026-02-27), planet constants |
| `lib/planetPositions.ts` | Keplerian formula + JPL correction for planet angles |
| `types/space.ts` | SpaceDataset, SpacePoint, Planet, Voyager types |

### Dashboard Phases (state machine)

```
idle → loading → ready → playing
```
- **idle**: DataLoader form shown
- **loading**: Terminal output shown (fetching from NASA)
- **ready**: Play button visible
- **playing**: Full animation UI, real NASA data drives positions

### Modes (non-playing)

- **Статика** — positions fixed at today's date (JPL-corrected Keplerian formula)
- **Анимация** — CSS SVG animation, planets orbit in real-time visual loop
- **По дате** — user picks a date, positions computed for that date

---

## SolarSystemMap — Visual Details

### SVG constants
```
CX=400, CY=400 (center)
SVG_SIZE=800, SVG_H=920 (taller than wide — Voyagers fit below orbital plane)
MIN_R=30, MAX_R=320 (orbit ring range in px)
```

### Scale modes
- **Log** (default): logarithmic orbit spacing, all planets visible
- **Linear**: true proportional spacing; panel in bottom-left controls which objects are visible

### Size modes (top-left toggle)
- **×1** — tiny dots, precise
- **×5** — medium (default)
- **×20** — large, decorative

### Linear scale chain
Objects determine the scale (outermost visible = fills VOYAGER_R=355px):
`Heliopause (120 AU) → TermShock (85 AU) → Neptune → Uranus → Saturn → Jupiter → Mars`

Special rules:
- Voyagers + Heliopause are **visual-only** — toggling them does NOT change scale
- Only TermShock and below actually drive scale changes
- If Heliopause+TermShock OFF but Voyagers ON → scale stays at 120 AU

### Cosmetic layers (bottom-right panel, log mode)
- Зонды (Voyagers)
- Сезоны (season sector lines + labels outside Neptune orbit, r=375)
- Новый год
- Весеннее равноденствие

### Season labels
Positioned at r=375 (outside Neptune orbit), with 4° angular offset from boundary line. "Лето" has manual dx=-8, dy=10 fine-tune.

### Stars (CSS, not SVG)
Stars are **CSS `box-shadow`** on `.space-starfield::before` in SpaceDashboard.tsx — NOT SVG elements inside SolarSystemMap. All 220 stars are 1px dots (0 spread) with opacity 0.18–0.43. Do NOT try to edit stars in SolarSystemMap.tsx.

---

## NASA JPL Horizons Integration

### API endpoint
`GET /api/horizons?bodies=199,299,...&start=YYYY-MM-DD&end=YYYY-MM-DD&step=1d`

Fetches from `https://ssd.jpl.nasa.gov/api/horizons.api` server-side.

### Bodies
| ID | Body |
|---|---|
| 199 | Mercury |
| 299 | Venus |
| 399 | Earth |
| 499 | Mars |
| 599 | Jupiter |
| 699 | Saturn |
| 799 | Uranus |
| 899 | Neptune |
| Voyager_1 | Voyager 1 |
| Voyager_2 | Voyager 2 |

### SpacePoint fields
```ts
{ date, x, y, z, distance, angle, distanceKm, speedKms, signalMinutes, signalHMS }
```
- `angle` = heliocentric ecliptic longitude (degrees)
- `distance` = AU from Sun
- `signalHMS` = light travel time from Earth formatted as H:MM:SS

### useAnimation hook
- rAF loop, `dayRef` (float) drives sub-frame interpolation between daily snapshots
- Linear interpolation on shorter arc for `angle` (handles 0/360 wrap)
- `currentPositions: Map<string, SpacePoint>` keyed by body ID, Russian name, and English name
- Default speed: 365 days/second

### JPL reference epoch
All static/animate modes start from verified JPL positions on **2026-02-27**:
```
Mercury 123.60°, Venus 7.32°, Earth 158.04°, Mars 318.82°
Jupiter 113.66°, Saturn 3.47°, Uranus 60.19°, Neptune 1.34°
Voyager 1: 256.72° @ 169.811 AU
Voyager 2: 290.68° @ 142.209 AU
```

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENWEATHER_API_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_MONTHLY_PRICE_ID
STRIPE_ANNUAL_PRICE_ID
ADMIN_EMAILS
NEXT_PUBLIC_APP_URL
```

---

## Known Pitfalls

- **Stale .next cache**: after `npm run build`, dev server may fail with `Cannot find module './NNN.js'`. Fix: `rm -rf .next`, restart dev.
- **Multiple ports**: old node processes linger. Kill via PowerShell: `Stop-Process -Id <PID> -Force`.
- **`GET /dashboard 500` in dev logs** — harmless, caused by middleware redirect + Next.js SSR ErrorBoundary. Browser users are unaffected.
- **CSS stars vs SVG stars**: the visible starfield is CSS box-shadow in SpaceDashboard.tsx, not SVG circles in SolarSystemMap.tsx. The SVG also has STAR_DATA but those are sub-pixel and barely visible.
- **`isActivePremium`**: `subscription_end = null` means admin-granted premium with no expiry → treated as ACTIVE.
