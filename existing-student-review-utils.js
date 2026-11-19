/* Shared pure helpers for private existing-student registration review.
 * A matching name and DOB is a warning, not permission to create or
 * automatically merge an official student record.
 */
const normaliseName=value=>String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('en');
export function matchingStudentForRequest(request,studentRecords,requestId=''){
 const records=(studentRecords||[]).map(row=>({
  id:String(row.id||''),data:typeof row.data==='function'?row.data():(row.data||{})
 }));
 const exactLink=records.filter(row=>requestId && row.data.existingStudentRequestId===requestId);
 if(exactLink.length===1)return {kind:'linked',record:exactLink[0]};
 const name=normaliseName(request?.name),dob=String(request?.dob||'').trim();
 if(!name||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dob))return null;
 const sameIdentity=records.filter(row=>normaliseName(row.data.name)===name&&
  String(row.data.dob||'').trim()===dob);
 if(sameIdentity.length===1)return {kind:'possible-duplicate',record:sameIdentity[0]};
 if(sameIdentity.length>1)return {kind:'ambiguous',matches:sameIdentity.length};
 return null;
}
export function requestReviewBucket(status,match=null){
 if(status==='Approved')return 'approved';
 if(status==='Rejected'||status==='Duplicate')return 'archived';
 if(status==='Pending Review'||!status){
  if(match?.kind==='possible-duplicate'||match?.kind==='ambiguous')return 'duplicate-check';
  return 'pending';
 }
 return 'pending';
}
export function countByCourse(rows){
 const counts=new Map();
 for(const row of rows||[]){
  const course=String(row.data?.course||row.course||'unassigned');
  counts.set(course,(counts.get(course)||0)+1);
 }
 return counts;
}
