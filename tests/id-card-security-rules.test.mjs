import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,getDocs,setDoc,updateDoc,collection,serverTimestamp} from 'firebase/firestore';

const env=await initializeTestEnvironment({
 projectId:'demo-academy-id-card',
 firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}
});
const code='0123456789abcdef0123456789abcdef';
const next='abcdef0123456789abcdef0123456789';
const exampleStudent={
 kind:'student',holderId:'student-a',displayId:'ALIA00031',name:'Ayesha A',
 verificationCode:code,published:true,status:'active',validUntil:'2027-10-20',
 photoData:'data:image/jpeg;base64,ABC',guardian:'Guardian name',dob:'2015-03-07'
};
const exampleTeacher={
 kind:'teacher',holderId:'teacher-a',displayId:'ALIT-1234567890',name:'Teacher A',
 verificationCode:next,published:true,status:'active',validUntil:'2027-10-20'
};
const publicStudent={
 published:true,status:'active',kind:'student',holderName:'Ayesha A',
 displayId:'ALIA00031',validUntil:'2027-10-20'
};
test('official ID cards are private but public QR validity is minimal, revocable and unguessable',async()=>{
 try{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx=>{
   const db=ctx.firestore();
   await setDoc(doc(db,'studentAccess','student-a'),{email:'guardian@example.com',enabled:true});
   await setDoc(doc(db,'studentAccess','student-b'),{email:'other-guardian@example.com',enabled:true});
   await setDoc(doc(db,'teacherAccess','teacher-a'),{email:'teacher@example.com'});
   await setDoc(doc(db,'adminAccess','secondary@example.com'),{
    enabled:true,grantedBy:'academy-owner',updatedAt:serverTimestamp()
   });
  });
  const owner=env.authenticatedContext('academy-owner',{
   email:'alislaharabicacademy@gmail.com',email_verified:true
  }).firestore();
  const secondary=env.authenticatedContext('secondary-uid',{
   email:'secondary@example.com',email_verified:true
  }).firestore();
  const guardian=env.authenticatedContext('guardian-uid',{
   email:'guardian@example.com',email_verified:true
  }).firestore();
  const otherGuardian=env.authenticatedContext('other-guardian',{
   email:'other-guardian@example.com',email_verified:true
  }).firestore();
  const teacher=env.authenticatedContext('teacher-uid',{
   email:'teacher@example.com',email_verified:true
  }).firestore();
  const stranger=env.authenticatedContext('stranger-uid',{
   email:'stranger@example.com',email_verified:true
  }).firestore();
  const unverified=env.authenticatedContext('unverified-uid',{
   email:'guardian@example.com',email_verified:false
  }).firestore();
  const visitor=env.unauthenticatedContext().firestore();
  const sc='student__student-a',tc='teacher__teacher-a';
  await assertSucceeds(setDoc(doc(owner,'idCards',sc),exampleStudent));
  await assertSucceeds(setDoc(doc(secondary,'idCards',tc),exampleTeacher));
  await assertSucceeds(setDoc(doc(owner,'idCardPublic',code),publicStudent));
  await assertSucceeds(setDoc(doc(owner,'idCardPublic',next),{
   ...publicStudent,kind:'teacher',holderName:'Teacher A',displayId:'ALIT-1234567890'
  }));
  await assertSucceeds(setDoc(doc(owner,'idCardSettings','current'),{studentTheme:'emerald'}));
  assert.equal((await assertSucceeds(getDoc(doc(guardian,'idCards',sc)))).data().displayId,'ALIA00031');
  await assertSucceeds(getDoc(doc(teacher,'idCards',tc)));
  await assertSucceeds(getDoc(doc(owner,'idCards',tc)));
  await assertSucceeds(getDoc(doc(secondary,'idCards',sc)));
  await assertFails(getDoc(doc(guardian,'idCards',tc)));
  await assertFails(getDoc(doc(teacher,'idCards',sc)));
  await assertFails(getDoc(doc(otherGuardian,'idCards',sc)));
  await assertFails(getDoc(doc(unverified,'idCards',sc)));
  await assertFails(getDoc(doc(visitor,'idCards',sc)));
  await assertFails(getDocs(collection(visitor,'idCards')));
  await assertFails(getDocs(collection(guardian,'idCards')));
  await assertSucceeds(getDocs(collection(owner,'idCards')));
  await assertFails(getDoc(doc(visitor,'idCardSettings','current')));
  await assertSucceeds(getDoc(doc(secondary,'idCardSettings','current')));
  await assertFails(setDoc(doc(guardian,'idCards',sc),exampleStudent));
  await assertFails(updateDoc(doc(guardian,'idCards',sc),{status:'revoked'}));
  const verified=await assertSucceeds(getDoc(doc(visitor,'idCardPublic',code)));
  assert.deepEqual(Object.keys(verified.data()).sort(),[
   'displayId','holderName','kind','published','status','validUntil'
  ]);
  assert.equal(verified.data().holderName,'Ayesha A');
  await assertFails(getDocs(collection(visitor,'idCardPublic')));
  await assertFails(getDocs(collection(guardian,'idCardPublic')));
  await assertFails(setDoc(doc(owner,'idCardPublic','not-a-valid-qr'),publicStudent));
  await assertFails(setDoc(doc(owner,'idCardPublic','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),{
   ...publicStudent,email:'private@example.com',dob:'2015-03-07'
  }));
  await assertFails(updateDoc(doc(visitor,'idCardPublic',code),{status:'revoked'}));
  // Admin revokes the private card and public verification atomically in app.
  await assertSucceeds(updateDoc(doc(owner,'idCards',sc),{status:'revoked'}));
  await assertSucceeds(updateDoc(doc(owner,'idCardPublic',code),{status:'revoked'}));
  await assertFails(getDoc(doc(guardian,'idCards',sc)));
  assert.equal((await assertSucceeds(getDoc(doc(visitor,'idCardPublic',code)))).data().status,'revoked');
  // Change in student approval immediately revokes self-service card access.
  await assertSucceeds(updateDoc(doc(owner,'idCards',sc),{status:'active'}));
  await assertSucceeds(updateDoc(doc(owner,'studentAccess','student-a'),{enabled:false}));
  await assertFails(getDoc(doc(guardian,'idCards',sc)));
  await assertSucceeds(getDoc(doc(owner,'idCards',sc)));
 }finally{await env.cleanup()}
});
