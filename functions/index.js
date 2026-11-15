"use strict";
// Student-only ID + DOB login. This is a server-side check: Firestore
// /students and /studentAccess remain private to the Academy admin.
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");
const {createHash, timingSafeEqual} = require("node:crypto");

initializeApp();
const db = getFirestore();
const WINDOW_MS = 15 * 60 * 1000;

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}
function validCode(value) {
  const code = String(value || "").trim().toUpperCase();
  return /^ALIA(?!00000)[0-9]{5}$/.test(code) ? code : "";
}
function validDob(value) {
  const dob = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return "";
  const dt = new Date(dob + "T00:00:00Z");
  return Number.isFinite(dt.getTime()) && dt.toISOString().slice(0, 10) === dob &&
    dt <= new Date() ? dob : "";
}
function dateEquals(a, b) {
  const left = createHash("sha256").update(String(a)).digest();
  const right = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(left, right);
}
function badCredentials() {
  return new HttpsError("permission-denied", "Student ID or Date of Birth is incorrect, or access has been disabled.");
}
async function rateLimit(key, maximum) {
  const ref = db.collection("studentLoginRateLimits").doc(sha256(key));
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const last = snapshot.exists ? snapshot.data() : {};
    const start = Number(last.windowStart);
    const newWindow = !Number.isFinite(start) || start > now || now - start >= WINDOW_MS;
    const count = newWindow ? 1 : (Number(last.count) || 0) + 1;
    if (count > maximum) throw new HttpsError("resource-exhausted",
      "Too many login attempts. Please try again after 15 minutes.");
    tx.set(ref, {count, windowStart: newWindow ? now : start,
      expiresAt: Timestamp.fromMillis(now + WINDOW_MS * 2)});
  });
}
function short(value, max = 150) {
  return String(value == null ? "" : value).slice(0, max);
}
async function findStudent(code) {
  const registry = await db.collection("studentIdRegistry").doc(code).get();
  if (registry.exists && typeof registry.data().studentId === "string") {
    const studentId = registry.data().studentId;
    const snap = await db.collection("students").doc(studentId).get();
    if (snap.exists && snap.data().studentCode === code) return snap;
  }
  // Support older academy records that predate the ID registry.
  const matches = await db.collection("students").where("studentCode", "==", code).limit(2).get();
  return matches.size === 1 ? matches.docs[0] : null;
}
exports.studentLoginByIdDob = onCall({
  region: "asia-south1", maxInstances: 6, memory: "256MiB", timeoutSeconds: 30
}, async (request) => {
  const code = validCode(request.data?.studentCode);
  const dob = validDob(request.data?.dob);
  if (!code || !dob) throw new HttpsError("invalid-argument", "Enter a valid ALIA Student ID and Date of Birth.");

  // The IP and account limits are independent: knowing successive roll numbers
  // must not provide unlimited attempts against a private student dashboard.
  const ip = String(request.rawRequest?.ip || "unknown");
  await rateLimit("ip:" + ip, 40);
  await rateLimit("id:" + code, 6);

  try {
    const snapshot = await findStudent(code);
    if (!snapshot || !dateEquals(snapshot.data().dob, dob)) throw badCredentials();
    const student = snapshot.data(), studentId = snapshot.id;
    const access = await db.collection("studentAccess").doc(studentId).get();
    // Login is enabled automatically for an issued ID + DOB unless an admin
    // explicitly disabled this student's portal access. No approved email.
    if (access.exists && access.data().enabled === false) throw badCredentials();

    const courseId = short(student.course, 100);
    const [course, exams] = await Promise.all([
      courseId ? db.collection("courses").doc(courseId).get() : Promise.resolve(null),
      db.collection("examResults").where("studentId", "==", studentId).limit(300).get()
    ]);
    const courseData = course?.exists ? course.data() : {};
    const results = exams.docs.filter(d => d.data().published === true &&
      /^RESULT-[a-f0-9]{24}$/.test(d.id)).slice(0, 75).map(d => {
      const e = d.data();
      return {id:d.id, examTitle:short(e.examTitle), examDate:short(e.examDate,40),
        academicYear:short(e.academicYear,40), course:short(e.course,100),
        total:Number(e.total)||0, maxTotal:Number(e.maxTotal)||0,
        percent:Number(e.percent)||0, grade:short(e.grade,40), passed:e.passed === true};
    });
    return {
      student: {
        studentName: short(student.name, 150), studentCode: code, course: courseId,
        courseName: short(courseData.name || courseId.replace(/-/g," ").replace(/\b[a-z]/g,c=>c.toUpperCase())),
        batch: short(student.batch, 90), state: short(student.state || "Active", 60),
        photoData: typeof student.photoData === "string" && student.photoData.length <= 160000 ?
          student.photoData : "",
        feeLedger: student.feeLedger && typeof student.feeLedger === "object" ? student.feeLedger : {},
        feeMonthlyRate: Number(courseData.monthlyFee) || 0,
        feeEnrollmentDate: short(student.approvedAt || student.enrollmentDate || student.admittedAt, 24),
        promotionHistory: Array.isArray(student.promotionHistory) ? student.promotionHistory.slice(0, 30) : [],
        competitionCertificates: Array.isArray(student.competitionCertificates) ?
          student.competitionCertificates.slice(0, 75) : []
      }, results
    };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    console.error("Student login backend error", err);
    throw new HttpsError("internal", "Unable to open the student dashboard right now.");
  }
});
