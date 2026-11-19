/* Student-safe teaching allocations. This pure projection deliberately never
 * includes a teacher's email, phone, salary, private profile or class roster.
 * Read only from the official Admin-approved Teacher Directory. */
function courseKey(value){
 const key=String(value||'').trim().toLowerCase().replace(/[–—_]/g,'-').replace(/\s+/g,' ');
 if(key.includes('muballigh')||key.includes('mubaligh'))return 'muballigha';
 if(key.includes('muallam')||key.includes('mualim')||key.includes('muallim'))return 'muallama';
 if(key==='alima'||key==='aalima'||key.startsWith('alima '))return 'alima';
 if(key.includes('hifz')||key.includes('hifdh'))return 'boys-hifz';
 if(['maktab','maktab students','makthab students'].includes(key))return 'maktab';
 if(["children's qur'an maktab",'childrens quran maktab','childrens-quran-maktab'].includes(key))return 'childrens-quran-maktab';
 return key.replace(/\s+/g,'-');
}
function batchKey(value){return String(value||'').trim().toLocaleLowerCase('en-IN')}
const text=v=>String(v||'').trim();
export function studentTeachingAssignments(student,teachers){
 const studentCourse=courseKey(student?.course),studentBatch=batchKey(student?.batch);
 if(!studentCourse||!Array.isArray(teachers))return [];
 const assignments=[],seen=new Set();
 for(const teacher of teachers){
  if(!teacher||teacher.recordStatus==='archived')continue;
  const teacherName=text(teacher.name);
  if(!teacherName)continue;
  for(const entry of Array.isArray(teacher.assignments)?teacher.assignments:[]){
   if(courseKey(entry?.course)!==studentCourse)continue;
   const subject=text(entry?.subject);
   if(!subject)continue;
   const assignedBatch=batchKey(entry.batch);
   // A batch-specific teacher must NEVER appear for a different batch.
   // All Maktab teaching allocations must have an explicit batch.
   if(assignedBatch&&assignedBatch!==studentBatch)continue;
   if(studentCourse==='maktab'&&!assignedBatch)continue;
   const timing=text(entry.timing);
   const key=[teacherName.toLowerCase(),subject.toLowerCase(),timing.toLowerCase()].join('|');
   if(seen.has(key))continue;
   seen.add(key);assignments.push({subject,teacherName,timing});
  }
 }
 return assignments.sort((a,b)=>a.subject.localeCompare(b.subject,'en')||
  a.teacherName.localeCompare(b.teacherName,'en')||a.timing.localeCompare(b.timing,'en'));
}
