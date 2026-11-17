import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,getDocs,collection,setDoc,updateDoc,serverTimestamp} from 'firebase/firestore';

const rules=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
const html=readFileSync(new URL('../grand-launch.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../grand-launch.js',import.meta.url),'utf8');
const adminHtml=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
const homepageHtml=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const principalAdminJs=readFileSync(new URL('../principal-access-admin.js',import.meta.url),'utf8');
test('principal login is discoverable, admin-controlled, and account-switchable',()=>{
  assert.match(homepageHtml,/Principal Login<\/strong>/);
  assert.match(homepageHtml,/grand-launch\.html\?role=principal/);
  assert.match(adminHtml,/id="principalCeremonyAccess"/);
  assert.match(adminHtml,/id="ceremonyPrincipalSave"/);
  assert.match(adminHtml,/initPrincipalCeremonyAccess/);
  assert.match(principalAdminJs,/doc\(db,'grandLaunch','config'\)/);
  assert.doesNotMatch(principalAdminJs,/siteSettings','public'/);
  assert.match(html,/id="switchGoogleAccount"/);
  assert.match(js,/prompt:'select_account'/);
  assert.match(js,/signOut\(auth\)/);
  // Backup ceremony access is verified using protected Firestore role probe,
  // not by writing a second Gmail to browser code or public configuration.
  assert.match(js,/import \{isVerifiedMasterAdmin\} from '\.\/admin-role-status\.js'/);
  assert.match(js,/await isVerifiedMasterAdmin\(db,user\)/);
  const masterAddress=rules.match(/function isMasterAdmin\(\)[\s\S]*?request\.auth\.token\.email == '([^']+)'/);
  assert.ok(masterAddress, 'Existing Firestore master role must remain defined');
  assert.ok(!js.includes(masterAddress[1]),'Master address must not be copied to ceremony JavaScript');
});

test('Main Ceremony Preview is resettable, keeps real launch locked, and reveals only homepage',()=>{
  assert.match(html,/id="previewLaunchOverlay"/);
  assert.match(html,/id="previewLaunchFrame"/);
  assert.match(html,/id="previewReset"/);
  assert.match(html,/MAIN CEREMONY PREVIEW · NOT OFFICIAL/);
  assert.match(html,/grand-launch\.html\?role=host&amp;mode=main-preview/);
  assert.match(js,/params\.get\('mode'\)==='main-preview'/);
  assert.match(js,/role=principal'\+\(isMainPreview\?'&mode=main-preview'/);
  assert.match(js,/show\('previewLaunchOverlay',true\)/);
  assert.match(js,/previewLaunchFrame'\)\.src='\.\/index\.html'/);
  assert.match(js,/await writeTrial\('idle'\)/);
  assert.match(js,/resetVisual\(\)/);
  // Official state is written only by the separate, explicitly selected
  // Principal official-cut handler; the default preview remains reversible.
  assert.match(js,/async function requestOfficialCut\(\)/);
  assert.match(js,/if\(!isOfficial\|\|role!=='principal'/);
  assert.match(js,/if\(isOfficial\)return; \/\/ Official mode can never use the resettable cut path/);
  assert.doesNotMatch(html,/id="startOfficial"/);
});

test('rehearsal is isolated from real one-time launch',()=>{
  assert.match(html,/TRIAL MODE/);
  assert.match(html,/id="scissorsTrigger"/);
  assert.match(html,/TEST CUT HERE|Host Test Cut/);
  assert.match(js,/addEventListener\('click',requestTrialCut\)/);
  assert.match(js,/hasPendingWrites/);
  assert.match(js,/role==='principal'/);
  assert.match(js,/COUNTDOWN_MS=5000/);
  assert.match(js,/updateDoc\(doc\(db,'grandLaunch','trial'\)/);
  assert.match(js,/if\(isOfficial\)\{renderOfficial\(\);return\}/);
  assert.match(js,/if\(!isOfficial\|\|role!=='principal'/);
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
    const existingMasterAddress=rules.match(/function isMasterAdmin\(\)[\s\S]*?request\.auth\.token\.email == '([^']+)'/);
    assert.ok(existingMasterAddress, 'Master role must exist in Firestore rules');
    const master=env.authenticatedContext('master-test',{
      email:existingMasterAddress[1],email_verified:true
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
    // The Master Admin is permitted to access the same Principal ceremony
    // screen via a private server-side role check; no visible second account.
    await assertSucceeds(getDoc(doc(master,config)));
    await assertSucceeds(getDoc(doc(master,'adminRoleChecks','master')));
    await assertFails(getDoc(doc(admin,'adminRoleChecks','master')));
    await assertFails(getDoc(doc(principal,'adminRoleChecks','master')));
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
