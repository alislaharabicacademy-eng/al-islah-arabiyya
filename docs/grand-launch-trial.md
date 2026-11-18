# Grand Website Launch — Online Trial (21 November 2026)

This is the **repeatable rehearsal only** for the Women's Online Madrasa website grand inauguration. The real one-time official ceremony will only be implemented/enabled after the Academy approves the trial.

## Host / screen share (Academy Admin)
1. Sign in as an authorised Admin at `grand-launch.html?role=host` (Google or existing Admin email/password).
2. **For a two-device rehearsal:** In the Academy Admin Panel, open **Management → Principal Login · Ceremony**. Enter the Principal's own verified Google email and click **Save Principal Login Access**. The Host page also has a Save Principal Access field. Never use another person's account. **For one-device trial:** you can skip Principal registration.
3. Privately send the Principal this page: `grand-launch.html?role=principal`.
4. Share the **Host Browser Tab** on Google Meet or Zoom, ideally full-screen. If you play a separate intro video, enable sharing its audio. No audio is required for the countdown itself.
5. Press **Start 10-second Trial**. Both browsers synchronise to the Firestore timestamp and show **10 → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1**.
6. After countdown, the Principal's phone displays **CUT THE RIBBON**. The Host can also click **TEST CUT HERE · HOST TRIAL** or tap the scissors on the shared Host screen to practise alone. The Principal's verified login is required for the two-device ceremony, not for an Admin-only rehearsal.
7. The Host screen shows the scissors, splitting ribbon, and confetti, then opens the existing homepage automatically. This is a *trial homepage reveal*, not a website publication or official launch.
8. To rehearse again, return to `grand-launch.html?role=host` and press **Reset & Try Again**, then **Start 10-second Trial**.

## Principal (mobile)
1. Open `grand-launch.html?role=principal`.
2. Sign in with the exact verified Google account that the Host saved; remain on the page.
3. Wait for 5 → 1 and the appearance of the ribbon.
4. Tap **CUT THE RIBBON** **or the scissors icon** when enabled. The Host's shared screen will animate. If the button fails, report the message shown on the page to the Admin.

## Safety / verification
- Trial and Official Launch are **not** the same data. This change contains no official launch button and cannot mark the Academy officially inaugurated.
- Admin can reset a trial; Principal cannot reset, edit permissions, or change any Academy data.
- The verified Principal **or an authorised Admin running a solo trial** can change the trial state from `countdown` to `cut`. Firestore security rules enforce a 10-second wait and prevent a second cut in the same round. The Host's control is labelled **TEST CUT** and never performs an official inauguration.
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

## Main Ceremony Preview — full dress rehearsal that can be reset
This is intentionally **NOT** the one-time official ceremony. It looks and behaves like the final reveal, while continuing to write ONLY the existing resettable `grandLaunch/trial` document. No official launch date or public launch record is ever created by this page.

1. Host (authorised Academy Admin) opens `grand-launch.html?role=host&mode=main-preview` in a desktop browser; a **MAIN CEREMONY PREVIEW · NOT OFFICIAL** banner remains visible.
2. Host privately shares the `Open / share Principal control page` link from the preview screen; it automatically preserves `mode=main-preview`.
3. Principal signs in with the approved Principal Google account; verified Master Admin may act as authorised backup. Normal Admin can rehearse from Host, but cannot impersonate the Principal.
4. On Google Meet / Zoom, Host shares the preview browser tab. Click **Start Main Ceremony Preview**. Both screens show 10 → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1.
5. Principal clicks the ribbon on her own screen. After the Firestore server confirms a valid cut, the Host shows the scissors, split ribbon, confetti, and a **full-size live homepage preview** inside a framed browser view.
6. The Host sees a permanent **MAIN CEREMONY PREVIEW · NOT OFFICIAL** strip above the homepage and a **Reset & Rehearse** button. Clicking it resets rehearsal in Firestore and closes the preview, ready for another test. The Principal cannot reset or change the Principal access settings.
7. You can switch back to the normal Trial mode using **Return to Regular Trial** on the Host page. The two rehearsal styles share the same trial state and should not be run simultaneously on different hosts.

