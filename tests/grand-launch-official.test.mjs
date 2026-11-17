import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,getDocs,collection,setDoc,updateDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';

const rules=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
const ceremony=readFileSync(new URL('../grand-launch.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../grand-launch.html',import.meta.url),'utf8');

test('Production date is locked to 21 November 2026 Asia/Kolkata, not system local time',()=>{
  assert.match(rules,/function isOfficialOpeningDay\(\)/);
  assert.match(rules,/timestamp\.date\(2026, 11, 20\)/);
  assert.match(rules,/duration\.value\(18, 'h'\) \+ duration\.value\(30, 'm'\)/);
  assert.match(rules,/timestamp\.date\(2026, 11, 21\)/);
  assert.match(rules,/allow create: if documentId == 'official'/);
  assert.match(rules,/!exists\(\/databases\/\$\(database\)\/documents\/grandLaunch\/official\)/);
  assert.doesNotMatch(rules,/allow (?:update|delete): if documentId == 'official'\b/);
  assert.match(ceremony,/const isOfficial=params\.get\('mode'\)==='official'/);
  assert.match(ceremony,/requestOfficialCut\(\)/);
  assert.match(ceremony,/if\(!isOfficial\|\|role!=='principal'/);
  assert.match(ceremony,/officialRecordLoaded/);
  assert.match(html,/id="officialControls"/);
  assert.match(html,/id="officialArm"/);
  assert.match(html,/id="officialCancel"/);
  assert.match(html,/id="officialStart"/);
  assert.match(html,/id="successExplanation"/);
  assert.match(ceremony,/IT CANNOT BE RESET/);
});

// In emulator-only tests, override the date helper to simulate opening day.
// Deployed rules are never altered and still enforce 21 November in India.
const helper=/    function isOfficialOpeningDay\(\) \{[\s\S]*?\n    \}/;
assert.ok(helper.test(rules),'Expected a server-side opening date restriction');
const emulatorRules=rules.replace(helper,"    function isOfficialOpeningDay() {\n      return true; // emulator only\n    }");

test('Master arms/starts and Principal cuts once after countdown; official record remains immutable',async()=>{
 const env=await initializeTestEnvironment({
   projectId:'demo-grand-official-onetime',
   firestore:{rules:emulatorRules}
 });
 try{
  await env.clearFirestore();
  const master=env.authenticatedContext('master-uid',{
    email:'syedatheil40@gmail.com',email_verified:true
  }).firestore();
  const admin=env.authenticatedContext('normal-uid',{
    email:'alislaharabicacademy@gmail.com',email_verified:true
  }).firestore();
  const principal=env.authenticatedContext('principal-uid',{
    email:'principal@example.com',email_verified:true
  }).firestore();
  const outsider=env.authenticatedContext('outsider-uid',{
    email:'another@example.com',email_verified:true
  }).firestore();
  const unverified=env.authenticatedContext('unverified-uid',{
    email:'principal@example.com',email_verified:false
  }).firestore();
  const control='grandLaunch/officialControl';
  const official='grandLaunch/official';
  const config='grandLaunch/config';
  const arm={kind:'officialControl',state:'armed',startedAt:null,startedBy:null,
    updatedAt:serverTimestamp(),updatedBy:'master-uid'};
  const start={state:'countdown',startedAt:serverTimestamp(),startedBy:'master-uid',
    updatedAt:serverTimestamp(),updatedBy:'master-uid'};
  const cancel={state:'armed',startedAt:null,startedBy:null,
    updatedAt:serverTimestamp(),updatedBy:'master-uid'};

  await assertSucceeds(setDoc(doc(master,config),{
    principalEmail:'principal@example.com',updatedAt:serverTimestamp(),updatedBy:'master-uid'
  }));
  await assertFails(getDoc(doc(outsider,control)));
  await assertFails(getDocs(collection(master,'grandLaunch')));
  await assertFails(setDoc(doc(admin,control),{...arm,updatedBy:'normal-uid'}));
  await assertFails(setDoc(doc(principal,control),{...arm,updatedBy:'principal-uid'}));
  await assertFails(setDoc(doc(outsider,control),{...arm,updatedBy:'outsider-uid'}));
  await assertSucceeds(setDoc(doc(master,control),arm));
  await assertFails(setDoc(doc(master,control),arm));
  await assertFails(updateDoc(doc(admin,control),{...start,startedBy:'normal-uid',updatedBy:'normal-uid'}));
  await assertFails(updateDoc(doc(principal,control),{...start,startedBy:'principal-uid',updatedBy:'principal-uid'}));
  await assertSucceeds(updateDoc(doc(master,control),start));
  const firstCountdown=(await getDoc(doc(master,control))).data().startedAt;
  const record={kind:'official',phase:'launched',dateLocal:'2026-11-21',
    startedAt:firstCountdown,launchedAt:serverTimestamp(),launchedBy:'principal-uid'};
  await assertFails(setDoc(doc(principal,official),record));
  await assertFails(setDoc(doc(admin,official),{...record,launchedBy:'normal-uid'}));
  await assertFails(setDoc(doc(outsider,official),{...record,launchedBy:'outsider-uid'}));
  await assertFails(setDoc(doc(unverified,official),{...record,launchedBy:'unverified-uid'}));
  await assertSucceeds(updateDoc(doc(master,control),cancel));
  await assertFails(setDoc(doc(principal,official),record));
  await assertSucceeds(updateDoc(doc(master,control),start));
  const finalCountdown=(await getDoc(doc(master,control))).data().startedAt;
  const finalRecord={...record,startedAt:finalCountdown};
  await assertFails(setDoc(doc(principal,official),finalRecord));
  await new Promise(resolve=>setTimeout(resolve,5450));
  await assertSucceeds(setDoc(doc(principal,official),finalRecord));
  const published=await assertSucceeds(getDoc(doc(master,official)));
  assert.equal(published.data().kind,'official');
  assert.equal(published.data().launchedBy,'principal-uid');
  await assertFails(setDoc(doc(principal,official),finalRecord));
  await assertFails(updateDoc(doc(master,official),{phase:'cancelled'}));
  await assertFails(deleteDoc(doc(master,official)));
  await assertFails(updateDoc(doc(master,control),cancel));
  await assertFails(updateDoc(doc(master,control),start));
 }finally{await env.cleanup()}
});
