/* node --test tests/student-fees.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
import{summarizeFees,allRecordedPayments,validFeeLedger,indiaFeeClock}from'../fee-ledger-utils.js';
test('Paid entries retain amount, ISO payment date and receipt number',()=>{
 const ledger={'2026':{'2':{status:'Paid',amount:500,paidAt:'2026-02-15T12:30:00.000Z',receiptId:'MIA-FEB'},'4':{status:'Paid',amount:600,paidAt:'2026-04-05T12:30:00.000Z',receiptId:'MIA-APR'}}};
 const x=summarizeFees({ledger,year:2026,rate:500,asOf:{year:2026,month:5},enrolledAt:'2026-01-03'});
 assert.equal(x.paid,2);assert.equal(x.pending,3);assert.equal(x.pendingAmount,1500);assert.equal(x.collected,1100);
 assert.equal(x.months[1].paidAt,'2026-02-15T12:30:00.000Z');assert.equal(x.months[1].receiptId,'MIA-FEB');
});
test('Due-now count excludes months before enrollment and upcoming unpaid months',()=>{
 const a=summarizeFees({ledger:{},year:2026,rate:400,asOf:{year:2026,month:5},enrolledAt:'2026-03-08'});
 assert.equal(a.pending,3);assert.equal(a.beforeEnrollment,2);assert.equal(a.notDue,7);
 assert.equal(a.months[11].status,'Pending');
 assert.equal(a.months[0].status,'Before enrollment');
});
test('Historical paid month and all-year recorded payments',()=>{
 const ledger={'2025':{'10':{status:'Paid',amount:300,paidAt:'2025-10-07'}},'2026':{'3':{status:'Paid',amount:400,paidAt:'2026-03-01'}}};
 const all=allRecordedPayments(ledger);assert.equal(all.length,2);assert.equal(all[0].year,2026);assert.equal(all[1].monthName,'October');
});
test('Malformed fee ledger data and unrecorded pending amounts are not shown as payments',()=>{
 const out=validFeeLedger({'2026':{'1':{status:'Pending',amount:500},'2':{status:'Paid',amount:-80},'3':{status:'Paid',amount:400,paidAt:'2026-03-04'}}});
 assert.deepEqual(Object.keys(out['2026']),['3']);
 const x=summarizeFees({ledger:out,year:2026,rate:0,asOf:{year:2026,month:3}});
 assert.equal(x.paid,1);assert.equal(x.pending,2);assert.equal(x.pendingAmount,null);
});
test('Asia/Kolkata year/month are computed in India time',()=>{
 assert.deepEqual(indiaFeeClock(new Date('2026-12-31T22:00:00Z')),{year:2027,month:1});
});
test('Admin write atomically mirrors fee ledger only into approved Student Access and offers backfill',()=>{
 const admin=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
 assert.match(admin,/batch\.set\(studentRef,\{feeLedger:ledger\}/);
 assert.match(admin,/batch\.set\(accessRef,\{/);
 assert.match(admin,/Sync Fee History to Student Logins/);
 assert.match(admin,/feeEnrollmentDate/);
});
test('Student page calculates payment history from private authorized studentAccess',()=>{
 const student=readFileSync(new URL('../student-login.html',import.meta.url),'utf8');
 assert.match(student,/renderPrivateFeeLedger\(access,card\)/);
 assert.match(student,/summarizeFees\(\{ledger/);
 assert.match(student,/allRecordedPayments\(ledger\)/);
 assert.doesNotMatch(student,/collection\(db,'students'\)/);
});

test('December appears Pending in November but is excluded from amount due now',()=>{
 const report=summarizeFees({ledger:{},year:2026,rate:500,asOf:{year:2026,month:11},enrolledAt:'2026-01-01'});
 assert.equal(report.totalMonths,12);
 assert.equal(report.months.length,12);
 assert.equal(report.months[11].name,'December');
 assert.equal(report.months[11].status,'Pending');
 assert.equal(report.pending,11);
 assert.equal(report.notDue,1);
 assert.equal(report.remaining,12);
 assert.equal(report.fullYearReferenceAmount,6000);
 assert.equal(report.pendingAmount,5500);
 assert.equal(report.months.filter(m=>m.status==='Pending').length,12);
});
test('Twelve-month remaining count does not bill months before enrollment',()=>{
 const report=summarizeFees({ledger:{},year:2026,rate:500,asOf:{year:2026,month:11},enrolledAt:'2026-04-01'});
 assert.equal(report.totalMonths,12);
 assert.equal(report.beforeEnrollment,3);
 assert.equal(report.pending,8);
 assert.equal(report.notDue,1);
 assert.equal(report.remaining,9);
});
test('Unpaid months in future fee years display Pending but have zero currently due',()=>{
 const report=summarizeFees({ledger:{},year:2027,rate:500,asOf:{year:2026,month:11},enrolledAt:'2027-01-01'});
 assert.equal(report.pending,0);
 assert.equal(report.notDue,12);
 assert.equal(report.months[11].status,'Pending');
 assert.equal(report.pendingAmount,0);
});
test('Admin and Student fee panels show twelve-month total separately from months due',()=>{
 const admin=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
 const student=readFileSync(new URL('../student-login.html',import.meta.url),'utf8');
 assert.match(admin,/for\(let i=0;i<12;i\+\+\)/);
 assert.match(admin,/Unpaid in 12-month year/);
 assert.match(admin,/12-month reference total/);
 assert.match(student,/12-month fee register/);
 assert.match(student,/12-month reference total/);
 assert.match(admin,/Pending \(upcoming\)/);
 assert.match(student,/Pending \(12-month year\)/);
});
