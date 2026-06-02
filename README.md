# 🎂 Remindify

Never forget a birthday again. Remindify sends you email and Telegram reminders so you always know when a friend or family member's birthday is coming up.

## Features

- **Birthday management** — Add, edit, and delete birthdays with name and date
- **Multiple notification channels** — Email, Telegram, or both
- **Configurable reminders** — Choose how many days in advance to be notified
- **Timezone-aware** — Reminders fire at 8 AM your local time
- **Multi-user** — Each account has their own private birthday list (Row-Level Security)
- **Zero cost** — Runs entirely on free tiers

## Tech Stack

| Layer         | Technology                                    |
| ------------- | --------------------------------------------- |
| Frontend      | React 19, Vite, Tailwind CSS, shadcn/ui       |
| Auth          | Supabase Auth (email/password)                |
| Database      | PostgreSQL (Supabase) with Row-Level Security |
| Backend       | Supabase Edge Functions (Deno)                |
| Scheduler     | cron-job.org (hourly trigger)                 |
| Notifications | Telegram Bot API + SMTP                       |
| Hosting       | Vercel (frontend), Supabase (backend)         |

## Architecture

```
Browser ──► Vercel (React SPA) ──► Supabase (Auth + DB + Edge Functions)
                                         │
Telegram ◄───────────────────────────────┤
Email    ◄── SMTP ───────────────────────┤
         ┌── cron-job.org (hourly) ──────┘
```

## Project Structure

```
├── frontend/                  # React SPA
│   └── src/
│       ├── components/        # UI components (auth, birthdays, layout, settings)
│       ├── hooks/             # React Query hooks (useAuth, useBirthdays, useProfile)
│       ├── lib/               # Supabase client, utilities
│       └── pages/             # Dashboard, SignIn, SignUp, Settings
├── supabase/
│   ├── functions/             # Edge Functions (Deno)
│   │   ├── cron-trigger/      # Hourly notification engine
│   │   ├── telegram-webhook/  # Telegram bot message handler
│   │   └── _utils/            # Shared helpers (date, messages, smtp, telegram)
│   └── migrations/            # Database schema, RLS, grants
└── docs/                      # PRD, TDD, Development Plan
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase`)
- A [Supabase](https://supabase.com) project
- A [Telegram Bot](https://t.me/BotFather) token
- A [cron-job.org](https://cron-job.org) account

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd Birthday-App
cd frontend && npm install

# 2. Configure environment
cp .env.example .env  # root — Supabase secrets
cd frontend
# Edit .env with your Supabase URL and publishable key

# 3. Set up database
cd ..
npx supabase link --project-ref <your-project-ref>
npx supabase db push

# 4. Deploy edge functions
npx supabase functions deploy cron-trigger --no-verify-jwt
npx supabase functions deploy telegram-webhook --no-verify-jwt

# 5. Register Telegram webhook
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<project>.supabase.co/functions/v1/telegram-webhook"

# 6. Start dev server
cd frontend && npm run dev
```

### Running Tests

```bash
# Edge function tests (Deno)
deno test supabase/functions/_utils/__tests__/

# Frontend tests (Vitest)
cd frontend && npm test
```

## Environment Variables

### Root `.env` (Edge Functions)

| Variable             | Description                                   |
| -------------------- | --------------------------------------------- |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather            |
| `CRON_SECRET`        | Shared secret for cron-job.org authentication |
| `SMTP_HOST`          | SMTP server hostname                          |
| `SMTP_PORT`          | SMTP port (usually 587)                       |
| `SMTP_USER`          | SMTP username                                 |
| `SMTP_PASS`          | SMTP password                                 |
| `FROM_EMAIL`         | Sender email address                          |

### Frontend `.env`

| Variable                        | Description                     |
| ------------------------------- | ------------------------------- |
| `VITE_SUPABASE_URL`             | Your Supabase project URL       |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |

## License

MIT
