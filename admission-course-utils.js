/* One canonical course list shared by Admission Form and Admin.
 * No implicit re-addition of static courses after an admin removes them.
 */
export function displayAdmissionCourseName(value){
 return String(value??'')
  .replace(/[\u2018\u2019]/g,"'")
  .replace(/\s*[\u2013\u2014-]\s*\d+\s*years?\s*$/i,'')
  .replace(/\s+/g,' ').trim().slice(0,120);
}
export function admissionCourseKey(value){
 return displayAdmissionCourseName(value).toLocaleLowerCase('en')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
}
export function uniqueAdmissionCourses(input,{otherEnquiry=true}={}){
 const values=Array.isArray(input)?input:[],found=new Set(),out=[];
 for(const raw of values){
  const name=displayAdmissionCourseName(raw),key=admissionCourseKey(name);
  if(!name||!key||key==='otherenquiry'||key==='otherenquiries')continue;
  // Old placeholder was a hybrid enquiry, not a standalone Academy course.
  if(key==='childrensqurantajweedenquiry')continue;
  if(found.has(key))continue;
  found.add(key);out.push(name);
 }
 if(otherEnquiry)out.push('Other enquiry');
 return out;
}
export function removeAdmissionCourse(input,name){
 const key=admissionCourseKey(name);
 return uniqueAdmissionCourses(input,{otherEnquiry:false}).filter(s=>admissionCourseKey(s)!==key);
}

/* Public applications never include Year 2 or the optional Aalima Year 3.
 * Existing student continuations are handled by the private Admin panel. */
export function isAalimaContinuation(name){
 const key=admissionCourseKey(name);
 return /^(?:alima|aalima|alimah|aalimah)(?:3rdyear|year3|thirdyear)?$/.test(key);
}
export function publicAdmissionCourses(input){
 return uniqueAdmissionCourses(input).filter(name=>!isAalimaContinuation(name));
}
export function publicAdmissionLabel(name){
 const key=admissionCourseKey(name);
 return key==='muballigha'||key==='muballiga'?
  name+' — 1st Year (New Admissions Only)':name;
}
