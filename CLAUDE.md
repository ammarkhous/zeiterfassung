# Zeiterfassung — Freelance Time Tracking PWA

## Zweck (Project purpose)

Persönliches Zeiterfassungstool für einen freiberuflichen IT-Berater. Erfasst Arbeitssessions
pro Kunde, misst Zeit in AE (Arbeitseinheit), und erstellt monatliche Abrechnungen. Single-user
App, über mehrere Geräte hinweg genutzt (Handy, Laptop, Desktop). Muss als PWA installierbar sein
und vollständig offline funktionieren — Timer und manuelle Erfassung laufen ohne Internet und
synchronisieren automatisch mit Supabase, sobald die Verbindung wiederhergestellt ist.

## Stack-Entscheidungen

- **Next.js 15 (App Router) + TypeScript** — moderne React-Basis, Datei-basiertes Routing.
- **Tailwind CSS v4** — utility-first Styling, mobile-first, CSS-basierte Theme-Konfiguration
  (`@theme inline` in `globals.css`) für volle Kontrolle über Dark-Theme-Design-Tokens.
- **Supabase (PostgreSQL + Auth)** — Backend als Sync-Ziel; einfache Row-Level-Security, kein eigenes Backend nötig.
- **IndexedDB via `idb`** — lokaler Offline-First-Datenspeicher; einzige Quelle für alle Reads in der UI.
- **Serwist** (nicht `next-pwa`, das ist deprecated) — Service-Worker-Generierung für PWA-Funktionalität.
- **jspdf + jspdf-autotable** — clientseitige PDF-Generierung für Abrechnungen.
- **Natives CSV-Export** — kein zusätzliches Paket nötig, einfacher String-Export mit BOM.
- **Deployment:** Vercel. **Package Manager:** npm.
- Reine Client-Side SPA: keine Server Components, keine Server Actions, keine API-Routes. Alle
  Supabase-Aufrufe laufen ausschließlich clientseitig durch die Sync-Engine (`src/lib/sync.ts`).

## AE-Umrechnungsregel

**1 AE = 10 Minuten.** Gilt überall konsistent (UI, PDF, CSV, Datenbank-Berechnungen).

```
30 min  = 3.0 AE  = 0:30h
45 min  = 4.5 AE  = 0:45h
90 min  = 9.0 AE  = 1:30h
150 min = 15.0 AE = 2:30h
```

Siehe `src/lib/ae.ts` für alle Umrechnungsfunktionen. AE wird immer mit 1 Nachkommastelle
angezeigt (z.B. `3.0` nicht `3`). In der UI ist AE immer der primäre Wert (fett), Stunden sind
immer sekundär (grau, klein).

## Offline-First-Architektur

Alle Reads kommen ausschließlich aus IndexedDB. Alle Writes gehen zuerst nach IndexedDB, dann zu Supabase.

**Datenfluss:**
1. App-Start → Pull aller Daten von Supabase → Speicherung in IndexedDB.
2. Alle Reads → nur aus IndexedDB (sofort verfügbar, funktioniert offline).
3. Alle Writes → zuerst IndexedDB → danach Sync-Versuch zu Supabase.
4. Online: sofortige Synchronisierung nach dem IndexedDB-Write.
5. Offline: Operation wird in `sync_queue` (IndexedDB) eingereiht.
6. Verbindung wiederhergestellt: `sync_queue` wird FIFO abgearbeitet.
7. Beim nächsten App-Start: vollständiger Re-Sync von Supabase zur Konfliktauflösung.

**Konfliktauflösung:** `updated_at`-Zeitstempel gewinnt — der neuere Datensatz überschreibt den älteren.

IndexedDB-Datenbank: `zeiterfassung-db` (Version 1) mit Stores `customers`, `session_types`,
`time_entries` (Indizes: `by-date`, `by-customer`), `sync_queue` (Index: `by-timestamp`),
`timer_state`.

## Ordnerstruktur

```
src/
  app/
    (auth)/login/page.tsx
    (app)/
      layout.tsx           geschützter Layout mit Sidebar + BottomNav
      page.tsx             Dashboard
      new-entry/page.tsx
      sessions/page.tsx
      report/page.tsx
      settings/page.tsx
    offline/page.tsx
    sw.ts                  Serwist Service Worker
    layout.tsx             Root-Layout mit PWA-Meta-Tags
    globals.css
  components/
    nav/       Sidebar.tsx, BottomNav.tsx, SyncStatus.tsx
    timer/     TimerWidget.tsx
    entry/     AEInput.tsx, EntryForm.tsx
    report/    ReportTable.tsx, ExportButtons.tsx
    ui/        Button.tsx, Input.tsx, Select.tsx, Modal.tsx, Badge.tsx, Toast.tsx
  lib/         supabase.ts, db.ts, ae.ts, sync.ts
  hooks/       useCustomers.ts, useSessionTypes.ts, useTimeEntries.ts, useTimer.ts, useSync.ts, useOnlineStatus.ts
  types/       index.ts
supabase/
  schema.sql   manuell im Supabase SQL Editor auszuführen
public/
  manifest.json, icons/, sw.js (generiert)
```

## Umgebungsvariablen

In `.env.local` (siehe `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Build & Deploy Commands

```bash
npm install          # Dependencies installieren
npm run dev           # Lokaler Dev-Server (http://localhost:3000)
npm run build          # Produktions-Build (generiert auch Service Worker via Serwist)
npm run start          # Produktions-Server lokal starten
npm run lint            # ESLint
```

Deployment: Vercel-Projekt mit diesem Repo verbinden, Umgebungsvariablen in den
Projekteinstellungen setzen, dann `git push` löst automatisches Deployment aus.

Supabase-Setup: `supabase/schema.sql` im Supabase SQL Editor ausführen. Danach im Supabase
Auth-Dashboard manuell einen Benutzer-Account anlegen (keine Registrierungs-UI in der App).

**Aktuelles Projekt:** `rlctnbqytjphyfetzxxm` (eu-west-1) — Schema bereits angewendet,
`.env.local` bereits mit URL/Anon-Key befüllt.

**Login:** E-Mail/Passwort (`supabase.auth.signInWithPassword`) sowie optional GitHub OAuth
(`supabase.auth.signInWithOAuth({ provider: 'github' })`). Für GitHub-Login: eine GitHub OAuth
App unter github.com/settings/developers anlegen (Callback-URL:
`https://rlctnbqytjphyfetzxxm.supabase.co/auth/v1/callback`), Client-ID/Secret im Supabase
Dashboard unter Authentication → Providers → GitHub eintragen.

## PWA-Installation

- **Desktop (Chrome/Edge):** Adressleiste → Installations-Icon klicken, oder Menü → "App installieren".
- **iOS Safari:** Teilen-Button → "Zum Home-Bildschirm".
- **Android Chrome:** Menü → "App installieren" / "Zum Startbildschirm hinzufügen".
- Die App funktioniert danach im Standalone-Modus (ohne Browser-UI) und vollständig offline
  dank Service Worker Caching und IndexedDB.

## Deutsches Locale

- **UI-Sprache:** Durchgehend Deutsch — keine hartcodierten englischen Strings.
- **Datumsformat:** `dd.MM.yyyy` überall (z.B. `14.09.2026`).
- **Zahlenformat:** Deutsches Locale für Währung, z.B. `1.234,56 €`.
- **CSV-Export:** Semikolon als Trennzeichen (deutscher Excel-Standard), UTF-8 mit BOM.
- **Zeit-Anzeige (Timer):** `HH:MM:SS`, sekündlich aktualisiert.
