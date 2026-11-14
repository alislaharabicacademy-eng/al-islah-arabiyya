/* Run with Node 22: node --test tests/admission-courses.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {uniqueAdmissionCourses,admissionCourseKey,removeAdmissionCourse} from '../admission-course-utils.js';
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
 assert.match(admission,/const courses=uniqueAdmissionCourses\(names\)/);
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
