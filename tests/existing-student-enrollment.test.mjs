import test from 'node:test';
import assert from 'node:assert/strict';
import {existingAcademyStudentDetails,findDuplicateAcademyStudent} from '../existing-student-enrollment.js';

const today='2026-11-16';
const shared={verified:true,enrollmentDate:'2024-06-14',today,
 actorUid:'approved-admin',actorEmail:'verified@example.com'};
test('backfill existing Muballiga Year 2 without resetting to Year 1',()=>{
 const record=existingAcademyStudentDetails({...shared,course:'muballigha',year:'2'});
 assert.equal(record.courseYear,2);
 assert.equal(record.enrollmentDate,'2024-06-14');
 assert.equal(record.entrySource,'existing-academy-register');
 assert.equal(record.legacyRecordVerified,true);
 assert.equal(record.legacyVerifiedByUid,'approved-admin');
 assert.ok(!('aalimaAdmissionFee' in record));
});
test('existing Muballiga Year 1 remains Year 1 after verified historic intake',()=>{
 assert.equal(existingAcademyStudentDetails({...shared,course:'muballigha',year:'1'}).courseYear,1);
});
test('existing Muallama, Maktab and Hifz can be backfilled without invented year or payments',()=>{
 for(const course of ['muallama','maktab','boys-hifz'])
  assert.equal(existingAcademyStudentDetails({...shared,course}).courseYear,0);
});
test('Aalima historical entry must verify previous Year 2 AND old paid admission reference',()=>{
 assert.throws(()=>existingAcademyStudentDetails({...shared,course:'alima',aalimaVerified:false}),
  /previously paid|Verify completed/);
 assert.throws(()=>existingAcademyStudentDetails({...shared,course:'alima',aalimaVerified:true}),
  /reference/);
 const record=existingAcademyStudentDetails({...shared,course:'alima',
   aalimaVerified:true,aalimaFeeReference:'OLD-REGISTER-2025-14'});
 assert.equal(record.courseYear,3);
 assert.equal(record.legacyAalimaEligibility.originalFeeRegisterReference,'OLD-REGISTER-2025-14');
 assert.equal(record.legacyAalimaEligibility.priorAdmissionFeeVerified,true);
 assert.ok(!('aalimaAdmissionFee' in record),
   'Historical confirmation must not pretend a new fee was received');
});
test('reject future, impossible, unverified or ambiguous original admissions',()=>{
 for(const enrollmentDate of ['2030-01-01','2026-02-30','not-a-date','']){
  assert.throws(()=>existingAcademyStudentDetails({...shared,course:'muallama',enrollmentDate}),/Joining|actual earlier|admission date/);
 }
 assert.throws(()=>existingAcademyStudentDetails({...shared,course:'muballigha',year:''}),/verify/);
 assert.throws(()=>existingAcademyStudentDetails({...shared,course:'muballigha',year:'3'}),/verify/);
 assert.throws(()=>existingAcademyStudentDetails({...shared,course:'muallama',verified:false}),/old Academy register/);
});
test('prevent accidental duplicate student record for same person; preserve existing ALIA',()=>{
 const records=[{id:'existing-firestore-id',data:{name:' Ahmed  Ali ',dob:'2012-02-05',
   guardian:'Parent A',studentCode:'ALIA00007'}}];
 const found=findDuplicateAcademyStudent(records,{name:'ahmed ALI',dob:'2012-02-05',guardian:'Parent A'});
 assert.equal(found.id,'existing-firestore-id');
 assert.equal(found.data.studentCode,'ALIA00007');
 assert.equal(findDuplicateAcademyStudent(records,{name:'Different Person',dob:'2012-02-05'}),null);
});
