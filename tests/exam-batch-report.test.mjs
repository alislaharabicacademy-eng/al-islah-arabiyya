import test from 'node:test';
import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
const src=readFileSync(new URL('../exam-batch-report.js',import.meta.url),'utf8');
const {groupedPublishedResults,publishedResultFilterOptions}=
 new Function(src.replace(/^export /gm,'')+';return {groupedPublishedResults,publishedResultFilterOptions}')();
const record=(id,name,course,percent,{passed=true,published=true,examTitle='Annual Examination',academicYear='2026-2027',batch='',scheme=50}={})=>({
 id,studentId:id,studentCode:'ALIA'+id.padStart(5,'0'),studentName:name,
 courseId:course,course:course==='muallama'?'Muallama':course==='alima'?'Alima':'Hifz Class',
 batch,examTitle,academicYear,examDate:'2026-03-15',published,passed,percent,
 subjects:[{name:'Arabic',max:scheme,score:scheme*percent/100}],
 total:scheme*percent/100,maxTotal:scheme,updatedAt:'2026-11-10T10:00:00Z'
});
test('All published courses appear, drafts are excluded',()=>{
 const source=[record('1','Farhana','muallama',95),record('2','Anas','muallama',90,{published:false}),record('3','Ayana','alima',82),record('4','Aadhil','hifz',80)];
 const groups=groupedPublishedResults(source);
 assert.equal(groups.length,3);
 assert.equal(groups.reduce((n,g)=>n+g.studentCount,0),3);
 assert.equal(groups.find(g=>g.courseId==='muallama').records.length,1);
 assert.deepEqual(publishedResultFilterOptions(source).courses.map(x=>x[0]),['alima','hifz','muallama']);
});
test('Class filter and academic year/exam filters are isolated',()=>{
 const source=[record('1','A','muallama',95),record('2','B','alima',82),
 record('3','C','muallama',75,{academicYear:'2025-2026'}),record('4','D','muallama',65,{examTitle:'Midterm'})];
 assert.equal(groupedPublishedResults(source,{course:'muallama',academicYear:'2026-2027',exam:'Annual Examination'})[0].studentCount,1);
});
test('Rank 1st, 2nd, 3rd calculated by percentage and equal marks share rank',()=>{
 const source=[record('1','A','muallama',92),record('2','B','muallama',92),
 record('3','C','muallama',89),record('4','D','muallama',83)];
 const g=groupedPublishedResults(source)[0];
 assert.deepEqual(g.records.map(r=>r.rank),[1,1,3,4]);
 assert.deepEqual(g.winners.map(r=>r.rank),[1,1,3]);
});
test('Failed result does not displace passing first position',()=>{
 const source=[record('1','Fail high','muallama',98,{passed:false}),record('2','First pass','muallama',88)];
 const g=groupedPublishedResults(source)[0];
 assert.equal(g.records[0].rank,null);assert.equal(g.records[1].rank,1);
});
test('Different maximum marks/subjects block misleading top-three ranks',()=>{
 const source=[record('1','A','alima',92,{scheme:50}),record('2','B','alima',85,{scheme:100})];
 const g=groupedPublishedResults(source)[0];assert.equal(g.schemeComparable,false);assert.deepEqual(g.winners,[]);
});
test('Duplicate same-student exam results count once with the latest record',()=>{
 const a=record('1','A','muallama',70),b={...a,id:'OTHER',percent:90,updatedAt:'2026-11-11T10:00:00Z'};
 const g=groupedPublishedResults([a,b])[0];assert.equal(g.records.length,1);assert.equal(g.records[0].percent,90);
});
test('Admin has one-click all-class A4 PDF with explicit sharing permission',()=>{
 const admin=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
 const exam=readFileSync(new URL('../exam-admin.js',import.meta.url),'utf8');
 assert.match(admin,/id="batchResultCourse"/);
 assert.match(admin,/id="downloadPublishedResultRegister"/);
 assert.match(admin,/id="downloadPublishedTop3"/);
 assert.match(admin,/id="batchReportShareConsent"/);
 assert.match(exam,/getDocs\(collection\(db,'examResults'\)\)/);
 assert.match(exam,/createAcademyPublishedRegisterPdf\(groups/);
});
