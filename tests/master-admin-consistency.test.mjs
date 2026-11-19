import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sharedAdminUi=[
 'admin.html','teacher-login.html','admin-student-preview.js',
 'id-card-studio.js','letterhead-studio.js','site-settings-admin.js',
 'student-profile-requests.js'
];

test('every existing Academy administrator UI uses a common verified access gate',()=>{
 const helper=read('academy-admin-access.js');
 assert.match(helper,/export async function isVerifiedAcademyAdmin\(db,user\)/);
 assert.match(helper,/isVerifiedMasterAdmin\(db,user\)/);
 assert.match(helper,/adminAccess/);
 assert.doesNotMatch(helper,/syedatheil40@gmail\.com/,'Master address must not appear in the public browser helper');
 for(const path of sharedAdminUi){
  const source=read(path);
  assert.match(source,/isVerifiedAcademyAdmin/,path+' must use the shared admin access check');
  assert.doesNotMatch(source,/email\?\.toLowerCase\(\)!==\s*'alislaharabicacademy@gmail\.com'/,path+' must not exclude Master');
 }
 // Future admin-only screens must import the same shared helper, not
 // duplicate an official-Gmail-only gate in new pages.
});

test('Firestore retains Master privileges without weakening normal or public access',()=>{
 const rules=read('firestore.rules');
 assert.match(rules,/function isMasterAdmin\(\)/);
 assert.match(rules,/request\.auth\.token\.email == 'syedatheil40@gmail\.com'/);
 assert.match(rules,/function isAdmin\(\)\s*\{\s*return isNormalAdmin\(\) \|\| isMasterAdmin\(\) \|\| hasPrivateAdminGrant\(\);/);
 assert.match(rules,/allow create, update: if isMasterAdmin\(\)/);
 assert.match(rules,/allow get: if role == 'master' && isMasterAdmin\(\)/);
});

test('Firebase Storage also accepts verified Master Admin and approved normal admins',()=>{
 const rules=read('storage.rules');
 assert.match(rules,/request\.auth\.token\.email == 'syedatheil40@gmail\.com'/);
 assert.match(rules,/request\.auth\.token\.email == 'alislaharabicacademy@gmail\.com'/);
 assert.match(rules,/firestore\.exists\(/);
 assert.match(rules,/allow read, update, delete: if isAdmin\(\)/);
 assert.match(rules,/teacherInvites/);
 assert.match(read('firebase.json'),/"storage"\s*:/);
});
