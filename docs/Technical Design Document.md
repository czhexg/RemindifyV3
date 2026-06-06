# Technical Design Document: Birthday Reminder App

## 1. Overview

This document details the technical implementation of the Birthday Reminder App as specified in the PRD. The system uses a serverless/BaaS architecture:

- **Frontend:** React SPA (Vite, Tailwind CSS, shadcn/ui) hosted on Vercel.
- **Backend:** Supabase (Auth, PostgreSQL, Edge Functions).
- **Scheduler:** cron-job.org calls a “cron-trigger” Edge Function every hour.
- **Notifications:** Single Telegram bot + single SMTP account.

The design prioritizes zero cost, scalability, security, and simplicity.

---

## 2. System Architecture

### 2.1 High‑Level Diagram (Detailed)

```
┌──────────────┐        ┌──────────────┐        ┌─────────────────────────────┐
│   User       │        │   Vercel     │        │        Supabase             │
│  Browser     │◄──────►│  React App   │◄──────►│  Auth (email/password)      │
│              │        │  (Vite)      │        │  Database (PostgreSQL)      │
│              │        └──────────────┘        │  Row‑Level Security         │
│              │                                 │  Edge Functions:            │
│  Telegram    │◄──────────────────────────────►│   - cron-trigger            │
│  Client      │   (Webhook, Bot API)            │   - telegram-webhook        │
└──────────────┘                                 └──────────┬──────────────────┘
                                                             │
┌──────────────┐       ┌──────────────┐                    │
│  SMTP Server │◄──────┤              │                    │
└──────────────┘       │  cron-job.org│───────────────────┘
                       │  (hourly ping)│
                       └──────────────┘
```

### 2.2 Component Interactions

1. **Authentication**
    - User signs up / logs in via Supabase Auth UI or custom React components using `supabase.auth.signUp/signIn`.
    - JWT is stored in the browser; `@supabase/supabase-js` client automatically attaches it to requests.

2. **Data Access (Frontend ↔ Supabase)**
    - All CRUD for birthdays, profile settings, and Telegram linking tokens is done **directly from the frontend** using the auto‑generated REST API (via `supabase.from('table').select/insert/update/delete`).
    - Row‑Level Security (RLS) policies enforce that users can only access their own rows.

3. **Telegram Linking Flow**
    - Frontend inserts a new `telegram_linking_tokens` row (RLS allows).
    - User sends `/start <token>` to the bot.
    - Telegram POSTs update to `telegram-webhook` Edge Function (HTTPS).
    - Edge Function reads the token, updates `profiles.telegram_chat_id`, marks token used.
    - Telegram Bot API sends confirmation back.

4. **Scheduled Notifications**
    - cron-job.org makes a GET/POST request to `cron-trigger` every hour, including a secret header.
    - Edge Function uses the Supabase **service_role key** (bypasses RLS) to query all users, birthdays, and `sent_notifications`.
    - For each user whose local time is 08:00‑08:59, compute target dates, send via Telegram and/or SMTP, and record in `sent_notifications`.

---

## 3. Technology Stack

| Layer          | Technology                                                          | Rationale                                        |
| -------------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| Frontend       | React 18, Vite, Tailwind CSS, shadcn/ui                             | Modern, fast, consistent UI, free Vercel hosting |
| Auth           | Supabase Auth (email/password)                                      | Free, built‑in, secure                           |
| Database       | PostgreSQL (via Supabase)                                           | ACID, RLS, free tier                             |
| API (client)   | `@supabase/supabase-js`                                             | Type‑safe, real‑time if needed, auto‑CRUD        |
| Edge Functions | Supabase Edge Functions (Deno)                                      | Serverless, globally distributed, free tier      |
| Scheduler      | cron-job.org                                                        | Free, reliable, no‑ops                           |
| Telegram SDK   | Direct HTTP calls from Edge Function                                | Simple, no library needed                        |
| SMTP Client    | Deno SMTP module (e.g., `smtp`)                                     | Lightweight                                      |
| Secrets        | Supabase Vault / Edge Function secrets                              | Secure at rest                                   |
| Monitoring     | Supabase logs, Vercel analytics (optional)                          | Free tier observability                          |
| Testing        | Jest + React Testing Library (frontend), Deno test (edge functions) | Standard, free                                   |

