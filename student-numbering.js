/* Unique official academy roll number generator.
 * Public display: ALIA00001 ... ALIA99999. This is NOT an authentication secret.
 * Firestore transaction ensures two concurrent admins cannot issue the same number.
 */
import{doc,runTransaction,serverTimestamp}from'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
const PATTERN=/^ALIA[0-9]{5}$/;
export function validOfficialStudentId(value){
 return typeof value==='string'&&PATTERN.test(value)&&Number(value.slice(4))>=1;
}
export async function ensureOfficialStudentId(db,studentRef,initialData={}){
 const sequenceRef=doc(db,'academyCounters','studentIds');
 return runTransaction(db,async tx=>{
  const current=await tx.get(studentRef);
  const old=current.exists()?current.data()?.studentCode:null;
  if(validOfficialStudentId(old))return old; // Official ALIA ID never changes after issue.
  // If AIL numbers were issued before the requested ALIA correction, retain
  // the five-digit serial and switch prefix atomically, rather than assigning
  // students new numbers. The original AIL reservation stays retired.
  const legacy=/^AIL[0-9]{5}$/.test(String(old||''))&&Number(String(old).slice(3))>0;
  if(old!=null&&String(old).trim()!==''&&!legacy)throw Error('This student has an unexpected Student ID. Contact admin; it was not overwritten.');
  const seq=await tx.get(sequenceRef);
  const last=Number(seq.exists()?seq.data().lastIssued||0:0);
  if(!Number.isSafeInteger(last)||last<0||last>99999)throw Error('Student ID counter is invalid.');
  if(!legacy&&last>=99999)throw Error('No valid 5-digit ALIA Student IDs are available.');
  const next=legacy?Number(old.slice(3)):last+1;
  const code='ALIA'+String(next).padStart(5,'0');
  const reservation=doc(db,'studentIdRegistry',code);
  const occupied=await tx.get(reservation);
  if(occupied.exists())throw Error('Student ID counter conflicts with an existing ID. No duplicate number was created.');
  // Every write occurs after transaction reads. A reserved number is never reused.
  tx.set(sequenceRef,{lastIssued:Math.max(last,next),updatedAt:serverTimestamp()},{merge:true});
  tx.set(reservation,{studentId:studentRef.id,issuedAt:serverTimestamp()});
  if(current.exists())tx.update(studentRef,{studentCode:code});
  else tx.set(studentRef,{...initialData,studentCode:code});
  return code;
 });
}
