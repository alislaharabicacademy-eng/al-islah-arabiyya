# Course-wise customizable teacher salary allocation

## Admin workflow

1. Admin → **Fees & Salary Management** → **Open Salary Split Calculator**.
2. Set the selected reporting month to preview how paid student fees are allocated.
3. Under **Course-Wise Custom Salary Rules**, choose a course (and, if needed, a specific batch). Leave batch blank to apply to the entire course unless a more-specific batch rule exists.
4. Add each teacher in **Teacher Directory → Assign Class / Subject** first. The editor only accepts active teachers with a matching course/batch assignment; one teacher may appear in many different courses.
5. Choose a method and the per-student monthly fee:
   - **₹ per paid student:** enter each teacher's full-fee share (e.g., 500 → 200 + 200 + Academy 100). On partial receipts, amounts scale proportionally.
   - **Percentage:** enter different teacher percentages (e.g., 40% + 35%; Academy gets remaining 25%). If a student pays less, shares scale with their receipt.
   - **Fixed monthly salary:** enter each teacher's contracted monthly salary, independent of student receipts. Academy balance can be negative when fees are insufficient.
6. Review the live calculation, set the effective month, and **Save New Rule**. Saving adds a new revision. Previous revisions are not edited in the Admin UI.
7. Set the report month and click **Calculate / Refresh**. A teacher working in Muallama + Aalima appears in one combined teacher salary breakdown. Export CSV for Excel.

### Examples

| Course | Student fee | Teachers' full-fee shares | Academy full-fee remainder |
|---|---:|---|---:|
| Muallama | ₹500 | ₹250 (one teacher) | ₹250 |
| Muballigha | ₹500 | ₹200 + ₹200 (two teachers) | ₹100 |
| Aalima | ₹1,200 | ₹800 (one teacher currently) | ₹400 |
| Another future course | Custom | Any approved shares or percentages | Calculated remainder |

Muallama, Muballigha and Maktab retain their legacy read-only default rules until explicitly customized. Aalima and new courses require an admin-created rule before the fee split calculator can allocate their receipts.

### Rule history

Policies are saved in private Firestore collection \`salarySplitPolicies\`, restricted to authorized admins in \`firestore.rules\`. A policy consists of \`courseId\`, optional \`batch\`, and append-only \`revisions\` (effective month, method, monthly fee, teacher ID/name snapshot, allocation, creation date). The editor only allows later-effective revisions. A Firestore transaction ensures two admins cannot silently overwrite each other's changes.

**Do not merge the feature without deploying updated Firestore rules.** After deployment, open the Finance panel and confirm the editor can read the collection. If rules are missing the calculator intentionally remains in legacy read-only preview mode.

### Financial controls and limitations

- **Fee receipts:** Only saved "Paid" ledger entries count as collected; unpaid entries only affect projected tuition. Refunds/adjustments must be entered by the Admin in the underlying fee ledger first.
- **No automatic salary payment:** Calculations are **entitlements/estimates**. The existing Teacher Attendance & Payroll and Teacher Salary Register remain the official payment record. No code in this change marks salary "Paid".
- **Fixed salary method:** Due independent of fee receipts and displayed separately from salary allocated out of paid fees; negative Academy balance is possible.
- **Historical rule revisions:** A new revision does not rewrite earlier policies. The existing student's fee ledger and teacher records remain editable by Admin, so previously computed *previews* can change if underlying records are backdated or changed. Already-recorded payroll history is preserved.
- **Course-level vs batch-specific:** A batch-specific rule takes precedence over a course-wide rule for students in that batch when the batch rule is effective. Avoid overlapping fixed-monthly contracts unless both are intentional.
- **Teacher changes:** Update Teacher Directory class/subject assignment first and add a future-effective revision whenever the teaching team changes. No automatic equal split occurs without Admin confirming shares.
- **CSV:** The report is downloadable as CSV (opens in Excel); existing payroll PDF features still operate separately. A consolidated custom-split PDF is not yet built.

### Launch acceptance

- Verify Muallama ₹500 → ₹250 teacher / ₹250 Academy.
- Verify Muballigha ₹500 → two teachers × ₹200 / ₹100 Academy.
- Create Aalima ₹1,200 → one teacher ₹800 / ₹400 Academy; verify the same teacher also teaching Muballigha receives both shares exactly once.
- Add second/third teacher with a *new* effective month; verify older months retain previous allocations.
- Test custom ₹ per student, percentage and fixed salary, with full-paid, partially paid and unpaid students.
- Test new course and batch overrides; duplicate teacher, shares exceeding fees, and unassigned teacher must be blocked.
- Verify admin-only policies are not readable by teacher or student logins.
- Verify no teacher salary is marked Paid just by calculating or saving a rule; verify current salary PDFs still work.
- Check mobile layout and CSV download on Android Chrome before marking production ready.
