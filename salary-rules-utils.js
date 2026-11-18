/* Admin-only course salary rules. No Firestore writes or salary-paid side effects.
   One revision begins in its effective YYYY-MM and applies until the next revision.
   Rupee computations use integer paise. All monetary outputs are INR. */
import {calculateSalarySplits,DEFAULT_SALARY_SPLITS,salaryCourseKey,paiseToRupees} from './salary-split-utils.js';

const paise=n=>Number.isFinite(Number(n)) && Number(n)>=0 ? Math.round(Number(n)*100):null;
const asText=v=>String(v??'').trim();
const norm=v=>asText(v).toLowerCase().replace(/[–—_]/g,'-').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const batchNorm=v=>asText(v).toLocaleLowerCase('en-IN');
const validMonth=v=>/^\d{4}-(0[1-9]|1[0-2])$/.test(asText(v));
const validId=v=>/^[a-z0-9][a-z0-9-]{0,99}$/.test(asText(v));
const methods=new Set(['per_student','percentage','fixed_monthly']);

export function canonicalSalaryCourse(value,courses=[]){
 const key=norm(value);
 if(!key)return '';
 const legacy=salaryCourseKey(value);
 if(legacy)return legacy;
 if(key==='aalima'||key==='alima'||key.startsWith('aalima-')||key.startsWith('alima-'))return 'alima';
 for(const c of courses){
  if(norm(c.id)===key||norm(c.name)===key){
   return salaryCourseKey(c.id)||salaryCourseKey(c.name)||
     ((norm(c.id)==='aalima')?'alima':norm(c.id));
  }
 }
 return key;
}
export function policyDocumentId(courseId,batch=''){
 if(!validId(courseId))throw Error('Select a valid course.');
 if(asText(batch).length>100)throw Error('Batch name must be 100 characters or less.');
 return courseId+(asText(batch)?'~'+encodeURIComponent(batchNorm(batch)):'');
}
export function effectiveRevision(policy,month){
 if(!validMonth(month)||!policy||!Array.isArray(policy.revisions))return null;
 return [...policy.revisions].filter(r=>r && validMonth(r.effectiveMonth)&&r.effectiveMonth<=month)
  .sort((a,b)=>b.effectiveMonth.localeCompare(a.effectiveMonth))[0]||null;
}
export function validateSalaryRule(rule){
 if(!rule||typeof rule!=='object'||!methods.has(rule.method))throw Error('Choose a supported salary method.');
 if(!validMonth(rule.effectiveMonth))throw Error('Choose a valid effective YYYY-MM.');
 const rate=paise(rule.monthlyFee);
 if(rate===null||rate===0||rate>100000000)throw Error('Monthly student fee must be greater than ₹0 (maximum ₹10 lakh).');
 const entries=rule.allocations;
 if(!Array.isArray(entries)||!entries.length||entries.length>30)throw Error('Assign at least one and no more than 30 teachers.');
 const seen=new Set();
 let sum=0;
 for(const row of entries){
  if(!row||typeof row.teacherId!=='string'||!row.teacherId||row.teacherId.length>200)throw Error('Select each teacher from the directory.');
  if(seen.has(row.teacherId))throw Error('A teacher may appear only once per course/batch.');
  seen.add(row.teacherId);
  if(typeof row.teacherName!=='string'||!asText(row.teacherName)||row.teacherName.length>150)throw Error('Teacher name is missing.');
  const n=paise(row.value);
  if(n===null||n<=0||n>100000000)throw Error('Each teacher share must be greater than zero and no more than ₹10 lakh (or 100%).');
  if(rule.method==='percentage'&&n>10000)throw Error('A percentage cannot exceed 100%.');
  sum+=n;
 }
 if(rule.method==='percentage'&&sum>10000)throw Error('Teacher percentages exceed 100%.');
 if(rule.method==='per_student'&&sum>rate)throw Error('Teacher shares exceed the monthly fee. Academy share cannot be negative.');
 // Fixed monthly salaries may exceed collections. That shortfall is visible in the report.
 return {rate,shares:sum,academyPerStudent:rule.method==='per_student'?paiseToRupees(rate-sum):
   rule.method==='percentage'?Number(((10000-sum)/100).toFixed(2)):null};
}
const money=n=>paiseToRupees(n);
const isActiveStudent=s=>asText(s.state).toLowerCase()!=='inactive'&&asText(s.recordStatus).toLowerCase()!=='archived';
function paidAmount(student,month){
 const entry=student.feeLedger?.[month.slice(0,4)]?.[String(Number(month.slice(5)))];
 return entry?.status==='Paid'?paise(entry.amount):null;
}
const groupKey=(course,batch)=>course+'|'+batchNorm(batch);
function pickPolicy(student,courses,policies,month){
 const course=canonicalSalaryCourse(student.course,courses);
 const batch=asText(student.batch);
 const candidates=[...policies].filter(p=>p.courseId===course && (
  !asText(p.batch) || batchNorm(p.batch)===batchNorm(batch)));
 const specific=candidates.find(p=>asText(p.batch)&&batchNorm(p.batch)===batchNorm(batch));
 const general=candidates.find(p=>!asText(p.batch));
 // A batch-specific rule takes precedence only when effective in the selected month.
 const r1=effectiveRevision(specific,month);
 if(r1)return {policy:specific,revision:r1};
 const r2=effectiveRevision(general,month);
 return r2?{policy:general,revision:r2}:null;
}
function computedCustomGroup({policy,revision,students,month,courses}){
 const course=courses.find(c=>canonicalSalaryCourse(c.id,courses)===policy.courseId);
 const label=asText(course?.name)||policy.courseId;
 const g={id:'rule:'+policy.id,course:policy.courseId,batch:asText(policy.batch),
  label:label+(policy.batch?' · '+policy.batch:''),
  method:revision.method,effectiveMonth:revision.effectiveMonth,
  rate:money(paise(revision.monthlyFee)),teacherShare:0,teacherCount:revision.allocations.length,
  teachers:revision.allocations.map(a=>({id:a.teacherId,name:a.teacherName,share:Number(a.value)})),
  studentCount:students.length,paidStudents:0,projectedFees:0,collected:0,
  projectedTeacher:0,projectedAcademy:0,teacherPayable:0,academyCollected:0,unallocated:0,warning:'',
  salaryFromReceipts:0,fixedCommitment:0};
 try{validateSalaryRule(revision);}catch(e){g.warning=e.message}
 const rate=paise(revision.monthlyFee)||0,teacherEarnings=new Map();
 for(const a of revision.allocations)teacherEarnings.set(a.teacherId,{id:a.teacherId,name:a.teacherName,projected:0,payable:0,groups:[g.label]});
 g.projectedFees=students.length*rate;
 if(!g.warning){
  const expectedShares=revision.allocations.map(a=>revision.method==='percentage'?
   Math.round(rate*paise(a.value)/10000):paise(a.value));
  const projectedTeachers=revision.method==='fixed_monthly'
   ?expectedShares.reduce((s,v)=>s+v,0)
   :students.length*expectedShares.reduce((s,v)=>s+v,0);
  g.projectedTeacher=projectedTeachers;
  g.projectedAcademy=g.projectedFees-projectedTeachers;
  for(let i=0;i<revision.allocations.length;i++){
   const a=revision.allocations[i],t=teacherEarnings.get(a.teacherId);
   t.projected=(revision.method==='fixed_monthly'?1:students.length)*expectedShares[i];
  }
  if(revision.method==='fixed_monthly'){
   g.teacherPayable=projectedTeachers;g.fixedCommitment=projectedTeachers;
   for(let i=0;i<revision.allocations.length;i++)
    teacherEarnings.get(revision.allocations[i].teacherId).payable=expectedShares[i];
  }
 }
 for(const student of students){
  const amount=paidAmount(student,month);
  if(amount===null)continue;
  g.paidStudents++;g.collected+=amount;
  if(g.warning){g.unallocated+=amount;continue;}
  if(revision.method==='fixed_monthly')continue;
  const capped=Math.min(amount,rate);
  const allocations=revision.allocations.map(a=>revision.method==='percentage'
   ?Math.round(capped*paise(a.value)/10000)
   :Math.round(paise(a.value)*capped/rate));
  const teacherTotal=allocations.reduce((a,b)=>a+b,0);
  if(teacherTotal>amount){g.warning='Rounding error: teacher shares exceed collected fees.';break}
  g.teacherPayable+=teacherTotal;g.salaryFromReceipts+=teacherTotal;
  for(let i=0;i<revision.allocations.length;i++)teacherEarnings.get(revision.allocations[i].teacherId).payable+=allocations[i];
 }
 // Never partially allocate a malformed policy: quarantine the whole group for correction.
 if(g.warning){
  g.unallocated=g.collected;g.teacherPayable=0;g.projectedTeacher=0;g.projectedAcademy=0;
  g.salaryFromReceipts=0;g.fixedCommitment=0;
  for(const t of teacherEarnings.values()){t.projected=0;t.payable=0}
  g.academyCollected=0;
 }else{
  g.academyCollected=g.collected-g.teacherPayable;
 }
 for(const k of ['projectedFees','collected','projectedTeacher','projectedAcademy','teacherPayable',
  'academyCollected','unallocated','salaryFromReceipts','fixedCommitment'])g[k]=money(g[k]);
 for(const t of teacherEarnings.values()){t.projected=money(t.projected);t.payable=money(t.payable)}
 return {group:g,teachers:[...teacherEarnings.values()]};
}

