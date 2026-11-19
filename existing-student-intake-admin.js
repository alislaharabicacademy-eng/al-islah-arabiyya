/* Existing Academy student self-registration - ADMIN ONLY.
 * Create/close a time-limited shared link; queue applicant-proposed data.
 * Requests NEVER become official students until an administrator verifies
 * the prior register and saves the historical enrollment in Student Details.
 */
import {collection,doc,getDoc,getDocs,query,limit,setDoc,updateDoc,serverTimestamp,Timestamp,writeBatch} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {isProfilePhoto} from './profile-photo.js';
import {academyCourseLabel} from './academy-course-catalog-core.js';
import {matchingStudentForRequest,requestReviewBucket} from './existing-student-review-utils.js';

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
   // Load the complete review/Student data so course totals are exact, not a
   // misleading first-500 count; all reads remain Admin-only.
   const [snap,courseSnap,studentSnap]=await Promise.all([
    getDocs(collection(db,'existingStudentRequests')),
    getDocs(collection(db,'courses')),
    getDocs(collection(db,'students'))
   ]);
   const courseNames=new Map(courseSnap.docs.filter(c=>c.data()?.name).map(c=>[
    c.id,academyCourseLabel(c.data().name)
   ]));
   const rows=snap.docs.sort((a,b)=>
    (b.data().submittedAt?.toMillis?.()||0)-(a.data().submittedAt?.toMillis?.()||0));
   const officialStudents=studentSnap.docs.map(d=>({id:d.id,data:d.data()}));
   const prepared=[];
   for(const row of rows){
    let data=row.data();
    const match=matchingStudentForRequest(data,officialStudents,row.id);
    let syncError='';
    if(data.status==='Pending Review'&&match?.kind==='linked'){
     // A previous save may have committed the official student but failed to
     // update its request. This direct reference is proof of that approval.
     try{
      await updateDoc(row.ref,{
       status:'Approved',studentId:match.record.id,
       studentCode:match.record.data.studentCode||'',
       reviewedAt:serverTimestamp(),reviewedByUid:auth.currentUser.uid
      });
      data={...data,status:'Approved',studentId:match.record.id,
       studentCode:match.record.data.studentCode||''};
     }catch(e){syncError='Official student exists but request status could not be synchronized: '+(e.message||e)}
    }
    prepared.push({row,data,match,syncError,bucket:requestReviewBucket(data.status,match)});
   }
   requests.replaceChildren();
   const counts={pending:0,approved:0,'duplicate-check':0,archived:0};
   for(const item of prepared)counts[item.bucket]++;
   const head=document.createElement('p');
   head.className='section-note';
   head.textContent=counts.pending+' pending · '+counts.approved+' approved · '+
    counts['duplicate-check']+' possible duplicate(s) to verify · '+
    counts.archived+' closed/rejected · '+prepared.length+' total forms';
   requests.append(head);
   if(!prepared.length){
    requests.append(label('No submissions','Share the private Existing Student Registration link with current Academy students first.'));
    return;
   }
   const folder=(title,open=false)=>{
    const box=document.createElement('details');
    box.className='record';box.open=open;
    box.style.cssText='padding:12px;margin:10px 0;border:1px solid #cbdacf;border-radius:12px';
    const summary=document.createElement('summary');
    summary.textContent=title;
    summary.style.cssText='font-weight:800;cursor:pointer;list-style-position:inside';
    box.append(summary);
    return box;
   };
   const groups=[
    ['pending','📥 Pending Forms',true,'pending'],
    ['approved','✅ Approved Forms',false,'approved'],
    ['duplicate-check','⚠️ Possible Duplicate Forms — Admin Verification',false,'to verify'],
    ['archived','🗂 Closed / Rejected Forms',false,'closed']
   ];
   for(const [bucket,title,open,suffix] of groups){
    const items=prepared.filter(item=>item.bucket===bucket);
    const section=folder(title+' ('+items.length+')',open);
    requests.append(section);
    if(!items.length){
     section.append(label('Status','No forms in this category.'));
     continue;
    }
    const courses=new Map();
    for(const item of items){
     const key=String(item.data.course||'unassigned');
     if(!courses.has(key))courses.set(key,[]);
     courses.get(key).push(item);
    }
    for(const [key,courseItems] of [...courses].sort((a,b)=>
     String(courseNames.get(a[0])||a[0]).localeCompare(String(courseNames.get(b[0])||b[0])))){
     const title=String(courseNames.get(key)||academyCourseLabel(key)||key);
     const courseFolder=folder('📚 '+title+' · '+courseItems.length+' '+suffix);
     section.append(courseFolder);
     for(const item of courseItems)item.mount=courseFolder;
    }
   }
   for(const {row,data,match,bucket,mount,syncError} of prepared){
    const card=document.createElement('article');
    card.className='record';
    const title=document.createElement('h4');
    title.textContent='📩 '+String(data.name||'Student')+' · '+(data.status||'Pending Review');
    card.append(title);
    card.append(
     label('Request reference','ESR-'+row.id.slice(0,12).toUpperCase()),
     label('Original Academy joining date',data.joiningDate),
     label('Claimed current class',String(courseNames.get(data.course)||data.course||'')+
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
    if(syncError)card.append(label('⚠ Approval sync error',syncError));
    if(data.status==='Approved'){
     card.append(label('Issued Student ID',data.studentCode||'See linked student record'));
    }else if(data.status==='Duplicate'){
     card.append(label('Linked student ID',data.studentCode||data.studentId||'Check official record'));
    }else if(data.status==='Pending Review'){
     const action=document.createElement('div');action.className='actions';
     if(match?.kind==='possible-duplicate'){
      const found=match.record;
      card.append(label('⚠ Potential existing student',
       String(found.data.name||'')+' · '+(found.data.studentCode||found.id)+
       ' · '+String(found.data.course||'')+'. Compare guardian and phone before closing.'));
      action.append(button('✓ Confirm Already Registered / Close Duplicate',async()=>{
       if(!confirm('Verify the Academy register, student DOB, guardian and phone. Mark this form as a duplicate of '+
        String(found.data.studentCode||found.id)+'? This will NOT create a student or a new ALIA ID.'))return;
       try{
        const [requestNow,studentNow]=await Promise.all([
         getDoc(row.ref),getDoc(doc(db,'students',found.id))
        ]);
        const stillMatch=studentNow.exists()?
         matchingStudentForRequest(requestNow.data(),[{id:found.id,data:studentNow.data()}]):null;
        if(!requestNow.exists()||requestNow.data().status!=='Pending Review'||
         stillMatch?.kind!=='possible-duplicate')
         throw Error('Student/request changed. Refresh and verify again.');
        await updateDoc(row.ref,{
         status:'Duplicate',studentId:found.id,
         studentCode:studentNow.data().studentCode||'',
         reviewedAt:serverTimestamp(),reviewedByUid:auth.currentUser.uid
        });
        await refreshRequests();
       }catch(e){info.textContent='Could not close duplicate: '+(e.message||e)}
      },false));
     }else if(match?.kind==='ambiguous'){
      card.append(label('⚠ Multiple identity matches',
       match.matches+' official records share this name and DOB. Check the Academy register before proceeding.'));
     }

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
    const itemFolder=folder('👤 '+String(data.name||'Student')+' · '+
     String(data.studentCode||'ESR-'+row.id.slice(0,12).toUpperCase())+
     ' · '+(data.status||'Pending Review'));
    itemFolder.append(card);
    mount.append(itemFolder);
   }
  }catch(e){requests.textContent='Unable to load existing-student submissions: '+(e.message||e)}
 }
 refresh.onclick=()=>{refreshLinks();refreshRequests()};
 return {refresh:async()=>{await refreshLinks();await refreshRequests()},refreshRequests};
}
