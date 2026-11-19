# Academy Website A–Z Operational Readiness Audit
**Reviewed:** 19 November 2026 (Asia/Kolkata)  
**Scope:** `main` at `3709b9146010f47a1c3fb682ecdf886bcb7a2731`, connected GitHub Actions evidence, source files, Firebase rule *source*, and proposed student-login improvement in this pull request.  
**Status:** **Conditional / not signed off for a 100% production guarantee.** This is a source + CI review, not an authenticated live-browser or Firebase Console audit.

## 1. ChatGPT independence: SOURCE PASS, provider continuity CONDITIONAL

- The site is a static HTML/JavaScript website deployed through **GitHub Pages**, with **Firebase Authentication + Firestore** for its private data and rules. Main-page scripts do not require a ChatGPT session, ChatGPT Plus/Pro subscription, or an OpenAI runtime API to operate.
- The latest Pages deployment job returned **success** on 19 November 2026, commit `3709b914` ([run 44555693723](https://github.com/alislaharabicacademy-eng/al-islah-arabiyya/actions/runs/44555693723)).
- Important outside dependencies remain: GitHub Pages, Google Firebase/CDN/Auth/Firestore, EmailJS for admission notifications, public visitor-counter service, and optional third-party libraries (PDF/XLSX/ZIP, fonts). Service outages, quota, domains, configuration or billing can affect the website. A successful deployment does not prove that every endpoint works.
- **No lifetime/zero-maintenance guarantee**: continue domain renewal (if applicable), backups, uptime checks, quota monitoring, access recovery and account ownership.

## 2. Feature and data-source consistency

| Area | What source review confirms | What still needs real-account testing |
|---|---|---|
| Public courses | Published course documents feed the public catalog; Admin course editor writes Firestore. | Verify each live name, status, fee, syllabus, books, eligibility and year display across Home / Explore / Course Details. |
| Admission form | `courses/admission-form-config` is the canonical Admin-controlled choice list. Duplication filtering and optional continuation restriction are implemented. New courses are mirrored to this list when created. | Verify the actual Firestore-configured options match course names; remove stale/hidden choices; submit application and check Admin queue, email and WhatsApp separately. |
| Student ID | Generated ALIA five-digit suffix/registry logic and approved account grants exist. | Verify actual unique ID creation, pending / approved / revoked behavior and browser refresh with a test guardian. |
| Student Login | **Current production method requires verified Firebase email/Google + ALIA ID + DOB.** Direct ID+DOB-only authentication is NOT implemented. | User's desired ID+DOB-only method needs a new, secure rate-limited server-side identity design; removing email checks client-side would expose private student records. |
| Student approval | Admin writes `studentAccess/{studentId}` with enabled state, email, DOB verifier, course, fees, assigned teachers and results. Firestore rule restricts reads to verified matching email or Admin. | Confirm a newly approved test guardian gains access immediately after saving, not only after manual refresh. This PR adds a verified-email live listener but is **not deployed** until merged/published. |
| Teachers / subjects | Teacher assignments are projected by course/batch into private student grants. Admin has a manual refresh and automatic sync on Teacher Directory load. | Test edit/rename/assign teacher → student portal reflects the exact subject, kitab and teacher; confirm no stale assignments. |
| Fees / salary | 12-month ledger includes future unpaid months as Pending, but excludes them from **due now**. Payment mirroring and salary calculations have CI regression tests. | Compare a real sample of paid/unpaid months, receipts, course-specific teacher splits and salary history between Admin and Student. |
| Attendance / postponement | Teacher submission, roster and Admin-approved reschedule structures/rules exist. | Check mobile teacher submission, Admin approval, date changes, attendance totals, no duplicate counting, monthly PDF/Excel export. |
| Results / certificates | Published results and certificate generation are present. | **BLOCKER:** issue #8 remains open: five premium previews versus downloaded PDF require real side-by-side, Chrome/Android and A4 long-name proof. |
| Principal / Admin / Letter Pad | Shared Admin verification and Master Admin rule model are implemented. Letterpad CI passed. | Check each signatory choice, preview/PDF agreement, mobile print; ensure admin privileges on future modules. |
| Existing-student intake | Main currently uses a **30-day expiring** private link. | **Mismatch with requested permanent Open/Close URL**: pending PR #43 is not live; Firestore security rules must deploy with that change. |
| Launch | Grand launch / practice routes exist with access restrictions and tests. | Test official ribbon flow with authorized Principal on scheduled date, device and account. |
| Data recovery | Encrypted Admin download and an opt-in daily managed Firestore backup workflow exist. | **Not verified** that scheduled backups were activated, executed, and restored. Authentication and Storage content need separate backup plans. |

## 3. CI and deployment health

- GitHub Pages: latest build **success** (19 Nov).
- Firestore rules: deployment **success** at commit `a7022398` on 19 Nov ([run 44505604317](https://github.com/alislaharabicacademy-eng/al-islah-arabiyya/actions/runs/44505604317)); no Firestore-rules changes in the subsequent seven commits. This is strong CI evidence of rule publication, not a read-back of current production rules.
- **Firebase Storage rules deploy FAILED** at commit `a41c43ae` on 19 Nov ([run 44505803142](https://github.com/alislaharabicacademy-eng/al-islah-arabiyya/actions/runs/44505803142)): `Permissions denied enabling firebasestorage.googleapis.com`. Owner needs to enable the API / adjust the deployment identity as appropriate, then re-run and verify. Do **not** assume teacher document uploads work.
- Student/course/fee/salary/academic/role/rescheduling tests have successful historical workflows. A green workflow is not equivalent to a full production data audit.
- Public custom domain, authorized Firebase Auth domains, actual EmailJS account/template delivery, quota and uptime were **not verified** through providers.
- Separate open draft/PRs for permanent registration link (#43), theme (#49), admission confirmation email (#53) must not be assumed published.

## 4. Security and readiness requirements

1. **Never remove verified Firebase authentication merely to make ALIA ID + DOB work.** Date of birth is guessable and private student records need server-enforced authorization. If ID+DOB-only is required, build an authenticated backend with rate limits, abuse detection, and a stronger enrollment secret or OTP.
2. Use a **non-production test student/guardian account**, Admin account and teacher account; do not share actual DOB, Aadhaar, salaries or account passwords in public issues or screenshots.
3. Confirm approve → student access; revoke → student loses access; wrong ID/DOB/unverified/wrong email are denied; teacher + student see only their assigned records.
4. Check mobile Android Chrome, desktop Chrome, slow network, PDF print, permission errors, and empty/error states.
5. Close the Storage deployment blocker and issue #8 before claiming every feature works properly.
6. Activate/verify backups with a test restore and document admin access recovery. A public GitHub repository makes its source/rules visible; do not commit secrets or personal-data backups.

## 5. Release verdict

**ChatGPT independence:** supported by current architecture and static code; no ChatGPT subscription is needed for normal website operation.  
**“Everything runs smoothly, all settings correct, and secure student login is guaranteed”: NOT PROVEN** without real production browser/Firebase checks and outstanding fixes.  
**This PR:** adds auto-refresh of verified student access when Admin grants, disables, or changes student records, and a regression workflow. It preserves the existing verified-email security boundary; it does not implement DOB-only authentication.  
**Next gate:** CI green → test student approval/revocation with verified separate accounts → review and merge → confirm successful Pages deployment → close additional blockers.
