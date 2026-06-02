# Product Requirements Document: Birthday Reminder App

## 1. Introduction

**Purpose:** A web application that lets users store birthdays of friends and family and receive automatic reminders via email and/or Telegram. The app supports multiple user accounts and is designed to be scalable while remaining cost‑effective to run.

**Target Audience:** A small group of friends (a few dozen users) who want to avoid forgetting birthdays. The architecture will be built with scalability in mind so that it can later serve thousands without major rework.

**Core Experience:**

- Sign up with email & password (Supabase Auth).
- Add, edit, delete birthdays (name + date).
- Choose how many days in advance to be notified (default 3 days).
- Select notification channels: email, Telegram, or both.
- Receive a friendly reminder at 8:00 AM local time on the chosen day(s).
- Telegram users link their account by messaging a shared bot.
- No manual token entry required—a one‑time linking flow.

---

## 2. Goals

1. **Reliable daily reminders** – alerts fire at the correct local time for each user, without duplicates.
2. **Simple onboarding** – email/password sign‑up, intuitive birthday management, effortless Telegram linking.
3. **Cost‑minimal operation** – free tier of modern cloud services (Vercel, Supabase, cron‑job.org).
4. **Multi‑user ready** – row‑level security ensures data isolation.
5. **Scalable architecture** – serverless backend (BaaS) that can grow without a traditional monolithic server.

---

## 3. User Stories

| ID    | Role               | Story                                                                   | Acceptance Criteria                                             |
| ----- | ------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| US‑1  | New user           | Sign up with email & password                                           | Verified email, logged into the app                             |
| US‑2  | Authenticated user | Add a birthday with name and date                                       | Birthday appears in list, date stored correctly                 |
| US‑3  | Authenticated user | Edit or delete an existing birthday                                     | Changes persist immediately                                     |
| US‑4  | Authenticated user | Choose notification channels (email, Telegram, or both)                 | Settings saved; future reminders use chosen channels            |
| US‑5  | Authenticated user | Set how many days before the birthday to be reminded                    | Field accepts integer, defaults to 3                            |
| US‑6  | Authenticated user | Set my timezone                                                         | Next reminder respects that timezone                            |
| US‑7  | Authenticated user | Link my Telegram account by messaging the bot                           | Receive a confirmation in Telegram after sending a unique token |
| US‑8  | System             | Send email reminder on the scheduled day at 8 AM local time             | Email delivered to user’s configured address                    |
| US‑9  | System             | Send Telegram reminder on the scheduled day at 8 AM local time          | Message delivered to the linked Telegram chat                   |
| US‑10 | System             | Avoid sending duplicate reminders for the same birthday on the same day | Database record prevents re‑send                                |

---

## 4. Functional Requirements

### 4.1 User Authentication

- Use **Supabase Auth** with email/password.
- Email verification required before the account can log in (Supabase default).
- Passwords stored and validated by Supabase; no custom auth logic.

### 4.2 Birthday Management (CRUD)

- Each birthday belongs to one user.
- Fields: `name` (string), `month` (integer 1‑12), `day` (integer 1‑31).  
  _Note: Leap day (Feb 29) is accepted; the system will treat it as Feb 29 only in leap years, otherwise skip or handle gracefully._
- Users can create, update, and delete their own birthdays.
- No import/export required in the initial version.

### 4.3 User Notification Settings

- **Default days before:** 3 (configurable, min 0 = day of birthday, max 30).
- **Notification channels:**
    - Email (on/off)
    - Telegram (on/off)  
      Both can be enabled simultaneously.
- **Timezone:** IANA string (e.g., `America/New_York`). Defaults to `UTC` until user sets it.
- **Custom email address** for notifications (optional, falls back to auth email if blank).
- **Telegram chat ID** – automatically captured during the linking flow (user does not enter it manually).

### 4.4 Telegram Bot Integration

- A single Telegram bot (owned by the app admin) serves all users.
- Bot token is stored as an environment secret (`TELEGRAM_BOT_TOKEN`).
- **Linking flow:**
    1. User sees a “Link Telegram” button in the app.
    2. App generates a unique one‑time token (UUID) and displays it with instructions: “Send `/start <token>` to @YourBotName”.
    3. User opens Telegram, starts a chat with the bot, and sends the command.
    4. Bot webhook receives the message, validates the token, and saves the sender’s `chat_id` to the user’s settings.
    5. Token is marked as used/deleted; user receives a success message in Telegram.