---

## 4. Detailed Data Model

All tables live in the `public` schema. `auth.users` is managed by Supabase.

### 4.1 `profiles`

| Column                   | Type                             | Description                                    |
| ------------------------ | -------------------------------- | ---------------------------------------------- |
| `id`                     | `uuid` (PK)                      | References `auth.users.id` (CASCADE delete)    |
| `telegram_chat_id`       | `bigint` (nullable)              | Telegram chat ID after linking                 |
| `notification_email`     | `text` (nullable)                | Override email; defaults to auth email if null |
| `days_before`            | `smallint` NOT NULL DEFAULT 3    | Days before birthday to notify                 |
| `timezone`               | `text` NOT NULL DEFAULT 'UTC'    | IANA timezone string                           |
| `email_notifications`    | `boolean` NOT NULL DEFAULT true  | Global email toggle                            |
| `telegram_notifications` | `boolean` NOT NULL DEFAULT false | Global Telegram toggle                         |
| `created_at`             | `timestamptz` DEFAULT now()      |                                                |

- **RLS:** `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`  
  Policy: `CREATE POLICY "Users can manage own profile" ON profiles USING (id = auth.uid());`

### 4.2 `birthdays`

| Column       | Type                                                      | Description                            |
| ------------ | --------------------------------------------------------- | -------------------------------------- |
| `id`         | `uuid` PK DEFAULT gen_random_uuid()                       |                                        |
| `user_id`    | `uuid` NOT NULL REFERENCES profiles(id) ON DELETE CASCADE | Owner                                  |
| `name`       | `text` NOT NULL                                           | Person's name                          |
| `month`      | `smallint` NOT NULL CHECK (month BETWEEN 1 AND 12)        |                                        |
| `day`        | `smallint` NOT NULL CHECK (day BETWEEN 1 AND 31)          | (Feb 29 allowed with special handling) |
| `created_at` | `timestamptz` DEFAULT now()                               |                                        |

- **RLS:** `CREATE POLICY "Users manage own birthdays" ON birthdays USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());`

### 4.3 `telegram_linking_tokens`

| Column       | Type                                                      | Description                  |
| ------------ | --------------------------------------------------------- | ---------------------------- |
| `id`         | `uuid` PK DEFAULT gen_random_uuid()                       | Token sent to user           |
| `user_id`    | `uuid` NOT NULL REFERENCES profiles(id) ON DELETE CASCADE |                              |
| `created_at` | `timestamptz` DEFAULT now()                               | Used for expiration (15 min) |
| `used_at`    | `timestamptz` (nullable)                                  | Set when claimed             |

- **RLS:** Users can INSERT and SELECT their own tokens.  
  Policy: `CREATE POLICY "Users can create and view own tokens" ON telegram_linking_tokens USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());`

### 4.4 `sent_notifications`

| Column        | Type                                                     | Description                                                     |
| ------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| `id`          | `uuid` PK DEFAULT gen_random_uuid()                      |                                                                 |
| `user_id`     | `uuid` NOT NULL REFERENCES profiles(id)                  |                                                                 |
| `birthday_id` | `uuid` NOT NULL REFERENCES birthdays(id)                 |                                                                 |
| `notify_date` | `date` NOT NULL                                          | The calendar date the reminder was meant for (e.g., 2026-01-02) |
| `channel`     | `text` NOT NULL CHECK (channel IN ('email', 'telegram')) |                                                                 |
| `sent_at`     | `timestamptz` DEFAULT now()                              |                                                                 |

- **Unique constraint:** `UNIQUE(user_id, birthday_id, notify_date, channel)` – prevents duplicate sends.
- **No direct user access** – this table is only written by the Edge Function using the service_role key. RLS is not needed, but we can disable public access entirely with a policy that denies all, or just not expose it in the API.

