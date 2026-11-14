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

## Official automated Student ID — ALIA + five digits

Every new student saved in **Admin → Student Details** is assigned an automatic, permanent official Student ID: **ALIA00001**, **ALIA00002**, **ALIA00003**, … **ALIA99999**. IDs are generated by a Firestore transaction that increments the admin-only `academyCounters/studentIds` record and permanently reserves the issued code at `studentIdRegistry/ALIA00001` (for example). Concurrent administrators cannot receive the same number. Existing valid ALIA IDs are never changed on edit, and deleted IDs are not reused. Existing legacy AIL-prefixed records are migrated to ALIA on edit or bulk assignment, retaining the same five-digit serial.

For previously registered students without a code, open **Student Details** and click **✨ Generate ALIA IDs for Existing Students** once. Existing codes are preserved; missing codes are assigned sequentially and safely. You can copy the official ALIA ID from each student's card. The same official ID appears in verified Student Account dashboards and on **newly published** exam results, result PDFs and certificates. Existing published result documents without an ID continue to display "Not recorded" until reviewed and republished.

**Do not use predictable ALIA roll numbers as authentication credentials.** Student Account Login requires a verified Firebase email/password or Google login and an explicit admin approval. The old public examination result checker accepts a separate, confidential **Exam Access ID (UUID)** plus Date of Birth. This is **not** ALIA00001; it is not safe to use sequential IDs plus DOB as access controls.

## Student Login now starts with ALIA Student ID + Date of Birth

The `student-login.html` page now begins with two clearly labeled inputs: **Official Student ID** (`ALIA00001` format) and **Date of Birth**. The student presses **Continue to Secure Login**. The site then asks them to sign in with their academy-approved, verified Firebase email/password account (or Google). Only when **all three checks** match — official ALIA code, DOB verifier, and administrator-approved verified email — does the app show the student's dashboard and their published exam results.

### Why there is an extra identity check

ALIA official roll numbers are sequential and dates of birth can often be learned or guessed. **They are not secure standalone passwords.** The extra verified email/Google account step is necessary before accessing an individual student's private dashboard. The Firebase `students` collection remains admin-only. The `studentAccess` grant, readable only by the approved verified email address, stores a salted PBKDF2 DOB proof (210,000 SHA-256 iterations) rather than the DOB itself. That verifier is prepared when admin approves the email and rotated whenever the student DOB changes. It is intended as an additional knowledge check **after** Firebase authentication, not as a replacement for it.

### Activation for existing students

1. Admin: open **Student Details**. Ensure the student has an official `ALIA00001`-style ID. If needed, run **Generate ALIA IDs for Existing Students**.
2. Edit and save each student's **Date of Birth**.
3. Click **Student Account Login** on that student's card. Enter an approved student or guardian email and click **Save & Approve Account**. For accounts approved *before* this new feature, reopen and save approval again to generate the new DOB verifier.
4. Student: open **Homepage → Menu → Student Login**. Enter **ALIA Student ID + Date of Birth**, click Continue, sign in with the approved verified email/password or Google, and open the published results dashboard.

Never send student passwords to administrators. A student whose official ID/DOB/email does not match the academy's saved and approved data is denied dashboard access.

## Private Teacher and Student Profile Photos

The Admin Panel supports optional profile photo uploads for **teachers** (Teachers & Students → Teacher Details → Teacher Directory & Management → Edit Teacher → Name, Salary, Contact & Notes) and **students** (Teachers & Students → Student Details → Add/Edit Student). Images may be JPG, PNG or WebP up to 8 MB before processing. The browser crops and compresses each image to a small square JPEG thumbnail (normally below ~80 KB), previews it, and saves or removes it **only after** the administrator clicks the existing Save button. The original image file is never uploaded.

The invitation-only teacher registration form also allows an **optional Teacher Profile Photograph**. After teacher submission and administrator approval, the photo is copied to that teacher's private directory profile and appears on the administrator's teacher profile PDF.

Student photos appear on private Admin student cards and in the student's own verified, administrator-approved account dashboard (the approved `studentAccess` record carries only a compressed thumbnail). Student photos are **not** added to public examination results or public webpages. Teachers' photos remain in administrator-only `teacherSubmissions` and `teachers` Firestore records.

Thumbnails are stored directly in Firestore (`photoData`) to avoid depending on Firebase Storage deployment or billing. The admin's encrypted Firestore backup includes these compact thumbnails. Photos do not become public by default. Always get student/guardian consent before uploading a child's photo. For a student with no photo, the interface shows the academy's logo instead.