- No manual bot token or chat ID input required from users.

### 4.5 Email Notification Delivery

- A single SMTP account (e.g., Gmail, SendGrid, Mailgun) is configured for the whole app.
- Credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`) are stored as secrets.
- When an email reminder is triggered, the system sends a personalised email to the user’s notification address.

### 4.6 Reminder Timing & Logic

- The system must evaluate each user’s local time every hour (see Architecture).
- For a given birthday **B** (month/day) and user’s **days_before** setting **D**:
    - Calculate the “target date” in the current year: `B + D days before` (taking month wraparound into account).
    - If today’s date (in the user’s timezone) equals the target date, and the hour is **8:00‑8:59**, send the reminder.
- **Example:** User has days_before=3, timezone=America/New_York, birthday Jan 5.  
  Target date = Jan 2. On Jan 2 between 8:00‑8:59 AM Eastern, a reminder fires.
- A `sent_notifications` table prevents duplicate sends for the same (user, birthday, target_date) combination.
- Reminders for the same birthday fire once per year (until next year’s target date).

---

## 5. Non‑Functional Requirements

| Quality             | Requirement                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scalability**     | Architecture supports 10 → 10,000 users without code changes. Supabase scales horizontally; frontend is static.                                         |
| **Security**        | Row‑Level Security (RLS) on all user‑owned tables. Environment secrets for all third‑party credentials. Webhook endpoints protected by a shared secret. |
| **Reliability**     | Cron trigger is monitored by cron‑job.org; edge function is idempotent. Email delivery uses a reliable SMTP relay.                                      |
| **Maintainability** | Clear separation of concerns: Auth (Supabase), Data (PostgreSQL with RLS), Business logic (Edge Functions), Frontend (React).                           |
| **Cost**            | Must run entirely on free tiers with room for growth. Current cost estimate: $0/month.                                                                  |
| **Usability**       | Modern, responsive UI with shadcn/ui + Tailwind CSS. Smooth Telegram linking flow.                                                                      |

---

## 6. System Architecture

### High‑level diagram

```
[User Browser] ──> [Vercel (React App)] ──> [Supabase (Auth + DB + Edge Functions)]
                                              │
                         (Telegram Webhook) ──┘  (Scheduler)
                         [Telegram API] <──      [cron-job.org]
                         [SMTP Server]   <──
