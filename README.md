# StayN

StayN ("Stay and Nest") is a simple Airbnb-like website for booking stays in the Philippines (Tagaytay, Cebu, Palawan, Siargao).

Live site: https://stayn-4576a.web.app

## What it does

**Guests** search and filter stays (destination, category, dates, adults, kids, pets, price), see photos, amenities, house rules and a map, send a booking request with a price breakdown, pay with a simulated GCash form once the host accepts, manage reservations, write reviews, and get notifications.

**Hosts** apply to become a host, add and edit listings (photos, documents, map pin, a listing fee), block dates on an availability calendar, accept or reject requests, and see reviews, earnings and monthly reports (CSV and print).

**Admins** approve hosts and listings, manage users, monitor every reservation, moderate reviews, view reports, and change platform settings (fees, categories).

## Tech

React 19 (Vite), Material UI, Bootstrap grid, Firebase (Authentication, Cloud Firestore, Hosting), Leaflet with OpenStreetMap for the map and address search, react-calendar.

## Run it on your computer

1. Install Node.js 20 or newer.
2. In this folder run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in the Firebase web settings (Firebase console, Project settings, Your apps). Ask the team for the values; never commit `.env.local`.
4. Run `npm run dev` and open the address it prints.

The `server` folder is not used by the website.

## Demo accounts

The Login page has one-click demo buttons (Guest, Guest unverified, Host, Admin). Sample accounts use `.test` emails, which cannot receive mail; use a real email to try email verification and password reset.

## Put it online (Firebase Hosting)

```
npm run build
npx firebase-tools login
npx firebase-tools deploy --only hosting
```

Security rules: `npx firebase-tools deploy --only firestore:rules`.

## Folders

- `src/pages` - public, guest, host and admin pages
- `src/context` - `AuthContext` (Firebase Authentication) and `DataContext` (live Firestore data and the actions pages call)
- `src/components` - shared pieces (header, map, dialogs, password field)
- `src/utils` - dates, prices, photo shrinking, CSV
- `firestore.rules`, `firebase.json` - database rules and hosting settings

## Credits

Map data © OpenStreetMap contributors.