/** Combine immutable, effective-dated custom policies with existing fallback defaults.
    An explicit policy overrides only the matching course or course+batch.
    Existing salary-paid records are never read or modified here. */
export function calculateConfigurableSalarySplits({students=[],teachers=[],courses=[],policies=[],month}){
 if(!validMonth(month))throw Error('Choose a valid YYYY-MM month.');
 const allPolicies=policies.filter(p=>p&&validId(p.courseId)&&Array.isArray(p.revisions))
  .map(p=>({...p,id:asText(p.id)||policyDocumentId(p.courseId,p.batch||'')}));
 const customStudents=new Map(),legacyStudents=[];
 for(const s of students){
  if(!isActiveStudent(s)){legacyStudents.push(s);continue}
  const chosen=pickPolicy(s,courses,allPolicies,month);
  if(!chosen){legacyStudents.push(s);continue;}
  const key=chosen.policy.id;
  if(!customStudents.has(key))customStudents.set(key,{...chosen,students:[]});
  customStudents.get(key).students.push(s);
 }
 // Fixed salary contracts accrue even if there were no fee-paying students.
 for(const p of allPolicies){
  if(!effectiveRevision(p,month)||customStudents.has(p.id))continue;
  if(effectiveRevision(p,month).method==='fixed_monthly'){
   customStudents.set(p.id,{policy:p,revision:effectiveRevision(p,month),students:[]});
  }
 }
 const report=calculateSalarySplits({students:legacyStudents,teachers,courses,month});
 report.totals.salaryFromReceipts=report.totals.teacherPayable;
 report.totals.fixedCommitment=0;
 const totals=report.totals,teacherMap=new Map(report.teachers.map(t=>[t.id,t]));
 for(const x of customStudents.values()){
  const {group,teachers:ruleTeachers}=computedCustomGroup({...x,month,courses});
  report.groups.push(group);
  report.warnings.push(...(group.warning?[group.label+': '+group.warning]:[]));
  totals.students+=group.studentCount;
  totals.paidStudents+=group.paidStudents;
  for(const k of ['projectedFees','collected','projectedTeacher','projectedAcademy','teacherPayable',
   'academyCollected','unallocated','salaryFromReceipts','fixedCommitment'])
   totals[k]=Number((totals[k]+group[k]).toFixed(2));
  for(const t of ruleTeachers){
   if(!teacherMap.has(t.id)){
    teacherMap.set(t.id,{id:t.id,name:t.name,projected:0,payable:0,groups:[]});
   }
   const record=teacherMap.get(t.id);
   record.projected=Number((record.projected+t.projected).toFixed(2));
   record.payable=Number((record.payable+t.payable).toFixed(2));
   if(!record.groups.includes(group.label))record.groups.push(group.label);
  }
 }
 report.groups.sort((a,b)=>a.label.localeCompare(b.label));
 report.teachers=[...teacherMap.values()].sort((a,b)=>a.name.localeCompare(b.name));
 report.hasFixed=report.groups.some(g=>g.method==='fixed_monthly');
 report.hasCustom=report.groups.some(g=>!!g.method);
 report.policyCount=customStudents.size;
 return report;
}
