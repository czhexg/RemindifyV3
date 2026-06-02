# Development Plan: Birthday Reminder App

## Overview

This plan breaks down the entire implementation into clear, actionable tasks. The order respects dependencies, allowing the project to be built incrementally. Each phase is designed to be completed in sequence; within a phase, tasks can often be parallelized if multiple developers are available.

## Phases

1. **Project Setup & Infrastructure** (foundations)
2. **Database Schema & Security** (data layer)
3. **Edge Functions (Backend Logic)** (notification engine, Telegram webhook)
4. **Frontend Core** (routing, auth, dashboard, CRUD)
5. **Settings & Telegram Linking UI** (user preferences, bot connection)
6. **Integration & Notification Pipeline** (end‑to‑end wiring)
7. **Testing & QA** (unit, integration, security)
8. **Deployment & Monitoring** (go live)

---

## Phase 1: Project Setup & Infrastructure

### T1.1 – Create Supabase project

- Sign up / log in to supabase.com.
- Create a new project (free tier).
- Choose a strong database password.
- Note down the **Supabase URL** and **anon key** (public) and **service_role key** (secret, never commit).

### T1.2 – Set up local development environment

- Install Supabase CLI: `npm install -g supabase` (or via brew).
- Initialize Supabase locally: `supabase init` in a new monorepo directory (e.g., `birthday-reminder`).
- Link to the remote project: `supabase link --project-ref <ref>`.

### T1.3 – Scaffold React frontend with Vite

- Create new Vite React project: `npm create vite@latest frontend -- --template react-ts`.
- Install dependencies:
    - `tailwindcss @tailwindcss/vite` (configure Tailwind)
    - `shadcn/ui` init (choose components: button, input, card, dialog, etc.)
    - `@supabase/supabase-js`
    - `react-router-dom`
    - `react-query` (`@tanstack/react-query`)
    - `date-fns` for date math (no extra tz library needed; use native `Intl.DateTimeFormat` for timezone conversion)
- Set up environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

### T1.4 – Set up Telegram bot

- Create a new bot via @BotFather on Telegram.
- Obtain the bot token.
- Store the token as a Supabase secret (Edge Function environment or Vault).
- (Temporarily) Set a placeholder webhook URL later.

### T1.5 – Set up SMTP credentials

- Use a free SMTP provider (e.g., Gmail with app password, Brevo free tier).
- Store credentials (host, port, user, pass, from email) as Supabase secrets.

### T1.6 – Set up cron-job.org

- Create a free account.
- Prepare the URL of the future `cron-trigger` edge function (exact URL known after deployment, but we can note the structure).
- Generate a secret string (`CRON_SECRET`) and store in Supabase secrets.

---

## Phase 2: Database Schema & Security

### T2.1 – Write database migration

- Create a migration SQL file (e.g., `0000_initial_schema.sql`):
    - `profiles` table (trigger on `auth.users` creation to auto‑insert profile row).
    - `birthdays` table with foreign key to `profiles`.
    - `telegram_linking_tokens` table.
    - `sent_notifications` table with unique constraint.
- Include indexes on `birthdays(user_id)`, `sent_notifications(user_id, birthday_id, notify_date, channel)`.

### T2.2 – Enable Row‑Level Security (RLS)

- Write policies for:
    - `profiles`: SELECT/UPDATE for owner.
    - `birthdays`: SELECT/INSERT/UPDATE/DELETE for owner.
    - `telegram_linking_tokens`: SELECT/INSERT for owner.
- Create a trigger that inserts a new `profiles` row when a user signs up (`auth.users`).
- Disable public access on `sent_notifications` (or add a policy that denies all).

### T2.3 – Apply migration and test locally

- Run `supabase migration up` locally (or via Supabase CLI with `db push` if testing).
- Use the Supabase Dashboard SQL Editor or local studio to verify tables, policies, and triggers.
- Insert test data (bypassing RLS with service_role) to confirm constraints.

---

## Phase 3: Edge Functions (Backend Logic)

### T3.1 – Set up Edge Functions scaffold

- In the `supabase/functions` directory, create two function folders: `cron-trigger` and `telegram-webhook`.
- Each contains an `index.ts` with a basic `serve()` handler and correct imports.

### T3.2 – Implement `telegram-webhook` function

- Parse incoming Telegram update JSON.
- If `/start <token>`, validate token (exists, not used, not expired), link Telegram chat ID to profile, mark token used, send success message.
- Any other message: send instruction.
- Include helper `sendTelegramMessage(chatId, text)` that uses bot token from secrets.
- Handle errors gracefully.
- Test locally using `supabase functions serve` and `curl` or a mock Telegram request.

