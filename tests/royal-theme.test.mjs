/* Run: node --test tests/royal-theme.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const pages=[
 ['index.html','royal-home'],['admission.html','royal-public'],
 ['all-courses.html','royal-public'],['courses.html','royal-public'],
 ['exam-results.html','royal-public'],['student-login.html','royal-student'],
 ['teacher-login.html','royal-teacher'],['teacher-registration.html','royal-private'],
 ['teacher-attendance.html','royal-private'],
 ['existing-student-registration.html','royal-private'],
 ['admin.html','royal-admin'],['student-update.html','royal-private'],
 ['certificate-studio.html','royal-studio'],['id-card-studio.html','royal-studio'],
 ['verify-id.html','royal-public'],['admin-access-setup.html','royal-private']
];
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('All main Academy experiences load the shared royal theme once, preserving HTML boundaries',()=>{
 for(const [path,kind] of pages){
  const html=read(path);
  assert.match(html,new RegExp('<body class="academy-royal '+kind+'"'),path);
  assert.equal((html.match(/royal-academy-theme\\.css/g)||[]).length,1,path+' CSS');
  assert.equal((html.match(/royal-academy-motion\\.js/g)||[]).length,1,path+' JS');
  assert.ok(html.indexOf('royal-academy-theme.css')<html.indexOf('</head>'),path+' stylesheet in head');
  assert.ok(html.lastIndexOf('royal-academy-motion.js')<html.lastIndexOf('</body>'),path+' JS before body close');
  assert.ok(html.includes('</html>'),path);
 }
});
test('Public identity and essential features remain in the pages',()=>{
 const home=read('index.html');
 assert.match(home,/madrasa_video_no_gemini\\.mp4/);
 assert.match(home,/Nurturing Faith/);
 assert.match(home,/1_20261112_080707_0000\\.png/);
 assert.match(home,/href="teacher-login\\.html"/);
 assert.match(home,/href="student-login\\.html"/);
 assert.match(read('admin.html'),/initExistingStudentIntakeAdmin/);
 assert.match(read('admin.html'),/teacherPayroll/);
 assert.match(read('student-login.html'),/renderPrivateFeeLedger/);
 assert.match(read('exam-results.html'),/firebase/);
});
test('Special ceremony stage is not restyled',()=>{
 assert.doesNotMatch(read('grand-launch.html'),/royal-academy-theme\\.css|royal-academy-motion\\.js/);
});
test('Theme is scoped, keyboard friendly, respects reduced motion and does not touch print output',()=>{
 const css=read('royal-academy-theme.css');
 const js=read('royal-academy-motion.js');
 assert.match(css,/body\\.academy-royal/);
 assert.match(css,/@media screen/);
 assert.match(css, /prefers-reduced-motion:reduce/);
 assert.match(css,/focus-visible/);
 assert.doesNotMatch(css,/\\[hidden\\]\\s*\\{/);
 assert.match(js,/IntersectionObserver/);
 assert.match(js,/royal-admin/);
 assert.match(js,/royal-home/);
 assert.doesNotMatch(js,/firebase|localStorage|signInWith|setDoc/);
 new Script(js,{filename:'royal-academy-motion.js'});
});
