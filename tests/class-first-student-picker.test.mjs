import test from 'node:test';
import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
import{classKeyForStudent,buildClassFirstGroups}from'../student-class-selector.js';

const students=[
 {id:'11',name:'Hafsha S.m',studentCode:'ALIA00015',course:'muballigha',courseYear:1},
 {id:'12',name:'Shafarna S',studentCode:'ALIA00005',course:'muballigha',courseYear:2},
 {id:'20',name:'ANAS',studentCode:'ALIA00011',course:'maktab',batch:'Batch 1'},
 {id:'21',name:'Afrah',studentCode:'ALIA00022',course:'maktab',batch:'Batch 1'},
 {id:'22',name:'Farihana',studentCode:'ALIA00009',course:'maktab',batch:'Batch 2'},
 {id:'25',name:'Amina',studentCode:'ALIA00025',course:'alima'},
 {id:'30',name:'Sabiha',studentCode:'ALIA00024',course:'muallama'}
];
const files=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('Student dropdown class-first groups exact saved course, year and batch',()=>{
 const groups=buildClassFirstGroups(students);
 assert.equal(groups.length,5+1);
 assert.notEqual(classKeyForStudent(students[0]),classKeyForStudent(students[1]));
 assert.notEqual(classKeyForStudent(students[2]),classKeyForStudent(students[4]));
 assert.equal(groups.reduce((sum,g)=>sum+g.records.length,0),students.length);
 assert.equal(groups.filter(g=>g.course==='maktab').length,2);
 assert.deepEqual(groups.find(g=>g.course==='maktab'&&g.batch==='Batch 1').records.map(r=>r.studentCode),['ALIA00022','ALIA00011']);
});
test('Course labels are admin-editable, ALIA numbers preserved, similar name classes do not overlap',()=>{
 const groups=buildClassFirstGroups(students,{courseLabels:new Map([['muballigha','Muballiga'],['maktab','Maktab Students']])});
 assert.ok(groups.some(g=>g.label==='Muballiga · Year 1 (impossible)' )===false);
 assert.ok(groups.some(g=>g.label==='Muballiga · Year 1'));
 assert.ok(groups.some(g=>g.label==='Muballiga · Year 2'));
 assert.ok(groups.some(g=>g.label==='Maktab Students · Batch 1'));
 assert.ok(groups.some(g=>g.label==='Maktab Students · Batch 2'));
 assert.equal(groups.filter(g=>g.course==='muballigha').flatMap(g=>g.records).length,2);
});
test('Published homepage picks with result IDs can be filtered by the class they belong to',()=>{
 const results=[
  {id:'RESULT-111111111111111111111111',studentName:'Amina',courseId:'muallama',examTitle:'Annual',courseYear:0},
  {id:'RESULT-222222222222222222222222',studentName:'Zahra',courseId:'muballigha',courseYear:2,examTitle:'Annual'},
  {id:'RESULT-333333333333333333333333',studentName:'Amira',courseId:'muballigha',courseYear:1,examTitle:'Annual'}
 ];
 const groups=buildClassFirstGroups(results);
 assert.equal(groups.length,3);
 assert.deepEqual(groups.flatMap(g=>g.records.map(r=>r.id)).sort(),results.map(r=>r.id).sort());
});
test('Exam, competition certificate, published winner and audited preview use same class first picker',()=>{
 const exam=files('exam-admin.js'),competition=files('competition-certificates.js'),
  winners=files('homepage-winners-admin.js'),preview=files('admin-student-preview.js'),
  portal=files('student-login.html'),admin=files('admin.html');
 for(const file of [exam,competition,winners,preview]){
  assert.match(file,/createClassFirstStudentPicker/);
  assert.match(file,/\.setRecords\(/);
 }
 assert.match(exam,/studentPicker\.selectStudent\(record\.studentId/);
 assert.match(competition,/student\.onchange=showCertificates/);
 assert.match(winners,/ui\.picker\.setRecords\(results\.filter/);
 assert.match(preview,/studentCode:String\(d\.data\(\)\.studentCode/);
 assert.match(portal,/Step 2 · Select Student/);
 assert.match(admin,/id="competitionStudent"/);
});
test('Student picker does not read students or expose data to public, and existing access guards remain',()=>{
 const selector=files('student-class-selector.js');
 assert.doesNotMatch(selector,/firebase|getDocs\(|fetch\(|axios|document\.cookie/);
 const preview=files('admin-student-preview.js');
 assert.match(preview,/isVerifiedAcademyAdmin/);
 assert.match(preview,/adminStudentPreviews/);
 assert.match(preview,/serverTimestamp\(\)/);
});
