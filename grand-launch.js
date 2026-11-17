/* Isolated, reversible multi-device ceremony rehearsal. NO official launch API or state. */
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signInWithRedirect,signInWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import {getFirestore,doc,collection,query,limit,getDocs,getDoc,setDoc,updateDoc,onSnapshot,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {isVerifiedMasterAdmin} from './admin-role-status.js';

const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const role=params.get('role')==='principal'?'principal':'host';
// Rehearsals are reversible. Only mode=official records the actual one-time event.
const isOfficial=params.get('mode')==='official';
const isMainPreview=!isOfficial && params.get('mode')==='main-preview';
const COUNTDOWN_MS=5000;
let auth,db,me,trial=null,unsubscribe=null,authorized=false,principalEmail='',experiencedCountdown=false,cutPlayed=false,cutPending=false,previousPhase='',lastDigit=0,redirectTimer=null,successTimer=null;
let officialControl=null,officialRecord=null,officialControlLoaded=false,officialRecordLoaded=false;
let officialUnsubscribes=[],officialSeenCountdown=false,masterVerified=false;
const message=(text,isError=false)=>{$('message').textContent=text;$('message').classList.toggle('danger',isError)};
const show=(id,visible)=>$(id).hidden=!visible;
const isEmail=value=>/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(value);
const principalUrl=new URL('./grand-launch.html?role=principal'+(isOfficial?'&mode=official':isMainPreview?'&mode=main-preview':''),location.href).href;
document.body.dataset.mode=isOfficial?'official':isMainPreview?'main-preview':'trial';
$('switchCeremonyMode').href=isMainPreview?'./grand-launch.html?role=host':'./grand-launch.html?role=host&mode=main-preview';
$('switchCeremonyMode').textContent=isMainPreview?'↩ Return to Regular Trial':'✨ See Main Ceremony Preview';
if(isMainPreview){
  document.title='Main Ceremony Preview · NOT OFFICIAL | Women\'s Online Madrasa';
  $('ceremonyModeBadge').classList.add('main-preview-badge');
  $('ceremonyModeBadge').textContent='🎀 MAIN CEREMONY PREVIEW · NOT OFFICIAL';
  $('ceremonyTopline').textContent='21 NOVEMBER 2026 · FULL LAUNCH DRESS REHEARSAL';
  $('hostControlHeading').textContent='🎬 Main Ceremony Preview · Resettable';
  $('startTrial').textContent='▶ Start Main Ceremony Preview';
  $('resetTrial').textContent='↻ Reset Main Preview';
  $('successHeadline').textContent='✨ GRAND WEBSITE REVEAL ✨';
  $('successSubtitle').textContent='Main Ceremony Preview · Not Official';
}
if(isOfficial){
  document.title='Official Inauguration · 21 November 2026 | Women\'s Online Madrasa';
  $('ceremonyModeBadge').classList.add('main-preview-badge');
  $('ceremonyModeBadge').textContent='👑 OFFICIAL INAUGURATION · ONE TIME ONLY';
  $('ceremonyTopline').textContent='SATURDAY, 21 NOVEMBER 2026 · OFFICIAL INAUGURATION';
  $('hostControlHeading').textContent='🔐 One-Time Official Opening · Master Control';
  $('principalInstruction').textContent='When the Master Admin starts the official countdown on 21 November, you may cut the ribbon exactly once. This is NOT a trial; once cut, it cannot be reset.';
  $('ceremonyFooter').innerHTML='Official inauguration · Saturday, 21 November 2026 · The confirmed ceremony is permanently recorded.<br>Madrasa Al Islahul Arabiya · Women\'s Online Madrasa';
  $('successHeadline').textContent='🎉 WEBSITE OFFICIALLY LAUNCHED 🎉';
  $('successSubtitle').textContent='21 November 2026 · Official Inauguration';
  $('successExplanation').textContent='The official launch is permanently recorded and cannot be reset.';
  $('previewLaunchHeader').textContent='🎉 OFFICIALLY INAUGURATED · 21 NOVEMBER 2026';
  $('previewLaunchFooter').textContent='Official inauguration successfully recorded · 21 November 2026';
  $('previewReset').hidden=true;
  show('rehearsalControls',false);
  show('officialControls',true);
}
$('principalLink').href=principalUrl;
$('officialPrincipalLink').href=principalUrl;
$('loginHeading').textContent=role==='principal'?'Principal · Verified Google Login':'Host · Secure Admin Login';
show('passwordForm',role==='host');
show('switchGoogleAccount',role==='principal');

function resetVisual(){
  clearTimeout(redirectTimer);
  clearTimeout(successTimer);
  show('previewLaunchOverlay',false);
  $('previewLaunchFrame').removeAttribute('src');
  cutPlayed=false;
  cutPending=false;
  experiencedCountdown=false;
  previousPhase='';
  lastDigit=0;
  $('ribbonWrap').classList.remove('is-cut');
  $('confetti').replaceChildren();
  show('success',false);
  show('ribbonArea',false);
  show('countdown',false);
  show('cutRibbon',false);
  show('scissorsTrigger',false);
  show('waitingForPrincipal',false);
}
function confetti(){
  const field=$('confetti');field.replaceChildren();
  for(let i=0;i<42;i++){
    const piece=document.createElement('i');
    piece.style.setProperty('--x',((i*73)%100)+'%');
    piece.style.setProperty('--c',['#efd483','#f7f3de','#dbad5c','#e0a3a0'][i%4]);
    piece.style.setProperty('--t',(2.3+(i%8)*.25)+'s');
    piece.style.setProperty('--r',((i*57)%360)+'deg');
    piece.style.animationDelay=((i%6)*.065)+'s';
    field.append(piece);
  }
  setTimeout(()=>field.replaceChildren(),5200);
}
function playCutAnimation(){
  if(cutPlayed)return;
  cutPlayed=true;
  show('countdown',false);
  show('ribbonArea',true);
  show('cutRibbon',false);
  show('scissorsTrigger',true);
  $('scissorsTrigger').disabled=true;
  show('waitingForPrincipal',false);
  $('ribbonWrap').classList.remove('is-cut');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    $('ribbonWrap').classList.add('is-cut');confetti();
  }));
  message(isOfficial?'🎉 The official ribbon cut is permanently recorded! Presenting the inaugurated website…':isMainPreview?'✂️ Preview ribbon cut confirmed. Revealing the homepage without recording any official launch…':'✂️ Trial ribbon cut confirmed! Showing the rehearsal website…');
  successTimer=setTimeout(()=>{show('ribbonArea',false);show('success',true)},1250);
  // On the Host MAIN PREVIEW show the actual homepage in a full-size frame
  // with a persistent preview banner and reset button, without navigating away.
  if(role==='host'&&experiencedCountdown){
    if(isMainPreview||isOfficial){
      redirectTimer=setTimeout(()=>{
        $('previewLaunchFrame').src='./index.html';
        show('previewLaunchOverlay',true);
      },3400);
    }else{
      redirectTimer=setTimeout(()=>location.assign('./index.html'),3400);
    }
  }
}
function officialIndiaDate(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return p.year+'-'+p.month+'-'+p.day;
}
function officialTimeString(ts){
  return ts?.toDate?.().toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true})||'21 November 2026';
}
function renderOfficial(){
  if(!authorized||!officialControlLoaded||!officialRecordLoaded)return;
  const launched=officialRecord?.phase==='launched';
  if(role==='host'){
    const state=officialControl?.state||'not-prepared';
    $('officialStatus').textContent=launched
      ?'✅ Officially inaugurated: '+officialTimeString(officialRecord.launchedAt)+' (India time). Permanent record; no reset.'
      :state==='countdown'
      ?'⏳ Final countdown started. Waiting for the Principal to cut the ribbon.'
      :state==='armed'
      ?'🔒 Ceremony armed. Start is permitted ONLY on Saturday 21 November 2026 (India time).'
      :'🔐 Not yet armed. A verified Master Admin can prepare the ceremony now without launching it.';
    const canManage=masterVerified&&!launched;
    show('officialArm',canManage&&!officialControl);
    show('officialStart',canManage&&state==='armed');
    show('officialCancel',canManage&&state==='countdown');
    $('officialStart').disabled=officialIndiaDate()!=='2026-11-21';
    $('officialPhrase').closest('label').hidden=!canManage||!!officialControl;
  }
  if(launched){
    if(!cutPlayed){
      if(officialSeenCountdown){
        playCutAnimation();
      }else{
        cutPlayed=true;show('ribbonArea',false);show('countdown',false);show('success',true);
        message('✅ Website officially inaugurated on '+officialTimeString(officialRecord.launchedAt)+' (India time). This cannot be reset.');
      }
    }
    previousPhase='launched';
    return;
  }
  const phase=officialControl?.state||'not-prepared';
  if(phase==='not-prepared'||phase==='armed'){
    if(previousPhase!==phase)resetVisual();
    message(phase==='armed'
      ?(role==='principal'?'Official opening is prepared. Wait for the Master Admin to start the countdown on 21 November.':'Ready for the final event. Master Admin starts the countdown on 21 November.')
      :(role==='principal'?'Official ceremony is not armed. The Master Admin prepares it first.':'The official ceremony has not been armed yet. No launch has happened.'));
  }else if(phase==='countdown'){
    officialSeenCountdown=true;experiencedCountdown=true;
    if(previousPhase!=='countdown'){
      cutPlayed=false;cutPending=false;clearTimeout(redirectTimer);clearTimeout(successTimer);
      show('success',false);$('ribbonWrap').classList.remove('is-cut');
      $('confetti').replaceChildren();
    }
    const start=officialControl.startedAt?.toMillis?.();
    if(!start){
      show('countdown',false);show('ribbonArea',false);
      message('Synchronising the official countdown between Host and Principal…');
    }else{
      const remaining=Math.max(0,COUNTDOWN_MS-(Date.now()-start));
      const digit=Math.ceil(remaining/1000);
      if(digit>=1){
        if(lastDigit!==digit){
          $('countdown').textContent=digit;
          $('countdown').style.animation='none';void $('countdown').offsetWidth;
          $('countdown').style.animation='';lastDigit=digit;
        }
        show('countdown',true);show('ribbonArea',false);
        message('👑 OFFICIAL OPENING COUNTDOWN · '+digit);
      }else{
        show('countdown',false);show('ribbonArea',true);
        show('scissorsTrigger',true);
        show('cutRibbon',role==='principal');
        $('cutRibbon').textContent='✂️ CUT THE OFFICIAL RIBBON · ONE TIME';
        $('cutRibbon').disabled=cutPending;
        $('scissorsTrigger').disabled=role!=='principal'||cutPending;
        show('waitingForPrincipal',role==='host');
        message(role==='principal'?'Principal: this is the REAL one-time opening. Tap scissors only when you are ready.':'Countdown complete. Waiting for Principal to cut the OFFICIAL ribbon live.');
      }
    }
  }else message('Unknown official status. Contact the Master Admin.',true);
  previousPhase=phase;
}
function render(){
  if(isOfficial){renderOfficial();return}
  if(!authorized||!trial)return;
  const phase=trial.phase;
  if(phase==='idle'){
    if(previousPhase!=='idle')resetVisual();
    message(role==='host'?(isMainPreview?'Main ceremony preview ready. Start 5 → 1 and practise the complete ribbon-cut reveal; Reset remains available.':'Ready to rehearse. Save Principal access, then start the 5-second countdown.'):'Waiting for the Host to start the rehearsal countdown.');
  }else if(phase==='countdown'){
    experiencedCountdown=true;
    if(previousPhase!=='countdown'){
      cutPlayed=false;cutPending=false;clearTimeout(redirectTimer);clearTimeout(successTimer);show('success',false);show('ribbonArea',false);
      $('ribbonWrap').classList.remove('is-cut');$('confetti').replaceChildren();
    }
    const start=trial.startedAt?.toMillis?.();
    if(!start){
      show('countdown',false);
      message('Synchronising countdown time between Host and Principal…');
    }else{
      const remaining=Math.max(0,COUNTDOWN_MS-(Date.now()-start));
      const digit=Math.ceil(remaining/1000);
      if(digit>=1){
        if(lastDigit!==digit){
          $('countdown').textContent=digit;
          $('countdown').style.animation='none';
          void $('countdown').offsetWidth;
          $('countdown').style.animation='';
          lastDigit=digit;
        }
        show('countdown',true);show('ribbonArea',false);show('scissorsTrigger',false);
        message((isMainPreview?'MAIN CEREMONY PREVIEW':'LIVE REHEARSAL COUNTDOWN')+' · '+digit);
      }else{
        show('countdown',false);show('ribbonArea',true);
        show('cutRibbon',true);
        show('scissorsTrigger',true);
        $('cutRibbon').textContent=role==='principal'?(isMainPreview?'✂️ CUT THE RIBBON · PREVIEW':'✂️ CUT THE RIBBON · TRIAL'):(isMainPreview?'✂️ CUT THE RIBBON · MAIN PREVIEW':'✂️ TEST CUT HERE · HOST TRIAL');
        $('cutRibbon').disabled=cutPending;
        $('scissorsTrigger').disabled=cutPending;
        show('waitingForPrincipal',role==='host'&&Boolean(principalEmail));
        message(role==='principal'?'Principal, tap the scissors or CUT THE RIBBON button.':'Countdown complete: tap the scissors or HOST TEST CUT to try it on this screen.');
      }
    }
  }else if(phase==='cut'){
    if(!cutPlayed)playCutAnimation();
  }else{
    message('Unknown rehearsal state. Ask the Host to reset.',true);
  }
  previousPhase=phase;
}
async function showSignedIn(user,version){
  unsubscribe?.();unsubscribe=null;
  officialUnsubscribes.forEach(stop=>stop());officialUnsubscribes=[];
  officialControl=null;officialRecord=null;officialControlLoaded=false;officialRecordLoaded=false;
  officialSeenCountdown=false;masterVerified=false;
  authorized=false;me=user;trial=null;resetVisual();
  show('hostControls',false);show('principalInfo',false);
  show('loginPanel',!user);
  if(!user){message('Sign in securely to access the '+(role==='host'?'Host':'Principal')+' rehearsal screen.');return}
  if(!user.emailVerified){
    message('This Google account must have a verified email address.',true);
    show('loginPanel',true);return;
  }
  try{
    if(role==='host'){
      // Server-side isAdmin() protects listing siteSettings; works for both Admin tiers.
      await getDocs(query(collection(db,'siteSettings'),limit(1)));
      if(version!==authVersion)return;
      const snap=await getDoc(doc(db,'grandLaunch','config'));
      if(version!==authVersion)return;
      principalEmail=snap.exists()?String(snap.data().principalEmail||''):'';
      $('principalEmail').value=principalEmail;
      if(isOfficial){
        masterVerified=await isVerifiedMasterAdmin(db,user);
        if(version!==authVersion)return;
      }
      show('hostControls',true);
    }else{
      const snap=await getDoc(doc(db,'grandLaunch','config'));
      if(version!==authVersion)return;
      // The registered Principal remains the only configured ceremony email.
      // A verified Master Admin has quiet backup access via a server-enforced
      // role probe. Never add a second email to the Principal configuration,
      // HTML, JavaScript, or any public website setting.
      principalEmail=snap.exists()?String(snap.data().principalEmail||'').toLowerCase():'';
      const registeredPrincipal=!!principalEmail && principalEmail===user.email.toLowerCase();
      if(!registeredPrincipal){
        const verifiedMaster=await isVerifiedMasterAdmin(db,user);
        if(version!==authVersion)return;
        if(!verifiedMaster)throw Error('Your Google account is not registered for Principal Login. Ask the Academy Admin to verify the Principal account in Settings → Principal Login, or choose a different Google account.');
      }
      show('principalInfo',true);
    }
    authorized=true;show('loginPanel',false);
    if(isOfficial){
      message('🔐 Official inauguration status connected. The final cut has not been triggered from this page.');
      officialUnsubscribes.push(onSnapshot(doc(db,'grandLaunch','officialControl'),{includeMetadataChanges:true},snapshot=>{
        if(snapshot.metadata.hasPendingWrites)return;
        officialControl=snapshot.exists()?snapshot.data():null;
        officialControlLoaded=true;render();
      },error=>message('Cannot read official countdown control: '+error.message,true)));
      officialUnsubscribes.push(onSnapshot(doc(db,'grandLaunch','official'),{includeMetadataChanges:true},snapshot=>{
        if(snapshot.metadata.hasPendingWrites)return;
        officialRecord=snapshot.exists()?snapshot.data():null;
        officialRecordLoaded=true;render();
      },error=>message('Cannot read official inauguration record: '+error.message,true)));
    }else{
      message('Connected to secure rehearsal. Official Launch remains locked.');
      unsubscribe=onSnapshot(doc(db,'grandLaunch','trial'),{includeMetadataChanges:true},snapshot=>{
        // Never celebrate an optimistic write: wait for the server to accept the ribbon cut.
        if(snapshot.metadata.hasPendingWrites)return;
        trial=snapshot.exists()?snapshot.data():{phase:'idle'};
        render();
      },error=>{trial=null;message('Cannot read rehearsal status: '+error.message,true)});
    }
  }catch(error){
    message('Access denied: '+error.message,true);
    show('loginPanel',true);
  }
}
let authVersion=0;
async function initialise(){
  try{
    const config=await fetch('./firebase-config.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Configuration unavailable');return r.json()});
    const app=getApps().find(a=>a.name==='academy-grand-launch')||initializeApp(config,'academy-grand-launch');
    auth=getAuth(app);db=getFirestore(app);
    onAuthStateChanged(auth,user=>{const version=++authVersion;showSignedIn(user,version)});
  }catch(error){message('Cannot connect to Firebase: '+error.message,true)}
}
async function loginWithGoogle(){
  if(!auth)return;
  const provider=new GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  try{await signInWithPopup(auth,provider)}
  catch(error){
    if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment'].includes(error.code)){
      await signInWithRedirect(auth,provider).catch(e=>message('Google sign-in failed: '+e.message,true));
    }else message('Google sign-in failed: '+error.message,true);
  }
}
$('googleLogin').addEventListener('click',loginWithGoogle);
$('switchGoogleAccount').addEventListener('click',async()=>{
  if(!auth||role!=='principal')return;
  try{await signOut(auth);await loginWithGoogle()}
  catch(error){message('Cannot switch account: '+error.message,true)}
});
$('passwordForm').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!auth||role!=='host')return;
  try{
    await signInWithEmailAndPassword(auth,$('adminEmail').value.trim(),$('adminPassword').value);
    $('adminPassword').value='';
  }catch(error){message('Admin login failed: '+error.message,true)}
});
$('savePrincipal').addEventListener('click',async()=>{
  if(!authorized||role!=='host')return;
  const value=$('principalEmail').value.trim().toLowerCase();
  if(!isEmail(value)){message('Enter the Principal’s verified Google email address.',true);return}
  try{
    await setDoc(doc(db,'grandLaunch','config'),{principalEmail:value,updatedAt:serverTimestamp(),updatedBy:me.uid});
    principalEmail=value;message('Principal Google access saved. Share the Principal control link privately.');
  }catch(error){message('Could not save Principal access: '+error.message,true)}
});
async function writeTrial(phase){
  if(!authorized||role!=='host')return;
  try{
    await setDoc(doc(db,'grandLaunch','trial'),{
      kind:'trial',phase,startedAt:phase==='countdown'?serverTimestamp():null,
      cutAt:null,cutBy:null,updatedAt:serverTimestamp(),updatedBy:me.uid
    });
    message(phase==='countdown'?'Countdown started on Host and Principal screens.':'Rehearsal reset. No official launch has happened.');
    return true;
  }catch(error){message('Could not '+(phase==='countdown'?'start':'reset')+' trial: '+error.message,true);return false}
}
$('startTrial').addEventListener('click',()=>writeTrial('countdown'));
$('resetTrial').addEventListener('click',()=>writeTrial('idle'));
$('previewReset').addEventListener('click',async()=>{
  if(role!=='host'||!authorized||!isMainPreview)return;
  const button=$('previewReset');button.disabled=true;
  try{
    if(await writeTrial('idle'))resetVisual();
  }finally{button.disabled=false}
});
// These actions never touch the resettable Trial document. The only irreversible
// operation is the Principal's server-validated one-time CREATE of official.
async function armOfficial(){
  if(!isOfficial||role!=='host'||!masterVerified||officialRecord||officialControl)return;
  if($('officialPhrase').value.trim().toUpperCase()!=='LAUNCH 21 NOV 2026'){
    message('Type exactly LAUNCH 21 NOV 2026 to PREPARE the ceremony. This does NOT launch it.',true);return;
  }
  if(!confirm('ARM the official ceremony for Saturday 21 November? This only prepares it. No website launch will occur yet.'))return;
  const button=$('officialArm');button.disabled=true;
  try{
    await setDoc(doc(db,'grandLaunch','officialControl'),{
      kind:'officialControl',state:'armed',startedAt:null,startedBy:null,
      updatedAt:serverTimestamp(),updatedBy:me.uid
    });
    $('officialPhrase').value='';
    message('✅ Official ceremony ARMED safely. Countdown is unavailable until Saturday 21 November (India time).');
  }catch(error){message('Could not arm official ceremony: '+error.message,true)}
  finally{button.disabled=false}
}
async function startOfficial(){
  if(!isOfficial||role!=='host'||!masterVerified||officialRecord||officialControl?.state!=='armed')return;
  if(officialIndiaDate()!=='2026-11-21'){
    message('Final opening is locked to Saturday, 21 November 2026, India time.',true);return;
  }
  if(!confirm('START the REAL official countdown? This is NOT a trial. The Principal can permanently inaugurate the website after 5 seconds.'))return;
  const button=$('officialStart');button.disabled=true;
  try{
    await updateDoc(doc(db,'grandLaunch','officialControl'),{
      state:'countdown',startedAt:serverTimestamp(),startedBy:me.uid,
      updatedAt:serverTimestamp(),updatedBy:me.uid
    });
  }catch(error){message('Final countdown could not start: '+error.message,true)}
  finally{button.disabled=false}
}
async function cancelOfficialCountdown(){
  if(!isOfficial||role!=='host'||!masterVerified||officialRecord||officialControl?.state!=='countdown')return;
  if(!confirm('Cancel the final countdown BEFORE the Principal cuts the ribbon? This returns to Armed and does NOT undo an actual inauguration.'))return;
  const button=$('officialCancel');button.disabled=true;
  try{
    await updateDoc(doc(db,'grandLaunch','officialControl'),{
      state:'armed',startedAt:null,startedBy:null,
      updatedAt:serverTimestamp(),updatedBy:me.uid
    });
    resetVisual();
    message('Countdown cancelled before the official cut. The one-time launch record is still absent.');
  }catch(error){message('Cannot cancel countdown. It may have been inaugurated: '+error.message,true)}
  finally{button.disabled=false}
}
async function requestOfficialCut(){
  if(!isOfficial||role!=='principal'||!authorized||cutPending||
    officialRecord||officialControl?.state!=='countdown'||!officialControl.startedAt?.toMillis)return;
  if(officialIndiaDate()!=='2026-11-21'){
    message('Official inauguration is restricted to 21 November 2026 (India time).',true);return;
  }
  if(Date.now()-officialControl.startedAt.toMillis()<COUNTDOWN_MS){
    message('Wait for the full official countdown to finish.',true);return;
  }
  if(!confirm('CONFIRM THE REAL OFFICIAL INAUGURATION? This cuts the ribbon and records the one-time opening permanently. IT CANNOT BE RESET.'))return;
  cutPending=true;$('cutRibbon').disabled=true;$('scissorsTrigger').disabled=true;
  message('✂️ Submitting the one-time official ribbon cut for secure server confirmation…');
  try{
    await setDoc(doc(db,'grandLaunch','official'),{
      kind:'official',phase:'launched',dateLocal:'2026-11-21',
      startedAt:officialControl.startedAt,
      launchedAt:serverTimestamp(),launchedBy:me.uid
    });
  }catch(error){
    cutPending=false;$('cutRibbon').disabled=false;$('scissorsTrigger').disabled=false;
    message('Official cut NOT recorded: '+error.message+'. Ask Master Admin to check the status before retrying.',true);
  }
}
$('officialArm').addEventListener('click',armOfficial);
$('officialStart').addEventListener('click',startOfficial);
$('officialCancel').addEventListener('click',cancelOfficialCountdown);

