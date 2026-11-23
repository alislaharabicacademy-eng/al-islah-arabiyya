# Academy heavy-traffic readiness: initial source audit (2026-11-23)

Status: **Initial static code review only; no production load test, no live Firebase metrics, no Cloudflare dashboard access.** Do not interpret as certification for 1,000 simultaneous users.

## Architecture
- Public HTML, CSS, scripts, images and videos are served as static assets from Cloudflare Pages.
- Student, teacher, course, admission, settings and result operations use the Firebase browser SDK, especially Cloud Firestore and Firebase Auth.
- The legacy GitHub Pages URL redirects to Cloudflare from HTML scripts when JavaScript is enabled.

## Findings, with source pointers

1. **Homepage data fan-out (moderate):** `index.html` reads published `courses`. `site-settings.js` reads `siteSettings/public`, `homepage-winners-public.js` reads `homepageWinners/current`, `hiring-board-public.js` reads `hiringBoard/current`, `exam-announcement-public.js` reads `examAnnouncements/current`, and `academic-year.js` reads up to four course documents in sequence until it finds a valid year. The costs are incurred per fresh page visit, not just per site deployment. Consider sharing already-fetched published course data and/or precomputed public metadata later, while preserving immediate unpublish and privacy behavior.

2. **Admin collection scans (priority when records grow):** `admin.html` uses unbounded `getDocs(collection(db,'students'))` in several workflows and `getDocs(collection(db,'examResults'))` in others. `admin-student-preview.js` also loads the whole student directory for a privileged course-first picker. These scans can slow admin screens and consume many Firestore document reads with a large student roster. Redesign those screens with course-aware paginated queries and explicit continuation; verify rules and selector behavior before modifying.

3. **Teacher subscriptions (monitor):** `teacher-login.html` keeps document listeners for linked teacher access and roster; admin preview mode also listens to a teachers directory. Subscription cleanup is present; confirm live active connections and read metrics before replacing working listeners.

4. **Large static assets (repeat-visitor performance):** Repository includes PNG backgrounds approximately 2.6 MB and 1.2 MB, plus MP4 assets approximately 3.7 MB and 2.7 MB. These are **repository file sizes**, not confirmed per-page network transfer. Repeated downloads can hurt mobile users. Add short browser caching for PNG/SVG and longer caching for MP4 through Cloudflare Pages `_headers` (this PR), then use browser Network panel before optimizing or re-encoding any actual critical-path assets.

5. **No measured load capacity:** Connection counts, p95 page load, Firebase daily usage and concurrent logins were not observed. Source review alone cannot establish whether 500–1,000 simultaneous logins will succeed.

## Safe next steps
1. Confirm Cloudflare Pages deploy of `_headers` and response `Cache-Control` on a media asset (not HTML or `firebase-config.json`).
2. Inspect Firebase Console > Firestore > Usage for reads, writes, active connections and daily peaks, plus Firebase Authentication usage. Monitor under normal traffic before deciding on billing.
3. Confirm students can log in, fee ledgers and published results work, and admin course-first lists still work after changes.
4. Test with synthetic/sample data in an emulator or separate staging environment, not thousands of real production reads/writes.
5. Plan course-based pagination for admin directory and removal of duplicate public course fetches in a later reviewed PR.
6. Set billing budgets and alerts before any Blaze upgrade; budget alerts do **not** cap spending. Confirm backups independently.

## Platform references
- Cloudflare Pages pricing: https://developers.cloudflare.com/pages/functions/pricing/
- Cloudflare Pages `_headers`: https://developers.cloudflare.com/pages/configuration/headers/
- Firestore quotas: https://firebase.google.com/docs/firestore/quotas
- Firestore usage monitoring: https://firebase.google.com/docs/firestore/monitor-usage

No student, teacher, authentication, database, or Firestore rules changes are part of this first performance patch.
