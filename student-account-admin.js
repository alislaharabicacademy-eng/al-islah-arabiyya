import{doc,getDoc,setDoc}from'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import{normalizeStudentCode,validateStudentDOB}from'./student-dob-verifier.js';
import{isProfilePhoto}from'./profile-photo.js';
import{validFeeLedger}from'./fee-ledger-utils.js';

// Admin manages a simple Student ID + DOB login. Student/guardian emails,
// Google sign-in and approval are not required. A disabled grant blocks access.
export function initStudentAccountAdmin({db}){
 const $=id=>document.getElementById(id),panel=$('studentAccountPanel'),status=$('studentAccountStatus');
 let selected=null,previous=null;
 function validStudent(student){
  try{normalizeStudentCode(student.studentCode);validateStudentDOB(student.dob);return true}catch{return false}
 }
 function show(){
  const ready=!!selected&&validStudent(selected),enabled=ready&&previous?.enabled!==false;
  const badge=$('studentAccountApprovalBadge');
  badge.textContent=!ready?'⚠ Student ID and DOB are required before Login can be used.':
   enabled?'✅ ENABLED — Student ID + DOB Login (No Gmail required)':
    '⛔ DISABLED — Student cannot open the Dashboard';
  badge.style.background=enabled?'#e0f6e7':'#fff0ed';badge.style.color=enabled?'#115333':'#952e28';
  $('studentAccountSave').hidden=!ready||enabled;
  $('studentAccountDisable').hidden=!enabled;
 }
 async function open(student){
  if(!student?.id)throw Error('Save the student record first.');
  selected={...student};previous=null;panel.hidden=false;
  $('studentAccountTitle').textContent=(student.name||'Student')+' · '+(student.studentCode||'ALIA ID pending')+' · '+(student.course||'No class');
  status.textContent='Checking student account status…';show();
  panel.scrollIntoView({behavior:'smooth',block:'start'});
  try{
   const ref=await getDoc(doc(db,'studentAccess',student.id));
   if(selected?.id!==student.id)return;
   previous=ref.exists()?ref.data():null;
   show();
   status.textContent=validStudent(selected)?
    'Students can log in directly using their official ALIA Student ID and DOB. No email approval is needed.':
    'First save an official ALIA ID and Date of Birth for this student.';
  }catch(err){status.textContent='Unable to check account status: '+err.message}
 }
 async function save(disable){
  if(!selected)return;
  const enable=!disable;
  const button=enable?$('studentAccountSave'):$('studentAccountDisable');
  button.disabled=true;
  try{
   const existing=await getDoc(doc(db,'students',selected.id));
   if(!existing.exists())throw Error('Student not found.');
   if(!validStudent(existing.data()))throw Error('Save a valid ALIA ID and Date of Birth first.');
   if(!confirm(enable?'Enable Student ID + DOB Login for this student?':'Disable Student Login for this student?'))return;
   await setDoc(doc(db,'studentAccess',selected.id),{
    studentId:selected.id,studentCode:existing.data().studentCode,
    enabled:enable,updatedAt:new Date().toISOString()
   },{merge:true});
   previous={...(previous||{}),enabled:enable};selected={...selected,...existing.data()};
   show();
   status.textContent=enable?'✓ Student ID + DOB Login enabled. No Gmail is required.':
    '⛔ Login disabled. Student record, fees, results and certificates are preserved.';
  }catch(err){status.textContent='Could not change access: '+err.message}
  finally{button.disabled=false}
 }
 async function syncStudent(studentId,data){
  const ref=doc(db,'studentAccess',studentId),snap=await getDoc(ref);
  if(!snap.exists())return;
  const latest=await getDoc(doc(db,'students',studentId)),student=latest.exists()?latest.data():data;
  let monthlyFee=0;
  try{
   const courseId=String(student.course||'').trim();
   if(courseId){const course=await getDoc(doc(db,'courses',courseId));if(course.exists())monthlyFee=Math.max(0,Number(course.data().monthlyFee)||0)}
  }catch(err){console.warn('Student fee rate unavailable:',err.code||err.message)}
  const payload={
   studentName:String(data.name||'Student'),studentCode:String(data.studentCode||''),
   photoData:isProfilePhoto(data.photoData)?data.photoData:'',
   course:String(data.course||''),batch:String(data.batch||''),state:String(data.state||'Active'),
   promotionHistory:Array.isArray(data.promotionHistory)?data.promotionHistory:[],
   competitionCertificates:Array.isArray(data.competitionCertificates)?data.competitionCertificates:[],
   feeLedger:validFeeLedger(student.feeLedger),feeMonthlyRate:monthlyFee,
   feeEnrollmentDate:String(student.approvedAt||student.enrollmentDate||student.admittedAt||'').slice(0,24),
   updatedAt:new Date().toISOString()
  };
  if(!validStudent({...student,studentCode:data.studentCode}))payload.enabled=false;
  await setDoc(ref,payload,{merge:true});
 }
 function close(){selected=null;previous=null;panel.hidden=true;status.textContent=''}
 $('studentAccountSave').addEventListener('click',()=>save(false));
 $('studentAccountDisable').addEventListener('click',()=>save(true));
 $('studentAccountClose').addEventListener('click',close);
 return {open,close,syncStudent};
}
