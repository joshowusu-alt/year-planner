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
```

If Supabase keys are omitted, the app falls back to local storage and signs in as a local guest.

### Serverless / deployment environment

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

## Supabase setup

The repository includes SQL helpers for optional backend features:

- `src/lib/push_subscriptions_migration.sql`
- `src/lib/sharing_migration.sql`

Run them in the Supabase SQL editor if you want push reminders and share links.

## Notifications and reminders

- In-app reminders work while STRATUM is open in the browser.
- Background push requires Supabase, a configured VAPID keypair, and a cron job that calls `/api/send-reminders`.
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
