# WeatherOpus — Premium Weather, Currency & Space Dashboard

A full-stack Next.js 14+ application with real-time weather forecasts, NBRB currency exchange rates, an interactive solar system map, Google OAuth via Supabase, Stripe payments, and an admin panel.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2.x (App Router, TypeScript) |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase (PostgreSQL) |
| Payments | Stripe Checkout + Webhooks |
| Styling | Tailwind CSS + shadcn/ui |
| Icons | Lucide React |
| Notifications | Sonner |

## Features

- **Real-time Weather** — OpenWeatherMap API: current conditions + 2/7-day forecast + map
- **Currency Exchange** — NBRB daily rates + cross-rates panel + built-in converter
- **Space Dashboard** — Interactive solar system SVG map (log/linear scale), Voyager tracker, solar activity (NASA DONKI), real ephemeris animation via NASA JPL Horizons
- **Google OAuth** — Secure sign-in via Supabase Auth
- **Supabase DB** — User profiles, subscription status, role management
- **Stripe Payments** — Premium & Elite tiers (monthly + annual), webhook handling
- **Admin Panel** — User management, subscription control, block/unblock
- **Dark / Light Mode** — Persistent theme via next-themes
- **Responsive** — Mobile-first design

## Subscription Tiers

| Feature | Free | Premium ($5.99/mo) | Elite ($19.99/mo) |
|---|:---:|:---:|:---:|
| Weather current + map | ✓ | ✓ | ✓ |
| 2-day forecast | ✓ | ✓ | ✓ |
| Currency rates (5 basic) | ✓ | ✓ | ✓ |
| 7-day forecast | — | ✓ | ✓ |
| 10 currencies + converter | — | ✓ | ✓ |
| Solar activity panel | — | ✓ | ✓ |
| Space: static mode | — | ✓ | ✓ |
| Space: animation + ephemeris | — | — | ✓ |
| APOD (photo of the day) | — | — | ✓ |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` with the following:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# OpenWeatherMap
OPENWEATHER_API_KEY=...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PREMIUM_MONTHLY_PRICE_ID=...
STRIPE_PREMIUM_ANNUAL_PRICE_ID=...
STRIPE_ELITE_MONTHLY_PRICE_ID=...
STRIPE_ELITE_ANNUAL_PRICE_ID=...

# App
ADMIN_EMAILS=your@email.com
NEXT_PUBLIC_APP_URL=http://localhost:3000

# NASA (optional — falls back to DEMO_KEY with 30 req/hour limit)
NASA_API_KEY=...
```

### 3. Set up Supabase database

Run `supabase/schema.sql` in your Supabase SQL editor.

### 4. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `http://localhost:3000/auth/callback`
4. In [Supabase Dashboard](https://supabase.com/dashboard) → Authentication → Providers → Google: paste Client ID & Secret
5. In Supabase → Authentication → URL Configuration: add `http://localhost:3000/auth/callback`

### 5. Set up Stripe

1. Create products in [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Create 4 prices (Premium monthly/annual, Elite monthly/annual) and copy their IDs to env vars
3. For local webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
weather-opus/
├── app/
│   ├── api/
│   │   ├── me/                   # Current user profile
│   │   ├── weather/              # OpenWeatherMap proxy
│   │   ├── currency/             # NBRB currency proxy
│   │   ├── horizons/             # NASA JPL Horizons proxy
│   │   ├── donki/                # NASA DONKI space weather proxy
│   │   ├── stripe/
│   │   │   ├── checkout/         # Stripe Checkout session
│   │   │   ├── webhook/          # Stripe webhook handler
│   │   │   └── sync/             # Post-checkout sync fallback
│   │   └── admin/users/          # Admin user management
│   ├── auth/callback/            # Supabase OAuth callback
│   ├── dashboard/                # Protected dashboard (weather/currency/space tabs)
│   ├── pricing/                  # Pricing page
│   ├── admin/                    # Admin panel (admin only)
│   ├── layout.tsx
│   ├── page.tsx                  # Landing/login page
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── weather/                  # Weather widgets
│   ├── currency/                 # Currency table + converter
│   ├── admin/                    # Admin users table
│   ├── layout/                   # Navbar
│   ├── SpaceDashboard.tsx        # Space tab container
│   ├── SolarSystemMap.tsx        # SVG solar system visualization
│   ├── VoyagerTracker.tsx        # Voyager 1 & 2 cards
│   ├── SolarActivity.tsx         # Solar flares + geomagnetic storm
│   ├── DataLoader.tsx            # NASA Horizons fetch UI
│   └── AnimationControls.tsx     # Playback controls
├── hooks/
│   ├── useAnimation.ts           # rAF animation loop
│   └── useSpaceData.ts           # Horizons data fetching
├── lib/
│   ├── auth-server.ts            # getServerProfile() — API auth guard
│   ├── supabase.ts               # Admin Supabase client + helpers
│   ├── supabase/client.ts        # Browser Supabase client
│   ├── supabase/server.ts        # Server Supabase client
│   ├── stripe.ts                 # Stripe client + tier helpers
│   ├── plans.ts                  # Client-safe plan config
│   ├── mockData.ts               # JPL reference positions + planet constants
│   ├── planetPositions.ts        # Keplerian formula + JPL correction
│   └── utils.ts                  # Tier logic + utilities
├── types/
│   ├── index.ts                  # App-wide TypeScript types
│   └── space.ts                  # Space dashboard types
├── supabase/
│   └── schema.sql                # Database schema
└── middleware.ts                 # Supabase SSR session refresh + route protection
```

## Admin Setup

Add your email to `ADMIN_EMAILS` in `.env.local`. Admin role is granted automatically on next sign-in.

Or manually:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

## Stripe Webhook (local dev)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

## Deployment

1. Deploy to Vercel (recommended)
2. Set all env vars in Vercel dashboard
3. Update `NEXT_PUBLIC_APP_URL` to your production domain
4. Update Google OAuth redirect URI + Supabase URL Configuration to production URL
5. Create production Stripe webhook pointing to your Vercel URL + `/api/stripe/webhook`
