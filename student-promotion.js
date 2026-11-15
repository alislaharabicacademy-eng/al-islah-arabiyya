/* Student progression: Muballiga Year 1 → Muballiga Year 2 only.
   No automatic Muallama → Muballiga or Muballiga → Aalima transitions.
   Aalima Year 3 is a separate admin-confirmed enrollment after paid admission. */
import{collection,query,where,getDocs,doc,runTransaction}from'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import{courseYearOf,examYearOf,isYearEndResult,validFinalFor,promotionEligibility,aalimaEntryEligibility}from'./academic-pathway.js';
export{courseYearOf,isYearEndResult,promotionEligibility,aalimaEntryEligibility};
export const COURSE_PROGRESSIONS=Object.freeze({muballigha:Object.freeze({next:'muballigha',nextYear:2,label:'Muballiga · 2nd Year'})});
function matchingFinal(results,student){
 return results.docs.filter(x=>validFinalFor(student,x.data()))
  .sort((a,b)=>String(b.data().examDate||'').localeCompare(String(a.data().examDate||'')));
}
export async function maybePromoteStudent(db,studentId){
 if(!studentId||typeof studentId!=='string'||studentId.includes('/'))throw Error('Invalid student record.');
 const studentRef=doc(db,'students',studentId);
 const snapResults=await getDocs(query(collection(db,'examResults'),where('studentId','==',studentId)));
 return runTransaction(db,async tx=>{
  const studentSnap=await tx.get(studentRef);
  if(!studentSnap.exists())return {promoted:false,reason:'Student record no longer exists.'};
  const student=studentSnap.data();
  if(String(student.course)!=='muballigha'||courseYearOf(student)!==1)
   return {promoted:false,reason:'No automatic promotion: only Muballiga Year 1 progresses to Year 2. Aalima admission must be approved separately.'};
  if(student.state!=='Completed')return {promoted:false,reason:'Admin has not marked Muballiga Year 1 Completed.'};
  const candidate=matchingFinal(snapResults,student).find(x=>!(student.promotionHistory||[]).some(h=>h.finalResultId===x.id));
  if(!candidate)return {promoted:false,reason:'No new published, passed Muballiga 1st Year Final/Annual result.'};
  const finalSnap=await tx.get(candidate.ref);
  if(!finalSnap.exists())return {promoted:false,reason:'Final exam result no longer exists.'};
  const eligibility=promotionEligibility(student,finalSnap.data());
  if(!eligibility.eligible)return {promoted:false,reason:eligibility.reason};
  const accessRef=doc(db,'studentAccess',studentId),accessSnap=await tx.get(accessRef);
  const timestamp=new Date().toISOString();
  const entry={fromCourse:'muballigha',fromYear:1,toCourse:'muballigha',toYear:2,
   completedAcademicYear:String(finalSnap.data().academicYear||''),finalResultId:candidate.id,
   examDate:String(finalSnap.data().examDate||''),promotedAt:timestamp};
  const history=[...(Array.isArray(student.promotionHistory)?student.promotionHistory:[]),entry].slice(-25);
  tx.update(studentRef,{course:'muballigha',courseYear:2,state:'Active',batch:'',
   promotionHistory:history,previousCourse:'muballigha',lastPromotedAt:timestamp,lastPromotionResultId:candidate.id});
  if(accessSnap.exists())tx.update(accessRef,{course:'muballigha',courseYear:2,state:'Active',
   promotionHistory:history,updatedAt:timestamp});
  return {promoted:true,fromCourse:'muballigha',fromYear:1,toCourse:'muballigha',toYear:2,
   label:eligibility.label,studentCode:student.studentCode||'',history};
 });
}
export async function enrollAalimaYear3(db,studentId,payment){
 if(!studentId||typeof studentId!=='string'||studentId.includes('/'))throw Error('Invalid student record.');
 const amount=Number(payment?.amount),date=String(payment?.paidOn||'').trim();
 const reference=String(payment?.reference||'').trim(),confirmed=payment?.verified===true;
 if(!confirmed)throw Error('Admin must confirm that the admission fee has actually been received.');
 if(!Number.isFinite(amount)||amount<=0||amount>10000000)throw Error('Enter the admission-fee amount actually received.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00+05:30')))
  throw Error('Enter a valid admission-fee payment date.');
 const todayParts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const part=key=>todayParts.find(x=>x.type===key)?.value||'';
 const today=part('year')+'-'+part('month')+'-'+part('day');
 if(date>today)throw Error('Future payment dates are not accepted.');
 if(reference.length<3||reference.length>120)throw Error('A payment reference or receipt number is required.');
 const studentRef=doc(db,'students',studentId);
 const results=await getDocs(query(collection(db,'examResults'),where('studentId','==',studentId)));
 return runTransaction(db,async tx=>{
  const snap=await tx.get(studentRef);
  if(!snap.exists())throw Error('Student record was not found.');
  const student=snap.data();
  if(student.course!=='muballigha'||courseYearOf(student)!==2||student.state!=='Completed')
   throw Error('Only a completed Muballiga 2nd Year student can enroll for Aalima.');
  const final=matchingFinal(results,student)[0];
  if(!final)throw Error('Verified published and passed Muballiga Year 2 Final/Annual result is required.');
  const finalSnap=await tx.get(final.ref),check=aalimaEntryEligibility(student,finalSnap.exists()?finalSnap.data():null);
  if(!check.eligible)throw Error(check.reason);
  const accessRef=doc(db,'studentAccess',studentId),accessSnap=await tx.get(accessRef);
  const recordedAt=new Date().toISOString();
  const paymentRecord={amount,paidOn:date,reference,verifiedByAdmin:true,recordedAt,
   completedYear2ResultId:final.id};
  const entry={fromCourse:'muballigha',fromYear:2,toCourse:'alima',toYear:3,
   completedAcademicYear:String(finalSnap.data().academicYear||''),
   finalResultId:final.id,examDate:String(finalSnap.data().examDate||''),
   promotedAt:recordedAt,adminApproved:true,admissionFeeReference:reference};
  const history=[...(Array.isArray(student.promotionHistory)?student.promotionHistory:[]),entry].slice(-25);
  tx.update(studentRef,{course:'alima',courseYear:3,state:'Active',batch:'',
   promotionHistory:history,aalimaAdmissionFee:paymentRecord,
   previousCourse:'muballigha',lastPromotedAt:recordedAt,lastPromotionResultId:final.id});
  if(accessSnap.exists())tx.update(accessRef,{course:'alima',courseYear:3,state:'Active',
   promotionHistory:history,updatedAt:recordedAt});
  return {enrolled:true,studentCode:student.studentCode||'',label:'Aalima · 3rd Year',
    admissionFeeAmount:amount,reference};
 });
}
