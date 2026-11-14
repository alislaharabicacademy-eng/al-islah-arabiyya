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