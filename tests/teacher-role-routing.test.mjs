import test from 'node:test';
import assert from 'node:assert/strict';
import {teacherPortalLanding,isTeacherVisibleInDirectory} from '../teacher-role-routing.js';

test('approved teacher who is also master admin must choose between two explicit roles',()=>{
 assert.equal(teacherPortalLanding(true,true),'choose-role');
});
test('ordinary teacher opens only their own teacher dashboard',()=>{
 assert.equal(teacherPortalLanding(false,true),'my-teacher-dashboard');
});
test('master admin without linked teacher keeps read-only all-teachers preview',()=>{
 assert.equal(teacherPortalLanding(true,false),'admin-preview');
});
test('unapproved account receives no teacher or admin dashboard',()=>{
 assert.equal(teacherPortalLanding(false,false),'unauthorized');
});

test('archived and removed teacher profiles are not listed in the teacher login preview',()=>{
 assert.equal(isTeacherVisibleInDirectory({name:'Old Teacher',recordStatus:'archived'}),false);
 assert.equal(isTeacherVisibleInDirectory({name:'Old Teacher',recordStatus:'ARCHIVED'}),false);
 assert.equal(isTeacherVisibleInDirectory({name:'Active Teacher'}),true);
 assert.equal(isTeacherVisibleInDirectory({name:'Active Teacher',recordStatus:'active'}),true);
 assert.equal(isTeacherVisibleInDirectory(null),false);
});
