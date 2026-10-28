# Zeiterfassung — Freelance Time Tracking PWA

## Zweck (Project purpose)

Persönliches Zeiterfassungstool für einen freiberuflichen IT-Berater. Erfasst Arbeitssessions
pro Kunde, misst Zeit in AE (Arbeitseinheit), und erstellt monatliche Abrechnungen. Mehrbenutzer-
App (Administrator legt Benutzer an), über mehrere Geräte hinweg genutzt (Handy, Laptop, Desktop).
Mehrere Timer können gleichzeitig laufen. Muss als PWA installierbar sein
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
- **Deployment:** GitHub Pages (statischer Export, `.github/workflows/deploy-pages.yml`, Base-Path
  `/zeiterfassung`, Push auf `main` deployt). **Package Manager:** npm.
- Reine Client-Side SPA: keine Server Components, keine Server Actions, keine API-Routes. Alle
  Daten-Aufrufe laufen clientseitig durch die Sync-Engine (`src/lib/sync.ts`). Einzige serverseitige
  Logik: die Supabase Edge Function `admin-users` (Benutzerverwaltung, braucht den Service-Role-Key).

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

**Konfliktauflösung:** Beim Pull überschreibt der Serverstand lokale Zeilen, außer sie liegen noch
unsynchronisiert in der `sync_queue`. Ein Vergleich der `updated_at`-Zeitstempel findet nicht statt.

**Abgelehnte Änderungen:** Lehnt der Server einen Queue-Eintrag dauerhaft ab (Postgres-Fehlerklassen
22/23/42, z. B. RLS- oder Fremdschlüssel-Verletzung), wird er verworfen, der lokale Stand per Pull
zurückgesetzt und ein Hinweis angezeigt. Netzwerk-/Auth-Fehler bleiben in der Queue und werden
wiederholt. `drainSyncQueue` läuft nie parallel. Beim Zurückkehren ins Fenster wird (max. 1×/Minute)
neu synchronisiert, damit geteilte Kunden/Typen anderer Benutzer ankommen.

IndexedDB-Datenbank: `zeiterfassung-db-<userId>` (Version 1), **eine pro Benutzer**, gesetzt über
`setDbUser()` in `src/lib/db.ts` bevor ein Hook die DB anfasst (`(app)/layout.tsx`). Stores
`customers`, `session_types`, `time_entries` (Indizes: `by-date`, `by-customer`), `sync_queue`
(Index: `by-timestamp`), `timer_state`. Die alte gemeinsame `zeiterfassung-db` wird nicht mehr benutzt.

## Mehrbenutzer & Administration

- **Datenmodell:** `customers` und `session_types` sind für alle Benutzer geteilt, `time_entries`
  gehören einem Benutzer (`user_id`, Default `auth.uid()`) und sind nur für ihn sichtbar. Auch der
  Administrator sieht nur eigene Einträge.
- **Zugriff:** Jede Policy verlangt eine aktive Zeile in `profiles` (`is_active_user()`). Ein Konto ohne
  Profil (z. B. fremde GitHub-Anmeldung) oder mit `disabled = true` sieht nichts. Löschen von Kunden/Typen
  darf nur `is_admin()`; Fremdschlüssel auf `time_entries` sind `on delete restrict`.
- **Rollen:** `admin` | `user`, in `profiles.role`. Der Client liest sie über `useProfile`
  (`src/hooks/useProfile.tsx`, Rolle offline aus localStorage gecacht). Deaktivierte/profillose Konten
  werden abgemeldet; die Meldung erscheint auf der Login-Seite.
- **Admin-Tab** (`/admin`, nur für Administratoren sichtbar): Benutzer anlegen (Benutzername **oder**
  E-Mail + Passwort), auflisten, Passwort ändern, deaktivieren/aktivieren, löschen (löscht auch deren
  Einträge). Alles läuft über die Edge Function `supabase/functions/admin-users/index.ts`
  (`src/lib/adminApi.ts`); sie prüft serverseitig die Admin-Rolle. Sie braucht Internet.
- **Benutzername:** wird auf die Pseudo-E-Mail `<name>@users.zeiterfassung.local` abgebildet
  (`src/lib/auth.ts`, muss mit der Edge Function übereinstimmen). Login akzeptiert beides.
