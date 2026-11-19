/* ADMIN ONLY: publish a minimal per-student class/subject/teacher snapshot
 * into the existing private studentAccess grant. This avoids exposing
 * teacherRosters (which contains student names) to students. */
import {collection,doc,getDocs,writeBatch} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {studentTeachingAssignments} from './student-teaching-utils.js';

export async function teachingSnapshotForStudent(db,student){
 const snap=await getDocs(collection(db,'teachers'));
 return studentTeachingAssignments(student,snap.docs.map(d=>d.data()));
}
export async function syncStudentTeachingDirectory(db){
 const [teachers,grants]=await Promise.all([
  getDocs(collection(db,'teachers')),getDocs(collection(db,'studentAccess'))
 ]);
 const directory=teachers.docs.map(d=>d.data());
 const changes=[];
 for(const grant of grants.docs){
  const existing=grant.data();
  const teachingAssignments=studentTeachingAssignments(existing,directory);
  if(JSON.stringify(existing.teachingAssignments)!==JSON.stringify(teachingAssignments))
   changes.push({id:grant.id,teachingAssignments});
 }
 // Firestore batches have a 500-write cap. Limit these to 250 grants.
 for(let offset=0;offset<changes.length;offset+=250){
  const batch=writeBatch(db);
  for(const item of changes.slice(offset,offset+250))
   batch.set(doc(db,'studentAccess',item.id),{
    teachingAssignments:item.teachingAssignments,
    teachingAssignmentsUpdatedAt:new Date().toISOString()
   },{merge:true});
  await batch.commit();
 }
 return changes.length;
}