```

### Components

| Component                 | Technology                                                         | Role                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**              | React (Vite) + Tailwind CSS + shadcn/ui                            | SPA hosted on Vercel (free tier). Interacts with Supabase directly via `@supabase/supabase-js`.                              |
| **Auth**                  | Supabase Auth (email/password)                                     | Manages sign‑up, login, sessions.                                                                                            |
| **Database**              | Supabase PostgreSQL (free tier)                                    | Stores birthdays, user settings, Telegram tokens, sent notification log.                                                     |
| **Row‑Level Security**    | PostgreSQL RLS policies                                            | Each user can only read/write their own data.                                                                                |
| **Edge Functions** (Deno) | Supabase Edge Functions (free tier: 500k invocations, 2 functions) | Three functions: `cron-trigger` (hourly), `telegram-webhook` (Telegram incoming messages), `link-telegram` (generate token). |
| **Scheduler**             | cron-job.org (free tier, 5‑min minimum interval)                   | Calls the `cron-trigger` edge function every hour.                                                                           |
| **Telegram Bot**          | Single bot, token stored in Supabase secrets                       | Listens via webhook → `telegram-webhook`. Sends reminders via Telegram Bot API.                                              |
| **SMTP Client**           | Deno SMTP library (e.g., `smtp_client`) used in edge function      | Sends email reminders through the configured SMTP server.                                                                    |
| **Secrets**               | Supabase Vault / environment variables                             | `TELEGRAM_BOT_TOKEN`, SMTP credentials, `CRON_SECRET` for webhook auth.                                                      |

### Why this architecture?

- **Fully serverless / BaaS** – no container to manage, scales with usage.
- **Costs stay zero** for the expected user count.
- **Telegram webhook** runs as an edge function, avoiding a dedicated server.
- **RLS eliminates** the need to write backend CRUD endpoints—the frontend talks directly to Supabase’s auto‑generated REST API.
- **Hourly cron** catches every timezone without per‑user scheduled jobs.

---

## 7. Data Model

### 7.1 `profiles` (extends `auth.users`)

| Column                   | Type      | Description                                                          |
| ------------------------ | --------- | -------------------------------------------------------------------- |
| `id`                     | uuid (PK) | References `auth.users.id`                                           |
| `telegram_chat_id`       | bigint?   | Set after linking                                                    |
| `notification_email`     | text?     | Override for email reminders; defaults to `auth.users.email` if null |
| `days_before`            | smallint  | Default 3                                                            |
| `timezone`               | text      | IANA timezone string, default 'UTC'                                  |
| `email_notifications`    | boolean   | Default true                                                         |
| `telegram_notifications` | boolean   | Default false                                                        |

### 7.2 `birthdays`

| Column       | Type        | Description        |
| ------------ | ----------- | ------------------ |
| `id`         | uuid (PK)   | Auto‑generated     |
| `user_id`    | uuid (FK)   | Owner              |
| `name`       | text        | Name of the person |
| `month`      | smallint    | 1–12               |
| `day`        | smallint    | 1–31               |
| `created_at` | timestamptz |                    |

### 7.3 `telegram_linking_tokens`

| Column       | Type         | Description                              |
| ------------ | ------------ | ---------------------------------------- |
| `id`         | uuid (PK)    | Token sent to user                       |
| `user_id`    | uuid         | Owner who requested linking              |
| `created_at` | timestamptz  | Auto‑expired after 15 minutes (optional) |
| `used_at`    | timestamptz? | Null until claimed                       |

### 7.4 `sent_notifications`

| Column        | Type        | Description                                                           |
| ------------- | ----------- | --------------------------------------------------------------------- |
| `id`          | uuid        | Primary key                                                           |
| `user_id`     | uuid        | Who received the notification                                         |
| `birthday_id` | uuid        | Which birthday                                                        |
| `notify_date` | date        | The actual calendar date the reminder was sent for (e.g., 2026‑01‑02) |
| `channel`     | text        | 'email' or 'telegram'                                                 |
| `sent_at`     | timestamptz | Timestamp of sending                                                  |

Unique constraint on `(user_id, birthday_id, notify_date, channel)` to guarantee idempotency.

### RLS Policies (simplified)

- `profiles`: SELECT/UPDATE for authenticated user where `id = auth.uid()`.
- `birthdays`: Full CRUD for user where `user_id = auth.uid()`.
- `telegram_linking_tokens`: SELECT/INSERT for user where `user_id = auth.uid()`.
- `sent_notifications`: INSERT allowed for authenticated user (edge function uses service role key, bypasses RLS).

---

## 8. API Design (Edge Functions)

### 8.1 `cron-trigger` (hourly invocation)

- **URL:** `https://<project>.functions.supabase.co/cron-trigger`
- **Method:** GET/POST (cron‑job.org calls it with a secret header)
- **Auth:** Header `X-Cron-Secret` must match a stored secret.
- **Logic:**
    1. Query `profiles` joined with `birthdays` where notifications are enabled and appropriate.
    2. For each user, compute the current local date/time using their timezone.
    3. If local hour is 8, for each birthday compute the target notification date (birthday month/day minus `days_before` in the current year, handling year rollover).
    4. Check `sent_notifications` for each (user, birthday, target_date, channel).
    5. For missing entries, send reminder via Telegram and/or email using the respective bot API/SMTP.
    6. Insert row into `sent_notifications`.
- **Important:** Runs inside a Deno edge function; uses Supabase Admin client (`service_role` key) to bypass RLS.

### 8.2 `telegram-webhook`

- **URL:** `https://<project>.functions.supabase.co/telegram-webhook`
- **Method:** POST (called by Telegram)
- **Body:** Standard Telegram update JSON.
- **Logic:**
    - If the message text matches `/start <token>`:
        - Look up `telegram_linking_tokens` by token and check not used/expired.
        - Update `profiles.telegram_chat_id` for that user with the message’s `chat.id`.
        - Mark token as used.
        - Reply to the user in Telegram: “Your account is now linked! 🎉”
- **Auth:** Validates that the request comes from Telegram (optional but recommended via token verification).

### 8.3 `link-telegram` (optional, can be done via frontend RPC)

- Actually, token generation can be a database function or a simple frontend insert (with RLS) into `telegram_linking_tokens`. No dedicated edge function needed; the frontend directly inserts a new token.

---

## 9. Frontend Design

### Tech Stack

- React 18+ with Vite
- Tailwind CSS for utility‑first styling
- shadcn/ui (Radix primitives + Tailwind) for consistent, accessible components
- `@supabase/supabase-js` for client‑side data operations

