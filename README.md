# STRATUM Planner

STRATUM is a planning app for yearly strategy, monthly themes, weekly execution, and day-to-day scheduling. It combines a year planner, calendar views, goals, tasks, notes, strategic review tools, natural-language event entry, read-only sharing, and browser/push reminders.

## Core features

- Annual, monthly, and weekly planning views
- Goals, milestones, tasks, and notes
- Strategy workspace with Vital Few and weekly review flows
- Natural-language quick add for events
- One-time ICS calendar import
- Spreadsheet import for CSV/XLSX schedules
- Local-first storage with optional Supabase sync
- Read-only share links
- CSV export, print/PDF export, and a central import/export/share hub
- In-app reminders plus optional background push reminders
- PWA support for installable/mobile use

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Supabase
- Vercel serverless functions
- Workbox / `vite-plugin-pwa`

## Recommended environment

- **Node.js 22.x**
- Keep the project **outside OneDrive-synced folders** when possible for more reliable lint/build behavior on Windows.

## Getting started

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Start the app:

   ```powershell
   npm run dev
   ```

3. Create a production build:

   ```powershell
   npm run build
   ```

4. Run the parser tests:

   ```powershell
   npm test
   ```

## Environment variables

### Frontend (`.env`)

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_VAPID_PUBLIC_KEY=
VITE_USE_STRUCTURED_SYNC=false
```

If Supabase keys are omitted, the app falls back to local storage and signs in as a local guest.

### Serverless / deployment environment

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
CRON_SECRET=
```

`CRON_SECRET` should always be set in production. The reminder endpoint now returns `500` if it is missing and `401` if the bearer token or `?secret=` value does not match.

## Supabase setup

The repository includes SQL helpers for optional backend features:

- `src/lib/planner_data_migration.sql`
- `src/lib/push_subscriptions_migration.sql`
- `src/lib/sharing_migration.sql`
- `src/lib/structured_sync_migration.sql`

Recommended order:

1. Run `src/lib/planner_data_migration.sql` for the base planner, sharing, and push tables.
2. Run `src/lib/structured_sync_migration.sql` only when you are ready to turn on `VITE_USE_STRUCTURED_SYNC`.

All of these migration files are written to be rerunnable.

## Notifications and reminders

- In-app reminders work while STRATUM is open in the browser.
- Background push requires Supabase, a configured VAPID keypair, and an external scheduler that calls `/api/send-reminders`.
- Vercel Hobby plans do not support sub-daily cron schedules, so this repository uses an external 5-minute scheduler instead of Vercel Cron.
- A GitHub Actions workflow is included at `.github/workflows/reminder-cron.yml`. Set `CRON_SECRET` as a GitHub Actions secret to enable it.
- `REMINDER_URL` is optional; if omitted, the workflow uses the current production alias `https://planner-app-azure.vercel.app/api/send-reminders`.
- If you use another external cron service instead, call `POST /api/send-reminders` with `Authorization: Bearer <CRON_SECRET>`.
- Share links are read-only and expire after 90 days.

## Import and export workflows

- **Calendar import:** upload an `.ics` export from Google Calendar, Apple Calendar, or Outlook.
- **Spreadsheet import:** upload `.csv`, `.xlsx`, or `.xls` files using the STRATUM template headers (`Date`, `Title`, `Category`, `Start Time`, `End Time`, `Notes`, `Recurrence`, `Reminder`).
- **Word/PDF capture:** move a document-based schedule into STRATUM by copying it into the template or saving it as CSV/Excel first, then reviewing the import preview.
- **Export/share:** export planner data to CSV, print to PDF, or create a read-only share link from Settings.

## Validation commands

```powershell
npm run lint
npm test
npm run build
```
