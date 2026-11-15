/* Admin-only examination result manager. No public student list is exposed. */
import{collection,getDocs,getDoc,doc,setDoc,writeBatch,arrayUnion,arrayRemove}from'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import{examStudentLookupKey}from'./exam-lookup.js';
import{createExamResultPdf,createExamCertificatePdf,downloadExamBlob,safePdfName}from'./exam-documents.js';
import{groupedPublishedResults,publishedResultFilterOptions,createAcademyPublishedRegisterPdf}from'./exam-batch-report.js';
import{openPremiumPrintWindow}from'./premium-certificate-svg.js';
import{maybePromoteStudent}from'./student-promotion.js';
import{initHomepageWinners}from'./homepage-winners-admin.js';
import{compressProfilePhoto}from'./profile-photo.js';
export function initExamAdmin({db,auth,onPromotion}){
 const $=id=>document.getElementById(id);
 const studentDropdown=$('examResultStudent'),form=$('examResultForm'),subjectRows=$('examSubjectRows');
 const winners=initHomepageWinners({db});
 let students=[],results=[],courseNames=new Map(),loadPromise=null;
 const allowedId=/^RESULT-[a-f0-9]{24}$/;
 const status=value=>{$('examEditorStatus').textContent=value};
 const resultLink=id=>new URL('exam-results.html?id='+encodeURIComponent(id),location.href).href;
 const shownStudent=()=>students.find(s=>s.id===studentDropdown.value);
 function subjectRow(data={name:'',score:'',max:100}){
  const root=document.createElement('div');root.className='exam-subject-row';
  const build=(caption,kind,value,placeholder)=>{
   const label=document.createElement('label');label.textContent=caption;
   const input=document.createElement('input');input.type=kind;input.value=value??'';
   input.placeholder=placeholder;input.required=true;
   if(kind==='number'){input.min='0';input.max='100000';input.step='any'}
   input.addEventListener('input',calc);label.append(input);root.append(label);return input;
  };
  const name=build('Subject Name','text',data.name,'e.g. Hadees');name.maxLength=100;
  const score=build('Marks Obtained','number',data.score,'0');
  const max=build('Maximum Marks','number',data.max??100,'100');
  const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='✕';
  remove.setAttribute('aria-label','Remove subject');
  remove.onclick=()=>{if(subjectRows.children.length<=1){name.value='';score.value='';max.value=100}else root.remove();calc()};
  root.append(remove);subjectRows.append(root);calc();
  return {root,name,score,max};
 }
 function rawSubjects(){
  return [...subjectRows.children].map(row=>{
   const [name,score,max]=[...row.querySelectorAll('input')];
   return {name:name.value.trim(),score:score.value,max:max.value};
  });
 }
 function validateSubjects(strict=true){
  const rows=rawSubjects();
  if(!rows.length||rows.length>30)throw Error('Enter 1 to 30 subjects.');
  const seen=new Set();
  return rows.map((row,i)=>{
   if(!row.name){if(strict)throw Error('Enter subject name for row '+(i+1));return null}
   const score=Number(row.score),max=Number(row.max);
   if(row.score===''||row.max===''||!Number.isFinite(score)||!Number.isFinite(max)||max<=0||score<0||score>max)throw Error('Check subject '+row.name+': marks must be between 0 and maximum (>0).');
   const key=row.name.toLowerCase();
   if(seen.has(key))throw Error('Duplicate subject: '+row.name);
   seen.add(key);
   return {name:row.name,score,max};
  }).filter(Boolean);
 }
 function resultMath(subjects,passPercent){
  const total=subjects.reduce((sum,s)=>sum+s.score,0);
  const maxTotal=subjects.reduce((sum,s)=>sum+s.max,0);
  const percent=maxTotal?100*total/maxTotal:0;
  const grade=percent>=90?'A+':percent>=80?'A':percent>=70?'B':percent>=60?'C':percent>=50?'D':'E';
  const passed=subjects.length>0&&subjects.every(s=>s.score/s.max*100+1e-8>=passPercent);
  return {total:Number(total.toFixed(2)),maxTotal:Number(maxTotal.toFixed(2)),percent:Number(percent.toFixed(2)),grade,passed};
 }
 function calc(){
  const el=$('examResultCalculation');
  try{
   const items=validateSubjects(false);
   if(!items.length){el.textContent='Enter subject marks to calculate results.';return}
   const pass=Number($('examResultPass').value||40),result=resultMath(items,pass);
   el.textContent='Total: '+result.total+' / '+result.maxTotal+'   •   Percentage: '+result.percent.toFixed(2)+'%   •   Grade: '+result.grade+'   •   Result: '+(result.passed?'PASS':'NEEDS IMPROVEMENT')+'   •   Pass Requirement: '+pass+'% per subject';
  }catch(e){el.textContent='Check marks: '+e.message}
 }
 function fillStudentSummary(){
  const st=shownStudent();
  $('examStudentSummary').textContent=st?'Student: '+st.name+'  |  Official ID: '+(st.studentCode||'Not assigned')+'  |  Class: '+(courseNames.get(st.course)||st.course||'—')+'  |  Batch: '+(st.batch||'—')+'  |  Student ID: '+(st.examid||'Not issued — save student in Student Details')+'  |  DOB: '+(st.dob?'Recorded':'Missing — Student ID + DOB lookup needs DOB in Student Details'):'Choose a student to show their class and batch.';
 }
 function reset(){
  form.reset();$('examResultId').value='';$('examResultPass').value='40';$('examFinalForPromotion').checked=false;
  $('examHomeWinnerOptions').classList.add('hidden');$('examHomeWinnerPhoto').value='';$('examHomeWinnerUploadStatus').textContent='The student profile photo is used unless you select a different photo here.';
  const today=new Date();
  $('examResultDate').value=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
  $('examResultYear').value=$('academicYearSelect')?.value||'2026–2027';
  subjectRows.replaceChildren();subjectRow();fillStudentSummary();
  status('New result. Save privately first, then publish after verification.');
 }
 function option(label,value){const o=document.createElement('option');o.value=value;o.textContent=label;return o}
 async function load(){
  if(loadPromise)return loadPromise;
  loadPromise=(async()=>{
   const [studentsSnap,resultsSnap,coursesSnap]=await Promise.all([
    getDocs(collection(db,'students')),getDocs(collection(db,'examResults')),getDocs(collection(db,'courses'))
   ]);
   students=studentsSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
   results=resultsSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
   courseNames=new Map(coursesSnap.docs.map(d=>[d.id,d.data().name||d.id]));
   const prior=studentDropdown.value;
   studentDropdown.replaceChildren(option('Select enrolled student',''));
   for(const student of students){
    const name=String(student.name||'Unnamed Student');
    const course=courseNames.get(student.course)||student.course||'No class';
    studentDropdown.append(option(name+' — '+course+(student.batch?' / '+student.batch:''),student.id));
   }
   if(students.some(s=>s.id===prior))studentDropdown.value=prior;
   if(!subjectRows.children.length)reset();
   fillStudentSummary();renderList();updatePublishedReportOptions();
  })().finally(()=>{loadPromise=null});
  return loadPromise;
 }
 function collect(published){
  const student=shownStudent();
  if(!student)throw Error('Select a registered student.');
  const examTitle=$('examResultTitle').value.trim(),examDate=$('examResultDate').value,academicYear=$('examResultYear').value.trim();
  const passPercent=Number($('examResultPass').value);
  if(!examTitle||!academicYear||!/^\d{4}-\d{2}-\d{2}$/.test(examDate))throw Error('Exam name, valid exam date and academic year are required.');
  if(!Number.isFinite(passPercent)||passPercent<0||passPercent>100)throw Error('Pass percentage must be between 0 and 100.');
  const subjects=validateSubjects(true),scores=resultMath(subjects,passPercent);
  return {
   studentId:student.id,studentCode:student.studentCode||'',studentName:student.name||'Student',course:courseNames.get(student.course)||student.course||'—',
   courseId:student.course||'',batch:student.batch||'',examTitle,examDate,academicYear,
   subjects,passPercent,...scores,finalForPromotion:$('examFinalForPromotion').checked,published
  };
 }
 function makeId(){
  if(!crypto?.getRandomValues)throw Error('Secure random result codes require HTTPS.');
  const a=crypto.getRandomValues(new Uint8Array(12));
  return 'RESULT-'+[...a].map(x=>x.toString(16).padStart(2,'0')).join('');
 }
 async function save(published){
  const button=$(published?'examPublish':'examSaveDraft');button.disabled=true;
  try{
   const oldId=$('examResultId').value,record=collect(published);
   const existing=oldId?await getDoc(doc(db,'examResults',oldId)):null;
   const old=existing?.exists()?{id:oldId,...existing.data()}:null;
   if(!published&&old?.published&&!confirm('Saving a draft will UNPUBLISH this result until it is published again. Continue?'))return;
   const feature=published&&$('examHomeWinnerFeature').checked;
   const rank=Number($('examHomeWinnerRank').value);
   const consent=$('examHomeWinnerConsent').checked;
   if(feature&&!consent)throw Error('Confirm guardian permission to publish the student name and photo.');
   if(published&&!confirm('Publish '+record.studentName+' examination marks? Anyone with the unique result link can view their name and scores.'+(feature?' This ALSO publishes a homepage photo at rank '+rank+'.':'')))return;
   const id=oldId||makeId();
   if(!allowedId.test(id))throw Error('Invalid result reference. Create a new result.');
   const now=new Date().toISOString();
   const payload={...record,createdAt:old?.createdAt||now,updatedAt:now};
   // Single atomic transaction keeps publication and confidential lookup index aligned.
   const batch=writeBatch(db);
   batch.set(doc(db,'examResults',id),payload);
   const beforeStudent=students.find(student=>student.id===old?.studentId);
   const afterStudent=students.find(student=>student.id===record.studentId);
   const beforeKey=old?.published&&beforeStudent?.dob&&beforeStudent?.examid?await examStudentLookupKey(beforeStudent.examid,beforeStudent.dob):null;
   const afterKey=published&&afterStudent?.dob&&afterStudent?.examid?await examStudentLookupKey(afterStudent.examid,afterStudent.dob):null;
   if(beforeKey&&beforeKey!==afterKey)batch.set(doc(db,'examResultLookups',beforeKey),
    {resultIds:arrayRemove(id),updatedAt:now},{merge:true});
   if(afterKey)batch.set(doc(db,'examResultLookups',afterKey),
    {enabled:true,resultIds:arrayUnion(id),updatedAt:now},{merge:true});
   // Real verified email accounts use a private, admin-approved result index.
   // The student sees only their own published result references.
   if(old?.studentId&&old.studentId!==record.studentId){
    const former=await getDoc(doc(db,'studentAccess',old.studentId));
    if(former.exists())batch.set(doc(db,'studentAccess',old.studentId),
      {resultIds:arrayRemove(id),updatedAt:now},{merge:true});
   }
   const studentAccount=await getDoc(doc(db,'studentAccess',record.studentId));
   if(studentAccount.exists())batch.set(doc(db,'studentAccess',record.studentId),
     {resultIds:published?arrayUnion(id):arrayRemove(id),updatedAt:now},{merge:true});
   const photoOverride=feature&&$('examHomeWinnerPhoto').files?.[0]?await compressProfilePhoto($('examHomeWinnerPhoto').files[0]):'';
   await winners.beforeResultSave(batch,{id,record,student:afterStudent,feature,rank,consent,photoOverride});
   await batch.commit();
   let promotionNote='';
   if(published){
    try{
     const progress=await maybePromoteStudent(db,record.studentId);
     if(progress.promoted){
      promotionNote=' 🎓 AUTOMATIC PROMOTION: '+progress.fromCourse+' → '+progress.toCourse+'. Student ID preserved.';
      if(typeof onPromotion==='function')await onPromotion();
     }else if(record.finalForPromotion===true)promotionNote=' Promotion pending: '+progress.reason;
    }catch(error){promotionNote=' Promotion check failed: '+error.message+'. Result remains published.'}
   }
   $('examResultId').value=id;
   await load();await winners.load();
   const lookupNote=published&&!afterKey?' Student ID + DOB lookup needs both DOB and a confidential Student ID. Open Student Details, edit and save the student.':'';

   status((published?'✓ Result PUBLISHED.':'✓ Private draft saved.')+' Reference: '+id+(published?'  |  Copy the result link below to share privately.':'')+(feature?' 🏆 Also featured as homepage position '+rank+'.':'')+lookupNote+promotionNote);
   $('examResultList').scrollIntoView({behavior:'smooth',block:'nearest'});
  }catch(e){status('Could not save exam result: '+e.message)}finally{button.disabled=false}
 }
 function edit(record){
  $('examResultId').value=record.id;
  studentDropdown.value=record.studentId||'';
  $('examResultTitle').value=record.examTitle||'';
  $('examResultDate').value=record.examDate||'';
  $('examResultYear').value=record.academicYear||'';
  $('examResultPass').value=record.passPercent??40;
  $('examFinalForPromotion').checked=record.finalForPromotion===true;
  $('examHomeWinnerFeature').checked=false;$('examHomeWinnerConsent').checked=false;$('examHomeWinnerPhoto').value='';$('examHomeWinnerOptions').classList.add('hidden');
  subjectRows.replaceChildren();
  for(const subject of record.subjects||[])subjectRow(subject);
  if(!subjectRows.children.length)subjectRow();
  fillStudentSummary();calc();
  status('Editing '+record.studentName+' ('+(record.published?'PUBLISHED':'DRAFT')+'). Review carefully before saving.');
  document.querySelector('#tab-exams .exam-admin-editor').scrollIntoView({behavior:'smooth',block:'start'});
 }
 async function revoke(record){
  if(!confirm('Unpublish '+record.studentName+' examination result? The public link will stop working.'))return;
  try{
   const current=await getDoc(doc(db,'examResults',record.id));
   if(!current.exists())throw Error('Record no longer exists.');
   const now=new Date().toISOString(),batch=writeBatch(db);
   batch.set(doc(db,'examResults',record.id),{...current.data(),published:false,updatedAt:now});
   const student=students.find(s=>s.id===current.data().studentId);
   if(student?.dob&&student?.examid){
    const key=await examStudentLookupKey(student.examid,student.dob);
    batch.set(doc(db,'examResultLookups',key),{resultIds:arrayRemove(record.id),updatedAt:now},{merge:true});
   }
   const access=await getDoc(doc(db,'studentAccess',current.data().studentId));
   if(access.exists())batch.set(doc(db,'studentAccess',current.data().studentId),
     {resultIds:arrayRemove(record.id),updatedAt:now},{merge:true});
   await winners.beforeResultSave(batch,{id:record.id,record:{...current.data(),published:false},student});
   await batch.commit();
   status('✓ Result unpublished and removed from private lookup and homepage winners.');await load();await winners.load();
  }catch(e){status('Could not unpublish: '+e.message)}
 }
 function button(label,fn,secondary=true){
  const b=document.createElement('button');b.type='button';b.textContent=label;
  if(secondary)b.className='secondary';
  b.onclick=async()=>{b.disabled=true;try{await fn()}catch(e){status('Action failed: '+e.message)}finally{b.disabled=false}};
  return b;
 }
 function updatePublishedReportOptions(){
  const opts=publishedResultFilterOptions(results);
  const replace=(id,options,allText)=>{
   const select=$(id),previous=select.value;
   select.replaceChildren(option(allText,'all'));
   for(const [name,value] of options)select.append(option(name,value));
   if([...select.options].some(o=>o.value===previous))select.value=previous;
  };
  replace('batchResultCourse',opts.courses.map(([id,name])=>[name,id]),'All Classes');
  replace('batchResultYear',opts.academicYears.map(x=>[x,x]),'All Academic Years');
  replace('batchResultExam',opts.exams.map(x=>[x,x]),'All Published Exams');
  const total=results.filter(r=>r.published===true).length;
  $('batchResultStatus').textContent='Available: '+total+' published exam result(s). Drafts never appear in the register. Select a class and download an A4 PDF.';
 }
 function selectedPublishedGroups(){
  return groupedPublishedResults(results,{
   course:$('batchResultCourse').value,
   academicYear:$('batchResultYear').value,
   exam:$('batchResultExam').value
  });
 }
 async function bulkDownload(mode){
  const status=$('batchResultStatus');
  const button=$(mode==='full'?'downloadPublishedResultRegister':'downloadPublishedTop3');
  button.disabled=true;
  try{
   // Read a fresh publication snapshot. If a result was unpublished in a
   // second browser tab it must not leak into the class-wise PDF.
   const current=await getDocs(collection(db,'examResults'));
   const liveResults=current.docs.map(d=>({id:d.id,...d.data()}));
   const groups=groupedPublishedResults(liveResults,{
    course:$('batchResultCourse').value,academicYear:$('batchResultYear').value,
    exam:$('batchResultExam').value
   });
   if(!groups.length)throw Error('No published exam results match the selected class, year and examination.');
   const confirmed=$('batchReportShareConsent').checked;
   if(mode==='top3'&&!confirmed)throw Error('Tick the guardian/student sharing-permission checkbox before exporting the WhatsApp rank list.');
   if(mode==='full'&&!confirm('This PDF lists ALL published students\' names, ALIA IDs and marks. It is for authorized Academy use only. Download the complete register?'))return;
   if(mode==='top3'&&!confirm('Generate a group-shareable PDF with the top three students\' names and percentages per class / exam? Make sure guardian permission is recorded.'))return;
   status.textContent='Preparing '+groups.length+' class/exam group(s) for A4 PDF…';
   const pdf=await createAcademyPublishedRegisterPdf(groups,{mode,permissionConfirmed:confirmed});
   const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   downloadExamBlob(pdf,'ALIA_'+(mode==='top3'?'Top_3_Class_Ranks':'Complete_Published_Exam_Results')+'_'+date+'.pdf');
   status.textContent='✓ A4 PDF downloaded: '+groups.length+' class/exam group(s). '+(mode==='top3'?'Review names and consent before sharing.':'Keep the complete marks register private.');
  }catch(e){status.textContent='Could not download published results: '+e.message}
  finally{button.disabled=false}
 }
 $('downloadPublishedResultRegister').onclick=()=>bulkDownload('full');
 $('downloadPublishedTop3').onclick=()=>bulkDownload('top3');
 for(const id of ['batchResultCourse','batchResultYear','batchResultExam'])
  $(id).addEventListener('change',()=>{
   const groups=selectedPublishedGroups();
   $('batchResultStatus').textContent=groups.length+' published class/examination group(s) selected; '+groups.reduce((sum,g)=>sum+g.studentCount,0)+' student results.';
  });

 function renderList(){
  const target=$('examResultList');target.replaceChildren();
  const filter=$('examResultFilter').value,q=$('examResultSearch').value.trim().toLowerCase();
  const shown=results.filter(r=>(filter==='all'||r.published===(filter==='published'))&&[r.studentName,r.course,r.examTitle,r.academicYear,r.id].some(v=>String(v||'').toLowerCase().includes(q)));
  $('examResultListStatus').textContent=results.length+' saved exam result(s); '+shown.length+' shown.';
  if(!shown.length){target.textContent='No exam results found. Choose a student and enter marks above.';return}
  for(const record of shown){
   const card=document.createElement('article');card.className='exam-result-card';
   const h=document.createElement('h4');h.textContent=record.studentName||'Student';
   const badge=document.createElement('span');badge.className='exam-badge'+(record.published?'':' draft');badge.textContent=record.published?'✓ Published':'○ Private Draft';
   const description=document.createElement('p');description.textContent=[record.examTitle,record.course,record.batch,record.academicYear].filter(Boolean).join(' • ');
   const performance=document.createElement('p');performance.textContent='Marks '+record.total+' / '+record.maxTotal+'  |  '+Number(record.percent||0).toFixed(2)+'%  |  Grade '+(record.grade||'-')+'  |  '+(record.passed?'PASS':'NEEDS IMPROVEMENT');
   const ref=document.createElement('p');ref.textContent='Reference: '+record.id;
   const actions=document.createElement('div');actions.className='exam-card-actions';
   actions.append(button('✏ Edit Result',()=>edit(record)));
   if(record.published){
    actions.append(button('🔗 Copy Result Link',async()=>{
     const link=resultLink(record.id);
     try{await navigator.clipboard.writeText(link);status('✓ Published result link copied. Share it only with the correct student/guardian.')}catch{prompt('Copy the result link:',link)}
    }));
    actions.append(button('📕 Result PDF',async()=>downloadExamBlob(await createExamResultPdf(record),'Exam_Result_'+safePdfName(record.studentName)+'.pdf')));
    actions.append(button('🏅 Certificate PDF',async()=>downloadExamBlob(await createExamCertificatePdf(record),'Exam_Certificate_'+safePdfName(record.studentName)+'.pdf'),false));
    actions.append(button('🖨 Print Certificate to PDF',()=>openPremiumPrintWindow(record.passed===true?(Number(record.percent||0)>=80?'exam':'exam-achievement'):'exam-participation',record)));
    actions.append(button('🔒 Unpublish',()=>revoke(record)));
   }else{
    actions.append(button('🌐 Review & Publish',()=>{edit(record);status('Check marks, then click Publish Result.')} ,false));
   }
   card.append(h,badge,description,performance,ref,actions);target.append(card);
  }
 }
 form.addEventListener('submit',event=>{event.preventDefault();save(false)});
 studentDropdown.addEventListener('change',()=>{
  fillStudentSummary();
  $('examHomeWinnerConsent').checked=false;
  $('examHomeWinnerPhoto').value='';
  $('examHomeWinnerUploadStatus').textContent='Select this student’s photo if needed, and confirm their own guardian permission.';
 });
 $('examHomeWinnerFeature').addEventListener('change',()=>{$('examHomeWinnerOptions').classList.toggle('hidden',!$('examHomeWinnerFeature').checked)});
 $('examHomeWinnerPhoto').addEventListener('change',()=>{
  $('examHomeWinnerUploadStatus').textContent=$('examHomeWinnerPhoto').files?.[0]?'Selected: '+$('examHomeWinnerPhoto').files[0].name+'. It will be resized on publish.':'The existing student photo will be used.';
 });
 $('examAddSubject').onclick=()=>{if(subjectRows.children.length>=30){status('Maximum 30 subjects.');return}subjectRow()};
 $('examResultPass').addEventListener('input',calc);
 $('examSaveDraft').onclick=()=>save(false);
 $('examPublish').onclick=()=>save(true);
 $('examClear').onclick=reset;
 $('examRefresh').onclick=()=>load().catch(e=>status(e.message));
 $('examResultFilter').addEventListener('change',renderList);
 $('examResultSearch').addEventListener('input',renderList);
 return {load,winners};
}
