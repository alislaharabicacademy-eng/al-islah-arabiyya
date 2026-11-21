import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,getDocs,collection,setDoc,updateDoc,deleteDoc,writeBatch,serverTimestamp} from 'firebase/firestore';

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
  assert.match(ceremony,/requestStagedOfficialCut\(\)/);
  assert.match(ceremony,/finalizeOfficial\(\)/);
  assert.match(ceremony,/isStagedOfficialCut\(\)/);
  assert.match(ceremony,/if\(!isOfficial\|\|role!=='principal'/);
  assert.match(ceremony,/officialRecordLoaded/);
  assert.match(html,/id="officialControls"/);
  assert.match(html,/id="officialArm"/);
  assert.match(html,/id="officialCancel"/);
  assert.match(html,/id="officialStart"/);
  assert.match(html,/id="officialFinalize"/);
  assert.match(html,/id="successExplanation"/);
  assert.match(ceremony,/final record can NEVER be reset/);
  assert.match(ceremony,/async function cancelOfficialCountdown\(\)/);
  assert.match(ceremony,/writeBatch\(db\)/);
  assert.match(ceremony,/grandLaunchPublic','opening'/);
});

// In emulator-only tests, override the date helper to simulate opening day.
// Deployed rules are never altered and still enforce 21 November in India.
const helper=/    function isOfficialOpeningDay\(\) \{[\s\S]*?\n    \}/;
assert.ok(helper.test(rules),'Expected a server-side opening date restriction');
const emulatorRules=rules.replace(helper,"    function isOfficialOpeningDay() {\n      return true; // emulator only\n    }");

