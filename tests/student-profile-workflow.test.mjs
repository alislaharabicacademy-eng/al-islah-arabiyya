/* node --test tests/student-profile-workflow.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Student registration form is collapsed until explicit Add New Student or Edit action',()=>{
 const a=read('admin.html');
 assert.match(a,/id="studentEditorPanel"[^>]*hidden/);
 assert.match(a,/id="studentNewButton"/);
 assert.match(a,/id="studentUpdatesButton"/);
 assert.match(a,/studentEditorPanel\.hidden=false/);
 assert.match(a,/openStudentEdit\(d\.id,data\)/);
 assert.match(a,/studentEditorPanel\.hidden=true/);
});
test('Student mandatory fields include Name, Course, Guardian, DOB and Contact Number',()=>{
 const a=read('admin.html');
 for(const id of ['studentName','studentCourse','studentGuardian','studentDob','studentPhone']){
  const tag=a.match(new RegExp('<(?:input|select)\\b[^>]*id="'+id+'"[^>]*>'));
  assert.ok(tag,id+' missing from Admin form');
  assert.match(tag[0],/required/,id+' must be required');
 }
 assert.match(a,/id="studentAddress"/);
 assert.match(a,/id="studentEmail"/);
 assert.match(a,/id="copyStudentAdmissionLink"/);
});
test('Private student update has preview-only, mandatory verified Google fields, and batched one-time submission',()=>{
 const html=read('student-update.html');
 assert.match(html,/preview/);
 assert.match(html,/Submission Disabled/);
 for(const name of ['name','guardian','dob','phone','course','address'])
  assert.match(html,new RegExp('name="'+name+'"[^>]*required'));
 assert.match(html,/GoogleAuthProvider/);
 assert.match(html,/account\.emailVerified/);
 assert.match(html,/writeBatch\(db\)/);
 assert.match(html,/studentUpdateSubmissions/);
 assert.match(html,/studentUpdateInvites/);
});
test('Verified student update requests require email ownership and parent cannot edit student records directly',()=>{
 const rules=read('firestore.rules');
 assert.match(rules,/match \/studentUpdateInvites\/\{token\}/);
 assert.match(rules,/match \/studentUpdateSubmissions\/\{token\}/);
 assert.match(rules,/request\.auth\.token\.email_verified == true/);
 assert.match(rules,/request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\['used', 'usedAt'\]\)/);
 assert.match(rules,/getAfter\(\/databases\/\$\(database\)\/documents\/studentUpdateInvites\/\$\(token\)\)\.data\.used == true/);
 assert.match(rules,/match \/students\/\{studentId\} \{[\s\S]*?allow read, write: if isAdmin\(\)/);
});
test('Admin reviews submitted fields before saving official student records',()=>{
 const admin=read('student-profile-requests.js');
 assert.match(admin,/onLoadIntoEditor\(invite\.studentId,student,data\)/);
 assert.match(admin,/reviewStatus:'reviewed'/);
 assert.match(admin,/reviewStatus:'rejected'/);
 assert.match(admin,/Share ONLY with the approved parent\/student/);
 assert.doesNotMatch(admin,/setDoc\(doc\(db,'students'/);
});
test('Approved shows persistent badge and popup; Approve button disappears, Disable remains',()=>{
 const app=read('student-account-admin.js');
 assert.match(app,/APPROVED — Student Login enabled/);
 assert.match(app,/\$\('studentAccountSave'\)\.hidden=approved&&!changingEmail/);
 assert.match(app,/\$\('studentAccountDisable'\)\.hidden=!approved/);
 assert.match(app,/alert\(enabled\?'✅ STUDENT LOGIN APPROVED/);
 assert.match(app,/previous=data;changingEmail=false;showApprovalState\(\)/);
 assert.match(app,/const enabled=!disable;/);
});
test('Disabled account is denied by original Firestore access rules, portal reports no active access',()=>{
 const rules=read('firestore.rules');
 assert.match(rules,/resource\.data\.enabled == true/);
 const portal=read('student-login.html');
 assert.match(portal,/No active Student Login access/);
 assert.match(portal,/where\('enabled','==',true\)/);
});
test('Registration links do not change premium certificate or private fee ledger system',()=>{
 const admin=read('admin.html');
 assert.match(admin,/id="studentFeesPanel"/);
 assert.match(admin,/Sync Fee History to Student Logins/);
 const portal=read('student-login.html');
 assert.match(portal,/renderPrivateFeeLedger\(access,card\)/);
 const cert=read('premium-certificate-svg.js');
 assert.match(cert,/await pdf\.svg\(svg/);
});
