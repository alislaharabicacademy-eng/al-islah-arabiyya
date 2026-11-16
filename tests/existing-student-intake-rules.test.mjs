import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {collection,doc,getDoc,getDocs,setDoc,updateDoc,deleteDoc,serverTimestamp,Timestamp} from 'firebase/firestore';

const env=await initializeTestEnvironment({
 projectId:'demo-existing-students-self-registration',
 firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}
});
const validKey='a'.repeat(64),expiredKey='b'.repeat(64),requestId='c'.repeat(32);
const future=()=>Timestamp.fromDate(new Date(Date.now()+10*86400000));
const past=()=>Timestamp.fromDate(new Date(Date.now()-10*86400000));
const base=()=>({
 name:'Example Student',guardian:'Example Guardian',dob:'2010-05-21',
 phone:'9876543210',email:'',joiningDate:'2024-05-21',course:'muballigha',
 courseYear:2,batch:'',address:'Example Street, Panruti',
 notes:'Already studying in second year',photoData:'',
 linkToken:validKey,source:'existing-academy-student-form',
 status:'Pending Review',submittedAt:serverTimestamp()
});
test('students can self-submit only to a valid opened link, without viewing anyone else',async()=>{
 try{
  await env.clearFirestore();
  const owner=env.authenticatedContext('owner',{
   email:'alislaharabicacademy@gmail.com',email_verified:true
  }).firestore();
  const master=env.authenticatedContext('master',{
   email:'secondary@example.com',email_verified:true
  }).firestore();
  const outsider=env.authenticatedContext('stranger',{
   email:'stranger@example.com',email_verified:true
  }).firestore();
  const visitor=env.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(doc(owner,'adminAccess','secondary@example.com'),{
   enabled:true,grantedBy:'owner',updatedAt:serverTimestamp()
  }));
  await assertSucceeds(setDoc(doc(owner,'existingStudentIntakeLinks',validKey),{
   enabled:true,expiresAt:future(),createdBy:'owner',createdAt:serverTimestamp()
  }));
  await assertSucceeds(setDoc(doc(master,'existingStudentIntakeLinks',expiredKey),{
   enabled:true,expiresAt:past(),createdBy:'master',createdAt:serverTimestamp()
  }));
  await assertSucceeds(getDoc(doc(visitor,'existingStudentIntakeLinks',validKey)));
  await assertFails(getDoc(doc(visitor,'existingStudentIntakeLinks',expiredKey)));
  await assertFails(getDocs(collection(visitor,'existingStudentIntakeLinks')));
  await assertFails(setDoc(doc(visitor,'existingStudentIntakeLinks','d'.repeat(64)),{enabled:true}));
  await assertFails(getDocs(collection(outsider,'existingStudentRequests')));
  await assertFails(getDoc(doc(visitor,'students','any-student-id')));
  await assertFails(setDoc(doc(visitor,'students','any-student-id'),{name:'Fake Student'}));

  await assertSucceeds(setDoc(doc(visitor,'existingStudentRequests',requestId),base()));
  await assertFails(getDoc(doc(visitor,'existingStudentRequests',requestId)));
  await assertFails(getDocs(collection(visitor,'existingStudentRequests')));
  await assertFails(updateDoc(doc(visitor,'existingStudentRequests',requestId),{status:'Approved'}));
  await assertFails(deleteDoc(doc(visitor,'existingStudentRequests',requestId)));
  await assertSucceeds(getDoc(doc(owner,'existingStudentRequests',requestId)));
  await assertSucceeds(getDoc(doc(master,'existingStudentRequests',requestId)));
  await assertSucceeds(updateDoc(doc(master,'existingStudentRequests',requestId),{
   status:'Approved',studentCode:'ALIA00001',reviewedByUid:'master',
   reviewedAt:serverTimestamp()
  }));
  await assertFails(getDoc(doc(visitor,'existingStudentRequests',requestId)));

  await assertFails(setDoc(doc(visitor,'existingStudentRequests','e'.repeat(32)),{
   ...base(),status:'Approved'
  }));
  await assertFails(setDoc(doc(visitor,'existingStudentRequests','f'.repeat(32)),{
   ...base(),courseYear:1,course:'alima'
  }));
  await assertFails(setDoc(doc(visitor,'existingStudentRequests','1'.repeat(32)),{
   ...base(),source:'new-admission'
  }));
  await assertFails(setDoc(doc(visitor,'existingStudentRequests','2'.repeat(32)),{
   ...base(),photoData:'data:image/svg+xml;base64,AAA'
  }));
  await assertFails(setDoc(doc(visitor,'existingStudentRequests','3'.repeat(32)),{
   ...base(),linkToken:'f'.repeat(64)
  }));
  await assertFails(setDoc(doc(visitor,'existingStudentRequests','4'.repeat(32)),{
   ...base(),linkToken:expiredKey
  }));
  await assertFails(setDoc(doc(visitor,'existingStudentRequests','5'.repeat(32)),{
   ...base(),admin:true
  }));

  // Closing intake denies new submissions immediately, without deleting
  // private already-submitted forms or overriding approved student records.
  await assertSucceeds(updateDoc(doc(owner,'existingStudentIntakeLinks',validKey),{
   enabled:false,closedAt:serverTimestamp()
  }));
  await assertFails(getDoc(doc(visitor,'existingStudentIntakeLinks',validKey)));
  await assertFails(setDoc(doc(visitor,'existingStudentRequests','6'.repeat(32)),base()));
  await assertSucceeds(getDoc(doc(owner,'existingStudentRequests',requestId)));
 }finally{await env.cleanup()}
});
