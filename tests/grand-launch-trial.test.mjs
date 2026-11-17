import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,getDocs,collection,setDoc,updateDoc,serverTimestamp} from 'firebase/firestore';

const rules=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
const html=readFileSync(new URL('../grand-launch.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../grand-launch.js',import.meta.url),'utf8');
test('rehearsal is isolated from real one-time launch',()=>{
  assert.match(html,/TRIAL MODE/);
  assert.match(html,/id="scissorsTrigger"/);
  assert.match(html,/TEST CUT HERE|Host Test Cut/);
  assert.match(js,/addEventListener\('click',requestTrialCut\)/);
  assert.match(js,/hasPendingWrites/);
  assert.match(js,/role==='principal'/);
  assert.match(js,/COUNTDOWN_MS=5000/);
  assert.match(js,/updateDoc\(doc\(db,'grandLaunch','trial'\)/);
  assert.doesNotMatch(js,/grandLaunch['"],['"]official/);
  assert.doesNotMatch(html,/id="startOfficial"/);
  assert.match(rules,/request\.time >= resource\.data\.startedAt \+ duration\.value\(5, 's'\)/);
});
test('secure, repeatable rehearsal: Admin starts and Principal or host cuts after 5 seconds',async()=>{
  const env=await initializeTestEnvironment({
    projectId:'demo-grand-launch-trial',
    firestore:{rules}
  });
  try {
    await env.clearFirestore();
    const admin=env.authenticatedContext('admin-test',{
      email:'alislaharabicacademy@gmail.com',email_verified:true
    }).firestore();
    const principal=env.authenticatedContext('principal-test',{
      email:'principal@example.com',email_verified:true
    }).firestore();
    const wrong=env.authenticatedContext('wrong-test',{
      email:'wrong@example.com',email_verified:true
    }).firestore();
    const unverified=env.authenticatedContext('unverified',{
      email:'principal@example.com',email_verified:false
    }).firestore();
    const anonymous=env.unauthenticatedContext().firestore();
    const config='grandLaunch/config',trial='grandLaunch/trial',official='grandLaunch/official';
    const base={kind:'trial',phase:'idle',startedAt:null,cutAt:null,cutBy:null,
      updatedAt:serverTimestamp(),updatedBy:'admin-test'};
    const toCut={phase:'cut',cutAt:serverTimestamp(),cutBy:'principal-test',
      updatedAt:serverTimestamp(),updatedBy:'principal-test'};
    await assertFails(getDoc(doc(anonymous,config)));
    await assertFails(setDoc(doc(wrong,config),{principalEmail:'wrong@example.com',
      updatedAt:serverTimestamp(),updatedBy:'wrong-test'}));
    await assertSucceeds(setDoc(doc(admin,config),{principalEmail:'principal@example.com',
      updatedAt:serverTimestamp(),updatedBy:'admin-test'}));
    await assertSucceeds(getDoc(doc(principal,config)));
    await assertFails(getDoc(doc(wrong,config)));
    await assertFails(getDoc(doc(unverified,config)));
    await assertFails(getDocs(collection(principal,'grandLaunch')));
    await assertFails(setDoc(doc(principal,config),{principalEmail:'wrong@example.com',
      updatedAt:serverTimestamp(),updatedBy:'principal-test'}));
    await assertSucceeds(setDoc(doc(admin,trial),base));
    await assertFails(updateDoc(doc(principal,trial),toCut));
    await assertFails(setDoc(doc(admin,official),{state:'launched'}));
    await assertSucceeds(setDoc(doc(admin,trial),{...base,phase:'countdown',
      startedAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(wrong,trial),toCut));
    await assertFails(updateDoc(doc(unverified,trial),toCut));
    await assertFails(updateDoc(doc(principal,trial),toCut)); // too early
    await assertFails(updateDoc(doc(principal,trial),{...toCut,startedAt:null})); // tamper
    await new Promise(resolve=>setTimeout(resolve,5350));
    await assertSucceeds(updateDoc(doc(principal,trial),toCut));
    await assertFails(updateDoc(doc(principal,trial),toCut)); // cannot cut twice
    await assertFails(setDoc(doc(principal,trial),base)); // cannot reset
    await assertSucceeds(setDoc(doc(admin,trial),base)); // host may replay
    await assertSucceeds(setDoc(doc(admin,trial),{...base,phase:'countdown',
      startedAt:serverTimestamp()}));
    const hostCut={phase:'cut',cutAt:serverTimestamp(),cutBy:'admin-test',
      updatedAt:serverTimestamp(),updatedBy:'admin-test'};
    await assertFails(updateDoc(doc(admin,trial),hostCut)); // host also waits for countdown
    await new Promise(resolve=>setTimeout(resolve,5350));
    await assertSucceeds(updateDoc(doc(admin,trial),hostCut)); // solo host trial
    await assertFails(updateDoc(doc(admin,trial),hostCut)); // no second cut this round
    await assertSucceeds(setDoc(doc(admin,trial),base)); // repeatable trial
    await assertFails(setDoc(doc(admin,official),{state:'launched'}));
  } finally {await env.cleanup()}
});
