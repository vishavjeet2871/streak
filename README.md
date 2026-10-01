# 🔥 Streak

A calm, fast habit streak tracker. Offline-first, installable, no account needed. Optional email sign-in syncs it across your devices.

- **Today**: big tappable cards, one tap to check off (or +1 for count habits), a 🔥 streak on every card, a progress ring for the day, and a week strip for logging days you forgot.
- **Streaks** that respect each habit's schedule (daily, specific weekdays, or X times a week), with an optional weekly ❄️ freeze.
- **Stats**: GitHub-style year heatmap, 30/90/365-day completion trend, best and worst weekdays, this week vs last week, per-habit breakdowns. Every chart has hover tooltips and a table view.
- **Calendar**: month grid shaded by completion. Click a day to see or edit it.
- **Quality of life**: keyboard shortcuts, JSON backup/restore, CSV export, daily reminders, light/dark themes, and a "day starts at" setting so a 1 AM check-in still counts for last night.
- **Optional sync** between your laptop and phone: sign in with an email code and changes sync live (Dexie Cloud). It still works fully offline.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

The first screen offers one-tap starter habits and a **"Try it with 90 days of demo data"** button, so the charts have something to show right away. Demo data is also under Settings → Data.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm test` | Unit tests (Vitest), run in the `Asia/Kolkata` time zone |
| `npm run build` | Type-check and build a static site into `dist/` |
| `npm run preview` | Serve the production build locally (service worker included) |
| `npm run icons` | Re-render the PNG app icons from `public/icon.svg` |

To try it on your phone during development, run `npm run dev -- --host` and open the printed network URL. Install, offline mode, and notifications need HTTPS, so use a deployed URL for those.

## Deploy

### GitHub Pages (free, recommended)

1. Create a GitHub repository (for example `streak`) and push this folder to its `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Streak habit tracker"
   git branch -M main
   git remote add origin https://github.com/<you>/streak.git
   git push -u origin main
   ```
2. On GitHub, open the repository's **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) runs the tests, builds, and publishes. Watch it under **Actions**. After a minute or two the app is live at `https://<you>.github.io/streak/`.

Every push to `main` redeploys. Open apps pick up the new version on their next launch.

> The workflow builds with `BASE_PATH=/<repo-name>/`. If you deploy to a `<you>.github.io` repository (served from the domain root), change `BASE_PATH` in the workflow to `/`.

### Vercel (alternative)

1. Push the repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository. Vercel detects Vite automatically: build `npm run build`, output `dist`.
3. Deploy. No other config is needed, because the app uses hash routes and has no server routes.

## Install it like a native app

Open your deployed URL, then:

- **Laptop (Chrome / Edge):** click the install icon in the address bar, or use **Settings → Install** inside Streak. It opens in its own window and can be pinned to your taskbar or dock.
- **Android (Chrome):** menu ⋮ → **Install app** (or **Add to Home screen**).
- **iPhone / iPad (Safari):** Share → **Add to Home Screen**.

Once installed it works fully offline.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `1`–`9` | Toggle the matching habit on Today (count habits get +1 step) |
| `Shift` + `1`–`9` | Subtract one step from a count habit |
| `←` / `→` | Previous / next day on Today, previous / next month on Calendar |
| `N` | New habit |
| `T` `C` `S` `H` `,` | Today, Calendar, Stats, Habits, Settings |
| `?` | Show all shortcuts |

On touch screens, long-press a habit card to edit it. On desktop, right-click it or use the pencil icon.

## How streaks are counted

- **Daily** and **specific weekdays**: the streak is the number of consecutive *scheduled* days completed. A Mon/Wed/Fri habit is untouched by Tuesday.
- **X times a week**: the streak counts consecutive Monday–Sunday weeks that hit the target, shown as `🔥 3w`. A habit that starts mid-week only needs as many completions as that first week allows.
- **Today is never a miss** until it's over. An unfinished day (or week) just hasn't added to the streak yet.
- **Freezes** (on by default, toggle per habit): one per week. A missed scheduled day keeps the streak alive but doesn't add to it. For weekly habits, a week that ends one completion short is forgiven. Freezes are only spent when there's a streak to protect. Frozen days show ❄️.
- **Count habits** (for example 2/3 LeetCode problems) count only when the full target is reached. Partial progress still shows in completion percentages.
- **Days are local calendar days.** Settings → *New day starts at* (midnight to 5 AM) makes late-night check-ins count toward the previous day.

