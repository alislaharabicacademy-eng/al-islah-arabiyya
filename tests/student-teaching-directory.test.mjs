import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {studentTeachingAssignments} from '../student-teaching-utils.js';

const teachers=[
 {name:'Ustadha A',assignments:[
  {course:'muallama',subject:'Tajweed',timing:'7 PM'},
  {course:'muballigha',subject:'Hadees',timing:'8 PM'}]},
 {name:'Ustadha B',assignments:[{course:'muallama',subject:'Fiqh',timing:'6 PM'}]},
 {name:'Archived',recordStatus:'archived',assignments:[{course:'muallama',subject:'Arabic'}]}
];
test('only the enrolled student course is shown, with subject and assigned teacher',()=>{
 assert.deepEqual(studentTeachingAssignments({course:'muallama'},teachers),[
  {subject:'Fiqh',teacherName:'Ustadha B',timing:'6 PM'},
  {subject:'Tajweed',teacherName:'Ustadha A',timing:'7 PM'}
 ]);
 assert.deepEqual(studentTeachingAssignments({course:'muballigha'},teachers),[
  {subject:'Hadees',teacherName:'Ustadha A',timing:'8 PM'}
 ]);
 assert.deepEqual(studentTeachingAssignments({course:'alima'},teachers),[]);
});
test('Maktab allocations are isolated by batch and require an assigned batch',()=>{
 const t=[{name:'Ustadha C',assignments:[
  {course:'maktab',subject:'Qaidha',batch:'Morning'},
  {course:'maktab',subject:'Dua',batch:'Evening'},
  {course:'maktab',subject:'Unassigned'}
 ]}];
 assert.deepEqual(studentTeachingAssignments({course:'maktab',batch:'MORNING'},t),[
  {subject:'Qaidha',teacherName:'Ustadha C',timing:''}
 ]);
 assert.deepEqual(studentTeachingAssignments({course:'maktab',batch:'Afternoon'},t),[]);
});
test('empty, stale and repeated teacher assignments are safe to render',()=>{
 const t=[{name:'Ustadha X',email:'private@example.com',salary:10000,assignments:[
  {course:'alima',subject:'Tafseer',timing:'8 PM'},
  {course:'alima',subject:'Tafseer',timing:'8 PM'},
  {course:'muallama',subject:'Quran'}
 ]}];
 assert.deepEqual(studentTeachingAssignments({course:'alima'},t),
  [{subject:'Tafseer',teacherName:'Ustadha X',timing:'8 PM'}]);
 assert.equal(JSON.stringify(studentTeachingAssignments({course:'alima'},t)).includes('private@example.com'),false);
 assert.deepEqual(studentTeachingAssignments({course:'alima'},null),[]);
});
test('only admin reads private Teacher Directory; student reads existing verified grant',()=>{
 const admin=readFileSync(new URL('../student-teaching-admin.js',import.meta.url),'utf8');
 const accessAdmin=readFileSync(new URL('../student-account-admin.js',import.meta.url),'utf8');
 const student=readFileSync(new URL('../student-login.html',import.meta.url),'utf8');
 const rules=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
 assert.match(admin,/collection\(db,'teachers'\)/);
 assert.match(admin,/batch\.set\(doc\(db,'studentAccess'/);
 assert.match(accessAdmin,/teachingAssignments/);
 assert.match(student,/renderStudentTeachingAssignments\(access,card\)/);
 assert.doesNotMatch(student,/collection\(db,'teachers'\)/);
 assert.doesNotMatch(student,/collection\(db,'teacherRosters'\)/);
 assert.match(rules,/match \/teachers\/\{teacherId\} \{\s*allow read, write: if isAdmin\(\)/);
});
