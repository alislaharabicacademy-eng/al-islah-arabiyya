/* Run with Node 22: node --test tests/admission-courses.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {uniqueAdmissionCourses,admissionCourseKey,removeAdmissionCourse,publicAdmissionCourses,publicAdmissionLabel} from '../admission-course-utils.js';
test('Tajweed for Girls appears once across static and stored spelling variants',()=>{
 const input=['Muallama','Tajweed For Girls','TAJWEED for girls','Tajweed For Girls — 1 Year','Other enquiry','Tajweed for Girls - 1 year'];
 assert.deepEqual(uniqueAdmissionCourses(input),['Muallama','Tajweed For Girls','Other enquiry']);
});
test('The admin can hide Tajweed without destroying a course record',()=>{
 assert.deepEqual(removeAdmissionCourse(['Muallama','Tajweed For Girls','Tajweed for girls'],'Tajweed For Girls'),['Muallama']);
});
test('A real variation is not erased by overbroad deduplication',()=>{
 const vals=uniqueAdmissionCourses(['Tajweed For Girls','Tajweed For Girls - Online']);
 assert.equal(vals.length,3);
 assert.notEqual(admissionCourseKey(vals[0]),admissionCourseKey(vals[1]));
});
test('Legacy hybrid enquiries and repeated Other enquiry entries are removed',()=>{
 assert.deepEqual(uniqueAdmissionCourses(["Children's Qur'an / Tajweed (enquiry)",'Other enquiries','other enquiry','Muballigha']),['Muballigha','Other enquiry']);
});
test('Public form uses the canonical Admin settings list, not an unconditional union',()=>{
 const admission=readFileSync(new URL('../admission.html',import.meta.url),'utf8');
 assert.match(admission,/admission-form-config/);
 assert.match(admission,/const courses=publicAdmissionCourses\(names\)/);
 assert.doesNotMatch(admission,/<option>Tajweed For Girls<\/option>/);
 assert.doesNotMatch(admission,/allCourseNames=\[\.\.\.builtInCourses/);
});
test('Admin has a direct remove option and does not silently re-add saved courses',()=>{
 const admin=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
 assert.match(admin,/Hide from Admission/);
 assert.match(admin,/Remove from Admission/);
 assert.match(admin,/admission-form-config/);
 assert.doesNotMatch(admin,/const listed=\[\.\.\.existing/);
 assert.doesNotMatch(admin,/if\(data\.published&&name&&!existing\.some/);
});


test('Creating a new published course synchronizes its admission listing atomically',()=>{
 const admin=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
 const start=admin.indexOf("$('createCourse').onclick=async()=>{");
 const end=admin.indexOf("document.querySelectorAll('[data-tab]')",start);
 assert.ok(start>0&&end>start);
 const create=admin.slice(start,end);
 assert.match(create,/writeBatch\(db\)/);
 assert.match(create,/batch\.set\(doc\(db,'courses',id\)/);
 assert.match(create,/batch\.set\(admissionRef/);
 assert.match(create,/publicAdmissionCourses\(\[\.\.\.current,name\]\)/);
 assert.match(create,/await batch\.commit\(\)/);
 assert.match(create,/registerCourseOption\(id,\{name\}\)/);
 assert.match(create,/renderAdmissionCourseRows\(\)/);
});
test('Student, teacher assignment and admin course selectors share saved IDs',()=>{
 const admin=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
 assert.match(admin,/\['course','studentCourse','studentFilter','applicationFilter','catalogClass','monthlyAttendanceCourse'\]/);
 assert.match(admin,/#teacherSubjectRows select\.subject-class/);
 assert.match(admin,/for\(const option of \$\('studentCourse'\)\.options\)/);
 assert.match(admin,/syncTeacherRoster/);
});
test('Student dashboard displays the approved assigned course, not every available course',()=>{
 const student=readFileSync(new URL('../student-login.html',import.meta.url),'utf8');
 assert.match(student,/access\.course/);
});


test('Public All Courses never fabricates unpublished course cards',()=>{
 const catalog=readFileSync(new URL('../all-courses.html',import.meta.url),'utf8');
 assert.match(catalog,/where\('published','==',true\)/);
 assert.match(catalog,/const map=new Map\(\)/);
 assert.doesNotMatch(catalog,/new Map\(defaults\.map/);
 assert.doesNotMatch(catalog,/defaults\.forEach\(add\)/);
});
test('The student dashboard resolves a live published course name safely',()=>{
 const student=readFileSync(new URL('../student-login.html',import.meta.url),'utf8');
 assert.match(student,/getDoc\(doc\(db,'courses',access\.course\)\)/);
 assert.match(student,/className=String\(catalog\.data\(\)\.name\)\.trim\(\)/);
});

test('Only Muballiga Year 1 is in the public admission list; optional Aalima never appears',()=>{
 const choices=publicAdmissionCourses(['Muallama','Muballigha','Alima','Aalima','Tajweed For Girls']);
 assert.deepEqual(choices,['Muallama','Muballigha','Tajweed For Girls','Other enquiry']);
 assert.match(publicAdmissionLabel('Muballigha'),/1st Year/);
 assert.equal(uniqueAdmissionCourses(['Alima']).includes('Alima'),true); // Admin course records still exist
});
test('Public new admissions exclude Muballiga Year 2 while preserving the two-year course',()=>{
 const input=['Muallama','Muballigha','Muballiga 2nd year','Muballigha - Second Year',
  'Muballigha Year 2','Muballiga 2nd yr','Muballigha - 2 Years','Boys Hifz Class'];
 const choices=publicAdmissionCourses(input);
 assert.deepEqual(choices,['Muallama','Muballigha','Boys Hifz Class','Other enquiry']);
 // The legacy admin configuration remains intact; this filter is view-only.
 assert.ok(uniqueAdmissionCourses(input).includes('Muballiga 2nd year'));
});