---

## 5. API & Service Details

### 5.1 Frontend → Supabase (Client API)

All requests use the Supabase JavaScript client. Examples:

- **Get birthdays:**  
  `const { data } = await supabase.from('birthdays').select('*').eq('user_id', user.id);`
- **Insert birthday:**  
  `await supabase.from('birthdays').insert({ user_id, name, month, day });`
- **Update profile:**  
  `await supabase.from('profiles').update({ timezone: 'Asia/Singapore' }).eq('id', user.id);`
- **Start Telegram linking:**
    ```js
    const { data: token } = await supabase
        .from("telegram_linking_tokens")
        .insert({ user_id: user.id })
        .select("id")
        .single();
    ```

The frontend manages state with React hooks (or a lightweight global store if needed). All data fetching respects RLS, ensuring security.

### 5.2 Edge Function: `cron-trigger`

**Endpoint:** `POST https://<project>.functions.supabase.co/cron-trigger`  
**Header:** `X-Cron-Secret: <CRON_SECRET>`  
**Body:** (none needed)

**Code skeleton:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

serve(async (req) => {
    // 1. Validate secret
    if (req.headers.get("X-Cron-Secret") !== Deno.env.get("CRON_SECRET")) {
        return new Response("Unauthorized", { status: 401 });
    }

    // 2. Create admin Supabase client (service_role)
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SECRET_KEY")!,
    );

    // 3. Get all users with notifications enabled and birthdays
    const { data: users } = await supabase
        .from("profiles")
        .select(
            `
    id,
    timezone,
    days_before,
    email_notifications,
    telegram_notifications,
    telegram_chat_id,
    notification_email,
    birthdays: birthdays(id, name, month, day)
  `,
        )
        .or("email_notifications.eq.true,telegram_notifications.eq.true");

    // 4. For each user, compute local time, filter those at hour 8
    const now = new Date();
    for (const user of users) {
        const localNow = getLocalTime(now, user.timezone);
        if (localNow.getHours() !== 8) continue;

        // Compute target date for each birthday
        const todayLocal = localNow.toISOString().split("T")[0]; // YYYY-MM-DD
        for (const bday of user.birthdays) {
            const target = computeTargetDate(
                bday.month,
                bday.day,
                user.days_before,
                localNow.getFullYear(),
            );
            if (!target || target !== todayLocal) continue;

            // Check if already sent
            // ... (query sent_notifications with unique key)
            // Send email and/or telegram if not yet sent
            // Insert into sent_notifications
        }
    }

    return new Response("OK", { status: 200 });
});
```

**Key helper functions:**

- `getLocalTime(utcDate, timezone)` – uses native `Intl.DateTimeFormat` (no extra library needed).
- `computeTargetDate(month, day, daysBefore, year)` – returns date string `YYYY-MM-DD`; handles month rollover, leap day Feb 29 (if non‑leap, treat as Feb 28).  
  Example logic:  
  `new Date(year, month-1, day)` then subtract `daysBefore` days, format as YYYY-MM-DD.

- **Sending Telegram message:** POST to `https://api.telegram.org/bot<TOKEN>/sendMessage` with `chat_id` and text.
- **Sending Email:** Use `SmtpClient` with SMTP credentials from environment.
- **Idempotency:** Use `supabase.from('sent_notifications').upsert(...)` or check before insert.

### 5.3 Edge Function: `telegram-webhook`

