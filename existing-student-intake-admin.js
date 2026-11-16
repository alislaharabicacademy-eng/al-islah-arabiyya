/* Existing Academy student self-registration - ADMIN ONLY.
 * Create/close a time-limited shared link; queue applicant-proposed data.
 * Requests NEVER become official students until an administrator verifies
 * the prior register and saves the historical enrollment in Student Details.
 */
import {collection,doc,getDocs,query,limit,setDoc,updateDoc,serverTimestamp,Timestamp,writeBatch} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {isProfilePhoto} from './profile-photo.js';

export function initExistingStudentIntakeAdmin({db,auth,onReview}){
 const $=id=>document.getElementById(id);
 const info=$('existingIntakeAdminStatus'),requests=$('existingIntakeRequests');
 const create=$('existingIntakeCreateLink'),copy=$('existingIntakeCopyLink');
 const close=$('existingIntakeCloseLink'),refresh=$('existingIntakeRefresh');
 let activeToken=null;
 const currentAdmin=()=>Boolean(auth.currentUser?.emailVerified&&auth.currentUser?.uid);
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
  if(!currentAdmin())return;
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
  if(!currentAdmin())return;
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
  if(!currentAdmin()||!activeToken)return;
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
 async function refreshRequests(){
  if(!currentAdmin())return;
  requests.textContent='Loading submitted existing-student forms…';
  try{
   const snap=await getDocs(query(collection(db,'existingStudentRequests'),limit(500)));
   const rows=snap.docs.sort((a,b)=>
    (b.data().submittedAt?.toMillis?.()||0)-(a.data().submittedAt?.toMillis?.()||0));
   requests.replaceChildren();
   const waiting=rows.filter(r=>r.data().status==='Pending Review').length;
   const head=document.createElement('p');
   head.className='section-note';
   head.textContent=waiting+' awaiting Academy register verification · '+rows.length+' submitted request(s) shown';
   requests.append(head);
   if(!rows.length){
    requests.append(label('No submissions','Share the private Existing Student Registration link with current Academy students first.'));
    return;
   }
   for(const row of rows){
    const data=row.data(),card=document.createElement('article');
    card.className='record';
    const title=document.createElement('h4');
    title.textContent='📩 '+String(data.name||'Student')+' · '+(data.status||'Pending Review');
    card.append(title);
    card.append(
     label('Request reference','ESR-'+row.id.slice(0,12).toUpperCase()),
     label('Original Academy joining date',data.joiningDate),
     label('Claimed current class',String(data.course||'')+
       (data.courseYear?' · Year '+data.courseYear:'')+(data.batch?' · '+data.batch:'')),
     label('Parent / Guardian',data.guardian),
     label('DOB',data.dob),
     label('Contact',data.phone),
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
    if(data.status==='Approved'){
     card.append(label('Issued Student ID',data.studentCode||'See linked student record'));
    }else if(data.status==='Pending Review'){
     const action=document.createElement('div');action.className='actions';
     action.append(button('🔎 Review & Register in Student Editor',()=>{
      onReview(row.id,data);
     },false));
     action.append(button('✕ Reject Request',async()=>{
      if(!confirm('Reject this submitted registration for '+String(data.name||'Student')+'? No student record will be created.'))return;
      try{
       await updateDoc(row.ref,{status:'Rejected',reviewedAt:serverTimestamp(),
        reviewedByUid:auth.currentUser?.uid||''});
       await refreshRequests();
      }catch(e){info.textContent='Could not reject request: '+(e.message||e)}
     }));
     card.append(action);
    }
    requests.append(card);
   }
  }catch(e){requests.textContent='Unable to load existing-student submissions: '+(e.message||e)}
 }
 refresh.onclick=()=>{refreshLinks();refreshRequests()};
 return {refresh:async()=>{await refreshLinks();await refreshRequests()},refreshRequests};
}
