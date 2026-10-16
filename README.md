# Garwan Law Chamber - Case Manager

Next.js 14 (App Router) + React + TypeScript. Classic navy and burgundy UI with a sidebar.

Features: login, dashboard with the **Total cases decided** counter, cases (add, edit, delete, search, filters),
weekly cause list, associates, and SMS hearing reminders (sent the evening before to Mehtab, the client and linked associates).

## 1. Run it locally (demo mode)

    npm install
    npm run dev

Open http://localhost:3000. Without Supabase configuration, local development uses sample accounts and browser-only
storage. This demo mode is disabled in production; configure the shared Supabase database before deploying.

## 2. Go live with Supabase

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Add these environment variables in Vercel (and `.env.local` for local live-mode testing):
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project settings > API)
   - `SUPABASE_SERVICE_ROLE_KEY` (server only; never expose it in the browser)
   - `SESSION_SECRET` (a unique, randomly generated secret)
   - `INITIAL_ADMIN_SETUP_SECRET` (a temporary random secret of at least 32 characters)
3. Deploy, then create the first Super Admin by sending a `POST` request to
   `/api/auth/bootstrap` with the header `Authorization: Bearer <your temporary setup secret>` and JSON fields
   `username`, `email`, `name`, and `password`. Choose a unique password of at least 8 characters.
   The database only permits this bootstrap once. Remove `INITIAL_ADMIN_SETUP_SECRET` from Vercel and redeploy
   immediately after setup.
4. Sign in with that account. New accounts and password resets are stored as scrypt hashes; password changes
   revoke other active sessions. Live data is shared, and signed-in screens refresh from the server every 15 seconds.

Do not use local demo mode for real client data. Keep the Supabase service-role key and setup secret private.
A deployment using the Vercel-provided `*.vercel.app` address receives HTTPS automatically.

## 3. SMS reminders

- `src/lib/sms.ts` is the only file that talks to the SMS gateway. Choose a Pakistani SMS provider, then edit the
  URL, field names and auth header there to match the provider's API docs (the current request is a placeholder).
- Set `SMS_API_URL`, `SMS_API_KEY`, `SMS_SENDER_ID`, `CRON_SECRET` and (optionally) `ADVOCATE_PHONE` in the environment.
  Mehtab's number can also be saved on the Reminders page.
- `vercel.json` runs `/api/cron/send-reminders` daily at 13:00 UTC (18:00 Pakistan time). Vercel sends the
  `CRON_SECRET` as a bearer token automatically.
- `reminder_log` has a unique key per (case, hearing date, phone), so a rerun never sends the same SMS twice.
- Test it by hand: `curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/send-reminders`

## 4. Backups

The scheduled `/api/cron/backup` job stores snapshots in the same Supabase project; it is not an independent
disaster-recovery backup. Enable Supabase's database backups for the selected plan and arrange an off-site copy
before relying on this app for production case records. Test restoring a backup before launch.

## 5. Deploy

Connect the GitHub repository to Vercel, add the production environment variables, and deploy. Confirm the
production build and sign-in after the first-admin setup.

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
