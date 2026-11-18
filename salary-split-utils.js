// Private Admin preview only. This module makes no Firestore writes and never marks salaries paid.
export const DEFAULT_SALARY_SPLITS=Object.freeze({
 muallama:Object.freeze({label:'Muallama',monthlyFee:500,teacherCount:1,perTeacher:250}),
 muballigha:Object.freeze({label:'Muballigha',monthlyFee:500,teacherCount:2,perTeacher:200}),
 maktab:Object.freeze({label:'Maktab',monthlyFee:400,teacherCount:1,perTeacher:200})
});

export function salaryCourseKey(value){
 const v=String(value||'').trim().toLowerCase().replace(/[–—_]/g,'-').replace(/\s+/g,' ');
 if(/muball|mubal/.test(v))return 'muballigha';
 if(/muall|mual/.test(v))return 'muallama';
 if(/maktab|makthab/.test(v))return 'maktab';
 return '';
}
const rupeesToPaise=value=>{
 const n=Number(value);
 return Number.isFinite(n)&&n>=0?Math.round(n*100):null;
};
export const paiseToRupees=value=>Number((value/100).toFixed(2));
const batchKey=value=>String(value||'').trim().toLowerCase();
const activeStudent=s=>String(s.state||'').toLowerCase()!=='inactive'
 && String(s.recordStatus||'').toLowerCase()!=='archived';
const activeTeacher=t=>String(t.recordStatus||'').toLowerCase()!=='archived';
const monthEntry=(student,year,month)=>{
 const entry=student.feeLedger?.[String(year)]?.[String(Number(month))];
 if(!entry||entry.status!=='Paid')return null;
 return rupeesToPaise(entry.amount);
};

export function salaryRatesFromCourses(courses=[]){
 const result={};
 for(const course of courses){
  const key=salaryCourseKey(course.id||course.name);
  if(!key)continue;
  const fee=rupeesToPaise(course.monthlyFee);
  if(fee!==null&&fee>0&&result[key]===undefined)result[key]=fee;
 }
 return result;
}

// Split a month's real PAID fee entries. Unpaid fees do NOT become teacher cash.
// The projected column is a separate, non-payable full-enrolment illustration.
// Never allocate to a wrong/duplicate teacher when assignments do not match policy.
export function calculateSalarySplits({students=[],teachers=[],courses=[],month}){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month||'')))throw Error('Choose a valid YYYY-MM month.');
 const [year,number]=month.split('-');
 const rates=salaryRatesFromCourses(courses);
 const groupMap=new Map(),teacherTotals=new Map();
 const totals={students:0,paidStudents:0,projectedFees:0,collected:0,projectedTeacher:0,
  projectedAcademy:0,teacherPayable:0,academyCollected:0,unallocated:0,otherCourseStudents:0};
 const validTeachers=teachers.filter(activeTeacher);
 for(const teacher of validTeachers)teacherTotals.set(teacher.id,{id:teacher.id,name:teacher.name||'Teacher',projected:0,payable:0,groups:[]});
 for(const student of students.filter(activeStudent)){
  const course=salaryCourseKey(student.course);
  if(!course){totals.otherCourseStudents++;continue;}
  const batch=course==='maktab'?batchKey(student.batch):'';
  const id=course+'|'+batch;
  if(!groupMap.has(id)){
   const policy=DEFAULT_SALARY_SPLITS[course],rate=rates[course]??rupeesToPaise(policy.monthlyFee);
   groupMap.set(id,{id,course,batch,label:policy.label+(batch?' · '+String(student.batch).trim():''),
    rate,teacherShare:rupeesToPaise(policy.perTeacher),teacherCount:policy.teacherCount,
    students:[],teachers:[],warning:'',paidStudents:0,projectedFees:0,collected:0,
    projectedTeacher:0,projectedAcademy:0,teacherPayable:0,academyCollected:0,unallocated:0});
  }
  groupMap.get(id).students.push(student);
 }
 for(const group of groupMap.values()){
  const assigned=validTeachers.filter(teacher=>
   Array.isArray(teacher.assignments)&&teacher.assignments.some(a=>
    salaryCourseKey(a.course)===group.course&&
    (group.course!=='maktab'||batchKey(a.batch)===group.batch)));
  group.teachers=assigned.map(t=>({id:t.id,name:t.name||'Teacher'}));
  const required=group.teacherCount*group.teacherShare;
  if(group.course==='maktab'&&!group.batch)group.warning='Maktab student batch missing. Assign student and teacher batches.';
  else if(assigned.length!==group.teacherCount)group.warning=
   'Expected '+group.teacherCount+' assigned teacher(s); found '+assigned.length+'. Fix Teacher Directory assignments.';
  else if(group.rate<required)group.warning='Course fee is lower than total teacher shares. Check Course Fee Structure.';
  group.projectedFees=group.students.length*group.rate;
  if(!group.warning){
   group.projectedTeacher=group.students.length*required;
   group.projectedAcademy=group.projectedFees-group.projectedTeacher;
   for(const t of assigned){
    const result=teacherTotals.get(t.id);
    result.projected+=group.students.length*group.teacherShare;
    result.groups.push(group.label);
   }
  }
  for(const student of group.students){
   const received=monthEntry(student,year,number);
   if(received===null)continue;
   group.paidStudents++;
   group.collected+=received;
   if(group.warning){
    group.unallocated+=received;
    continue;
   }
   const share=group.rate?Math.round(group.teacherShare*Math.min(received,group.rate)/group.rate):0;
   const teacherPart=share*assigned.length;
   group.teacherPayable+=teacherPart;
   group.academyCollected+=received-teacherPart;
   for(const teacher of assigned)teacherTotals.get(teacher.id).payable+=share;
  }
  totals.students+=group.students.length;
  totals.paidStudents+=group.paidStudents;
  totals.projectedFees+=group.projectedFees;
  totals.collected+=group.collected;
  totals.projectedTeacher+=group.projectedTeacher;
  totals.projectedAcademy+=group.projectedAcademy;
  totals.teacherPayable+=group.teacherPayable;
  totals.academyCollected+=group.academyCollected;
  totals.unallocated+=group.unallocated;
 }
 const moneyFields=['rate','teacherShare','projectedFees','collected','projectedTeacher','projectedAcademy','teacherPayable','academyCollected','unallocated'];
 const outGroups=[...groupMap.values()].sort((a,b)=>a.label.localeCompare(b.label)).map(g=>{
  const out={...g,studentCount:g.students.length};
  delete out.students;
  for(const field of moneyFields)out[field]=paiseToRupees(out[field]);
  return out;
 });
 const outTotals={...totals};
 for(const field of ['projectedFees','collected','projectedTeacher','projectedAcademy','teacherPayable','academyCollected','unallocated'])
  outTotals[field]=paiseToRupees(outTotals[field]);
 return {month,groups:outGroups,teachers:[...teacherTotals.values()].sort((a,b)=>a.name.localeCompare(b.name)).map(t=>({...t,
  projected:paiseToRupees(t.projected),payable:paiseToRupees(t.payable)})),totals:outTotals,
  warnings:outGroups.filter(g=>g.warning).map(g=>g.label+': '+g.warning)};
}
