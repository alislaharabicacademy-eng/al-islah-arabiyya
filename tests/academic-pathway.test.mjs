import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const root=new URL('../',import.meta.url);
async function fromJs(path){
 const source=readFileSync(new URL(path,root),'utf8');
 return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
const policy=await fromJs('academic-pathway.js');
const admission=await fromJs('admission-course-utils.js');
const {courseYearOf,examYearOf,promotionEligibility,aalimaEntryEligibility}=policy;
const year1={course:'muballigha',courseYear:1,state:'Completed'};
const year2={course:'muballigha',courseYear:2,state:'Completed'};
const exam1={courseId:'muballigha',courseYear:1,published:true,passed:true,examTitle:'Final Examination'};
const exam2={...exam1,courseYear:2};

test('New admission is Muballiga Year 1 and is the only automatic promotion path',()=>{
 assert.equal(courseYearOf({course:'muballigha'}),1);
 assert.deepEqual(promotionEligibility(year1,exam1),{
  eligible:true,nextCourse:'muballigha',nextYear:2,label:'Muballiga · 2nd Year'
 });
 assert.equal(promotionEligibility(year2,exam2).eligible,false);
 assert.equal(promotionEligibility({course:'muballigha',state:'Completed'},exam1).eligible,false);
 assert.equal(promotionEligibility({course:'muallama',state:'Completed'},exam1).eligible,false);
 assert.equal(promotionEligibility({...year1,state:'Active'},exam1).eligible,false);
});

test('Year 2 must have a final result for that exact year',()=>{
 assert.equal(aalimaEntryEligibility(year2,exam1).eligible,false);
 assert.equal(aalimaEntryEligibility(year2,exam2).eligible,true);
 assert.equal(aalimaEntryEligibility(year2,{...exam2,passed:false}).eligible,false);
 assert.equal(aalimaEntryEligibility(year2,{...exam2,published:false}).eligible,false);
 assert.equal(aalimaEntryEligibility({...year2,state:'Active'},exam2).eligible,false);
});

test('Untyped legacy finals count as Year 1 only',()=>{
 assert.equal(examYearOf({...exam1,courseYear:undefined}),1);
 assert.equal(aalimaEntryEligibility(year2,{...exam2,courseYear:undefined}).eligible,false);
});

test('Only Muballiga Year 1 is offered to new public applicants, not direct Aalima',()=>{
 const names=admission.publicAdmissionCourses(['Muallama','Muballigha','Alima','Aalima','Boys Hifz Class']);
 assert.equal(names.includes('Alima'),false);
 assert.equal(names.includes('Aalima'),false);
 assert.ok(names.includes('Muballigha'));
 assert.match(admission.publicAdmissionLabel('Muballigha'),/1st Year/);
 assert.ok(admission.isAalimaContinuation('Alima'));
});

test('Public pages do not offer direct Aalima admission',()=>{
 const admissionPage=readFileSync(new URL('admission.html',root),'utf8');
 assert.match(admissionPage,/publicAdmissionCourses\(names\)/);
 assert.match(admissionPage,/Muballiga admissions are for 1st Year only/);
 const all=readFileSync(new URL('all-courses.html',root),'utf8');
 assert.match(all,/if\(d\.id==='alima'\)/);
 const details=readFileSync(new URL('courses.html',root),'utf8');
 assert.match(details,/hidden=id==='alima'/);
});

test('Admin is not allowed to enter Aalima directly, even from student edit form',()=>{
 const admin=readFileSync(new URL('admin.html',root),'utf8');
 assert.match(admin,/data\.course==='alima'&&prior\.course!=='alima'/);
 assert.match(admin,/legacyStudyYearWrap/);
 assert.match(admin,/Verify the legacy student year/);
 assert.match(admin,/enrollAalimaYear3\(db,d\.id/);
 assert.match(admin,/verified:form\.elements\.verified\.checked/);
 const promo=readFileSync(new URL('student-promotion.js',root),'utf8');
 assert.match(promo,/runTransaction\(db/);
 assert.match(promo,/validFinalFor|aalimaEntryEligibility/);
 assert.match(promo,/paymentRecord/);
});

test('Year-specific final result, private studentAccess and dashboard are retained',()=>{
 const exam=readFileSync(new URL('exam-admin.js',root),'utf8');
 assert.match(exam,/courseYear:student\.course==='muballigha'/);
 assert.match(exam,/Editing an old result must not silently change/);
 const accounts=readFileSync(new URL('student-account-admin.js',root),'utf8');
 assert.match(accounts,/courseYear:student\.course==='muballigha'/);
 assert.match(accounts,/courseYear:data\.course==='muballigha'/);
 assert.match(accounts,/\?0:courseYearOf\(data\)/);
 const portal=readFileSync(new URL('student-login.html',root),'utf8');
 assert.match(portal,/Number\(access\.courseYear\)===2/);
});

test('Short Muballiga description only promises its two-year Sanad; Aalima keeps optional paid admission details',()=>{
 const box={window:{}};
 runInNewContext(readFileSync(new URL('course-curriculum.js',root),'utf8'),box);
 const c=box.window.AcademyCurriculum;
 const mub=c.description('muballigha','');
 assert.equal(mub,'Two-year programme for continued Islamic Studies. Students who successfully complete both the 1st and 2nd years will receive the Muballiga Sanad.');
 assert.doesNotMatch(mub,/Aalima|admission fee/i);
 const ali=c.description('alima','');
 assert.match(ali,/not a direct admission/);
 assert.match(ali,/admission fee is paid and verified/);
 assert.match(ali,/Aalima Sanad/);
});
test('Outdated long Muballiga text is removed from the Admin editor without destroying custom content',()=>{
 const box={window:{}};
 runInNewContext(readFileSync(new URL('course-curriculum.js',root),'utf8'),box);
 const c=box.window.AcademyCurriculum;
 const old='Two-year programme for continued Islamic study. New admissions are accepted for Muballiga 1st Year only. Students who successfully complete both the 1st and 2nd years of the Muballiga course may finish their studies and receive the Muballiga Sanad. Students who wish to continue may apply for Aalima 3rd Year separately, after paying the additional Aalima admission fee and receiving Academy approval.';
 const current=c.description('muballigha',old);
 assert.equal(current,c.description('muballigha',''));
 assert.equal(c.description('muballigha',current),current);
 assert.match(c.description('muballigha',old+' Optional weekend classes.'),/Optional weekend classes/);
 assert.doesNotMatch(current,/Aalima|admission fee/);
});
