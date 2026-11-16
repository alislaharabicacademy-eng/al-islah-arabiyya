import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {collection,doc,getDoc,getDocs,query,where,setDoc,updateDoc,deleteDoc,serverTimestamp,Timestamp,writeBatch} from 'firebase/firestore';

const env=await initializeTestEnvironment({
 projectId:'demo-existing-students-self-registration',
 firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}
});
const validKey='a'.repeat(64),expiredKey='b'.repeat(64),requestId='c'.repeat(32);
const future=()=>Timestamp.fromDate(new Date(Date.now()+10*86400000));
const past=()=>Timestamp.fromDate(new Date(Date.now()-10*86400000));
const base=()=>({
 name:'Example Student',guardian:'Example Guardian',dob:'2010-05-21',
 phone:'9876543210',email:'parent@example.com',joiningDate:'2024-05-21',course:'muballigha',
 courseYear:2,batch:'',address:'Example Street, Panruti',
 notes:'Already studying in second year',photoData:'',
 educationLevel:'school',schoolStandard:'10',collegeCourse:'',collegeYear:'',
 institutionName:'Example High School',
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
  const superAdmin=env.authenticatedContext('verified-master',{
   email:'syedatheil40@gmail.com',email_verified:true
  }).firestore();
  const outsider=env.authenticatedContext('stranger',{
   email:'stranger@example.com',email_verified:true
  }).firestore();
  const visitor=env.unauthenticatedContext().firestore();
  // The official Academy Gmail is now a NORMAL Admin and cannot issue
  // private admin grants. The distinct verified Master grants access here.
  await assertFails(setDoc(doc(owner,'adminAccess','secondary@example.com'),{
   enabled:true,grantedBy:'owner',updatedAt:serverTimestamp()
  }));
  await assertSucceeds(setDoc(doc(superAdmin,'adminAccess','secondary@example.com'),{
   enabled:true,grantedBy:'verified-master',updatedAt:serverTimestamp()
  }));
  await assertSucceeds(setDoc(doc(owner,'existingStudentIntakeLinks',validKey),{
   enabled:true,expiresAt:future(),createdBy:'owner',createdAt:serverTimestamp()
  }));
  await assertSucceeds(setDoc(doc(master,'existingStudentIntakeLinks',expiredKey),{
   enabled:true,expiresAt:past(),createdBy:'master',createdAt:serverTimestamp()
  }));
  // Same published Course Management data used by the Admin, Admission and
  // Existing Student registration forms. Private/unpublished course docs are
  // intentionally not selectable by public users.
  for(const [id,name,published] of [
   ['muballigha','Muballigha',true],
   ['alima','Aalima',true],
   ['tajweed-for-girls','Tajweed for Girls',true],
   ['childrens-quran-maktab',"Children's Quran Maktab",true],
   ['hidden-course','Hidden Academy Course',false]
  ])await assertSucceeds(setDoc(doc(owner,'courses',id),{name,published}));
  const visible=await assertSucceeds(getDocs(query(collection(visitor,'courses'),where('published','==',true))));
  assert.equal(visible.size,4);
  await assertFails(getDoc(doc(visitor,'courses','hidden-course')));
  await assertFails(getDocs(collection(visitor,'courses')));
  // Regression: the Admin console calls collection.list() BEFORE issuing a
  // shared link. A token-regex on list previously blocked both admin roles.
  const ownerLinks=await assertSucceeds(getDocs(collection(owner,'existingStudentIntakeLinks')));
  assert.equal(ownerLinks.size,2);
  const masterLinks=await assertSucceeds(getDocs(collection(master,'existingStudentIntakeLinks')));
  assert.equal(masterLinks.size,2);
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
  // The parent/student email is mandatory for a submission; it may be the
  // guardian's address and does not by itself grant a Student Login.
  await assertFails(setDoc(doc(visitor,'existingStudentRequests','e'.repeat(32)),{
   ...base(),email:''
  }));
  await assertFails(setDoc(doc(visitor,'existingStudentRequests','f'.repeat(32)),{
   ...base(),email:'not-an-email'
  }));

  // New custom course from Admin Course Management: published, no special
  // Muballiga/Aalima year and college education submitted independently.
  await assertSucceeds(setDoc(doc(visitor,'existingStudentRequests','7'.repeat(32)),{
   ...base(),course:'tajweed-for-girls',courseYear:0,
   educationLevel:'college',schoolStandard:'',
   collegeCourse:'B.Com',collegeYear:'2',institutionName:'Example College'
  }));
  // Other valid education option does not create fake school/college fields.
  await assertSucceeds(setDoc(doc(visitor,'existingStudentRequests','8'.repeat(32)),{
   ...base(),course:'tajweed-for-girls',courseYear:0,
   educationLevel:'not-studying',schoolStandard:'',
   collegeCourse:'',collegeYear:'',institutionName:''
  }));
  await assertSucceeds(setDoc(doc(visitor,'existingStudentRequests','9'.repeat(32)),{
   ...base(),course:'childrens-quran-maktab',courseYear:0,batch:'Batch 1'
  }));
  await assertFails(setDoc(doc(visitor,'existingStudentRequests','0'.repeat(32)),{
   ...base(),course:'hidden-course',courseYear:0
  }));
  await assertFails(setDoc(doc(visitor,'existingStudentRequests','e'.repeat(32)),{
   ...base(),course:'invented-course',courseYear:0
  }));
  await assertFails(setDoc(doc(visitor,'existingStudentRequests','f'.repeat(32)),{
   ...base(),course:'childrens-quran-maktab',courseYear:0,batch:''
  }));
  await assertFails(setDoc(doc(visitor,'existingStudentRequests','a'.repeat(32)),{
   ...base(),educationLevel:'school',schoolStandard:''
  }));
  await assertFails(setDoc(doc(visitor,'existingStudentRequests','b'.repeat(32)),{
   ...base(),educationLevel:'college',schoolStandard:'',collegeCourse:''
  }));
  await assertFails(setDoc(doc(visitor,'existingStudentRequests','1'.repeat(32)),{
   ...base(),educationLevel:'not-studying'
  }));

  // Exercise the real Admin Create/Rotate implementation: list old links,
  // close active links and write a fresh invitation in one atomic batch.
  const rotatedKey='d'.repeat(64);
  const rotation=writeBatch(master);
  rotation.update(doc(master,'existingStudentIntakeLinks',validKey),{
   enabled:false,closedAt:serverTimestamp()
  });
  rotation.set(doc(master,'existingStudentIntakeLinks',rotatedKey),{
   enabled:true,expiresAt:future(),createdBy:'master',createdAt:serverTimestamp()
  });
  await assertSucceeds(rotation.commit());
  await assertFails(getDoc(doc(visitor,'existingStudentIntakeLinks',validKey)));
  await assertSucceeds(getDoc(doc(visitor,'existingStudentIntakeLinks',rotatedKey)));
  assert.equal((await assertSucceeds(getDocs(collection(owner,'existingStudentIntakeLinks')))).size,3);

  // Closing intake denies new submissions immediately, without deleting
  // private already-submitted forms or overriding approved student records.
  await assertSucceeds(updateDoc(doc(owner,'existingStudentIntakeLinks',rotatedKey),{
   enabled:false,closedAt:serverTimestamp()
  }));
  await assertFails(getDoc(doc(visitor,'existingStudentIntakeLinks',rotatedKey)));
  await assertFails(setDoc(doc(visitor,'existingStudentRequests','6'.repeat(32)),base()));
  await assertSucceeds(getDoc(doc(owner,'existingStudentRequests',requestId)));
 }finally{await env.cleanup()}
});
