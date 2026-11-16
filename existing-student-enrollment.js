/* Existing Academy learners already admitted before this website was built.
 * This is an administrative register backfill, NOT a new application, annual
 * promotion, or a new declaration of an admission-fee payment.
 * Any historic fee ledger must be entered separately using real records.
 */
const dateOnly=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))
  && !Number.isNaN(Date.parse(value+'T00:00:00Z'))
  && new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const canonical=value=>String(value||'').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');

export function existingAcademyStudentDetails({
 course,year,enrollmentDate,verified=false,
 aalimaVerified=false,aalimaFeeReference='',today,actorUid='',actorEmail=''
}={}){
 if(!verified)throw Error('Confirm the old Academy register was checked before importing this student.');
 if(!dateOnly(today))throw Error('Current date is unavailable. Reopen the page and try again.');
 if(!dateOnly(enrollmentDate)||enrollmentDate>today)
  throw Error('Enter the student’s actual earlier admission date. Future dates are not accepted.');
 if(!course)throw Error('Choose the existing student’s current course.');
 let courseYear=0;
 if(course==='muballigha'){
  courseYear=Number(year);
  if(![1,2].includes(courseYear))
   throw Error('For an existing Muballiga student, verify whether they are in 1st or 2nd Year.');
 }else if(course==='alima'){
  if(!aalimaVerified)
   throw Error('Verify completed Muballiga Year 2 and the previously paid Aalima admission fee from Academy records.');
  if(String(aalimaFeeReference||'').trim().length<3)
   throw Error('Record the original Aalima admission fee receipt/register reference (3 or more characters).');
  courseYear=3;
 }
 const result={
  courseYear,entrySource:'existing-academy-register',enrollmentDate,
  legacyRecordVerified:true,legacyRecordedAt:new Date().toISOString(),
  legacyVerifiedByUid:String(actorUid||''),
  legacyVerifiedByEmail:String(actorEmail||'')
 };
 if(course==='alima'){
  // Historical confirmation: not a fresh payment or forged receipt.
  result.legacyAalimaEligibility={
   priorMuballigaYear2CompletedVerified:true,
   priorAdmissionFeeVerified:true,
   originalFeeRegisterReference:String(aalimaFeeReference).trim().slice(0,120),
   recordedAt:result.legacyRecordedAt,
   verifiedByUid:result.legacyVerifiedByUid
  };
 }
 return result;
}

/** Reject the same person being added a second time (admin review remains
 * necessary for similarly-named students with incomplete legacy records). */
export function findDuplicateAcademyStudent(records,person){
 const name=canonical(person?.name),dob=String(person?.dob||'');
 const guardian=canonical(person?.guardian);
 if(!name||!dateOnly(dob))return null;
 return (records||[]).find(item=>{
  const other=item?.data||item;
  const sameName=canonical(other?.name)===name;
  const sameDOB=String(other?.dob||'')===dob;
  if(!sameName||!sameDOB)return false;
  // Same name + DOB should be reviewed even if guardian spelling changed.
  return true;
 })||null;
}