**Endpoint:** `POST https://<project>.functions.supabase.co/telegram-webhook`  
**Body:** Standard Telegram `Update` JSON.

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
    const body = await req.json();
    // Optional: validate Telegram secret token header

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SECRET_KEY")!,
    );

    if (body.message?.text?.startsWith("/start ")) {
        const token = body.message.text.split(" ")[1];
        if (!token) return new Response("Missing token", { status: 400 });

        const chatId = body.message.chat.id;

        // Find token
        const { data: linkToken } = await supabase
            .from("telegram_linking_tokens")
            .select("id, user_id, used_at, created_at")
            .eq("id", token)
            .single();

        if (!linkToken || linkToken.used_at) {
            // Send message "Invalid or already used"
            await sendTelegramMessage(
                chatId,
                "❌ Invalid or expired link token.",
            );
            return new Response("OK");
        }

        // Check expiration (15 min)
        const createdAt = new Date(linkToken.created_at);
        if (Date.now() - createdAt.getTime() > 15 * 60 * 1000) {
            await sendTelegramMessage(
                chatId,
                "⌛ Token expired. Please generate a new one.",
            );
            return new Response("OK");
        }

        // Update profile
        await supabase
            .from("profiles")
            .update({ telegram_chat_id: chatId })
            .eq("id", linkToken.user_id);
        // Mark token used
        await supabase
            .from("telegram_linking_tokens")
            .update({ used_at: new Date() })
            .eq("id", token);

        await sendTelegramMessage(
            chatId,
            "✅ Your account is now linked! You'll receive birthday reminders here.",
        );
    } else {
        // Any other message: prompt to use /start
        await sendTelegramMessage(
            body.message.chat.id,
            "Send /start <token> to link your account.",
        );
    }

    return new Response("OK", { status: 200 });
});

async function sendTelegramMessage(chatId: number, text: string) {
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
    });
}
```

**Webhook registration:** After deploying, set the webhook URL once:  
`https://api.telegram.org/bot<TOKEN>/setWebhook?url=<edge-function-url>`

### 5.4 Frontend Components & State

**Main Dependencies:** `react`, `react-dom`, `@supabase/supabase-js`, `tailwindcss`, `shadcn/ui` (Button, Input, Dialog, Card, etc.)

**Routing:** React Router v6 (lightweight) or simple conditional rendering. Proposed routes:

- `/` – Dashboard (requires auth)
- `/signin` – Login
- `/signup` – Sign up
- `/settings` – Profile & notifications

**Component Tree:**

```
App
├─ AuthProvider (context with session)
├─ ProtectedRoute (redirects to /signin if not logged in)
├─ Navbar (with user menu, sign out)
├─ Dashboard
│   ├─ UpcomingBirthdaysList
│   │   └─ BirthdayCard (name, date, days left, edit/delete buttons)
│   ├─ AddBirthdayButton → AddEditBirthdayDialog
│   └─ EmptyState (when no birthdays)
├─ Settings
│   ├─ NotificationSettingsForm
│   │   ├─ DaysBeforeInput
│   │   ├─ TimezoneSelect (searchable, maybe react-select or custom)
│   │   ├─ EmailToggle & CustomEmailInput
│   │   └─ TelegramToggle
│   └─ TelegramLinkingSection
│       ├─ StatusBadge (linked/unlinked)
│       └─ LinkButton → TokenDisplayDialog (copyable token + deep link)
└─ Footer (optional)
```

**State Management:**

- Use React Query (TanStack Query) for server state: birthdays, profile. This provides caching, background refetch, and optimistic updates.
- Alternatively, simple `useEffect` + `useState` if avoiding extra dependencies, but React Query is highly recommended for a clean architecture.

**Authentication Handling:**

- Supabase Auth listener sets session context.
- `AuthProvider` wraps the app; on mount it subscribes to `onAuthStateChange`.
- Login/Signup components use `supabase.auth.signInWithPassword` / `signUp`.
- Protected routes check session; if null, redirect to login.

**Telegram Linking UX:**

- Button “Link Telegram” inserts a token, then displays a dialog with the token and a deeplink: `tg://resolve?domain=YOUR_BOT&start=<token>` (or `https://t.me/YOUR_BOT?start=<token>`).
- The dialog also shows a “Copy token” button.
- After linking, the Telegram edge function updates the profile. The frontend can poll or provide a “Check Status” button, or simply rely on the user refreshing the settings page. (We can implement a real‑time subscription to `profiles` changes using Supabase Realtime, but that’s optional; manual refresh is fine.)

