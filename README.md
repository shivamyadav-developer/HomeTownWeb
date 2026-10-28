# HomeTown OnTrack (PWA)

Installable, offline-tolerant React app for HomeTown store staff. Built with Vite, React 18, React Router and `vite-plugin-pwa`. It uses the HomeTown OnTrack API from the supplied API documentation.

## Run

```bash
npm install
cp .env.example .env     # optional
npm run dev              # http://localhost:5173 (API calls go through a dev proxy, so no CORS issues)
npm run build            # production build in dist/
npm run preview          # serve dist/ to test install + offline
```

Service workers and install prompts need HTTPS (or `localhost`).

## Screens → API

| Screen | Endpoints |
| --- | --- |
| Login | `POST /api/users/login-ontrack` |
| Target | `GET /api/ontrack/emp-dashboard/{id}` |
| Leaders | `GET /api/ontrack/target/staff/leaderboard` |
| LMS list / details / quiz | course list, course, questions, employee progress, attempt start / answer / submit |
| Attend | check-in, check-out, history |
| Lead / Lead details | `GET /api/qrleads`, `PATCH /api/qrleads/{id}` |
| NewLead | `POST /api/qrleads` (barcode/QR scan via the browser `BarcodeDetector`, or manual SKU entry) |
| Checklist (menu / sidebar) | templates, upload image, submit submission |
| Profile | profile data from the login response |

## Production deployment

1. **CORS.** In production the browser calls the API directly (`VITE_API_BASE`). The API must allow your app's origin. If it does not, serve the app and a reverse proxy for `/api` from the same domain, and set `VITE_API_BASE=` (empty).
2. **SPA fallback.** Rewrite all unknown paths to `/index.html` (`public/_redirects` covers Netlify; configure the equivalent elsewhere).

## Authentication and data handling

- Only the auth token (if the server returns one) and the profile are stored on the device. The password is never stored.
- A 401 from any call clears the session. Logging out also wipes all cached API data, drafts and queued leads.
- API data is cached by the app per employee for offline viewing. Quiz answer keys (`correctAnswer`) are stripped before anything is cached.
- New leads created offline are queued and sent automatically when the connection returns.

## Things to confirm against the real API

The documentation does not specify these, so the code reads them defensively:

- **Login response shape** (token field name, profile fields). See `src/api/user.js`. Missing store/name details are filled from the leaderboard and attendance endpoints.
- **Checklist image upload field name.** `image` (confirmed against the server).
- **Attendance is automatic, like the mobile app.** No Check In / Check Out buttons. The store list and 100 m radius in `src/utils/stores.js` are a copy of the app's `HTAttendanceApp/utils/location.js` — keep them in sync. A web app cannot track location in the background, so on the website check-in/out only happens while the Attend page is open (fixes less accurate than 100 m are ignored).
- **Checklists** follow the app's rules (`src/utils/checklist.js`): only templates for the user's own role, a remark for every answer that doesn't match `expected`, 1–N buttons for `SCORE` items, and one submission per checklist per day.
- **Profile fields** come from the login response: store = `siteId` / `location`, designation = `jobTitle`, manager = `reportingTo`.
- **Updates.** When a new version is deployed, users get a full-screen "Update required" screen (checked every 30 minutes), like the app's force update.
