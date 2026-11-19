# al-islah-arabiyya
Official Website of Madrasa Al Islahul Arabiya


## Academy administrator permissions

The verified Master Admin account is identified **server-side** by `isMasterAdmin()`
in `firestore.rules`. It must be included through `isAdmin()` for **every current
and future** Academy administrator operation. Master-only tasks use
`isMasterAdmin()`. The Academy contact Gmail remains a Normal Admin.

**For every new Admin feature:** use
`isVerifiedAcademyAdmin(db, auth.currentUser)` from
`academy-admin-access.js` in browser UI gates, and protect the underlying
Firestore read/write with `isAdmin()` or `isMasterAdmin()`. Never gate
an Admin feature on the Academy contact email alone, and do not expose
the private Master email in public HTML/JavaScript. Grant changes and audit
logs stay Master-only.

For uploads, keep `storage.rules` consistent with the same role tiers.
After merging changes to security rules, **deploy and verify them in Firebase**;
merging website files by itself does not update a running Firebase Rules
configuration. Use `node --test tests/master-admin-consistency.test.mjs`
to detect regressions. This policy covers Academy app permissions, not
GitHub, Cloudflare, Firebase Console, or other provider account ownership.