---

## 6. Security Details

- **Supabase RLS:** As described, every user‑owned table uses `auth.uid()`.
- **Edge Function Security:**
    - `cron-trigger` checks `X-Cron-Secret` against an environment secret.
    - `telegram-webhook` may validate a `X-Telegram-Bot-Api-Secret-Token` header to ensure requests originate from Telegram (optional but recommended).
- **Service Role Key:** Only stored in Edge Function environment (Supabase Vault). Never exposed to frontend.
- **SMTP & Telegram Tokens:** Also in environment secrets.
- **Token Expiry:** Telegram linking tokens expire after 15 minutes, preventing abuse.
- **Input Validation:**
    - Frontend: form validation (day/month ranges, email format).
    - Backend: Edge functions sanitize and validate inputs.
- **CORS:** Supabase handles CORS; Edge Functions can allow only the Vercel domain.

---

## 7. Deployment & Configuration

### 7.1 Supabase Project Setup

1. Create project on supabase.com (free tier).
2. Enable Email Auth provider (disable email confirmation for development, but keep in production).
3. Set up the SQL schema: run migration SQL to create tables, RLS policies, indexes, etc.
4. Store secrets: `TELEGRAM_BOT_TOKEN`, SMTP settings, `CRON_SECRET` in Vault or Edge Function secrets.
5. Deploy Edge Functions via Supabase CLI (`supabase functions deploy cron-trigger telegram-webhook`).
6. Register Telegram webhook (one‑time curl command).

### 7.2 Vercel Frontend

1. Push code to GitHub repo.
2. Import project into Vercel, set build command `vite build`, output directory `dist`.
3. Set environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (only anon key, safe for client).
4. Deploy.

### 7.3 cron-job.org

1. Create a job that calls `https://<project>.functions.supabase.co/cron-trigger` every 1 hour.
2. Add custom header `X-Cron-Secret` with the same secret.
3. Optionally set failure alerts.

---

## 8. Testing Strategy

| Type        | Scope                                                                 | Tools                            |
| ----------- | --------------------------------------------------------------------- | -------------------------------- |
| Unit Tests  | Utility functions (computeTargetDate, getLocalTime), React components | Jest, React Testing Library      |
| Integration | Edge Functions (local via Supabase CLI invoke)                        | Deno test, Supabase local        |
| E2E         | Signup, add birthday, receive notification (mock SMTP)                | Playwright or Cypress (optional) |
| Security    | RLS tests (attempt to access other user's data)                       | Supabase local, test scripts     |

- `computeTargetDate` logic is critical and should have thorough unit tests covering month boundaries, leap years, etc.
- Edge functions can be tested locally using `supabase functions serve` and a mock HTTP client.
- For notification delivery, mock the Telegram and SMTP calls.

---

## 9. Error Handling & Logging

- **Edge Functions:** Use `try/catch` and return meaningful HTTP status codes. Log errors to Supabase logs (via `console.error`).
- **Frontend:** Use error boundaries, toast notifications (e.g., `sonner` from shadcn) for user feedback.
- **Retry logic:** For email/Telegram sending failures in `cron-trigger`, log and continue; duplicate prevention ensures no double‑send if the function runs again. Future: implement a dead‑letter queue if needed.

---

## 10. Scalability & Free Tier Limits

- Supabase free: 500 MB DB, 2 GB transfer, 2 Edge Functions (we have 2), 500k invocations/month. For a few dozen users, well within limits.
- If approaching limits, upgrade to Pro ($25) or move cron to a dedicated lightweight service.
- Database: Index on `birthdays(user_id)`, `sent_notifications(user_id, birthday_id, notify_date, channel)`.
- Edge function execution time: Must be below the 10‑second wall timeout. For 1000 users, computing local time and sending messages can be fast if bulk‑query and parallelize where possible (e.g., use `Promise.all` for sending). Edge function should be efficient.
