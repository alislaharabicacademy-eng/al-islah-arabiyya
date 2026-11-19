/* Pure exam-session policy helpers; no Firestore/browser dependency. */
export const ELIGIBLE_STATES=new Set(['active','completed']);
export const cohortKey=(course,year,batch)=>JSON.stringify([String(course||''),Number(year)||0,String(batch||'')]);
export const academicStage=student=>student?.course==='muballigha'?(Number(student.courseYear)===2?2:1):student?.course==='alima'?3:0;
export function makeExamCohorts(students,courseNames=new Map()){
 const groups=new Map();
 for(const st of students||[]){
  if(!st?.id||!st.course||!ELIGIBLE_STATES.has(String(st.state||'Active').toLowerCase()))continue;
  const year=academicStage(st),batch=String(st.batch||'');
  const key=cohortKey(st.course,year,batch);
  if(!groups.has(key))groups.set(key,{
   key,courseId:st.course,courseName:courseNames.get(st.course)||st.course,
   courseYear:year,batch,studentIds:[],subjects:[]
  });
  const g=groups.get(key);
  if(!g.studentIds.includes(st.id))g.studentIds.push(st.id);
 }
 return [...groups.values()].map(g=>({...g,studentIds:g.studentIds.sort()}))
  .sort((a,b)=>a.courseName.localeCompare(b.courseName)||a.courseYear-b.courseYear||a.batch.localeCompare(b.batch));
}
export function parseExamSubjects(text){
 const lines=String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(!lines.length||lines.length>30)throw Error('Each class must have 1 to 30 exam subjects.');
 const used=new Set();
 return lines.map((line,i)=>{
  const fields=line.split('|').map(s=>s.trim());
  if(fields.length>2)throw Error('Subject row '+(i+1)+': use Subject | Maximum Marks.');
  const name=fields[0],max=fields.length===1?100:Number(fields[1]);
  if(!name||name.length>100)throw Error('Check subject name on row '+(i+1)+'.');
  if(!Number.isFinite(max)||max<=0||max>100000)throw Error('Invalid maximum marks for '+name+'.');
  const id=name.toLocaleLowerCase();
  if(used.has(id))throw Error('Repeated subject: '+name);
  used.add(id);
  return {name,max};
 });
}
export const displayExamSubjects=subjects=>(subjects||[]).map(s=>s.name+' | '+s.max).join('\n');
export function gradeExamSubjects(subjects,marks,passPercent=40){
 if(!Array.isArray(subjects)||!subjects.length)throw Error('Course has no exam subjects.');
 if(!Number.isFinite(Number(passPercent))||Number(passPercent)<0||Number(passPercent)>100)throw Error('Invalid pass percentage.');
 const set=subjects.map((s,i)=>{
  const raw=marks?.[i];
  if(raw===''||raw===undefined||raw===null)throw Error('Missing mark: '+s.name);
  const score=Number(raw),max=Number(s.max);
  if(!Number.isFinite(score)||!Number.isFinite(max)||max<=0||score<0||score>max)throw Error('Invalid mark for '+s.name);
  return {name:s.name,score,max};
 });
 const total=set.reduce((a,s)=>a+s.score,0),maxTotal=set.reduce((a,s)=>a+s.max,0);
 const percent=Number((total/maxTotal*100).toFixed(2));
 return {subjects:set,total:Number(total.toFixed(2)),maxTotal:Number(maxTotal.toFixed(2)),percent,
 grade:percent>=90?'A+':percent>=80?'A':percent>=70?'B':percent>=60?'C':percent>=50?'D':'E',
 passed:set.every(s=>s.score/s.max*100+1e-8>=Number(passPercent))};
}
export function readyToPublish(session,records){
 if(!session||!Array.isArray(session.cohorts)||!session.cohorts.length)return {ready:false,problems:['No exam classes configured.']};
 const byPair=new Map(),problems=[],arr=Array.isArray(records)?records:[];
 for(const r of arr){
  if(r.sessionId!==session.id)continue;
  const key=r.cohortKey+'|'+r.studentId;
  if(byPair.has(key))problems.push('Duplicate result: '+key);
  byPair.set(key,r);
 }
 const required=new Set();
 for(const cohort of session.cohorts){
  if(!cohort.studentIds?.length){problems.push('No students in '+cohort.courseName);continue}
  for(const id of cohort.studentIds){
   const key=cohort.key+'|'+id;
   required.add(key);
   const record=byPair.get(key);
   if(!record){problems.push('Missing saved marks: '+cohort.courseName+' / '+id);continue}
   if(record.published!==true&&record.published!==false)problems.push('Invalid result state: '+id);
   if(!Array.isArray(record.subjects)||!record.subjects.length||record.subjects.some(s=>!Number.isFinite(s.score)||!Number.isFinite(s.max)||s.max<=0||s.score<0||s.score>s.max))
    problems.push('Invalid marks: '+id);
   if(record.examTitle!==session.examTitle||record.examDate!==session.examDate||record.academicYear!==session.academicYear)
    problems.push('Exam details mismatch: '+id);
   if(record.courseId!==cohort.courseId||Number(record.courseYear||0)!==cohort.courseYear)
    problems.push('Class/year mismatch: '+id);
   if(cohort.subjects?.length&&JSON.stringify(record.subjects.map(s=>({name:s.name,max:s.max})))!==JSON.stringify(cohort.subjects))
    problems.push('Different subject schemes: '+cohort.courseName+' / '+id);
  }
 }
 for(const key of byPair.keys())if(!required.has(key))problems.push('Unexpected result in examination: '+key);
 return {ready:problems.length===0,problems,completed:required.size-problems.filter(x=>x.startsWith('Missing saved marks')).length,total:required.size};
}
