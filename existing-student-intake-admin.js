/* Existing Academy student self-registration - ADMIN ONLY.
 * Create/close a time-limited shared link; queue applicant-proposed data.
 * Requests NEVER become official students until an administrator verifies
 * the prior register and saves the historical enrollment in Student Details.
 */
import {collection,doc,getDoc,getDocs,query,limit,setDoc,updateDoc,serverTimestamp,Timestamp,writeBatch} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {isProfilePhoto} from './profile-photo.js';
import {academyCourseLabel} from './academy-course-catalog-core.js';
import {matchingStudentForRequest,requestReviewBucket} from './existing-student-review-utils.js';
import {isVerifiedAcademyAdmin} from './academy-admin-access.js';

export function initExistingStudentIntakeAdmin({db,auth,onReview}){
 const $=id=>document.getElementById(id);
 const info=$('existingIntakeAdminStatus');
 const create=$('existingIntakeCreateLink'),copy=$('existingIntakeCopyLink');
 const close=$('existingIntakeCloseLink'),refresh=$('existingIntakeRefresh');
 let activeToken=null;
 const currentAdmin=()=>isVerifiedAcademyAdmin(db,auth.currentUser);
 const tokenOk=v=>/^[a-f0-9]{64}$/.test(String(v||''));
 const linkUrl=v=>{
  const u=new URL('existing-student-registration.html',location.href);
  u.searchParams.set('key',v);
  return u.href;
 };
 const randomToken=()=>{
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
 };
 const label=(name,value)=>{
  const p=document.createElement('p'),b=document.createElement('strong');
  b.textContent=name+': ';
  p.append(b,document.createTextNode(String(value??'—')));
  return p;
 };
 function button(title,handler,secondary=true){
  const b=document.createElement('button');b.type='button';b.textContent=title;
  if(secondary)b.className='secondary';
  b.onclick=handler;
  return b;
 }
 async function getAllLinks(){
  const snapshot=await getDocs(collection(db,'existingStudentIntakeLinks'));
  return snapshot.docs;
 }
 async function refreshLinks(){
  if(!(await currentAdmin()))return;
  info.textContent='Checking existing-student registration links…';
  try{
   const links=await getAllLinks(),now=Date.now();
   const valid=links.filter(x=>x.data().enabled===true &&
    x.data().expiresAt?.toMillis?.()>now).sort((a,b)=>
    (b.data().createdAt?.toMillis?.()||0)-(a.data().createdAt?.toMillis?.()||0));
   activeToken=valid[0]?.id||null;
   copy.disabled=close.disabled=!activeToken;
   info.textContent=activeToken?
    '✅ Existing Student Self-Registration is OPEN. Share the private link only with current Academy students/parents. New requests require Admin review.':
    '🔒 Registration CLOSED. Create a private share link before asking existing students to fill the form.';
  }catch(error){
   activeToken=null;copy.disabled=close.disabled=true;
   info.textContent='Could not check registration links: '+(error.message||error);
  }
 }
 async function copyActive(){
  if(!tokenOk(activeToken))return;
  const url=linkUrl(activeToken);
  try{
   await navigator.clipboard.writeText(url);
   info.textContent='✅ Existing Student Registration link copied. Share in the existing Academy student/parent WhatsApp group. Do not post it as a new admission link.';
  }catch(error){
   prompt('Copy Existing Academy Student Registration Link:',url);
  }
 }
 create.onclick=async()=>{
  if(!(await currentAdmin()))return;
  if(activeToken&&!confirm('Rotate the current existing-student link? The previous link will be closed for new submissions.'))return;
  create.disabled=true;info.textContent='Creating a new secure 30-day link…';
  try{
   const links=await getAllLinks();
   const token=randomToken();
   const batch=writeBatch(db);
   // Old links are closed rather than deleted; previous submissions remain.
   for(const item of links.filter(x=>x.data().enabled===true).slice(0,350))
    batch.update(item.ref,{enabled:false,closedAt:serverTimestamp()});
   batch.set(doc(db,'existingStudentIntakeLinks',token),{
    enabled:true,createdAt:serverTimestamp(),
    expiresAt:Timestamp.fromDate(new Date(Date.now()+30*86400000)),
    createdBy:auth.currentUser.uid
   });
   await batch.commit();
   activeToken=token;
   copy.disabled=close.disabled=false;
   info.textContent='✅ Secure 30-day registration link created. Copy it and share it only with already-studying students/parents.';
   await copyActive();
  }catch(e){info.textContent='Unable to create link: '+(e.message||e)}
  finally{create.disabled=false}
 };
 copy.onclick=copyActive;
 close.onclick=async()=>{
  if(!(await currentAdmin())||!activeToken)return;
  if(!confirm('Close the Existing Academy Student Registration link now? Submitted requests will remain in the Admin review queue.'))return;
  close.disabled=true;
  try{
   const links=await getAllLinks();
   const batch=writeBatch(db);
   for(const item of links.filter(x=>x.data().enabled===true).slice(0,350))
    batch.update(item.ref,{enabled:false,closedAt:serverTimestamp()});
   await batch.commit();
   activeToken=null;copy.disabled=true;
   info.textContent='🔒 Existing Student Registration is now CLOSED. Submitted requests are still available below.';
  }catch(e){info.textContent='Unable to close link: '+(e.message||e)}
  finally{close.disabled=false}
 };

 const pageConfig={
  studentPending:{prefix:'existingIntakePending',label:'Pending',bucket:'pending'},
  studentApproved:{prefix:'existingIntakeApproved',label:'Approved',bucket:'approved'},
  studentClosed:{prefix:'existingIntakeClosed',label:'Closed',bucket:'archived'}
 };
 const pageState=Object.fromEntries(Object.entries(pageConfig).map(([id,config])=>[
  id,{...config,selectedCourse:null}
 ]));
 let cachedRequests=[],cachedCourseNames=new Map(),cachedCourseIds=[];
 const pageDom=(page,suffix)=>$(page.prefix+suffix);
 function fullCourseLabel(course){
  return String(cachedCourseNames.get(course)||academyCourseLabel(
   String(course||'Unassigned').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())
  )||'Unassigned');
 }
 function rowsForPage(page){
  return cachedRequests.filter(item=>page.bucket==='pending'
   ?item.bucket==='pending'||item.bucket==='duplicate-check'
   :item.bucket===page.bucket);
 }
 function renderRequestCard(item){
  const {row,data,match,syncError}=item;
  const card=document.createElement('article');card.className='record';
  const heading=document.createElement('h4');
  heading.textContent='📩 '+String(data.name||'Student')+' · '+String(data.status||'Pending Review');
  card.append(heading);
  card.append(
   label('Request reference','ESR-'+row.id.slice(0,12).toUpperCase()),
   label('Original Academy joining date',data.joiningDate),
   label('Claimed current class',fullCourseLabel(data.course)+
    (data.courseYear?' · Year '+data.courseYear:'')+(data.batch?' · '+data.batch:'')),
   label('Parent / Guardian',data.guardian),
   label('DOB',data.dob),label('Contact',data.phone),
   label('Email (optional)',data.email||'Not provided'),
   label('Address',data.address),
   label('Outside Academy Education',
    data.educationLevel==='school'?'School · '+String(data.schoolStandard||'Standard not submitted'):
    data.educationLevel==='college'?'College · '+String(data.collegeCourse||'Degree not submitted')+
     (data.collegeYear?' · Year '+data.collegeYear:''):
    data.educationLevel==='not-studying'?'Not currently studying outside Madrasa':'Not provided'),
   label('School / College Name',data.institutionName||'Not provided')
  );
  if(data.notes)card.append(label('Notes',data.notes));
  if(data.submittedAt?.toDate)card.append(label('Submitted at',data.submittedAt.toDate().toLocaleString('en-IN')));
  if(isProfilePhoto(data.photoData)){
   const img=document.createElement('img');
   img.src=data.photoData;img.alt='Photo uploaded for '+String(data.name||'student');
   img.style.cssText='display:block;width:80px;height:80px;object-fit:cover;border-radius:8px';
   card.append(img);
  }
  if(syncError)card.append(label('⚠ Approval sync error',syncError));
  if(data.status==='Approved'){
   card.append(label('Issued Student ID',data.studentCode||'See linked official student record'));
  }else if(data.status==='Rejected'||data.status==='Duplicate'){
   if(data.status==='Duplicate')
    card.append(label('Linked Student ID',data.studentCode||data.studentId||'Check official record'));
  }else if(data.status==='Pending Review'){
   const actions=document.createElement('div');actions.className='actions';
   if(match?.kind==='possible-duplicate'){
    const found=match.record;
    card.append(label('⚠ Possible duplicate: verify first',
     String(found.data.name||'Student')+' · '+String(found.data.studentCode||found.id)+
     ' · '+fullCourseLabel(found.data.course)+'. Confirm guardian, DOB and phone.'));
    actions.append(button('✓ Already Registered — Close Duplicate',async()=>{
     if(!confirm('Check the Academy register, DOB, guardian and phone first. Close this request as a duplicate of '+
       String(found.data.studentCode||found.id)+'? No student record or new ALIA ID will be created.'))return;
     try{
      const [requestNow,studentNow]=await Promise.all([
       getDoc(row.ref),getDoc(doc(db,'students',found.id))
      ]);
      const stillMatch=requestNow.exists()&&studentNow.exists()?
       matchingStudentForRequest(requestNow.data(),[{id:found.id,data:studentNow.data()}]):null;
      if(!requestNow.exists()||requestNow.data().status!=='Pending Review'||
       stillMatch?.kind!=='possible-duplicate')
       throw Error('Student or request changed. Refresh and verify again.');
      await updateDoc(row.ref,{
       status:'Duplicate',studentId:found.id,studentCode:studentNow.data().studentCode||'',
       reviewedAt:serverTimestamp(),reviewedByUid:auth.currentUser.uid
      });
      await refreshRequests();
     }catch(e){info.textContent='Could not close duplicate: '+(e.message||e)}
    },false));
   }else if(match?.kind==='ambiguous'){
    card.append(label('⚠ Multiple students share name and DOB',
     String(match.matches)+' possible official matches. Verify the register carefully.'));
   }
   actions.append(button('🔎 Review & Register in Student Editor',()=>{
    onReview(row.id,data);
   },false));
   actions.append(button('✕ Reject Request',async()=>{
    if(!confirm('Reject the registration for '+String(data.name||'Student')+
      '? No new student record will be created.'))return;
    try{
     const latest=await getDoc(row.ref);
     if(!latest.exists()||latest.data().status!=='Pending Review')
      throw Error('Request has changed. Refresh before rejecting.');
     await updateDoc(row.ref,{status:'Rejected',reviewedAt:serverTimestamp(),
      reviewedByUid:auth.currentUser?.uid||''});
     await refreshRequests();
    }catch(e){info.textContent='Could not reject request: '+(e.message||e)}
   }));
   card.append(actions);
  }
  const details=document.createElement('details');details.className='intake-form-row';
  const summary=document.createElement('summary');
  summary.textContent='👤 '+String(data.name||'Student')+' · '+
   String(data.studentCode||'ESR-'+row.id.slice(0,12).toUpperCase())+
   (match?.kind==='possible-duplicate'||match?.kind==='ambiguous'?' · ⚠ DUPLICATE CHECK':'');
  details.append(summary,card);
  return details;
 }
 function renderOnePage(page){
  const cards=pageDom(page,'Courses'),detail=pageDom(page,'Detail'),
   title=pageDom(page,'Title'),records=pageDom(page,'Students'),count=pageDom(page,'Count');
  const rows=rowsForPage(page);
  count.textContent=rows.length+' '+page.label.toLowerCase()+' form'+(rows.length===1?'':'s')+
   ' across '+cachedCourseIds.length+' course'+(cachedCourseIds.length===1?'':'s')+'.';
  cards.replaceChildren();
  for(const course of cachedCourseIds){
   const matches=rows.filter(item=>String(item.data.course||'unassigned')===course);
   const tile=document.createElement('button');tile.type='button';tile.className='intake-course-card';
   const name=document.createElement('span');name.className='intake-course-name';
   name.textContent='📚 '+fullCourseLabel(course);
   const number=document.createElement('span');number.className='intake-course-count';
   number.textContent=matches.length+' '+page.label.toLowerCase()+' form'+(matches.length===1?'':'s');
   const hint=document.createElement('span');hint.className='intake-course-hint';
   hint.textContent='Tap to view '+page.label.toLowerCase()+' registrations →';
   tile.append(name,number,hint);
   tile.onclick=()=>{page.selectedCourse=course;renderOnePage(page)};
   cards.append(tile);
  }
  if(!cachedCourseIds.length){
   cards.append(label('No courses','No official course records available. Check Course Management.'));
  }
  if(page.selectedCourse!==null){
   const course=page.selectedCourse;
   const matches=rows.filter(item=>String(item.data.course||'unassigned')===course);
   cards.hidden=true;detail.hidden=false;
   title.textContent='📚 '+fullCourseLabel(course)+' · '+matches.length+' '+page.label.toLowerCase()+' forms';
   records.replaceChildren();
   if(!matches.length)
    records.append(label('No forms','There are no '+page.label.toLowerCase()+' forms for this course.'));
   for(const item of matches)records.append(renderRequestCard(item));
  }else{
   cards.hidden=false;detail.hidden=true;records.replaceChildren();
  }
 }
 async function refreshRequests(){
  if(!(await currentAdmin()))return;
  for(const page of Object.values(pageState))
   pageDom(page,'Count').textContent='Refreshing '+page.label.toLowerCase()+' registrations…';
  try{
   const [snap,courseSnap,studentSnap]=await Promise.all([
    getDocs(collection(db,'existingStudentRequests')),
    getDocs(collection(db,'courses')),
    getDocs(collection(db,'students'))
   ]);
   cachedCourseNames=new Map(courseSnap.docs.filter(d=>d.data()?.name).map(d=>[
    d.id,academyCourseLabel(d.data().name)
   ]));
   const courses=new Set(cachedCourseNames.keys());
   const official=studentSnap.docs.map(d=>({id:d.id,data:d.data()}));
   cachedRequests=[];
   const sorted=snap.docs.sort((a,b)=>
    (b.data().submittedAt?.toMillis?.()||0)-(a.data().submittedAt?.toMillis?.()||0));
   for(const row of sorted){
    let data=row.data(),match=matchingStudentForRequest(data,official,row.id);
    let syncError='';
    // A verified student record explicitly referencing the request is proof
    // it was saved before the queue status update, so no new ALIA is issued.
    if(data.status==='Pending Review'&&match?.kind==='linked'){
     try{
      await updateDoc(row.ref,{
       status:'Approved',studentId:match.record.id,
       studentCode:match.record.data.studentCode||'',
       reviewedAt:serverTimestamp(),reviewedByUid:auth.currentUser.uid
      });
      data={...data,status:'Approved',studentId:match.record.id,
       studentCode:match.record.data.studentCode||''};
     }catch(error){
      syncError='Official student was saved, but request status sync failed: '+(error.message||error);
     }
    }
    courses.add(String(data.course||'unassigned'));
    cachedRequests.push({row,data,match,syncError,bucket:requestReviewBucket(data.status,match)});
   }
   cachedCourseIds=[...courses].filter(x=>x!=='admission-form-config').sort((a,b)=>
    fullCourseLabel(a).localeCompare(fullCourseLabel(b)));
   for(const page of Object.values(pageState))renderOnePage(page);
  }catch(e){
   for(const page of Object.values(pageState))
    pageDom(page,'Count').textContent='Unable to load '+page.label.toLowerCase()+
      ' forms: '+(e.message||e);
  }
 }
 async function openPage(tab){
  const page=pageState[tab];if(!page)return;
  page.selectedCourse=null;
  await refreshRequests();
 }
 for(const page of Object.values(pageState)){
  pageDom(page,'Back').onclick=()=>{
   page.selectedCourse=null;renderOnePage(page);
  };
  pageDom(page,'Refresh').onclick=()=>refreshRequests();
 }

 refresh.onclick=()=>{refreshLinks();refreshRequests()};
 return {refresh:async()=>{await refreshLinks();await refreshRequests()},refreshRequests,openPage};
}
