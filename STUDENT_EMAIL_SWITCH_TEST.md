# Student portal: choose email before Student ID / DOB

## Intended behavior

1. Student Login opens on **Step 1 — Choose Email Account**.
2. If an existing verified account is remembered, show its actual email and clear options: **Continue with This Email** or **Choose a Different Google Account**.
3. Choosing a different account signs out of Firebase Authentication first, then starts the Google account picker with `prompt=select_account`. It must not silently reuse the earlier Gmail.
4. Google sign-in or email/password login advances to **Step 2 — Student ID & Date of Birth**. The user can change the email again here.
5. The existing Firestore `studentAccess` rule still requires this exact verified email to be approved for the entered ALIA ID. The student dashboard provides a **Change Email** button even if there is a no-access message. On success, result, fee and certificate functionality is unchanged.
6. Changing the Student ID keeps the current email. **Sign Out** clears the current Firebase session and returns to Step 1.

## Manual acceptance checklist

- [ ] Open Student Login on Android Chrome while signed in as the academy admin; Step 1 shows the current email, not the private dashboard.
- [ ] Tap **Choose a Different Google Account**. Google account selection appears and the previous Gmail is no longer silently reused.
- [ ] Select a second, verified Gmail that is approved for ALIA student A; Step 2 appears with the new email shown.
- [ ] Enter student A's correct ALIA ID and DOB; dashboard opens with only student A's own information.
- [ ] Tap **Change Email** from dashboard, select another approved email, and enter its matching student ID/DOB. The old student's data must disappear.
- [ ] A Gmail not approved for the entered ID is denied, with a clear **Change Email** recovery button.
- [ ] An unverified email is stopped at email verification.
- [ ] Wrong DOB, a mismatched ID, and an inactive student access record do not show private data.
- [ ] Signing out clears student data and returns to Step 1.
- [ ] Email/password sign-in still works; teacher/admin flows and Firestore rules remain unchanged.
- [ ] Confirm on mobile portrait and desktop Chrome.

## Deployment note

This PR makes **frontend-only changes** on top of main. It requires no new Firebase Cloud Function, no billing upgrade, and no Firestore rule changes. Merge and publish the GitHub Pages site to activate. Google/Firebase Authentication must already be correctly configured for the site's domain. Existing student email approval is still required.

**Password terminology:** The current portal verifies the student ID and **DOB** as Step 2. DOB is not a separately issued student password. A real per-student password would require an additional secure server-side design and is not included here. Previous draft PR #12 (DOB-only without email) implements a different approach and must not be merged together with this flow.

Code syntax and DOM IDs were inspected. No live authenticated browser or production Firestore tests have been performed.
