/* node --test tests/student-approval-live-sync.test.mjs
 * Static authorization and UI regression checks. These do not replace
 * a real verified-guardian + Firebase Emulator / production login test. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('student portal waits for approval and automatically reloads only the verified email grants',()=>{
 const code=read('student-login.html');
 const start=code.indexOf('function watchApprovedStudentGrants(user){');
 const end=code.indexOf('function showEmailStep(){',start);
 assert.ok(start>0&&end>start,'authorized approval listener must exist');
 const listener=code.slice(start,end);
 assert.match(listener,/user\?\.emailVerified/);
 assert.match(listener,/onSnapshot\(/);
 assert.match(listener,/where\('email','==',email\)/);
 assert.match(listener,/where\('enabled','==',true\)/);
 assert.match(listener,/if\(!identityGate\|\|auth\?\.currentUser\?\.uid!==user\.uid\)return/);
 assert.match(listener,/loadPrivateDashboard\(user,\+\+loadingToken\)/);
 assert.match(code,/watchApprovedStudentGrants\(user\);/);
 assert.match(code,/stopStudentGrantWatch\(\)/);
 assert.match(code,/Student ID is not approved/);
});
test('an approved guardian account does not silently truncate children after 30 entries',()=>{
 const code=read('student-login.html');
 assert.doesNotMatch(code,/studentAccess'[\s\S]*?limit\(30\)/);
});
test('Firebase rules still enforce verified email and an admin-only grant write',()=>{
 const rules=read('firestore.rules');
 const start=rules.indexOf('match /studentAccess/{studentId} {');
 const end=rules.indexOf('match /examResults/',start);
 assert.ok(start>0&&end>start);
 const grant=rules.slice(start,end);
 assert.match(grant,/request\.auth\.token\.email_verified == true/);
 assert.match(grant,/resource\.data\.email == request\.auth\.token\.email/);
 assert.match(grant,/resource\.data\.enabled == true/);
 assert.match(grant,/allow create, update, delete: if isAdmin\(\)/);
 const admin=read('student-account-admin.js');
 assert.match(admin,/makeStudentDobVerifier\(studentCode,dob\)/);
 assert.match(admin,/await setDoc\(doc\(db,'studentAccess',selected\.id\),data\)/);
 assert.match(read('student-dob-verifier.js'),/matchStudentDobVerifier/);
});
test('GitHub static website itself has no ChatGPT runtime connection',()=>{
 for(const page of ['index.html','admission.html','student-login.html','teacher-login.html','admin.html']){
  const src=read(page);
  assert.doesNotMatch(src,/api\.openai\.com|chatgpt\.com|chatgpt\.ai/i);
 }
});
