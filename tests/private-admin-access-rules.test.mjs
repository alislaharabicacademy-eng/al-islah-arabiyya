import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,collection,getDocs,addDoc,serverTimestamp} from 'firebase/firestore';

const env=await initializeTestEnvironment({
  projectId:'demo-private-admin-access',
  firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}
});
test('official Academy Gmail is Normal Admin, not Master Admin; separate verified Master retains grants and audit',async()=>{
 try{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx=>{
   await setDoc(doc(ctx.firestore(),'students','example-student'),{name:'Sample'});
   await setDoc(doc(ctx.firestore(),'teachers','teacher-1'),{name:'Example Teacher'});
  });
  const official=env.authenticatedContext('normal-admin-uid',{
   email:'alislaharabicacademy@gmail.com',email_verified:true
  }).firestore();
  const master=env.authenticatedContext('master-admin-uid',{
   email:'syedatheil40@gmail.com',email_verified:true
  }).firestore();
  const secondary=env.authenticatedContext('normal-grant-uid',{
   email:'other-normal@example.com',email_verified:true
  }).firestore();
  const unverified=env.authenticatedContext('unverified-master',{
   email:'syedatheil40@gmail.com',email_verified:false
  }).firestore();
  const outsider=env.authenticatedContext('outsider',{
   email:'unknown@example.com',email_verified:true
  }).firestore();
  const grant='adminAccess/other-normal@example.com';
  const marker='adminRoleChecks/master';

  // Both allowed accounts manage ordinary Academy records. Only the exact
  // verified Master Admin can query a privileged role marker.
  await assertSucceeds(getDoc(doc(official,'students','example-student')));
  await assertSucceeds(getDoc(doc(master,'students','example-student')));
  await assertSucceeds(getDoc(doc(master,marker)));
  await assertFails(getDoc(doc(official,marker)));
  await assertFails(getDoc(doc(unverified,marker)));
  await assertFails(getDoc(doc(outsider,marker)));
  await assertFails(getDocs(collection(master,'adminRoleChecks')));
  await assertFails(setDoc(doc(official,marker),{enabled:true}));

  // The official Academy Gmail can no longer grant, revoke or inspect any
  // other admin's grant. Master can do both. Others receive NORMAL admin.
  await assertFails(setDoc(doc(official,grant),{
   enabled:true,updatedAt:serverTimestamp(),grantedBy:'normal-admin-uid'
  }));
  await assertFails(getDoc(doc(official,grant)));
  await assertSucceeds(setDoc(doc(master,grant),{
   enabled:true,updatedAt:serverTimestamp(),grantedBy:'master-admin-uid'
  }));
  await assertSucceeds(getDoc(doc(secondary,grant)));
  await assertSucceeds(getDoc(doc(secondary,'students','example-student')));
  await assertFails(getDoc(doc(secondary,marker)));
  await assertFails(getDoc(doc(secondary,'adminAccess','unknown@example.com')));
  await assertFails(setDoc(doc(secondary,'adminAccess','unknown@example.com'),{
   enabled:true,updatedAt:serverTimestamp(),grantedBy:'normal-grant-uid'
  }));
  await assertFails(getDocs(collection(master,'adminAccess')));
  await assertFails(getDocs(collection(official,'adminAccess')));
  await assertFails(getDocs(collection(secondary,'adminAccess')));
  await assertFails(setDoc(doc(master,'adminAccess','syedatheil40@gmail.com'),{
   enabled:false,updatedAt:serverTimestamp(),grantedBy:'master-admin-uid'
  }));
  await assertFails(setDoc(doc(master,'adminAccess','alislaharabicacademy@gmail.com'),{
   enabled:false,updatedAt:serverTimestamp(),grantedBy:'master-admin-uid'
  }));
  await assertFails(getDoc(doc(outsider,'students','example-student')));
  await assertFails(getDoc(doc(unverified,'students','example-student')));

  // Both levels may create audited previews without impersonation. Only the
  // verified Master can inspect the permanent immutable audit history.
  const event={
   teacherId:'teacher-1',actorUid:'normal-admin-uid',
   actorEmail:'alislaharabicacademy@gmail.com',
   purpose:'teacher_dashboard_preview',createdAt:serverTimestamp()
  };
  const logged=await assertSucceeds(addDoc(collection(official,'adminTeacherPreviews'),event));
  await assertFails(getDoc(doc(official,'adminTeacherPreviews',logged.id)));
  await assertFails(getDocs(collection(official,'adminTeacherPreviews')));
  await assertSucceeds(getDoc(doc(master,'adminTeacherPreviews',logged.id)));
  await assertSucceeds(getDocs(collection(master,'adminTeacherPreviews')));
  await assertFails(getDocs(collection(secondary,'adminTeacherPreviews')));

  // Revoking other normal Admin accounts does not change official Admin nor
  // separate Master access. This cannot be done by the official Gmail.
  await assertFails(setDoc(doc(official,grant),{
   enabled:false,updatedAt:serverTimestamp(),grantedBy:'normal-admin-uid'
  }));
  await assertSucceeds(setDoc(doc(master,grant),{
   enabled:false,updatedAt:serverTimestamp(),grantedBy:'master-admin-uid'
  }));
  await assertFails(getDoc(doc(secondary,'students','example-student')));
  await assertSucceeds(getDoc(doc(official,'students','example-student')));
  await assertSucceeds(getDoc(doc(master,'students','example-student')));
 }finally{await env.cleanup()}
});
