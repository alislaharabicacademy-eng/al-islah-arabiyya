# Examination Results and Certificates — Academy Admin Guide

## Enter and publish a result

1. Sign in at the Admin Panel with the verified academy administrator account.
2. Go to **Academics → Exam Results & Certificates**.
3. Select an enrolled student and enter exam title, date and academic year.
4. Add subject-wise marks and maximum marks. The default pass mark is 40% **per subject**.
5. Save as a **Private Draft** and verify all marks carefully.
6. Click **Publish Result** and confirm. Publication is a deliberate admin action.
7. Copy the resulting private link and share it only with the appropriate parent or student.

Grading uses total weighted percentage: A+ ≥90; A ≥80; B ≥70; C ≥60; D ≥50; E below 50. Passing requires every subject to meet the configured minimum.

## Public result lookup

Published results can be looked up at **exam-results.html** by using the exact cryptographically random reference. There is no public listing or search by student name. Anyone who holds the link can see that student's name and marks. To disable access, **Unpublish** the result.

## PDF and certificate downloads

- **Result PDF:** Subject marks, total, percentage, grade and result code.
- **Certificate PDF:** A4 landscape with official academy logo, central transparent watermark and examination reference.
- PASS results receive a **Certificate of Achievement**. Non-passing results receive a **Certificate of Participation**, not a misleading achievement certificate.
- These examination certificates do **not** claim completion of an entire course.
- PDFs are generated in the browser from the currently published result; the Firestore result is authoritative.

## Data and backups

Only the verified admin can write, list, publish or unpublish exam results. Public visitors may retrieve one published result through its unpredictable reference and cannot read drafts, student contacts or guardian details. The encrypted manual Firestore backup now includes the **examResults** collection as well.

Newly entered results are stored in the same Firestore project. Actual exam marks must be entered and published by admin; deploying the feature never publishes any existing examination marks automatically.
## Student ID + DOB lookup (without a per-exam reference code)

The result checker supports two separate ways to find published results:

1. **Student ID + Date of Birth:** Open Admin Panel → Students → Student Details. Edit each student and save the **Date of Birth**. Copy the confidential, permanent **Student ID** from that student's card and share it with the appropriate guardian. When a result is published, a private SHA-256-based lookup key is generated locally from the opaque Student UUID and DOB. The key maps to result references; it contains no student name or DOB. The guardian can open `exam-results.html`, enter Student ID and DOB, and see all published examinations for that student.
2. **Result Reference Code:** The existing private exam-specific `RESULT-...` code remains a supported alternative. It also works when no student DOB has been recorded.

Student DOB is stored in admin-only **students** data. The public Firestore lookup collection `examResultLookups` exposes only exact-key reads when enabled, and does not allow listing. A Student ID must be treated as a private identifier, not published as part of a public roster. DOB alone is not a strong password; this approach depends on the Student ID remaining confidential and random.

The displayed confidential Exam Student ID is generated as a separate random UUID and is **different from the internal Firestore document ID** (which may appear in published result record metadata). This prevents a person with one result reference from deriving the login lookup key from a public record. Enter or update the DOB in the Student Details form and Save to automatically create the confidential Exam Student ID for older students, too. When DOB changes, saving the student record disables the old lookup key and regenerates the index for the new DOB. When a result is unpublished, its reference is removed from the index. Result records themselves remain the source of truth; a lookup cannot bypass the published-only Firestore rule.

Existing students without DOB need their DOB recorded in Student Details. Published exams are indexed when DOB is added or a result is published. For privacy, no public search by student name or list of all students exists.

## Homepage Menu and Student Result Login

The public homepage has a responsive **Menu** button for phones and small laptops. Its **Student Access** section links to **Student Login** (`student-login.html`) and **Online Exam Results** (`exam-results.html`). On wide desktop screens both links are also available in the top navigation.

The Student Login page validates the confidential Exam Student ID and DOB **only for finding published exam results**. It lists the student's published examinations and links to the printable result and certificate. It intentionally does not expose attendance, fee balances, address, phone number or private student records. It is **not a Firebase Authentication user account**, and DOB must not be treated as a strong password. Admin issues the independent confidential Exam Student ID from Student Details after saving the student's DOB; share privately with the guardian.

## Real student Firebase account login (new)

**Student Login** at `student-login.html` now uses Firebase Authentication, not just a Student ID + Date of Birth check. Google Sign-In and email/password login are supported; email/password users may create their own accounts, must verify their email, and may reset their password. Authentication alone **does not give access** to a Madrasa student profile.

**How admin approves a student account:**

1. Go to **Admin Panel → Teachers & Students → Student Details**.
2. Locate the enrolled student and press **🔐 Student Account Login** on the student's card.
3. Enter the student's or an approved guardian's actual email address. One guardian email can be granted access to more than one student where appropriate.
4. Press **Save & Approve Account** and confirm. The email owner creates/signs in to their own Firebase account and verifies their email. **Do not collect or set student passwords in Admin.**
5. The student then opens the homepage menu **Student Login**, signs in with verified email and password (or Google), and sees authorized student profile cards and **published** examination results. They can open each result to download its result PDF and certificate.
6. Use **Disable Account Access** at any time to revoke the student's private dashboard access. Deleting a student also deletes their student account access grant.

**Security:** Firestore `studentAccess/{studentId}` documents are written only by the verified academy administrator. Student reads require a verified Firebase Auth email matching the document's `email` exactly and `enabled == true`; list queries restrict both fields. These documents include only a student name, course, batch, enrollment status and a list of *published* exam references. No DOB, contact number, guardian details, fees, attendance, password or private student profile is exposed through this access grant. The original `students` collection stays admin-only. Published results are retrieved individually and always rechecked for publication and student ownership in the app.

The public Student ID + DOB exam checker remains separately available at `exam-results.html`. It is **not** the account login. Student access to fees, private attendance and other records is not included in this release and requires separate explicit security rules and UI work.

**Important operational check:** Firebase Authentication must have the desired sign-in methods enabled (Email/Password and/or Google), and this GitHub Pages domain must be in Firebase Authentication authorized domains. Google admin login and password login are already integrated in the project, but real student signup / login should be tested with an administrator-approved verified test email.
