
// Admin-side secure, one-use student update invitations.
// Parents never write students/{id} or studentAccess/{id} directly.
import {doc,getDoc,setDoc,collection,getDocs,updateDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {isVerifiedAcademyAdmin} from './academy-admin-access.js';
export function initStudentProfileRequests({db,auth,onLoadIntoEditor}){
 const $=id=>document.getElementById(id);
 const panel=$('studentUpdateLinkPanel'),note=$('studentUpdateLinkStatus');
 let currentStudent=null;
 const admin=()=>isVerifiedAcademyAdmin(db,auth.currentUser);
 const span=(label,value)=>{const p=document.createElement('p');const strong=document.createElement('strong');strong.textContent=label+': ';p.append(strong,document.createTextNode(String(value??'—')));return p};
 const make=(label,onClick,secondary=false)=>{
  const b=document.createElement('button');b.type='button';b.textContent=label;if(secondary)b.className='secondary';b.onclick=onClick;return b;
 };
 const invitationUrl=token=>{const url=new URL('student-update.html',location.href);url.searchParams.set('token',token);return url.href};
 async function copyLink(token){
  const value=invitationUrl(token);
  try{await navigator.clipboard.writeText(value);note.textContent='✓ Private Student Update link copied. Share ONLY with the approved parent/student.'}
  catch(err){prompt('Copy private student profile update link:',value)}
 }
 async function openInvite(student){
  if(!await admin())throw Error('Verified Academy Admin login required.');
  if(!student?.id)throw Error('Save the student first.');
  currentStudent={...student};panel.hidden=false;
  $('studentUpdateSelected').textContent=(student.name||'Student')+' · '+(student.studentCode||'ALIA ID pending');
  $('studentUpdateEmail').value=String(student.email||'').trim().toLowerCase();
  note.textContent='Checking existing approved login email…';
  try{
   const access=await getDoc(doc(db,'studentAccess',student.id));
   if(currentStudent?.id!==student.id)return;
   if(access.exists()&&access.data().email)$('studentUpdateEmail').value=String(access.data().email).toLowerCase();
  }catch(err){console.warn('Existing student login lookup:',err.code||err.message)}
  note.textContent='Enter the exact parent/student Google email. Google authentication is required to submit the form.';
  await renderInvites();
  panel.scrollIntoView({behavior:'smooth'});
 }
 async function renderInvites(){
  const root=$('studentUpdateInvites');root.replaceChildren();
  if(!currentStudent)return;
  try{
   const snap=await getDocs(collection(db,'studentUpdateInvites'));
   const invites=snap.docs.filter(d=>d.data().studentId===currentStudent.id).slice(0,12);
   if(!invites.length){root.append(span('Links','No invitation created yet'));return}
   for(const record of invites){
    const d=record.data(),row=document.createElement('div');row.className='record';
    row.append(span('Verified email',d.email),span('Status',d.revoked?'Revoked':d.used?'Submitted':'Available'));
    if(!d.revoked&&!d.used){
     row.append(make('📋 Copy Private Link',()=>copyLink(record.id),true));
     row.append(make('Revoke',async()=>{
      if(!confirm('Revoke this one-time Student Update link?'))return;
      await updateDoc(record.ref,{revoked:true});renderInvites();
     },true));
    }
    root.append(row);
   }
  }catch(err){note.textContent='Could not load update invitations: '+err.message}
 }
 $('closeStudentUpdateLink').onclick=()=>{panel.hidden=true;currentStudent=null};
 $('issueStudentUpdateLink').onclick=async()=>{
  if(!await admin()||!currentStudent)return;
  const email=$('studentUpdateEmail').value.trim().toLowerCase(),button=$('issueStudentUpdateLink');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){note.textContent='Enter a valid verified Google email.';return}
  if(!confirm('Create a one-time profile update link for '+(currentStudent.name||'Student')+' / '+email+'?'))return;
  button.disabled=true;note.textContent='Creating a verified email-only invitation…';
  try{
   const bytes=crypto.getRandomValues(new Uint8Array(32));
   const token=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
   await setDoc(doc(db,'studentUpdateInvites',token),{
    studentId:currentStudent.id,studentCode:String(currentStudent.studentCode||''),
    studentName:String(currentStudent.name||'Student'),
    email,used:false,revoked:false,createdAt:serverTimestamp()
   });
   await renderInvites();await copyLink(token);
  }catch(err){note.textContent='Cannot generate link: '+err.message}
  finally{button.disabled=false}
 };
 $('refreshStudentUpdateRequests').onclick=()=>refreshRequests();
 async function refreshRequests(){
  const root=$('studentUpdateRequests');root.replaceChildren();
  if(!await admin())return;
  root.textContent='Loading student submissions…';
  try{
   const [requests,invites,students]=await Promise.all([
    getDocs(collection(db,'studentUpdateSubmissions')),
    getDocs(collection(db,'studentUpdateInvites')),
    getDocs(collection(db,'students'))
   ]);
   const invitations=new Map(invites.docs.map(d=>[d.id,d.data()]));
   const studentById=new Map(students.docs.map(d=>[d.id,d.data()]));
   root.replaceChildren();
   const ordered=[...requests.docs].sort((a,b)=>{
    const t=x=>x.data().submittedAt?.toMillis?.()||0;
    return t(b)-t(a);
   });
   if(!ordered.length){root.textContent='No student profile update requests have been submitted.';return}
   for(const req of ordered){
    const data=req.data(),invite=invitations.get(req.id);
    if(!invite){root.append(span('Invalid request ID',req.id.slice(0,8)));continue}
    const student=studentById.get(invite.studentId);
    const card=document.createElement('article');card.className='record';
    const headline=document.createElement('h4');headline.textContent='📩 '+(invite.studentName||data.name||'Student')+' · '+(invite.studentCode||'ALIA ID pending');card.append(headline);
    const status=document.createElement('strong');status.textContent='Status: '+String(data.reviewStatus||'Pending Admin Review');card.append(status);
    card.append(span('Verified submitted email',data.email),span('Current Student',student?.name||'Student no longer found'));
    const comparison=document.createElement('details'),summary=document.createElement('summary');summary.textContent='View submitted mandatory details and compare';comparison.append(summary);
    for(const [key,label] of Object.entries({name:'Student Name',course:'Course',guardian:'Parent / Guardian',dob:'Date of Birth',phone:'Contact Number',email:'Contact Email',address:'Home Address',notes:'Additional Message'})){
     comparison.append(span(label,String(data[key]||'—')+'  |  CURRENT: '+String(student?.[key]||'—')));
    }
    card.append(comparison);
    if(!data.reviewStatus&&student){
     const actions=document.createElement('div');actions.className='actions';
     actions.append(make('✏ Load into Student Edit Form',()=>onLoadIntoEditor(invite.studentId,student,data)));
     actions.append(make('✓ Mark Reviewed (After Saving)',async()=>{
      if(!confirm('Confirm that you reviewed the request AND SAVED the corrected student details in the Student Editor?'))return;
      await updateDoc(req.ref,{reviewStatus:'reviewed',reviewedAt:serverTimestamp()});refreshRequests();
     },true));
     actions.append(make('✕ Reject Request',async()=>{
      if(!confirm('Reject the proposed student profile changes?'))return;
      await updateDoc(req.ref,{reviewStatus:'rejected',reviewedAt:serverTimestamp()});refreshRequests();
     },true));
     card.append(actions);
    }
    root.append(card);
   }
  }catch(err){root.textContent='Student profile review error: '+err.message}
 }
 return {openInvite,refreshRequests};
}
