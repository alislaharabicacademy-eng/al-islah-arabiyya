/* Course salary configuration: admin-only Firestore writes, append-only effective months. */
import{doc,runTransaction,serverTimestamp}from'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import{DEFAULT_SALARY_SPLITS}from'./salary-split-utils.js';
import{canonicalSalaryCourse,policyDocumentId,validateSalaryRule}from'./salary-rules-utils.js';
const $=id=>document.getElementById(id);
const monthNow=()=>{const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit'}).formatToParts(new Date());const v=x=>p.find(z=>z.type===x)?.value;return v('year')+'-'+v('month')};
const nextMonth=m=>{const [y,n]=m.split('-').map(Number);return (n===12?y+1:y)+'-'+String(n===12?1:n+1).padStart(2,'0')};
const money=x=>'₹'+Number(x||0).toLocaleString('en-IN',{maximumFractionDigits:2});
export function initSalaryRuleEditor({db,allow,onSaved}){
 const host=document.createElement('section');host.id='salaryPolicyEditor';host.className='section';
 host.style.cssText='margin:20px 0;border:1px solid #b8d4c1;background:#f8fcf8;border-radius:16px;padding:17px';
 host.innerHTML=[
 '<h3>⚙️ Course-Wise Custom Salary Rules</h3>',
 '<p class="section-note">Assign different salary methods to every course or batch, including the same teacher across multiple courses. Saved rules apply from their chosen month onward; old months are not overwritten. This is a calculation preview, not a salary payment.</p>',
 '<div class="fields" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px">',
 '<label>Course<select id="srCourse"></select></label>',
 '<label>Batch (optional)<input id="srBatch" maxlength="100" placeholder="Blank = full course"></label>',
 '<label>Method<select id="srMethod"><option value="per_student">₹ per paid student</option><option value="percentage">Percentage of fees received</option><option value="fixed_monthly">Fixed monthly salary</option></select></label>',
 '<label>Monthly Student Fee (₹)<input type="number" id="srFee" min="0.01" max="1000000" step="0.01"></label>',
 '<label>Effective From<input type="month" id="srEffective"></label>',
 '</div><p id="srHelp" class="section-note"></p>',
 '<h4>👩‍🏫 Assign Teachers &amp; Amounts</h4><div id="srRows"></div>',
 '<button class="secondary" type="button" id="srAdd">+ Assign Teacher</button>',
 '<p id="srPreview" class="record" style="margin:14px 0;background:#eef8ef" role="status"></p>',
 '<div class="actions"><button type="button" id="srSave">💾 Save New Rule</button><button type="button" class="secondary" id="srReset">↻ Reset Draft</button></div>',
 '<p id="srStatus" class="section-note" role="status" aria-live="polite"></p><div id="srHistory"></div>',
 '<p class="section-note"><strong>History protection:</strong> Existing revisions cannot be changed from this editor. Future changes require a later effective month. Academy share is the remainder; fixed salaries may create a cash shortfall if fee collection is low.</p>'
 ].join('');
 $('salarySplitSummary').before(host);
 const course=$('srCourse'),batch=$('srBatch'),method=$('srMethod'),fee=$('srFee'),
  effective=$('srEffective'),rows=$('srRows'),preview=$('srPreview'),status=$('srStatus'),history=$('srHistory');
 let courses=[],teachers=[],policies=[],ready=false,working=false;
 const norm=s=>String(s||'').trim().toLowerCase();
 const selected=()=>{try{return policies.find(p=>p.id===policyDocumentId(course.value,batch.value))}catch{return null}};
 const assigned=t=>Array.isArray(t.assignments)&&t.assignments.some(a=>
  canonicalSalaryCourse(a.course,courses)===course.value&&(!batch.value.trim()||norm(a.batch)===norm(batch.value)));
 const eligible=()=>teachers.filter(t=>norm(t.recordStatus)!=='archived');
 function teacherRow(id='',value=''){
  const box=document.createElement('div');box.className='record';
  box.style.cssText='display:flex;flex-wrap:wrap;align-items:end;gap:9px;padding:10px;margin:8px 0;background:#fff';
  const label=document.createElement('label');label.textContent='Teacher';label.style.cssText='flex:2;min-width:155px';
  const select=document.createElement('select');select.className='srTeacher';select.add(new Option('Choose teacher',''));
  for(const t of eligible())select.add(new Option((t.name||t.id)+(assigned(t)?' · Assigned':' · Assign subject first'),t.id));
  if(id&&![...select.options].some(o=>o.value===id))select.add(new Option('Archived / unavailable teacher',id));
  select.value=id;label.append(select);
  const amountLabel=document.createElement('label');amountLabel.style.cssText='flex:1;min-width:130px';
  amountLabel.textContent='Share / Salary';
  const amount=document.createElement('input');amount.type='number';amount.min='0.01';amount.step='0.01';
  amount.max=method.value==='percentage'?'100':'1000000';amount.value=value;amount.className='srValue';amountLabel.append(amount);
  const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='Remove';remove.onclick=()=>{box.remove();previewDraft()};
  select.onchange=previewDraft;amount.oninput=previewDraft;box.append(label,amountLabel,remove);rows.append(box);
 }
 function draft(){return {effectiveMonth:effective.value,monthlyFee:Number(fee.value),method:method.value,
  allocations:[...rows.querySelectorAll('.record')].map(r=>{
   const id=r.querySelector('.srTeacher').value,t=teachers.find(t=>t.id===id);
   return {teacherId:id,teacherName:String(t?.name||''),value:Number(r.querySelector('.srValue').value)};
  })};}
 function previewDraft(){
  const last=[...(selected()?.revisions||[])].sort((a,b)=>b.effectiveMonth.localeCompare(a.effectiveMonth))[0]?.effectiveMonth;
  const min=last?nextMonth(last):monthNow();effective.min=min;if(!effective.value||effective.value<min)effective.value=min;
  $('srHelp').textContent=method.value==='percentage'
   ?'Percentage of the monthly fee received; remaining percentage goes to Academy.'
   :method.value==='fixed_monthly'
   ?'Contracted monthly salary, even if no students have paid. Does not mark a payment.'
   :'₹ for each student who pays full fees. Partial payments are divided proportionally.';
  for(const number of rows.querySelectorAll('.srValue'))number.max=method.value==='percentage'?'100':'1000000';
  try{
   const d=draft(),summary=validateSalaryRule(d);
   for(const a of d.allocations){
    const t=teachers.find(x=>x.id===a.teacherId);
    if(!t||norm(t.recordStatus)==='archived'||!assigned(t))throw Error('Select active teachers already assigned to this course/batch in Teacher Directory.');
   }
   const total=d.allocations.reduce((s,a)=>s+a.value,0);
   preview.textContent=d.method==='fixed_monthly'?'Fixed monthly teacher commitment: '+money(total)+' (independent of receipts).':
    d.method==='percentage'?'Total teacher share: '+total+'%; Academy: '+summary.academyPerStudent.toFixed(2)+'%.':
    'Per student: '+money(d.monthlyFee)+' fees − '+money(total)+' teachers = '+money(summary.academyPerStudent)+' Academy.';
  }catch(e){preview.textContent='⚠ '+e.message}
 }
 function loadDraft(){
  const current=selected(),revs=current?.revisions||[];
  const last=[...revs].sort((a,b)=>b.effectiveMonth.localeCompare(a.effectiveMonth))[0];
  const courseDoc=courses.find(c=>canonicalSalaryCourse(c.id,courses)===course.value);
  const legacy=DEFAULT_SALARY_SPLITS[course.value];
  fee.value=last?.monthlyFee??(Number(courseDoc?.monthlyFee)>0?Number(courseDoc.monthlyFee):legacy?.monthlyFee??(course.value==='alima'?1200:''));
  method.value=last?.method||'per_student';rows.replaceChildren();
  if(last?.allocations?.length)for(const a of last.allocations)teacherRow(a.teacherId,a.value);
  else{
   const matches=eligible().filter(assigned);
   for(const t of matches)teacherRow(t.id,legacy?.perTeacher??(course.value==='alima'&&matches.length===1?800:''));
  }
  if(!rows.children.length)teacherRow();
  effective.value=last?nextMonth(last.effectiveMonth):monthNow();
  history.replaceChildren();
  const header=document.createElement('h4');header.textContent='Saved History: '+revs.length+' revision(s)';history.append(header);
  for(const rev of [...revs].sort((a,b)=>b.effectiveMonth.localeCompare(a.effectiveMonth))){
   const p=document.createElement('p');p.className='record';
   p.textContent=rev.effectiveMonth+' · '+rev.method+' · '+money(rev.monthlyFee)+' / student · '+
    (rev.allocations||[]).map(a=>a.teacherName+': '+(rev.method==='percentage'?a.value+'%':money(a.value))).join(' + ');
   history.append(p);
  }
  status.textContent=revs.length?'Old rule locked. To change distribution, save a new future-dated rule.':'No custom rule saved for this selection.';
  previewDraft();
 }
 function updateCourseOptions(){
  const old=course.value,options=new Map();
  for(const c of courses)options.set(canonicalSalaryCourse(c.id,courses),String(c.name||c.id));
  for(const [id,p] of Object.entries(DEFAULT_SALARY_SPLITS))if(!options.has(id))options.set(id,p.label);
  course.replaceChildren(new Option('Select course',''));
  for(const [id,title] of [...options].filter(([id])=>!!id).sort((a,b)=>a[1].localeCompare(b[1])))course.add(new Option(title,id));
  if([...course.options].some(o=>o.value===old))course.value=old;
  else if(course.options.length>1)course.selectedIndex=1;
  loadDraft();
 }
 async function save(){
  if(!allow()||!ready||working)return;
  let d,id,scope;
  try{
   id=policyDocumentId(course.value,batch.value);scope={courseId:course.value,batch:batch.value.trim()};
   d=draft();validateSalaryRule(d);
   if(d.effectiveMonth<monthNow())throw Error('Cannot edit previous salary months.');
   for(const a of d.allocations){
    const t=teachers.find(t=>t.id===a.teacherId);
    if(!t||norm(t.recordStatus)==='archived'||!assigned(t))throw Error('Assign '+(t?.name||'teacher')+' to the course/batch in Teacher Directory first.');
   }
   if(!window.confirm('Save a NEW salary rule for '+scope.courseId+(scope.batch?' / '+scope.batch:'')+' starting '+d.effectiveMonth+'? Old salary months remain unchanged.'))return;
  }catch(e){status.textContent='⚠ '+e.message;return;}
  working=true;$('srSave').disabled=true;status.textContent='Saving new revision…';
  try{
   await runTransaction(db,async tx=>{
    const ref=doc(db,'salarySplitPolicies',id),saved=await tx.get(ref);
    const data=saved.exists()?saved.data():null,previous=data?.revisions||[];
    if(data&&(data.courseId!==scope.courseId||norm(data.batch)!==norm(scope.batch)))throw Error('Rule identifier already belongs to another batch.');
    const latest=[...previous].sort((a,b)=>b.effectiveMonth.localeCompare(a.effectiveMonth))[0]?.effectiveMonth;
    if(latest&&d.effectiveMonth<=latest)throw Error('Old rule is locked. Choose a month after '+latest+'.');
    tx.set(ref,{...scope,revisions:[...previous,{...d,createdAt:new Date().toISOString()}],updatedAt:serverTimestamp()});
   });
   status.textContent='✓ Rule saved. Refreshing Academy calculations…';await onSaved();
  }catch(e){status.textContent='Could not save: '+(e?.message||String(e))+((e?.code==='permission-denied')?' Publish new Firestore rules before using this editor.':'')}
  finally{working=false;$('srSave').disabled=false}
 }
 course.onchange=()=>{batch.value='';loadDraft()};
 batch.onchange=loadDraft;
 method.onchange=previewDraft;
 fee.oninput=previewDraft;
 effective.onchange=previewDraft;
 $('srAdd').onclick=()=>{teacherRow();previewDraft()};
 $('srReset').onclick=loadDraft;
 $('srSave').onclick=save;
 return {
  syncSnapshot(data){courses=data.courses||[];teachers=data.teachers||[];policies=data.policies||[];ready=true;updateCourseOptions()},
  disable(message){ready=false;$('srSave').disabled=true;status.textContent=message}
 };
}