test('Master can reset displayed ribbon after cut; only Principal final confirmation records immutable launch',async()=>{
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
  const ceremonyInvite=env.authenticatedContext('ceremony-invite-uid',{
    email:'wafahikmiya@gmail.com',email_verified:true
  }).firestore();
  const unverifiedInvite=env.authenticatedContext('unverified-invite-uid',{
    email:'wafahikmiya@gmail.com',email_verified:false
  }).firestore();
  const guest=env.unauthenticatedContext().firestore();
  const unverified=env.authenticatedContext('unverified-uid',{
    email:'principal@example.com',email_verified:false
  }).firestore();
  const control='grandLaunch/officialControl';
  const official='grandLaunch/official';
  const trial='grandLaunch/trial';
  const publicOpening='grandLaunchPublic/opening';
  const config='grandLaunch/config';
  const arm={kind:'officialControl',state:'armed',startedAt:null,startedBy:null,
    updatedAt:serverTimestamp(),updatedBy:'master-uid'};
  const start={state:'countdown',startedAt:serverTimestamp(),startedBy:'master-uid',
    updatedAt:serverTimestamp(),updatedBy:'master-uid'};
  const cancel={state:'armed',startedAt:null,startedBy:null,
    updatedAt:serverTimestamp(),updatedBy:'master-uid'};

  // Both explicitly invited inauguration accounts can open Principal Login,
  // but never acquire Master permissions or Official Host countdown controls.
  const probe='grandLaunch/principalAccessProbe';
  await assertSucceeds(getDoc(doc(ceremonyInvite,probe)));
  await assertSucceeds(getDoc(doc(admin,probe)));
  await assertFails(getDoc(doc(outsider,probe)));
  await assertFails(getDoc(doc(unverifiedInvite,probe)));
  await assertFails(getDoc(doc(ceremonyInvite,'adminRoleChecks','master')));
  await assertFails(getDoc(doc(admin,'adminRoleChecks','master')));
  await assertSucceeds(setDoc(doc(master,config),{
    principalEmail:'principal@example.com',updatedAt:serverTimestamp(),updatedBy:'master-uid'
  }));
  await assertSucceeds(getDoc(doc(principal,probe))); // saved Principal still has access
  await assertSucceeds(getDoc(doc(ceremonyInvite,config))); // additional account persists
  await assertFails(setDoc(doc(ceremonyInvite,config),{
    principalEmail:'wafahikmiya@gmail.com',updatedAt:serverTimestamp(),updatedBy:'ceremony-invite-uid'
  }));
  await assertFails(getDoc(doc(outsider,control)));
  await assertFails(getDoc(doc(guest,publicOpening))); // before final opening no public welcome
  await assertFails(getDoc(doc(guest,official))); // private immutable launch record is never public
  await assertFails(getDocs(collection(master,'grandLaunch')));
  await assertFails(setDoc(doc(admin,control),{...arm,updatedBy:'normal-uid'}));
  await assertFails(setDoc(doc(principal,control),{...arm,updatedBy:'principal-uid'}));
  await assertFails(setDoc(doc(ceremonyInvite,control),{...arm,updatedBy:'ceremony-invite-uid'}));
  await assertFails(setDoc(doc(outsider,control),{...arm,updatedBy:'outsider-uid'}));
  await assertSucceeds(setDoc(doc(master,control),arm));
  await assertFails(setDoc(doc(master,control),arm));
  await assertFails(updateDoc(doc(admin,control),{...start,startedBy:'normal-uid',updatedBy:'normal-uid'}));
  await assertFails(updateDoc(doc(principal,control),{...start,startedBy:'principal-uid',updatedBy:'principal-uid'}));
  // Stage a full official countdown in the existing resettable trial doc.
  // Principal scissors only writes here; it never creates the official record.
  await assertSucceeds(setDoc(doc(master,trial),{
    kind:'trial',phase:'countdown',startedAt:serverTimestamp(),cutAt:null,cutBy:null,
    updatedAt:serverTimestamp(),updatedBy:'master-uid'
  }));
  await assertSucceeds(updateDoc(doc(master,control),start));
  const firstCountdown=(await getDoc(doc(master,control))).data().startedAt;
  const stageCut={phase:'cut',cutAt:serverTimestamp(),cutBy:'principal-uid',
    updatedAt:serverTimestamp(),updatedBy:'principal-uid'};
  await assertFails(updateDoc(doc(principal,trial),stageCut)); // wait full ten seconds
  await new Promise(resolve=>setTimeout(resolve,10450));
  await assertSucceeds(updateDoc(doc(principal,trial),stageCut));
  await assertFails(getDoc(doc(outsider,trial)));
  await assertFails(setDoc(doc(principal,publicOpening),{
    phase:'launched',dateLocal:'2026-11-21',launchedAt:serverTimestamp()
  })); // cannot show public welcome after a staged scissors preview
  await assertFails(getDoc(doc(guest,publicOpening)));
  await assertFails(setDoc(doc(principal,official),{state:'launched'})); // staged ≠ permanent
  const record={kind:'official',phase:'launched',dateLocal:'2026-11-21',
    startedAt:firstCountdown,launchedAt:serverTimestamp(),launchedBy:'principal-uid'};
  assert.equal((await getDoc(doc(master,official))).exists(),false,'Staged ribbon cut must not create the permanent record');
  // Assigned Academy account IS allowed to confirm, but only with a
  // valid 10-second countdown and exact immutable record schema.
  // Do not commit the real record here: reset-after-cut is tested below.
  await assertFails(setDoc(doc(admin,official),{...record,launchedBy:'normal-uid',startedAt:null}));
  await assertFails(setDoc(doc(outsider,official),{...record,launchedBy:'outsider-uid'}));
  await assertFails(setDoc(doc(unverified,official),{...record,launchedBy:'unverified-uid'}));
  // Reset is explicitly permitted AFTER the visible ribbon has been cut.
  await assertSucceeds(updateDoc(doc(master,control),cancel));
  await assertSucceeds(setDoc(doc(master,trial),{
    kind:'trial',phase:'idle',startedAt:null,cutAt:null,cutBy:null,
    updatedAt:serverTimestamp(),updatedBy:'master-uid'
  }));
  await assertFails(setDoc(doc(principal,official),record));
  // A second complete run can now start and be finally confirmed.
  await assertSucceeds(setDoc(doc(master,trial),{
    kind:'trial',phase:'countdown',startedAt:serverTimestamp(),cutAt:null,cutBy:null,
    updatedAt:serverTimestamp(),updatedBy:'master-uid'
  }));
  await assertSucceeds(updateDoc(doc(master,control),start));
  const finalCountdown=(await getDoc(doc(master,control))).data().startedAt;
  const finalRecord={...record,startedAt:finalCountdown};
  await assertFails(setDoc(doc(principal,official),finalRecord));
  await new Promise(resolve=>setTimeout(resolve,10450));
  const launchTime=serverTimestamp();
  const batch=writeBatch(principal);
  batch.set(doc(principal,official),{...finalRecord,launchedAt:launchTime});
  batch.set(doc(principal,publicOpening),{
    phase:'launched',dateLocal:'2026-11-21',launchedAt:launchTime
  });
  await assertSucceeds(batch.commit());
  // After and ONLY after final confirmation, guests see the safe public signal.
  const signal=await assertSucceeds(getDoc(doc(guest,publicOpening)));
  assert.equal(signal.data().phase,'launched');
  assert.deepEqual(Object.keys(signal.data()).sort(),['dateLocal','launchedAt','phase']);
  await assertFails(getDoc(doc(guest,official)));
  await assertFails(getDocs(collection(guest,'grandLaunchPublic')));
  await assertFails(updateDoc(doc(principal,publicOpening),{phase:'pending'}));
  await assertFails(deleteDoc(doc(master,publicOpening)));
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
