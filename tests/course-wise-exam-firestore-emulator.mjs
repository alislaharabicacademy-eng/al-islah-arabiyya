import{readFileSync}from'node:fs';
import{initializeTestEnvironment,assertFails,assertSucceeds}from'@firebase/rules-unit-testing';
import{doc,getDoc,getDocs,setDoc,collection}from'firebase/firestore';

const projectId='demo-course-exams-'+process.pid;
const env=await initializeTestEnvironment({
 projectId,firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}
});
const admin=env.authenticatedContext('admin-uid',{email:'alislaharabicacademy@gmail.com',email_verified:true});
const guardian=env.authenticatedContext('guardian-uid',{email:'guardian@example.com',email_verified:true});
const outsider=env.unauthenticatedContext();
const unverified=env.authenticatedContext('unverified-admin',{email:'alislaharabicacademy@gmail.com',email_verified:false});
const adminDb=admin.firestore(),guardianDb=guardian.firestore(),publicDb=outsider.firestore(),unverifiedDb=unverified.firestore();
const sessionId='EXAMSESSION-abcdef0123456789abcdef01';
const resultId='RESULT-abcdef0123456789abcdef01';
const legacyId='RESULT-aaaaaaaaaaaaaaaaaaaaaaaa';
const sessionPath=['examSessions',sessionId],resultPath=['examResults',resultId];
const noticePath=['examAnnouncements','current'];
const log=msg=>process.stdout.write('PASS '+msg+'\n');
try{
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore();
  await setDoc(doc(db,...sessionPath),{status:'draft',examTitle:'Annual Examination'});
  await setDoc(doc(db,...resultPath),{published:false,sessionId,studentId:'student1',studentName:'Test Student',total:77,maxTotal:100});
  await setDoc(doc(db,'examResults',legacyId),{published:true,studentId:'other',studentName:'Legacy Student'});
  await setDoc(doc(db,'studentAccess','student1'),{email:'guardian@example.com',enabled:true,studentId:'student1',resultIds:[resultId]});
 });
 await assertSucceeds(getDoc(doc(adminDb,...sessionPath)));
 await assertFails(getDoc(doc(publicDb,...sessionPath)));
 await assertFails(getDoc(doc(guardianDb,...sessionPath)));
 await assertFails(setDoc(doc(unverifiedDb,'examSessions','test'),{status:'published'}));
 log('Only verified academy admin can manage private exam sessions.');
 await assertFails(getDoc(doc(publicDb,...resultPath)));
 await assertFails(getDoc(doc(guardianDb,...resultPath)));
 await assertSucceeds(getDoc(doc(publicDb,'examResults',legacyId)));
 await assertFails(getDocs(collection(publicDb,'examResults')));
 log('Saved drafts are private, legacy published results continue to work, public list blocked.');
 await assertSucceeds(setDoc(doc(adminDb,...resultPath),{published:true,sessionId,studentId:'student1',studentName:'Test Student'},{merge:true}));
 await assertFails(getDoc(doc(publicDb,...resultPath)));
 await assertFails(getDoc(doc(guardianDb,...resultPath)));
 await assertSucceeds(setDoc(doc(adminDb,...sessionPath),{status:'publishing'},{merge:true}));
 await assertFails(getDoc(doc(publicDb,...resultPath)));
 await assertFails(getDoc(doc(guardianDb,...resultPath)));
 log('Even published:true staged results are PRIVATE during draft/publishing states.');
 await assertSucceeds(setDoc(doc(adminDb,...sessionPath),{status:'published'},{merge:true}));
 await assertSucceeds(getDoc(doc(publicDb,...resultPath)));
 await assertSucceeds(getDoc(doc(guardianDb,...resultPath)));
 await assertSucceeds(getDoc(doc(guardianDb,'studentAccess','student1')));
 log('Results become readable after final session published and approved grant remains intact.');
 await assertFails(setDoc(doc(publicDb,...noticePath),{visible:true}));
 await assertSucceeds(setDoc(doc(adminDb,...noticePath),{visible:true,examTitle:'Annual Examination',studentCount:1}));
 await assertSucceeds(getDoc(doc(publicDb,...noticePath)));
 await assertFails(getDoc(doc(publicDb,'examAnnouncements','private')));
 log('Only admin writes public result notice; visitors can GET current notice only.');
 process.stdout.write('ALL FIRESTORE EXAM SECURITY TESTS PASS\n');
}finally{await env.cleanup();}
