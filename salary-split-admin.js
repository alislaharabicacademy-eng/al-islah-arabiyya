import{collection,getDocs}from'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import{calculateSalarySplits}from'./salary-split-utils.js';

const money=value=>'₹'+Number(value||0).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2});
const $=id=>document.getElementById(id);
function cell(row,value){
 const td=document.createElement('td');td.textContent=String(value??'—');row.append(td);return td;
}
function table(headers){
 const scroll=document.createElement('div');scroll.style.cssText='max-width:100%;overflow:auto;margin:14px 0;border:1px solid #d5e3d9;border-radius:12px';
 const el=document.createElement('table');el.style.cssText='min-width:960px;width:100%;border-collapse:collapse;background:#fff;font-size:12px';
 const thead=document.createElement('thead'),tr=document.createElement('tr');
 for(const h of headers){
  const th=document.createElement('th');th.textContent=h;
  th.style.cssText='padding:10px;background:#e2f2e8;color:#154c33;text-align:left;white-space:nowrap';
  tr.append(th);
 }
 thead.append(tr);el.append(thead);
 const body=document.createElement('tbody');el.append(body);scroll.append(el);
 return {scroll,body};
}
function appendSummary(root,label,value){
 const card=document.createElement('span');card.className='stat';
 card.textContent=label+': '+value;root.append(card);
}
function csvField(value){
 const s=String(value??'');
 return /[,"\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}
function exportCsv(report){
 const data=[['Section','Class / Teacher','Students','Monthly Fee','Assigned Teachers','Teacher / Student',
  'Projected Fees','Projected Teacher Salary','Collected Fees','Teacher Share From Paid Fees','Academy Share','Status']];
 for(const g of report.groups)data.push(['Class',g.label,g.studentCount,g.rate,g.teachers.map(t=>t.name).join(' + '),
  g.teacherShare,g.projectedFees,g.projectedTeacher,g.collected,g.teacherPayable,g.academyCollected,g.warning||'Verified']);
 for(const t of report.teachers.filter(t=>t.groups.length))data.push(['Teacher',t.name,'','','','',
  '',t.projected,'',t.payable,'',t.groups.join(' + ')]);
 data.push(['TOTAL','',report.totals.students,'','', '',report.totals.projectedFees,
  report.totals.projectedTeacher,report.totals.collected,report.totals.teacherPayable,
  report.totals.academyCollected,'Unallocated received fees: '+report.totals.unallocated]);
 const blob=new Blob(['\ufeff'+data.map(row=>row.map(csvField).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='Academy_Fee_Salary_Split_'+report.month+'.csv';
 document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function currentIndiaMonth(){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit'}).formatToParts(new Date());
 const part=type=>parts.find(p=>p.type===type)?.value||'';
 return part('year')+'-'+part('month');
}
function render(report){
 const summary=$('salarySplitSummary'),groups=$('salarySplitGroups'),teachers=$('salarySplitTeachers');
 summary.replaceChildren();groups.replaceChildren();teachers.replaceChildren();
 const t=report.totals;
 appendSummary(summary,'Students',t.students);
 appendSummary(summary,'Projected fee total',money(t.projectedFees));
 appendSummary(summary,'Actually received',money(t.collected));
 appendSummary(summary,'Teacher share of receipts',money(t.teacherPayable));
 appendSummary(summary,'Academy share of receipts',money(t.academyCollected));
 appendSummary(summary,'Not allocated (review)',money(t.unallocated));
 if(!report.groups.length){
  groups.textContent='No currently active Muallama, Muballigha or Maktab student records found.';
  return;
 }
 const groupTable=table(['Class / Batch','Students','Monthly Fee','Teachers','Teacher per student',
  'Projected teacher salary','Collected fees','Teacher share received','Academy share received','Allocation check']);
 for(const g of report.groups){
  const tr=document.createElement('tr');
  for(const value of [g.label,g.studentCount,money(g.rate),
   g.teachers.map(x=>x.name).join(', ')+' ('+g.teachers.length+'/'+g.teacherCount+')',
   money(g.teacherShare),g.warning?'Needs review':money(g.projectedTeacher),money(g.collected),
   money(g.teacherPayable),money(g.academyCollected),g.warning||'✓ Ready']){
   const td=cell(tr,value);td.style.cssText='padding:10px;border-bottom:1px solid #e4eee7;vertical-align:top';
   if(g.warning)td.style.background='#fff5e5';
  }
  groupTable.body.append(tr);
 }
 groups.append(groupTable.scroll);
 const teacherTable=table(['Teacher','Classes / Batches','Estimated salary on full fees','Share from PAID student fees']);
 for(const teacher of report.teachers.filter(t=>t.groups.length)){
  const tr=document.createElement('tr');
  for(const value of [teacher.name,teacher.groups.join(' · '),money(teacher.projected),money(teacher.payable)]){
   const td=cell(tr,value);td.style.cssText='padding:10px;border-bottom:1px solid #e4eee7';
  }
  teacherTable.body.append(tr);
 }
 if(teacherTable.body.children.length){
  const h=document.createElement('h4');h.textContent='Teacher-wise Estimated Salary';
  teachers.append(h,teacherTable.scroll);
 }
 const note=document.createElement('p');note.className='section-note';
 note.textContent='Projected salary assumes all current students pay their full monthly fees. Received share uses only the selected month’s saved Paid entries. Concessions are split proportionally; any amount over the standard monthly fee stays with the Academy. Each teacher is counted once per class/batch, even with multiple assigned subjects. This preview does not change saved teacher salary, attendance, payment status or past salary registers.';
 teachers.append(note);
 if(report.warnings.length){
  const warning=document.createElement('p');warning.style.cssText='color:#8b4c0c;background:#fff5e5;padding:12px;border-radius:9px';
  warning.textContent='⚠ Review assignments: '+report.warnings.join(' | ');
  teachers.append(warning);
 }
 if(t.otherCourseStudents){
  const foot=document.createElement('p');foot.className='section-note';
  foot.textContent=t.otherCourseStudents+' students in other courses were not included because no salary rule has been provided for those courses.';
  teachers.append(foot);
 }
}

export function initSalarySplitAdmin({db,allow}){
 let latest=null,busy=false;
 const month=$('salarySplitMonth'),status=$('salarySplitStatus'),refresh=$('salarySplitRefresh'),download=$('salarySplitCsv');
 month.value=currentIndiaMonth();
 download.onclick=()=>{if(latest)exportCsv(latest)};
 month.onchange=()=>{latest=null;download.disabled=true;status.textContent='Month changed. Click Calculate to refresh fee and salary records.'};
 async function load(){
  if(!allow()||busy)return;
  $('salarySplitPanel').hidden=false;
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month.value)){status.textContent='Choose a valid fee month.';return}
  busy=true;refresh.disabled=true;download.disabled=true;
  status.textContent='Loading private student fee ledgers and current teacher assignments…';
  try{
   const [students,teachers,courses]=await Promise.all([
    getDocs(collection(db,'students')),getDocs(collection(db,'teachers')),getDocs(collection(db,'courses'))
   ]);
   if(!allow())return;
   latest=calculateSalarySplits({month:month.value,
    students:students.docs.map(d=>({id:d.id,...d.data()})),
    teachers:teachers.docs.map(d=>({id:d.id,...d.data()})),
    courses:courses.docs.map(d=>({id:d.id,...d.data()}))});
   render(latest);download.disabled=false;
   status.textContent=latest.warnings.length?
    '⚠ Preview calculated, but '+latest.warnings.length+' class/batch allocation(s) require assignment correction. Unallocated receipts must not be treated as salary.':
    '✓ Salary and Academy share calculated from saved fee receipts. No payments were changed.';
  }catch(error){
   latest=null;$('salarySplitSummary').replaceChildren();$('salarySplitGroups').replaceChildren();$('salarySplitTeachers').replaceChildren();
   status.textContent='Could not calculate salary split: '+(error?.message||String(error));
  }finally{busy=false;refresh.disabled=false}
 }
 refresh.onclick=load;
 return {load};
}
