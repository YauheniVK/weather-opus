# WeatherOpus — Premium Weather & Currency Dashboard

A full-stack Next.js 14+ application with real-time weather forecasts, NBRB currency exchange rates, Google OAuth, Supabase database, Stripe payments, and an admin panel.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Auth | NextAuth.js v4 (Google OAuth) |
| Database | Supabase (PostgreSQL) |
| Payments | Stripe Checkout |
| Styling | Tailwind CSS + shadcn/ui |
| Icons | Lucide React |
| Charts | Recharts |
| Notifications | Sonner |

## Features

- **Real-time Weather** — OpenWeatherMap API: current conditions + 5–7 day forecast
- **Currency Exchange** — Official NBRB daily rates + built-in converter
- **Google OAuth** — Secure sign-in with NextAuth.js
- **Supabase DB** — User profiles, subscription status, role management
- **Stripe Payments** — Monthly & annual Premium subscriptions + webhook handling
- **Admin Panel** — User management, subscription control, block/unblock
- **Dark / Light Mode** — Persistent theme via next-themes
- **Responsive** — Mobile-first design

## Setup

### 1. Install dependencies

```bash
npm install
# or
yarn / pnpm / bun install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...          # openssl rand -base64 32

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

OPENWEATHER_API_KEY=...

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_MONTHLY_PRICE_ID=...
STRIPE_ANNUAL_PRICE_ID=...

ADMIN_EMAILS=your@email.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set up Supabase database

Run `supabase/schema.sql` in your Supabase SQL editor.

### 4. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create OAuth 2.0 credentials
3. Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI

### 5. Set up Stripe

1. Create products in [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Create two prices (monthly + annual) and copy their IDs
3. For webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

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
│   │   ├── auth/[...nextauth]/   # NextAuth handler
│   │   ├── weather/              # OpenWeatherMap proxy
│   │   ├── currency/             # NBRB currency proxy
│   │   ├── stripe/
│   │   │   ├── checkout/         # Stripe Checkout session
│   │   │   └── webhook/          # Stripe webhook handler
│   │   └── admin/users/          # Admin user management
│   ├── dashboard/                # Protected dashboard
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
│   └── layout/                   # Navbar
├── lib/
│   ├── auth.ts                   # NextAuth config
│   ├── supabase.ts               # Supabase client + helpers
│   ├── stripe.ts                 # Stripe client + helpers
│   └── utils.ts                  # Utility functions
├── types/
│   └── index.ts                  # TypeScript types
├── supabase/
│   └── schema.sql                # Database schema
└── middleware.ts                 # Route protection
```

## Admin Setup

After first sign-in, grant admin role by adding your email to `ADMIN_EMAILS` in `.env.local`.
The app will automatically grant admin role on next sign-in.

Or manually run:
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
3. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to your production domain
4. Update Google OAuth redirect URI to production URL
5. Create production Stripe webhook pointing to your Vercel URL