### Key Screens

1. **Sign Up / Login** – Email and password form; link to switch between both.
2. **Dashboard** – List of upcoming birthdays sorted by next occurrence. Card for each birthday with name, date, and days remaining.
3. **Add/Edit Birthday** – Modal or page with name, month, day fields (nice date picker).
4. **Settings** – Notification preferences:
    - Days before (number input)
    - Timezone (select dropdown, searchable)
    - Email notifications toggle, custom email field (optional)
    - Telegram notifications toggle + “Link Telegram” button (shows token and instructions; status “Linked” or “Not Linked”)
5. **Telegram Linking Instructions** – Simple copy‑able token and deep‑link to Telegram bot.

### UI/UX Principles

- Clean, modern, mobile‑responsive.
- Friendly tone in empty states (e.g., “Add your first birthday 🎂”).
- Visual feedback for notification preferences (green dot when linked, etc.).

---

## 10. Notification Scheduler Detail

- **cron-job.org** pings the `cron-trigger` edge function **every hour** (e.g., at minute 0).
- The edge function:
    1. Fetches all users who have at least one birthday and enabled notifications.
    2. Converts `now()` to each user’s timezone.
    3. If user’s local time hour is **08**, proceed.
    4. For each birthday, compute target notification date in current year:
        - Start with `date(current_year, month, day)`.
        - Subtract `days_before` days.
        - If the resulting date is before the current local date, it means the birthday already passed; skip.
        - If the resulting date equals the current local date, it’s time to notify.
    5. For each channel (`email`, `telegram`) that is enabled and not yet sent (`sent_notifications` check), send the reminder.
    6. Record the successful send in `sent_notifications`.

- **Example:** User timezone `Asia/Singapore`, `days_before=1`, birthday June 5.  
  Target date = June 4. On June 4, 08:00‑08:59 SGT, notification fires.

- **Leap Day handling:** Birthday Feb 29 will target Feb 28 on non‑leap years (or a configurable rule). For simplicity, the code will clamp to the last day of February.

---

## 11. Security Considerations

- **Secrets:** All tokens, SMTP passwords, and `CRON_SECRET` are stored in Supabase Vault/Edge Function secrets, never in client code.
- **RLS:** Every table containing user data enforces `auth.uid()` ownership.
- **Edge Function Protection:** `cron-trigger` requires a secret header known only to cron-job.org.
- **Telegram Webhook:** Validates incoming requests (optional but recommended: compare `X-Telegram-Bot-Api-Secret-Token` header if set).
- **Input Validation:** Frontend and edge functions validate all inputs (month/day ranges, email format, etc.).
- **Rate Limiting:** Supabase free tier includes rate limiting on auth and API. Telegram Bot API also applies limits.

---

## 12. Deployment & Costs

| Service      | Plan                                                         | Monthly Cost | Notes                                                        |
| ------------ | ------------------------------------------------------------ | ------------ | ------------------------------------------------------------ |
| Vercel       | Hobby                                                        | $0           | Static React app, custom domain optional                     |
| Supabase     | Free                                                         | $0           | 500 MB DB, 2 GB transfer, 2 Edge Functions, 500k invocations |
| cron-job.org | Free                                                         | $0           | 5 cron jobs, min 5‑min interval (we use 1‑hour)              |
| Telegram Bot | N/A                                                          | $0           | Bot API is free                                              |
| SMTP         | Any free SMTP relay (e.g., Gmail, Brevo free 300 emails/day) | $0           | Within limits                                                |

**Total Cost:** $0/month.

**Scalability note:** If free tier limits are approached (e.g., >500k edge function calls), upgrading Supabase to Pro ($25/month) lifts many limits and keeps the architecture unchanged.

---

## 13. Future Enhancements (Out of Scope for v1)

- OAuth login (Google, GitHub).
- Recurring reminders on the exact day (days_before = 0).
- ICS/Google Calendar export.
- Group birthdays (multiple users can subscribe to the same list).
- Admin dashboard for monitoring.
- Custom reminder messages.

---

## 14. Assumptions

- The Telegram bot is created manually by the developer before deployment; its token is added to Supabase secrets.
- An SMTP account is already provisioned (e.g., Gmail with app password, or SendGrid free tier) and credentials are stored as secrets.
- Users are technically comfortable enough to sign up via email and follow the Telegram linking instructions.
- The hourly cron check is sufficient to catch all 8 AM local times; no need for per‑minute precision.
