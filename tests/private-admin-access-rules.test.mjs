import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,collection,getDocs,serverTimestamp} from 'firebase/firestore';

const env=await initializeTestEnvironment({
  projectId:'demo-private-admin-access',
  firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}
});
test('secondary administrators are privately authorized, audited, revocable and not enumerable',async()=>{
  try{
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx=>{
      await setDoc(doc(ctx.firestore(),'students','example-student'),{name:'Sample'});
    });
    const owner=env.authenticatedContext('academy-owner',{
      email:'alislaharabicacademy@gmail.com',email_verified:true
    }).firestore();
    const admin=env.authenticatedContext('private-admin-uid',{
      email:'second-admin@example.com',email_verified:true
    }).firestore();
    const unverified=env.authenticatedContext('unverified-admin-uid',{
      email:'second-admin@example.com',email_verified:false
    }).firestore();
    const stranger=env.authenticatedContext('stranger-uid',{
      email:'stranger@example.com',email_verified:true
    }).firestore();
    const grantPath='adminAccess/second-admin@example.com';

    await assertSucceeds(getDoc(doc(owner,'students','example-student')));
    await assertFails(getDoc(doc(admin,'students','example-student')));
    await assertFails(getDoc(doc(stranger,'students','example-student')));
    await assertFails(setDoc(doc(admin,grantPath),{
      enabled:true,updatedAt:serverTimestamp(),grantedBy:'private-admin-uid'
    }));

    await assertSucceeds(setDoc(doc(owner,grantPath),{
      enabled:true,updatedAt:serverTimestamp(),grantedBy:'academy-owner'
    }));
    const grant=await assertSucceeds(getDoc(doc(admin,grantPath)));
    assert.equal(grant.data().enabled,true);
    await assertSucceeds(getDoc(doc(admin,'students','example-student')));
    await assertFails(getDoc(doc(unverified,'students','example-student')));
    await assertFails(getDocs(collection(admin,'adminAccess')));
    await assertFails(getDocs(collection(owner,'adminAccess')));
    await assertFails(getDoc(doc(admin,'adminAccess','stranger@example.com')));
    await assertFails(setDoc(doc(admin,'adminAccess','stranger@example.com'),{
      enabled:true,updatedAt:serverTimestamp(),grantedBy:'private-admin-uid'
    }));
    await assertFails(setDoc(doc(stranger,grantPath),{
      enabled:true,updatedAt:serverTimestamp(),grantedBy:'stranger-uid'
    }));

    await assertSucceeds(setDoc(doc(owner,grantPath),{
      enabled:false,updatedAt:serverTimestamp(),grantedBy:'academy-owner'
    }));
    await assertFails(getDoc(doc(admin,'students','example-student')));
    await assertSucceeds(getDoc(doc(owner,'students','example-student')));
  }finally{
    await env.cleanup();
  }
});
