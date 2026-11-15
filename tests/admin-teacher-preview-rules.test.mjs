import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,getDocs,setDoc,addDoc,deleteDoc,collection,serverTimestamp} from 'firebase/firestore';

const env=await initializeTestEnvironment({
 projectId:'demo-admin-teacher-preview',
 firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}
});
test('privileged teacher previews are append-only, actor-bound, non-anonymous and auditable',async()=>{
 try{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx=>{
   await setDoc(doc(ctx.firestore(),'teachers','teacher-1'),{name:'Example Teacher'});
   await setDoc(doc(ctx.firestore(),'teacherRosters','teacher-1'),{assignments:[]});
   await setDoc(doc(ctx.firestore(),'adminAccess','secondary@example.com'),{
    enabled:true,grantedBy:'academy-owner',updatedAt:serverTimestamp()
   });
  });
  const owner=env.authenticatedContext('academy-owner',{
   email:'alislaharabicacademy@gmail.com',email_verified:true
  }).firestore();
  const master=env.authenticatedContext('secondary-uid',{
   email:'secondary@example.com',email_verified:true
  }).firestore();
  const teacher=env.authenticatedContext('teacher-uid',{
   email:'teacher@example.com',email_verified:true
  }).firestore();
  const stranger=env.authenticatedContext('other-uid',{
   email:'other@example.com',email_verified:true
  }).firestore();
  const entry={
   teacherId:'teacher-1',actorUid:'secondary-uid',actorEmail:'secondary@example.com',
   createdAt:serverTimestamp(),purpose:'teacher_dashboard_preview'
  };
  await assertSucceeds(getDoc(doc(master,'teachers','teacher-1')));
  const logged=await assertSucceeds(addDoc(collection(master,'adminTeacherPreviews'),entry));
  await assertSucceeds(getDoc(doc(owner,'adminTeacherPreviews',logged.id)));
  await assertFails(getDoc(doc(master,'adminTeacherPreviews',logged.id)));
  await assertFails(getDocs(collection(master,'adminTeacherPreviews')));
  await assertFails(deleteDoc(logged));
  await assertFails(addDoc(collection(master,'adminTeacherPreviews'),{
   ...entry,actorEmail:'alislaharabicacademy@gmail.com'
  }));
  await assertFails(addDoc(collection(master,'adminTeacherPreviews'),{
   ...entry,teacherId:'does-not-exist'
  }));
  await assertFails(addDoc(collection(teacher,'adminTeacherPreviews'),entry));
  await assertFails(addDoc(collection(stranger,'adminTeacherPreviews'),entry));
  await assertFails(getDoc(doc(stranger,'teacherRosters','teacher-1')));
  await assertSucceeds(getDoc(doc(master,'teacherRosters','teacher-1')));
 }finally{await env.cleanup();}
});