### T3.3 – Implement `cron-trigger` function

- Validate `X-Cron-Secret` header.
- Query all users with enabled notifications and their birthdays (using service_role client).
- For each user, compute current time in their timezone.
- If hour == 8, compute target notification dates for each birthday (using `days_before`).
- Check `sent_notifications` for duplicates.
- For missing channels, send:
    - Email via SMTP (using Deno SMTP client).
    - Telegram message via Bot API.
- Insert sent records.
- Ensure atomicity (use `Promise.all` for parallel sends, catch failures without crashing the whole function).
- Add logging for each step.

### T3.4 – Unit test critical date calculation logic

- Extract `computeTargetDate(month, day, daysBefore, year)` and `getLocalTime` as pure functions in a shared `_utils` module.
- Write Deno tests for edge cases:
    - Simple case: Jan 5, daysBefore=3 → Jan 2.
    - Month rollover: Jan 2, daysBefore=3 → Dec 30 (previous year).
    - Leap day handling: Feb 29 in non‑leap year → Feb 28 (clamping).
    - Timezone checks: ensure local hour extraction works.

### T3.5 – Deploy Edge Functions

- Deploy with `supabase functions deploy cron-trigger telegram-webhook`.
- Note the public URLs.
- Set environment variables for both functions (bot token, SMTP creds, CRON_SECRET, SUPABASE_URL, SERVICE_ROLE_KEY).
- Set Telegram webhook: `curl https://api.telegram.org/bot<TOKEN>/setWebhook?url=<telegram-webhook-url>`.

---

## Phase 4: Frontend Core

### T4.1 – Set up Supabase client & Auth context

- Create `src/lib/supabaseClient.ts` exporting a singleton Supabase client.
- Create an `AuthProvider` component that listens to `onAuthStateChange` and provides the session and user.
- Wrap the app with `AuthProvider`, `QueryClientProvider` (React Query), and `BrowserRouter`.

### T4.2 – Build authentication pages

- Create `/signin` and `/signup` pages with forms (email, password).
- Use `supabase.auth.signInWithPassword` / `signUp`.
- Show errors (e.g., "Invalid login", "Email not confirmed").
- On success, redirect to dashboard (`/`).
- Include a "Forgot password?" link (optional but nice).
- Style with shadcn/ui components (Card, Input, Button, Label).

### T4.3 – Implement protected routes

- Create a `ProtectedRoute` component that checks if session exists; if not, redirect to `/signin`.
- Apply to all routes except auth pages.

### T4.4 – Build Dashboard (Birthdays CRUD)

- Create a `Dashboard` page that fetches birthdays for the current user using `supabase.from('birthdays').select('*')`.
- Display a list of `BirthdayCard` components showing name, formatted date, days until next occurrence (use `date-fns` for calculation).
- Add a "Add Birthday" button that opens a dialog (`AddEditBirthdayDialog`) with fields: name, month, day (can use a simple date picker or separate selects).
- Implement create, update, and delete operations with optimistic updates via React Query (`useMutation` with `onMutate` and `queryClient.setQueryData`).
- Show empty state when no birthdays.
- Sort birthdays by upcoming occurrence (next birthday date).

### T4.5 – Dashboard UI polish

- Use Tailwind for responsive layout.
- Add loading skeletons while data loads.
- Toast notifications for success/error using shadcn's `Sonner`.

---

## Phase 5: Settings & Telegram Linking UI

### T5.1 – Build Settings page layout

- Route `/settings` with tabs or sections:
    - Notification preferences
    - Telegram linking status and actions
    - Account info (email, sign out)

### T5.2 – Notification preferences form

- Load current profile (from Supabase `profiles`).
- Fields:
    - `days_before` (number input, default 3).
    - Timezone (searchable dropdown – can use `react-select` with a timezone list or a simple select with popular options).
    - Email notifications toggle.
    - Custom notification email (optional text input, shown only when email toggle is on).
    - Telegram notifications toggle (disabled if not linked).
- On change, update Supabase `profiles` table (React Query `useMutation`).

### T5.3 – Telegram linking flow

- Show linking status: "Not linked" with a Link button, or "Linked to Telegram" with the option to unlink (clear chat_id).
- On "Link Telegram" click:
    1. Insert new token into `telegram_linking_tokens`.
    2. Display a modal with the token, a "Copy" button, and a deeplink/telegram link (`https://t.me/YOUR_BOT?start=<token>`).
    3. Include instructions.
