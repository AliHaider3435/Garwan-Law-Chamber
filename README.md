# Garwan Law Chamber - Case Manager

Next.js 14 (App Router) + React + TypeScript. Classic navy and burgundy UI with a sidebar.

Features: login, dashboard with the **Total cases decided** counter, cases (add, edit, delete, search, filters),
weekly cause list, associates, and SMS hearing reminders (sent the evening before to Mehtab, the client and linked associates).

## 1. Run it locally (demo mode)

    npm install
    npm run dev

Open http://localhost:3000. With no Supabase keys the app runs in demo mode: any email and password signs in,
and data is saved in the browser only.

## 2. Go live with Supabase

1. Create a project at supabase.com.
2. SQL editor: paste and run `supabase/schema.sql`.
3. Authentication > Users: add Mehtab's user (email + password). Turn off public sign-ups in Authentication settings.
4. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project settings > API)
   - `SUPABASE_SERVICE_ROLE_KEY` (server only, never expose it in the browser)
5. Restart `npm run dev`. The demo notice disappears and everything is saved in the shared database.

## 3. SMS reminders

- `src/lib/sms.ts` is the only file that talks to the SMS gateway. Choose a Pakistani SMS provider, then edit the
  URL, field names and auth header there to match the provider's API docs (the current request is a placeholder).
- Set `SMS_API_URL`, `SMS_API_KEY`, `SMS_SENDER_ID`, `CRON_SECRET` and (optionally) `ADVOCATE_PHONE` in the environment.
  Mehtab's number can also be saved on the Reminders page.
- `vercel.json` runs `/api/cron/send-reminders` daily at 13:00 UTC (18:00 Pakistan time). Vercel sends the
  `CRON_SECRET` as a bearer token automatically.
- `reminder_log` has a unique key per (case, hearing date, phone), so a rerun never sends the same SMS twice.
- Test it by hand: `curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/send-reminders`

## 4. Deploy

Push to GitHub, import the repo in Vercel, add the environment variables, deploy.

## Project layout

    src/app/(app)/*        dashboard, cases, cause-list, associates, reminders (sidebar shell in layout.tsx)
    src/app/login          sign-in page
    src/app/api/cron       SMS reminder job
    src/components         CaseTable, CaseDialog (add and edit form)
    src/lib/store.tsx      React context: auth, data, dialog, toast
    src/lib/backend.ts     demo (localStorage) and Supabase data access behind one interface
    src/lib/reminders.ts   builds the reminder messages (used by the preview page and the cron job)
    supabase/schema.sql    database tables and security rules

## Next steps

- Hearing history per case (a `hearings` table), tasks, and the judgments pages
- Per-user roles for associates and clerks (the current rules give every signed-in user full access)
