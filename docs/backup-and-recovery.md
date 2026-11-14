# Madrasa Al Islahul Arabiya — Secure Data Backup and Recovery

## Current protections

Firestore security rules restrict teacher, student, salary, registration and audit data to the verified madrasa administrator. Salary change audit records are append-only. These protections do **not** replace a database backup.

## Managed automatic Firestore backups — requires one-time administrator activation

Firestore supports first-party scheduled backups with daily or weekly recurrence. They create database-consistent backup snapshots managed by Google Cloud. They **do not** start just because the GitHub workflow file exists; setup must succeed before a schedule is active.

1. Review Google Cloud Firestore backup costs and authorize billing for project `al-islah-arabic-academy`. The schedule can create ongoing usage charges.
2. In Google Cloud IAM, grant **`roles/datastore.backupSchedulesAdmin`** to the existing deployment service account `github-firebase-rules-deployer@al-islah-arabic-academy.iam.gserviceaccount.com`. Do not generate or upload a private service-account key; the repository already uses keyless Workload Identity Federation.
3. In GitHub, open **Actions → Enable Firestore Daily Managed Backups → Run workflow**. Only the repository owner should do this.
4. Verify that the workflow succeeds. In Google Cloud Console → Firestore → Database → Scheduled backups, verify **Daily**, retention **28 days**.
5. After the first daily run, verify that a real backup is listed, and periodically perform a test restore **into a separate database**, not the live production database.

The workflow is idempotent: if a daily backup schedule already exists, it does not replace it. Firestore decides the actual daily backup time. Existing backups eventually expire according to configured retention (28 days in this workflow). It is **not** an archive held forever.

**Important scope:** Firestore scheduled backups cover Firestore documents and indexes, including nested attendance collections and saved salary history. They **do not** cover Firebase Storage uploads (teacher photos/certificates), Firebase Authentication accounts, this GitHub source code, or other external services. Those services need their own backup and recovery plan.

## Encrypted downloadable administrator snapshot

Within Admin Panel → Teachers & Students → Teacher Directory & Management → **Secure Data Backup**, an authorized administrator can manually download an encrypted JSON copy of permitted Firestore collections. No secret or exported private data is sent to GitHub.

The archive is encrypted locally in the browser using AES-256-GCM and a password-derived key (PBKDF2-SHA-256, 310,000 iterations, random salt and IV). **The passphrase cannot be recovered by us.** Store it securely in a password manager, separate from the backup file. This browser copy reads collections one after another, so unlike Firestore managed backups it is **not** a transaction-consistent database snapshot. The archive does not contain binary Firebase Storage uploads.

### Recovery cautions

- Keep at least two separate copies of important backups.
- Confirm Firestore managed backups are actually being created. A configuration file in GitHub is not enough.
- Managed restore creates a new Firestore database. Test and plan the cutover carefully, rather than overwriting current live data.
- Browser archive encryption alone does not provide a one-click restore; restoring must be reviewed to preserve Firestore timestamp types, document IDs and nested paths without corrupting existing data.
- Never commit downloaded personal-data archives or secret passphrases into the public GitHub repository.

References:
- https://firebase.google.com/docs/firestore/backups
- https://firebase.google.com/docs/firestore/security/iam
