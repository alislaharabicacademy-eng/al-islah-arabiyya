# Student Login: ALIA ID + Date of Birth (no Gmail)

The student portal now accepts **only** the official ALIA student ID (e.g. `ALIA00001`) and date of birth (`YYYY-MM-DD`). It does not open the Firebase/Google/Email login screen. **Teacher and admin login are unchanged.**

## Deployment (required before the website goes live)

This repository is hosted on GitHub Pages. HTML changes alone are **not sufficient**. The server-side checker is a Firebase 2nd generation callable Cloud Function in `functions/index.js`. It needs a Firebase project with Cloud Functions billing enabled (typically Firebase Blaze) and a deployment authorized by the Academy project owner. **No live deployment is performed by this pull request.**

From the repository root, using the correct Firebase project (`al-islah-arabic-academy`), deploy the Firestore rules and function *before* merging/publishing the new GitHub Pages frontend:

```sh
npm install --prefix functions
firebase login
firebase use al-islah-arabic-academy
firebase deploy --only firestore:rules
firebase deploy --only functions:studentLoginByIdDob
```

Deploy the function to **asia-south1**; the frontend calls this exact region. Confirm the function is callable by an unauthenticated browser on the academy's GitHub Pages domain. Then merge/publish the frontend. If the backend cannot be deployed, do **not** publish the new student frontend; it will show a service error.

## Access and privacy

- The Cloud Function reads the ID registry and private `students` collection, checks DOB on the server, then returns only the student's own dashboard data. Browsers never directly read `students` or `studentAccess`.
- A student with a valid saved ALIA ID and DOB is enabled automatically unless an administrator explicitly disabled that student in Student Details → Student Login.
- Login attempts are limited to 6 per student ID and 40 per IP address per 15 minutes. Throttle records are server-only. The browser clears DOB after each attempt, and logout/switching clears the dashboard. There is no long-lived student session.
- Firestore `studentAccess` is now **admin-only**, removing old verified-email client reads. Do not weaken this rule to make the portal work. Teacher invitation/Google authentication retains its existing rules.
- **Security tradeoff:** ID + DOB are often discoverable. This is inherently weaker than Google/email verification or a private PIN; rate limiting cannot stop someone who already knows both. The portal includes fee history, so the Academy should consider whether these records are appropriate under this weaker login choice. For higher privacy, require a separate secret, even though the requested current flow does not.
- This changes **student login**, not the separate email-based student profile update request feature.

## Manual verification checklist (test with non-real sample student records)

- [ ] Valid `ALIA00001` + correct DOB opens only that student's dashboard, without Gmail, email, or approval prompts.
- [ ] A student with no `studentAccess` record but valid ID + DOB logs in.
- [ ] A student previously linked to a parent email can log in without that email.
- [ ] Wrong DOB or unknown ID produces the same general error and no student details.
- [ ] Invalid formats and impossible dates are rejected.
- [ ] A disabled student's credentials cannot open the dashboard; re-enabling restores access.
- [ ] Repeated wrong attempts trigger the temporary rate limit.
- [ ] Student switch and logout clear prior student name, fee data, results and DOB.
- [ ] Student can see their own class, photo (if set), published exam results, certificates, promotions and fee history; cannot see any other student's details.
- [ ] Result/certificate download works on Chrome desktop and Android Chrome.
- [ ] Direct Firestore reads of `students` and `studentAccess` from an unauthenticated client remain denied.
- [ ] Teacher/admin Google login and their protected pages still work.

No tests requiring a live Firebase project or real student data have been run by this PR.