- Provide a "Check Status" button that fetches `profiles.telegram_chat_id`; if not null, update UI to "Linked". Could also use a simple `setInterval` to poll for a few seconds.
- After linking, automatically enable Telegram notifications.

### T5.4 – Unlink Telegram

- Allow user to disconnect: update `profiles.telegram_chat_id = null` and disable Telegram notifications.

---

## Phase 6: Integration & End‑to‑End Wiring

### T6.1 – Verify Telegram linking flow end‑to‑end

- Run the app locally (or deploy frontend to Vercel preview).
- Create a user, go to settings, link Telegram.
- Send `/start <token>` to the bot.
- Confirm that the profile is updated and a success message is received.

### T6.2 – Test notification pipeline manually

- Set `days_before = 0` for a test birthday and set timezone to something with 8 AM happening shortly (or mock the cron trigger).
- Trigger `cron-trigger` manually via curl with the secret header.
- Verify that an email/Telegram message is sent, and that `sent_notifications` records are created.
- Check idempotency: trigger again, should not send duplicate.
- Adjust timezone and wait for the next hour (or manually change clock) to test 8 AM gate.

### T6.3 – Set up cron-job.org

- Configure the job to call the live `cron-trigger` URL every hour with the secret header.
- Enable the job and monitor for initial runs (log output).

---

## Phase 7: Testing & QA

### T7.1 – Write unit tests (frontend)

- Test `computeTargetDate` and `getLocalTime` (if shared or duplicated) with Jest.
- Test React components: BirthdayCard, AddEditBirthdayDialog, Dashboard using React Testing Library.
- Mock Supabase calls.

### T7.2 – Integration tests (Edge Functions)

- Use Supabase local development (with `supabase start`) to run edge functions against a test database.
- Write scripts that:
    - Seed test data (users, birthdays).
    - Invoke `cron-trigger` and assert notification side effects (mock SMTP/Telegram).
    - Invoke `telegram-webhook` with a mock message and check database state.

### T7.3 – Security testing

- Attempt to access another user’s birthdays by modifying JWT or using anon key with user_id claims. (Should fail due to RLS.)
- Call `cron-trigger` without the correct secret (should 401).
- Ensure service_role key is never exposed in frontend builds (check environment variable).

### T7.4 – UI/UX review

- Test on mobile and desktop.
- Test all form validations (empty name, invalid day).
- Ensure loading states, empty states, and error states are user‑friendly.
- Test with screen reader (basic a11y check).

---

## Phase 8: Deployment & Monitoring

### T8.1 – Deploy frontend to Vercel

- Connect GitHub repository to Vercel.
- Set build command and output directory.
- Add environment variables (Supabase URL, anon key).
- Deploy production branch.

### T8.2 – Set up custom domain (optional)

- If desired, add a custom domain in Vercel (requires DNS).

### T8.3 – Monitoring and logging

- Enable Supabase logging for Edge Functions (included in dashboard).
- Set up Vercel Analytics (free) to monitor traffic and errors.
- Optionally, set up a health check (e.g., UptimeRobot) on the frontend.

### T8.4 – User documentation

- Write a simple README or help page inside the app explaining how to link Telegram and configure notifications.

### T8.5 – Final checklist

- Ensure all secrets are set in production Supabase.
- Verify Telegram webhook URL is the production URL.
- Enable email confirmations in Supabase Auth settings (if desired).
- Make first real signup and test the entire flow live.

---

## Task Dependencies & Ordering

- **Phase 1** must be done first (infrastructure).
- **Phase 2** (database) can start after T1.1, but final schema needs to be settled before Phase 3 logic.
- **Phase 3** (edge functions) depends on database schema and secrets.
- **Phase 4** (frontend core) can be done partially in parallel with Phase 3, but final integration testing requires both.
- **Phase 5** (settings) depends on profile table and frontend auth.
- **Phase 6** (integration) after all parts are functional.
- **Phase 7** can run alongside development, but final passes after integration.
- **Phase 8** (deployment) final step.

## Estimated Time (for a single developer)

- Phase 1: 4-6 hours
- Phase 2: 3-4 hours
- Phase 3: 8-12 hours (edge functions + testing)
- Phase 4: 12-16 hours (frontend CRUD, auth, state)
- Phase 5: 6-8 hours
- Phase 6: 4-6 hours
- Phase 7: 6-8 hours
- Phase 8: 2-4 hours

**Total:** ~45-64 hours of focused work.