For the daily completion % used by the ring, heatmap, and calendar, a habit counts on the days it's due. A flexible "3× a week" habit counts on days you did it, and on days when skipping is no longer possible (the remaining days equal the completions still needed). Rest days in a flexible plan don't drag your score down.

## Your data and sync

Everything is stored in IndexedDB on each device, so Streak works fully offline with or without an account.

**Sync across devices (optional):** go to **Settings → Sync → Sign in** on each device with the same email. Streak sends you an 8-character code, with no password. From then on, habits, check-ins, your name, and the "day starts at" setting sync automatically through [Dexie Cloud](https://dexie.org/cloud/):

- **Live sync:** while the app is open, a change on one device shows up on the other within seconds. A device that was closed catches up as soon as it opens.
- **Offline changes** are kept locally and upload when you're back online.
- **Existing data is kept:** whatever is already on a device uploads on its first sign-in. If both devices had the same habit, Streak offers to merge the duplicates and combine their history.
- **Per-device settings:** theme and reminders stay per device.
- **Signing out** removes the synced copy from that device. It stays in your account.

**Free evaluation period:** new Dexie Cloud users are *evaluation* users with 30 active days of sync. Make your account permanent for free: open [Dexie Cloud Manager](https://manager.dexie.cloud), sign in with the email you used to create the database, and upgrade your user to *production*. The free plan includes 3 production seats. Settings shows how many evaluation days are left.

**Backups still work:** **Settings → Backup → Export** (JSON) and **Import**, and **Export CSV** for spreadsheets. While signed in, import, demo data, and delete-all apply to every synced device.

### Setting up sync for your own copy

The sync database URL lives in `.env` as `VITE_DEXIE_CLOUD_URL`. It's public by design because it ships in the app bundle. To point a fork at its own database:

```bash
npx dexie-cloud create
npx dexie-cloud whitelist https://<you>.github.io
npx dexie-cloud whitelist http://localhost:5173
```

Then put the printed database URL in `.env`. `dexie-cloud.key` holds admin credentials and is git-ignored, so never commit it. Without `VITE_DEXIE_CLOUD_URL`, Streak builds as a local-only app with no sync UI.

### Reminders

Turn on **Settings → Reminders** and pick a time. If habits are still open after that time, Streak sends one notification that day. Web apps can't wake themselves up without a push server, so the reminder fires while Streak is open in a tab or running as an installed app (minimized is fine). It won't fire if the app is fully closed.

## Project structure

```
src/
  types.ts            Habit, Entry, Settings
  db/                 Dexie schema, data operations, demo data, backup file I/O
  utils/              pure logic + tests: dates, schedule, streaks, stats, backup/CSV
  hooks/              data provider, routing, theme, shortcuts, reminders, install prompt
  components/
    ui/               Sheet, Segmented, Switch, ProgressRing, AnimatedNumber, Toast, Confirm
    layout/           Sidebar (desktop), BottomNav (mobile), Logo
    habits/           HabitCard, HabitForm, WeekStrip, StarterSuggestions, DayHabitRow
    charts/           Heatmap, trend/weekday/compare/monthly charts, ChartCard
  pages/              Today, Calendar, Stats, Habits, Settings
```

**Data model**

```ts
Habit {
  id, name, emoji, color,
  kind: 'check' | 'count', target, unit, step,
  frequency: { type: 'daily' } | { type: 'weekdays', days: number[] } | { type: 'weekly', times: number },
  startDate: 'YYYY-MM-DD', freezes: boolean, order, archivedAt: 'YYYY-MM-DD' | null
}
Entry { id: `${habitId}:${date}`, habitId, date: 'YYYY-MM-DD', value }   // one row per habit per day
```

Dates are stored as local `YYYY-MM-DD` keys and all arithmetic converts them to UTC day numbers, so time zones and DST never shift a day. Only "what day is it now?" reads the local clock. The tests run in IST and cover midnight rollover, the "day starts at" offset, year boundaries, and a DST zone.

**Stack:** Vite · React · TypeScript · Tailwind CSS · Motion (Framer Motion) · Recharts · Dexie (IndexedDB) + Dexie Cloud · dnd-kit · vite-plugin-pwa · Vitest.
