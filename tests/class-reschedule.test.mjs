import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const code=await fs.readFile(new URL('../class-reschedule-utils.js',import.meta.url),'utf8');
const util=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(code));
const {classDate,classKey,makeupKey,isLockedRequest,isSameClass,originalAlreadyMarked,findMakeupRecord,canConfirmDate,displayAttendanceSubject}=util;
const request={course:'muballigha',batch:'',subject:'DurusMeezan',originalDate:'2026-11-15'};
test('validates calendar dates rather than accepting malformed strings',()=>{
  assert.equal(classDate('2026-11-17'),true);
  for(const date of ['2026-02-30','2026-13-01','2026-11-31','2026-1-02','','2026-11-1'])assert.equal(classDate(date),false,date);
  assert.equal(canConfirmDate('2026-11-15','2026-11-17'),true);
  assert.equal(canConfirmDate('2026-11-15','2026-11-15'),false);
  assert.equal(canConfirmDate('2026-11-15','2026-11-14'),false);
});
test('keeps class and subject identities separate across batches',()=>{
  assert.equal(classKey('muballigha','','DurusMeezan'),'muballigha__DurusMeezan');
  assert.equal(classKey('maktab','Batch A','Quran'),'maktab__Batch A__Quran');
  assert.equal(isSameClass(request,{course:'muballigha',subject:'DurusMeezan'}),true);
  assert.equal(isSameClass(request,{course:'muballigha',subject:'Hadees'}),false);
});
test('pending, approved, and revised-date requests lock the original class',()=>{
  for(const status of ['pending','approved','date_change_requested'])assert.equal(isLockedRequest({status}),true);
  for(const status of ['rejected',null,undefined])assert.equal(isLockedRequest({status}),false);
});
test('existing original attendance is not eligible for postponement',()=>{
  assert.equal(originalAlreadyMarked({'muballigha__DurusMeezan':{status:'present'}},request),true);
  assert.equal(originalAlreadyMarked({'DurusMeezan':{status:'present'}},request),true);
  assert.equal(originalAlreadyMarked({'muballigha__Hadees':{status:'present'}},request),false);
});
test('each makeup lesson has one unique attended record key and original attribution',()=>{
  const id='abc123';
  const key=makeupKey(request,id);
  assert.equal(key,'muballigha__DurusMeezan__makeup__abc123');
  assert.notEqual(makeupKey(request,'other'),key);
  const record={...request,classType:'makeup',rescheduleRequestId:id,status:'present',students:{x:{status:'present'}}};
  assert.deepEqual(findMakeupRecord({[key]:record},request,id),record);
  assert.equal(findMakeupRecord({[key]:{...record,rescheduleRequestId:'wrong'}},request,id),null);
  assert.equal(findMakeupRecord({[key]:{...record,subject:'Hadees'}},request,id),null);
  assert.equal(displayAttendanceSubject(key,record),'DurusMeezan');
});
test('admin, student, and salary integration maintain important safeguards',async()=>{
  const admin=await fs.readFile(new URL('../class-reschedule-admin.js',import.meta.url),'utf8');
  const teacher=await fs.readFile(new URL('../class-reschedule-teacher.js',import.meta.url),'utf8');
  const page=await fs.readFile(new URL('../teacher-attendance.html',import.meta.url),'utf8');
  const dashboard=await fs.readFile(new URL('../admin.html',import.meta.url),'utf8');
  const rules=await fs.readFile(new URL('../firestore.rules',import.meta.url),'utf8');
  assert.match(admin,/originalAlreadyMarked/);
  assert.match(admin,/findMakeupRecord/);
  assert.match(admin,/confirmedDate/);
  assert.match(teacher,/runTransaction/);
  assert.match(teacher,/grant\.data\(\)\.status!=='approved'/);
  assert.match(teacher,/classType:'makeup'/);
  assert.match(teacher,/status:'pending'/);
  assert.match(page,/rescheduleUI\?\.blockingRequest/);
  assert.match(dashboard,/classRescheduleAdminSection/);
  assert.match(dashboard,/record\.classType==='makeup'/);
  assert.match(rules,/match \/classRescheduleRequests\/\{teacherId\}\/requests\/\{requestId\}/);
  assert.match(rules,/resource\.data\.status == 'date_change_requested'/);
  assert.match(rules,/allow delete: if isAdmin\(\);/);
});
