# Grand Website Launch — Online Trial (21 November 2026)

This is the **repeatable rehearsal only** for the Women's Online Madrasa website grand inauguration. The real one-time official ceremony will only be implemented/enabled after the Academy approves the trial.

## Host / screen share (Academy Admin)
1. Sign in as an authorised Admin at `grand-launch.html?role=host` (Google or existing Admin email/password).
2. **For a two-device rehearsal:** In the Academy Admin Panel, open **Management → Principal Login · Ceremony**. Enter the Principal's own verified Google email and click **Save Principal Login Access**. The Host page also has a Save Principal Access field. Never use another person's account. **For one-device trial:** you can skip Principal registration.
3. Privately send the Principal this page: `grand-launch.html?role=principal`.
4. Share the **Host Browser Tab** on Google Meet or Zoom, ideally full-screen. If you play a separate intro video, enable sharing its audio. No audio is required for the countdown itself.
5. Press **Start 5-second Trial**. Both browsers synchronise to the Firestore timestamp and show **5 → 4 → 3 → 2 → 1**.
6. After countdown, the Principal's phone displays **CUT THE RIBBON**. The Host can also click **TEST CUT HERE · HOST TRIAL** or tap the scissors on the shared Host screen to practise alone. The Principal's verified login is required for the two-device ceremony, not for an Admin-only rehearsal.
7. The Host screen shows the scissors, splitting ribbon, and confetti, then opens the existing homepage automatically. This is a *trial homepage reveal*, not a website publication or official launch.
8. To rehearse again, return to `grand-launch.html?role=host` and press **Reset & Try Again**, then **Start 5-second Trial**.

## Principal (mobile)
1. Open `grand-launch.html?role=principal`.
2. Sign in with the exact verified Google account that the Host saved; remain on the page.
3. Wait for 5 → 1 and the appearance of the ribbon.
4. Tap **CUT THE RIBBON** **or the scissors icon** when enabled. The Host's shared screen will animate. If the button fails, report the message shown on the page to the Admin.

## Safety / verification
- Trial and Official Launch are **not** the same data. This change contains no official launch button and cannot mark the Academy officially inaugurated.
- Admin can reset a trial; Principal cannot reset, edit permissions, or change any Academy data.
- The verified Principal **or an authorised Admin running a solo trial** can change the trial state from `countdown` to `cut`. Firestore security rules enforce a 5-second wait and prevent a second cut in the same round. The Host's control is labelled **TEST CUT** and never performs an official inauguration.
- The Host/Admin can repeat a new round by resetting or starting the countdown again.
- The principal's Gmail must already be an eligible Google account and Firebase Google Authentication must be enabled for the project.
- Google Meet / Zoom screen share, browser audio/video, and real smartphone operation still need human validation. Test Chrome desktop and Android mobile, including loss of network and a second tab.
- For live use, ensure updated Firestore rules have been deployed. GitHub workflow `Deploy Firebase Firestore Rules` is configured to run when `firestore.rules` changes on `main`. Verify workflow success before running trial.

## Acceptance tests
1. Host/Principal sign in from separate devices and the correct authorised account; wrong and unverified accounts cannot enter.
2. 5, 4, 3, 2, 1 is correctly visible to viewers, and the ribbon is not cut prematurely.
3. Principal taps once (or Host taps scissors / TEST CUT in a single-device practice). Host sees cut animation, confetti, and homepage; phone shows completion when involved.
4. Double-click, unauthorised accounts, and repeated cut attempts do not make a second cut in the same trial.
5. Host resets and starts another practice successfully.
6. There is **no Official Launch control** until the Academy explicitly approves and tests a separate one-time launch feature.

## Troubleshooting: scissors appear but ribbon does not cut
- On the Host page you must click **TEST CUT HERE · HOST TRIAL** or the scissors icon; in a full ceremony the Principal may click on her separate verified Google login screen.
- If a message says **permission denied**, check that the full countdown finished, the account is authorised and Firebase security rules are deployed.
- A browser may cache an old script. Refresh the Host and Principal pages before repeating the trial.
- A cut animation appears only after the server accepts the request. This avoids celebrating a denied optimistic Firebase write.

## Principal Login setup
- The Academy Admin may register a Principal's Google email in **Admin → Management → Principal Login · Ceremony**, then copy the private Principal link.
- The website hamburger menu also includes **Principal Login** for the Principal to open on their device. Authentication and Firestore still protect access; merely having the URL provides no permissions.
- If access is denied, the email has not been saved or a different Google account was selected. Use **Use a Different Google Account** on the Principal Login page.
- The Principal Gmail is never written to public website settings. Principal access does not grant access to the Admin dashboard, student data or other Academy records.

## Quiet Master Admin backup for the ceremony
- The registered Principal’s verified Google account stays as the single account shown in Admin → Principal Login. It is not replaced or changed.
- The existing verified Master Admin can also sign in on the **Principal Login** ceremony page as a backup. The page confirms this via the existing server-protected role check rather than a second published email field.
- No additional Master Admin email is stored in public site settings or written into the ceremony page or scripts. This change does not alter the Academy’s existing privileged Admin authentication configuration or Firestore role rules.
- A normal Admin (who is not the registered Principal) still cannot enter the Principal screen. The Principal does not receive Admin permissions.
- This hides the backup email **from the ceremony user interface**; it does not retroactively erase any address already present in the repository's existing Firestore rules or other administrator records.
