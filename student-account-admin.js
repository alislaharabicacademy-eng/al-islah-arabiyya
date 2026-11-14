
import{doc,getDoc,setDoc,collection,getDocs,query,where}from'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
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
   msg(previous?(previous.enabled?'✓ Account enabled for '+previous.email:'Account disabled. Re-enable when ready.'):'No account linked yet. Enter an approved email address.');
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
   const resultIds=enabled?(await getDocs(query(collection(db,'examResults'),where('studentId','==',selected.id)))).docs.filter(d=>d.data().published===true).map(d=>d.id):[];
   const data={
    studentId:selected.id,email,enabled,studentCode:String(student.studentCode||''),
    studentName:String(student.name||'Student'),course:String(student.course||''),
    batch:String(student.batch||''),state:String(student.state||'Active'),resultIds,
    createdAt:previous?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()
   };
   await setDoc(doc(db,'studentAccess',selected.id),data);
   previous=data;$('studentAccountEnabled').checked=enabled;
   msg(enabled?'✓ Real Firebase student account access approved for '+email+'. The user must verify their email and sign in.':'✓ Student account disabled. Sign-in will no longer grant dashboard access.');
  }catch(err){msg('Account save failed: '+err.message)}
  finally{button.disabled=false;off.disabled=false}
 }
 async function syncStudent(studentId,data){
  const ref=doc(db,'studentAccess',studentId),snap=await getDoc(ref);
  if(!snap.exists())return;
  await setDoc(ref,{studentName:String(data.name||'Student'),studentCode:String(data.studentCode||''),course:String(data.course||''),batch:String(data.batch||''),
   state:String(data.state||'Active'),updatedAt:new Date().toISOString()},{merge:true});
 }
 function close(){selected=null;previous=null;panel.hidden=true;$('studentAccountEmail').value='';msg('')}
 $('studentAccountSave').addEventListener('click',()=>save(false));
 $('studentAccountDisable').addEventListener('click',()=>save(true));
 $('studentAccountClose').addEventListener('click',close);
 return {open,close,syncStudent};
}