**Approval gate:** After the user confirms that the dress rehearsal looks correct, implement a separately authorised final one-time ceremony. Never call a resettable preview a final launch. Once the real launch is officially confirmed/recorded it must not be reset by the trial controls.

## Official Opening — Saturday, 21 November 2026 (Asia/Kolkata)

**Preparation can happen now; the official countdown and one-time ribbon cut are locked until Saturday, 21 November 2026, India time.** No official record is created by deploying code, opening the page or pressing ARM.

### Before the parents' Google Meet / Zoom
1. Open Academy Admin → Management → **Official Inauguration · 21 Nov**, or use `grand-launch.html?role=host&mode=official`.
2. Sign in with the **existing verified Master Admin account**. Other verified Admins can see the Host screen to share it, but cannot ARM, START or CANCEL the real ceremony.
3. Enter the confirmation text **LAUNCH 21 NOV 2026** and select **ARM OFFICIAL CEREMONY**. Confirm the prompt. This only records readiness; it **does not** start the countdown or launch the website.
4. Keep the current Principal login registered in Admin Settings. Do **not** replace it with a second email. The already-authorised Master Admin is a private backup for Principal access.
5. Test the complete animation with `grand-launch.html?role=host&mode=main-preview`. It is fully resettable. **Never rehearse through the actual Official mode.**
6. Arrange two devices: Host/Admin laptop shares the Official Host screen; Principal mobile opens the private link from the Official Host panel, `grand-launch.html?role=principal&mode=official`, with her own verified Google sign-in.
7. Open an additional browser tab with `index.html` as a fallback if the meeting connection fails.

### On Saturday, 21 November 2026 — actual event
1. Once the parents are watching the shared Host screen and the Principal is signed in, Master Admin clicks **START FINAL COUNTDOWN** and confirms.
2. Both displays show **10 → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1**. Only the Principal/Master-backup screen can execute the real cut. The Host screen scissors are **not clickable** in Official mode.
3. The Principal clicks **CUT THE OFFICIAL RIBBON · ONE TIME**, confirms the *irreversible* action and waits for the secure server response. The single `grandLaunch/official` document records `launchedAt` (server timestamp), `launchedBy`, and the ceremony date.
4. Only after successful server confirmation, the Host displays the scissors splitting the ribbon, golden confetti, **WEBSITE OFFICIALLY LAUNCHED**, then reveals the real homepage inside the presentation screen.
5. Once the official record exists, **no client account can edit, delete or reset it**. Reloading the Host screen shows the saved official inauguration status without replaying the ceremony.

### Safety and recovery
- Official mode uses `grandLaunch/officialControl` plus an immutable `grandLaunch/official` record; Trial and Main Preview use only `grandLaunch/trial`. The two never share launch status.
- Before the Principal clicks the final ribbon, Master Admin may select **Cancel Countdown (Before Cut)**. This returns the ceremony to Armed status so the Master can restart on the event day. Once the ribbon is officially cut, this control is disabled server-side.
- The server rejects an early cut, an unverified/unregistered Principal, a normal Admin trying to arm, repeated official cuts, attempts outside 21 Nov India time, and every deletion/update of the official record.
- Security rules verify **India time**, not the device clock. Local device time is used only for friendly button status messages.
- The website homepage is **already publicly accessible** before the ceremony. The ribbon-cutting is a symbolic grand inauguration and creates the official audit record; it does not magically publish or hide the website domain.
- The Master identity remains absent from the new ceremony UI. Existing repository permissions and earlier rule source remain as they were; do not interpret hiding the label as secrecy of a public GitHub repo.
- If the Principal's phone loses internet or the authenticated cut fails, do **not** claim a launch. Check Host status first, restore the connection, and retry only if the server still reports no official record.

**Acceptance gate:** This feature must pass CI, merged-site deployment, and a *non-destructive* browser check before event day. Only the real action on 21 November can be the one-time inauguration.
