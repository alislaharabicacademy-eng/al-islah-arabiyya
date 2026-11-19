/* Course -> students -> subject-wise marks -> Save Class -> Publish All.
 * Drafts and roster snapshots are admin-only, and a server-side session status
 * gates every public result until all classes are committed successfully. */
import{collection,getDocs,getDoc,doc,setDoc,writeBatch,query,where,runTransaction,arrayUnion}
 from'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import{examStudentLookupKey}from'./exam-lookup.js';
import{maybePromoteStudent}from'./student-promotion.js';
import{makeExamCohorts,parseExamSubjects,displayExamSubjects,gradeExamSubjects,readyToPublish}from'./exam-session-core.js';

export function initExamSessionAdmin({db,auth,onPublication,onPromotion}={}){
 const $=id=>document.getElementById(id);
 const panel=$('courseExamPanel');
 if(!panel)return {load:async()=>{}};
 const status=(message,failed=false)=>{const e=$('courseExamStatus');e.textContent=message;e.style.color=failed?'#a12e3d':'#155440'};
 const option=(label,value)=>new Option(label,value);
 let students=[],courses=[],subjectLists=new Map(),sessions=[],results=[],session=null,cohort=null,busy=false;
 const byStudent=id=>students.find(s=>s.id===id);
 const sessionDoc=id=>doc(db,'examSessions',id);
 const randomId=prefix=>prefix+[...crypto.getRandomValues(new Uint8Array(12))].map(n=>n.toString(16).padStart(2,'0')).join('');
 const recordsOf=()=>results.filter(r=>r.sessionId===session?.id);
 const cohortLabel=g=>[g.courseName,g.courseYear?'Year '+g.courseYear:'',g.batch].filter(Boolean).join(' · ');

 function courseSubjects(g){
  if(g.subjects?.length)return g.subjects;
  const saved=courses.find(x=>x.id===g.courseId);
  const years=window.AcademyCurriculum?.years(g.courseId,saved)||[];
  const year=years.find(r=>Number(r.year)===g.courseYear&&r.subjects?.length);
  // Year-specific approved curriculum takes priority over teacher assignment catalog.
  const listed=year?.subjects?.length?year.subjects:subjectLists.get(g.courseId)||[];
  return listed.slice(0,30).map(name=>({name,max:100}));
 }
 function renderSessions(){
  const el=$('courseExamSession');
  const prior=session?.id||el.value;
  el.replaceChildren(option('— Choose exam or create a new exam —',''));
  for(const e of sessions){
   const progress=e.status==='published'?'✅ PUBLISHED':e.status==='publishing'?'⏳ Publishing':'📝 Draft';
   el.add(option(progress+' · '+e.examTitle+' · '+e.academicYear+' · '+e.examDate,e.id));
  }
  if(sessions.some(x=>x.id===prior))el.value=prior;
  else el.value='';
 }
 function renderSummary(){
  const box=$('courseExamOverview');box.replaceChildren();
  if(!session){box.textContent='Create an examination, then choose a course. All active/completed students are captured in a class roster for this exam.';$('courseExamPublishAll').disabled=true;return}
  const report=readyToPublish(session,recordsOf());
  const summary=document.createElement('p');
  summary.textContent=[session.examTitle,session.academicYear,session.examDate,
   'Status: '+String(session.status).toUpperCase(),
   'Saved: '+report.completed+'/'+report.total+' student marks',
   'Classes: '+session.cohorts.length].join('  ·  ');
  box.append(summary);
  const grid=document.createElement('div');grid.className='exam-cohort-grid';
  for(const g of session.cohorts){
   const count=g.studentIds.filter(id=>recordsOf().some(r=>r.cohortKey===g.key&&r.studentId===id)).length;
   const b=document.createElement('button');b.type='button';
   b.className='secondary exam-cohort-chip';
   b.textContent=cohortLabel(g)+'  ·  '+count+'/'+g.studentIds.length+(count===g.studentIds.length?' ✓':' pending');
   b.onclick=()=>{$('courseExamClass').value=g.key;selectCohort()};
   grid.append(b);
  }
  box.append(grid);
  if(report.problems.length){
   const note=document.createElement('p');note.className='section-note';
   note.textContent='Publication blocked until every student in every class has complete saved marks. '+report.problems.slice(0,3).join(' | ')+(report.problems.length>3?' …':'');
   box.append(note);
  }
  $('courseExamPublishAll').disabled=busy||session.status==='published'||(!report.ready&&session.status!=='publishing');
  $('courseExamPublishAll').textContent=session.status==='publishing'?'↻ Resume & Finish Publishing':'🌐 Publish ALL Classes Together';
 }
 function renderClassSelector(){
  const el=$('courseExamClass'),prior=cohort?.key||el.value;
  el.replaceChildren(option('— Select a course / class —',''));
  for(const g of session?.cohorts||[])el.add(option(cohortLabel(g)+' ('+g.studentIds.length+' students)',g.key));
  if(session?.cohorts.some(g=>g.key===prior))el.value=prior;else el.value='';
 }
 function createInput(type,value,name,max=100000){
  const input=document.createElement('input');input.type=type;input.className='course-exam-mark';
  input.value=value??'';input.name=name;
  if(type==='number'){input.min='0';input.max=String(max);input.step='any';input.inputMode='decimal';}
  return input;
 }
 function dataForClass(){
  const map=new Map();
  for(const r of recordsOf())if(r.cohortKey===cohort.key)map.set(r.studentId,r);
  return map;
 }
 function renderClassRows(keepValues=false){
  const table=$('courseExamStudentRows');
  const prior=new Map(),priorSubjects=JSON.parse(table.dataset.subjectSchema||'[]');
  if(keepValues)for(const row of table.querySelectorAll('[data-student-id]')){
   const marks=new Map();
   [...row.querySelectorAll('input.course-exam-mark')].forEach((input,i)=>{
    const old=priorSubjects[i];if(old)marks.set(old.name+'|'+old.max,input.value);
   });
   prior.set(row.dataset.studentId,marks);
  }
  table.replaceChildren();delete table.dataset.subjectSchema;
  if(!cohort)return;
  let subjects;
  try{subjects=parseExamSubjects($('courseExamSubjects').value)}
  catch(e){table.textContent='Set valid class subjects above, then select Prepare Subject Columns. '+e.message;return}
  table.dataset.subjectSchema=JSON.stringify(subjects);
  const header=document.createElement('tr');
  for(const label of ['Student / ALIA ID',...subjects.map(s=>s.name+' (/'+s.max+')'),'Total / Grade']){
   const th=document.createElement('th');th.textContent=label;header.append(th);
  }
  const thead=document.createElement('thead');thead.append(header);table.append(thead);
  const tbody=document.createElement('tbody'),saved=dataForClass();
  for(const studentId of cohort.studentIds){
   const st=byStudent(studentId),old=saved.get(studentId);
   const tr=document.createElement('tr');tr.dataset.studentId=studentId;
   const cell=document.createElement('th');cell.scope='row';
   cell.textContent=(st?.name||'Student not found')+' · '+(st?.studentCode||'No ALIA ID');tr.append(cell);
   const previous=prior.get(studentId);
   const values=subjects.map(s=>previous?.get(s.name+'|'+s.max)??old?.subjects?.find(x=>x.name===s.name&&x.max===s.max)?.score??'');
   for(let i=0;i<subjects.length;i++){
    const td=document.createElement('td'),input=createInput('number',values[i],studentId+':'+i,subjects[i].max);
    input.setAttribute('aria-label',(st?.name||studentId)+' · '+subjects[i].name);
    td.append(input);tr.append(td);
   }
   const grade=document.createElement('td');grade.className='exam-row-grade';tr.append(grade);
   const calculate=()=>{
    try{
     const scores=[...tr.querySelectorAll('input.course-exam-mark')].map(x=>x.value);
     const result=gradeExamSubjects(subjects,scores,session.passPercent);
     grade.textContent=result.total+'/'+result.maxTotal+' · '+result.percent+'% · '+result.grade+' · '+(result.passed?'PASS':'REVIEW');
    }catch{grade.textContent='Marks incomplete'}
   };
   tr.addEventListener('input',calculate);calculate();tbody.append(tr);
  }
  table.append(tbody);
  status('Enter every student’s '+subjects.length+' subject marks. Save this class as a private draft before publishing.');
 }
 function selectCohort(){
  cohort=session?.cohorts.find(c=>c.key===$('courseExamClass').value)||null;
  const body=$('courseExamStudentRows');
  body.replaceChildren();
  $('courseExamSubjects').value=cohort?displayExamSubjects(courseSubjects(cohort)):'';
  $('courseExamEditor').hidden=!cohort;
  if(cohort)renderClassRows();
  $('courseExamSaveClass').disabled=busy||session?.status!=='draft';
  $('courseExamSubjects').readOnly=session?.status!=='draft';
  $('courseExamPrepare').disabled=session?.status!=='draft';
 }
 function selectSession(){
  session=sessions.find(s=>s.id===$('courseExamSession').value)||null;
  cohort=null;
  renderClassSelector();selectCohort();renderSummary();
 }
 function createSessionRecord(){
  const examTitle=$('courseExamTitle').value.trim(),examDate=$('courseExamDate').value;
  const academicYear=$('courseExamYear').value.trim(),passPercent=Number($('courseExamPass').value);
  if(!examTitle||examTitle.length>120||!/^\d{4}-\d{2}-\d{2}$/.test(examDate)||!academicYear)
   throw Error('Enter examination name, date, and academic year.');
  if(!Number.isFinite(passPercent)||passPercent<0||passPercent>100)throw Error('Pass percentage must be 0 to 100.');
  const map=new Map(courses.map(x=>[x.id,String(x.name||x.id)]));
  const cohorts=makeExamCohorts(students,map);
  if(!cohorts.length)throw Error('No active or completed students with assigned courses were found.');
  if(cohorts.length>100)throw Error('Too many class groups for one exam. Please contact Academy administrator.');
  const id=randomId('EXAMSESSION-'),now=new Date().toISOString();
  return {id,examTitle,examDate,academicYear,passPercent,
   finalForPromotion:$('courseExamFinal').checked,
   status:'draft',cohorts,createdAt:now,updatedAt:now};
 }
 async function refresh(preserve=true){
  const current=preserve?session?.id||$('courseExamSession').value:'';
  const courseKey=cohort?.key||$('courseExamClass').value;
  const [ss,cs,sub,es,rs]=await Promise.all([
   getDocs(collection(db,'students')),getDocs(collection(db,'courses')),
   getDocs(collection(db,'classSubjects')),getDocs(collection(db,'examSessions')),
   getDocs(collection(db,'examResults'))
  ]);
  students=ss.docs.map(d=>({id:d.id,...d.data()}));
  courses=cs.docs.map(d=>({id:d.id,...d.data()}));
  subjectLists=new Map(sub.docs.map(d=>[d.id,Array.isArray(d.data().subjects)?d.data().subjects:[]]));
  sessions=es.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  results=rs.docs.map(d=>({id:d.id,...d.data()})).filter(r=>r.sessionId);
  renderSessions();
  if(current&&sessions.some(e=>e.id===current))$('courseExamSession').value=current;
  selectSession();
  if(courseKey&&session?.cohorts.some(c=>c.key===courseKey)){
   $('courseExamClass').value=courseKey;selectCohort();
  }
 }
 async function create(){
  if(busy)return;busy=true;$('courseExamCreate').disabled=true;
  try{
   await refresh(false);
   const docData=createSessionRecord();
   if(!confirm('Create exam “'+docData.examTitle+'” for '+docData.cohorts.length+' classes and '+docData.cohorts.reduce((n,g)=>n+g.studentIds.length,0)+' students? This freezes the exam roster.'))return;
   await setDoc(sessionDoc(docData.id),docData);
   await refresh(false);$('courseExamSession').value=docData.id;selectSession();
   status('✓ Examination created. Choose each course, enter its marks, and click Save Class Draft.');
  }catch(e){status('Unable to create examination: '+e.message,true)}
  finally{busy=false;$('courseExamCreate').disabled=false}
 }
 async function saveClass(){
  if(busy||!session||!cohort)return;busy=true;$('courseExamSaveClass').disabled=true;
  try{
   const live=await getDoc(sessionDoc(session.id));
   if(!live.exists()||live.data().status!=='draft')throw Error('Exam is no longer editable. Refresh and check status.');
   const schema=parseExamSubjects($('courseExamSubjects').value);
   if(JSON.stringify(schema)!==$('courseExamStudentRows').dataset.subjectSchema)
    throw Error('The subject list has changed. Click Prepare Subject Columns first and verify all marks again.');
   const rows=[...$('courseExamStudentRows').querySelectorAll('tr[data-student-id]')];
   if(rows.length!==cohort.studentIds.length||rows.some(row=>!cohort.studentIds.includes(row.dataset.studentId)))
    throw Error('Class student list changed. Reload this exam.');
   // Re-read Firestore before assigning result IDs, so retries after a partial
   // class save cannot create duplicate results for the same student.
   const priorSnap=await getDocs(query(collection(db,'examResults'),where('sessionId','==',session.id)));
   const saved=new Map();
   for(const d of priorSnap.docs){
    const row={id:d.id,...d.data()};
    if(row.cohortKey!==cohort.key)continue;
    if(saved.has(row.studentId))throw Error('Duplicate saved result for '+row.studentId+'. Admin review required.');
    saved.set(row.studentId,row);
   }
   const now=new Date().toISOString(),payloads=[];
   for(const row of rows){
    const st=byStudent(row.dataset.studentId);
    if(!st)throw Error('Student has been deleted; cannot save marks for '+row.dataset.studentId);
    const scores=[...row.querySelectorAll('input.course-exam-mark')].map(x=>x.value);
    if(scores.length!==schema.length)throw Error('Subject columns changed. Prepare Subject Columns again.');
    let marks;
    try{marks=gradeExamSubjects(schema,scores,session.passPercent)}
    catch(e){throw Error(st.name+': '+e.message)}
    const old=saved.get(st.id);
    if(old?.published)throw Error('A published result cannot be replaced through draft entry.');
    const id=old?.id||randomId('RESULT-');
    payloads.push({id,studentId:st.id,studentCode:st.studentCode||'',studentName:st.name||'Student',
     course:cohort.courseName,courseId:cohort.courseId,courseYear:cohort.courseYear,batch:cohort.batch,
     examTitle:session.examTitle,examDate:session.examDate,academicYear:session.academicYear,
     passPercent:session.passPercent,finalForPromotion:session.finalForPromotion,
     sessionId:session.id,cohortKey:cohort.key,published:false,
     ...marks,createdAt:old?.createdAt||now,updatedAt:now});
   }
   // Each chunk is a Firestore transaction guarded by the session state.
   // The final chunk atomically saves the cohort's approved subject schema.
   // A concurrent publication cannot overwrite results after it acquires its lock.
   const updatedCohorts=session.cohorts.map(c=>c.key===cohort.key?{...c,subjects:schema}:c);
   for(let i=0;i<payloads.length;i+=170){
    const chunk=payloads.slice(i,i+170),last=i+170>=payloads.length;
    await runTransaction(db,async tx=>{
     const ref=sessionDoc(session.id),gate=await tx.get(ref);
     if(!gate.exists()||gate.data().status!=='draft')throw Error('Exam publishing started while saving class marks.');
     for(const p of chunk){const {id,...data}=p;tx.set(doc(db,'examResults',id),data)}
     if(last)tx.update(ref,{cohorts:updatedCohorts,updatedAt:now});
    });
   }
   await refresh();
   status('✓ Saved '+payloads.length+' PRIVATE student results for '+cohortLabel(cohort)+'. No student or public website can see these drafts.');
  }catch(e){status('Class save failed: '+e.message,true)}
  finally{busy=false;$('courseExamSaveClass').disabled=session?.status!=='draft'}
 }
 async function publishAll(){
  if(busy||!session||session.status==='published')return;
  busy=true;$('courseExamPublishAll').disabled=true;
  try{
   // A fresh server snapshot is mandatory; stale client previews are not release proof.
   const liveSnap=await getDoc(sessionDoc(session.id));
   if(!liveSnap.exists())throw Error('Examination was deleted.');
   const current={id:session.id,...liveSnap.data()};
   if(!['draft','publishing'].includes(current.status))throw Error('Examination is no longer available for publication.');
   if(current.status==='publishing'&&current.publisherUid!==auth.currentUser?.uid)
    throw Error('Another administrator is publishing this exam; do not start a second publish.');
   const snap=await getDocs(query(collection(db,'examResults'),where('sessionId','==',current.id)));
   const latest=snap.docs.map(d=>({id:d.id,...d.data()}));
   const readiness=readyToPublish(current,latest);
   if(!readiness.ready)throw Error('Publish blocked: '+readiness.problems.slice(0,4).join(' | '));
   const confirmText='Publish '+readiness.total+' students across '+current.cohorts.length+' class(es) for '+current.examTitle+'? Marks become visible ONLY after every class has published successfully. This action is not a draft.';
   if(!confirm(confirmText))return;
   const now=new Date().toISOString(),uid=auth.currentUser?.uid;
   if(!uid)throw Error('Administrator login expired.');
   await runTransaction(db,async tx=>{
    const ref=sessionDoc(current.id),state=await tx.get(ref);
    if(!state.exists())throw Error('Exam no longer exists.');
    const data=state.data();
    if(data.status==='published')throw Error('This exam was already published.');
    if(data.updatedAt!==current.updatedAt)throw Error('Class marks changed while reviewing publication. Refresh and verify again.');
    if(data.status==='publishing'&&data.publisherUid!==uid)throw Error('Another administrator is publishing this exam.');
    tx.update(ref,{status:'publishing',publisherUid:uid,publishStartedAt:now,updatedAt:now});
   });
   status('Checking secure student accounts and preparing publication indexes…');
   const roster=new Map(students.map(s=>[s.id,s]));
   let publishedCount=0;
   for(let offset=0;offset<latest.length;offset+=55){
    const chunk=latest.slice(offset,offset+55);
    const approvals=await Promise.all(chunk.map(p=>getDoc(doc(db,'studentAccess',p.studentId))));
    const hashes=await Promise.all(chunk.map(async p=>{
     const st=roster.get(p.studentId);
     return st?.dob&&st?.examid?examStudentLookupKey(st.examid,st.dob):null;
    }));
    const batch=writeBatch(db);
    for(let i=0;i<chunk.length;i++){
     const p=chunk[i];
     batch.set(doc(db,'examResults',p.id),{published:true,updatedAt:now},{merge:true});
     if(approvals[i].exists())batch.set(doc(db,'studentAccess',p.studentId),
      {resultIds:arrayUnion(p.id),updatedAt:now},{merge:true});
     if(hashes[i])batch.set(doc(db,'examResultLookups',hashes[i]),
      {enabled:true,resultIds:arrayUnion(p.id),updatedAt:now},{merge:true});
    }
    await batch.commit();publishedCount+=chunk.length;
    status('Preparing publication: '+publishedCount+'/'+latest.length+' results. Still hidden from the public until final approval.');
   }
   // Recheck that every student document was written before the release switch.
   const confirmSnap=await getDocs(query(collection(db,'examResults'),where('sessionId','==',current.id)));
   const confirmed=confirmSnap.docs.map(d=>({id:d.id,...d.data()}));
   const check=readyToPublish(current,confirmed);
   if(!check.ready||confirmed.some(r=>r.published!==true))
    throw Error('The exam is incomplete after writing. Publication stays locked; use Resume Publishing.');
   const publicData={visible:$('courseExamAnnounce').checked===true,
    examTitle:current.examTitle,examDate:current.examDate,academicYear:current.academicYear,
    courseCount:current.cohorts.length,studentCount:check.total,publishedAt:now,sessionId:current.id};
   const finalBatch=writeBatch(db);
   finalBatch.set(sessionDoc(current.id),{status:'published',publishedAt:now,updatedAt:now},{merge:true});
   // No names, ALIA IDs, marks or photos are ever written to the public homepage.
   finalBatch.set(doc(db,'examAnnouncements','current'),publicData);
   await finalBatch.commit();
   let promotionCount=0,failures=0;
   if(current.finalForPromotion){
    for(const p of confirmed){
     try{if((await maybePromoteStudent(db,p.studentId)).promoted)promotionCount++}
     catch(e){failures++;console.warn('Promotion follow-up needed:',p.studentId,e)}
    }
    if(promotionCount&&typeof onPromotion==='function')await Promise.resolve(onPromotion()).catch(console.warn);
   }
   await refresh();
   if(typeof onPublication==='function')await Promise.resolve(onPublication()).catch(console.warn);
   status('✅ ALL CLASSES PUBLISHED! '+publishedCount+' student results are now available through approved Student Login and result links. Homepage notice '+(publicData.visible?'ON':'OFF')+'.'+(promotionCount?' Promotions: '+promotionCount+'.':'')+(failures?' Check '+failures+' promotion(s) manually.':''));
  }catch(e){
   status('Publication not completed: '+e.message+'. Drafts remain hidden until the exam is fully released. Refresh; use Resume Publishing if appropriate.',true);
  }finally{busy=false;renderSummary()}
 }
 $('courseExamSession').addEventListener('change',selectSession);
 $('courseExamClass').addEventListener('change',selectCohort);
 $('courseExamCreate').onclick=create;
 $('courseExamPrepare').onclick=()=>renderClassRows(true);
 $('courseExamSaveClass').onclick=saveClass;
 $('courseExamPublishAll').onclick=publishAll;
 $('courseExamRefresh').onclick=async()=>{try{await refresh();status('✓ Examination and class results refreshed.')}catch(e){status(e.message,true)}};
 const now=new Date();
 $('courseExamDate').value=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
 $('courseExamYear').value=$('academicYearSelect')?.value||'2026–2027';
 return {load:refresh};
}
