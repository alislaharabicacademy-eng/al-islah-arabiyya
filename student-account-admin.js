
import{doc,getDoc,setDoc,collection,getDocs,query,where}from'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import{normalizeStudentCode,validateStudentDOB,makeStudentDobVerifier}from'./student-dob-verifier.js';
import{isProfilePhoto}from'./profile-photo.js';
export function initStudentAccountAdmin({db}){
 const $=id=>document.getElementById(id);
 const panel=$('studentAccountPanel'),status=$('studentAccountStatus');
 let selected=null,previous=null;
 function msg(value){status.textContent=value}
 function emailValue(){
  const value=$('studentAccountEmail').value.trim().toLowerCase();
  if(!/^[^\s@\/]+@[^\s@\/]+\.[^\s@\/]+$/.test(value)||value.length>200)throw Error('Enter a valid student or guardian email.');
  return value;
 }
 async function open(student){
  if(!student?.id)throw Error('Save the student first.');
  selected={...student};previous=null;panel.hidden=false;
  $('studentAccountTitle').textContent=(student.name||'Student')+' · '+(student.studentCode||'ALIA ID pending')+' · '+(student.course||'No class');
  $('studentAccountEmail').value='';$('studentAccountEnabled').checked=true;
  msg('Loading student access…');
  panel.scrollIntoView({behavior:'smooth',block:'start'});
  try{
   const snap=await getDoc(doc(db,'studentAccess',student.id));
   if(selected?.id!==student.id)return;
   previous=snap.exists()?snap.data():null;
   $('studentAccountEmail').value=previous?.email||'';
   $('studentAccountEnabled').checked=previous?previous.enabled===true:true;
   msg(!student.studentCode||!student.dob?'First save this student with an ALIA ID and Date of Birth before enabling account login.':previous?(previous.enabled?'✓ Account enabled for '+previous.email+' · Student ID + DOB are required for login.':'Account disabled. Re-enable when ready.'):'No account linked yet. Approve a guardian email and students can enter ALIA Student ID + DOB first.');
  }catch(err){msg('Unable to read account: '+err.message)}
 }
 async function save(disable=false){
  if(!selected)return msg('Select a student first.');
  const button=$('studentAccountSave'),off=$('studentAccountDisable');
  button.disabled=true;off.disabled=true;
  try{
   const email=emailValue(),enabled=!disable&&$('studentAccountEnabled').checked;
   if(previous?.email&&previous.email!==email&&!confirm('Change the linked email address? The old account will lose access.'))return;
   if(enabled&&!confirm('Enable account access to this student for '+email+'? Confirm this is the approved student or guardian email.'))return;
   if(!enabled&&!confirm('Disable student dashboard access for this student?'))return;
   const existing=await getDoc(doc(db,'students',selected.id));
   if(!existing.exists())throw Error('Student record not found. Refresh students.');
   const student=existing.data();
   let dobVerifier=previous?.dobProof&&previous.dobProofVersion===1?{
    dobSalt:previous.dobSalt,dobProof:previous.dobProof,dobProofVersion:previous.dobProofVersion
   }:{};
   if(enabled){
    const studentCode=normalizeStudentCode(student.studentCode);
    const dob=validateStudentDOB(student.dob);
    // Rotate the verifier when access is newly approved. The approved grant
    // remains readable only to the verified owner of the admin-approved email.
    dobVerifier=await makeStudentDobVerifier(studentCode,dob);
   }
   const resultIds=enabled?(await getDocs(query(collection(db,'examResults'),where('studentId','==',selected.id)))).docs.filter(d=>d.data().published===true).map(d=>d.id):[];
   const data={
    studentId:selected.id,email,enabled,studentCode:String(student.studentCode||''),...dobVerifier,
    studentName:String(student.name||'Student'),photoData:isProfilePhoto(student.photoData)?student.photoData:'',course:String(student.course||''),
    batch:String(student.batch||''),state:String(student.state||'Active'),resultIds,
    createdAt:previous?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()
   };
   await setDoc(doc(db,'studentAccess',selected.id),data);
   previous=data;$('studentAccountEnabled').checked=enabled;
   msg(enabled?'✓ Approved '+email+'. Students enter ALIA ID + Date of Birth first, then verify with this approved account (email/password or Google).':'✓ Student account disabled. This email can no longer enter the student dashboard.');
  }catch(err){msg('Account save failed: '+err.message)}
  finally{button.disabled=false;off.disabled=false}
 }
 async function syncStudent(studentId,data){
  const ref=doc(db,'studentAccess',studentId),snap=await getDoc(ref);
  if(!snap.exists())return;
  const studentCode=String(data.studentCode||'');
  const payload={
   studentName:String(data.name||'Student'),studentCode,photoData:isProfilePhoto(data.photoData)?data.photoData:'',course:String(data.course||''),
   batch:String(data.batch||''),state:String(data.state||'Active'),updatedAt:new Date().toISOString()
  };
  if(data.dob&&/^ALIA[0-9]{5}$/.test(studentCode))Object.assign(payload,await makeStudentDobVerifier(normalizeStudentCode(studentCode),validateStudentDOB(data.dob)));
  else payload.enabled=false; // Never leave a stale DOB verifier enabled.
  await setDoc(ref,payload,{merge:true});
 }
 function close(){selected=null;previous=null;panel.hidden=true;$('studentAccountEmail').value='';msg('')}
 $('studentAccountSave').addEventListener('click',()=>save(false));
 $('studentAccountDisable').addEventListener('click',()=>save(true));
 $('studentAccountClose').addEventListener('click',close);
 return {open,close,syncStudent};
}
