# GLS Delivery Webpages (shadcn/ui)

This workspace contains two separate Vite + React + TypeScript apps using Tailwind CSS and shadcn/ui components.

- `public/` – Customer-facing tracking app with a read-only login and parcel tracking (mocked from static JSON).
- `private/` – Dropoff workers app to configure locker door PINs (1–8) and a panel subpage that lets someone enter a PIN; on match, it logs the matched door to the browser console.

## Quick start

Open two terminals (one per app) and run:

### Public app

```
cd public
npm install
npm run dev
```

Then open the URL shown (typically http://localhost:5173). Demo credentials:
- alice@example.com / alice123
- bob@example.com / bob12345
- carol@example.com / carolpass

Tracking numbers to try:
- GLS123456789
- GLS987654321
- GLS555111222

### Private app

```
cd ../private
npm install
npm run dev
```

- Door PINs page: set or restore PINs for doors 1–8 (session only).
- Panel subpage: use keypad to enter a PIN; if it matches a door PIN, the app prints to the console (and shows a toast). Open DevTools to see `console.log`.

## Notes
- shadcn/ui is initialized in both apps with Tailwind v3 and a GLS-like blue theme.
- The public app reads users and packages from static JSON under `public/public/data/` (served read-only by Vite). In a real app this would be a backend/database.
- The private app stores door PINs in `sessionStorage` for demo purposes; no persistence.
- Both apps include Toaster notifications via `sonner`.

## Build

To create a production build:

```
# Public
cd public
npm run build

# Private
cd ../private
npm run build
```
