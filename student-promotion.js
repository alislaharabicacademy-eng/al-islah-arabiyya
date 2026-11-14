/* Year-by-year promotion for Academy students.
   Muallama (Year 1) → Muballigha (Year 2) → Alima (Year 3).
   Promotion requires BOTH Admin-confirmed completion and a published,
   passed Final/Annual examination for the student's current course.
   This module never advances students based on calendar time alone. */
import {collection,query,where,getDocs,doc,runTransaction} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

export const COURSE_PROGRESSIONS=Object.freeze({
 muallama:Object.freeze({next:'muballigha',label:'Muballigha · Year 2'}),
 muballigha:Object.freeze({next:'alima',label:'Alima · Year 3'})
});
export function isYearEndResult(result){
 const title=String(result?.examTitle||'');
 return result?.finalForPromotion===true
   || (/\b(final|annual|year[ -]?end|yearly)\b/i.test(title));
}
export function promotionEligibility(student,result){
 const next=COURSE_PROGRESSIONS[String(student?.course||'').trim().toLowerCase()];
 if(!next)return {eligible:false,reason:'Course is not configured for automatic promotion.'};
 if(student?.state!=='Completed')return {eligible:false,reason:'Admin has not marked the current year Completed.'};
 if(!result?.published||result?.passed!==true)return {eligible:false,reason:'No published, passed examination.'};
 if(!isYearEndResult(result))return {eligible:false,reason:'Only Final/Annual exams are promotion eligible.'};
 if(String(result.courseId||'').trim().toLowerCase()!==String(student.course||'').trim().toLowerCase())return {eligible:false,reason:'Exam course does not match the current student course.'};
 return {eligible:true,nextCourse:next.next,label:next.label};
}
export async function maybePromoteStudent(db,studentId){
 if(!studentId||typeof studentId!=='string'||studentId.includes('/'))throw Error('Invalid student record.');
 const ref=doc(db,'students',studentId);
 const results=await getDocs(query(collection(db,'examResults'),where('studentId','==',studentId)));
 // Keep every possible Final/Annual result, but avoid trusting stale local data:
 // the selected result and student status are re-read inside a transaction.
 const candidates=results.docs.filter(x=>x.data().published===true&&x.data().passed===true&&isYearEndResult(x.data()))
  .sort((a,b)=>String(b.data().examDate||'').localeCompare(String(a.data().examDate||'')));
 if(!candidates.length)return {promoted:false,reason:'No published, passed Final/Annual examination yet.'};
 return runTransaction(db,async tx=>{
  const studentSnap=await tx.get(ref);
  if(!studentSnap.exists())return {promoted:false,reason:'Student record no longer exists.'};
  const student=studentSnap.data();
  if(!COURSE_PROGRESSIONS[student.course])return {promoted:false,reason:'No further automatic year for this course.'};
  if(student.state!=='Completed')return {promoted:false,reason:'Current course has not been marked Completed by Admin.'};
  const candidate=candidates.find(x=>String(x.data().courseId||'')===student.course);
  if(!candidate)return {promoted:false,reason:'No qualifying Final/Annual result for the current course.'};
  const resultSnap=await tx.get(candidate.ref);
  if(!resultSnap.exists())return {promoted:false,reason:'Final result is unavailable.'};
  const finalResult=resultSnap.data(),eligibility=promotionEligibility(student,finalResult);
  if(!eligibility.eligible)return {promoted:false,reason:eligibility.reason};
  const accessRef=doc(db,'studentAccess',studentId);
  const accessSnap=await tx.get(accessRef);
  const history=Array.isArray(student.promotionHistory)?student.promotionHistory:[];
  if(history.some(h=>h.finalResultId===candidate.id))return {promoted:false,reason:'This examination has already been used for promotion.'};
  const entry={
   fromCourse:student.course,toCourse:eligibility.nextCourse,
   completedAcademicYear:String(finalResult.academicYear||''),
   finalResultId:candidate.id,examDate:String(finalResult.examDate||''),
   promotedAt:new Date().toISOString()
  };
  const nextHistory=[...history,entry].slice(-25);
  tx.update(ref,{
   course:eligibility.nextCourse,state:'Active',batch:'',
   promotionHistory:nextHistory,previousCourse:student.course,
   lastPromotedAt:entry.promotedAt,lastPromotionResultId:candidate.id
  });
  if(accessSnap.exists())tx.update(accessRef,{
   course:eligibility.nextCourse,state:'Active',batch:'',
   promotionHistory:nextHistory,updatedAt:entry.promotedAt
  });
  return {promoted:true,fromCourse:student.course,toCourse:eligibility.nextCourse,label:eligibility.label,studentCode:student.studentCode||'',history:nextHistory};
 });
}
