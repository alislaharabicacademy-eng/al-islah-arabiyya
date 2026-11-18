import test from 'node:test';
import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
import{calculateSalarySplits,salaryCourseKey}from'../salary-split-utils.js';

const paid=(amount,month=11)=>({'2026':{[String(month)]:{status:'Paid',amount}}});
const student=(id,course,amount,extra={})=>({id,course,batch:extra.batch||'',
 feeLedger:amount===null?{}:paid(amount),...extra});
const teacher=(id,name,course,batch='',subjects=['Tajweed'])=>({id,name,
 assignments:subjects.map(subject=>({course,batch,subject}))});
const run=(students,teachers,extra={})=>calculateSalarySplits({month:'2026-11',students,teachers,...extra});

test('One paid student in each class: ₹1400 received, ₹850 teachers, ₹550 academy',()=>{
 const students=[student('u1','Muallama',500),student('u2','Muballiga',500),student('u3','Maktab',400,{batch:'A'})];
 const teachers=[teacher('t1','Ustadha 1','muallama'),teacher('t2','Ustadha 2','muballigha'),
  teacher('t3','Ustadha 3','muballigha'),teacher('t4','Ustadha 4','maktab','A')];
 const report=run(students,teachers);
 assert.deepEqual([report.totals.collected,report.totals.teacherPayable,report.totals.academyCollected,
  report.totals.unallocated],[1400,850,550,0]);
 assert.deepEqual(report.teachers.map(t=>t.payable),[250,200,200,200]);
 assert.equal(report.warnings.length,0);
});
test('Ten Muallama students split ₹5000 into ₹2500 salary and ₹2500 academy',()=>{
 const report=run(Array.from({length:10},(_,i)=>student('s'+i,'muallama',500)),[teacher('t1','Teacher','muallama')]);
 assert.equal(report.totals.projectedTeacher,2500);
 assert.equal(report.totals.academyCollected,2500);
 assert.equal(report.totals.teacherPayable,2500);
});
test('Multiple subjects by the same teacher count only once',()=>{
 const report=run([student('s','muallama',500)],[
  teacher('t','Teacher','muallama','',['Fiqh','Hadees','Tajweed'])
 ]);
 assert.equal(report.groups[0].teachers.length,1);
 assert.equal(report.totals.teacherPayable,250);
});
test('Never allocate receipts when number of teachers mismatches the policy',()=>{
 const r=run([student('s','muballigha',500)],[teacher('t','Only one teacher','muballigha')]);
 assert.equal(r.totals.collected,500);
 assert.equal(r.totals.teacherPayable,0);
 assert.equal(r.totals.academyCollected,0);
 assert.equal(r.totals.unallocated,500);
 assert.equal(r.warnings.length,1);
});
test('A teacher assigned to one Maktab batch is not counted in another',()=>{
 const r=run([student('s1','maktab',400,{batch:'Batch A'}),
  student('s2','maktab',400,{batch:'Batch B'})],[
  teacher('t1','A Teacher','maktab','Batch A'),teacher('t2','B Teacher','maktab','Batch B')]);
 assert.equal(r.totals.teacherPayable,400);
 assert.equal(r.totals.academyCollected,400);
 assert.equal(r.warnings.length,0);
});
test('Pending fees increase only projections, never received salary',()=>{
 const r=run([student('s','muallama',null)],[teacher('t','Teacher','muallama')]);
 assert.equal(r.totals.projectedFees,500);
 assert.equal(r.totals.projectedTeacher,250);
 assert.equal(r.totals.collected,0);
 assert.equal(r.totals.teacherPayable,0);
});
test('Concession splits proportionally, extra collections do not inflate teacher payout',()=>{
 const r=run([student('s1','muballigha',250),student('s2','muballigha',600)],[
  teacher('t1','A','muballigha'),teacher('t2','B','muballigha')]);
 assert.equal(r.totals.collected,850);
 assert.equal(r.totals.teacherPayable,600); // (₹100 x 2) + (₹200 x 2)
 assert.equal(r.totals.academyCollected,250);
});
test('Course fee editor rate takes priority, leaving changed academy remainder',()=>{
 const r=run([student('s','muallama',600)],[teacher('t','Teacher','muallama')],{
  courses:[{id:'muallama',monthlyFee:600}]});
 assert.equal(r.groups[0].rate,600);
 assert.equal(r.totals.teacherPayable,250);
 assert.equal(r.totals.academyCollected,350);
});
test('Inactive students and archived teachers cannot create automatic salary allocations',()=>{
 const r=run([student('s','muallama',500,{state:'Inactive'})],[teacher('t','Teacher','muallama')]);
 assert.equal(r.totals.students,0);
 const missing=run([student('s','muallama',500)],[{...teacher('t','Teacher','muallama'),recordStatus:'archived'}]);
 assert.equal(missing.totals.unallocated,500);
});
test('Different fee month is not counted as a payment in selected month',()=>{
 const s=student('s','muallama',500);
 s.feeLedger=paid(500,10);
 const r=run([s],[teacher('t','Teacher','muallama')]);
 assert.equal(r.totals.teacherPayable,0);
});
test('Admin only UI links to existing ledgers and does not mark salaries Paid',()=>{
 const html=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../salary-split-admin.js',import.meta.url),'utf8');
 for(const id of ['financeOpenSalarySplit','salarySplitPanel','salarySplitMonth','salarySplitRefresh','salarySplitCsv'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 assert.match(html,/initSalarySplitAdmin\(\{db,allow:\(\)=>active\}\)/);
 assert.doesNotMatch(ui,/setDoc\(|updateDoc\(|writeBatch\(/);
 assert.equal(salaryCourseKey("Children's Qur'an Maktab"),'maktab');
});