async function requestTrialCut(){
  if(isOfficial)return; // Official mode can never use the resettable cut path.
  // On the shared Host screen this is strictly a rehearsal; the Principal
  // can still perform the full two-device ceremony from their own account.
  if(!authorized||!(role==='host'||role==='principal')||cutPending||
     trial?.phase!=='countdown'||!trial.startedAt?.toMillis)return;
  if(Date.now()-trial.startedAt.toMillis()<COUNTDOWN_MS){
    message('Finish the 5–4–3–2–1 countdown before cutting.',true);return;
  }
  cutPending=true;
  $('cutRibbon').disabled=true;
  $('scissorsTrigger').disabled=true;
  message('✂️ Confirming rehearsal ribbon cut securely…');
  try{
    await updateDoc(doc(db,'grandLaunch','trial'),{
      phase:'cut',cutAt:serverTimestamp(),cutBy:me.uid,
      updatedAt:serverTimestamp(),updatedBy:me.uid
    });
  }catch(error){
    cutPending=false;
    if(trial?.phase==='countdown'){
      $('cutRibbon').disabled=false;
      $('scissorsTrigger').disabled=false;
    }
    message('Ribbon cutting was not accepted: '+error.message+
      ' · Make sure you are signed in and the trial is still active.',true);
  }
}
$('cutRibbon').addEventListener('click',()=>isOfficial?requestOfficialCut():requestTrialCut());
$('scissorsTrigger').addEventListener('click',()=>isOfficial?requestOfficialCut():requestTrialCut());

setInterval(render,130);
initialise();