- **Neues Supabase-Projekt:** `supabase/schema.sql` ausführen, ersten Benutzer im Auth-Dashboard
  anlegen und per `insert into profiles (id, role) values ('<id>', 'admin')` zum Admin machen, Edge
  Function `admin-users` deployen. „Allow new users to sign up“ im Auth-Dashboard ausschalten.
- **Bekannte Einschränkung:** Der AE-Satz liegt am (geteilten) Kunden, nicht am Eintrag. Eine
  Änderung wirkt rückwirkend auf alle Berichte aller Benutzer.

## Timer

Mehrere Timer gleichzeitig (`src/hooks/useTimers.ts`, `src/components/timer/TimerCard.tsx`). Jeder Timer
ist ein Datensatz in `timer_state` (Schlüssel = uuid) mit Status `running` | `paused` | `stopped`; ein
gestoppter, noch nicht gespeicherter Timer überlebt einen Reload. Timer sind lokal pro Gerät und Benutzer
und werden nicht synchronisiert.

## Export & Versand

Abrechnung als PDF, CSV (Semikolon, UTF-8 mit BOM) und TXT (`src/lib/export.ts`). Pro Session gibt es
einen E-Mail-Button, der das Standard-Mailprogramm per `mailto:` ohne Empfänger öffnet
(`src/lib/mail.ts`; lange Notizen werden gekürzt, damit die URL funktioniert).

## Ordnerstruktur

```
src/
  app/
    (auth)/login/page.tsx
    (app)/
      layout.tsx           geschütztes Layout mit TopNav; setzt die Benutzer-DB, Profil, Sync
      page.tsx             Dashboard
      admin/page.tsx       Benutzerverwaltung (nur Administratoren)
      new-entry/page.tsx
      sessions/page.tsx
      report/page.tsx
      settings/page.tsx
    offline/page.tsx
    sw.ts                  Serwist Service Worker
    layout.tsx             Root-Layout mit PWA-Meta-Tags
    globals.css
  components/
    nav/       TopNav.tsx, SyncStatus.tsx, Logo.tsx, UpdatePrompt.tsx, icons.tsx
    timer/     TimerWidget.tsx, TimerCard.tsx
    entry/     AEInput.tsx, EntryForm.tsx
    report/    ReportTable.tsx, ExportButtons.tsx
    ui/        Button.tsx, Input.tsx, Select.tsx, Modal.tsx, Badge.tsx, Toast.tsx, IconButton.tsx, ...
  lib/         supabase.ts, db.ts, ae.ts, sync.ts, export.ts, mail.ts, auth.ts, adminApi.ts, translate.ts
  hooks/       useCustomers.ts, useSessionTypes.ts, useTimeEntries.ts, useTimers.ts, useSync.ts,
               useOnlineStatus.ts, useProfile.tsx
  types/       index.ts
supabase/
  schema.sql   Endzustand des Schemas (manuell im Supabase SQL Editor auszuführen)
  functions/admin-users/index.ts   Edge Function (Benutzerverwaltung), per Supabase deployt
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

Deployment: `git push` auf `main` startet den GitHub-Actions-Workflow (GitHub Pages). Die
Supabase-Werte kommen aus den Repository-Secrets `NEXT_PUBLIC_SUPABASE_URL` und
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Lokaler Test des Pages-Exports (Git Bash braucht
`MSYS_NO_PATHCONV=1`): `GITHUB_PAGES=true NEXT_PUBLIC_BASE_PATH=/zeiterfassung npm run build`.

Supabase-Setup: `supabase/schema.sql` im Supabase SQL Editor ausführen. Danach im Supabase
Auth-Dashboard manuell einen Benutzer-Account anlegen (keine Registrierungs-UI in der App).

**Aktuelles Projekt:** `rlctnbqytjphyfetzxxm` (eu-west-1) — Schema bereits angewendet,
`.env.local` bereits mit URL/Anon-Key befüllt.

**Login:** Benutzername oder E-Mail + Passwort (`supabase.auth.signInWithPassword`) sowie optional GitHub OAuth
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
