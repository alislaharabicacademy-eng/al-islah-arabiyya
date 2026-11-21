import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,getDocs,setDoc,addDoc,updateDoc,deleteDoc,collection,serverTimestamp} from 'firebase/firestore';

const env=await initializeTestEnvironment({
 projectId:'demo-admin-student-preview',
 firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}
});
test('student preview audit requires real verified admin and remains immutable',async()=>{
 try{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx=>{
   const db=ctx.firestore();
   await setDoc(doc(db,'students','student-a'),{name:'Example Student',studentCode:'ALIA00123'});
   await setDoc(doc(db,'studentAccess','student-a'),{
    studentId:'student-a',email:'guardian@example.com',enabled:true,studentCode:'ALIA00123'
   });
   await setDoc(doc(db,'adminAccess','secondary@example.com'),{
    enabled:true,grantedBy:'academy-owner',updatedAt:serverTimestamp()
   });
  });
  const owner=env.authenticatedContext('academy-owner',{
   email:'alislaharabicacademy@gmail.com',email_verified:true
  }).firestore();
  const admin=env.authenticatedContext('normal-granted-uid',{
   email:'secondary@example.com',email_verified:true
  }).firestore();
  const master=env.authenticatedContext('master-uid',{
   email:'syedatheil40@gmail.com',email_verified:true
  }).firestore();
  const guardian=env.authenticatedContext('guardian-uid',{
   email:'guardian@example.com',email_verified:true
  }).firestore();
  const stranger=env.authenticatedContext('stranger-uid',{
   email:'stranger@example.com',email_verified:true
  }).firestore();
  const unverified=env.authenticatedContext('master-unverified',{
   email:'secondary@example.com',email_verified:false
  }).firestore();

  // Both verified Masters and ordinary granted admins can access student
  // records. Only Master accounts can inspect audit logs.
  await assertSucceeds(getDoc(doc(owner,'students','student-a')));
  await assertSucceeds(getDoc(doc(admin,'students','student-a')));
  await assertSucceeds(getDoc(doc(master,'students','student-a')));
  await assertSucceeds(getDocs(collection(owner,'students')));
  await assertSucceeds(getDocs(collection(admin,'students')));
  await assertSucceeds(getDocs(collection(master,'students')));
  await assertFails(getDoc(doc(guardian,'students','student-a')));
  await assertFails(getDocs(collection(stranger,'students')));
  await assertFails(getDoc(doc(unverified,'students','student-a')));
  await assertSucceeds(getDoc(doc(guardian,'studentAccess','student-a')));

  const event={
   studentId:'student-a',actorUid:'normal-granted-uid',actorEmail:'secondary@example.com',
   createdAt:serverTimestamp(),purpose:'student_dashboard_preview'
  };
  const audit=await assertSucceeds(addDoc(collection(admin,'adminStudentPreviews'),event));
  assert.equal((await assertSucceeds(getDoc(doc(master,'adminStudentPreviews',audit.id)))).data().actorUid,'normal-granted-uid');
  await assertSucceeds(getDoc(doc(owner,'adminStudentPreviews',audit.id)));
  await assertFails(getDoc(doc(admin,'adminStudentPreviews',audit.id)));
  await assertSucceeds(getDocs(collection(master,'adminStudentPreviews')));
  await assertSucceeds(getDocs(collection(owner,'adminStudentPreviews')));
  await assertFails(getDocs(collection(admin,'adminStudentPreviews')));
  await assertFails(updateDoc(audit,{purpose:'changed'}));
  await assertFails(deleteDoc(audit));
  await assertFails(addDoc(collection(admin,'adminStudentPreviews'),{
   ...event,actorEmail:'alislaharabicacademy@gmail.com'
  }));
  await assertFails(addDoc(collection(admin,'adminStudentPreviews'),{
   ...event,actorUid:'academy-owner'
  }));
  await assertFails(addDoc(collection(admin,'adminStudentPreviews'),{
   ...event,studentId:'missing-student'
  }));
  await assertFails(addDoc(collection(guardian,'adminStudentPreviews'),event));
  await assertFails(addDoc(collection(stranger,'adminStudentPreviews'),event));
  await assertFails(addDoc(collection(unverified,'adminStudentPreviews'),event));

  // Either verified Master may revoke ordinary grants without affecting
  // protected Master accounts.
  await assertSucceeds(setDoc(doc(owner,'adminAccess','secondary@example.com'),{
   enabled:false,updatedAt:serverTimestamp(),grantedBy:'academy-owner'
  }));
  await assertSucceeds(setDoc(doc(master,'adminAccess','secondary@example.com'),{
   enabled:false,updatedAt:serverTimestamp(),grantedBy:'master-uid'
  }));
  await assertFails(getDoc(doc(admin,'students','student-a')));
  await assertFails(addDoc(collection(admin,'adminStudentPreviews'),event));
  await assertSucceeds(getDoc(doc(owner,'students','student-a')));
  await assertSucceeds(getDoc(doc(master,'students','student-a')));
 }finally{await env.cleanup()}
});
