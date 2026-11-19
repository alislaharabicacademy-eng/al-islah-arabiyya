import test from 'node:test';
import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
import{makeExamCohorts,parseExamSubjects,displayExamSubjects,gradeExamSubjects,readyToPublish,academicStage}from'../exam-session-core.js';
const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const students=[
 {id:'a1',name:'Amina',course:'muallama',state:'Active',studentCode:'ALIA00001'},
 {id:'a2',name:'Fatima',course:'muallama',state:'Active',studentCode:'ALIA00002'},
 {id:'b1',name:'Safa',course:'muballigha',courseYear:1,state:'Active'},
 {id:'b2',name:'Zahra',course:'muballigha',courseYear:2,state:'Completed'},
 {id:'x1',name:'Unapproved',course:'muallama',state:'Pending'}
];
const cohorts=makeExamCohorts(students,new Map([['muallama','Muallama'],['muballigha','Muballigha']]));
const session={id:'EXAMSESSION-0123456789abcdef01234567',examTitle:'Annual Examination',
 examDate:'2026-11-20',academicYear:'2026–2027',passPercent:40,cohorts:cohorts.map(g=>({...g,subjects:[{name:'Hadees',max:50},{name:'Qaidha',max:100}]}))};
const record=(cohort,studentId)=>({id:'RESULT-0123456789abcdef01234567',sessionId:session.id,
 cohortKey:cohort.key,studentId,studentName:studentId,courseId:cohort.courseId,courseYear:cohort.courseYear,
 examTitle:session.examTitle,examDate:session.examDate,academicYear:session.academicYear,
 published:false,...gradeExamSubjects(cohort.subjects,[41,79],40)});
const records=session.cohorts.flatMap(g=>g.studentIds.map(id=>record(g,id)));
test('Course selector creates separate Year 1, Year 2, Muallama groups and omits pending applications',()=>{
 assert.equal(cohorts.length,3);
 assert.deepEqual(cohorts.map(g=>g.studentIds.length).sort(),[1,1,2]);
 assert.equal(cohorts.flatMap(g=>g.studentIds).includes('x1'),false);
 assert.equal(academicStage(students[3]),2);
});
test('Unverified legacy Muballigha stage must be verified before exam creation',()=>{
 assert.throws(()=>makeExamCohorts([...students,{id:'legacy',name:'Not Verified',state:'Active',course:'muballigha'}]),/Verify Muballigha Year/);
});
test('Class subjects are editable with their own maximum marks; no duplicates',()=>{
 const parsed=parseExamSubjects('Hadees | 50\nQaidha | 100\nTarjuma');
 assert.deepEqual(parsed,[{name:'Hadees',max:50},{name:'Qaidha',max:100},{name:'Tarjuma',max:100}]);
 assert.equal(displayExamSubjects(parsed),'Hadees | 50\nQaidha | 100\nTarjuma | 100');
 assert.throws(()=>parseExamSubjects('Hadees | 50\nhadees | 100'),/Repeated subject/);
 assert.throws(()=>parseExamSubjects('Hadees | 0'),/Invalid maximum/);
});
test('Complete student marks compute grade and per-subject pass independently',()=>{
 const s=parseExamSubjects('Hadees | 50\nArabic | 100');
 assert.deepEqual(gradeExamSubjects(s,[45,85],40),{
  subjects:[{name:'Hadees',score:45,max:50},{name:'Arabic',score:85,max:100}],
  total:130,maxTotal:150,percent:86.67,grade:'A',passed:true
 });
 const failure=gradeExamSubjects(s,[19,100],40);
 assert.equal(failure.passed,false);
 assert.throws(()=>gradeExamSubjects(s,['',40],40),/Missing mark/);
 assert.throws(()=>gradeExamSubjects(s,[51,40],40),/Invalid mark/);
});
test('Publication waits for EVERY student in EVERY course',()=>{
 const full=readyToPublish(session,records);
 assert.equal(full.ready,true);
 assert.equal(full.total,4);
 const missing=readyToPublish(session,records.slice(0,-1));
 assert.equal(missing.ready,false);
 assert.match(missing.problems.join(' '),/Missing saved marks/);
 const duplicate=readyToPublish(session,[...records,records[0]]);
 assert.equal(duplicate.ready,false);
 assert.match(duplicate.problems.join(' '),/Duplicate result/);
 const mismatched=readyToPublish(session,records.map((r,i)=>i===0?{...r,subjects:[{name:'Hadees',score:50,max:100}]}:r));
 assert.equal(mismatched.ready,false);
 assert.match(mismatched.problems.join(' '),/Different subject schemes/);
});
test('Private Firestore drafts are not readable and full exam session gate guards public results',()=>{
 const rules=file('firestore.rules');
 const results=rules.slice(rules.indexOf('match /examResults/'),rules.indexOf('match /examResultLookups/'));
 assert.match(rules,/match \/examSessions\/\{sessionId\}[\s\S]*?isAdmin\(\)/);
 assert.match(results,/resource\.data\.published == true/);
 assert.match(results,/resource\.data\.keys\(\)\.hasAny\(\['sessionId'\]\)/);
 assert.match(results,/documents\/examSessions\/\$\(resource\.data\.sessionId\)/);
 assert.match(results,/\.data\.status == 'published'/);
 assert.match(rules,/match \/examAnnouncements\/\{announcementId\}/);
 assert.match(rules,/allow get: if announcementId == 'current' \|\| isAdmin\(\)/);
});
test('Admin course picker, all-class publish gate and homepage notice are wired',()=>{
 const admin=file('admin.html'),controller=file('exam-session-admin.js'),home=file('index.html'),notice=file('exam-announcement-public.js');
 assert.match(admin,/id="courseExamClass"/);
 assert.match(admin,/id="courseExamStudentRows"/);
 assert.match(admin,/id="courseExamSaveClass"/);
 assert.match(admin,/id="courseExamPublishAll"/);
 assert.match(admin,/initExamSessionAdmin\(\{db,auth/);
 assert.match(controller,/runTransaction\(db,async tx=>/);
 assert.match(controller,/where\('sessionId','==',current\.id\)/);
 assert.match(controller,/readyToPublish\(current,latest\)/);
 assert.match(controller,/resultIds:arrayUnion\(p\.id\)/);
 assert.match(controller,/examResultLookups/);
 assert.match(controller,/examAnnouncements/);
 assert.match(home,/academy-exam-announcement/);
 assert.match(home,/student-login\.html/);
 assert.doesNotMatch(notice,/studentName|studentCode|photoData|guardianName/);
});
test('Existing manual result publishing and certificate download flows are retained',()=>{
 const exam=file('exam-admin.js'),student=file('student-login.html');
 assert.match(exam,/function save\(published\)/);
 assert.match(exam,/scores=resultMath\(subjects,passPercent\)/);
 assert.match(student,/\bPublished Examination Results\b/);
 assert.match(student,/getDoc\(doc\(db,'examResults',id\)\)/);
});
