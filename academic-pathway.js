/* Academy policy: public intake is Muballiga Year 1.
   Year 1 → Year 2 is the only automatic step.
   Aalima Year 3 is opt-in and requires a separately verified admission fee. */
export function courseYearOf(student){
 const course=String(student?.course||'').toLowerCase();
 const value=Number(student?.courseYear);
 if(course==='muballigha')return value===2?2:1; // legacy records default to Year 1 until reconciled
 if(course==='alima')return 3;
 return 0;
}
export function examYearOf(result){
 const value=Number(result?.courseYear);
 return value===1||value===2||value===3?value:1; // legacy untagged results never qualify as Year 2 finals
}
export function isYearEndResult(result){
 return result?.finalForPromotion===true||/\b(final|annual|year[ -]?end|yearly)\b/i.test(String(result?.examTitle||''));
}
export function validFinalFor(student,result){
 return Boolean(student&&result&&result.published===true&&result.passed===true
  &&isYearEndResult(result)&&String(result.courseId||'')===String(student.course||'')
  &&examYearOf(result)===courseYearOf(student));
}
export function promotionEligibility(student,result){
 if(String(student?.course||'')!=='muballigha')return {eligible:false,reason:'This programme does not have an automatic year change.'};
 if(Number(student?.courseYear)!==1)return {eligible:false,reason:'Muballiga year is not explicitly verified as Year 1, or the student has completed Year 2. Only verified Year 1 can auto-promote; Aalima needs separate admission.'};
 if(student?.state!=='Completed')return {eligible:false,reason:'Admin has not marked Muballiga Year 1 Completed.'};
 if(!validFinalFor(student,result))return {eligible:false,reason:'Year 1 requires a published, passed Final/Annual exam matching the student and year.'};
 return {eligible:true,nextCourse:'muballigha',nextYear:2,label:'Muballiga · 2nd Year'};
}
export function aalimaEntryEligibility(student,result){
 if(String(student?.course||'')!=='muballigha'||courseYearOf(student)!==2)
  return {eligible:false,reason:'Only Muballiga 2nd Year students can apply to continue into Aalima.'};
 if(student?.state!=='Completed')
  return {eligible:false,reason:'Admin must first mark Muballiga 2nd Year Completed.'};
 if(!validFinalFor(student,result))
  return {eligible:false,reason:'A published, passed Muballiga Year 2 Final/Annual result is required.'};
 return {eligible:true};
}
