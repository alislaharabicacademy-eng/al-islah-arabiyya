/* Admin-only competition certificates stored in the existing protected
 * students collection, mirrored into the existing verified guardian's
 * studentAccess record for Student Dashboard PDF downloads. No public list. */
import {collection,getDocs,doc,getDoc,runTransaction} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {createCompetitionCertificatePdf,downloadExamBlob,safePdfName} from './exam-documents.js';
const ALLOWED_AWARDS=new Set(['Participation','Winner','First Prize','Second Prize','Third Prize','Appreciation','Best Performance']);
const MAX_CERTS=60;
function makeCertificateId(){
 const bytes=crypto.getRandomValues(new Uint8Array(10));
 return 'COMP-'+[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
}
function validDate(v){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
 const d=new Date(v+'T00:00:00Z');
 return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;
}
async function saveCertificate(db,studentId,values){
 const id=makeCertificateId(),ref=doc(db,'students',studentId),accessRef=doc(db,'studentAccess',studentId);
 return runTransaction(db,async tx=>{
  const [snap,access]=await Promise.all([tx.get(ref),tx.get(accessRef)]);
  if(!snap.exists())throw Error('Student not found. Refresh the registered students.');
  const student=snap.data();
  if(!/^ALIA[0-9]{5}$/.test(student.studentCode||''))throw Error('Assign the student an official ALIA ID first.');
  const old=Array.isArray(student.competitionCertificates)?student.competitionCertificates:[];
  if(old.length>=MAX_CERTS)throw Error('This student reached the certificate record limit. Please contact the Academy administrator.');
  const cert={
   id,studentName:String(student.name||'Student'),studentCode:student.studentCode,
   course:String(student.course||''),eventName:values.eventName,
   eventDate:values.eventDate,award:values.award,issuedAt:new Date().toISOString()
  };
  const list=[...old,cert];
  tx.update(ref,{competitionCertificates:list});
  if(access.exists())tx.update(accessRef,{competitionCertificates:list,updatedAt:cert.issuedAt});
  return cert;
 });
}
async function revokeCertificate(db,studentId,certId){
 const ref=doc(db,'students',studentId),accessRef=doc(db,'studentAccess',studentId);
 await runTransaction(db,async tx=>{
  const [snap,access]=await Promise.all([tx.get(ref),tx.get(accessRef)]);
  if(!snap.exists())throw Error('Student not found.');
  const all=Array.isArray(snap.data().competitionCertificates)?snap.data().competitionCertificates:[];
  if(!all.some(c=>c.id===certId))throw Error('Certificate is already revoked.');
  const next=all.filter(c=>c.id!==certId);
  tx.update(ref,{competitionCertificates:next});
  if(access.exists())tx.update(accessRef,{competitionCertificates:next,updatedAt:new Date().toISOString()});
 });
}
export function initCompetitionCertificateAdmin({db}){
 const $=id=>document.getElementById(id);
 const student=$('competitionStudent'),event=$('competitionEvent'),date=$('competitionDate'),award=$('competitionAward');
 const status=$('competitionStatus'),records=$('competitionCertificatesList'),issue=$('competitionIssue');
 const text=(message,error=false)=>{status.textContent=message;status.style.color=error?'#ab4536':'#17583a'};
 async function loadStudents(){
  const previously=student.value;
  student.replaceChildren(new Option('Select Registered Student',''));
  try{
   const snap=await getDocs(collection(db,'students'));
   for(const d of snap.docs){
    const x=d.data();
    const name=String(x.name||'Student')+' · '+String(x.studentCode||'ALIA pending')+' · '+String(x.course||'');
    student.add(new Option(name,d.id));
   }
   if([...student.options].some(x=>x.value===previously))student.value=previously;
   await showCertificates();
  }catch(e){text('Cannot load students: '+e.message,true)}
 }
 async function showCertificates(){
  records.replaceChildren();
  if(!student.value)return;
  try{
   const snap=await getDoc(doc(db,'students',student.value));
   if(!snap.exists())throw Error('Student record not found.');
   const certificates=Array.isArray(snap.data().competitionCertificates)?snap.data().competitionCertificates:[];
   if(!certificates.length){records.textContent='No competition certificates issued for this student.';return}
   for(const c of [...certificates].reverse()){
    const row=document.createElement('div');row.className='record';
    const heading=document.createElement('strong');heading.textContent=c.eventName+' · '+c.award;
    const detail=document.createElement('p');detail.textContent=c.eventDate+' · Certificate '+c.id;
    const download=document.createElement('button');download.type='button';download.className='secondary';download.textContent='📄 Download Certificate PDF';
    download.onclick=async()=>{download.disabled=true;try{const blob=await createCompetitionCertificatePdf(c);downloadExamBlob(blob,'Competition_'+safePdfName(c.studentName)+'_'+c.id+'.pdf')}catch(e){text('PDF failed: '+e.message,true)}finally{download.disabled=false}};
    const revoke=document.createElement('button');revoke.type='button';revoke.className='secondary';revoke.textContent='✕ Revoke Certificate';
    revoke.onclick=async()=>{if(!confirm('Revoke certificate '+c.id+'? This removes it from the Student Dashboard.'))return;revoke.disabled=true;try{await revokeCertificate(db,student.value,c.id);text('Certificate revoked.');await showCertificates()}catch(e){text('Revoke failed: '+e.message,true);revoke.disabled=false}};
    row.append(heading,detail,download,revoke);records.append(row);
   }
  }catch(e){text('Cannot load certificates: '+e.message,true)}
 }
 issue.onclick=async()=>{
  if(!student.value)return text('Select a registered student.',true);
  const eventName=event.value.trim(),eventDate=date.value,awardValue=award.value;
  if(eventName.length<3||eventName.length>120||!validDate(eventDate)||!ALLOWED_AWARDS.has(awardValue))return text('Enter a valid competition name, date and certificate award.',true);
  if(!confirm('Issue '+awardValue+' certificate for '+student.selectedOptions[0].textContent+'?'))return;
  issue.disabled=true;text('Issuing certificate securely…');
  try{
   const certificate=await saveCertificate(db,student.value,{eventName,eventDate,award:awardValue});
   text('✓ Certificate issued: '+certificate.id+'. Available to approved students in their Dashboard.');
   await showCertificates();
   try{const blob=await createCompetitionCertificatePdf(certificate);downloadExamBlob(blob,'Competition_'+safePdfName(certificate.studentName)+'_'+certificate.id+'.pdf')}
   catch(e){text('Certificate saved. PDF download failed: '+e.message,true)}
  }catch(e){text('Could not issue certificate: '+e.message,true)}
  finally{issue.disabled=false}
 };
 student.onchange=showCertificates;
 $('competitionRefresh').onclick=loadStudents;
 date.value=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 return {load:loadStudents};
}
