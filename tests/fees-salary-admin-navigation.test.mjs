import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const admin=readFileSync(new URL('../admin.html',import.meta.url),'utf8');

test('Admin menu contains a dedicated Fees & Salary Management hub',()=>{
  assert.match(admin,/data-menu-group="management"/);
  assert.match(admin,/data-tab="finance">💳 Fees &amp; Salary Management<\/button>/);
  assert.match(admin,/id="tab-finance" class="tabpage hidden"/);
  assert.match(admin,/id="financeHubHeading"/);
  assert.ok(admin.includes("'finance'"), 'finance must be registered as an Admin tab');
});

test('Finance hub opens real existing ledgers and payroll without copying their state',()=>{
  for(const id of ['financeOpenStudentFees','financeOpenSalaryRegister','financeOpenTeacherPayroll','financeOpenFeeStructure']){
    assert.equal((admin.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' must appear exactly once');
  }
  assert.match(admin,/switchTab\('students'\);\s*await renderRecords\('students'\)/);
  assert.match(admin,/\$\('studentFeesPanel'\)\.scrollIntoView/);
  assert.match(admin,/switchTab\('teachers'\);\s*showTeacherMode\('management'\);\s*await loadTeacherDirectory\(\)/);
  assert.match(admin,/\$\(target==='salaryRegister'\?'teacherSalaryRegister':'teacherPayroll'\)\.scrollIntoView/);
  assert.match(admin,/switchTab\('fees'\)/);
  for(const existing of ['studentFeesPanel','teacherSalaryRegister','teacherPayroll','teacherManagementMode','tab-fees']){
    assert.equal((admin.match(new RegExp('id="'+existing+'"','g'))||[]).length,1,'preserve existing '+existing);
  }
  assert.doesNotMatch(admin.slice(admin.indexOf('id="tab-finance"'),admin.indexOf('id="tab-fees"')),/type="submit"/);
});
