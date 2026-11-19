import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matchingStudentForRequest,requestReviewBucket,countByCourse} from '../existing-student-review-utils.js';

const official=[
 {id:'s-1',data:{name:'  Ayesha   Ali ',dob:'2011-06-05',course:'muallama',
  studentCode:'ALIA00004',phone:'9876543210',existingStudentRequestId:'approved-request'}},
 {id:'s-2',data:{name:'Same Name',dob:'2012-01-01',course:'muballigha',studentCode:'ALIA00005'}},
 {id:'s-3',data:{name:'Same Name',dob:'2012-01-01',course:'maktab',studentCode:'ALIA00006'}}
];

test('a request explicitly linked to an enrolled student can be safely synchronized to Approved',()=>{
 const found=matchingStudentForRequest({name:'Ayesha Ali',dob:'2011-06-05'},official,'approved-request');
 assert.equal(found.kind,'linked');
 assert.equal(found.record.data.studentCode,'ALIA00004');
 assert.equal(requestReviewBucket('Approved',found),'approved');
});

test('repeated submissions with the same name and DOB require human duplicate verification',()=>{
 const possible=matchingStudentForRequest({name:'ayesHa ali',dob:'2011-06-05',phone:'other number'},official,'new-request');
 assert.equal(possible.kind,'possible-duplicate');
 assert.equal(possible.record.id,'s-1');
 assert.equal(requestReviewBucket('Pending Review',possible),'duplicate-check');
 assert.equal(requestReviewBucket('Pending Review',null),'pending');
});

test('do not automatically merge strangers or ambiguous same-name DOB records',()=>{
 const unrelated=matchingStudentForRequest({name:'Another Student',dob:'2011-06-05'},official,'new-request');
 assert.equal(unrelated,null);
 assert.equal(requestReviewBucket('Pending Review',unrelated),'pending');
 const ambiguous=matchingStudentForRequest({name:'Same Name',dob:'2012-01-01'},official,'new-request');
 assert.equal(ambiguous.kind,'ambiguous');
 assert.equal(ambiguous.matches,2);
 assert.equal(requestReviewBucket('Pending Review',ambiguous),'duplicate-check');
});

test('approved/archived requests cannot become actionable pending items due to matching alone',()=>{
 for(const status of ['Approved','Duplicate','Rejected']){
  assert.notEqual(requestReviewBucket(status,matchingStudentForRequest(
   {name:'Ayesha Ali',dob:'2011-06-05'},official,'new-request')),'pending');
 }
 assert.equal(requestReviewBucket('Duplicate'),'archived');
 assert.equal(requestReviewBucket('Rejected'),'archived');
});

test('count each custom-course student form without hardcoded course assumptions',()=>{
 const groups=countByCourse([
  {data:{course:'muallama'}},{data:{course:'muallama'}},
  {data:{course:'tajweed-for-girls'}},{data:{course:'alima'}}
 ]);
 assert.deepEqual([...groups],[['muallama',2],['tajweed-for-girls',1],['alima',1]]);
});

test('Admin UI has SEPARATE Pending and Approved tab pages and preserves official student actions',()=>{
 const admin=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
 const intake=readFileSync(new URL('../existing-student-intake-admin.js',import.meta.url),'utf8');
 assert.match(admin,/id="tab-studentPending"/);
 assert.match(admin,/id="tab-studentApproved"/);
 assert.match(admin,/id="tab-studentClosed"/);
 assert.match(admin,/Pending Forms — All Courses/);
 assert.match(admin,/Approved Forms — All Courses/);
 assert.match(admin,/existingIntakePendingCourses/);
 assert.match(admin,/existingIntakeApprovedCourses/);
 assert.match(admin,/data-tab="studentPending"/);
 assert.match(admin,/data-tab="studentApproved"/);
 assert.match(admin,/existingIntakeAdmin\.openPage\(tab\)/);
 assert.match(admin,/Official Students — Course-wise Directory/);
 assert.match(admin,/studentGroups\.get\(String\(data\.course/);
 assert.match(admin,/kind==='students'\?collection\(db,kind\)/);
 assert.match(admin,/💳 Fees \/ Receipt/);
 assert.match(intake,/studentPending:/);
 assert.match(intake,/studentApproved:/);
 assert.match(intake,/cachedCourseIds/);
 assert.match(intake,/selectedCourse=null/);
 assert.match(intake,/status:'Duplicate'/);
 assert.match(intake,/kind==='linked'/);
 assert.match(intake,/getDocs\(collection\(db,'existingStudentRequests'\)\)/);
 assert.doesNotMatch(admin,/id="existingIntakeRequests"/,'old mixed queue should not appear under Student Details');
});
