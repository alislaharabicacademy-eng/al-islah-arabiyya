import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateConfigurableSalarySplits,effectiveRevision,validateSalaryRule,policyDocumentId,canonicalSalaryCourse}
 from '../salary-rules-utils.js';

const paid=(amount,year='2026',month='11')=>({[year]:{[month]:{status:'Paid',amount}}});
const student=(course,amount,extra={})=>({course,batch:'',feeLedger:amount===null?{}:paid(amount),...extra});
const teacher=(id,name,course,batch='')=>({id,name,assignments:[{course,batch,subject:'Hadith'}]});
const rule=(courseId,method,allocations,monthlyFee,{batch='',from='2026-11',id}={})=>({
 id:id??policyDocumentId(courseId,batch),courseId,batch,
 revisions:[{effectiveMonth:from,monthlyFee,method,allocations:allocations.map(a=>({teacherId:a[0],teacherName:a[1],value:a[2]}))}]
});
const run=(args)=>calculateConfigurableSalarySplits({month:'2026-11',students:[],teachers:[],courses:[],policies:[],...args});

test('Muballigha + Aalima salary combines into one teacher, academy remainder by course',()=>{
 const teachers=[{id:'a',name:'Ustadha A',assignments:[{course:'muballigha',subject:'Quran'},{course:'alima',subject:'Fiqh'}]},
  teacher('b','Ustadha B','muballigha')];
 const report=run({
  students:[student('Muballiga',500),student('Aalima',1200)],
  teachers,courses:[{id:'alima',name:'Aalima',monthlyFee:1200}],
  policies:[rule('alima','per_student',[['a','Ustadha A',800]],1200)]
 });
 assert.deepEqual([report.totals.collected,report.totals.teacherPayable,report.totals.academyCollected],[1700,1200,500]);
 assert.equal(report.teachers.find(t=>t.id==='a').payable,1000);
 assert.equal(report.groups.find(g=>g.course==='alima').teacherPayable,800);
 assert.equal(report.totals.otherCourseStudents,0);
});
test('Muallama, Muballigha, Maktab default shares are preserved without saved rules',()=>{
 const report=run({students:[student('Muallama',500),student('Muballiga',500),student('Maktab',400,{batch:'B'})],
  teachers:[teacher('u','Muallama teacher','muallama'),teacher('m1','B teacher','muballigha'),
    teacher('m2','C teacher','muballigha'),teacher('k','K teacher','maktab','B')]});
 assert.deepEqual([report.totals.collected,report.totals.teacherPayable,report.totals.academyCollected],[1400,850,550]);
});
test('Any newly added course can have custom salary distribution',()=>{
 const report=run({students:[student('Tajweed For Girls',900)],courses:[{id:'tajweed-for-girls',name:'Tajweed For Girls'}],
 policies:[rule('tajweed-for-girls','per_student',[['x','Ustadha X',350],['y','Ustadha Y',200]],900)]});
 assert.deepEqual([report.totals.collected,report.totals.teacherPayable,report.totals.academyCollected],[900,550,350]);
});
test('Percentage rules support uneven teacher portions and split partial fee accurately',()=>{
 const report=run({students:[student('alima',600),student('alima',1200)],
 policies:[rule('alima','percentage',[['a','A',45],['b','B',25]],1200)]});
 assert.equal(report.totals.collected,1800);
 assert.equal(report.totals.teacherPayable,1260);
 assert.equal(report.totals.academyCollected,540);
 assert.deepEqual(report.teachers.filter(t=>t.payable).map(t=>t.payable),[810,450]);
});
test('Future revision does not alter earlier salary allocations',()=>{
 const p=rule('alima','per_student',[['a','A',800]],1200);
 p.revisions.push({effectiveMonth:'2026-12',monthlyFee:1200,method:'per_student',
  allocations:[{teacherId:'a',teacherName:'A',value:400},{teacherId:'b',teacherName:'B',value:400}]});
 assert.equal(effectiveRevision(p,'2026-11').allocations.length,1);
 assert.equal(effectiveRevision(p,'2026-12').allocations.length,2);
 const nov=run({students:[student('alima',1200)],policies:[p]});
 const dec=calculateConfigurableSalarySplits({students:[student('alima',1200,{feeLedger:paid(1200,'2026','12')})],
  teachers:[],courses:[],policies:[p],month:'2026-12'});
 assert.equal(nov.teachers.find(t=>t.id==='a').payable,800);
 assert.equal(dec.teachers.find(t=>t.id==='a').payable,400);
 assert.equal(dec.teachers.find(t=>t.id==='b').payable,400);
});
test('Fixed monthly salaries are due even if students do not pay; academy may have shortfall',()=>{
 const report=run({students:[student('alima',null)],policies:[rule('alima','fixed_monthly',[['a','A',3000]],1200)]});
 assert.equal(report.totals.collected,0);
 assert.equal(report.totals.teacherPayable,3000);
 assert.equal(report.totals.salaryFromReceipts,0);
 assert.equal(report.totals.fixedCommitment,3000);
 assert.equal(report.totals.academyCollected,-3000);
 assert.equal(report.hasFixed,true);
});
test('Batch-specific policy can override course default without double-counting',()=>{
 const general=rule('maktab','per_student',[['a','A',200]],400);
 const specific=rule('maktab','per_student',[['b','B',300]],400,{batch:'Junior'});
 const report=run({students:[student('Maktab',400,{batch:'Junior'}),student('Maktab',400,{batch:'Senior'})],
  teachers:[teacher('a','A','maktab','Senior')],policies:[general,specific]});
 assert.deepEqual([report.totals.students,report.totals.teacherPayable,report.totals.academyCollected],[2,500,300]);
 assert.equal(report.groups.length,2);
});
test('Reject duplicate teacher, over-allocation, missing month and over-100% share',()=>{
 const valid={effectiveMonth:'2026-11',monthlyFee:500,method:'per_student',
  allocations:[{teacherId:'a',teacherName:'A',value:250}]};
 assert.equal(validateSalaryRule(valid).academyPerStudent,250);
 assert.throws(()=>validateSalaryRule({...valid,allocations:[valid.allocations[0],valid.allocations[0]]}),/only once/);
 assert.throws(()=>validateSalaryRule({...valid,allocations:[{teacherId:'a',teacherName:'A',value:501}]}),/exceed/);
 assert.throws(()=>validateSalaryRule({...valid,method:'percentage',allocations:[{teacherId:'a',teacherName:'A',value:101}]}),/100%/);
 assert.throws(()=>validateSalaryRule({...valid,effectiveMonth:'2026-13'}),/valid/);
 assert.equal(canonicalSalaryCourse('Aalima 3rd Year'),'alima');
});
test('Admin controls and collection rules remain private; no payroll writes in calculator',()=>{
 const html=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
 const editor=readFileSync(new URL('../salary-rule-editor-admin.js',import.meta.url),'utf8');
 const rules=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
 const engine=readFileSync(new URL('../salary-rules-utils.js',import.meta.url),'utf8');
 assert.match(html,/id="salarySplitPanel"/);
 assert.match(editor,/salarySplitPolicies/);
 assert.match(editor,/runTransaction/);
 assert.match(rules,/match \/salarySplitPolicies\/\{policyId\} \{\s*allow read, create, update, delete: if isAdmin\(\);/);
 assert.doesNotMatch(engine,/setDoc\(|updateDoc\(|writeBatch\(/);
});
