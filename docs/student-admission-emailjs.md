# Student admission confirmation — EmailJS template

This is the **student-facing** EmailJS template for `admission.html`. It does not modify the existing admin notification.

## Required EmailJS configuration

Edit the existing EmailJS template **`template_4qk5r3m`** (NOT admin template `template_2xfv4ml`).

- **Subject:** `Admission Application Received | {{reference_number}}`
- **To email:** `{{email}}`
- **From name:** `Madrasa Al Islahul Arabiya`
- **Reply-to:** `alislaharabicacademy@gmail.com` (optional if the service supports it)
- **Body:** Paste the HTML from [student-admission.html](../email-templates/student-admission.html) into EmailJS template's HTML source editor.

The form already provides the placeholders `reference_number`, `student_name`, `guardian_name`, `course`, and `email`. Use double braces for text fields (HTML-escaped). Do **not** use triple braces for these user-supplied fields.

## Correctness and safety

1. Submit a test application with a real email address and check the student email in mobile Gmail (light & dark), desktop Gmail, and at least one other mail client where available.
2. Check the subject contains an actual reference number and **does not show** `Template: One or more dynamic variables are corrupted`.
3. Verify student name, guardian, applied course and reference number are populated and text does not collide / become invisible in Gmail dark mode.
4. The email must say **Application Received / Pending Review**, not “Admission Approved” or “Confirmed Admission.”
5. Verify the admin notification still uses its original template, the application is saved in the dashboard, and the student receives **only their own** data.
6. Test missing optional guardian and long student names; inspect wrapping on 320px-wide phone screens.

## Deployment note

**GitHub changes alone do not change a remotely stored EmailJS template.** To go live, an authorized EmailJS account owner must save the new content and field settings in the EmailJS dashboard and send a live test. Do not mark this as deployed before that check.
